// Screenshots for docs/samples/gear-best-*.png: the hero sheet's Equipment panel before and after "Equip best" (the bag only), at the three upright phones.
import { serve, launch, HEROES, saveScript } from './lib.mjs';
const srv = serve();
const browser = await launch();
const base = `http://localhost:${srv.address().port}/`;
const items = [['ironSword', 1, 1], ['runedBlade', 4, 8], ['leatherJerkin', 2, 2], ['thornplate', 4, 7], ['luckyCharm', 1, 1], ['phoenixFeather', 4, 6], ['stormStaff', 5, 9]].map(([b, rarity, level], i) => ({ id: i + 1, base: b, rarity, level }));
for (const [w, h] of [[393, 852], [360, 780], [412, 915]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  await page.addInitScript(saveScript(), [HEROES, { equipment: items, nextItem: 8, equipped: { samurai: { weapon: 7 } } }]);
  await page.goto(base);
  await page.waitForTimeout(2000);
  await page.locator('.hmTab').nth(1).click();
  await page.waitForTimeout(800);
  await page.evaluate(() => window.__game.home.openSheet('knight'));
  await page.waitForTimeout(500);
  const size = w === 393 ? '' : `-${w}x${h}`;
  await page.locator('.eqPanel').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `docs/samples/gear-best-before${size}.png` });
  await page.locator('.eqAuto button', { hasText: 'Equip best' }).click();
  await page.waitForTimeout(300);
  await page.locator('.eqPanel').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `docs/samples/gear-best-after${size}.png` });
  await ctx.close();
}
await browser.close();
srv.close();
