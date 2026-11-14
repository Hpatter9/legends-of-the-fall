// STORE-READY (docs/notes/store-readiness.md): a proposed set of Google Play listing pictures from the built game (`npm run web` first).
// Phone screenshots at 1080x1920 (9:16, a 360x640 page at 3x: Play takes 9:16 to 2:1 sides, 320 to 3840 px; 1080 px or more is what
// Play asks of a game's screenshots to show them large), the 1024x500 feature graphic and the 512x512 icon, into docs/store/.
//
//   node tools/store-ready/shots.mjs
import { mkdirSync, copyFileSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { serve, HEROES, saveScript } from '../audit/lib.mjs';

// (the audit's launch names one Chromium build; this takes whichever the machine has)
const { chromium } = createRequire(import.meta.url)('playwright');
const exe = ['/opt/pw-browsers/chromium', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find((p) => existsSync(p));
const launch = () => chromium.launch({ ...(exe ? { executablePath: exe } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

const dir = 'docs/store';
mkdirSync(dir, { recursive: true });
const srv = serve();
const browser = await launch();
const base = `http://localhost:${srv.address().port}/`;
const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, hasTouch: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
await page.addInitScript(saveScript(), [HEROES, {}]);
await page.goto(base);
await page.waitForTimeout(3000);
const shot = async (n) => {
  await page.screenshot({ path: `${dir}/phone-${n}.png` });
  console.log(`${dir}/phone-${n}.png`);
};
for (const [i, n] of [[2, '1-battle'], [1, '2-heroes'], [0, '3-recruit'], [3, '4-castle']]) {
  await page.locator('.hmTab').nth(i).click();
  await page.waitForTimeout(2000);
  await shot(n);
}
await page.evaluate(() => window.__game.home.openArmies());
await page.waitForTimeout(1500);
await shot('5-armies');
await page.evaluate(() => {
  const g = window.__game; g.run.gold = 99999;
  for (let i = 0; i < 40; i++) document.getElementById('summon')?.click();
  g.run.stage = 8; g.run.squad = [...g.run.roster].sort((a, b) => b.grade - a.grade).slice(0, 5).map((h) => h.id);
  document.getElementById('home').hidden = true; g.newBattle();
});
await page.waitForTimeout(1200);
// (the tutorial's counsel bubbles are skipped, so the pictures show the board)
const skip = async () => {
  for (let i = 0; i < 4; i++) {
    const b = page.getByText('Skip tutorial').first();
    if (!(await b.isVisible().catch(() => false))) break;
    await b.click().catch(() => {});
    await page.waitForTimeout(400);
  }
};
await skip();
await page.waitForTimeout(600);
await shot('6-deploy');
await page.evaluate(() => document.getElementById('fight').click());
await page.waitForTimeout(4000);
await skip();
await page.waitForTimeout(8000);
await shot('7-fight');
await ctx.close();

// The feature graphic: the war camp's painting, the game's name in its title font. A stand-in until a painted one is made.
const fg = await browser.newPage({ viewport: { width: 1024, height: 500 }, deviceScaleFactor: 1 });
const art = `data:image/png;base64,${readFileSync('src/art/camp/camp-war.png').toString('base64')}`;
const font = `data:font/woff2;base64,${readFileSync('out/web/fonts/cinzel-decorative-latin-900-normal.woff2').toString('base64')}`;
await fg.setContent(`<style>@font-face{font-family:T;src:url(${font})}html,body{margin:0;width:1024px;height:500px;overflow:hidden;background:#000}
.a{position:absolute;inset:0;background:url(${art}) center 40%/cover;image-rendering:auto}
.s{position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,.78),rgba(0,0,0,.25) 60%,rgba(0,0,0,0))}
h1{position:absolute;left:56px;top:150px;margin:0;font:900 64px/1.05 T;color:#f3d48a;text-shadow:0 3px 0 #5a2a0a,0 0 24px rgba(0,0,0,.8)}
</style><div class=a></div><div class=s></div><h1>Legends<br>of the<br>Last Keep</h1>`);
await fg.waitForTimeout(500);
await fg.screenshot({ path: `${dir}/feature-graphic.png` });
console.log(`${dir}/feature-graphic.png`);
copyFileSync('src/art/icon-512.png', `${dir}/icon-512.png`);
await browser.close();
srv.close();
