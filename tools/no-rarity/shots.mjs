// Screenshots for docs/notes/no-rarity.md: the starter pick, the hall, a summon and a hero sheet, on upright phones.
//   npm run web && node tools/no-rarity/shots.mjs      (PORT; pictures go to docs/samples/no-rarity-*.png)
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
}).listen(Number(process.env.PORT ?? 8131));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
mkdirSync('docs/samples', { recursive: true });
const url = `http://localhost:${srv.address().port}/`;
const open = async (size, meta) => {
  const [width, height] = size.split('x').map(Number);
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  if (meta) await page.addInitScript(([m]) => { localStorage.setItem('legends.meta', JSON.stringify(m)); localStorage.setItem('legends.tips', '[]'); }, [meta]);
  await page.goto(url);
  return { ctx, page };
};
const HEROES = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard', 'tyrant', 'sage', 'priestess', 'juggernaut', 'reaper', 'cleric', 'gorgon'];
const castle = { treasury: 0, barracks: 0, armoury: 0, mageTower: 0, stable: 0, library: 0 };
const meta = { seed: 7, crowns: 2000, unlocked: HEROES, party: HEROES.slice(0, 5), pulls: 0, sinceNew: 3, castle, shards: { knight: 2 }, stars: {}, xp: { knight: 220 }, bestStage: 3, tower: 0, daily: {}, bosses: [], achievements: [] };

// 1. the starter pick, on a fresh save (the first run), at two phone sizes; then a pack taken
for (const size of ['393x852', '360x780']) {
  const { ctx, page } = await open(size, null);
  await page.waitForSelector('#starter .stPack', { timeout: 20000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `docs/samples/no-rarity-starter-${size}.png` });
  if (size === '393x852') {
    await page.locator('#starter .stPack').nth(1).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'docs/samples/no-rarity-starter-chosen.png' });
    await page.locator('#starter .stGo').click();
    await page.waitForTimeout(1500);
    const m = await page.evaluate(() => JSON.parse(localStorage.getItem('legends.meta')));
    console.log('picked pack', m.starter.pick, 'unlocked', m.unlocked.join(','), 'party', m.party.join(','));
    await page.screenshot({ path: 'docs/samples/no-rarity-after-pick.png' });
  }
  await ctx.close();
}

// 2. the hall, and 3. a summon (a new hero, mid-show), and 4. a hero sheet
for (const size of ['393x852', '360x780']) {
  const { ctx, page } = await open(size, meta);
  await page.waitForTimeout(1500);
  await page.locator('.hmTab').nth(0).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `docs/samples/no-rarity-hall-${size}.png` });
  if (size === '393x852') {
    await page.evaluate(() => { window.__t0 = performance.now(); window.__hall.play([{ kind: 'kitsune', isNew: true, shards: 0 }]); });
    await page.waitForTimeout(3400);
    await page.screenshot({ path: 'docs/samples/no-rarity-summon.png' });
    await page.waitForTimeout(3500);
  }
  await ctx.close();
}
{
  const { ctx, page } = await open('393x852', meta);
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.__game.home.openSheet('tyrant'));
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'docs/samples/no-rarity-hero-sheet.png' });
  await ctx.close();
}
await browser.close();
srv.close();
