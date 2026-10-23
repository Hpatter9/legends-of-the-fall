// The combo's cut-in in the real flow, upright at 393x852:   node tools/cinematics/flow3.mjs [web dir]
// The five of the Holy Order are placed, the bar is filled, and as the move begins the cut-in plays (the fight held), the first time only.
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
}).listen(8145);
const FIVE = ['knight', 'paladin', 'cleric', 'priestess', 'wanderer'];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
let errors = 0;
page.on('pageerror', (e) => { errors++; console.log('PAGE ERROR', e.message); });
const up = () => page.evaluate(() => { const e = document.getElementById('cutscene'); return !!e && !e.hidden; });
await page.goto(url('?x=1'));
function url(q = '') { return `http://localhost:8145/${q}`; }
await page.evaluate((heroes) => {
  localStorage.clear();
  const meta = { seed: 7, crowns: 900, unlocked: heroes, party: heroes, pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: {}, bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: { orcs: { best: 8, won: 8, clears: 1, stars: { 1: 3, 2: 3 } } }, armySeen: [], stash: [], combosSeen: [] };
  localStorage.setItem('legends.meta', JSON.stringify(meta));
  localStorage.setItem('legends.tips', JSON.stringify(['home', 'deploy', 'fight', 'mana', 'skill', 'summon', 'crowns']));
}, FIVE);
await page.goto(url());
await page.waitForFunction(() => !!window.__game, null, { timeout: 60000 });
await page.waitForTimeout(500);
await page.evaluate((kinds) => {
  const g = window.__game;
  const r = JSON.parse(JSON.stringify(g.run));
  Object.assign(r, { mode: { kind: 'army', army: 'orcs' }, stage: 3, over: false, cleared: false, gold: 500, event: undefined });
  document.getElementById('home').hidden = true;
  g.startRun(r);
  g.run.roster = kinds.map((kind, i) => ({ id: 200 + i, kind, grade: 1, paid: 0 }));
  g.run.squad = [];
  g.refresh();
  for (const hero of g.run.roster) { const t = g.freeTile(); if (t) g.put(String(hero.id), t); }
}, FIVE);
await page.waitForTimeout(500);
await page.evaluate(() => window.__game.begin());
await page.waitForTimeout(900);
await page.evaluate(() => { window.__game.b.combo.charge = 99.9; });
await page.waitForFunction(() => { const e = document.getElementById('cutscene'); return e && !e.hidden; }, null, { timeout: 20000 }).catch(() => undefined);
await page.waitForTimeout(1500);
const t1 = await page.evaluate(() => window.__game.b.t);
await page.waitForTimeout(1200);
const t2 = await page.evaluate(() => window.__game.b.t);
console.log('combo cut-in up', await up(), '; fight held', t1 === t2, `(${t1} -> ${t2})`);
await page.screenshot({ path: 'out/flow3-combo.png' });
await page.waitForTimeout(11000);
console.log('after it ends: up', await up(), '; fight goes on', (await page.evaluate(() => window.__game.b.t)) > t2, '; seen', await page.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem('legends.meta')).scenes)));
console.log('page errors:', errors);
await browser.close();
srv.close();
