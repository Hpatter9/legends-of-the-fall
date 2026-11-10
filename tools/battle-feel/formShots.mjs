// BATTLE-FEEL round 3: the prep screen's Formation button and card when the party cannot make the shape picked (a Shield Wall picked, a party
// of shooters and casters), at the three upright phone sizes: docs/samples/battle-feel/form-short-<w>.png and form-short-card-<w>.png.
//   npm run web && node tools/battle-feel/formShots.mjs
import { createRequire } from 'node:module';
import { serve } from '../audit/lib.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const srv = serve();
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const party = ['archer', 'wizard', 'cleric', 'gunslinger', 'warlock'];
let errors = 0;
for (const [w, h] of [[393, 852], [360, 780], [412, 915]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { errors++; console.log('PAGE ERROR', e.message); });
  await page.addInitScript((owned) => {
    if (sessionStorage.getItem('fs-set')) return;
    sessionStorage.setItem('fs-set', '1');
    localStorage.clear();
    const rec = { clears: 1, best: 15, tries: 1 };
    localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, stones: 30, unlocked: owned, party: owned, pulls: 0, dry: 0, dryMythic: 0, chapel: true, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, unlock: {}, stars: {}, xp: Object.fromEntries(owned.map((k) => [k, 2000])), bestStage: 30, tower: 9, daily: {}, bosses: [], achievements: [], armies: { orcs: rec, undead: rec, beasts: rec, wildwood: rec }, armySeen: [], stash: [], formations: { 'army:orcs': 'wall' }, opened: ['undead', 'beasts', 'wildwood', 'labyrinth', 'ogres', 'infernal', 'yokai', 'golems', 'tower', 'castle', 'calamity'] }));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, speed: 1 }));
  }, party);
  await page.goto(`http://localhost:${srv.address().port}/`, { timeout: 180000 });
  await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.evaluate((party) => {
    const g = window.__game;
    const r = JSON.parse(JSON.stringify(g.run));
    Object.assign(r, { seed: 4242, mode: { kind: 'army', army: 'orcs' }, tier: 0, stage: 2, over: false, cleared: false, gold: 0, event: undefined, roster: party.map((kind, i) => ({ id: 100 + i, kind, grade: 1, paid: 30 })), squad: [], nextId: 200 });
    document.getElementById('home').hidden = true;
    g.startRun(r);
  }, party);
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.__game.autoArrange(true));
  await page.waitForTimeout(800);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  await page.addStyleTag({ content: '#tip, .tip, #tipBox, .say, [class*=bubble], [class*=Bubble], #quip { display: none !important; }' });
  await page.waitForTimeout(400);
  const btn = await page.evaluate(() => { const b = document.getElementById('formBtn'); return { hidden: b.hidden, text: b.textContent, short: b.dataset.short, label: b.getAttribute('aria-label') }; });
  console.log(w, JSON.stringify(btn));
  await page.screenshot({ path: `docs/samples/${process.env.SHOT ?? 'battle-feel/form-short'}-${w}.png` });
  await page.evaluate(() => document.getElementById('formBtn').click());
  await page.waitForTimeout(600);
  console.log(w, 'card:', await page.evaluate(() => document.querySelector('#tacticSheet .tacShort')?.textContent));
  await page.screenshot({ path: `docs/samples/${process.env.SHOT ?? 'battle-feel/form-short'}-card-${w}.png` });
  await ctx.close();
}
console.log('page errors:', errors);
await browser.close();
srv.close();
