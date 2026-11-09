// CASTLE-REMAKE screenshots and checks (docs/notes/castle-remake.md). After `npm run web`:
//   node tools/castle-remake/shots.mjs <before|after> [scene ...]
// Castle scenes: scene (the top of the tab), chambers (scrolled to the building list), card (a building's card), rooms (a room
// building's card, the Hall), chapel (the Chapel's card, unbuilt), works (a card while the builders work), built (a building at the top).
// Reference scenes (the current look): camp, tavern, spells, armies, menu (an ornate menu with painted buttons). dev: Settings ›
// Developer, with Build Town (moved off the Castle tab); dev-town: the same after a tap on it.
// Each at 393x852, 360x780 and 412x915 (`SIZES=393` for one). Writes docs/samples/castle-remake/<prefix>-<scene>-<w>.png and checks
// that no page error was thrown and nothing runs past the screen's right edge. Exits 1 on either.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
const { chromium } = createRequire(existsSync('/opt/node-tools/node_modules/') ? '/opt/node-tools/node_modules/' : import.meta.url)('playwright');
const PORT = Number(process.env.PORT ?? 8652);
const root = 'out/web';
const args = process.argv.slice(2);
const prefix = args.shift() ?? 'after';
const CASTLE = ['scene', 'chambers', 'card', 'rooms', 'chapel', 'works', 'built'];
const REF = ['camp', 'tavern', 'spells', 'armies', 'menu'];
const want = args.length ? args : CASTLE;
const SIZES = (process.env.SIZES ?? '393,360,412').split(',').map((w) => ({ 393: [393, 852], 360: [360, 780], 412: [412, 915] })[w]);
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', webp: 'image/webp', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', opus: 'audio/ogg', css: 'text/css' };
const srv = createServer((q, r) => {
  const p = `${root}/` + (decodeURIComponent(q.url.split('?')[0]).slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(PORT);
const browser = await chromium.launch({ executablePath: existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const dir = 'docs/samples/castle-remake';
mkdirSync(dir, { recursive: true });
const xpAt = (level) => Math.round(30 * (level - 1) * level * (level > 20 ? 4 : 1));
const PARTY = ['knight', 'cleric', 'wizard', 'archer', 'samurai'];
const ALL = [...PARTY, 'kunoichi', 'paladin', 'ranger'];
let errors = 0;
let overflow = 0;
const report = {};

async function open(w, h, scene) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true });
  const page = await ctx.newPage();
  page.errs = [];
  page.on('pageerror', (e) => { errors++; page.errs.push(e.message); console.log('PAGE ERROR', e.message); });
  const castle = scene === 'built'
    ? { treasury: 5, barracks: 5, armoury: 5, mageTower: 4, stable: 5, library: 5, smithy: 3, watchtower: 3, hall: 2, drillYard: 2, chapel: 3 }
    : { treasury: 2, barracks: 1, armoury: 3, mageTower: 0, stable: 1, library: 0, smithy: 1, watchtower: 0, hall: 1, drillYard: 0 };
  const chapel = scene !== 'chapel';
  if (chapel && scene !== 'built') castle.chapel = 1;
  const works = scene === 'works' ? { id: 'armoury', level: 4, doneAt: Date.now() + 2 * 3600_000 + 14 * 60_000 } : undefined;
  await page.addInitScript(([owned, party, xp, castle, chapel, works]) => {
    let z = 0x2545f491;
    Math.random = () => ((z = (Math.imul(z ^ (z >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) | 0) >>> 0) / 4294967296;
    if (sessionStorage.getItem('cr-set')) return;
    sessionStorage.setItem('cr-set', '1');
    localStorage.clear();
    localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, gold: 3400, stones: 25, unlocked: owned, party, pulls: 0, dry: 0, dryMythic: 0, castle, chapel, works, shards: {}, stars: {}, xp: Object.fromEntries(owned.map((k) => [k, xp])), bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: ['first'], armies: {}, armySeen: [], stash: [], opened: ['undead', 'beasts', 'wildwood', 'labyrinth', 'ogres', 'infernal', 'yokai', 'golems', 'tower', 'castle', 'calamity'] }));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, speed: 1 }));
  }, [ALL, PARTY, xpAt(32), castle, chapel, works]);
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  await page.addStyleTag({ content: '#tip, .tip, #tipBox, .say, [class*=bubble], [class*=Bubble], #quip, .hmDispatch { display: none !important; }' });
  return { ctx, page };
}

