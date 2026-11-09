// The screens this round's icons and frames changed, at 393 and 360 wide (docs/notes/art-wire-5.md).
//   npm run web && node tools/art-wire-5/checks.mjs <before|after>
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import * as esbuild from 'esbuild';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const tag = process.argv[2] || 'after';
const dir = 'docs/samples/art-wire-5';
mkdirSync(dir, { recursive: true });
await esbuild.build({ entryPoints: ['tools/art-wire-5/lab.ts'], outfile: 'out/art-wire-5-lab.js', bundle: true, format: 'iife', platform: 'browser', loader: { '.png': 'dataurl', '.webp': 'dataurl' } });
const types = { html: 'text/html', js: 'text/javascript', css: 'text/css', png: 'image/png', webp: 'image/webp', opus: 'audio/ogg', woff2: 'font/woff2' };
const server = createServer((req, res) => {
  const path = req.url === '/__lab.js' ? 'out/art-wire-5-lab.js' : 'out/web/' + (req.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(path)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.split('.').pop()] || 'application/octet-stream' });
  res.end(readFileSync(path));
}).listen(8822);
const browser = await chromium.launch({ args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(() => {
  localStorage.setItem('legends.settings', JSON.stringify({ music: 0, effects: 0, cinematics: false, quips: false }));
  localStorage.setItem('legends.tips', JSON.stringify(['home', 'deploy', 'fight', 'mana', 'skill', 'ult', 'summon', 'crowns', 'calamity', 'tower', 'talents', 'castle', 'spellbook', 'stash', 'equipment', 'recycle', 'retry', 'autoReplay']));
});
const shot = async (name) => { await page.waitForTimeout(300); await page.screenshot({ path: `${dir}/${tag}-${name}.jpg`, quality: 68 }); };
const decoded = (sel) => page.locator(sel).evaluateAll(async (ims) => { await Promise.all(ims.map((i) => i.decode())); return ims.length > 0 && ims.every((i) => i.naturalWidth > 0); });
try {
  await page.goto('http://127.0.0.1:8822/?seed=7', { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => window.__game, null, { timeout: 180000 });
  await page.addScriptTag({ url: 'http://127.0.0.1:8822/__lab.js' });
  await page.evaluate(() => window.__artWire5.ready);
  const run = (fn, arg) => page.evaluate(([f, a]) => window.__artWire5[f](a), [fn, arg]);
  for (const [width, height] of [[393, 852], [360, 780]]) {
    await page.setViewportSize({ width, height });
    await run('board', 'council');
    await shot(`council-${width}`);
    await run('board', 'news');
    assert.ok(await decoded('#nemesisBoard .nmNews img'));
    await shot(`news-${width}`);
    await page.locator('#nemesisBoard .nmNews').last().scrollIntoViewIfNeeded();
    await shot(`news-bottom-${width}`);
    await run('board', 'spoils');
    assert.ok(await decoded('#nemesisBoard .nmToken'));
    await shot(`spoils-${width}`);
    for (let g = 0; g < 3; g++) {
      await run('traits', g);
      assert.equal(await page.locator('#nemesisCard .nmTraitIcon').count(), 3);
      await shot(`traits-${g}-${width}`);
    }
    await run('taunt', 3);
    assert.equal(await page.locator('.tcFoe .tcScars').count(), 1);
    await shot(`taunt-${width}`);
    await run('houses');
    await shot(`houses-${width}`);
    await run('line');
    assert.ok(await decoded('#houseLine .hsHeirloomChip img'));
    await shot(`line-${width}`);
    await run('season', 0);
    await shot(`season-${width}`);
    await run('gear');
    await shot(`gear-${width}`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    console.log('shots', tag, width);
  }
} finally { await browser.close(); server.close(); }
console.log(errors.length ? `page errors: ${errors.join(' | ')}` : '0 page errors');
assert.deepEqual(errors, []);
