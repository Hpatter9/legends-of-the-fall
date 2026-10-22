// Screenshots for the calamity and the tower's reset climb, upright at 393x852 (and the home, the pick and the map again at 360x780):
//   node tools/calamity/shots.mjs <web dir>
// Writes docs/samples/calamity-<scene>[-<w>].png and tower-reset-<scene>[-<w>].png (needs Playwright, as the other shot scripts).
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
}).listen(8138);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const HEROES = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard', 'paladin', 'cleric'];
for (const [w, h] of [[393, 852], [360, 780]]) {
  const main = w === 393;
  const suffix = main ? '' : `-${w}`;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  const shot = (name) => page.screenshot({ path: `docs/samples/${name}${suffix}.png` });
  await page.goto('http://localhost:8138/?x=' + Math.random());
  await page.evaluate(() => localStorage.clear());
  await page.evaluate((heroes) => {
    localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: heroes, party: heroes.slice(0, 5), pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: { knight: 5000, samurai: 5000 }, bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [] }));
    localStorage.setItem('lotf-tips-off', '1');
  }, HEROES);
  await page.goto('http://localhost:8138/');
  await page.waitForTimeout(2200);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  await shot('calamity-home');
  // the tower first: a reset climb
  await page.evaluate(() => { for (const b of document.querySelectorAll('.hmCard')) if (b.textContent.includes('Tower')) b.click(); });
  await page.waitForTimeout(2800);
  await shot('tower-reset-map');
  if (main) {
    await page.evaluate(() => { for (const b of document.querySelectorAll('#towerMap .rtLink')) b.click(); });
    await page.waitForTimeout(400);
    await shot('tower-reset-abandon');
    await page.evaluate(() => { for (const b of document.querySelectorAll('.cvBox button')) if (b.textContent.includes('Abandon')) b.click(); });
    await page.waitForTimeout(600);
    await shot('tower-reset-summary');
    await page.evaluate(() => { for (const b of document.querySelectorAll('#towerMap button.primary')) b.click(); });
    await page.waitForTimeout(600);
  }
  // the calamity
  await page.evaluate(() => { for (const b of document.querySelectorAll('.hmCalamity')) b.click(); });
  await page.waitForTimeout(600);
  await shot('calamity-pick');
  await page.evaluate(() => { for (const b of document.querySelectorAll('.cvHero')) if (b.dataset.kind === 'samurai') b.click(); });
  await page.evaluate(() => { for (const b of document.querySelectorAll('.cvCard .primary')) b.click(); });
  await page.waitForTimeout(2800);
  await shot('calamity-map');
  if (main) {
    const closeCard = async () => { await page.evaluate(() => [...document.querySelectorAll('.rtCard .primary')].at(-1)?.click()); await page.waitForTimeout(300); };
    const climb = async (id) => {
      await page.evaluate((id) => { const g = window.__game; const i = g.run.tower.map.findIndex((n) => n.id === id); document.querySelectorAll('.rtNode')[i].click(); }, id);
      await page.waitForTimeout(150);
      await page.evaluate(() => document.querySelector('.rtGo').click());
      await page.waitForTimeout(700);
    };
    // walk to a node of `kind`, the nodes before it taken
    const jump = (kind) => page.evaluate((kind) => {
      const g = window.__game;
      const t = g.run.tower;
      const start = t.at < 0 ? t.map.filter((n) => n.row === t.row) : t.map[t.at].next.map((i) => t.map[i]);
      const seen = new Map(start.map((n) => [n.id, null]));
      const q = [...start];
      let hit;
      while (q.length) {
        const n = q.shift();
        if (n.kind === kind) { hit = n; break; }
        for (const i of n.next) if (!seen.has(i)) { seen.set(i, n.id); q.push(t.map[i]); }
      }
      if (!hit) return null;
      const chain = [];
      for (let id = hit.id; id !== null; id = seen.get(id)) chain.unshift(id);
      for (const id of chain.slice(0, -1)) { t.path.push(id); t.at = id; t.row = t.map[id].row + 1; g.run.stage++; }
      g.towerView.open(g.run);
      return hit.id;
    }, kind);
    await page.evaluate(() => { window.__game.run.gold = 300; });
    const camp = await jump('recruit');
    await climb(camp);
    await shot('calamity-recruit');
    await page.evaluate(() => document.querySelector('.rtItem:not([disabled])')?.click());
    await page.waitForTimeout(300);
    await shot('calamity-recruit-hired');
    await closeCard();
    // a full squad: nine more heroes at assorted levels, hurt
    await page.evaluate(() => {
      const g = window.__game;
      const kinds = ['knight', 'kunoichi', 'archer', 'wizard', 'paladin', 'cleric', 'knight', 'archer', 'wizard'];
      for (const k of kinds) {
        if (g.run.roster.length >= 10) break;
        const id = g.run.nextId++;
        g.run.roster.push({ id, kind: k, grade: 1, xp: 120 * (id % 7) });
        g.run.squad.push(id);
        g.run.tower.hp[String(id)] = [1, 0.7, 0.4, 1][id % 4];
      }
      g.towerView.open(g.run);
    });
    await page.waitForTimeout(500);
    await shot('calamity-map-ten');
    // a fight
    const fightId = await jump('fight');
    console.log('fight node', fightId);
    if (fightId !== null) {
      await climb(fightId);
      await page.waitForTimeout(1500);
      await shot('calamity-deploy');
      await page.evaluate(() => { document.getElementById('fight').click(); window.__game.setSpeed(3); });
      await page.waitForFunction(() => !document.getElementById('result').hidden, null, { timeout: 120000 });
      await page.waitForTimeout(3500);
      await shot('calamity-result');
    }
  }
  await ctx.close();
}
await browser.close();
srv.close();
