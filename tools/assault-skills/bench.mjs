// ASSAULT-SKILLS (`docs/notes/assault-skills.md`): the Assault bench's frame cost at Near and Mid, at 393 x 852 with the CPU slowed four
// times (as a mid-range phone), the fight under way, and photographs of it at Near (with a 2x crop of the middle).
//   npm run web && node tools/assault-skills/bench.mjs <before|after> [--seed 1] [--skip 1200]
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const args = process.argv.slice(2);
const tag = args[0] || 'after';
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const seed = opt('--seed', '1');
const skip = opt('--skip', '1200');
const dir = 'docs/samples/assault-skills';
mkdirSync(dir, { recursive: true });
const types = { html: 'text/html', js: 'text/javascript', css: 'text/css', png: 'image/png', webp: 'image/webp', opus: 'audio/ogg', woff2: 'font/woff2', json: 'application/json' };
const server = createServer((req, res) => {
  const path = 'out/web/' + (decodeURIComponent(req.url.split('?')[0]).slice(1) || 'index.html');
  if (!existsSync(path)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.split('.').pop()] || 'application/octet-stream' });
  res.end(readFileSync(path));
}).listen(8822);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [];
const rows = [];
try {
  for (const lod of ['near', 'mid']) {
    const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    const cdp = await ctx.newCDPSession(page);
    await page.goto(`http://127.0.0.1:8822/?bench=assault&seed=${seed}&skip=${skip}&lod=${lod}`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__bench?.ticks > 0, null, { timeout: 120000 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.waitForTimeout(8000);
    if (lod === 'near') {
      for (const n of [1, 2, 3]) {
        await page.screenshot({ path: `${dir}/${tag}-near-${n}.png` });
        await page.screenshot({ path: `${dir}/${tag}-near-${n}-crop2x.png`, clip: { x: 98, y: 280, width: 196, height: 292 } });
        await page.waitForTimeout(2500);
      }
    }
    await page.waitForTimeout(6000);
    const s = await page.evaluate(() => ({ ...window.__bench }));
    rows.push({ lod, fps: s.fps, frameMean: +s.frameMean.toFixed(1), frameP95: +s.frameP95.toFixed(1), workMean: +s.workMean.toFixed(2), simMean: +s.simMean.toFixed(3), simP95: +s.simP95.toFixed(3), fighters: s.fighters, fx: s.fx });
    await ctx.close();
  }
} finally { await browser.close(); server.close(); }
console.log(`${tag} (393 x 852, CPU x4, seed ${seed}, ${skip} ticks in):`);
for (const r of rows) console.log(JSON.stringify(r));
console.log(errors.length ? `page errors: ${errors.join(' | ')}` : '0 page errors');
