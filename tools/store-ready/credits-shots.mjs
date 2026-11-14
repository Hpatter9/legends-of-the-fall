// STORE-CREDITS (docs/notes/store-credits.md): the Credits page at the three upright phone sizes, into docs/samples/store-credits/:
// Settings' list with the Credits row, the page's top, a section with licence tags, the unconfirmed marks, and About's line.
//
//   npm run web && node tools/store-ready/credits-shots.mjs
import { createRequire } from 'node:module';
import { existsSync, mkdirSync } from 'node:fs';
import { serve, HEROES, saveScript } from '../audit/lib.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const exe = ['/opt/pw-browsers/chromium', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find((p) => existsSync(p));
const dir = 'docs/samples/store-credits';
mkdirSync(dir, { recursive: true });
const srv = serve();
const browser = await chromium.launch({ ...(exe ? { executablePath: exe } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const base = `http://localhost:${srv.address().port}/`;
const errors = [];
for (const [w, h] of [[393, 852], [360, 780], [412, 915]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${w}: ${e.message}`));
  await page.addInitScript(saveScript(), [HEROES, {}]);
  await page.goto(base);
  await page.waitForTimeout(3000);
  const shot = (n) => page.screenshot({ path: `${dir}/${n}-${w}.png` });
  await page.locator('#hmGear').click();
  await page.waitForTimeout(600);
  await shot('settings');
  await page.locator('.setMenu[data-page="credits"]').click();
  await page.waitForTimeout(600);
  await shot('credits-top');
  const scrollTo = async (text) => {
    await page.evaluate((t) => {
      const e = [...document.querySelectorAll('#credits .crEntry')].find((x) => x.textContent.includes(t));
      e?.scrollIntoView({ block: 'start' });
    }, text);
    await page.waitForTimeout(300);
  };
  await scrollTo('Blackmoor Colossus');
  await shot('credits-music');
  await scrollTo('Golem Forge');
  await shot('credits-unconfirmed');
  const sizes = await page.evaluate(() => {
    const c = document.querySelector('#credits .om').getBoundingClientRect();
    return { cardW: c.width, viewW: innerWidth, scrollW: document.documentElement.scrollWidth, entries: document.querySelectorAll('#credits .crEntry').length };
  });
  console.log(w, JSON.stringify(sizes));
  await page.locator('#credits .omBack').click();
  await page.waitForTimeout(400);
  console.log(w, 'after Back, settings open:', await page.evaluate(() => !document.getElementById('settings').hidden && !document.getElementById('credits')));
  await page.locator('.setMenu[data-page="about"]').click();
  await page.waitForTimeout(400);
  await shot('about');
  await ctx.close();
}
console.log('errors', errors);
await browser.close();
srv.close();
