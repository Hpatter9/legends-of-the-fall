// Screenshots and frame timings for the long map, at the upright phone sizes:
//   node tools/long-map/shots.mjs <web dir> [flow|chain|perf|all]
// flow: win wave 1 for real and take frames of the section falling and the heroes walking across (docs/samples/long-map-*).
// chain: stand the camera back over a 5-section and a 15-section road. perf: frame times over a simulated 15-wave army.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const [root, what = 'all'] = process.argv.slice(2);
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', css: 'text/css' };
const srv = createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(8132);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const want = (s) => what === 'all' || what === s;
for (const [w, h] of [[393, 852], [360, 780]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.stack?.split('\n').slice(0, 5).join(' | ')));
  page.on('console', (m) => m.type() === 'error' && console.log('CONSOLE', m.text()));
  await page.goto(`http://localhost:8132/?seed=${process.env.SEED ?? 7}`);
  await page.waitForTimeout(2500);
  await page.evaluate(() => { for (const b of document.querySelectorAll('#tip button')) if (b.id === 'tipSkip') b.click(); });
  const shot = (name) => page.screenshot({ path: `docs/samples/long-map-${process.env.TAG ?? ''}${name}-${w}.png` });
  const stage = async (n) => {
    await page.evaluate((n) => { const g = window.__game; g.run.stage = n; g.newBattle(); g.endIntro(); g.autoArrange(); }, n);
    await page.waitForTimeout(150);
  };
  if (want('flow')) {
    await stage(1);
    await shot('flow-0-deploy');
    await page.evaluate(() => { const g = window.__game; g.setSpeed(3); g.begin(); });
    // wait for the fight to be won and settled, then follow the walk
    await page.waitForFunction(() => window.__game.b.phase !== 'fight', null, { timeout: 120000 });
    console.log(w, 'phase', await page.evaluate(() => window.__game.b.phase));
    for (let i = 0; i < 14; i++) { await page.waitForTimeout(i < 2 ? 500 : 450); await shot(`flow-${String(i + 1).padStart(2, '0')}`); }
    console.log(w, 'chain active', await page.evaluate(() => window.__game.chain.active));
    await page.click('#next');
    await page.waitForTimeout(600);
    await shot('flow-15-wave2-deploy');
    // drag back along the road to look at the first section
    await page.mouse.move(w / 2, 300);
    await page.mouse.down();
    await page.mouse.move(w / 2 + 60, 560, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(400);
    await shot('flow-16-look-back');
  }
  if (want('chain')) {
    for (const n of [7, 8]) {
      await stage(n);
      await page.waitForTimeout(1200);
      await shot(`wave-${n}-deploy`);
    }
    for (const n of [5, 15]) {
      await stage(n);
      await page.evaluate(() => { const g = window.__game; g.overview(true); });
      await page.waitForTimeout(3500);
      await shot(`road-${n}`);
      await page.evaluate(() => window.__game.overview(false));
    }
  }
  if (want('perf') && w === 393) {
    // frame times (ms between animation frames) over a window, in the page
    const window_ = (ms) => page.evaluate((ms) => new Promise((done) => {
      const dts = [];
      let last = performance.now();
      const t0 = last;
      const tick = (t) => { dts.push(t - last); last = t; t - t0 < ms ? requestAnimationFrame(tick) : done(dts); };
      requestAnimationFrame(tick);
    }), ms);
    const stats = (dts) => { const a = [...dts].sort((x, y) => x - y); const q = (p) => a[Math.min(a.length - 1, Math.floor(a.length * p))]; return `${a.length} frames, mean ${(a.reduce((x, y) => x + y, 0) / a.length).toFixed(1)} ms, p95 ${q(0.95).toFixed(1)} ms, worst ${a[a.length - 1].toFixed(1)} ms`; };
    await page.evaluate(() => window.__game.setSpeed(3));
    await stage(1);
    await page.waitForTimeout(500);
    console.log('wave 1, no road, deploy:', stats(await window_(3000)));
    // a chain walked wave by wave: each transition, as it plays
    for (let n = 1; n <= 14; n++) {
      await stage(n);
      const dts = await page.evaluate((n) => new Promise((done) => {
        const g = window.__game;
        g.run.stage = n + 1;
        g.startWalk(n);
        const dts = [];
        let last = performance.now();
        const tick = (t) => { dts.push(t - last); last = t; g.chain.active ? requestAnimationFrame(tick) : done(dts); };
        requestAnimationFrame(tick);
      }), n);
      if (n === 1 || n === 7 || n === 14) console.log(`wave ${n} -> ${n + 1} walk:`, stats(dts));
    }
    await stage(15);
    await page.waitForTimeout(2500);
    console.log('wave 15, 14 sections behind, deploy:', stats(await window_(3000)));
    console.log('baked textures:', await page.evaluate(() => window.__game.boardView.baked.size), 'scenery sprites:', await page.evaluate(() => window.__game.boardView.sceneryOf.size));
    await page.evaluate(() => window.__game.overview(true));
    await page.waitForTimeout(2500);
    console.log('wave 15, stood back over the whole road:', stats(await window_(3000)));
    await page.evaluate(() => window.__game.overview(false));
    // a real fight at x3 on the long map
    await stage(15);
    await page.evaluate(() => window.__game.begin());
    console.log('wave 15 fight at x3:', stats(await window_(4000)));
  }
  await ctx.close();
}
await browser.close();
srv.close();
