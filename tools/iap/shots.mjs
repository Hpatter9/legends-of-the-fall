// IAP (docs/notes/iap.md): pictures of the summoning's odds sheet and of every Shop screen (the fake provider, `?shop=fake`), at the three
// upright phone sizes, into docs/samples/iap/. Fails on a page error, or if the web build without `?shop=fake` shows a Shop.
//
//   npm run web && node tools/iap/shots.mjs [--only odds|shop]
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { serve, saveScript } from '../audit/lib.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const exe = ['/opt/pw-browsers/chromium', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find((p) => existsSync(p));
const launch = () => chromium.launch({ ...(exe ? { executablePath: exe } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : '';
const dir = 'docs/samples/iap';
mkdirSync(dir, { recursive: true });
const browser = await launch();
const srv = serve('out/web');
const base = `http://localhost:${srv.address().port}/`;
const errors = [];
let failed = false;
const FEW = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard', 'peasant'];
const shot = (page, name, w) => page.screenshot({ path: `${dir}/${name}-${w}.png` });

for (const [w, h] of [[393, 852], [360, 780], [412, 915]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${w}: ${e.message}`));
  await page.addInitScript(saveScript(), [FEW, { stones: 24, armies: {} }]);
  if (!only || only === 'odds') {
    await page.goto(base);
    await page.waitForTimeout(2500);
    await page.locator('.hmTab').first().click();
    await page.waitForTimeout(1200);
    await shot(page, 'sanctum', w);
    await page.locator('.hlOddsBtn').click();
    await page.waitForTimeout(500);
    await shot(page, 'odds', w);
    await page.locator('#oddsSheet .omBody').evaluate((b) => (b.scrollTop = b.scrollHeight * 0.45));
    await page.waitForTimeout(200);
    await shot(page, 'odds-heroes', w);
    await page.locator('#oddsSheet .omBody').evaluate((b) => (b.scrollTop = b.scrollHeight));
    await page.waitForTimeout(200);
    await shot(page, 'odds-chests', w);
    // (the web build without the switch: no Shop anywhere)
    const shop = await page.evaluate(() => !!document.querySelector('#hmShop:not([hidden])'));
    console.log(w, 'web build shows a Shop:', shop);
    if (shop) failed = true;
  }
  if (!only || only === 'shop') {
    await page.goto(`${base}?shop=fake`);
    await page.waitForTimeout(2500);
    const shop = page.locator('#hmShop');
    if (!(await shop.isVisible())) {
      console.log(w, 'no Shop button with ?shop=fake');
      failed = true;
    } else {
      await shot(page, 'home-shop-button', w);
      await shop.click();
      await page.waitForTimeout(800);
      await shot(page, 'shop', w);
      for (const [i, sec] of ['crowns', 'bundles', 'cosmetics'].entries()) {
        await page.locator('#iapShop .omSection').nth(i + 1).evaluate((s) => s.scrollIntoView({ block: 'start' }));
        await page.waitForTimeout(200);
        await shot(page, `shop-${sec}`, w);
      }
      // (a purchase: the confirm, then the grant's card)
      await page.locator('#iapShop .omSection').first().evaluate((s) => s.scrollIntoView({ block: 'start' }));
      await page.locator('#iapShop .iapItem').first().click();
      await page.waitForTimeout(700);
      await shot(page, 'shop-bought', w);
      const stones = await page.evaluate(() => JSON.parse(localStorage.getItem('legends.meta')).stones);
      console.log(w, 'stones after the pouch:', stones);
      if (stones !== 24 + 12) failed = true;
      await page.locator('#iapDone .omBack, #iapDone .omPrimary').first().click().catch(() => {});
      await page.waitForTimeout(300);
      // (offline: the shop says it needs a connection)
      await page.locator('#iapShop .omBack').click().catch(() => {});
      await ctx.setOffline(true);
      await page.evaluate(() => window.dispatchEvent(new Event('offline')));
      await shop.click();
      await page.waitForTimeout(600);
      await shot(page, 'shop-offline', w);
      await ctx.setOffline(false);
    }
  }
  await ctx.close();
}
srv.close();
console.log('errors', errors);
await browser.close();
if (failed || errors.length) process.exit(1);
