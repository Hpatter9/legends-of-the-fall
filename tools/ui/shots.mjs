// Screenshots for the pixel UI: node tools/ui/shots.mjs <prefix>  (serves out/web itself; needs playwright and Chromium)
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
const require = createRequire('/node-tools/node_modules/');
const { chromium } = require('playwright');
const prefix = process.argv[2] ?? 'shot';
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg' };
const srv = createServer((q, r) => {
  const p = 'out/web/' + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(8123);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(() => chromium.launch());
for (const [tag, w, h] of [['upright', 393, 852], ['sideways', 852, 393]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto('http://localhost:8123/?seed=7');
  await page.waitForTimeout(2500);
  await page.evaluate(() => { for (const b of document.querySelectorAll('#tip button')) if (b.id === 'tipSkip') b.click(); });
  await page.screenshot({ path: `docs/samples/${prefix}-battle-${tag}.png` });
  await page.click('#homeBtn');
  await page.waitForTimeout(1500);
  await page.evaluate(() => { for (const b of document.querySelectorAll('#tip button')) if (b.id === 'tipSkip') b.click(); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `docs/samples/${prefix}-home-${tag}.png` });
  await ctx.close();
}
await browser.close(); srv.close();
