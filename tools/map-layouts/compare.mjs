// The usual board's two sizes side by side, at 393x852: the same stage and save on a 7x9 build and an 8x11 build.
//   node build.mjs --board 7x9 --out out/web79 && node build.mjs --out out/web
//   node tools/map-layouts/compare.mjs out/web79 7x9 && node tools/map-layouts/compare.mjs out/web 8x11
// Writes docs/samples/map-layouts-size-<label>-<scene>-393x852.png: the deploy view, the whole board pulled back, and a fight under way.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const [root, label] = process.argv.slice(2);
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', css: 'text/css' };
const srv = createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(8135);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const [w, h] = [393, 852];
const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
let errors = 0;
page.on('pageerror', (e) => { errors++; console.log('PAGE ERROR', e.message); });
const shot = (name) => page.screenshot({ path: `docs/samples/map-layouts-size-${label}-${name}-${w}x${h}.png` });
await page.goto('http://localhost:8135/?x=' + Math.random());
await page.evaluate(() => localStorage.clear());
await page.goto('http://localhost:8135/');
await page.waitForTimeout(2200);
await page.waitForSelector('.stPack', { timeout: 30000 });
await page.click('.stPack:nth-child(2)');
await page.click('.stGo');
await page.getByText('Skip', { exact: true }).click({ timeout: 15000 }).catch(() => {});
await page.waitForFunction(() => window.__game, null, { timeout: 30000 });
await page.waitForTimeout(1500);
await page.evaluate(() => { for (const b of document.querySelectorAll('#tip button')) if (b.id === 'tipSkip') b.click(); });
const info = await page.evaluate(() => {
  const g = window.__game;
  const r = JSON.parse(JSON.stringify(g.run));
  Object.assign(r, { mode: { kind: 'run' }, stage: 7, over: false, cleared: false, gold: 500, event: undefined });
  document.getElementById('home').hidden = true;
  g.startRun(r);
  for (let k = 0; k < 4; k++) document.getElementById('summon').click();
  document.getElementById('auto').click();
  return { w: g.b.board.w, d: g.b.board.d, layout: g.b.board.layout };
});
console.log(label, JSON.stringify(info));
await page.waitForTimeout(1200);
await shot('deploy');
await page.evaluate(() => document.getElementById('fight')?.click());
let n = 0;
for (let i = 0; i < 900; i++) {
  await page.waitForTimeout(200);
  const [phase, t] = await page.evaluate(() => [window.__game.b.phase, window.__game.b.t]);
  if (n === 0 && t > 3000) { await shot('fight-early'); n = 1; }
  if (n === 1 && t > 9000) { await shot('fight-mid'); n = 2; }
  if (phase !== 'fight') break;
}
console.log('page errors:', errors);
await browser.close();
srv.close();
