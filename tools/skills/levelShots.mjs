// Screenshots for skill levels by use (the skills overhaul's batch 5, docs/notes/skills-5.md), upright at 393x852:
//   node tools/skills/levelShots.mjs [web dir]
// The hero sheet's Skills tab with levels and bars, a skill's sheet in a fight, and the wave card's "reached Level" line. Writes
// out/skill-levels/<scene>.png and prints any page error.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const [root = 'out/web'] = process.argv.slice(2);
const OUT = 'out/skill-levels';
mkdirSync(OUT, { recursive: true });
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', webp: 'image/webp', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', opus: 'audio/ogg', css: 'text/css' };
const srv = createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(8147);
const browser = await chromium.launch({ args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 393, height: 852 } })).newPage();
let errors = 0;
page.on('pageerror', (e) => { errors++; console.log('PAGE ERROR', e.message); });
await page.addInitScript(() => localStorage.setItem('legends.settings', JSON.stringify({ music: 0, effects: 0, cinematics: false, quips: false })));
await page.goto('http://localhost:8147/?seed=123', { timeout: 120000 });
await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
// (a save past the starter pick and the opening: written, then the page loaded again)
await page.evaluate(() => {
  const m = JSON.parse(JSON.stringify(window.__game.meta));
  m.starter = { packs: m.starter?.packs ?? [], pick: 0 };
  m.unlocked = ['knight', 'wizard', 'cleric', 'archer', 'paladin'];
  m.party = [...m.unlocked];
  m.heroesSeen = [...m.unlocked];
  m.armies = { orcs: { best: 15, won: 15, clears: 1, stars: {} } };
  m.bestStage = 20;
  localStorage.setItem('legends.meta', JSON.stringify(m));
  localStorage.setItem('legends.tips', JSON.stringify(['home', 'deploy', 'fight', 'mana', 'skill', 'summon', 'crowns']));
});
await page.goto('http://localhost:8147/', { timeout: 120000 });
await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
await page.waitForTimeout(1500);
for (let i = 0; i < 6; i++) await page.mouse.click(196, 820).then(() => page.waitForTimeout(400));
await page.evaluate(() => document.fonts.ready);
// 1. the hero sheet's Skills tab: skill 1 at Level 3, skill 2 at Level 5, skill 3 fresh
await page.evaluate(() => {
  document.getElementById('tipSkip')?.click();
  const g = window.__game;
  g.meta.unlocked = ['knight', 'wizard', 'cleric', 'archer', 'paladin'];
  g.meta.party = [...g.meta.unlocked];
  g.meta.xp.knight = 400000;
  g.meta.skillUse = { knight: { 'Shield Wall': 812, 'Shield Rush': 3500 } };
  g.home.open();
  g.home.show('heroes');
});
await page.waitForTimeout(800);
await page.getByRole('button', { name: 'All heroes' }).click({ timeout: 8000 });
await page.waitForTimeout(500);
await page.locator('.hcard[data-kind="knight"]').click({ timeout: 8000 });
await page.getByRole('tab', { name: 'Skills', exact: true }).click();
await page.locator('.dossierAbility').first().scrollIntoViewIfNeeded();
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/hero-skills.png` });
console.log('skills tab lines:', await page.$$eval('.skillLv small', (els) => els.map((e) => e.textContent)));
console.log('knight keys:', await page.evaluate(() => Object.keys(window.__game.meta.skillUse.knight)));
// 2. an army wave: the knight's Shield Wall is a cast or two short of Level 2, so the wave card tells it; his skill sheet in the fight first
await page.goto('http://localhost:8147/', { timeout: 120000 });
await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
await page.waitForTimeout(1500);
for (let i = 0; i < 6; i++) await page.mouse.click(196, 820).then(() => page.waitForTimeout(300));
await page.evaluate(() => {
  const g = window.__game;
  g.meta.xp.knight = 400000;
  g.meta.skillUse = { knight: { 'Shield Wall': 198, 'Shield Rush': 1600 } };
  const r = JSON.parse(JSON.stringify(g.run));
  Object.assign(r, { mode: { kind: 'army', army: 'orcs' }, stage: 1, over: false, cleared: false, gold: 500, event: undefined });
  document.getElementById('home').hidden = true;
  g.startRun(r);
  g.run.roster = ['knight', 'wizard', 'cleric', 'archer', 'paladin'].map((kind, i) => ({ id: 200 + i, kind, grade: 1, paid: 0 }));
  g.run.squad = [];
  g.refresh();
  for (const hero of g.run.roster) { const t = g.freeTile(); if (t) g.put(String(hero.id), t); }
  g.begin();
});
await page.getByRole('button', { name: 'Got it' }).click({ timeout: 3000 }).catch(() => undefined);
await page.waitForTimeout(1500);
const knight = await page.evaluate(() => window.__game.b.units.find((u) => u.def === 'knight')?.id);
await page.evaluate((id) => window.__game.hud.openInfo(id, 2), knight);
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/fight-sheet.png` });
await page.evaluate(() => { window.__game.hud.closeInfo(); window.__game.setSpeed?.(3); });
await page.waitForFunction(() => window.__game.b.phase !== 'fight', null, { timeout: 180000 });
await page.waitForFunction(() => document.querySelector('#waveNotes .wn') && !document.getElementById('result')?.hidden, null, { timeout: 20000 }).catch(() => undefined);
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/wave-card.png` });
console.log('wave notes:', await page.$$eval('#waveNotes .wn', (els) => els.map((e) => e.textContent)));
await browser.close();
srv.close();
console.log('page errors:', errors);
