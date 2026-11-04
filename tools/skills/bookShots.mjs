// Screenshots for the books' three slots (the skills overhaul's batch 9, docs/notes/skills-9.md), upright at 393x852:
//   node tools/skills/bookShots.mjs [web dir]
// The hero sheet's Skills tab with a learned book in slot 3 (the three slot rows and the picker). Writes
// out/skills-9/<scene>.png and prints any page error.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const [root = 'out/web'] = process.argv.slice(2);
const OUT = 'out/skills-9';
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
await page.evaluate(() => {
  document.getElementById('tipSkip')?.click();
  const g = window.__game;
  g.meta.unlocked = ['knight', 'wizard', 'cleric', 'archer', 'paladin'];
  g.meta.party = [...g.meta.unlocked];
  g.meta.xp.knight = 400000;
  g.meta.learned = { knight: ['whirlingStep'] };
  g.meta.loadout = { knight: ['own1', 'own2', 'whirlingStep'] };
  g.meta.skillUse = { knight: { Whirlwind: 812 } };
  g.home.open();
  g.home.show('heroes');
});
await page.waitForTimeout(800);
await page.getByRole('button', { name: 'All heroes' }).click({ timeout: 8000 });
await page.waitForTimeout(500);
await page.locator('.hcard[data-kind="knight"]').click({ timeout: 8000 });
await page.getByRole('tab', { name: 'Skills', exact: true }).click();
await page.locator('.kbPanel').scrollIntoViewIfNeeded();
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/slots.png` });
await page.locator('.kbSlot').nth(2).click();
await page.waitForTimeout(300);
await page.locator('.kbPanel').scrollIntoViewIfNeeded();
await page.screenshot({ path: `${OUT}/picker.png` });
console.log('slots:', await page.evaluate(() => JSON.stringify(window.__game.meta.loadout)));
await browser.close();
srv.close();
console.log(errors ? `${errors} page errors` : 'no page errors');
