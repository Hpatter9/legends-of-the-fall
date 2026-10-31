// REVEAL and the vault (docs/notes/cinematic-reveal-vault.md): the end cards and the vault's screens at the three upright sizes.
// node tools/reveal-vault/shots.mjs  (after npm run web; serves out/web on 8910; writes docs/samples/reveal-*.png and vault-*.png)
import { serve, HEROES } from '../battle-ui/lib.mjs';
import { createRequire } from 'node:module';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const PORT = 8910;
const server = serve('out/web', PORT);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const SIZES = [[393, 852], [360, 780], [412, 915]];
const errors = [];
const issues = [];
const settle = (p, ms) => p.waitForTimeout(ms);

async function boot(w, h, patch, reduced = false) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  // (a busy machine: generous waits)
  page.setDefaultTimeout(120000);
  page.setDefaultNavigationTimeout(180000);
  page.on('pageerror', (e) => errors.push(`${w}x${h}: ${e.message}`));
  await page.goto(`http://localhost:${PORT}/?x=${Math.random()}`);
  await page.evaluate(() => localStorage.clear());
  await page.evaluate(([heroes, patch]) => {
    const m = { seed: 7, crowns: 1200, unlocked: heroes, party: heroes.slice(0, 5), pulls: 0, castle: { treasury: 2, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: { knight: 5000 }, bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], heroesSeen: heroes, stash: [], opened: ['castle', 'calamity', 'undead'], scenes: ['opening'] };
    Object.assign(m, patch);
    // (the armies' intros seen, so none plays over the home screen as it boots)
    m.scenes = [...new Set([...m.scenes, ...['orcs', 'undead', 'beasts', 'wildwood', 'labyrinth', 'ogres', 'infernal', 'yokai', 'golems'].map((a) => `intro:${a}`)])];
    localStorage.setItem('legends.meta', JSON.stringify(m));
    localStorage.setItem('lotf-tips-off', '1');
  }, [HEROES, patch]);
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(() => document.getElementById('hmCalamity'), {}, { timeout: 60000 });
  await settle(page, 1500);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  return { ctx, page };
}
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
async function check(page, tag) {
  if (await overflow(page)) issues.push(`${tag}: sideways overflow`);
  const off = await page.evaluate(() => [...document.querySelectorAll('.rvCard button, .rvCard .rvArt, .vtBox')].some((e) => { const r = e.getBoundingClientRect(); return r.bottom > innerHeight + 1 || r.right > innerWidth + 1 || r.left < -1; }));
  if (off) issues.push(`${tag}: something off screen`);
}

