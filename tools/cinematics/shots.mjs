// Frames of the pilot cinematics, upright, by seeking the player to a line of each shot (`__game.scenes.seek`):
//   node tools/cinematics/shots.mjs [web dir] [out dir] [--all-sizes] [--only=id,id]
// Writes <out>/<scene>-<n>[-<w>].png, one per frame (needs Playwright, as the other shot scripts). tools/cinematics/strip.py
// lays a scene's frames side by side.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const [root = 'out/web', out = 'out/scenes-raw'] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
mkdirSync(out, { recursive: true });
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', css: 'text/css' };
const srv = createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(8141);
// (the flags: another GL path leaves a band under the bars unpainted in headless Chromium)
// (every scene's frames come from the page: `__game.sceneFrames(id)` gives (shot, beat, seconds in) for each shot's lines once typed)
// By default every scene at 393x852; `--all-sizes` also takes the sample scenes at 360x780 and 412x915.
const allSizes = process.argv.includes('--all-sizes');
const only = process.argv.filter((a) => a.startsWith('--only=')).map((a) => a.slice(7))[0]?.split(',');
const SAMPLE = ['opening', 'gorvak', 'karnok', 'calamityEnds', 'awaken:knight', 'form:calBoss1', 'clear:orcs'];
const safe = (id) => id.replace(/[^\w-]/g, '_');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const [w, h] of allSizes ? [[393, 852], [360, 780], [412, 915]] : [[393, 852]]) {
  const suffix = w === 393 ? '' : `-${w}`;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  page.on('console', (m) => m.type() === 'error' && console.log('CONSOLE', m.text()));
  await page.goto('http://localhost:8141/?seed=7');
  await page.evaluate(() => localStorage.setItem('lotf-tips-off', '1'));
  await page.waitForTimeout(2500);
  const ids = (only ?? (await page.evaluate(() => window.__game.sceneIds()))).filter((id) => w === 393 || SAMPLE.includes(id));
  for (const id of ids) {
    const frames = await page.evaluate((id) => window.__game.sceneFrames(id), id);
    await page.evaluate((id) => void window.__game.playScene(id), id);
    await page.waitForTimeout(1500);
    let n = 0;
    for (const [s, b, t] of frames) {
      await page.evaluate(([s, b, t]) => window.__game.scenes.seek(s, b, t), [s, b, t]);
      await page.waitForTimeout(350);
      await page.screenshot({ path: `${out}/${safe(id)}-${++n}${suffix}.png` });
    }
    // (Skip is one tap, and the scene is gone)
    await page.click('.csSkip');
    await page.waitForTimeout(300);
    const gone = await page.evaluate(() => document.getElementById('cutscene').hidden);
    if (!gone) console.log(w, id, 'STILL UP after Skip');
    console.log(w, id, n, 'frames');
  }
  await ctx.close();
}
await browser.close();
srv.close();
