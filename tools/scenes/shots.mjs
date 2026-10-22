// Serves out/web and takes the Recruit hall's and the Spells library's samples on an upright phone (393x852, then 360x780 and 412x915):
//   node tools/scenes/shots.mjs      (PORT; DPR default 2; pictures go to docs/samples/scenes-<name>.png)
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const root = 'out/web';
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg' };
const srv = createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(Number(process.env.PORT ?? 8128));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const HEROES = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard'];
const DPR = Number(process.env.DPR ?? 2);
const SIZES = { '393x852': { width: 393, height: 852 }, '360x780': { width: 360, height: 780 }, '412x915': { width: 412, height: 915 } };
mkdirSync('docs/samples', { recursive: true });
const sizes = process.env.SIZES ? process.env.SIZES.split(',') : Object.keys(SIZES);
const metaFor = (spells) => ({ seed: 7, crowns: 2000, unlocked: HEROES, party: HEROES, pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 0, barracks: 0, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: {}, bestStage: 3, tower: 0, daily: {}, bosses: [], achievements: [], spellbook: spells });
for (const size of sizes) {
  const vp = SIZES[size];
  const open = async (tab, spells, pull) => {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: DPR, hasTouch: true });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
    page.on('console', (m) => m.type() === 'error' && console.log('console error', m.text()));
    await page.addInitScript(([meta]) => {
      try {
        localStorage.setItem('legends.meta', JSON.stringify(meta));
        localStorage.setItem('lotf-tips-off', '1');
      } catch {}
    }, [metaFor(spells)]);
    await page.goto(`http://localhost:${srv.address().port}/`);
    await page.waitForTimeout(1200);
    await page.locator('.hmTab').nth(tab).click();
    await page.waitForTimeout(1500);
    return page;
  };
  const shot = (page, name) => page.screenshot({ path: `docs/samples/scenes-${name}-${size}.png` });
  // the hall at rest, mid-pull and at the reveal
  let page = await open(0, undefined);
  await shot(page, 'hall-rest');
  if (size === '393x852' || process.env.ALL) {
    await page.locator('.hlBar button').nth(1).click();
    await page.waitForTimeout(Number(process.env.MID ?? 350));
    await shot(page, 'hall-charge');
    await page.waitForTimeout(Number(process.env.MID2 ?? 250));
    await shot(page, 'hall-beam');
    await page.waitForTimeout(700);
    await shot(page, 'hall-heroes');
    await page.waitForTimeout(2600);
    await shot(page, 'hall-reveal');
  }
  await page.context().close();
  // the library with the budget full, and with locked spells
  const full = { owned: ['heal', 'meteor', 'haste', 'smite', 'shield'], equipped: ['heal', 'meteor', 'smite'] };
  page = await open(4, full);
  await shot(page, 'spells-full');
  await page.evaluate(() => document.querySelector('.lbPanel').scrollTo(0, 1300));
  await page.waitForTimeout(200);
  await shot(page, 'spells-locked');
  await page.context().close();
  console.log('shots', size);
}
await browser.close();
srv.close();