const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1];
const ONLY = arg('only')?.split(',');
const WANT = arg('sizes')?.split(',').map(Number);
/** A section, again once if the page crashes (a busy machine). */
async function section(name, f) {
  if (ONLY && !ONLY.includes(name)) return;
  for (let i = 0; i < 2; i++) {
    try {
      return await f();
    } catch (e) {
      if (i) issues.push(`${name}: ${e.message.split('\n')[0]}`);
    }
  }
}
for (const [w, h] of SIZES.filter(([w]) => !WANT || WANT.includes(w))) {
  const sfx = w === 393 ? '' : `-${w}`;
  // 1. the Calamity's opening, met from its place on the Battle tab, skipped at once: its card still comes
  await section('calamity', async () => {
    const { ctx, page } = await boot(w, h, {});
    await page.evaluate(() => document.getElementById('hmCalamity').click());
    await page.waitForSelector('#cutscene:not([hidden])', { timeout: 90000 });
    await settle(page, 1200);
    await page.evaluate(() => document.querySelector('.csSkip').click());
    await settle(page, 1500);
    if (process.env.DBG) { console.log(await page.evaluate(() => JSON.stringify({ card: !!document.querySelector('.rvCard'), scenes: JSON.parse(localStorage.getItem('legends.meta')).scenes, opened: JSON.parse(localStorage.getItem('legends.meta')).opened }))); await page.screenshot({ path: '/tmp/claude-0/-home-user/fc90d622-e2ff-5954-bc40-b6b233ce01a9/scratchpad/dbg.png' }); }
    await page.waitForSelector('.rvCard', { timeout: 60000 });
    await settle(page, 700);
    await check(page, `calamity ${w}`);
    await page.screenshot({ path: `docs/samples/reveal-calamity${sfx}.png` });
    await page.evaluate(() => [...document.querySelectorAll('.rvCard button')].find((b) => b.textContent === 'Continue').click());
    await settle(page, 1500);
    // (Continue goes on into the mode: its hero pick)
    if (await page.evaluate(() => !!document.querySelector('.rvCard'))) issues.push(`calamity ${w}: card stayed`);
    await ctx.close();
  });
  // 2. a building raised while on the home screen: the card's button goes to the castle
  await section('castle', async () => {
    const { ctx, page } = await boot(w, h, { castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, works: { id: 'treasury', level: 2, doneAt: 1 }, scenes: ['opening', 'calamityOpens'] });
    // (the works finish as the page boots: the film, or on a slow machine its card already)
    const up = await page.waitForSelector('#cutscene:not([hidden]), .rvCard', { timeout: 90000 }).then(() => true, () => false);
    if (up) {
      await settle(page, 800);
      await page.evaluate(() => document.querySelector('#cutscene:not([hidden]) .csSkip')?.click());
      await page.waitForSelector('.rvCard', { timeout: 60000 });
      await settle(page, 700);
      await check(page, `castle ${w}`);
      await page.screenshot({ path: `docs/samples/reveal-castle${sfx}.png` });
      const go = await page.evaluate(() => [...document.querySelectorAll('.rvCard button')].map((b) => b.textContent));
      if (!go.includes('To the castle')) issues.push(`castle ${w}: no go button (${go})`);
      await page.evaluate(() => [...document.querySelectorAll('.rvCard button')][0].click());
      await settle(page, 800);
    } else issues.push(`castle ${w}: the build scene did not come up`);
    await ctx.close();
  });
  // 3. an army's last stand, replayed from the Scenes list (Continue only), and an awakening, with reduced motion
  await section('army', async () => {
    const { ctx, page } = await boot(w, h, { awakened: { knight: 1 }, shards: { knight: 9999 } }, w === 393);
    void page.evaluate(() => window.__game.playScene('clear:orcs'));
    await page.waitForSelector('#cutscene:not([hidden])', { timeout: 90000 });
    await settle(page, 600);
    await page.evaluate(() => document.querySelector('.csSkip').click());
    await page.waitForSelector('.rvCard', { timeout: 60000 });
    await settle(page, 700);
    await check(page, `army ${w}`);
    await page.screenshot({ path: `docs/samples/reveal-army${sfx}.png` });
    await page.evaluate(() => document.querySelector('.rvCard button').click());
    await settle(page, 500);
    void page.evaluate(() => window.__game.playScene('awaken:knight'));
    await page.waitForSelector('#cutscene:not([hidden])', { timeout: 90000 });
    await settle(page, 600);
    await page.keyboard.press('Escape');
    await page.waitForSelector('.rvCard', { timeout: 60000 });
    await settle(page, 900);
    await page.screenshot({ path: `docs/samples/reveal-awaken${sfx}.png` });
    await page.keyboard.press('Escape');
    await settle(page, 300);
    if (await page.evaluate(() => !!document.querySelector('.rvCard'))) issues.push(`awaken ${w}: Escape did not close`);
    // (a film that reveals nothing ends as before)
    void page.evaluate(() => window.__game.playScene('firstLoss'));
    await page.waitForSelector('#cutscene:not([hidden])', { timeout: 90000 });
    await settle(page, 400);
    await page.evaluate(() => document.querySelector('.csSkip').click());
    await settle(page, 800);
    if (await page.evaluate(() => !!document.querySelector('.rvCard'))) issues.push(`firstLoss ${w}: a card came`);
    await ctx.close();
  });
}
await browser.close();
server.close();
console.log(JSON.stringify({ errors, issues }, null, 1));
