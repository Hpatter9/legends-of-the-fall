// Screenshots for the tower's named elites and relic sets: an elite's node and its intro card, the relic choice it pays, and the
// header with a set's progress, upright at 393x852 and 360x780:
//   node tools/rogue/elite-shots.mjs <web dir>
// Writes docs/samples/tower-elites-<scene>[-<w>].png (needs Playwright, as the other shot scripts).
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
for (const [w, h] of [[393, 852], [360, 780]]) {
  const main = w === 393;
  const suffix = main ? '' : `-${w}`;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  const shot = (name) => page.screenshot({ path: `docs/samples/tower-elites-${name}${suffix}.png` });
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
  await load();
  // (a run with a Fire pair, a Frost trio and a lone Holy piece; the heroes made strong enough to win the elite)
  await page.evaluate(() => {
    const g = window.__game;
    g.run.gold = 214;
    g.run.relics = ['phoenix', 'warDrum', 'ironShield', 'hourglass', 'frostSapphire', 'banner', 'luckyCoin'];
    for (const h of g.run.roster) h.bump = { hp: 8, atk: 8 };
    for (const [i, id] of g.run.squad.entries()) g.run.tower.hp[String(id)] = [0.6, 0.9, 1, 0.75, 0.45][i] ?? 1;
  });
  const eliteId = await jump('elite', 3);
  await page.waitForTimeout(400);
  await page.evaluate((id) => { const g = window.__game; const i = g.run.tower.map.findIndex((n) => n.id === id); const b = document.querySelectorAll('.rtNode')[i]; b.scrollIntoView({ block: 'center' }); b.click(); }, eliteId);
  await page.waitForTimeout(400);
  await shot('node');
  await page.evaluate(() => document.querySelector('.rtGo').click());
  await page.waitForTimeout(1500);
  await shot('intro');
  await page.evaluate(() => document.getElementById('bossCard')?.click());
  await page.waitForTimeout(400);
  await page.evaluate(() => { const g = window.__game; for (const h of g.run.roster.slice(0, 5)) { if (g.b.units.some((u) => u.tag === h.id)) continue; const t = g.freeTile(); if (t) g.put(String(h.id), t); } });
  await page.waitForTimeout(300);
  await page.evaluate(() => document.getElementById('fight').click());
  for (let i = 0; i < 300; i++) {
    const done = await page.evaluate(() => { const g = window.__game; g.frame(1000); return g.b.phase === 'won' || g.b.phase === 'lost'; });
    if (done) break;
  }
  await page.waitForTimeout(500);
  await shot('result');
  await page.evaluate(() => document.getElementById('next').click());
  // (an achievement's toast would cover the header)
  await page.addStyleTag({ content: '.toast { display: none !important; }' });
  await page.waitForTimeout(700);
  await shot('choice');
  await page.evaluate(() => document.querySelector('.relicOffer')?.click());
  await page.waitForTimeout(250);
  await shot('choice-picked');
  await page.evaluate(() => [...document.querySelectorAll('.rtCard .primary')].at(-1).click());
  await page.waitForTimeout(300);
  await shot('taken');
  await page.evaluate(() => [...document.querySelectorAll('.rtCard .primary')].at(-1).click());
  await page.waitForTimeout(400);
  await shot('header');
  // a set piece tapped: where its set stands
  await page.evaluate(() => document.querySelector('.rtRelics .relic.inSet[data-on="3"]')?.click());
  await page.waitForTimeout(250);
  await shot('set');
  await ctx.close();
}
await browser.close();
srv.close();
