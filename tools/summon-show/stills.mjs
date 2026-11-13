// SUMMON-SHOW: a new hero's reveal photographed at exact moments: the scene held at its beat (`firstReveal`'s `hold`) and the Blender
// show pinned to the moment (`__summonFx.pin`), so a slow machine still gives the frame meant. Writes out/summon-show/<size>/stills/<ms>.png.
//   npm run web && [W=393 H=852] node tools/summon-show/stills.mjs [port]
import { serve, HEROES, saveScript } from '../audit/lib.mjs';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const port = Number(process.argv[2] ?? 8269);
const srv = serve('out/web', port);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const W = Number(process.env.W ?? 393), H = Number(process.env.H ?? 852);
const ctx = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: true });
const page = await ctx.newPage();
await page.addInitScript(saveScript(), [HEROES.slice(0, 8), { stones: 10, heroesSeen: HEROES.slice(0, 8) }]);
await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => [...document.querySelectorAll('.hmTab')].some((b) => b.offsetWidth), {}, { timeout: 120000 });
await page.evaluate(() => document.getElementById('tipSkip')?.click());
await page.evaluate(() => { for (const b of document.querySelectorAll('.hmTab')) if (b.textContent.includes('Recruit')) b.click(); });
await page.waitForFunction(() => window.__summonFx?.stats.ready, {}, { timeout: 60000 });
const dir = `out/summon-show/${W}x${H}/stills`;
mkdirSync(dir, { recursive: true });
// (each moment: the beat the scene holds at, and the show's time)
const beatOf = (t) => (t < 1400 ? 1 : t < 1900 ? 2 : t < 3100 ? 3 : 4);
const MOMENTS = [100, 400, 700, 1000, 1300, 1500, 1650, 1800, 1950, 2100, 2250, 2400, 2600, 2900, 3300, 3800];
let beat = 0;
for (const t of MOMENTS) {
  const b = beatOf(t);
  if (b !== beat) {
    await page.evaluate(() => document.querySelectorAll('.tarotReveal').forEach((e) => e.remove()));
    await page.evaluate((b) => { void window.__tarot.firstReveal(window.__game.meta, 'shambler', { hold: b }); }, b);
    // (the beat's own fades and rises settle)
    await page.waitForTimeout(b === 1 ? 300 : [0, 0, 1700, 2400, 3900][b]);
    beat = b;
  }
  await page.evaluate((t) => window.__summonFx.pin(t), t);
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${dir}/${String(t).padStart(5, '0')}.png`, timeout: 120000 });
}
console.log('done', dir);
await browser.close();
srv.close();
