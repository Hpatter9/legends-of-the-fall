// Screenshots for the star unlocks and menus: the camp (shut and open modes), the Armies screen's shut cards, the shut and open Castle,
// the codex rewards, and a fresh army run with no hero on the bench, at the three upright phone sizes:
//   node tools/menus-unlocks-shots.mjs [web dir]
// Writes docs/samples/menus-unlocks-<scene>-<w>x<h>.png (needs Playwright, as the other shot scripts).
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
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let errors = 0;
for (const [w, h] of [[393, 852], [360, 780], [412, 915]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { errors++; console.log('PAGE ERROR', e.message); });
  const shot = (name) => page.screenshot({ path: `docs/samples/menus-unlocks-${name}-${w}x${h}.png` });
  const load = async (setup) => {
    await page.goto('http://localhost:8133/?x=' + Math.random());
    await page.evaluate(() => localStorage.clear());
    await page.goto('http://localhost:8133/?seed=7');
    await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
    await page.waitForTimeout(2200);
    await page.evaluate(() => { for (const b of document.querySelectorAll('#tip button')) if (b.id === 'tipSkip') b.click(); });
    if (setup) await page.evaluate(setup);
    await page.evaluate(() => { window.__game.home.open(); });
    await page.waitForTimeout(400);
  };
  const tab = (t) => page.evaluate((t) => { window.__game.home.show(t); }, t);
  // a fresh save: the camp with the Tower and the Calamity shut, the shut cards, the shut castle
  await load();
  await shot('camp-fresh');
  await page.evaluate(() => window.__game.home.openArmies());
  await page.waitForTimeout(500);
  await shot('armies-fresh');
  await page.evaluate(() => window.__game.home.openArmies('beasts'));
  await page.waitForTimeout(500);
  await shot('armies-locked-card');
  await tab('castle');
  await page.waitForTimeout(400);
  await shot('castle-shut');
  // a save with 16 stars: the Castle open and the Tower open, the Calamity still shut; some codex progress
  await load(() => {
    const g = window.__game;
    g.meta.armies.orcs = { waves: 15, best: 15, won: 15, clears: 1, stars: {}, met: { 0: 7, 1: 7, 2: 7, 3: 1, 4: 1 } };
    g.meta.armies.undead = { waves: 15, best: 15, won: 15, clears: 1, stars: {}, met: { 0: 7, 1: 7 } };
    g.meta.bosses = ['orcWarlord', 'orcChieftain', 'lichKing', 'boneCaptain', 'alphaWolf', 'boarKing', 'forestBoss1'];
  });
  await shot('camp-16-stars');
  await page.evaluate(() => window.__game.home.openArmies());
  await page.waitForTimeout(500);
  await shot('armies-16-stars');
  await tab('castle');
  await page.waitForTimeout(500);
  await shot('castle-open');
  await page.evaluate(() => window.__game.home.openCodex());
  await page.waitForTimeout(500);
  await shot('codex-rewards');
  // an old save (no `opened` list; a building begun, the tower climbed, the Orc Warband cleared): it keeps all three, and the rest stay shut
  await page.evaluate(() => {
    const m = JSON.parse(localStorage.getItem('legends.meta'));
    delete m.opened;
    m.castle.barracks = 1;
    m.tower = 2;
    m.armies = { orcs: { waves: 15, best: 15, won: 15, clears: 1, stars: {} } };
    localStorage.setItem('legends.meta', JSON.stringify(m));
  });
  await page.goto('http://localhost:8133/?seed=7');
  await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
  await page.evaluate(() => window.__game.home.open());
  await page.waitForTimeout(1500);
  const kept = await page.evaluate(() => {
    const g = window.__game;
    return { opened: g.meta.opened, tower: !document.getElementById('hmTower').disabled, calamity: !document.getElementById('hmCalamity').disabled };
  });
  console.log('old save', w, h, JSON.stringify(kept));
  await shot('camp-old-save');
  // an army run: no hero on the bench, gold for two hires
  await load();
  await page.evaluate(() => {
    const g = window.__game;
    const r = JSON.parse(JSON.stringify(g.run));
    Object.assign(r, { mode: { kind: 'army', army: 'orcs' }, stage: 1, over: false, cleared: false });
    document.getElementById('home').hidden = true;
    g.startRun(r);
  });
  await page.waitForTimeout(800);
  await shot('run-start');
  await ctx.close();
}
console.log('page errors:', errors);
await browser.close();
srv.close();
