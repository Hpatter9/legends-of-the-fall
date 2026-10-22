// Screenshots of the Armies carousel, the 10 stars and the chests at 393x852 (and 360x780, 412x915):
//   node tools/armies/shots-stars.mjs <web dir>
// Writes docs/samples/army-stars-<scene>[-<w>x<h>].png (needs Playwright, as the other shot scripts).
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const [root = 'out/web'] = process.argv.slice(2);
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', css: 'text/css' };
const srv = createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(8133);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const IDS = ['orcs', 'undead', 'beasts', 'wildwood', 'labyrinth', 'ogres', 'infernal', 'yokai', 'golems'];
for (const [w, h] of [[393, 852], [360, 780], [412, 915]]) {
  const tag = w === 393 ? '' : `-${w}x${h}`;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  page.on('console', (m) => m.type() === 'error' && console.log('CONSOLE', m.text()));
  const shot = (name) => page.screenshot({ path: `docs/samples/army-stars-${name}${tag}.png` });
  const load = async (setup) => {
    await page.goto('http://localhost:8133/?x=' + Math.random());
    await page.evaluate(() => localStorage.clear());
    await page.goto('http://localhost:8133/');
    await page.waitForTimeout(2200);
    await page.evaluate(() => { for (const b of document.querySelectorAll('#tip button')) if (b.id === 'tipSkip') b.click(); });
    if (setup) await page.evaluate(setup, IDS);
    await page.evaluate(() => { window.__game.home.open(); });
    await page.waitForTimeout(300);
  };
  const openArmies = async () => { await page.evaluate(() => window.__game.home.openArmies()); await page.waitForTimeout(900); };
  // 1. a fresh save: the first army, the rest locked
  await load();
  await openArmies();
  await shot('fresh');
  // 2. mid-progress: four armies beaten (some stars), the carousel opens on the furthest
  await load((ids) => {
    const m = window.__game.meta;
    m.armies = Object.fromEntries(ids.slice(0, 3).map((id, i) => [id, { best: 8, won: 8, clears: 1, stars: { 8: 2 }, met: { 0: i === 0 ? 7 : i === 1 ? 3 : 1 }, hard: i === 0 ? { 1: { won: 8, clears: 1 } } : undefined }]));
    m.armies.orcs.met[1] = 1;
    m.armySeen = ids.slice(0, 4);
    m.crowns = 840;
  });
  await openArmies();
  await shot('mid');
  await page.evaluate(() => document.querySelector('.asArrow.left').click());
  await page.waitForTimeout(900);
  await shot('mid-prev');
  // 3. a locked army (swipe on to the one after the open ones)
  for (let i = 0; i < 4; i++) {
    await page.evaluate(() => document.querySelector('.asArrow.right').click());
    await page.waitForTimeout(700);
  }
  await page.waitForTimeout(500);
  await shot('locked');
  // 4. an unopened chest (Orc Warband: 5 stars, the bronze and the silver chest waiting)
  await load((ids) => {
    const m = window.__game.meta;
    m.armies = { orcs: { best: 8, won: 8, clears: 1, stars: {}, met: { 0: 7, 1: 3 }, chests: [3, 5], opened: [] } };
    m.armySeen = ids.slice(0, 2);
  });
  await openArmies();
  await page.evaluate(() => document.querySelector('.asArrow.left').click());
  await page.waitForTimeout(900);
  await shot('chest');
  // 5. the chest opening
  await page.evaluate(() => document.querySelector('.asChest.ready').click());
  await page.waitForTimeout(500);
  await shot('chest-shake');
  await page.waitForTimeout(1100);
  await shot('chest-burst');
  await page.waitForTimeout(3000);
  await shot('chest-loot');
  await page.evaluate(() => document.querySelector('.chestGo').click());
  await page.waitForTimeout(500);
  await shot('chest-after');
  // 6. the gold chest on a late army, and a Hard pick
  await load((ids) => {
    const m = window.__game.meta;
    m.armies = Object.fromEntries(ids.slice(0, 8).map((id) => [id, { best: 10, won: 10, clears: 1, stars: {}, met: { 0: 7, 1: 7, 2: 5 }, chests: [3, 5], opened: [3, 5] }]));
    m.armies.yokai.met = { 0: 7, 1: 7, 2: 7, 3: 1 };
    m.armies.yokai.chests = [3, 5, 10];
    m.armies.yokai.opened = [3, 5];
    m.armySeen = ids;
  });
  await openArmies();
  await page.evaluate(() => document.querySelector('.asArrow.left').click());
  await page.waitForTimeout(900);
  await shot('gold-army');
  await page.evaluate(() => document.querySelector('.asChest.ready').click());
  await page.waitForTimeout(6800);
  await shot('gold-loot');
  // 7. the result screen of a cleared army
  await load((ids) => {
    const m = window.__game.meta;
    m.armies = { orcs: { best: 8, won: 8, clears: 1, stars: {}, met: { 0: 1 } } };
  });
  await page.evaluate(() => {
    const g = window.__game;
    const r = JSON.parse(JSON.stringify(g.run));
    Object.assign(r, { mode: { kind: 'army', army: 'orcs', tier: 0 }, stage: 8, over: false, cleared: false, gold: 500, event: undefined, tally: { ms: 150000, lost: 1, bossLost: 0 } });
    document.getElementById('home').hidden = true;
    g.startRun(r);
    for (let i = 0; i < 4; i++) document.getElementById('summon').click();
    for (const hh of g.run.roster.slice(0, 5)) { if (g.b.units.some((u) => u.tag === hh.id)) continue; const t = g.freeTile(); if (t) g.put(String(hh.id), t); }
    g.begin();
  });
  await page.waitForTimeout(800);
  await page.evaluate(() => { const g = window.__game; for (const u of g.b.units) if (u.side === 'foe') { u.alive = false; u.hp = 0; } });
  await page.waitForTimeout(2500);
  await shot('result');
  await ctx.close();
}
await browser.close();
srv.close();
