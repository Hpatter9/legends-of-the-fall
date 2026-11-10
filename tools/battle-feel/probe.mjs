// BATTLE-FEEL: one fight of frames.mjs's list played in the page, each hero's tile, health and doing logged every half second.
import { createRequire } from 'node:module';
import { serve } from '../audit/lib.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [army, stage, level, party, speed] = [process.argv[2], Number(process.argv[3]), Number(process.argv[4]), process.argv[5].split(','), Number(process.argv[6] ?? 1)];
const xpAt = (l) => Math.round(30 * (l - 1) * l * (l > 20 ? 4 : 1));
const srv = serve();
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, hasTouch: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
await page.addInitScript(([owned, xp, speed]) => {
  let z = 0x2545f491;
  Math.random = () => ((z = (Math.imul(z ^ (z >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) | 0) >>> 0) / 4294967296;
  if (sessionStorage.getItem('bf-set')) return;
  sessionStorage.setItem('bf-set', '1');
  localStorage.clear();
  localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, stones: 30, unlocked: owned, party: owned.slice(0, 5), pulls: 0, dry: 0, dryMythic: 0, chapel: true, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, unlock: {}, stars: {}, xp: Object.fromEntries(owned.map((k) => [k, xp])), bestStage: 30, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [], opened: ['undead', 'beasts', 'wildwood', 'labyrinth', 'ogres', 'infernal', 'yokai', 'golems', 'tower', 'castle', 'calamity'] }));
  localStorage.setItem('lotf-tips-off', '1');
  localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, speed, autoUlt: true, autoSpells: true }));
}, [party, xpAt(level), speed]);
await page.goto(`http://localhost:${srv.address().port}/`);
await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 60000 });
await page.waitForTimeout(1500);
await page.evaluate(([army, stage, party]) => {
  const g = window.__game;
  const r = JSON.parse(JSON.stringify(g.run));
  Object.assign(r, { seed: 4242, mode: { kind: 'army', army }, tier: 0, stage, over: false, cleared: false, gold: 0, event: undefined, roster: party.map((kind, i) => ({ id: 100 + i, kind, grade: 1, paid: 30 })), squad: [], nextId: 200 });
  document.getElementById('home').hidden = true;
  g.startRun(r);
}, [army, stage, party]);
await page.waitForTimeout(1500);
await page.evaluate(() => window.__game.autoArrange(true));
await page.waitForTimeout(300);
console.log(await page.evaluate(() => { const b = window.__game.b; return `tactic ${JSON.stringify(b.tactic ?? null)} formation ${JSON.stringify(b.formation ?? null)} levels ${b.units.filter((u) => u.side === 'hero').map((u) => u.def + ':' + u.level).join(',')}`; }));
if (process.env.DUMP) {
  const fs = await import('node:fs');
  const j = await page.evaluate(() => { const b = window.__game.b; try { return JSON.stringify(b, (k, v) => (v instanceof Map ? { __map: [...v] } : v instanceof Set ? { __set: [...v] } : v)); } catch (e) { return 'ERR ' + e.message; } });
  fs.writeFileSync(process.env.DUMP, j);
  console.log('dumped', j.length);
}
await page.evaluate(() => document.getElementById('fight').click());
let last = -1;
for (let i = 0; i < 400; i++) {
  const s = await page.evaluate(() => {
    const b = window.__game.b;
    return { t: b.t, phase: b.phase, row: b.units.filter((u) => u.side === 'hero').map((u) => `${u.def.slice(0, 6)}@${u.u},${u.v} ${u.alive ? Math.round((100 * u.hp) / u.maxHp) : 'X'}${u.swing && b.t - u.swing.at < 600 ? ' S' : u.cast && b.t - u.cast.at < 600 ? ' C' : u.step && b.t - u.step.at < 600 ? ' W' : ' .'}`).join(' | '), foes: b.units.filter((u) => u.side === 'foe' && u.alive).map((u) => `${u.def.slice(0, 5)}@${u.u},${u.v}`).join(' ') };
  });
  if (s.t >= last + 500) { last = s.t; console.log(s.t, s.row, ' || ', s.foes); }
  if (s.phase !== 'fight' && s.t > 0) break;
  await page.waitForTimeout(100);
}
await browser.close();
srv.close();
