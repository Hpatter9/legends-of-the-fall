// Frame time of a swarm wave in the headless browser (DAILY-BUILDS): The Swarm's wave 9 (eight foes; ten with a build whose SWARM_MAX
// is 10), the day's five placed by Auto, the fight played at x1 for a few seconds while requestAnimationFrame times each frame.
//   node tools/daily-builds/swarmPerf.mjs <build dir> [label]
// Prints the foes on the board, the mean, the 95th percentile and the worst frame in ms. Software rendering (swiftshader), so the
// numbers compare two builds on this machine; they are not a phone's.
import { createRequire } from 'node:module';
import { serve, HEROES, saveScript } from '../audit/lib.mjs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const [root = 'out/web', label = ''] = process.argv.slice(2);
const srv = serve(root, 8189);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 393, height: 852 } });
page.on('pageerror', (e) => console.log('page error', e.message));
// (30 October 2026 is a Swarm day: the first block's fifth)
await page.addInitScript((at) => {
  const R = Date;
  const off = at - R.now();
  class D extends R { constructor(...a) { if (a.length) super(...a); else super(R.now() + off); } static now() { return R.now() + off; } }
  window.Date = D;
}, Date.UTC(2026, 9, 30, 12));
await page.addInitScript(saveScript(), [HEROES.slice(0, 5), { castle: {}, bestStage: 1, crowns: 120 }]);
await page.goto('http://localhost:8189/?seed=7');
await page.waitForTimeout(2300);
for (let i = 0; i < 20 && !(await page.$('#hmDaily')); i++) {
  await page.evaluate(() => { document.getElementById('tipSkip')?.click(); document.getElementById('homeBtn')?.click(); });
  await page.waitForTimeout(700);
}
await page.evaluate(() => document.getElementById('hmDaily').click());
await page.waitForTimeout(500);
await page.evaluate(() => document.querySelector('.dayBtns .primary').click());
await page.waitForTimeout(1500);
const runs = [];
for (let r = 0; r < 3; r++) {
  await page.evaluate(() => { const g = window.__game; g.run.stage = 9; g.newBattle(); });
  for (let i = 0; i < 6; i++) { await page.waitForTimeout(500); await page.evaluate(() => document.querySelector('.csSkip')?.click()); }
  await page.evaluate(() => { document.getElementById('auto').click(); });
  await page.waitForTimeout(400);
  const foes = await page.evaluate(() => window.__game.b.units.filter((u) => u.side === 'foe').length);
  await page.evaluate(() => document.getElementById('fight').click());
  await page.waitForTimeout(600);
  const ms = await page.evaluate(() => new Promise((done) => {
    const out = [];
    let last = performance.now();
    const end = last + 6000;
    const tick = (t) => { out.push(t - last); last = t; if (t < end) requestAnimationFrame(tick); else done(out); };
    requestAnimationFrame(tick);
  }));
  runs.push({ foes, ms });
}
const all = runs.flatMap((r) => r.ms).sort((a, b) => a - b);
const mean = all.reduce((n, x) => n + x, 0) / all.length;
console.log(`${label} foes ${runs.map((r) => r.foes).join('/')} · frames ${all.length} · mean ${mean.toFixed(1)} ms · p95 ${all[Math.floor(all.length * 0.95)].toFixed(1)} ms · worst ${all[all.length - 1].toFixed(1)} ms`);
srv.close();
await browser.close();