const tap = (page, sel, i = 0) => page.evaluate(([sel, i]) => document.querySelectorAll(sel)[i]?.dispatchEvent(new MouseEvent('click', { bubbles: true })), [sel, i]);
/** Open a castle place's card: the new scene's hotspot (`[data-site]`) or the old chamber card (`.ctChamberCard[data-id]`). */
const openSite = (page, id) => page.evaluate((id) => (document.querySelector(`.crSpot[data-site="${id}"]`) ?? document.querySelector(`.ctChamberCard[data-id="${id}"]`))?.dispatchEvent(new MouseEvent('click', { bubbles: true })), id);

async function check(page) {
  return page.evaluate(() => {
    const W = innerWidth;
    let wide = document.documentElement.scrollWidth > W + 1;
    const past = [];
    for (const e of document.querySelectorAll('.hm-castle *, .omVeil *')) {
      const r = e.getBoundingClientRect();
      if (!r.width || e.closest('[hidden]')) continue;
      if (getComputedStyle(e).visibility === 'hidden') continue;
      if (r.right > W + 1 && !e.closest('.crScroll canvas, .crBack')) past.push(`${e.className || e.tagName}:${Math.round(r.right)}`);
    }
    const small = [];
    for (const b of document.querySelectorAll('.hm-castle button, .hm-castle [role=button], .omVeil button')) {
      const r = b.getBoundingClientRect();
      if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight || b.closest('[hidden]')) continue;
      if (Math.max(r.width, r.height) < 44 || Math.min(r.width, r.height) < 32) small.push(`${b.className || b.tagName}:${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    return { wide, past: [...new Set(past)].slice(0, 20), small: [...new Set(small)].slice(0, 30) };
  });
}

for (const [w, h] of SIZES) {
  for (const scene of want) {
    const { ctx, page } = await open(w, h, scene);
    try {
      if (CASTLE.includes(scene)) {
        await tap(page, '.hmTab', 3);
        await page.waitForTimeout(1200);
        if (scene === 'chambers') await page.evaluate(() => (document.querySelector('.crBoons') ?? document.querySelector('.ctChamberGrid'))?.scrollIntoView({ block: 'start' }));
        if (scene === 'card' || scene === 'works' || scene === 'built') await openSite(page, scene === 'card' ? 'treasury' : scene === 'works' ? 'armoury' : 'barracks');
        if (scene === 'rooms') await openSite(page, 'hall');
        if (scene === 'chapel') await openSite(page, 'chapel');
        await page.waitForTimeout(700);
      } else if (scene === 'tavern') { await tap(page, '.hmTab', 1); await page.waitForTimeout(1200); }
      else if (scene === 'spells') { await tap(page, '.hmTab', 4); await page.waitForTimeout(1200); }
      else if (scene === 'armies') { await tap(page, '#hmBattle'); await page.waitForTimeout(1200); }
      else if (scene === 'menu') { await tap(page, '#hmGear'); await page.waitForTimeout(900); }
      else if (scene === 'dev' || scene === 'dev-town') {
        // (Settings › Developer, where Build Town lives now; dev-town taps it and then shows the castle it built)
        await tap(page, '#hmGear');
        await page.waitForTimeout(700);
        await tap(page, '.setMenu[data-page="dev"]');
        await page.waitForTimeout(700);
        if (scene === 'dev-town') {
          await page.evaluate(() => document.querySelector('.devTown')?.click());
          await page.waitForTimeout(400);
        }
      }
      else await page.waitForTimeout(800);
      const path = `${dir}/${prefix}-${scene}-${w}.png`;
      await page.screenshot({ path });
      const c = await check(page);
      if (c.wide || c.past.length) overflow++;
      report[`${scene}-${w}`] = { ...c, errors: page.errs };
      console.log(scene, w, c.wide || c.past.length ? `OVERFLOW ${c.past.join(' ')}` : 'fits', c.small.length ? `small: ${c.small.join(' ')}` : '');
    } catch (e) {
      errors++;
      console.log('FAILED', scene, w, e.message);
    }
    await ctx.close();
  }
}
writeFileSync(`${dir}/${prefix}-checks.json`, JSON.stringify(report, null, 1));
console.log(`page errors: ${errors}, overflow: ${overflow}`);
await browser.close();
srv.close();
process.exit(errors || overflow ? 1 : 0);
