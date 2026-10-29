// HEROBAR-LOCK shots and checks: node tools/herobar-lock/shots.mjs   (after `npm run web`; writes docs/samples/herobar-lock-*.png)
// A mixed party (some heroes at level 30 or past it, with their ultimates; the rest below, without) in an ordinary fight, the daily, the Calamity
// and the Last Stand at the three upright sizes. Checks no tile shows a "Lv 30" plate, a locked tile has no ring, an unlocked one keeps it, and the
// tiles keep one height.
import { serve, launch, boot, calamityFight } from '../battle-ui/lib.mjs';
import { boot as standBoot, enter as standEnter } from '../stand/lib.mjs';
import { mkdirSync } from 'node:fs';
import * as esbuild from 'esbuild';

mkdirSync('out/shots', { recursive: true });
await esbuild.build({ entryPoints: ['src/sim/levels.ts'], bundle: true, platform: 'node', format: 'esm', outfile: 'out/shots/hbl-levels.mjs', logLevel: 'error' });
const { xpFor } = await import('../../out/shots/hbl-levels.mjs');

const PORT = 8270;
const only = process.argv[2] ?? '';
const s = serve('out/web', PORT);
const br = await launch();
const fails = [];
const check = (name, ok, info = '') => { console.log(ok ? 'ok  ' : 'FAIL', name, info); if (!ok) fails.push(name); };
// (the mixed levels: three past 30, the rest below)
const LEVELS = { knight: 34, samurai: 30, kunoichi: 12, archer: 22, wizard: 29, paladin: 31, cleric: 8, werewolf: 17, ranger: 15 };
const XP = Object.fromEntries(Object.entries(LEVELS).map(([k, l]) => [k, xpFor(l)]));
const PARTY = ['knight', 'kunoichi', 'samurai', 'archer', 'wizard'];

const tiles = (page, root) => page.evaluate((root) => [...document.querySelectorAll(`${root} .hb`)].map((t) => {
  const svg = t.querySelector('.hbRing svg'); const plate = t.querySelector('.hbPlate'); const r = t.getBoundingClientRect();
  return { name: t.querySelector('.hbName').textContent, locked: t.classList.contains('locked'), ring: getComputedStyle(svg).display !== 'none', plate: plate.hidden ? '' : plate.textContent, text: t.textContent, h: Math.round(r.height), right: r.right };
}), root);
const judge = (label, ts, w, mix = true) => {
  check(`${label}: tiles`, ts.length > 0, String(ts.length));
  check(`${label}: no level plate`, ts.every((t) => !/Lv/.test(t.text)), JSON.stringify(ts.map((t) => t.plate)));
  check(`${label}: locked tiles have no ring`, ts.filter((t) => t.locked).every((t) => !t.ring));
  check(`${label}: unlocked tiles keep their ring`, ts.filter((t) => !t.locked).every((t) => t.ring));
  if (mix) check(`${label}: a mix`, ts.some((t) => t.locked) && ts.some((t) => !t.locked), ts.map((t) => `${t.name}${t.locked ? '' : '*'}`).join(' '));
  check(`${label}: tiles one height, in the screen`, new Set(ts.map((t) => t.h)).size === 1 && ts.every((t) => t.right <= w), ts.map((t) => t.h).join());
};
const setXp = async (page, url = '') => {
  await page.evaluate((xp) => {
    const m = JSON.parse(localStorage.getItem('legends.meta'));
    m.xp = { ...m.xp, ...xp };
    localStorage.setItem('legends.meta', JSON.stringify(m));
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false }));
  }, XP);
  // (a fight's own seed in the address opens straight on its deploy, past the home screen)
  if (url) await page.goto(`http://localhost:${PORT}/${url}`); else await page.reload();
  await page.waitForTimeout(2200);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
};
const hold = (page) => page.evaluate(() => { window.__game.sceneHold = 1; });

