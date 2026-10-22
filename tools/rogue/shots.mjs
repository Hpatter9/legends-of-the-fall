// Screenshots for the roguelike tower: the map at the start and mid-act, the shop, the campfire, the treasure, a mystery event, the boss
// and the run summary (a real lost fight), upright at 393x852, and the map, shop and summary again at 360x780 and 412x915:
//   node tools/rogue/shots.mjs <web dir>
// Writes docs/samples/rogue-<scene>[-<w>].png (needs Playwright, as the other shot scripts).
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
}).listen(8137);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const HEROES = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard', 'paladin', 'cleric'];
for (const [w, h] of [[393, 852], [360, 780], [412, 915]]) {
  const main = w === 393;
  const suffix = main ? '' : `-${w}`;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  const shot = (name) => page.screenshot({ path: `docs/samples/rogue-${name}${suffix}.png` });
  const load = async () => {
    await page.goto('http://localhost:8137/?x=' + Math.random());
    await page.evaluate(() => localStorage.clear());
    await page.evaluate((heroes) => {
      localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: heroes, party: heroes.slice(0, 5), pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: {}, bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [] }));
      localStorage.setItem('lotf-tips-off', '1');
    }, HEROES);
    await page.goto('http://localhost:8137/');
    await page.waitForTimeout(2200);
    await page.evaluate(() => document.getElementById('tipSkip')?.click());
    // the Tower button on the war camp
    await page.evaluate(() => { for (const b of document.querySelectorAll('.hmCard')) if (b.textContent.includes('Tower')) b.click(); });
    await page.waitForTimeout(900);
  };
  /** Walk the run to a node of `kind` (the nodes before it are taken), open it. */
  const jump = (kind, row0) => page.evaluate(([kind, row0]) => {
    const g = window.__game;
    const t = g.run.tower;
    const start = t.at < 0 ? t.map.filter((n) => n.row === t.row) : t.map[t.at].next.map((i) => t.map[i]);
    const seen = new Map(start.map((n) => [n.id, null]));
    const q = [...start];
    let hit;
    while (q.length) {
      const n = q.shift();
      if (n.kind === kind && n.row >= (row0 ?? 0)) { hit = n; break; }
      for (const i of n.next) if (!seen.has(i)) { seen.set(i, n.id); q.push(t.map[i]); }
    }
    if (!hit) return null;
    const chain = [];
    for (let id = hit.id; id !== null; id = seen.get(id)) chain.unshift(id);
    for (const id of chain.slice(0, -1)) { t.path.push(id); t.at = id; t.row = t.map[id].row + 1; g.run.stage++; }
    g.towerView.open(g.run);
    return hit.id;
  }, [kind, row0]);
  const climb = async (id) => {
    await page.evaluate((id) => { const g = window.__game; const i = g.run.tower.map.findIndex((n) => n.id === id); document.querySelectorAll('.rtNode')[i].click(); }, id);
    await page.waitForTimeout(150);
    await page.evaluate(() => document.querySelector('.rtGo').click());
    await page.waitForTimeout(600);
  };
  // 1. the map at the start
  await load();
  await shot('map-start');
  // 2. mid-act: wounds, a few relics and gold; the nodes are visited in climbing order, each reached over the floors before it
  await page.evaluate(() => {
    const g = window.__game;
    g.run.gold = 214;
    g.run.relics = ['banner', 'luckyCoin', 'whetstone'];
    for (const [i, id] of g.run.squad.entries()) g.run.tower.hp[String(id)] = [0.35, 0.8, 1, 0.55, 0.15][i] ?? 1;
  });
  const closeCard = async () => { await page.evaluate(() => [...document.querySelectorAll('.rtCard .primary')].at(-1)?.click()); await page.waitForTimeout(300); };
  const chestId = await jump('treasure', 5);
  if (chestId !== null) {
    await shot('map-mid');
    await climb(chestId);
    await closeCard();
    await shot('treasure');
    await closeCard();
  }
  const mysId = await jump('mystery', 6);
  if (mysId !== null) {
    await climb(mysId);
    await shot('mystery');
    await page.evaluate(() => document.querySelector('#events .opt')?.click());
    await page.waitForTimeout(200);
    await page.evaluate(() => [...document.querySelectorAll('#events button')].at(-1)?.click());
    await page.waitForTimeout(300);
  }
  const dress = () => page.evaluate(() => { const g = window.__game; g.run.gold = 214; g.run.relics = ['banner', 'luckyCoin', 'whetstone']; for (const [i, id] of g.run.squad.entries()) g.run.tower.hp[String(id)] = [0.35, 0.8, 1, 0.55, 0.15][i] ?? 1; });
  await load();
  await dress();
  const shopId = await jump('shop', 1);
  if (shopId !== null) {
    await climb(shopId);
    await shot('shop');
    await page.evaluate(() => { for (const b of document.querySelectorAll('.rtItem')) if (b.textContent.includes('Healing')) b.click(); });
    await page.waitForTimeout(200);
    await shot('shop-bought');
    await closeCard();
  }
  await load();
  await dress();
  const fireId = await jump('campfire', 3);
  if (fireId !== null) {
    await climb(fireId);
    await shot('campfire');
    await page.evaluate(() => [...document.querySelectorAll('.rtCard .rtChoice')].find((b) => b.textContent.includes('Rest')).click());
    await page.waitForTimeout(200);
    await shot('campfire-rested');
    await closeCard();
  }
  // 6. the boss: straight to the foot of the boss, picked and fought with a squad that is no match (a real lost fight and its summary)
  await load();
  await page.evaluate(() => {
    const g = window.__game;
    const t = g.run.tower;
    const prev = t.map.filter((n) => n.row === 11)[0];
    for (const n of t.map) if (n.row < 12) t.path.push(n.id);
    t.at = prev.id; t.row = 12; g.run.stage = 13; g.run.gold = 300;
    g.run.relics = ['banner'];
    g.towerView.open(g.run);
  });
  await page.waitForTimeout(300);
  if (main) await shot('map-boss');
  const bossId = await page.evaluate(() => window.__game.run.tower.map.find((n) => n.kind === 'boss').id);
  await climb(bossId);
  // (the boss card plays first: a tap skips it)
  await page.waitForTimeout(500);
  await page.evaluate(() => document.getElementById('bossCard')?.click());
  await page.waitForTimeout(400);
  await page.evaluate(() => { const g = window.__game; for (const h of g.run.roster.slice(0, 5)) { if (g.b.units.some((u) => u.tag === h.id)) continue; const t = g.freeTile(); if (t) g.put(String(h.id), t); } });
  await page.waitForTimeout(300);
  if (main) await shot('boss');
  await page.evaluate(() => document.getElementById('fight').click());
  for (let i = 0; i < 200; i++) {
    const done = await page.evaluate(() => { const g = window.__game; g.frame(1000); return g.b.phase === 'won' || g.b.phase === 'lost'; });
    if (done) break;
  }
  await page.waitForTimeout(500);
  if (main) await shot('boss-result');
  await page.evaluate(() => document.getElementById('next').click());
  await page.waitForTimeout(700);
  await shot('summary');
  await ctx.close();
}
await browser.close();
srv.close();
