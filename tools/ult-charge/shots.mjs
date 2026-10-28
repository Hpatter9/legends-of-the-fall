// ULT-CHARGE's shots: a level-30 party's ordinary army wave on the page, Auto off, the fight left to run until a hero's ultimate meter fills by
// itself (nothing forced), then the hero bar with the charged ring, at the three upright sizes. Run after `npm run web`:
//   node tools/ult-charge/shots.mjs        writes docs/samples/ult-charge-bar*.png
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import * as esbuild from 'esbuild';
import { serve } from '../battle-ui/lib.mjs';

const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
mkdirSync('out/shots', { recursive: true });
await esbuild.build({ entryPoints: ['src/sim/levels.ts'], bundle: true, platform: 'node', format: 'esm', outfile: 'out/shots/uc-levels.mjs', logLevel: 'error' });
const { xpFor } = await import('../../out/shots/uc-levels.mjs');

const PORT = 8210;
const srv = serve('out/web', PORT);
const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const PARTY = ['knight', 'samurai', 'archer', 'wizard', 'cleric'];
const fails = [];
for (const [w, h] of [[393, 852], [360, 780], [412, 915]]) {
  const ctx = await br.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://localhost:${PORT}/?x=${Math.random()}`);
  await page.evaluate(([party, xp]) => {
    localStorage.clear();
    localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: party, party, pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp, bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [] }));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false }));
    localStorage.setItem('legends.tips', JSON.stringify(['home', 'deploy', 'fight', 'mana', 'skill', 'ult', 'summon', 'crowns', 'retry', 'recycle', 'calamity', 'tower', 'talents', 'castle', 'spellbook', 'stash', 'equipment', 'autoReplay']));
  }, [PARTY, Object.fromEntries(PARTY.map((k) => [k, xpFor(30)]))]);
  await page.goto(`http://localhost:${PORT}/?seed=5`);
  await page.waitForTimeout(2500);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  await page.evaluate((party) => {
    const g = window.__game;
    g.run.roster = party.map((kind, i) => ({ id: i + 1, kind, grade: 1 }));
    g.run.nextId = party.length + 1;
    g.run.squad = party.map((_, i) => i + 1);
    g.newBattle();
    g.refresh();
  }, PARTY);
  await page.waitForTimeout(600);
  await page.evaluate(() => document.getElementById('fight').click());
  const t0 = Date.now();
  // (the first ring to fill by itself, Auto off: the fight's own time and blows)
  await page.waitForFunction(() => document.querySelector('#heroBar .hb.ready') && window.__game.b.phase === 'fight', null, { timeout: 40000, polling: 100 }).catch(() => {});
  await page.evaluate(() => { window.__game.sceneHold = 1; });
  const at = await page.evaluate(() => {
    const b = window.__game.b;
    return { t: b.t, auto: b.autoUlt, phase: b.phase, ready: [...document.querySelectorAll('#heroBar .hb.ready')].length, meters: b.units.filter((u) => u.side === 'hero').map((u) => `${u.def} ${Math.round(u.charge2 ?? 0)}`) };
  });
  const ok = at.ready > 0 && at.phase === 'fight' && at.auto === false && !errors.length;
  console.log(ok ? 'ok  ' : 'FAIL', `${w}x${h}`, JSON.stringify(at), `${((Date.now() - t0) / 1000).toFixed(1)}s real`, errors.join(' | '));
  if (!ok) fails.push(w);
  await page.screenshot({ path: `docs/samples/ult-charge-bar${w === 393 ? '' : `-${w}`}.png` });
  await ctx.close();
}
await br.close();
srv.close();
process.exit(fails.length ? 1 : 0);
