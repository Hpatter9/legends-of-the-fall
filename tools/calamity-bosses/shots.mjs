// Screenshots for the calamity ascension pick and a boss's second form, upright at 393x852 and 360x780:
//   node tools/calamity-bosses/shots.mjs <web dir>
// Writes docs/samples/calamity-bosses-<scene>[-<w>].png (needs Playwright, as the other shot scripts).
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
}).listen(8139);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const HEROES = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard', 'paladin', 'cleric'];
for (const [w, h] of [[393, 852], [360, 780]]) {
  const suffix = w === 393 ? '' : `-${w}`;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  const shot = (name) => page.screenshot({ path: `docs/samples/calamity-bosses-${name}${suffix}.png` });
  await page.goto('http://localhost:8139/?x=' + Math.random());
  await page.evaluate(() => localStorage.clear());
  await page.evaluate((heroes) => {
    localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: heroes, party: heroes.slice(0, 5), pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: { knight: 5000, samurai: 5000 }, bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [], calamity: { best: 6, clears: 3, asc: 4 } }));
    localStorage.setItem('lotf-tips-off', '1');
  }, HEROES);
  await page.goto('http://localhost:8139/');
  await page.waitForTimeout(2200);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  await page.evaluate(() => { for (const b of document.querySelectorAll('.hmCalamity')) b.click(); });
  await page.waitForTimeout(600);
  await shot('ascension-pick');
  // up one level more is not open (the best cleared is 4, so 5 is the top); step down two to see a middle level
  await page.evaluate(() => { const [less] = document.querySelectorAll('.cvStep'); less.click(); less.click(); });
  await page.waitForTimeout(200);
  await shot('ascension-pick-3');
  await page.evaluate(() => { const [, more] = document.querySelectorAll('.cvStep'); more.click(); more.click(); });
  await page.evaluate(() => { for (const b of document.querySelectorAll('.cvCard .primary')) b.click(); });
  await page.waitForTimeout(2800);
  // the first map's boss, entered from its gate
  await page.evaluate(() => {
    const g = window.__game;
    const t = g.run.tower;
    const boss = t.map.find((n) => n.kind === 'boss');
    const down = t.map.filter((n) => n.next.includes(boss.id))[0];
    t.at = down.id; t.row = boss.row; t.path = [];
    g.towerView.open(g.run);
  });
  await page.waitForTimeout(400);
  await page.evaluate(() => { const g = window.__game; const i = g.run.tower.map.findIndex((n) => n.kind === 'boss'); document.querySelectorAll('.rtNode')[i].click(); });
  await page.waitForTimeout(150);
  await page.evaluate(() => document.querySelector('.rtGo').click());
  await page.waitForTimeout(3200);
  await page.evaluate(() => document.getElementById('bossCard')?.click());
  await page.waitForTimeout(400);
  await page.evaluate(() => { document.getElementById('auto')?.click(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { document.getElementById('fight').click(); window.__game.setSpeed?.(1); });
  await page.waitForTimeout(1500);
  // the boss drops under its threshold: the next tick changes its form, and the fight is held
  await page.evaluate(() => {
    const b = window.__game.b;
    const boss = b.units.find((u) => u.side === 'foe' && u.def.startsWith('calBoss'));
    boss.hp = Math.floor(boss.maxHp * 0.3);
  });
  await page.waitForTimeout(550);
  await shot('phase2');
  await ctx.close();
}
await browser.close();
srv.close();
