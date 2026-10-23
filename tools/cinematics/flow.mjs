// The cinematics in the real flows, upright at 393x852:
//   node tools/cinematics/flow.mjs [web dir] [out dir]
// 1. a brand-new save picks its heroes and the opening plays; Skip is one tap; a reload does not bring it back.
// 2. a Calamity run reaches map 1's boss: the scene plays, then the boss's card; a second run does not replay it.
// 3. the codex's Scenes tab lists them and Watch plays one again.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const [root = 'out/web', out = 'docs/samples/cinematics'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', css: 'text/css' };
const srv = createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(8143);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
const up = () => page.evaluate(() => { const e = document.getElementById('cutscene'); return !!e && !e.hidden; });
const seen = () => page.evaluate(() => JSON.parse(localStorage.getItem('legends.meta') ?? '{}').scenes ?? null);
const shot = (name) => page.screenshot({ path: `${out}/${name}.png` });

// 1. a new save
await page.goto('http://localhost:8143/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('lotf-tips-off', '1'); });
await page.goto('http://localhost:8143/');
await page.waitForSelector('#starter .stPack');
await page.click('#starter .stPack');
await page.click('#starter .stGo');
await page.waitForTimeout(2500);
console.log('opening up after the pick:', await up(), 'seen:', await seen());
await shot('flow-opening-playing');
await page.click('.csSkip');
await page.waitForTimeout(500);
console.log('after Skip: up', await up());
await page.reload();
await page.waitForTimeout(3000);
console.log('after a reload: up', await up(), 'seen:', await seen());

// 2. the first Calamity boss
await page.evaluate(() => window.__game.openMode('calamity'));
await page.waitForTimeout(600);
await page.evaluate(() => { for (const b of document.querySelectorAll('.cvCard .primary')) b.click(); });
await page.waitForTimeout(2800);
const toBoss = async () => {
  // (the map's own way in is a long walk: stand at the gate and walk into the boss's spot, as a tap on it does)
  await page.evaluate(() => {
    const g = window.__game;
    const t = g.run.tower;
    const boss = t.map.find((n) => n.kind === 'boss');
    const down = t.map.filter((n) => n.next.includes(boss.id))[0];
    t.at = down.id; t.row = boss.row; t.path = [];
    g.towerView.open(g.run);
    window.__bossId = boss.id;
  });
  await page.waitForTimeout(800);
  await page.evaluate(() => { const v = window.__game.towerView; v.pickSpot(window.__bossId); v.go(); });
  await page.waitForTimeout(6000);
};
await toBoss();
console.log('boss scene up:', await up(), 'card hidden meanwhile:', await page.evaluate(() => document.getElementById('bossCard').hidden), 'seen:', await seen());
await page.evaluate(() => window.__game.scenes.seek(1, 1, 2.2));
await page.waitForTimeout(400);
await shot('flow-gorvak-playing');
// (a tap on the last beat ends it, and the boss's own card follows)
await page.evaluate(() => window.__game.scenes.seek(3, 1, 0));
// (the first tap finishes the typing, the second goes on: past the last line the scene ends)
await page.mouse.click(196, 400);
await page.waitForTimeout(200);
await page.mouse.click(196, 400);
await page.waitForTimeout(900);
console.log('after the last tap: scene up', await up(), 'boss card shown:', await page.evaluate(() => !document.getElementById('bossCard').hidden));
await shot('flow-gorvak-then-card');

// 3. the Scenes list
await page.evaluate(() => document.getElementById('bossCard')?.click());
await page.evaluate(() => window.__game.home.open());
await page.waitForTimeout(600);
await page.evaluate(() => { for (const b of document.querySelectorAll('button')) if (/Codex/.test(b.textContent)) { b.click(); break; } });
await page.waitForTimeout(600);
await page.evaluate(() => { for (const b of document.querySelectorAll('.cxTab')) if (b.textContent === 'Scenes') b.click(); });
await page.waitForTimeout(300);
await shot('flow-scenes-list');
await page.evaluate(() => document.querySelector('.scRow button')?.click());
await page.waitForTimeout(1500);
console.log('Watch again: up', await up());
await shot('flow-watch-again');
await page.click('.csSkip');
await page.waitForTimeout(400);
console.log('after Skip: up', await up(), 'seen:', await seen());
await ctx.close();
await browser.close();
srv.close();
