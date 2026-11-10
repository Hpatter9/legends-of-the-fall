// UI-ART-WIRE screenshots (docs/notes/ui-art-wire.md): the Quest complete card at the three upright sizes, its rewards all arrived.
//   npm run web && OUT=docs/samples/ui-art-wire TAG=after node tools/ui-art-wire/qc-shots.mjs
// ENTRY may name another build of the entry (the "before" shots bundle main's questComplete.ts the same way).
import * as esbuild from 'esbuild';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = process.env.ROOT ?? 'out/web';
const OUT = process.env.OUT ?? 'out/ui-art-wire';
const TAG = process.env.TAG ?? 'after';
const ENTRY = process.env.ENTRY ?? 'tools/ui-art-wire/qc-entry.ts';
mkdirSync(OUT, { recursive: true });
// (the card's own pictures are inlined; the big sheets its imports reach (heroes, effects, music) are left out, as the card draws none of them)
const small = { name: 'small', setup(b) { b.onLoad({ filter: /\.(png|webp|jpg)$/ }, (a) => { const buf = readFileSync(a.path); return buf.length < 150_000 ? { contents: buf, loader: 'dataurl' } : { contents: '', loader: 'text' }; }); b.onLoad({ filter: /\.(opus|ogg)$/ }, () => ({ contents: '', loader: 'text' })); } };
const built = await esbuild.build({ entryPoints: [ENTRY], bundle: true, format: 'iife', write: false, logLevel: 'error', plugins: [small] });
console.log(`entry: ${(built.outputFiles[0].text.length / 1e6).toFixed(1)} MB`);
const code = built.outputFiles[0].text;
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', webp: 'image/webp', css: 'text/css', json: 'application/json', woff2: 'font/woff2' };
const srv = createServer((q, r) => { const p = `${ROOT}/` + (q.url.split('?')[0].slice(1) || 'index.html'); if (!existsSync(p)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' }); r.end(readFileSync(p)); }).listen(8751);
const browser = await chromium.launch();
let errors = 0;
for (const [w, h] of [[393, 852], [360, 780], [412, 915]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { errors++; console.log('PAGE ERROR', e.message); });
  await page.addInitScript(() => { localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 0, unlocked: ['knight', 'cleric', 'wizard', 'archer', 'samurai'], party: ['knight', 'cleric', 'wizard', 'archer', 'samurai'] })); localStorage.setItem('lotf-tips-off', '1'); localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false })); });
  await page.goto('http://localhost:8751/');
  await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 60000 });
  await page.waitForTimeout(800);
  await page.addScriptTag({ content: code });
  await page.evaluate(() => window.__openQc());
  await page.waitForTimeout(2600);
  await page.screenshot({ path: `${OUT}/quest-complete-${TAG}-${w}.png` });
  await ctx.close();
}
console.log('page errors:', errors);
await browser.close();
srv.close();
