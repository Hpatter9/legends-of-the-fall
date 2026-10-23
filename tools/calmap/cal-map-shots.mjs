// Screenshots of the Calamity's map, shop, rewards and recap (docs/samples/cal-map-*.png), at 393x852, 360x780 and 412x915:
//   npm run web && node tools/calmap/cal-map-shots.mjs
import * as esbuild from 'esbuild';
import { mkdirSync } from 'node:fs';
import { serve, launch, openHome } from './lib.mjs';
mkdirSync('out/shots', { recursive: true });
await esbuild.build({ entryPoints: ['tools/calmap/map-saves.ts'], bundle: true, platform: 'node', format: 'esm', outfile: 'out/shots/map-saves.mjs', logLevel: 'error', loader: { '.png': 'empty' } });
const S = await import('../../out/shots/map-saves.mjs');
const srv = serve();
const browser = await launch();
const SIZES = [[393, 852], [360, 780], [412, 915]];
const open = async (page, run) => {
  await page.evaluate((j) => localStorage.setItem('legends.calamity', j), JSON.stringify(run));
  await page.reload();
  await page.waitForTimeout(1800);
  await page.evaluate(() => { document.getElementById('tipSkip')?.click(); document.getElementById('hmCalamity').click(); });
  await page.waitForTimeout(2400);
};
const errors = [];
for (const [w, h] of SIZES) {
  const sfx = w === 393 ? '' : `-${w}`;
  const mk = async (run) => {
    const { ctx, page } = await openHome(browser, w, h);
    page.on('pageerror', (e) => errors.push(e.message));
    await open(page, run);
    return { ctx, page };
  };
  const shot = (page, name) => page.screenshot({ path: `docs/samples/cal-map-${name}${sfx}.png` });
  // 1. the map from the start: the islands further apart, the portal and the first spots
  { const { ctx, page } = await mk(S.fresh(5)); await shot(page, 'start'); await ctx.close(); }
  // 2. a detour fight picked: what it is, why, what it pays
  {
    const d = S.detour(1);
    const { ctx, page } = await mk(d.run);
    await page.evaluate((id) => document.querySelector(`.cmSpot[data-id="${id}"] .cmHit`).click(), d.id);
    await page.waitForTimeout(300);
    await shot(page, 'detour');
    await ctx.close();
  }
  // 3. the recruit spot: one free hero out of three
  {
    const { ctx, page } = await mk(S.beforeRecruit(3));
    await page.evaluate(() => document.querySelector('.cmSpot.recruit.open .cmHit').click());
    await page.waitForTimeout(150);
    await page.evaluate(() => document.querySelector('.rtGo').click());
    await page.waitForTimeout(2600);
    await shot(page, 'recruit');
    await page.evaluate(() => document.querySelector('.rtCard .rtItem').click());
    await page.waitForTimeout(300);
    await shot(page, 'recruit-chosen');
    await ctx.close();
  }
  // 4. the shop: sections; then leave and go back with more gold (the back-tracking fix), and buy
  {
    const a = S.atShop(3);
    const { ctx, page } = await mk(a.run);
    await page.evaluate((id) => document.querySelector(`.cmSpot[data-id="${id}"] .cmHit`).click(), a.id);
    await page.waitForTimeout(150);
    await page.evaluate(() => document.querySelector('.rtGo').click());
    await page.waitForTimeout(1400);
    await shot(page, 'shop');
    await page.evaluate(() => [...document.querySelectorAll('.rtCard .primary')].at(-1).click());
    await page.waitForTimeout(800);
    // (more gold, and the same shop again: tap it where the party stands)
    await page.evaluate((id) => { window.__game.run.gold = 400; document.querySelector(`.cmSpot[data-id="${id}"] .cmHit`).click(); }, a.id);
    await page.waitForTimeout(200);
    await page.evaluate(() => document.querySelector('.rtGo').click());
    await page.waitForTimeout(1500);
    const open2 = await page.evaluate(() => !!document.querySelector('.rtCard.shop'));
    console.log(`${w}: the shop opens again: ${open2}`);
    await shot(page, 'shop-again');
    await ctx.close();
  }
  // 5. the recap of a map just cleared, over the next map's start (the leader on the new map's start spot)
  {
    const { ctx, page } = await mk(S.afterBoss(9));
    await shot(page, 'recap');
    await page.evaluate(() => document.querySelector('.rtCard.ccCard .primary').click());
    await page.waitForTimeout(900);
    await shot(page, 'next-map');
    await ctx.close();
  }
  // 6. the victory screen
  {
    const v = S.victory(3);
    const { ctx, page } = await openHome(browser, w, h);
    page.on('pageerror', (e) => errors.push(e.message));
    await page.evaluate(([run, s]) => window.__game.towerView.showSummary(run, s, () => {}), [v.run, v.summary]);
    await page.waitForTimeout(1800);
    await shot(page, 'victory');
    await page.evaluate(() => { document.querySelector('.rtCard.victory').scrollTop = 99999; });
    await page.waitForTimeout(200);
    await shot(page, 'victory-end');
    await ctx.close();
  }
}
await browser.close();
srv.close();
console.log(errors.length ? `PAGE ERRORS: ${errors.join(' | ')}` : 'no page errors');
