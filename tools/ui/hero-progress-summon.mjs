// Plays two pulls in a row in the summoning hall and reports whether each one ran the show (not only the first).
//   node tools/ui/hero-progress-summon.mjs   (after npm run web)
import { serve, launch, HEROES, saveScript } from './hp-lib.mjs';
const srv = serve();
const browser = await launch();
const base = `http://localhost:${srv.address().port}/`;
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
await page.addInitScript(saveScript(), [HEROES.slice(0, 22), {}]);
await page.goto(base);
await page.waitForTimeout(2300);
await page.evaluate(() => document.querySelector('#hmTabs')?.children[1]?.click());
await page.evaluate(() => { for (const b of document.querySelectorAll('.hmTab')) if (b.textContent.includes('Recruit')) b.click(); });
await page.waitForTimeout(800);
for (let i = 1; i <= 3; i++) {
  await page.locator('.hlBar button').first().click();
  await page.waitForTimeout(300);
  const on = await page.evaluate(() => document.querySelector('.hlSkip')?.classList.contains('on'));
  console.log('pull', i, 'show running:', on);
  await page.screenshot({ path: `/tmp/hp-pull${i}.png` });
  // a tap skips, then the reveal opens; close it
  if (on) await page.mouse.click(200, 400);
  await page.waitForTimeout(700);
  await page.evaluate(() => document.getElementById('gachaClose')?.click());
  await page.waitForTimeout(500);
}
await browser.close();
srv.close();
