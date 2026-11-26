// COSMETICS (docs/notes/cosmetics.md): pictures of each look on sale worn (Starfall), at 393 x 852 (the Shop at all three sizes), into
// docs/samples/cosmetics/. The fake store (`?shop=fake`) stands in for Google Play; ownership is the store's entitlements, cached as the game
// caches them (`legends.purchases`). Fails on a page error.
//
//   npm run web && node tools/cosmetics/shots.mjs
import { createRequire } from 'node:module';
import { existsSync, mkdirSync } from 'node:fs';
import { serve } from '../audit/lib.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const exe = ['/opt/pw-browsers/chromium', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find((p) => existsSync(p));
const browser = await chromium.launch({ ...(exe ? { executablePath: exe } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const dir = 'docs/samples/cosmetics';
mkdirSync(dir, { recursive: true });
const srv = serve('out/web');
const base = `http://localhost:${srv.address().port}/?shop=fake`;
const errors = [];
const HEROES = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard', 'peasant', 'ninjaMonk', 'wanderer'];
// (what the fake store's account has bought: it is the store, read at start, that says what is owned)
const ALL = ['look_starfall'];

/** A page with a save, the fake store's purchases (`owned`, product ids) and the settings given. */
async function open(w, h, { owned = ALL, settings = {}, stones = 40, query = '', meta = {} } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${w}: ${e.message}`));
  await page.addInitScript(([heroes, owned, settings, stones, meta]) => {
    try {
      localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 4000, stones, unlocked: heroes, party: heroes.slice(0, 5), pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 5, barracks: 5, armoury: 5, mageTower: 4, stable: 5, library: 5 }, shards: {}, stars: {}, xp: {}, bestStage: 30, tower: 0, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], tutorials: ['shop', 'summoning', 'tavern', 'recruit'], duchessTaps: 5, ...meta }));
      localStorage.setItem('lotf-tips-off', '1');
      // (what this device last heard from the store, as a returning player's would hold it; the store's answer at start keeps it so)
      const ents = { ruler_ember: ['ruler_ember'], ruler_starlit: ['ruler_starlit'], look_starfall: ['starfall_summons'], look_duchess_knight: ['duchess_knight'], look_duchess_regalia: ['duchess_regalia'], look_duchess_lantern: ['duchess_lantern'], bundle_wardrobe: ['duchess_regalia', 'duchess_knight', 'duchess_lantern'] };
      localStorage.setItem('legends.purchases', JSON.stringify({ entitlements: [...new Set(owned.flatMap((p) => ents[p] ?? []))].sort() }));
      localStorage.setItem('legends.fakeStore', JSON.stringify({ txns: owned.map((product, i) => ({ id: `FAKE.${i + 1}`, product, at: 1 })), next: owned.length + 1 }));
      localStorage.setItem('legends.settings', JSON.stringify(settings));
    } catch {}
  }, [HEROES, owned, settings, stones, meta]);
  await page.goto(base + query);
  await page.waitForSelector('#home:not([hidden])', { timeout: 20000 });
  await page.waitForTimeout(1800);
  return { ctx, page };
}
const shot = (page, name) => page.screenshot({ path: `${dir}/${name}.png` });
const clearCards = async (page) => {
  for (let i = 0; i < 4 && (await page.locator('#tutorialCard .omPrimary').isVisible()); i++) {
    await page.locator('#tutorialCard .omPrimary').click();
    await page.waitForTimeout(300);
  }
};

// 1. Duchess in each costume (redrawn whole, on sale): the camp, and a fight she joins (`?duchess=1` brings her into every fight)
for (const costume of ['regalia', 'knight', 'lantern']) {
  const { ctx, page } = await open(393, 852, { owned: ['bundle_wardrobe'], settings: { duchessHat: costume, cinematics: false }, query: '&duchess=1' });
  await clearCards(page);
  await shot(page, `${costume}-camp`);
  await page.evaluate(() => {
    const g = window.__game;
    const r = JSON.parse(JSON.stringify(g.run));
    const party = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard'];
    Object.assign(r, { seed: 4242, mode: { kind: 'army', army: 'orcs' }, stage: 1, over: false, cleared: false, gold: 0, event: undefined, roster: party.map((kind, i) => ({ id: 100 + i, kind, grade: 1, paid: 30 })), squad: [], nextId: 200 });
    document.getElementById('home').hidden = true;
    g.startRun(r);
    g.autoArrange(true);
  });
  await page.waitForTimeout(800);
  await page.evaluate(() => document.getElementById('fight').click());
  await page.waitForFunction(() => window.__game.b?.units.some((u) => u.def === 'duchess'), null, { timeout: 15000 }).catch(() => errors.push('Duchess did not join the fight'));
  await page.waitForTimeout(2500);
  await clearCards(page);
  await shot(page, `${costume}-fight`);
  await ctx.close();
}

// 1b. The two bought rulers: the Castle tab's Crown Terrace (their figure and domain), the castle's ruler picker, and the Last Stand's hall
//     with them seated on their throne
for (const [product, ruler] of [['ruler_ember', 'ember_sovereign'], ['ruler_starlit', 'starlit_empress']]) {
  const { ctx, page } = await open(393, 852, { owned: [product], settings: { ruler, rulerPicked: true, cinematics: false, saver: true }, meta: { opened: ['tower', 'castle'], xp: Object.fromEntries(HEROES.map((h) => [h, 104400])), tower: 9, bestStage: 14, stash: [] } });
  await clearCards(page);
  await page.locator('.hmTab').nth(3).click();
  await page.waitForTimeout(2500);
  await clearCards(page);
  await shot(page, `${ruler}-terrace`);
  if (ruler === 'ember_sovereign') {
    await page.evaluate(() => window.__game?.home?.castle?.openRulerPicker?.());
    await page.waitForTimeout(800);
    await shot(page, 'castle-ruler-picker');
    await page.keyboard.press('Escape');
  }
  // (the Last Stand is hidden from players for now, so its place is not on the camp: opened through the game's own hook)
  await page.evaluate(() => { window.__game.app.ticker.maxFPS = 10; void window.__game.stand.open(); });
  const stand = await page.waitForSelector('.stPick:not([hidden])', { timeout: 15000 }).catch(() => null);
  if (!stand) errors.push(`${ruler}: the Last Stand did not open`);
  else {
    await page.evaluate(() => {
      [...document.querySelectorAll('.stPick button')].find((b) => b.textContent === 'Auto fill')?.click();
      document.querySelector('.stPick .primary').click();
    });
    await page.waitForFunction(() => window.__game.stand?.hall?.king && window.__game.stand.hall.emptyThrone, null, { timeout: 20000 }).catch(() => errors.push(`${ruler}: no hall`));
    await page.evaluate(() => { document.getElementById('home').hidden = true; window.__game.stand.debugHall('hall'); });
    await page.waitForTimeout(1500);
    await page.addStyleTag({ content: '#quip, #tip, .stCount { display: none !important; }' });
    await shot(page, `${ruler}-throne`);
  }
  await ctx.close();
}

// 2. Settings, Ruler and Duchess: the costume picker and the summoning look
{
  const { ctx, page } = await open(393, 852, { settings: { starfall: true } });
  await page.locator('#hmGear').click();
  await page.waitForTimeout(500);
  await page.locator('.setMenu[data-page="ruler"]').click();
  await page.waitForTimeout(500);
  await shot(page, 'settings-ruler-duchess');
  await page.locator('.costumeOpen').click();
  await page.waitForTimeout(500);
  await shot(page, 'settings-costume-picker');
  await ctx.close();
  // (nothing owned: the bought ones say "In the Shop", Starfall's Classic is chosen and Starfall greyed)
  const two = await open(393, 852, { owned: [] });
  await two.page.locator('#hmGear').click();
  await two.page.waitForTimeout(500);
  await two.page.locator('.setMenu[data-page="ruler"]').click();
  await two.page.waitForTimeout(400);
  await two.page.locator('.costumeOpen').click();
  await two.page.waitForTimeout(400);
  await shot(two.page, 'settings-costume-picker-not-owned');
  await two.ctx.close();
}

// 3. Starfall: a ten-summon's cards before and as they turn, and a new hero's arrival
for (const starfall of [true, false]) {
  const { ctx, page } = await open(393, 852, { settings: { starfall } });
  await page.locator('.hmTab').first().click();
  await page.waitForTimeout(1200);
  await clearCards(page);
  await page.evaluate(() => (window.__forceLucky = false));
  await page.locator('.hlBar button.primary').click();
  await page.waitForTimeout(900);
  await shot(page, `summon-cards-${starfall ? 'starfall' : 'classic'}`);
  if (starfall) {
    await page.waitForTimeout(1300);
    await shot(page, 'summon-cards-starfall-turning');
  }
  await ctx.close();
}
{
  const { ctx, page } = await open(393, 852, { settings: { starfall: true } });
  await page.evaluate(() => {
    const m = JSON.parse(localStorage.getItem('legends.meta'));
    void window.__tarot.firstReveal(m, 'paladin', {});
  });
  for (const [t, name] of [[2050, 'reveal-1'], [2900, 'reveal-2']]) {
    await page.waitForTimeout(t === 2050 ? 2050 : 850);
    await shot(page, `summon-starfall-${name}`);
  }
  await ctx.close();
}

// 4. The Shop's cosmetics at the three sizes: nothing owned (on sale), then all owned, and a purchase's "Wear it now"
for (const [w, h] of [[393, 852], [360, 780], [412, 915]]) {
  const { ctx, page } = await open(w, h, { owned: [] });
  await page.locator('#hmShop').click();
  await page.waitForTimeout(1200);
  await clearCards(page);
  await page.locator('#iapShop .omSection').nth(3).evaluate((s) => s.scrollIntoView({ block: 'start' }));
  await page.waitForTimeout(300);
  await shot(page, `shop-cosmetics-${w}`);
  if (w === 393) {
    await page.locator('#iapShop [data-product="look_starfall"]').click();
    await page.waitForTimeout(900);
    await shot(page, 'shop-bought-starfall');
    await page.locator('#iapDone .omPrimary').click();
    await page.waitForTimeout(300);
    const on = await page.evaluate(() => JSON.parse(localStorage.getItem('legends.settings')).starfall);
    console.log('Starfall on after "Wear it now":', on);
    if (on !== true) errors.push('Wear it now did not turn Starfall on');
    await page.locator('#iapShop .omSection').nth(3).evaluate((s) => s.scrollIntoView({ block: 'start' }));
    await page.waitForTimeout(300);
    await shot(page, 'shop-cosmetics-after-buying');
  }
  await ctx.close();
}

srv.close();
await browser.close();
console.log('errors', errors);
if (errors.length) process.exit(1);
