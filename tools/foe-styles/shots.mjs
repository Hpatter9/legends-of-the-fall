// FOE-STYLES' page checks: the codex sheet of an entry whose kinds fight their own ways (the Minotaur: its kit, "Its other kinds", the tips),
// at the three upright phone sizes. Serves out/web itself (`npm run web` first); needs playwright and Chromium.
//   node tools/foe-styles/shots.mjs     writes docs/samples/foe-styles-*.png
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
const require = createRequire('/node-tools/node_modules/');
const { chromium } = require('playwright');
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', opus: 'audio/ogg', webp: 'image/webp' };
const srv = createServer((q, r) => {
  const p = 'out/web/' + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(8125);
const browser = await chromium.launch();
const skip = (page) => page.evaluate(() => { for (const b of document.querySelectorAll('#tip button')) if (b.id === 'tipSkip') b.click(); });
const errors = [];
for (const [w, h] of [[393, 852], [360, 780], [412, 915]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${w}: ${e.message}`));
  await page.goto('http://localhost:8125/?seed=7');
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    const m = window.__game.meta;
    const met = ['minotaur1', 'minotaur2', 'minotaur3', 'mazeMino1', 'mazeMino2', 'mazeMino3', 'wolfBlack', 'orcBrute', 'skeleton'];
    m.codex = { met, kills: Object.fromEntries(met.map((d, i) => [d, 3 + i])) };
    localStorage.setItem('legends.meta', JSON.stringify(m));
  });
  await page.reload();
  await page.waitForTimeout(2500);
  await skip(page);
  await page.click('#homeBtn');
  await page.waitForTimeout(1500);
  await skip(page);
  await page.click('.hmTab:has-text("Castle")');
  await page.waitForTimeout(1200);
  await skip(page);
  await page.click('.ctChip:has-text("Codex")');
  await page.waitForTimeout(800);
  await page.click('.cxCard:has-text("Minotaur") >> nth=0');
  await page.waitForTimeout(600);
  await page.evaluate(() => document.querySelector('.cxSheet').scrollTo(0, 380));
  await page.waitForTimeout(200);
  await page.screenshot({ path: `docs/samples/foe-styles-codex-${w}.png` });
  const over = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth || [...document.querySelectorAll('.cxSheet li')].some((li) => li.scrollWidth > li.clientWidth + 1));
  if (over) errors.push(`${w}: something runs off the side`);
  await ctx.close();
}
await browser.close();
srv.close();
console.log(errors.length ? errors.join('\n') : 'no page errors, nothing runs off the side');
