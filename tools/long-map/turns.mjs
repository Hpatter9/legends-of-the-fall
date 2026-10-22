// Screenshots and frame times for the turning road, at the upright phone sizes:
//   node tools/long-map/turns.mjs <web dir> [shots|perf|all]
// shots: a deploy on a section facing each of the four ways, a walk round a turn, the whole road zoomed out for two seeds
// (docs/samples/long-map-turns-*.png). perf: frame times over a simulated 15-wave army.
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
}).listen(8134);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const want = (s) => what === 'all' || what === s;
const FACING = ['up-right', 'down-right', 'down-left', 'up-left'];
const open = async (w, h, seed) => {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.stack?.split('\n').slice(0, 5).join(' | ')));
  await page.goto(`http://localhost:8134/?seed=${seed}`);
  await page.waitForTimeout(2500);
  await page.evaluate(() => { for (const b of document.querySelectorAll('#tip button')) if (b.id === 'tipSkip') b.click(); });
  const stage = async (n) => {
    await page.evaluate((n) => { const g = window.__game; g.run.stage = n; g.newBattle(); g.endIntro(); g.autoArrange(); }, n);
    await page.waitForTimeout(1500);
  };
  return { ctx, page, stage };
};
for (const [w, h] of [[393, 852], [360, 780]]) {
  if (want('shots')) {
    const { ctx, page, stage } = await open(w, h, 1);
    const shot = (name) => page.screenshot({ path: `docs/samples/long-map-turns-${name}-${w}.png` });
    await stage(2);
    const rots = await page.evaluate(() => window.__game.chain.sections.map((s) => s.rot));
    console.log(w, 'seed 1 rotations', rots.join(''));
    // a deploy on a section facing each of the four ways (the first wave faces up-right)
    for (const r of [0, 1, 2, 3]) {
      const n = rots.indexOf(r) + 1;
      if (!n) { console.log('no section turned', r); continue; }
      await stage(n);
      await shot(`deploy-${FACING[r]}`);
    }
    // a walk round the first turn: the wave before it, won, then the frames
    const k = rots.findIndex((r, i) => i > 0 && r !== rots[i - 1]);
    await stage(k);
    await page.evaluate((k) => { const g = window.__game; g.run.stage = k + 1; g.startWalk(k); }, k);
    for (let i = 0; i < 8; i++) { await page.waitForTimeout(i < 2 ? 350 : 650); await shot(`walk-${i + 1}`); }
    await ctx.close();
    for (const seed of [7, 3]) {
      const o = await open(w, h, seed);
      await o.stage(15);
      await o.page.evaluate(() => window.__game.overview(true));
      await o.page.waitForTimeout(4500);
      await o.page.screenshot({ path: `docs/samples/long-map-turns-road-seed${seed}-${w}.png` });
      await o.ctx.close();
    }
  }
}
if (want('perf')) {
  const { page, stage } = await open(393, 852, 7);
  const win = (ms) => page.evaluate((ms) => new Promise((done) => { const d = []; let l = performance.now(); const t0 = l; const k = (t) => { d.push(t - l); l = t; t - t0 < ms ? requestAnimationFrame(k) : done(d); }; requestAnimationFrame(k); }), ms);
  const st = (d) => { const a = [...d].sort((x, y) => x - y); return `${a.length} frames, mean ${(a.reduce((x, y) => x + y, 0) / a.length).toFixed(1)} ms, p95 ${a[Math.floor(a.length * 0.95)].toFixed(1)} ms, worst ${a[a.length - 1].toFixed(1)} ms`; };
  await page.evaluate(() => window.__game.setSpeed(3));
  await stage(1);
  console.log('wave 1, no road, deploy:', st(await win(3000)));
  for (const n of [1, 7, 14]) {
    await stage(n);
    const dts = await page.evaluate((n) => new Promise((done) => {
      const g = window.__game;
      g.run.stage = n + 1;
      g.startWalk(n);
      const d = [];
      let last = performance.now();
      const t0 = last;
      const tick = (t) => { d.push(t - last); last = t; g.chain.active && t - t0 < 20000 ? requestAnimationFrame(tick) : done(d); };
      requestAnimationFrame(tick);
    }), n);
    if (n === 1 || n === 7 || n === 14) console.log(`walk ${n} -> ${n + 1}:`, st(dts));
  }
  await stage(15);
  await page.waitForTimeout(2500);
  console.log('wave 15, 14 sections behind, deploy:', st(await win(3000)));
  await page.evaluate(() => window.__game.overview(true));
  await page.waitForTimeout(2500);
  console.log('wave 15, whole road in view:', st(await win(3000)));
  await page.evaluate(() => window.__game.overview(false));
  await stage(15);
  await page.evaluate(() => window.__game.begin());
  console.log('wave 15 fight at x3:', st(await win(4000)));
}
await browser.close();
srv.close();
