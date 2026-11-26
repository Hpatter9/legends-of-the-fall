// SUMMON-SMOOTH: a short strip of a ten-stone draw at 393 x 852, to show the show is the one it was: the cards face down, mid-turn after
// "Reveal all" with their flourishes, all turned with the totals, a new hero's reveal at its arrival and in full view, and the spread
// with the new allies. No throttle: it is the look that is photographed, not the time.
//   npm run web && node tools/summon-smooth/strip.mjs <out dir> [--starfall]      (ROOT=<another build> for the one before)
import { serve, HEROES, saveScript } from '../audit/lib.mjs';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const out = process.argv[2] ?? 'out/summon-smooth';
const STARFALL = process.argv.includes('--starfall');
mkdirSync(out, { recursive: true });
const port = Number(process.env.PORT ?? 8291);
const srv = serve(process.env.ROOT ?? 'out/web', port);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, hasTouch: true })).newPage();
const OWNED = HEROES.slice(0, 8);
const unlock = { kitsune: 200, werewolf: 200, gorgon: 200, lancer: 200, mercenary: 200, samuraiCommander: 200, karasu: 2, yamabushi: 3, minotaur: 1 };
await page.addInitScript(saveScript(), [OWNED, { stones: 120, heroesSeen: OWNED, unlock, shards: { knight: 3, samurai: 1 } }]);
if (STARFALL) await page.addInitScript(() => {
  localStorage.setItem('legends.purchases', JSON.stringify({ entitlements: ['starfall_summons'] }));
  localStorage.setItem('legends.settings', JSON.stringify({ ...JSON.parse(localStorage.getItem('legends.settings') ?? '{}'), starfall: true }));
});
await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => [...document.querySelectorAll('.hmTab')].some((b) => b.offsetWidth), {}, { timeout: 90000 });
await page.waitForTimeout(800);
await page.evaluate(() => document.getElementById('tipSkip')?.click());
await page.mouse.click(196, 300);
await page.evaluate(() => { for (const b of document.querySelectorAll('.hmTab')) if (b.textContent.includes('Recruit')) b.click(); });
await page.waitForFunction(() => window.__summonFx?.stats.ready, {}, { timeout: 60000 }).catch(() => {});
for (let i = 0; i < 10; i++) {
  const had = await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /^Got it/.test(x.textContent ?? '') && x.offsetParent); b?.click(); return !!b; });
  if (!had) break;
  await page.waitForTimeout(500);
}
await page.waitForTimeout(1200);
const shot = (name) => page.screenshot({ path: `${out}/${name}.png` });
await page.locator('.hlBar button').last().click();
await page.waitForTimeout(120);
await shot('1-face-down');
await page.evaluate(() => document.getElementById('revealAll')?.click());
await page.waitForTimeout(330);
await shot('2-turning');
await page.waitForTimeout(1500);
await shot('3-turned');
const stage = (n) => page.waitForFunction((n) => document.querySelector('.tarotReveal')?.dataset.stage === String(n), n, { timeout: 30000 }).catch(() => {});
await stage(3);
await page.waitForTimeout(250);
await shot('4-arrival');
await stage(4);
await page.waitForTimeout(700);
await shot('5-in-view');
for (let i = 0; i < 80; i++) {
  const st = await page.evaluate(() => ({ up: !!document.querySelector('.tarotReveal'), stage: document.querySelector('.tarotReveal')?.dataset.stage, t: document.getElementById('resultSummary').textContent }));
  if (!st.up && !/…$|turned|wait/.test(st.t)) break;
  if (st.stage === '4') await page.mouse.click(196, 426);
  await page.waitForTimeout(400);
}
await page.waitForTimeout(900);
await shot('6-after');
await browser.close();
srv.close();
