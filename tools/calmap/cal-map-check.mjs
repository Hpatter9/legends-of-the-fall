// The compatibility check: an old save (a calamity saved by the version before, with three recruit camps and three campfires) and a new save both start, each plays a
// full fight with no page errors, and the old map keeps all its camps.
//   npm run web && node tools/calmap/cal-map-check.mjs <old-save.json>
import { readFileSync } from 'node:fs';
import { serve, launch, openHome } from './lib.mjs';
const old = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const srv = serve();
const browser = await launch();
const errors = [];
const play = async (page, label) => {
  // the first fight spot lit: choose it, travel, place the heroes automatically and fight
  await page.evaluate(() => { const s = [...document.querySelectorAll('.cmSpot.open.fight .cmHit')][0]; s.click(); });
  await page.waitForTimeout(200);
  await page.evaluate(() => document.querySelector('.rtGo').click());
  await page.waitForTimeout(2800);
  await page.evaluate(() => document.getElementById('auto')?.click());
  await page.waitForTimeout(400);
  await page.evaluate(() => { const b = document.getElementById('fight'); b.disabled = false; b.click(); });
  // the speed button runs it faster; wait for the result card
  for (let i = 0; i < 90; i++) {
    await page.waitForTimeout(1000);
    if (await page.evaluate(() => !document.getElementById('result').hidden)) break;
    await page.evaluate(() => document.getElementById('speed')?.click());
  }
  const banner = await page.evaluate(() => document.getElementById('banner')?.textContent);
  console.log(`${label}: the fight ended: ${banner}`);
  await page.evaluate(() => document.getElementById('next')?.click());
  await page.waitForTimeout(1500);
  const back = await page.evaluate(() => !!document.querySelector('.cmScroll') || !!document.querySelector('.rtCard'));
  console.log(`${label}: back on the map or a card: ${back}`);
};
for (const [label, setup] of [
  ['old save', async (page) => { await page.evaluate((j) => localStorage.setItem('legends.calamity', j), JSON.stringify(old.run)); await page.reload(); await page.waitForTimeout(1800); await page.evaluate(() => { document.getElementById('tipSkip')?.click(); document.getElementById('hmCalamity').click(); }); await page.waitForTimeout(2200); }],
  ['new save', async (page) => { await page.evaluate(() => { document.getElementById('tipSkip')?.click(); document.getElementById('hmCalamity').click(); }); await page.waitForTimeout(1000); await page.evaluate(() => document.querySelector('.cvGrid > *')?.click()); await page.evaluate(() => [...document.querySelectorAll('.cvCard .primary')].at(-1).click()); await page.waitForTimeout(2800); }],
]) {
  const { ctx, page } = await openHome(browser, 393, 852);
  page.on('pageerror', (e) => errors.push(`${label}: ${e.message}`));
  await setup(page);
  const camps = await page.evaluate(() => JSON.parse(localStorage.getItem('legends.calamity') ?? 'null')?.tower?.map?.filter((n) => n.kind === 'recruit' || n.kind === 'campfire').length ?? -1);
  const header = await page.evaluate(() => document.querySelector('.rtTitle')?.textContent);
  console.log(`${label}: starts, header "${header}", recruit+campfire nodes in its map: ${camps}`);
  await play(page, label);
  await ctx.close();
}
await browser.close();
srv.close();
console.log(errors.length ? `PAGE ERRORS:\n${errors.join('\n')}` : 'no page errors');
