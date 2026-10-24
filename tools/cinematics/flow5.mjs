// A scene played mid-fight (the spire, the owner's party): the backdrop is whole, and the fight resumes cleanly after Skip.
//   node tools/cinematics/flow5.mjs [web dir] [out dir]
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const [root = 'out/web', out = 'out/flow5'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', css: 'text/css' };
const srv = createServer((q, r) => { const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html'); if (!existsSync(p)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' }); r.end(readFileSync(p)); }).listen(8147);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const [w, h] of [[393, 852], [360, 780], [412, 915]]) {
  const page = await (await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: Number(process.env.DPR ?? 1) })).newPage();
  let errs = 0;
  page.on('pageerror', (e) => { errs++; console.log('ERR', e.message); });
  page.on('console', (m) => m.type() === 'error' && console.log('CONSOLE', m.text()));
  page.on('requestfailed', (r) => console.log('FAILED', r.url()));
  await page.goto('http://localhost:8147/');
  await page.evaluate(() => {
    localStorage.clear();
    const heroes = ['juggernaut', 'dragoon', 'priestess', 'demonSwordsman', 'timeWitch'];
    localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 900, unlocked: heroes, party: heroes, pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: {}, bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: { orcs: { best: 8, won: 8, clears: 1, stars: { 1: 3, 2: 3 } } }, armySeen: [], stash: [], opened: ['tower', 'calamity', 'castle'], scenes: ['opening'] }));
    localStorage.setItem('lotf-tips-off', '1');
  });
  await page.goto('http://localhost:8147/'); await page.waitForTimeout(3000);
  // (a fight under way: five heroes placed, the fight begun and ticking)
  await page.evaluate(() => {
    const g = window.__game;
    const r = JSON.parse(JSON.stringify(g.run));
    Object.assign(r, { mode: { kind: 'army', army: 'ogres' }, stage: 3, over: false, cleared: false, gold: 500, event: undefined });
    document.getElementById('home').hidden = true;
    g.startRun(r);
    for (let i = 0; i < 4; i++) document.getElementById('summon').click();
    for (const h of g.run.roster.slice(0, 5)) { if (g.b.units.some((u) => u.tag === h.id)) continue; const t = g.freeTile(); if (t) g.put(String(h.id), t); }
  });
  await page.waitForTimeout(1200);
  await page.evaluate(() => { window.__game.endIntro(); window.__game.begin(); });
  await page.waitForTimeout(3500);
  for (const id of ['duchessInFight']) {
    const t0 = await page.evaluate(() => window.__game.b.t);
    await page.evaluate((id) => void window.__game.playScene(id), id);
    await page.waitForTimeout(2500);
    await page.evaluate(() => window.__game.scenes.seek(1, 1, 1.2));
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${out}/${id}-${w}.png` });
    const tIn = await page.evaluate(() => window.__game.b.t);
    console.log(w, id, 'clock held while up', tIn === (await page.evaluate(() => window.__game.b.t)));
    await page.click('.csSkip');
    await page.waitForTimeout(2500);
    const t1 = await page.evaluate(() => window.__game.b.t);
    console.log(w, id, 'fight resumed', t1 > t0, 't', t0, '->', t1, 'phase', await page.evaluate(() => window.__game.b.phase));
  }
  console.log(w, 'errors', errs);
}
await browser.close(); srv.close();
