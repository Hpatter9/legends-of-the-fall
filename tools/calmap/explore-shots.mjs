// Screenshots of the Calamity's free exploration (docs/samples/calamity-explore-*.png), at 393x852 and 360x780:
//   node tools/calmap/explore-shots.mjs      (builds nothing: run `npm run web` first)
import * as esbuild from 'esbuild';
import { mkdirSync } from 'node:fs';
import { serve, launch, openHome } from './lib.mjs';
mkdirSync('out/shots', { recursive: true });
await esbuild.build({ entryPoints: ['tools/calmap/saves.ts'], bundle: true, platform: 'node', format: 'esm', outfile: 'out/shots/saves.mjs', logLevel: 'error' });
const S = await import('../../out/shots/saves.mjs');
const srv = serve();
const browser = await launch();
const sizes = process.env.SIZES ? process.env.SIZES.split(',').map((w) => [Number(w), w === '360' ? 780 : 852]) : [[393, 852], [360, 780]];
const open = async (page, run) => {
  await page.evaluate((j) => localStorage.setItem('legends.calamity', j), JSON.stringify(run));
  await page.reload();
  await page.waitForTimeout(2000);
  await page.evaluate(() => { document.getElementById('tipSkip')?.click(); document.getElementById('hmCalamity').click(); });
  await page.waitForTimeout(2200);
};
for (const [w, h] of sizes) {
  const sfx = w === 393 ? '' : `-${w}`;
  const shot = (page, name) => page.screenshot({ path: `docs/samples/calamity-explore-${name}${sfx}.png` });
  // 1. mid-exploration, both branches of a fork visited, the header's count
  {
    const { ctx, page } = await openHome(browser, w, h);
    const e = S.explored(1);
    await open(page, e.run);
    await shot(page, 'explored');
    // 2. a backtrack: tap the cleared first branch and travel; caught mid-walk
    await page.evaluate((a) => document.querySelector(`.cmSpot[data-id="${a}"] .cmHit`).click(), e.a);
    await page.waitForTimeout(150);
    await page.evaluate(() => document.querySelector('.rtGo').click());
    await page.waitForTimeout(120);
    await shot(page, 'backtrack');
    await page.waitForTimeout(1800);
    await ctx.close();
  }
  // 3. the boss's confirm, with spots left
  {
    const { ctx, page } = await openHome(browser, w, h);
    await open(page, S.atDoor(15, 2));
    await page.evaluate(() => { const b = document.querySelector('.cmSpot.boss .cmHit'); b.click(); });
    await page.waitForTimeout(200);
    await page.evaluate(() => document.querySelector('.rtGo').click());
    await page.waitForTimeout(1900);
    await shot(page, 'boss-confirm');
    await ctx.close();
  }
  // 4. back from a cleared spot: the camp of recruits closed, the camera eased onto the hero standing there (the map had been panned away first)
  {
    const { ctx, page } = await openHome(browser, w, h);
    const e = S.explored(1);
    await open(page, e.run);
    await page.evaluate(() => { document.querySelector('.cmSpot.recruit.open .cmHit').click(); });
    await page.waitForTimeout(150);
    await page.evaluate(() => document.querySelector('.rtGo').click());
    await page.waitForTimeout(2000);
    // (the card is open: pan the map away under it, then close the card)
    await page.evaluate(() => { document.querySelector('.cmScroll').scrollTop = 0; });
    await page.evaluate(() => [...document.querySelectorAll('.rtCard .primary')].at(-1).click());
    await page.waitForTimeout(120);
    await shot(page, 'returned-easing');
    await page.waitForTimeout(1400);
    await shot(page, 'returned');
    await ctx.close();
  }
}
await browser.close();
srv.close();
