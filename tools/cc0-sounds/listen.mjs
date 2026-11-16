// CC0-SOUNDS: builds and serves the listening page (`listen.ts`) next to the built game, so it reads the same sfx/cues/ files.
//
//   npm run web && node tools/cc0-sounds/listen.mjs [port]      then open http://localhost:<port>/listen-sounds.html
//   node tools/cc0-sounds/listen.mjs --shot docs/samples/cc0-sounds.png   (a screenshot, and no server left running)
import * as esbuild from 'esbuild';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const port = +(args.find((a) => /^\d+$/.test(a)) ?? 8794);
const shot = args.includes('--shot') ? args[args.indexOf('--shot') + 1] : null;
if (!existsSync('out/web/sfx/cues')) throw new Error('build the page first: npm run web');

await esbuild.build({ entryPoints: ['tools/cc0-sounds/listen.ts'], outfile: 'out/web/listen-sounds.js', bundle: true, format: 'iife', platform: 'browser',
  target: 'es2022', loader: { '.png': 'dataurl', '.webp': 'dataurl' }, logLevel: 'warning' });
writeFileSync('out/web/listen-sounds.html', `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sound Effects Listening</title>
<style>
:root { --bg: #16121a; --fg: #efe6d6; --dim: #a99e8c; --line: #3a3140; --gold: #d9b36a; --kept: #241e29; }
@media (prefers-color-scheme: light) { :root { --bg: #f6f1e7; --fg: #2a2128; --dim: #6c6258; --line: #d8cdbc; --gold: #8a6420; --kept: #ece4d6; } }
body { margin: 0; padding: 16px; background: var(--bg); color: var(--fg); font: 14px/1.4 system-ui, sans-serif; }
h1 { font-size: 20px; margin: 0 0 6px; color: var(--gold); } header p { color: var(--dim); margin: 0 0 14px; }
table { border-collapse: collapse; width: 100%; } th, td { border-bottom: 1px solid var(--line); padding: 5px 6px; vertical-align: top; text-align: left; }
th { position: sticky; top: 0; background: var(--bg); font-size: 12px; color: var(--dim); }
td.cue { font-weight: 600; white-space: nowrap; } td.cue small { color: var(--dim); font-weight: 400; }
td.num { white-space: nowrap; color: var(--dim); font-variant-numeric: tabular-nums; } td.src { font-size: 12px; } td.src a { color: var(--gold); }
tr.kept td { background: var(--kept); } td.why { color: var(--dim); font-style: italic; }
button { white-space: nowrap; font: inherit; padding: 3px 9px; margin: 1px 2px; border-radius: 6px; border: 1px solid var(--line); background: transparent; color: var(--fg); cursor: pointer; }
button.take { border-color: var(--gold); color: var(--gold); }
@media (max-width: 700px) { td.src, th:nth-child(4) { display: none; } }
</style><div id="root"></div><script src="listen-sounds.js"></script>`);

const types = { html: 'text/html', js: 'text/javascript', opus: 'audio/ogg' };
const srv = createServer((q, r) => {
  const p = `out/web/${decodeURIComponent(q.url.split('?')[0].slice(1))}`;
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(port);
console.log(`http://localhost:${port}/listen-sounds.html`);

if (shot) {
  const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1100, height: 1400 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://localhost:${port}/listen-sounds.html`);
  await page.waitForSelector('tbody tr');
  // (every take decodes and plays without an error: the whole page's buttons pressed once)
  await page.evaluate(async () => { for (const b of document.querySelectorAll('button')) { b.click(); await new Promise((r) => setTimeout(r, 5)); } });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: shot });
  await page.locator('td.cue', { hasText: 'swingLight' }).scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, -60));
  await page.screenshot({ path: shot.replace(/\.png$/, '-blows.png') });
  console.log(`${shot}; ${await page.locator('tbody tr').count()} rows; errors: ${errors.length ? errors.join('; ') : 'none'}`);
  await browser.close();
  srv.close();
}
