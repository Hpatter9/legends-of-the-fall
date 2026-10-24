// The Calamity's end: a cleared Calamity plays its cinematic, then the victory card.   node tools/cinematics/flow4.mjs
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const root='out/web';
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', css: 'text/css' };
const srv = createServer((q, r) => { const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html'); if (!existsSync(p)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' }); r.end(readFileSync(p)); }).listen(8146);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 393, height: 852 } })).newPage();
let errs=0; page.on('pageerror', e => { errs++; console.log('ERR', e.message); });
await page.goto('http://localhost:8146/');
await page.evaluate(() => {
  localStorage.clear();
  const heroes = ['knight', 'samurai', 'archer', 'wizard', 'kunoichi'];
  localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 900, unlocked: heroes, party: heroes, pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: {}, bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: { orcs: { best: 8, won: 8, clears: 1, stars: { 1: 3, 2: 3 } } }, armySeen: [], stash: [], opened: ['tower', 'calamity', 'castle'] }));
  localStorage.setItem('lotf-tips-off', '1');
});
await page.goto('http://localhost:8146/'); await page.waitForTimeout(3000);
await page.evaluate(() => window.__game.openMode('calamity')); await page.waitForTimeout(600);
await page.evaluate(() => { document.querySelector('.cvHero')?.click(); for (const b of document.querySelectorAll('.cvCard .primary')) b.click(); }); await page.waitForTimeout(2800);
await page.evaluate(() => { const g = window.__game; g.run.cleared = true; g.run.over = true; g.afterResult(); });
await page.waitForTimeout(3500);
console.log('state', await page.evaluate(() => { const g = window.__game; return JSON.stringify({ mode: g.run.mode, over: g.run.over, cleared: g.run.cleared, hold: g.sceneHold, on: g.scenesOn(), cin: !!document.getElementById('cutscene') }); }));
console.log('scene up', await page.evaluate(() => !!document.getElementById('cutscene') && !document.getElementById('cutscene').hidden), JSON.stringify(await page.evaluate(() => JSON.parse(localStorage.getItem('legends.meta')).scenes)));
await page.click('.csSkip'); await page.waitForTimeout(1500);
console.log('victory card', await page.evaluate(() => !!document.querySelector('.rtCard.victory, .rtCard.summary')), 'errors', errs);
await browser.close(); srv.close();
