// SUMMON-TIMERS (docs/notes/summon-timers.md): how the summoners and shapeshifters fare over an army's waves, where a summon or a shape
// carries from wave to wave. A fixed party (the hero and four others), every hero at `level`, plays an army from wave 1 until a wave is lost
// or the army falls, keeping its charges (and, with this branch, its summons and shapes) between waves as the page does (`keepCharges`).
// No hires, merges or gear, so each run is the five alone and the numbers are the kits'.
//   node tools/summon-timers/waves.mjs <army> <level> [saves] [heroes,...]
// Prints each hero's mean waves won and the share of runs that cleared the army.

import { fight, playOut } from '../../src/sim/battle';
import { armyById } from '../../src/sim/armies';
import { armyRun, finish, isBossRun, keepCharges, noteFight, recruit, startStage } from '../../src/sim/run';
import { autoDeploy } from '../../src/sim/autoplay';
import { ratingOf } from '../../src/sim/stars';
import { savedAt } from '../autoplay';

export const SEVEN = ['druid', 'beastmaster', 'reaper', 'samuraiCommander', 'werewolf', 'kitsune', 'demonSwordsman'];
const REST = ['knight', 'paladin', 'archer', 'cleric'];

/** One run of `army` with `hero` and the four others at `level`: the waves won, and whether it cleared. */
export function runOnce(army: string, hero: string, level: number, seed: number): { won: number; cleared: boolean } {
  const party = [hero, ...REST];
  const meta = savedAt(level, party, seed);
  const run = armyRun(seed, army, party);
  for (const k of party) recruit(run, k, 0);
  run.squad = run.roster.map((h) => h.id);
  let won = 0;
  while (!run.over) {
    const b = startStage(run);
    autoDeploy(b, run, meta);
    fight(b);
    playOut(b);
    const ok = b.phase === 'won';
    if (ok) {
      won = run.stage;
      keepCharges(run, b);
    }
    noteFight(run, b);
    finish(run, ok, ratingOf(b, isBossRun(run)).stars);
  }
  return { won, cleared: !!run.cleared };
}

const [army = 'beasts', level = '15', saves = '40', who] = process.argv.slice(2);
if (!armyById(army)) throw new Error(`no army ${army}`);
const heroes = who ? who.split(',') : [...SEVEN, 'mercenary'];
for (const hero of heroes) {
  let w = 0;
  let c = 0;
  for (let s = 0; s < Number(saves); s++) {
    const r = runOnce(army, hero, Number(level), 0x5170 + s * 7919);
    w += r.won;
    c += r.cleared ? 1 : 0;
  }
  console.log(`${army} L${level} ${hero}: mean waves ${(w / Number(saves)).toFixed(2)} of ${armyById(army)!.waves.length}, cleared ${((100 * c) / Number(saves)).toFixed(0)}%`);
}
