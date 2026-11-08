// One element's picture: node tools/alive/el.mjs <tab index> <selector> <out.png> [wait ms]
import { serve, launch, HEROES, saveScript, clearWay } from './lib.mjs';
const [tab, sel, out, wait] = [Number(process.argv[2]), process.argv[3], process.argv[4], Number(process.argv[5] ?? 1500)];
const srv = serve();
const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
await page.addInitScript(saveScript(), [HEROES]);
await page.goto(`http://localhost:${srv.address().port}/`);
await page.waitForTimeout(3000);
await clearWay(page);
await page.locator('.hmTab').nth(tab).click({ force: true });
await page.waitForTimeout(wait);
await clearWay(page);
await page.locator(sel).first().screenshot({ path: out });
await browser.close(); srv.close();
