// GEAR-POPUP photographs (docs/notes/gear-popup.md). After `npm run web`:
//   node tools/gear-popup/shots.mjs
// At 393x852, 360x780 and 412x915 (`SIZES=393` for one), on the Knight's hero page, Equipment tab: an equip with a gain (a Claymore into an
// empty main hand), a swap with a mix of up and down (Plate Cuirass worn, swapped for a Monk's Gi), and "Equip all heroes" (spare pieces for
// several heroes). Each picture is taken with the plates' animation stopped at 0.6 s (fully in). Writes docs/samples/gear-popup-<scene>-<w>.png
// and reports what each plate says, whether plates overlap, and whether one covers the slot or the button that was tapped.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const PORT = Number(process.env.PORT ?? 9051);
const root = process.env.ROOT ?? 'out/web';
const SIZES = (process.env.SIZES ?? '393,360,412').split(',').map((w) => ({ 393: [393, 852], 360: [360, 780], 412: [412, 915] })[w]);
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', webp: 'image/webp', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', opus: 'audio/ogg', css: 'text/css' };
const srv = createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(PORT);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
mkdirSync('docs/samples', { recursive: true });
const OWNED = ['knight', 'cleric', 'wizard', 'archer', 'samurai'];
let errors = 0;
const item = (id, base, rarity = 3, level = 5) => ({ id, base, rarity, level });
const SCENES = {
  equip: { equipment: [item(1, 'claymore')], equipped: {} },
  swap: { equipment: [item(1, 'plateCuirass'), item(2, 'monkGi')], equipped: { knight: { torso: 1 } } },
  all: { equipment: [item(1, 'claymore'), item(2, 'katana', 4, 6), item(3, 'chainMail'), item(4, 'hideVest'), item(5, 'luckyCharm'), item(6, 'bootsOfHaste'), item(7, 'stormStaff', 4, 6), item(8, 'sunfireLongbow'), item(9, 'sageVestments'), item(10, 'ironRing')], equipped: {} },
};

async function open(w, h, gear) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true });
  const page = await ctx.newPage();
  page.setDefaultNavigationTimeout(180000);
  page.setDefaultTimeout(120000);
  page.on('pageerror', (e) => { errors++; console.log('PAGE ERROR', e.message); });
  await page.addInitScript(([owned, gear]) => {
    if (sessionStorage.getItem('gp-set')) return;
    sessionStorage.setItem('gp-set', '1');
    localStorage.clear();
    localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: owned, party: owned, pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: Object.fromEntries(owned.map((k) => [k, 120000])), bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [], ranked: {}, featuresTold: ['autoMerge', 'autoRunes', 'autoPlace'], nextItem: 50, ...gear, opened: ['undead', 'beasts', 'wildwood', 'labyrinth', 'ogres', 'infernal', 'yokai', 'golems', 'tower', 'castle', 'calamity'] }));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, speed: 1 }));
  }, [OWNED, gear]);
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 240000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  await page.addStyleTag({ content: '#tip, .tip, #tipBox, .duchess, .say, [class*=bubble], [class*=Bubble], #quip { display: none !important; }' });
  await page.evaluate(() => window.__game.home.openSheet('knight', false, 'equipment'));
  await page.waitForSelector('.eqPanel .eqSlot', { timeout: 20000 });
  await page.evaluate(() => document.querySelector('.eqPanel').scrollIntoView({ block: 'start' }));
  await page.waitForTimeout(400);
  return { ctx, page };
}
/** Tap an element as a finger does (pointer down, then the click), and note its box: a plate must not cover what was tapped. */
async function tap(page, sel, nth = 0) {
  const box = await page.evaluate(([sel, nth]) => { const e = [...document.querySelectorAll(sel)].filter((x) => x.offsetParent)[nth]; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }, [sel, nth]);
  await page.mouse.click(box.x + box.w / 2, box.y + box.h / 2);
  return box;
}
const freeze = (page, ms = 600) => page.evaluate((ms) => { for (const a of document.getAnimations()) if (a.effect?.target?.classList?.contains('gpPlate')) { a.currentTime = ms; a.pause(); } }, ms);
const plates = (page, tapped) => page.evaluate((t) => {
  const ps = [...document.querySelectorAll('.gpPlate')].map((p) => ({ text: p.innerText.replace(/\n/g, ' | '), r: p.getBoundingClientRect(), up: p.querySelectorAll('.gpLine.up').length, down: p.querySelectorAll('.gpLine.down').length }));
  let overlaps = 0;
  for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) { const a = ps[i].r, b = ps[j].r; if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) overlaps++; }
  const cover = (r, b) => b && r.left < b.x + b.w && b.x < r.right && r.top < b.y + b.h && b.y < r.bottom;
  return { n: ps.length, overlaps, coversTapped: ps.filter((p) => cover(p.r, t)).length, offscreen: ps.filter((p) => p.r.left < 0 || p.r.right > innerWidth || p.r.top < 0 || p.r.bottom > innerHeight).length, texts: ps.map((p) => `${p.text} [${p.up} up, ${p.down} down]`), pageW: document.documentElement.scrollWidth };
}, tapped);
const shot = async (page, name, w) => {
  const path = `docs/samples/gear-popup-${name}-${w}.png`;
  await page.screenshot({ path });
  console.log('  wrote', path);
};

for (const [w, h] of SIZES) {
  for (const [scene, gear] of Object.entries(SCENES)) {
    const { ctx, page } = await open(w, h, gear);
    try {
      let tapped;
      if (scene === 'equip') {
        await tap(page, '.eqSlot.at-main');
        await page.waitForSelector('.eqBtns .primary');
        tapped = await tap(page, '.eqBtns .primary');
      } else if (scene === 'swap') {
        await tap(page, '.eqSlot.at-torso');
        await page.waitForSelector('.eqBtns .primary');
        tapped = await tap(page, '.eqBtns .primary');
      } else {
        await page.evaluate(() => { const d = document.querySelector('.eqMore'); if (d) d.open = true; });
        tapped = await tap(page, '.eqMore button', 0);
      }
      await page.waitForSelector('.gpPlate', { timeout: 15000 });
      await page.waitForTimeout(300);
      await freeze(page);
      console.log(w, scene, JSON.stringify(await plates(page, tapped)));
      await shot(page, scene, w);
      // (a tap anywhere takes the plates away)
      await page.evaluate(() => { for (const a of document.getAnimations()) a.play(); });
      await page.mouse.click(w / 2, 20);
      await page.waitForTimeout(150);
      console.log(w, scene, 'after a tap:', await page.evaluate(() => document.querySelectorAll('.gpPlate').length), 'plates');
    } catch (e) { errors++; console.log('FAILED', scene, w, e.message); }
    await ctx.close();
  }
}
await browser.close();
srv.close();
console.log(errors ? `${errors} errors` : 'no page errors');
process.exit(errors ? 1 : 0);
