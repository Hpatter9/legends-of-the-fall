// Screenshots for docs/samples/ultimates-sheet-*.png: the hero sheet of a Cleric below level 15 (the ultimate dimmed, "Unlocks at level 15")
// and at level 20 (unlocked), at 393x852, 360x780 and 412x915. Run after `npm run web`.
import { serve, launch, HEROES, saveScript } from './lib.mjs';
const srv = serve();
const browser = await launch();
const base = `http://localhost:${srv.address().port}/`;
// XP for level n is 30 x (n-1) x n
const xp = (n) => 30 * (n - 1) * n;
const states = { locked: { xp: { cleric: xp(9) } }, unlocked: { xp: { cleric: xp(20) } } };
async function shot(name, w, h, kind = 'cleric') {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  await page.addInitScript(saveScript(), [HEROES, states[name]]);
  await page.goto(base);
  await page.waitForTimeout(2000);
  await page.locator('.hmTab').nth(1).click();
  await page.waitForTimeout(800);
  await page.evaluate((k) => window.__game.home.openSheet(k), kind);
  await page.waitForTimeout(600);
  await page.locator('.hsheet p', { hasText: 'Ultimate' }).first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const size = w === 393 ? '' : `-${w}x${h}`;
  await page.screenshot({ path: `docs/samples/ultimates-sheet-${name}${size}.png` });
  await ctx.close();
}
for (const [w, h] of [[393, 852], [360, 780], [412, 915]]) {
  await shot('locked', w, h);
  await shot('unlocked', w, h);
}
await browser.close();
srv.close();
