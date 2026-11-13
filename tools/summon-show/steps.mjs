// SUMMON-SHOW: a new hero's reveal photographed on the page's own clock: the page's virtual time is paused and moved on `STEP` ms at a
// time (timers, animation frames and CSS animations alike), with a picture at each step, so the frames are exactly `STEP` apart however
// slow the machine is. Writes out/summon-show/<size>/steps/<ms>.png; strip.py makes the filmstrip.
//   npm run web && [W=393 H=852 STEP=150 UNTIL=4500 SITE=out/web] node tools/summon-show/steps.mjs [port]
import { serve, HEROES, saveScript } from '../audit/lib.mjs';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const port = Number(process.argv[2] ?? 8265);
const srv = serve(process.env.SITE ?? 'out/web', port);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const W = Number(process.env.W ?? 393), H = Number(process.env.H ?? 852);
const STEP = Number(process.env.STEP ?? 150), UNTIL = Number(process.env.UNTIL ?? 4500);
const ctx = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: true });
const page = await ctx.newPage();
await page.addInitScript(saveScript(), [HEROES.slice(0, 8), { stones: 10, heroesSeen: HEROES.slice(0, 8) }]);
await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => [...document.querySelectorAll('.hmTab')].some((b) => b.offsetWidth), {}, { timeout: 120000 });
await page.evaluate(() => document.getElementById('tipSkip')?.click());
await page.evaluate(() => { for (const b of document.querySelectorAll('.hmTab')) if (b.textContent.includes('Recruit')) b.click(); });
await page.waitForTimeout(4000);
const dir = process.env.OUT ?? `out/summon-show/${W}x${H}/steps`;
mkdirSync(dir, { recursive: true });
const cdp = await ctx.newCDPSession(page);
const advance = (ms) => new Promise((done) => {
  cdp.once('Emulation.virtualTimeBudgetExpired', done);
  void cdp.send('Emulation.setVirtualTimePolicy', { policy: 'advance', budget: ms });
});
await cdp.send('Emulation.setVirtualTimePolicy', { policy: 'pause' });
await page.evaluate(() => { void window.__tarot.firstReveal(window.__game.meta, 'shambler', {}); });
for (let t = 0; t <= UNTIL; t += STEP) {
  await page.screenshot({ path: `${dir}/${String(t).padStart(5, '0')}.png` });
  await advance(STEP);
}
console.log('done', dir);
await browser.close();
srv.close();
