// Screenshots for docs/notes/tavern-life.md: the three rooms with every hero at their activity (two views a room on a phone), a new
// save's five at the bar, reduced motion, and a strip of frames of a few activities, at 393x852 (and the rooms at 360x780 and 412x915).
//   npm run web && node tools/tavern-life/shots.mjs     (PORT, default 8791; pictures go to ${OUT ?? 'docs/samples'}/tavern-life-*.png)
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const root = 'out/web';
const OUT = process.env.OUT ?? 'docs/samples';
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', opus: 'audio/ogg' };
const srv = createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(Number(process.env.PORT ?? 8791));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
mkdirSync(OUT, { recursive: true });
const url = `http://localhost:${srv.address().port}/`;
const START = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard'];
const ALL = ['archer', 'knight', 'kunoichi', 'samurai', 'wizard', 'peasant', 'ninjaMonk', 'yamabushi', 'wanderer', 'lightningMage', 'gorgon', 'paladin', 'cleric', 'barbarian', 'ranger', 'mercenary', 'mummy', 'buccaneer', 'rifleBot', 'illusionist', 'gunslinger', 'satyr', 'druid', 'warlock', 'samuraiCommander', 'shambler', 'kitsune', 'werewolf', 'karasu', 'minotaur', 'dragoon', 'lancer', 'dreadPirate', 'sage', 'demonSwordsman', 'tyrant', 'siegeBot', 'juggernaut', 'priestess', 'wolfBard', 'timeWitch', 'arcBlade', 'reaper', 'kraken', 'beastmaster'];
const castle = { treasury: 0, barracks: 0, armoury: 0, mageTower: 0, stable: 0, library: 0 };
const metaOf = (owned) => ({ seed: 7, crowns: 600, unlocked: owned, party: owned.slice(0, 5), pulls: 0, castle, shards: {}, stars: {}, xp: {}, bestStage: 3, tower: 0, daily: {}, bosses: [], achievements: [] });
let errors = 0;
/** A page on the Heroes tab with the view's left edge at `cam` (room pixels). */
const open = async (size, owned, cam, opts = {}) => {
  const [width, height] = size.split('x').map(Number);
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, hasTouch: true, reducedMotion: opts.reduced ? 'reduce' : 'no-preference' });
  // (generous waits: the machine may be busy)
  ctx.setDefaultTimeout(180000);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => (errors++, console.log('PAGE ERROR', e.message)));
  page.on('console', (m) => m.type() === 'error' && console.log('console error', m.text()));
  await page.addInitScript(([m, c]) => {
    localStorage.setItem('legends.meta', JSON.stringify(m));
    localStorage.setItem('lotf-tips-off', '1');
    if (c !== null) sessionStorage.setItem('lotf.tavern.cam', String(c));
  }, [metaOf(owned), cam]);
  await page.goto(url, { timeout: 180000 });
  await page.locator('.hmTab').nth(1).click();
  await page.waitForFunction(() => document.querySelector('.tvRoom')?.width > 0);
  await page.waitForTimeout(2500);
  return { ctx, page };
};
// (the view is 196 room pixels across at 393: two views a room, the left half and the right half)
const VIEWS = { 'bar-a': 0, 'bar-b': 190, 'hearth-a': 384, 'hearth-b': 574, 'games-a': 768, 'games-b': 956 };
// (QUICK=1: only the six views at 393x852)
const QUICK = !!process.env.QUICK;
for (const size of QUICK ? ['393x852'] : ['393x852', '360x780', '412x915']) {
  const s = await open(size, START, null);
  await s.page.screenshot({ path: `${OUT}/tavern-life-new-save-${size}.png` });
  await s.ctx.close();
  for (const [name, cam] of Object.entries(VIEWS)) {
    if (size !== '393x852' && !name.endsWith('-a') && name !== 'bar-b') continue;
    const { ctx, page } = await open(size, ALL, cam);
    await page.screenshot({ path: `${OUT}/tavern-life-${name}-${size}.png` });
    await ctx.close();
  }
}
// reduced motion: the still poses
if (!QUICK) {
  const { ctx, page } = await open('393x852', ALL, 768, { reduced: true });
  await page.screenshot({ path: `${OUT}/tavern-life-reduced-393x852.png` });
  await ctx.close();
}
// a strip of frames: a few activities, eight frames 200 ms apart (cropped round each scene)
const STRIPS = { darts: [768, { x: 0, y: 220, width: 393, height: 340 }], stage: [956, { x: 0, y: 360, width: 393, height: 340 }], bar: [190, { x: 0, y: 400, width: 393, height: 200 }], hearth: [384, { x: 0, y: 380, width: 393, height: 300 }] };
for (const [name, [cam, clip]] of Object.entries(QUICK ? {} : STRIPS)) {
  const { ctx, page } = await open('393x852', ALL, cam);
  for (let f = 0; f < 8; f++) {
    await page.screenshot({ path: `${OUT}/tavern-life-strip-${name}-${f}.png`, clip });
    await page.waitForTimeout(200);
  }
  await ctx.close();
}
console.log('page errors:', errors);
await browser.close();
srv.close();
