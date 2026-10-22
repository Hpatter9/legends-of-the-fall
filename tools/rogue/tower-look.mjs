// Screenshots of the tower map's look: the act-1 map (start and part-way up), the act intro, the boss gate, and acts 2 and 3, upright at
// 393x852 (and the act-1 map at 360x780 and 412x915):
//   node tools/rogue/tower-look.mjs <web dir> <before|after>
// Writes docs/samples/tower-look-<before|after>-<scene>[-<w>].png (needs Playwright, as the other shot scripts).
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const [root = 'out/web', tag = 'after'] = process.argv.slice(2);
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', css: 'text/css' };
const srv = createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(8138);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const HEROES = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard', 'paladin', 'cleric'];
for (const [w, h] of [[393, 852], [360, 780], [412, 915]]) {
  const main = w === 393;
  const suffix = main ? '' : `-${w}`;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  const shot = (name) => page.screenshot({ path: `docs/samples/tower-look-${tag}-${name}${suffix}.png` });
  const load = async () => {
    await page.goto('http://localhost:8138/?x=' + Math.random());
    await page.evaluate(() => localStorage.clear());
    await page.evaluate((heroes) => {
      localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: heroes, party: heroes.slice(0, 5), pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: {}, bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [] }));
      localStorage.setItem('lotf-tips-off', '1');
    }, HEROES);
    await page.goto('http://localhost:8138/');
    await page.waitForTimeout(2200);
    await page.evaluate(() => document.getElementById('tipSkip')?.click());
    await page.evaluate(() => { for (const b of document.querySelectorAll('.hmCard')) if (b.textContent.includes('Tower')) b.click(); });
    await page.waitForTimeout(600);
  };
  const skipIntro = async () => { await page.evaluate(() => document.querySelector('.rtIntro')?.click()); await page.waitForTimeout(400); };
  /** Walk `n` floors up the map (taking the first way on) and open it, as act `act`. */
  const climbTo = (n, act) => page.evaluate(([n, act]) => {
    const g = window.__game;
    const t = g.run.tower;
    t.act = act;
    let node = t.map.find((x) => x.row === 0);
    for (let i = 0; i < n; i++) { t.path.push(node.id); t.at = node.id; t.row = node.row + 1; g.run.stage++; node = t.map[node.next[0]]; }
    g.run.gold = 214;
    g.run.relics = ['banner', 'luckyCoin'];
    for (const [i, id] of g.run.squad.entries()) g.run.tower.hp[String(id)] = [0.35, 0.8, 1, 0.55, 0.15][i] ?? 1;
    g.towerView.open(g.run);
  }, [n, act]);
  const scrollTop = (y) => page.evaluate((y) => { document.querySelector('.rtScroll').scrollTop = y; }, y);
  // act 1: the start (its intro playing, then skipped), then part-way up
  await load();
  await page.waitForTimeout(900);
  if (main) await shot('act1-intro');
  await skipIntro();
  await shot('act1-start');
  await load();
  await climbTo(5, 1);
  await skipIntro();
  await shot('act1-map');
  if (main) {
    await scrollTop(0);
    await page.waitForTimeout(300);
    await shot('gate');
    for (const act of [2, 3]) {
      await load();
      await page.evaluate((act) => { window.__game.run.tower.act = act; window.__game.towerView.open(window.__game.run); }, act);
      await page.waitForTimeout(900);
      await shot(`act${act}-intro`);
      await skipIntro();
      await climbTo(6, act);
      await skipIntro();
      await shot(`act${act}-map`);
      await scrollTop(0);
      await page.waitForTimeout(300);
      await shot(`act${act}-gate`);
    }
  }
  await ctx.close();
}
await browser.close();
srv.close();
