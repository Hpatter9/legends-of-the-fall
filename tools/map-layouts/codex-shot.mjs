// The codex's Terrain tab at the upright phone sizes: node tools/map-layouts/codex-shot.mjs [web dir]
// Writes docs/samples/map-layouts-codex-<w>x<h>.png and -scrolled-.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const root = process.argv[2] ?? 'out/web';
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', css: 'text/css' };
const srv = createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(8136);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const skip = (page) => page.evaluate(() => { for (const b of document.querySelectorAll('#tip button')) if (b.id === 'tipSkip') b.click(); });
let errors = 0;
for (const [w, h] of [[393, 852], [360, 780], [412, 915]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { errors++; console.log('PAGE ERROR', e.message); });
  await page.goto('http://localhost:8136/?x=' + Math.random());
  await page.evaluate(() => localStorage.clear());
  await page.goto('http://localhost:8136/');
  await page.waitForTimeout(2200);
  await page.waitForSelector('.stPack', { timeout: 30000 });
  await page.click('.stPack:nth-child(2)');
  await page.click('.stGo');
  await page.getByText('Skip', { exact: true }).click({ timeout: 15000 }).catch(() => {});
  await page.waitForFunction(() => window.__game, null, { timeout: 30000 });
  await page.waitForTimeout(1500);
  await skip(page);
  await page.evaluate(() => window.__game.home.open());
  await page.waitForTimeout(1500);
  await skip(page);
  await page.click('.hmTab:has-text("Castle")');
  await page.waitForTimeout(1200);
  await skip(page);
  await page.click('.ctChip:has-text("Codex")');
  await page.waitForTimeout(800);
  await page.click('.cxTab:has-text("Terrain")');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `docs/samples/map-layouts-codex-${w}x${h}.png` });
  await page.evaluate(() => document.getElementById('hmSubBody').scrollTo(0, 560));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `docs/samples/map-layouts-codex-scrolled-${w}x${h}.png` });
  await ctx.close();
}
console.log('page errors:', errors);
await browser.close();
srv.close();
