// Screenshots for the hero skills, combos and spectacle, upright at 393x852, 360x780 and 412x915:
//   node tools/skills/shots.mjs [web dir]
// Writes docs/samples/hero-skills-<scene>-<w>.png (needs Playwright, as the other shot scripts), prints any page error, and checks that
// a full fight plays through with no page error, for a new save and for an old one (no `combosSeen`).
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
}).listen(8143);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const FIVE = ['knight', 'paladin', 'cleric', 'priestess', 'wanderer'];
const ALL = ['samurai', 'kunoichi', 'archer', 'wizard', 'knight', 'paladin', 'cleric', 'priestess', 'wanderer', 'peasant', 'ninjaMonk', 'lightningMage', 'beastmaster'];
let errors = 0;
for (const [w, h] of [[393, 852], [360, 780], [412, 915]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { errors++; console.log('PAGE ERROR', w, e.message); });
  const shot = (name) => page.screenshot({ path: `docs/samples/hero-skills-${name}-${w}.png` });
  const load = async (old = false) => {
    await page.goto(`http://localhost:8143/?x=${Math.random()}`);
    await page.evaluate(([heroes, old]) => {
      localStorage.clear();
      const meta = { seed: 7, crowns: 900, unlocked: heroes, party: heroes.slice(0, 5), pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: {}, bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: { orcs: { best: 8, won: 8, clears: 1, stars: { 1: 3, 2: 3 } } }, armySeen: [], stash: [] };
      if (!old) meta.combosSeen = [];
      localStorage.setItem('legends.meta', JSON.stringify(meta));
      localStorage.setItem('legends.tips', JSON.stringify(['home', 'deploy', 'fight', 'mana', 'skill', 'summon', 'crowns']));
    }, [ALL, old]);
    await page.goto('http://localhost:8143/');
    await page.waitForFunction(() => !!window.__game, null, { timeout: 60000 });
    await page.waitForTimeout(500);
  };
  const start = async (kinds, grades = []) => {
    await page.evaluate(([kinds, grades]) => {
      const g = window.__game;
      const r = JSON.parse(JSON.stringify(g.run));
      Object.assign(r, { mode: { kind: 'army', army: 'orcs' }, stage: 3, over: false, cleared: false, gold: 500, event: undefined });
      document.getElementById('home').hidden = true;
      g.startRun(r);
      g.run.roster = kinds.map((kind, i) => ({ id: 200 + i, kind, grade: grades[i] ?? 1, paid: 0 }));
      g.run.squad = [];
      g.refresh();
      for (const hero of g.run.roster) { const t = g.freeTile(); if (t) g.put(String(hero.id), t); }
    }, [kinds, grades]);
    await page.waitForTimeout(500);
  };
  // 1. a new save: the five of a combo placed, then the fight, the bar filling
  await load();
  await start(FIVE);
  await shot('deploy-combo');
  await page.evaluate(() => window.__game.begin());
  await page.waitForTimeout(900);
  await page.evaluate(() => { window.__game.b.combo.charge = 58; });
  await page.waitForTimeout(300);
  await shot('fight-bar');
  await page.evaluate(() => { document.getElementById('comboBar')?.click(); });
  await page.waitForTimeout(250);
  await shot('fight-bar-info');
  await page.evaluate(() => { document.getElementById('comboList')?.click(); window.__game.b.combo.charge = 99.9; });
  // the five gather
  await page.waitForFunction(() => window.__game.b.combo.landAt !== undefined, null, { timeout: 20000 });
  await page.waitForTimeout(500);
  await shot('combo-cast');
  await page.waitForFunction(() => window.__game.b.combo.fired > 0 && window.__game.b.combo.landAt === undefined, null, { timeout: 20000 });
  await page.waitForTimeout(120);
  await shot('combo-land');
  await page.waitForTimeout(500);
  await shot('combo-after');
  // the fight plays out
  await page.evaluate(() => { window.__game.setSpeed?.(3); });
  await page.waitForFunction(() => window.__game.b.phase !== 'fight', null, { timeout: 120000 });
  await page.waitForTimeout(500);
  console.log(w, 'a full combo fight ended:', await page.evaluate(() => window.__game.b.phase), 'combo seen:', await page.evaluate(() => JSON.stringify(window.__game.meta.combosSeen)));
  // 2. a tier 3 promotion in the deploy view, and a tier 2
  await load(true);
  await start(['archer', 'wizard', 'beastmaster', 'knight', 'samurai'], [1, 2, 3, 1, 1]);
  await page.evaluate(() => { const g = window.__game; const u = g.b.units.find((x) => x.def === 'beastmaster'); g.promoteHero(u.id, 3); });
  await page.waitForTimeout(350);
  await shot('promote-3');
  await page.evaluate(() => { const g = window.__game; const u = g.b.units.find((x) => x.def === 'wizard'); g.promoteHero(u.id, 2); });
  await page.waitForTimeout(400);
  await shot('promote-2');
  // 3. an ultimate (level 30) and a tier 3 skill in a fight, on an old save
  await page.evaluate(() => window.__game.begin());
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const g = window.__game;
    for (const u of g.b.units) if (u.side === 'hero') { u.level = 30; u.charge = 100; u.charge2 = 100; }
  });
  await page.waitForTimeout(700);
  await shot('ultimate-skills');
  await page.evaluate(() => window.__game.setSpeed?.(3));
  await page.waitForFunction(() => window.__game.b.phase !== 'fight', null, { timeout: 120000 });
  console.log(w, 'an old-save fight ended:', await page.evaluate(() => window.__game.b.phase));
  // 4. the codex's combos (one seen, the rest locked) and a hero's page with its tier skills
  await load();
  await page.evaluate(() => { const m = window.__game.meta; m.combosSeen = ['holyOrder']; m.codex = { met: ['skeleton'], kills: { skeleton: 3 } }; localStorage.setItem('legends.meta', JSON.stringify(m)); });
  await page.reload();
  await page.waitForFunction(() => !!window.__game, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  const skip = () => page.evaluate(() => { for (const b of document.querySelectorAll('#tip button')) if (b.id === 'tipSkip') b.click(); });
  await skip();
  await page.evaluate(() => { document.getElementById('home').hidden = false; window.__game.home.open(); });
  await page.waitForTimeout(1000);
  await skip();
  await page.click('.hmTab:has-text("Castle")');
  await page.waitForTimeout(800);
  await skip();
  await page.click('.ctChip:has-text("Codex")');
  await page.waitForTimeout(600);
  await page.click('.cxTab:has-text("Accords")');
  await page.waitForTimeout(400);
  await shot('codex-combos');
  await page.click('.cxTab:has-text("Heroes")');
  await page.waitForTimeout(300);
  await page.click('.cxCard:has-text("Beastmaster")');
  await page.waitForTimeout(500);
  await page.evaluate(() => document.querySelector('.cxSheet').scrollTo(0, 260));
  await page.waitForTimeout(300);
  await shot('codex-hero-tiers');
  await ctx.close();
}
console.log('page errors:', errors);
srv.close();
await browser.close();
process.exit(errors ? 1 : 0);
