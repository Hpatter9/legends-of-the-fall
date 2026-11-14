// STORE-DEV (docs/notes/store-dev-page.md): Settings in the web build (with its Developer page) and in the Play build (without), and a
// sub-page with its one way back, at the three upright phone sizes, into docs/samples/store-dev/.
//
//   npm run web && node build.mjs --store play --out out/web-play && node tools/store-ready/dev-shots.mjs
import { createRequire } from 'node:module';
import { existsSync, mkdirSync } from 'node:fs';
import { serve, HEROES, saveScript } from '../audit/lib.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const exe = ['/opt/pw-browsers/chromium', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find((p) => existsSync(p));
const dir = 'docs/samples/store-dev';
mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ ...(exe ? { executablePath: exe } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [];
let failed = false;
for (const [build, root] of [['web', 'out/web'], ['play', 'out/web-play']]) {
  const srv = serve(root);
  const base = `http://localhost:${srv.address().port}/`;
  for (const [w, h] of [[393, 852], [360, 780], [412, 915]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(`${build} ${w}: ${e.message}`));
    await page.addInitScript(saveScript(), [HEROES, {}]);
    await page.goto(base);
    await page.waitForTimeout(3000);
    await page.locator('#hmGear').click();
    await page.waitForTimeout(600);
    const rows = await page.evaluate(() => [...document.querySelectorAll('#settingsBody .setMenu')].map((b) => b.dataset.page));
    const hasDev = rows.includes('dev');
    console.log(build, w, 'rows:', rows.join(','));
    if (hasDev !== (build === 'web')) failed = true;
    await page.screenshot({ path: `${dir}/${build}-settings-${w}.png` });
    // (a sub-page: the one visible way back)
    await page.locator(`.setMenu[data-page="${build === 'web' ? 'dev' : 'diag'}"]`).click();
    await page.waitForTimeout(400);
    const backs = await page.evaluate(() => [...document.querySelectorAll('#settings button')].filter((b) => b.offsetParent && /back/i.test(b.textContent)).length);
    console.log(build, w, 'visible Back buttons on the sub-page:', backs);
    if (backs !== 1) failed = true;
    await page.screenshot({ path: `${dir}/${build}-subpage-${w}.png` });
    await ctx.close();
  }
  srv.close();
}
console.log('errors', errors);
await browser.close();
if (failed || errors.length) process.exit(1);
