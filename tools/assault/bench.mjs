// The Assault's headless bench (phase 0, docs/notes/assault-0.md): plays the engine spike's fight (55 of ours against the garrison's
// 200 on the 100 x 100 field) and prints the simulation's milliseconds a tick (mean, p95, worst), the bounded walks and decisions a
// tick, and the sector rebuilds. The design's budget (its section 7.2) is 3 ms a tick on a mid-range phone, about 0.75 ms here (a 4x
// phone factor).
//
//   npm run assault-bench                 one fight on seed 1
//   npm run assault-bench -- --seeds 3    three fights, seeds 1 to 3
//   npm run assault-bench -- --seed 7
import * as esbuild from 'esbuild';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? Number(process.argv[i + 1]) : dflt;
};
const seeds = arg('seeds', 1);
const first = arg('seed', 1);

mkdirSync('out/tools', { recursive: true });
const outfile = 'out/tools/assault-bench.mjs';
await esbuild.build({
  stdin: { contents: "export * from './src/sim/assault/spike'; export { startBattle, stepBattle, place, fight } from './src/sim/battle'; export { HEROES } from './src/sim/units';", resolveDir: process.cwd(), loader: 'ts' },
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'es2023',
  logLevel: 'warning',
  loader: { '.png': 'empty', '.webp': 'empty' },
  define: { __BOARD__: 'undefined' },
});
const sim = await import(pathToFileURL(outfile).href);

const fmt = (x) => x.toFixed(3);
const pct = (xs, p) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * p))];
};

// (warm the engine first, as a page would have by its first frames: a short fight thrown away)
{
  const b = sim.startSpike(999);
  for (let i = 0; i < 600 && b.phase === 'fight'; i++) sim.stepSpike(b);
}

const all = [];
for (let s = first; s < first + seeds; s++) {
  const t0 = performance.now();
  const b = sim.startSpike(s);
  const build = performance.now() - t0;
  const ms = [];
  const walks = [];
  const decided = [];
  let alive0 = 0;
  while (b.phase === 'fight') {
    const a = performance.now();
    sim.stepSpike(b);
    ms.push(performance.now() - a);
    walks.push(b.field.stats.tickWalks);
    decided.push(b.field.stats.tickDecided);
    if (b.t === 60_000) alive0 = b.units.filter((x) => x.alive).length;
  }
  const mean = ms.reduce((x, y) => x + y, 0) / ms.length;
  const ours = b.units.filter((x) => x.side === 'hero');
  const theirs = b.units.filter((x) => x.side === 'foe');
  const line = {
    seed: s,
    ticks: ms.length,
    battleS: b.t / 1000,
    result: b.phase,
    oursLeft: `${ours.filter((x) => x.alive).length}/${ours.length}`,
    foesLeft: `${theirs.filter((x) => x.alive).length}/${theirs.length}`,
    meanMs: mean,
    p95Ms: pct(ms, 0.95),
    worstMs: Math.max(...ms),
    walksPerTick: walks.reduce((x, y) => x + y, 0) / walks.length,
    mostWalks: Math.max(...walks),
    decidedPerTick: decided.reduce((x, y) => x + y, 0) / decided.length,
    mostDecided: Math.max(...decided),
    rebuilds: b.field.stats.rebuilds,
    searches: b.field.sectors.searches,
    buildMs: build,
    aliveAt60s: alive0,
    checksum: sim.spikeChecksum(b),
  };
  all.push(line);
  console.log(`seed ${s}: ${line.result} after ${line.battleS.toFixed(1)} s (${line.ticks} ticks); ours ${line.oursLeft}, foes ${line.foesLeft}`);
  console.log(`  sim ms a tick: mean ${fmt(line.meanMs)}, p95 ${fmt(line.p95Ms)}, worst ${fmt(line.worstMs)}   (build ${line.buildMs.toFixed(1)} ms)`);
  console.log(`  a tick: ${line.walksPerTick.toFixed(2)} bounded walks (most ${line.mostWalks}), ${line.decidedPerTick.toFixed(1)} decisions (most ${line.mostDecided}); sector rebuilds ${line.rebuilds}, A* searches ${line.searches}; checksum ${line.checksum}`);
}

// (for scale: one of today's fights, the five starting heroes against the Orc Warband's first band on the 8 x 11 board, through
// the full battle engine with every kit; its ms a tick over its fighters is the price of a whole mind)
{
  const b = sim.startBattle(1, 'orcs');
  const heroes = ['knight', 'samurai', 'archer', 'wizard', 'kunoichi'];
  heroes.forEach((h, i) => sim.place(b, h, 1 + i, b.board.d - 1));
  sim.fight(b);
  const ms = [];
  while (b.phase === 'fight') {
    const a = performance.now();
    sim.stepBattle(b);
    ms.push(performance.now() - a);
  }
  const mean = ms.reduce((x, y) => x + y, 0) / ms.length;
  console.log(`for scale, today's 5 v 5 fight on the 8 x 11 board: mean ${fmt(mean)} ms a tick, p95 ${fmt(pct(ms, 0.95))} over ${ms.length} ticks`);
}

const mean = all.reduce((x, y) => x + y.meanMs, 0) / all.length;
const p95 = Math.max(...all.map((x) => x.p95Ms));
console.log(`\nbudget (design 7.2): mean <= 0.75 ms here (3 ms on the phone, a 4x factor): ${mean <= 0.75 ? 'MET' : 'OVER'} (mean ${fmt(mean)}, p95 ${fmt(p95)})`);
