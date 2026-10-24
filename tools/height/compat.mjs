// An old save and a new save both start, and a fight plays to the end with no page errors:
//   node tools/height/compat.mjs <old web dir> <new web dir>
// Makes a save in the old build (a pick of a pack, a run begun, a fight started), then loads it in the new one.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const [oldRoot, newRoot] = process.argv.slice(2);
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', css: 'text/css' };
const serve = (root, port) => createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(port);
const a = serve(oldRoot, 8141);
const b = serve(newRoot, 8142);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let errors = 0;
const open = async (port, storage) => {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { errors++; console.log('PAGE ERROR', port, e.message); });
  await page.goto(`http://localhost:${port}/`);
  if (storage) {
    await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, storage);
    await page.goto(`http://localhost:${port}/`);
  }
  await page.waitForTimeout(2500);
  return page;
};
const playOut = async (page, label) => {
  await page.evaluate(() => { for (const x of document.querySelectorAll('#tip button')) if (x.id === 'tipSkip') x.click(); });
  await page.evaluate(() => { const g = window.__game; document.getElementById('home').hidden = true; for (let k = 0; k < 4; k++) document.getElementById('summon').click(); document.getElementById('auto').click(); document.getElementById('fight').click(); g.setSpeed?.(3); });
  let phase = 'fight';
  for (let i = 0; i < 240 && phase === 'fight'; i++) {
    await page.waitForTimeout(500);
    phase = await page.evaluate(() => window.__game.b.phase);
  }
  console.log(label, 'fight ended:', phase);
};
// the old build: a new save, a pack, a run begun
const old = await open(8141);
// (a new save opens with a cutscene: Skip is one tap)
await old.waitForSelector('.csSkip, .stPack', { timeout: 30000 });
await old.click('.csSkip', { timeout: 15000 }).catch(() => {});
await old.waitForSelector('.stPack', { timeout: 30000 });
await old.click('.stPack:nth-child(1)');
await old.click('.stGo');
await old.getByText('Skip', { exact: true }).click({ timeout: 15000 }).catch(() => {});
await old.waitForFunction(() => window.__game, null, { timeout: 30000 });
await old.waitForTimeout(1500);
await old.evaluate(() => { for (const x of document.querySelectorAll('#tip button')) if (x.id === 'tipSkip') x.click(); });
await old.evaluate(() => { const g = window.__game; document.getElementById('home').hidden = true; for (let k = 0; k < 3; k++) document.getElementById('summon').click(); document.getElementById('auto').click(); });
await old.waitForTimeout(500);
const storage = await old.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
console.log('old save keys:', Object.keys(storage).join(', '));
// the new build: that save loads, and a fight plays out
const next = await open(8142, storage);
console.log('old save loaded; game up:', await next.evaluate(() => typeof window.__game));
await playOut(next, 'old save');
// the new build: a fresh save too
const fresh = await open(8142);
// (a new save opens with a cutscene: Skip is one tap)
await fresh.waitForSelector('.csSkip, .stPack', { timeout: 30000 });
await fresh.click('.csSkip', { timeout: 15000 }).catch(() => {});
await fresh.waitForSelector('.stPack', { timeout: 30000 });
await fresh.click('.stPack:nth-child(3)');
await fresh.click('.stGo');
await fresh.getByText('Skip', { exact: true }).click({ timeout: 15000 }).catch(() => {});
await fresh.waitForFunction(() => window.__game, null, { timeout: 30000 });
await fresh.waitForTimeout(1500);
await playOut(fresh, 'new save');
console.log('page errors:', errors);
await browser.close();
a.close();
b.close();
