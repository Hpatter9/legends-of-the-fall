// Screenshots for the Calamity's bigger boards, ten heroes and tiers, upright at the three phone sizes:
//   node tools/calroster/shots.mjs <web dir>
// Writes docs/samples/cal-roster-<scene>-<width>.png (needs Playwright, as the other shot scripts).
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const SIZES = [[393, 852], [360, 780], [412, 915]];
const HEROES = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard', 'paladin', 'cleric'];
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', css: 'text/css' };
const serve = (root, port) => createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(port);
const launch = () => chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
/** A page at (w, h) with a started meta (seven heroes, a few castle levels), on the home screen. */
async function openHome(browser, w, h, port, dpr = 1) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  page.on('console', (m) => m.type() === 'error' && console.log('CONSOLE', m.text()));
  await page.goto(`http://localhost:${port}/?x=` + Math.random());
  await page.evaluate(() => localStorage.clear());
  await page.evaluate((heroes) => {
    localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: heroes, party: heroes.slice(0, 5), pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: { knight: 5000, samurai: 5000 }, bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [] }));
    localStorage.setItem('lotf-tips-off', '1');
  }, HEROES);
  await page.goto(`http://localhost:${port}/`);
  await page.waitForTimeout(2200);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  return { ctx, page };
}
const [root = 'out/web'] = process.argv.slice(2);
const srv = serve(root, 8147);
const browser = await launch();
const KINDS = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard', 'paladin', 'cleric', 'druid', 'barbarian', 'ranger'];
const BANDS = {
  forest: ['wolfBlack', 'wolfRed', 'wolfWhite', 'wolfBlack', 'wolfRed', 'wolfWhite', 'wolfBlack', 'wolfRed', 'wolfWhite', 'wolfBlack', 'wolfRed'],
  volcano: ['calBoss4', 'imp', 'demon', 'imp', 'demon', 'imp', 'demon', 'imp', 'demon', 'imp', 'demon', 'imp'],
  snow: ['minotaur1', 'minotaur2', 'gorgon1', 'satyr1', 'minotaur3', 'gorgon2', 'satyr2', 'minotaur1'],
};
for (const [w, h] of SIZES) {
  const { ctx, page } = await openHome(browser, w, h, 8147, 1);
  const shot = (name) => page.screenshot({ path: `docs/samples/cal-roster-${name}-${w}.png` });
  await page.evaluate(() => document.getElementById('hmCalamity').click());
  await page.waitForTimeout(600);
  await page.evaluate(() => { for (const b of document.querySelectorAll('.cvHero')) if (b.dataset.kind === 'samurai') b.click(); });
  await page.evaluate(() => { for (const b of document.querySelectorAll('.cvCard .primary')) b.click(); });
  await page.waitForTimeout(2800);
  // a full squad: ten different heroes, the levels of a run well on (tiers 2 and 3), a few hurt
  await page.evaluate((kinds) => {
    const g = window.__game;
    const r = g.run;
    r.roster[0].kind = 'samurai';
    for (const k of kinds) {
      if (k === 'samurai' || r.roster.length >= 10) continue;
      const id = r.nextId++;
      r.roster.push({ id, kind: k, grade: 1, xp: 0 });
      r.squad.push(id);
    }
    const xp = [16000, 9000, 6000, 3500, 2400, 1500, 1000, 700, 400, 200];
    r.roster.forEach((x, i) => { x.xp = xp[i] ?? 100; x.tiered = true; x.grade = x.xp > 6000 ? 3 : x.xp > 1400 ? 2 : 1; r.tower.hp[String(x.id)] = [1, 0.7, 0.4, 1][i % 4]; });
    g.towerView.open(r);
  }, KINDS);
  await page.waitForTimeout(600);
  await shot('map');
  for (const [area, tag] of [['forest', 'wolves'], ['volcano', 'boss'], ['snow', 'snow']]) {
    await page.evaluate(([area, band]) => {
      const g = window.__game;
      const r = g.run;
      r.tower.cur = { id: r.tower.map[0].id, kind: 'fight', fight: { band, stage: { foes: { hp: 0.9, atk: 0.9 }, size: { w: 10, d: 13 }, area } } };
      g.towerView.close();
      g.resumeSlot(r);
    }, [area, BANDS[area]]);
    await page.waitForTimeout(1800);
    await shot(`deploy-${tag}`);
    await page.evaluate(() => { document.getElementById('fight').click(); window.__game.setSpeed(2); });
    await page.waitForTimeout(3500);
    await shot(`fight-${tag}`);
    await page.waitForTimeout(3500);
    await shot(`fight-${tag}-late`);
    await page.evaluate(() => window.__game.setSpeed(3));
    await page.waitForFunction(() => !document.getElementById('result').hidden, null, { timeout: 150000 }).catch(() => console.log('no result yet', w, tag));
    await page.waitForTimeout(1500);
    await shot(`result-${tag}`);
    // leave the result: back to the map (the run carries on from the saved slot)
    await page.evaluate(() => { const g = window.__game; g.run.tower.cur = undefined; g.run.over = false; g.towerView.open(g.run); });
    await page.waitForTimeout(600);
  }
  // a recruit camp: three heroes, one the player does not own
  await page.evaluate(() => {
    const g = window.__game;
    const r = g.run;
    r.roster.splice(7);
    r.squad = r.roster.map((x) => x.id);
    r.gold = 400;
    r.tower.cur = { id: r.tower.map[0].id, kind: 'recruit', hires: [{ kind: 'priestess', cost: 90 }, { kind: 'kraken', cost: 90 }, { kind: 'wizard', cost: 90 }] };
    g.towerView.open(r);
  });
  await page.waitForTimeout(800);
  await shot('recruit');
  await ctx.close();
}
await browser.close();
srv.close();
