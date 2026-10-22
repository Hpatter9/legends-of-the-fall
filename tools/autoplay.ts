// A greedy player for the armies, shared by the balance report (`tools/balance.ts`) and the tests: it summons whenever
// the gold allows, takes the first option of an event, fields the five strongest heroes (fighters in front, shooters
// behind) and plays an army's waves from wave 1 until a fight is lost or the last boss falls. Hero levels come from, and
// XP goes into, the save's meta, as the page does.

import { D, DEPLOY_ROWS, standable, tileAt } from '../src/sim/board';
import { fight, place, playOut, type Battle } from '../src/sim/battle';
import { chooseOption, leaveEvent } from '../src/sim/events';
import { fightXp, gainXp, levelOfKind, xpFor } from '../src/sim/levels';
import { newMeta, rankOf, type Meta } from '../src/sim/meta';
import { armyById } from '../src/sim/armies';
import { armyRun, boostOf, finish, isBossRun, SQUAD, startStage, summon, type Owned, type Run } from '../src/sim/run';
import { ratingOf } from '../src/sim/stars';
import { UNITS } from '../src/sim/units';

/** How strong a hero is for the squad: its base hp times attack, times its boosts (grade, rank, level, gear, bumps). */
export function strengthOf(meta: Meta, h: Owned): number {
  const def = UNITS[h.kind];
  const boost = boostOf(h, rankOf(meta, h.kind), levelOfKind(meta, h.kind));
  return def.hp * def.atk * (boost.hp ?? 1) * (boost.atk ?? 1);
}

/** The deploy tiles front row first, the middle of a row first: where a careful player puts the heroes that hold the line. */
export function frontSpots(b: Battle): [number, number][] {
  const spots: [number, number][] = [];
  for (let v = D - DEPLOY_ROWS; v < D; v++) for (let u = 0; u < b.board.w; u++) if (standable(tileAt(b.board, u, v))) spots.push([u, v]);
  const mid = (b.board.w - 1) / 2;
  return spots.sort((a, c) => a[1] - c[1] || Math.abs(a[0] - mid) - Math.abs(c[0] - mid) || a[0] - c[0]);
}

/** One attempt at an army from wave 1, as a greedy player: returns the waves won and whether the army fell. Gains XP into `meta`. */
export function playArmy(meta: Meta, armyId: string, seed: number, party: readonly string[]): { won: number; cleared: boolean } {
  const army = armyById(armyId)!;
  const run: Run = armyRun(seed, armyId, party);
  let won = 0;
  while (!run.over) {
    while (run.event) if (chooseOption(run, 0) === null) leaveEvent(run);
    while (summon(run)) {
      // (summons while the gold lasts)
    }
    const squad = [...run.roster].sort((a, b) => strengthOf(meta, b) - strengthOf(meta, a)).slice(0, SQUAD);
    run.squad = squad.map((h) => h.id);
    const b = startStage(run);
    // (shooters and casters go behind the fighters)
    const spots = frontSpots(b);
    const order = [...squad].sort((a, c) => Number(UNITS[a.kind].range > 1) - Number(UNITS[c.kind].range > 1));
    order.forEach((h, i) => place(b, h.kind, spots[i][0], spots[i][1], h.id, boostOf(h, rankOf(meta, h.kind), levelOfKind(meta, h.kind))));
    fight(b);
    playOut(b);
    const ok = b.phase === 'won';
    if (ok) won = run.stage;
    finish(run, ok, ratingOf(b, isBossRun(run)).stars);
    gainXp(meta, fightXp(b));
  }
  return { won, cleared: !!run.cleared && won === army.waves.length };
}

/** A save whose party kinds are all at `level` (and nothing else). */
export function savedAt(level: number, party: readonly string[], seed: number): Meta {
  const m = newMeta(seed);
  for (const k of party) m.xp[k] = xpFor(level);
  return m;
}

