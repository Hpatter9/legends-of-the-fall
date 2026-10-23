// Screenshots for docs/notes/tavern-hall.md: each of the three rooms with the full roster, the bar room of a new save,
// the room-name hint, and a frame in the middle of a pan, at 393x852 (and the bar room at 360x780 and 412x915).
//   npm run web && node tools/tavern/shots.mjs      (PORT; pictures go to ${process.env.OUT ?? 'docs/samples'}/tavern-hall-*.png)
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
}).listen(Number(process.env.PORT ?? 8133));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
mkdirSync('docs/samples', { recursive: true });
const url = `http://localhost:${srv.address().port}/`;
const START = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard'];
const ALL = ['archer', 'knight', 'kunoichi', 'samurai', 'wizard', 'peasant', 'ninjaMonk', 'yamabushi', 'wanderer', 'lightningMage', 'gorgon', 'paladin', 'cleric', 'barbarian', 'ranger', 'mercenary', 'mummy', 'buccaneer', 'rifleBot', 'illusionist', 'gunslinger', 'satyr', 'druid', 'warlock', 'samuraiCommander', 'shambler', 'kitsune', 'werewolf', 'karasu', 'minotaur', 'dragoon', 'lancer', 'dreadPirate', 'sage', 'demonSwordsman', 'tyrant', 'siegeBot', 'juggernaut', 'priestess', 'wolfBard', 'timeWitch', 'arcBlade', 'reaper', 'kraken', 'beastmaster'];
const castle = { treasury: 0, barracks: 0, armoury: 0, mageTower: 0, stable: 0, library: 0 };
const metaOf = (owned) => ({ seed: 7, crowns: 600, unlocked: owned, party: owned.slice(0, 5), pulls: 0, castle, shards: {}, stars: {}, xp: {}, bestStage: 3, tower: 0, daily: {}, bosses: [], achievements: [] });
const open = async (size, owned) => {
  const [width, height] = size.split('x').map(Number);
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  page.on('console', (m) => m.type() === 'error' && console.log('console error', m.text()));
  await page.addInitScript(([m]) => { localStorage.setItem('legends.meta', JSON.stringify(m)); localStorage.setItem('lotf-tips-off', '1'); }, [metaOf(owned)]);
  await page.goto(url);
  await page.waitForTimeout(1500);
  await page.locator('.hmTab').nth(1).click();
  await page.waitForTimeout(1500);
  return { ctx, page };
};
const shot = (page, name, size) => page.screenshot({ path: `${process.env.OUT ?? 'docs/samples'}/tavern-hall-${name}-${size}.png` });
const drag = async (page, from, to, steps = 8) => {
  await page.mouse.move(from, 420);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) await page.mouse.move(from + ((to - from) * i) / steps, 420);
  return;
};
for (const size of ['393x852', '360x780', '412x915']) {
  // a new save: five heroes in the bar room, the hint showing (a fresh page: the view has not moved)
  {
    const { ctx, page } = await open(size, START);
    await shot(page, 'new-save', size);
    await ctx.close();
  }
  if (size !== '393x852') {
    // (the other phones: the bar room with the whole roster)
    const full = await open(size, ALL);
    await shot(full.page, 'bar', size);
    await full.ctx.close();
    continue;
  }
  // the whole roster, one room at a time (the names under the picture glide there)
  const { ctx, page } = await open(size, ALL);
  await shot(page, 'bar', size);
  // (the hint on its own: the room names, with the one in view lit)
  await page.locator('.tvNav').screenshot({ path: `${process.env.OUT ?? 'docs/samples'}/tavern-hall-hint-${size}.png` });
  await page.locator('.tvRoom1').nth(1).click();
  await page.waitForTimeout(1200);
  await shot(page, 'hearth', size);
  await page.locator('.tvRoom1').nth(2).click();
  await page.waitForTimeout(1200);
  await shot(page, 'back', size);
  // (the far end of the building: swipe on past the games room's stage until the view stops at the edge)
  for (let i = 0; i < 3; i++) {
    await drag(page, 330, 40, 6);
    await page.mouse.up();
    await page.waitForTimeout(1200);
  }
  await shot(page, 'back-end', size);
  // a frame in the middle of a pan: back at the bar room, a finger half way through a drag to the hearth
  await page.locator('.tvRoom1').nth(0).click();
  await page.waitForTimeout(1200);
  // (and the bar room's left end, with its little hearth)
  for (let i = 0; i < 2; i++) {
    await drag(page, 40, 360, 6);
    await page.mouse.up();
    await page.waitForTimeout(1200);
  }
  await shot(page, 'bar-left', size);
  await page.locator('.tvRoom1').nth(0).click();
  await page.waitForTimeout(1200);
  await drag(page, 330, 90, 6);
  await shot(page, 'pan', size);
  await page.mouse.up();
  await ctx.close();
}
await browser.close();
srv.close();
