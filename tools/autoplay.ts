// A greedy player for the armies, shared by the balance report (`tools/balance.ts`) and the tests: it summons whenever
// the gold allows, takes the best free pick of an event, fields the five strongest heroes (fighters in front, shooters
// behind, on high ground; see `src/sim/autoplay.ts`, which the Auto button and the auto-replay share) and plays an army's waves from wave 1 until a fight is lost or the last boss falls. Hero levels come from, and
// XP goes into, the save's meta, as the page does.

import { fight, playOut } from '../src/sim/battle';
import { fightXp, gainXp, xpFor } from '../src/sim/levels';
import { newCastle, xpRate, type Castle } from '../src/sim/castle';
import { newMeta, type Meta } from '../src/sim/meta';
import { armyById } from '../src/sim/armies';
import { armyRun, finish, isBossRun, noteFight, startStage, tierOfRun, type Run } from '../src/sim/run';
import { armyRules } from '../src/sim/armyStars';
import { ratingOf } from '../src/sim/stars';
import { autoDeploy, autoRound, strengthOf } from '../src/sim/autoplay';

export { strengthOf };

/**
 * One attempt at an army from wave 1, as a greedy player: returns the waves won and whether the army fell. Gains XP into `meta`.
 * With `castle` the run takes its buildings (and the library's share of XP); `gear` dresses the squad with the pieces the run finds.
 */
export function playArmy(meta: Meta, armyId: string, seed: number, party: readonly string[], castle: Castle = newCastle(), gear = false, tier = 0): { won: number; cleared: boolean; stars: number } {
  const army = armyById(armyId)!;
  const run: Run = armyRun(seed, armyId, party, castle, tier);
  let won = 0;
  while (!run.over) {
    autoRound(run, meta, gear);
    const b = startStage(run);
    autoDeploy(b, run, meta);
    fight(b);
    playOut(b);
    const ok = b.phase === 'won';
    if (ok) won = run.stage;
    noteFight(run, b);
    finish(run, ok, ratingOf(b, isBossRun(run)).stars);
    gainXp(meta, fightXp(b, xpRate(castle)));
  }
  const cleared = !!run.cleared && won === army.waves.length;
  return { won, cleared, stars: cleared ? armyRules(army, tierOfRun(run), run).filter((r) => r.earned).length : 0 };
}

/** A save whose party kinds are all at `level` (and nothing else). */
export function savedAt(level: number, party: readonly string[], seed: number): Meta {
  const m = newMeta(seed);
  for (const k of party) m.xp[k] = xpFor(level);
  return m;
}

