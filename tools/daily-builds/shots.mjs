// Screenshots of the daily build themes (MOCK=1 labels them MOCK-UP, as phase A did) (docs/notes/daily-builds.md): the camp's notice board, the start card of a few themes,
// and the deploy screen with the theme's banner, its goal counted and the featured trait lit. The page's clock is moved to a themed date.
//   node tools/daily-builds/shots.mjs <build dir> [WxH]
// Writes docs/samples/daily-builds-<scene>[-WxH].png.
import { createRequire } from 'node:module';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
import { serve, HEROES, saveScript } from '../audit/lib.mjs';
const [root = 'out/web', size = '393x852'] = process.argv.slice(2);
const [W, H] = size.split('x').map(Number);
const tag = W === 393 && H === 852 ? '' : `-${W}x${H}`;
const srv = serve(root, 8187);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const base = `http://localhost:8187/`;
const out = process.env.OUT ?? 'docs/samples';
const failed = [];
// (the themes start on 26 October 2026; day n after it is: 4 The Swarm, 9 Sea Dogs, 16 Beasts' Night, pinned in test/daily-builds.test.ts' order)
const dateFor = (n) => Date.UTC(2026, 9, 26 + n, 12);
async function open(n) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => failed.push(`page error: ${e.message}`));
  await page.addInitScript((at) => {
    const R = Date;
    const off = at - R.now();
    class D extends R { constructor(...a) { if (a.length) super(...a); else super(R.now() + off); } static now() { return R.now() + off; } }
    window.Date = D;
  }, dateFor(n));
  await page.addInitScript(saveScript(), [HEROES.slice(0, 5), { castle: {}, bestStage: 1, crowns: 120 }]);
  await page.goto(`${base}?seed=7`);
  await page.waitForTimeout(2300);
  await page.evaluate(() => { for (const b of document.querySelectorAll('#tip button')) if (b.id === 'tipSkip') b.click(); });
  // (the page opens on a first battle: Home goes to the camp, once the page is ready for it)
  for (let i = 0; i < 20 && !(await page.$('#hmDaily')); i++) {
    await page.evaluate(() => document.getElementById('homeBtn')?.click());
    await page.waitForTimeout(700);
  }
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  return { ctx, page };
}
const label = (page) => page.evaluate(() => {
  const d = document.createElement('div');
  d.textContent = 'MOCK-UP';
  d.style.cssText = 'position:fixed;left:50%;bottom:6px;transform:translateX(-50%);z-index:9999;padding:2px 10px;font:700 12px sans-serif;letter-spacing:2px;color:#fff;background:rgba(200,30,60,.85);border:1px solid #fff;pointer-events:none';
  document.body.append(d);
});
const shot = async (page, name, wait = 500) => {
  await page.waitForTimeout(wait);
  if (process.env.MOCK) await label(page);
  await page.screenshot({ path: `${out}/daily-builds-${name}${tag}.png` });
  const over = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  if (over) failed.push(`${name}: page wider than the screen`);
};
const group = async (n, fn) => {
  let c;
  try { c = await open(n); await fn(c.page); } catch (e) { failed.push(`${n}: ${String(e.message).split('\n')[0]}`); } finally { await c?.ctx.close(); }
};
await group(16, async (page) => shot(page, 'board', 600));
for (const [n, name] of [[16, 'start-beasts'], [4, 'start-swarm'], [9, 'start-sea']]) await group(n, async (page) => {
  await page.evaluate(() => document.getElementById('hmDaily').click());
  await shot(page, name, 800);
});
// (the deploy screen: Beasts' Night, wave 1 with the day's five placed by Auto; then the boss wave with the goal met)
await group(16, async (page) => {
  await page.evaluate(() => document.getElementById('hmDaily').click());
  await page.waitForTimeout(500);
  await page.evaluate(() => document.querySelector('.dayBtns .primary').click());
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.getElementById('auto').click());
  await shot(page, 'deploy', 900);
  await page.evaluate(() => { const g = window.__game; g.run.stage = 10; g.run.roster.push({ id: 90, kind: 'gorgon', grade: 1 }); g.run.squad = [1, 2, 3, 90, 5]; g.newBattle(); });
  // (the boss's cinematic and its card come first: skip them)
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(700);
    await page.evaluate(() => { document.querySelector('.csSkip')?.click(); document.querySelector('#bossCard button')?.click(); });
  }
  await page.evaluate(() => document.getElementById('auto').click());
  await shot(page, 'deploy-boss', 900);
});
// (a swarm wave: The Swarm's wave 9, eight foes)
await group(4, async (page) => {
  await page.evaluate(() => document.getElementById('hmDaily').click());
  await page.waitForTimeout(500);
  await page.evaluate(() => document.querySelector('.dayBtns .primary').click());
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const g = window.__game; g.run.stage = 9; g.newBattle(); });
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(600);
    await page.evaluate(() => document.querySelector('.csSkip')?.click());
  }
  await page.evaluate(() => document.getElementById('auto').click());
  await shot(page, 'deploy-swarm', 900);
});
console.log(failed.length ? `FAILED\n${failed.join('\n')}` : 'ok');
srv.close();
await browser.close();
