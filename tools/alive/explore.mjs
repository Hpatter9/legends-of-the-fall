// A first look round: every home tab at 393x852, to the scratch folder given.
import { serve, launch, HEROES, saveScript, clearWay } from './lib.mjs';
const out = process.argv[2] ?? '.';
const srv = serve();
const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, hasTouch: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
await page.addInitScript(saveScript(), [HEROES]);
await page.goto(`http://localhost:${srv.address().port}/`);
await page.waitForTimeout(3000);
await clearWay(page);
await page.waitForTimeout(1000);
await page.screenshot({ path: `${out}/home.png` });
const tabs = await page.locator('.hmTab').allTextContents();
console.log('tabs', tabs);
for (let i = 0; i < tabs.length; i++) {
  await clearWay(page);
  await page.locator('.hmTab').nth(i).click({ force: true });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${out}/tab${i}.png` });
}
await browser.close(); srv.close();
