// Screenshots for docs/samples/talents-*.png: the hero sheet's talent tree of a knight empty, part-specced and full, at 393x852, 360x780 and
// 412x915. The saves hold the same picks the tests use. Run after `npm run web`.
import { serve, launch, HEROES, saveScript } from './lib.mjs';
const srv = serve();
const browser = await launch();
const base = `http://localhost:${srv.address().port}/`;
// XP for level 20 is 30 x 19 x 20; level 9 is 30 x 8 x 9
const states = {
  empty: { xp: { knight: 30 * 19 * 20 }, shards: { knight: 9 } },
  part: { xp: { knight: 30 * 19 * 20 }, shards: { knight: 9 }, talents: { knight: { picks: ['knight:1a', 'knight:1c', 'knight:2a'], bought: 3 } } },
  full: { xp: { knight: 30 * 19 * 20 }, shards: { knight: 9 }, talents: { knight: { picks: ['knight:1a', 'knight:1b', 'knight:1c', 'knight:1d', 'knight:2b', 'knight:3b'], bought: 3 } } },
};
async function shot(name, w, h, kind = 'knight', detail) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  await page.addInitScript(saveScript(), [HEROES, states[name.split('-')[0]]]);
  await page.goto(base);
  await page.waitForTimeout(2000);
  await page.locator('.hmTab').nth(1).click();
  await page.waitForTimeout(800);
  await page.evaluate((k) => window.__game.home.openSheet(k), kind);
  await page.waitForTimeout(500);
  await page.locator('.tPanel button.primary, .tPanel button').filter({ hasText: 'Open talents' }).click();
  await page.waitForTimeout(300);
  if (detail) await page.locator('.tTree .tNode').nth(detail).click();
  await page.locator('.tPanel').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const size = w === 393 ? '' : `-${w}x${h}`;
  await page.screenshot({ path: `docs/samples/talents-${name}${size}.png` });
  await ctx.close();
}
for (const [w, h] of [[393, 852], [360, 780], [412, 915]]) {
  await shot('empty', w, h);
  await shot('part', w, h, 'knight', 6);
  await shot('full', w, h, 'knight', 7);
}
await browser.close();
srv.close();
