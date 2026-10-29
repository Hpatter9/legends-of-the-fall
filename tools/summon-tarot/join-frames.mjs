// Frames of what the player sees when a pull recruits a hero today (the hall's grand show), from the hall and from the reveal screen.
//   npm run web && node tools/summon-tarot/join-frames.mjs [port] [outdir]
import { serve, HEROES, saveScript } from '../audit/lib.mjs';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const port = Number(process.argv[2] ?? 8252);
const out = process.argv[3] ?? 'out/shots/summon-tarot';
mkdirSync(out, { recursive: true });
const srv = serve('out/web', port);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, hasTouch: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
await page.addInitScript(saveScript(), [HEROES.slice(0, 8), { stones: 60, unlock: Object.fromEntries(HEROES.slice(8).map((k) => [k, 200])) }]);
await page.goto(`http://localhost:${port}/`);
await page.waitForFunction(() => [...document.querySelectorAll('.hmTab')].some((b) => b.offsetWidth), {}, { timeout: 90000 });
await page.evaluate(() => document.getElementById('tipSkip')?.click());
await page.evaluate(() => { for (const b of document.querySelectorAll('.hmTab')) if (b.textContent.includes('Recruit')) b.click(); });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/hall-idle.png` });
await page.locator('.hlBar button').first().click();
const t0 = Date.now();
for (const t of [600, 2200, 3300, 4300, 5500]) {
  await page.waitForTimeout(Math.max(0, t - (Date.now() - t0)));
  await page.screenshot({ path: `${out}/hall-${t}.png` });
}
await page.waitForFunction(() => !document.getElementById('gacha').hidden, {}, { timeout: 20000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: `${out}/hall-result.png` });
await browser.close();
srv.close();
