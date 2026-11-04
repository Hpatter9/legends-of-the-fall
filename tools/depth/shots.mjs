// Screenshots for the depth build (docs/notes/depth-build.md) at the three upright phone sizes:
//   node tools/depth/shots.mjs <scene> [web dir]
// Scenes: castle (the castle page with the rooms and the three new buildings), card-<site> (a building's card).
// Writes docs/samples/depth-<scene>-<w>x<h>.png (needs Playwright, as the other shot scripts).
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const [scene = 'castle', root = 'out/web'] = process.argv.slice(2);
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', opus: 'audio/ogg', css: 'text/css' };
const srv = createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(8137);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let errors = 0;
const sizes = process.env.ONE ? [[393, 852]] : [[393, 852], [360, 780], [412, 915]];
for (const [w, h] of sizes) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { errors++; console.log('PAGE ERROR', e.message); });
  const shot = (name) => page.screenshot({ path: `docs/samples/depth-${name}-${w}x${h}.png` });
  await page.addInitScript(() => { if (!sessionStorage.getItem('set')) { localStorage.clear(); sessionStorage.setItem('set', '1'); } localStorage.setItem('legends.settings', JSON.stringify({ music: 0, effects: 0, cinematics: false, quips: false })); });
  await page.goto('http://localhost:8137/?seed=7');
  await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
  await page.waitForTimeout(2200);
  await page.evaluate(() => { for (const b of document.querySelectorAll('#tip button')) if (b.id === 'tipSkip') b.click(); });
  // a castle well on: the gate open, some levels, the Smithy at 2 and the Chapel at 2
  await page.evaluate(() => {
    const m = window.__game.meta;
    m.opened = [...(m.opened || []), 'castle'];
    for (const a of ['orcs', 'undead', 'beasts']) m.armies[a] = { waves: 15, best: 15, won: 15, clears: 1, stars: { 0: 11 }, met: {} };
    m.castle = { treasury: 2, barracks: 3, armoury: 2, mageTower: 3, stable: 1, library: 4, smithy: 2, chapel: 2 };
    m.chapel = true;
    m.crowns = 2500;
    window.__game.home.open();
  });
  await page.waitForTimeout(500);
  if (scene === 'castle') {
    await page.evaluate(() => window.__game.home.show('castle'));
    await page.waitForTimeout(700);
    await page.evaluate(() => document.querySelector('.ctChamberGrid')?.scrollIntoView());
    await page.waitForTimeout(300);
    await shot('castle');
    await page.evaluate(() => document.querySelector('.ctChamberCard[data-id="hall"]')?.scrollIntoView());
    await page.waitForTimeout(300);
    await shot('castle-new');
  } else if (scene === 'codex-boss') {
    await page.evaluate(() => {
      const m = window.__game.meta;
      m.bosses = [...new Set([...(m.bosses || []), 'lichKing', 'orcWarlord'])];
      m.weak = { lichKing: { clues: 2, marks: [0, 1] }, orcWarlord: { clues: 3, marks: [0] } };
      window.__game.home.openCodex();
    });
    await page.waitForTimeout(600);
    await page.evaluate(() => { const c = [...document.querySelectorAll('button')].find((b) => /Lich King/.test(b.textContent || '')); c?.click(); });
    await page.waitForTimeout(600);
    await page.evaluate(() => document.querySelector('.cxWeak')?.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(300);
    await shot('codex-boss');
  } else if (scene.startsWith('card-')) {
    const site = scene.slice(5);
    await page.evaluate(() => window.__game.home.show('castle'));
    await page.waitForTimeout(500);
    await page.evaluate((site) => document.querySelector(`.ctChamberCard[data-id="${site}"]`)?.click(), site);
    await page.waitForTimeout(600);
    await shot(scene);
  }
  await ctx.close();
}
await browser.close();
srv.close();
console.log(errors ? `${errors} page errors` : 'no page errors');
