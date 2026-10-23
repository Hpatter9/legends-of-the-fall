// The new cinematics in the real flows, upright at 393x852:
//   node tools/cinematics/flow2.mjs [web dir]
// 1. an old save (heroes picked, no scenes list) starts with no scene; a new save plays its opening and Skip ends it.
// 2. a boss's fight: the boss changes form, its cut-in plays, the fight is held while it does (the clock does not move) and goes on after Skip.
// 3. the fight is played out (a loss or a win): the first-loss scene (or the army's last stand) comes up, and the page has no errors.
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
}).listen(8144);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
let errors = 0;
page.on('pageerror', (e) => { errors++; console.log('PAGE ERROR', e.message); });
const up = () => page.evaluate(() => { const e = document.getElementById('cutscene'); return !!e && !e.hidden; });
const seen = () => page.evaluate(() => JSON.parse(localStorage.getItem('legends.meta') ?? '{}').scenes ?? null);
const url = 'http://localhost:8144/';

// 1. a new save, then the same save as an old one (no scenes list)
await page.goto(url);
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('lotf-tips-off', '1'); });
await page.goto(url);
await page.waitForTimeout(2500);
console.log('new save: opening up (it comes before the starter pick)', await up(), 'seen', await seen());
await page.click('.csSkip');
await page.waitForSelector('#starter .stPack');
await page.click('#starter .stPack');
await page.click('#starter .stGo');
await page.waitForTimeout(1500);
await page.evaluate(() => { const m = JSON.parse(localStorage.getItem('legends.meta')); delete m.scenes; localStorage.setItem('legends.meta', JSON.stringify(m)); });
await page.reload();
await page.waitForTimeout(3000);
console.log('old save: scene up', await up(), '(want false); seen', await seen());

// 2. a boss fight
await page.evaluate(() => {
  const g = window.__game;
  const r = JSON.parse(JSON.stringify(g.run));
  Object.assign(r, { mode: { kind: 'army', army: 'orcs' }, stage: 15, over: false, cleared: false, gold: 500, event: undefined });
  document.getElementById('home').hidden = true;
  g.startRun(r);
  for (let i = 0; i < 4; i++) document.getElementById('summon').click();
  for (const h of g.run.roster.slice(0, 5)) {
    if (g.b.units.some((u) => u.tag === h.id)) continue;
    const t = g.freeTile();
    if (t) g.put(String(h.id), t);
  }
});
await page.waitForTimeout(1200);
await page.evaluate(() => { window.__game.endIntro(); window.__game.begin(); });
await page.waitForTimeout(1500);
// (the boss falls to under half its health: it changes form on the next tick)
await page.evaluate(() => { const b = window.__game.b.units.find((u) => u.side === 'foe' && u.def === 'orcWarlord'); b.hp = Math.floor(b.maxHp * 0.4); });
await page.waitForFunction(() => { const e = document.getElementById('cutscene'); return e && !e.hidden; }, null, { timeout: 8000 }).catch(() => undefined);
await page.waitForTimeout(1500);
const t1 = await page.evaluate(() => window.__game.b.t);
await page.waitForTimeout(1500);
const t2 = await page.evaluate(() => window.__game.b.t);
console.log('boss form: cut-in up', await up(), '; fight clock held', t1 === t2, `(${t1} -> ${t2})`, '; seen', (await seen())?.includes('form:orcWarlord'));
await page.screenshot({ path: 'out/flow2-form.png' });
await page.click('.csSkip');
await page.waitForTimeout(4000);
const t3 = await page.evaluate(() => window.__game.b.t);
console.log('after Skip: cut-in up', await up(), '; fight goes on', t3 > t2, `(${t3})`);

// 3. play it out
await page.evaluate(() => window.__game.setSpeed?.(2));
await page.waitForFunction(() => window.__game.b.phase !== 'fight', null, { timeout: 150000 }).catch(() => console.log('fight did not end in time'));
await page.waitForTimeout(3000);
console.log('debug', await page.evaluate(() => { const g = window.__game; return JSON.stringify({ hold: g.sceneHold, settled: g.settled, pending: g.pendingLoss, auto: g.auto, phase: g.b.phase }); }));
console.log('fight over:', await page.evaluate(() => window.__game.b.phase), '; scene up', await up(), '; seen', await seen());
await page.screenshot({ path: 'out/flow2-end.png' });
// (a wave lost with retries left waits for the player: giving up settles it, and the first-loss scene comes up)
await page.evaluate(() => document.getElementById('next').click());
await page.waitForTimeout(3500);
console.log('debug2', await page.evaluate(() => { const g = window.__game; return JSON.stringify({ hold: g.sceneHold, settled: g.settled, pending: g.pendingLoss, over: g.run.over }); }));
console.log('after giving up: scene up', await up(), '; seen', await seen());
await page.screenshot({ path: 'out/flow2-loss.png' });
if (await up()) await page.click('.csSkip');
await page.waitForTimeout(500);
console.log('page errors:', errors);
await browser.close();
srv.close();
