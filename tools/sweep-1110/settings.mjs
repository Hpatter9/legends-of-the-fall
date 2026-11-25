// SWEEP-1110, Settings: each page opened, checked for overflow, and left by "‹ Back"; Settings closed. (The Developer page and its
// grants went before release, RELEASE-TRIM.) At the three upright sizes.   npm run web && node tools/sweep-1110/settings.mjs
import { serve, launch, open, wait, SIZES, overflow, out } from './lib.mjs';
const server = serve(8920);
const browser = await launch();
const dir = out('out/sweep-1110/settings');
for (const [w, h] of SIZES) {
  const { ctx, page, log } = await open(browser, w, h, 8920);
  await page.evaluate(() => document.getElementById('hmGear').click());
  await wait(page, 800);
  const pages = await page.evaluate(() => [...document.querySelectorAll('#settingsBody .setMenu[data-page]')].map((b) => b.dataset.page));
  for (const p of pages) {
    await page.evaluate((p) => document.querySelector(`#settingsBody .setMenu[data-page="${p}"]`).click(), p);
    await wait(page, 600);
    await page.screenshot({ path: `${dir}/${p}-${w}.png` });
    const o = await overflow(page);
    if (o.scroll || o.bad.length) console.log(w, p, 'overflow', JSON.stringify(o));
    const back = await page.evaluate(() => { const b = document.querySelector('#settingsBody .setBack'); b?.click(); return !!b; });
    await wait(page, 400);
    const home = await page.evaluate(() => !!document.querySelector('#settingsBody .setMenu[data-page]')?.offsetParent);
    if (!back || !home) console.log(w, p, 'back', back, 'menu again', home);
  }
  await page.evaluate(() => document.getElementById('settingsClose').click());
  await wait(page, 500);
  console.log(w, 'settings closed', await page.evaluate(() => document.getElementById('settings')?.hidden ?? 'no #settings'), 'errors', log.errors.length, log.errors.slice(0, 2));
  await ctx.close();
}
await browser.close();
server.close();
