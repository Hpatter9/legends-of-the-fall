// The Assault's tests' shared makings (docs/notes/assault-1.md): a party of five at a level with full platoons, standing at the Landing.
import { gradeBoost } from '../src/sim/run';
import { startAssault } from '../src/sim/assault/assault';
import { orderPlatoon } from '../src/sim/assault/platoons';
import { stepBattle, type Battle } from '../src/sim/battle';
import type { AssaultInput } from '../src/sim/assault/holdTypes';

export const PARTY = ['knight', 'samurai', 'archer', 'wizard', 'dragoon'];

/** An assault's input: the party at `level`, ten recruits each, over the Old Bridge. */
export function input(o: Partial<AssaultInput> = {}, level = 55): AssaultInput {
  return {
    seed: 7,
    army: 'orcs',
    heroes: PARTY.map((k) => ({ kind: k, boost: gradeBoost(3, 0, level), level })),
    troops: Object.fromEntries(PARTY.map((k) => [k, Array(10).fill(0)])),
    approaches: { knight: 'bridge', samurai: 'east', archer: 'west', wizard: 'bridge', dragoon: 'bridge' },
    ...o,
  };
}

/** An assault whose platoons hold at the Landing (no Auto): nothing meets anything for a while. */
export function quiet(o: Partial<AssaultInput> = {}): Battle {
  const b = startAssault(input(o));
  b.field!.hold!.platoons.forEach((_pl, k) => orderPlatoon(b, k, { kind: 'hold', at: { u: 0, v: 0 } }));
  stepBattle(b);
  return b;
}

/** Step a battle this many ticks (or to its end). */
export function steps(b: Battle, n: number): void {
  for (let i = 0; i < n && b.phase === 'fight'; i++) stepBattle(b);
}

/** Fell a fighter where it stands (as a blow would). */
export function fell(b: Battle, id: number): void {
  const x = b.field!.byId[id];
  x.hp = 0;
  x.alive = false;
  x.diedAt = b.t;
}
