// Screenshots for the synergy views and the system tips, upright at 393x852 and 360x780:
//   node tools/synergy/shots.mjs [web dir]
// Writes docs/samples/synergy-tips-<scene>-<w>.png (needs Playwright, as the other shot scripts).
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
}).listen(8141);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const HEROES = ['samurai', 'kunoichi', 'archer', 'ninjaMonk', 'knight', 'peasant', 'wizard', 'cleric', 'paladin', 'priestess', 'lightningMage'];
const SEEN = ['home', 'deploy', 'fight', 'mana', 'skill', 'summon', 'crowns'];
for (const [w, h] of [[393, 852], [360, 780]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  // (page errors are printed above)
  const shot = (name) => page.screenshot({ path: `docs/samples/synergy-tips-${name}-${w}.png` });
  const load = async (seen) => {
    await page.goto('http://localhost:8141/?x=' + Math.random());
    await page.evaluate(([heroes, seen]) => {
      localStorage.clear();
      localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 900, unlocked: heroes, party: heroes.slice(0, 5), pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: {}, bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: { orcs: { best: 8, won: 8, clears: 1, stars: { 1: 3, 2: 3 } } }, armySeen: [], stash: [] }));
      localStorage.setItem('legends.tips', JSON.stringify(seen));
    }, [HEROES, seen]);
    await page.goto('http://localhost:8141/');
    await page.waitForFunction(() => !!window.__game, null, { timeout: 60000 });
    await page.waitForTimeout(500);
    await page.evaluate(([heroes, seen]) => {
      const m = window.__game.meta;
      m.unlocked = heroes;
      m.party = heroes.slice(0, 5);
      m.crowns = 900;
      m.tower = 9;
      m.armies = { orcs: { best: 8, won: 8, clears: 1, stars: { 1: 3, 2: 3 } } };
      localStorage.setItem('legends.tips', JSON.stringify(seen));
      window.__game.tips?.reset;
    }, [HEROES, seen]);
  };
  // 1. party: before and after Suggest
  await load(SEEN);
  await page.evaluate(() => { document.getElementById('home').hidden = false; window.__game.home.open(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => document.getElementById('hmParty').click());
  await page.waitForTimeout(500);
  await shot('party');
  await page.evaluate(() => document.getElementById('ptSuggest').click());
  await page.waitForTimeout(400);
  await shot('party-suggest');
  await page.evaluate(() => document.getElementById('ptBack').click());
  // 2. deploy: the chips, a tier waking when the third samurai-kind is placed, then the fight
  await page.evaluate(() => {
    const g = window.__game;
    const r = JSON.parse(JSON.stringify(g.run));
    Object.assign(r, { mode: { kind: 'army', army: 'orcs' }, stage: 3, over: false, cleared: false, gold: 500, event: undefined });
    document.getElementById('home').hidden = true;
    g.startRun(r);
    for (let i = 0; i < 4; i++) document.getElementById('summon').click();
  });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const g = window.__game;
    const want = ['samurai', 'kunoichi', 'archer', 'ninjaMonk', 'knight'];
    for (const kind of want.slice(0, 2)) { const hero = g.run.roster.find((x) => x.kind === kind); const t = g.freeTile(); if (hero && t) g.put(String(hero.id), t); }
  });
  await page.waitForTimeout(300);
  await shot('deploy-chips');
  await page.evaluate(() => {
    const g = window.__game;
    for (const kind of ['archer', 'ninjaMonk', 'knight']) { const hero = g.run.roster.find((x) => x.kind === kind); const t = g.freeTile(); if (hero && t) g.put(String(hero.id), t); }
  });
  await page.waitForTimeout(250);
  await shot('deploy-wake');
  await page.evaluate(() => window.__game.begin());
  await page.waitForTimeout(700);
  await shot('fight-banner');
  await page.waitForTimeout(3600);
  await shot('fight-row');
  await page.evaluate(() => document.getElementById('synCol')?.click());
  await page.waitForTimeout(200);
  await shot('fight-list');
  // 3. the system tips, one by one
  for (const [name, setup] of [
    ['tip-calamity', () => { window.__game.home.open(); }],
    ['tip-castle', () => { window.__game.home.open(); document.querySelectorAll('#hmTabs button')[3]?.click(); }],
  ]) {
    await load(SEEN);
    await page.evaluate(() => { window.__game.home.open(); });
    await page.evaluate(setup);
    await page.waitForTimeout(1200);
    await shot(name);
  }
}
srv.close();
await browser.close();
