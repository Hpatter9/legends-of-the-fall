// The Assault bench at the South Gate, the Iron Gate, the burnt village's decals and the keep, Near and Mid, at 393 and 360 wide (docs/notes/art-wire-5.md).
//   npm run web && node tools/art-wire-5/bench-shots.mjs <before|after> [army]
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const tag = process.argv[2] || 'after';
const army = process.argv[3] || 'orcs';
const dir = 'docs/samples/art-wire-5';
mkdirSync(dir, { recursive: true });
const types = { html: 'text/html', js: 'text/javascript', css: 'text/css', png: 'image/png', webp: 'image/webp', opus: 'audio/ogg', woff2: 'font/woff2', json: 'application/json' };
const server = createServer((req, res) => {
  const path = 'out/web/' + (req.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(path)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.split('.').pop()] || 'application/octet-stream' });
  res.end(readFileSync(path));
}).listen(8821);
const browser = await chromium.launch({ args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
const SPOTS = { southGate: '73,59', ironGate: '61,50', decals: '56,90', keep: '47,47' };
try {
  for (const [width, height] of [[393, 852], [360, 780]]) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    page.on('pageerror', (e) => errors.push(e.message));
    for (const [spot, at] of Object.entries(SPOTS)) {
      for (const lod of ['near', 'mid']) {
        await page.goto(`http://127.0.0.1:8821/?bench=assault&army=${army}&seed=1&worker=0&speed=1&at=${at}&lod=${lod}`, { waitUntil: 'load' });
        await page.waitForTimeout(4000);
        const suffix = army === 'orcs' ? '' : `-${army}`;
        await page.screenshot({ path: `${dir}/${tag}-${spot}-${lod}${suffix}-${width}.jpg`, quality: 68 });
      }
    }
    await page.close();
  }
} finally { await browser.close(); server.close(); }
console.log(errors.length ? `page errors: ${errors.join(' | ')}` : '0 page errors');