for (const [w, h] of [[393, 852], [360, 780], [412, 915]]) {
  const shot = (n) => `docs/samples/herobar-lock-${n}-${w}.png`;
  // --- an ordinary fight: the party (two of five past 30), one of them with a full meter (TAP)
  if (!only || only === 'fight') {
    const { ctx, page, errors } = await boot(br, w, h, PORT);
    await setXp(page, '?seed=5');
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
    await page.waitForTimeout(2200);
    await page.evaluate(() => { const g = window.__game; for (const u of g.b.units) if (u.side === 'hero' && u.def === 'knight') u.charge2 = 100; });
    await page.waitForTimeout(300);
    await hold(page);
    await page.waitForTimeout(200);
    await page.screenshot({ path: shot('fight') });
    const ts = await tiles(page, '#heroBar');
    judge(`fight ${w}`, ts, w);
    check(`fight ${w}: the full one says TAP`, ts.some((t) => t.plate === 'TAP'), JSON.stringify(ts.map((t) => t.plate)));
    // (a tap on a locked tile neither queues nor shakes it)
    const tap = await page.evaluate(() => { const t = document.querySelector('#heroBar .hb.locked'); t.click(); return { nudge: t.classList.contains('nudge'), queued: t.classList.contains('queued'), orders: window.__game.b.orders?.length ?? 0 }; });
    check(`fight ${w}: a locked tile's tap does nothing`, !tap.nudge && !tap.queued && !tap.orders, JSON.stringify(tap));
    check(`fight ${w}: no page errors`, !errors.length, errors.join('; '));
    await ctx.close();
  }
  // --- the daily (the day's own heroes, at the save's levels)
  if (!only || only === 'daily') {
    const { ctx, page, errors } = await boot(br, w, h, PORT);
    await setXp(page);
    await page.evaluate(() => document.getElementById('hmDaily')?.click());
    await page.waitForTimeout(1500);
    await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.offsetParent && b.textContent.trim() === 'Fight!' && b.id !== 'fight')?.click());
    await page.waitForTimeout(1500);
    await page.evaluate(() => document.querySelector('#cutscene .csSkip')?.click());
    await page.evaluate(() => document.getElementById('auto')?.click());
    await page.waitForTimeout(400);
    await page.evaluate(() => document.getElementById('fight').click());
    await page.waitForTimeout(2200);
    await hold(page);
    await page.screenshot({ path: shot('daily') });
    judge(`daily ${w}`, await tiles(page, '#heroBar'), w, false);
    check(`daily ${w}: no page errors`, !errors.length, errors.join('; '));
    await ctx.close();
  }
  // --- the Calamity (its run's roster of ten, two rows)
  if (!only || only === 'calamity') {
    const { ctx, page, errors } = await boot(br, w, h, PORT);
    await setXp(page);
    await calamityFight(page);
    await page.evaluate(() => document.querySelector('#cutscene .csSkip')?.click());
    await page.evaluate(() => document.getElementById('fight').click());
    await page.waitForTimeout(2200);
    await hold(page);
    await page.screenshot({ path: shot('calamity') });
    judge(`calamity ${w}`, await tiles(page, '#heroBar'), w, false);
    check(`calamity ${w}: no page errors`, !errors.length, errors.join('; '));
    await ctx.close();
  }
  // --- the Last Stand's tray (eight heroes, two rows)
  if (!only || only === 'stand') {
    const { ctx, page, errors } = await standBoot(br, w, h, 20, PORT);
    await setXp(page);
    await standEnter(page);
    await page.evaluate(() => document.querySelector('.stStart')?.click());
    await page.waitForTimeout(3500);
    await page.screenshot({ path: shot('stand') });
    judge(`stand ${w}`, await tiles(page, '.stHeroes'), w);
    check(`stand ${w}: no page errors`, !errors.length, errors.join('; '));
    await ctx.close();
  }
}
await br.close();
s.close();
console.log(fails.length ? `${fails.length} failed` : 'all passed');
process.exitCode = fails.length ? 1 : 0;
