// How the starter packs do on the first army at the start (STARTER-KING, `docs/notes/starter-packs.md`): a brand-new save picks a
// pack (level 1, no talents, no castle) and plays the first army's Normal tier as the autoplay does (it hires from the pack with the
// run's gold, fields the squad and fights each wave). For each pack: the mean waves won in a first run, the share of runs that won
// the first 3 and 5 waves, the share that cleared, and the mean runs to a first clear with XP carried between runs (as a real player).
//
//   node tools/starter-packs/run.mjs                          the two fixed packs (`STARTER_PACKS`)
//   node tools/starter-packs/run.mjs knight,samurai,archer peasant,kunoichi,wizard   any packs
//
// Environment: SAVES (default 40), CAP (runs to a first clear, default 15), ARMY (default the first army).
import { ARMIES, armyById } from '../../src/sim/armies';
import { fight, playOut } from '../../src/sim/battle';
import { newCastle } from '../../src/sim/castle';
import { fightXp, gainXp, levelOfKind } from '../../src/sim/levels';
import { newMeta, pickStarter, type Meta } from '../../src/sim/meta';
import { mixSeed } from '../../src/sim/rng';
import { armyRun, finish, isBossRun, noteFight, startStage } from '../../src/sim/run';
import { autoDeploy, autoRound } from '../../src/sim/autoplay';
import { ratingOf } from '../../src/sim/stars';
import { FIXED_PACKS } from '../../src/sim/starter';
import { UNITS } from '../../src/sim/units';

const SAVES = Number(process.env.SAVES ?? 40);
const CAP = Number(process.env.CAP ?? 15);
const army = armyById(process.env.ARMY ?? ARMIES[0].id)!;
const packs: string[][] = process.argv.length > 2 ? process.argv.slice(2).map((a) => a.split(',')) : FIXED_PACKS.map((p) => [...p.heroes]);

/** A brand-new save that took this pack. */
function fresh(pack: string[], seed: number): Meta {
  const m = newMeta(seed);
  m.starter = { packs: [pack], pick: null };
  pickStarter(m, 0);
  return m;
}

/** One run of the army's Normal tier: the waves won (in a row from the first). XP is gained into `meta`. */
function oneRun(meta: Meta, pack: string[], seed: number): number {
  const castle = newCastle();
  const run = armyRun(seed, army.id, pack, castle, 0);
  let won = 0;
  while (!run.over) {
    autoRound(run, meta, true);
    const b = startStage(run);
    autoDeploy(b, run, meta);
    fight(b);
    playOut(b);
    const ok = b.phase === 'won';
    if (ok) won = run.stage;
    noteFight(run, b);
    finish(run, ok, ratingOf(b, isBossRun(run)).stars);
    gainXp(meta, fightXp(b, 1));
  }
  return won;
}

console.log(`${army.name} (${army.waves.length} waves), Normal, from a fresh save at level 1: ${SAVES} saves a pack`);
for (const pack of packs) {
  let waves = 0, three = 0, five = 0, cleared = 0, toClear = 0, everCleared = 0, endLevel = 0;
  for (let s = 1; s <= SAVES; s++) {
    const w = oneRun(fresh(pack, s), pack, mixSeed(s, 0x57a2, 1));
    waves += w;
    if (w >= 3) three++;
    if (w >= 5) five++;
    if (w >= army.waves.length) cleared++;
    // (runs to a first clear, XP carried; CAP + 1 when never)
    const m = fresh(pack, s);
    let n = 0;
    let ok = false;
    while (n < CAP && !ok) ok = oneRun(m, pack, mixSeed(s, 0x57a3, n++)) >= army.waves.length;
    toClear += ok ? n : CAP + 1;
    if (ok) everCleared++;
    endLevel += pack.reduce((t, k) => t + levelOfKind(m, k), 0) / pack.length;
  }
  const pc = (n: number) => `${Math.round((100 * n) / SAVES)}%`.padStart(4);
  console.log(`${pack.map((k) => UNITS[k].name).join(', ').padEnd(40)} waves ${(waves / SAVES).toFixed(2).padStart(5)}  3+ ${pc(three)}  5+ ${pc(five)}  cleared ${pc(cleared)}  runs to clear ${(toClear / SAVES).toFixed(1).padStart(4)} (${pc(everCleared)})  level then ${(endLevel / SAVES).toFixed(1)}`);
}
