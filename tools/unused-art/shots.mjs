// UNUSED-ART screenshots (docs/notes/unused-art.md): the screens the newly wired painted cells show on, at the three upright phone sizes.
//
//   npm run web && OUT=docs/samples/unused-art TAG=after node tools/unused-art/shots.mjs [--sizes 393x852,360x780,412x915] [--only services,stall]
//
// Writes <OUT>/<scene>-<TAG>-<w>.png. ROOT may be another build (the "before" shots come from a build of main).
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const PORT = Number(process.env.PORT ?? 8711);
const ROOT = process.env.ROOT ?? 'out/web';
const OUT = process.env.OUT ?? 'out/unused-art';
const TAG = process.env.TAG ?? 'after';
const SIZES = opt('--sizes', '393x852,360x780,412x915').split(',').map((s) => s.split('x').map(Number));
const ONLY = opt('--only', 'gacha,party,dispatch,buttons').split(',');
mkdirSync(OUT, { recursive: true });

const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', webp: 'image/webp', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', opus: 'audio/ogg', css: 'text/css', jpg: 'image/jpeg' };
const srv = createServer((q, r) => {
  const p = `${ROOT}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(PORT);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ALL = ['knight', 'cleric', 'wizard', 'archer', 'samurai', 'lightningMage', 'paladin', 'kraken', 'kitsune', 'minotaur'];
let errors = 0;

async function open(w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { errors++; console.log('PAGE ERROR', e.message); });
  await page.addInitScript((owned) => {
    let z = 0x2545f491;
    Math.random = () => ((z = (Math.imul(z ^ (z >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) | 0) >>> 0) / 4294967296;
    if (sessionStorage.getItem('ua-set')) return;
    sessionStorage.setItem('ua-set', '1');
    localStorage.clear();
    localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1500, stones: 5, unlocked: owned, party: owned.slice(0, 5), chapel: true, xp: Object.fromEntries(owned.map((k) => [k, 40000])), bestStage: 14, tower: 9, satchel: { bandage: 3, elixir: 1 }, satchelPick: { bandage: 1 }, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [], opened: ['undead', 'beasts', 'wildwood', 'tower', 'castle', 'calamity'] }));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, speed: 1 }));
  }, ALL);
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  await page.addStyleTag({ content: '#tip, .tip, #tipBox, .duchess, .say, [class*=bubble], [class*=Bubble], #quip { display: none !important; }' });
  return { ctx, page };
}

/** The Heroes tab, its Tavern services panel. */
async function services(page) {
  await page.evaluate(() => {
    const tab = [...document.querySelectorAll('#hmTabs button')].find((b) => /heroes/i.test(b.textContent || b.getAttribute('aria-label') || ''));
    tab?.click();
  });
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.getElementById('ptTab1')?.click());
  await page.waitForTimeout(700);
}

/** Show a hidden part of the page as it would come up (the result card's and the dispatches' buttons), for the painted cells on them. */
async function unhide(page, ids) {
  await page.evaluate((ids) => ids.forEach((id) => { const e = document.getElementById(id); if (e) e.hidden = false; }), ids);
  await page.waitForTimeout(500);
}

for (const [w, h] of SIZES) {
  const { ctx, page } = await open(w, h);
  if (ONLY.includes('gacha')) {
    await page.evaluate(() => window.__game.gacha.open());
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/gacha-${TAG}-${w}.png` });
  }
  if (ONLY.includes('party')) {
    await page.evaluate(() => { document.getElementById('gacha').hidden = true; window.__game.party.open('start', () => {}); });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/party-${TAG}-${w}.png` });
    await page.evaluate(() => document.querySelector('.ptRemedy')?.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/party-satchel-${TAG}-${w}.png` });
    await page.evaluate(() => { document.getElementById('party').hidden = true; });
  }
  if (ONLY.includes('dispatch')) {
    await page.evaluate(() => { document.getElementById('askText').textContent = 'Dismiss Kwame from the ranks for 40 gold?'; });
    await unhide(page, ['ask']);
    await page.screenshot({ path: `${OUT}/ask-${TAG}-${w}.png` });
    await page.evaluate(() => { document.getElementById('ask').hidden = true; });
  }
  if (ONLY.includes('buttons')) {
    // (the result card's Next stage, the campaign dispatch's Return and the Calamity's Return home and altar help, which a fresh save does
    // not reach: each button built as its screen builds it, in a frame of the page's own CSS)
    await page.evaluate(() => {
      const box = document.createElement('div');
      box.id = 'uaCheck';
      box.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#0b130f;display:flex;flex-direction:column;gap:18px;padding:24px 16px;';
      box.innerHTML = '<div id="result" style="position:static;display:block"><div class="row"><button id="next" class="primary">Next stage</button></div></div>'
        + '<div id="autoSum" style="position:static;display:block"><button id="asumOk" type="button" class="primary">Return to Armies</button></div>'
        + '<div id="towerMap" style="position:static;display:block"><div class="dmTop" style="display:flex;justify-content:space-between;align-items:center"><div><p class="dmEyebrow">The Calamity · Region 2 / 6</p><h2>The Ashen Reach</h2></div><button class="dmClose" aria-label="Return home">×</button></div>'
        + '<div class="dmAltarVeil" style="position:relative;height:120px"><div class="riftAltar" style="position:relative;height:120px;border:1px solid #6b5a33"><button class="altarInfo" aria-label="How the altar works">ⓘ</button></div></div></div>';
      document.body.append(box);
    });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/buttons-${TAG}-${w}.png`, clip: { x: 0, y: 0, width: w, height: 420 } });
    await page.evaluate(() => document.getElementById('uaCheck').remove());
  }
  await services(page);
  if (ONLY.includes('services')) await page.screenshot({ path: `${OUT}/services-${TAG}-${w}.png` });
  if (ONLY.includes('stall')) {
    await page.evaluate(() => [...document.querySelectorAll('.ptButton')].find((b) => /shop|trader/i.test(b.textContent))?.click());
    await page.waitForTimeout(1800);
    await page.screenshot({ path: `${OUT}/stall-${TAG}-${w}.png` });
  }
  await ctx.close();
  console.log('ok', w);
}
console.log('page errors:', errors);
await browser.close();
srv.close();
