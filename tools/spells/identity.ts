// RPG-SPELLS, batch 0 and 1: the proof that the fixed skill keys and the movement toolkit change no fight. Every scenario of the
// STATUS-FX proof (`tools/status-fx/logs.ts`: seeded fights of every mode) plays with the game as it ships (the ailments on), plus a
// fight for each of the 45 heroes at level 1, 10 and 30; every tick's events (every key of every event) and every fighter's end state
// (tile, health, pool, meter) fold into one hash a scenario. The fixture (`test/fixtures/spells-identity.json`) was recorded on main's
// code before batch 0 (`node tools/spells/identity.mjs --write`); `test/spells-identity.test.ts` holds every hash to it.

import { battleTap, fight, place, startBattle, stepBattle, type Battle, type BattleEvent } from '../../src/sim/battle';
import { FIELD_BANDS } from '../../src/sim/foes';
import { gradeBoost, stageBoost } from '../../src/sim/run';
import { mixSeed, Rng } from '../../src/sim/rng';
import { ALL_HEROES } from '../../src/sim/units';
import { deploySpots, pickTeam } from '../heroSweep';
import { SCENARIOS } from '../status-fx/logs';

let h = 0x811c9dc5;
const feed = (s: string) => {
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
};
const canon = (e: BattleEvent): string => {
  const o = e as unknown as Record<string, unknown>;
  return Object.keys(o)
    .filter((k) => o[k] !== undefined)
    .sort()
    .map((k) => `${k}=${JSON.stringify(o[k])}`)
    .join(',');
};
const endState = (b: Battle) => b.units.map((u) => `${u.def}@${u.u},${u.v}:${u.alive ? Math.round(u.hp) : 'x'}/${Math.round(u.charge)}/${Math.round(u.charge2 ?? -1)}`).join(';');
/** The tap the proof folds every tick through (the STATUS-FX scenarios set their own tap when their file loads; this one replaces it). */
function tap(b: Battle, events: BattleEvent[]): void {
  feed(`t${b.t}`);
  for (const e of events) feed(canon(e));
  if (b.phase !== 'fight') feed(endState(b));
}

/** One fight with `kind` in a seeded team of five at `level`, against a field band. */
function heroFight(kind: string, seed: number, level: number): void {
  const b = startBattle(seed, FIELD_BANDS[seed % FIELD_BANDS.length], stageBoost(level === 1 ? 5 : level === 10 ? 24 : 39));
  const spots = deploySpots(b, new Rng(mixSeed(seed, 0xba1a)));
  const team = [kind, ...pickTeam(new Rng(mixSeed(seed, 0x7ea4))).filter((k) => k !== kind)].slice(0, 5);
  team.forEach((id, i) => place(b, id, spots[i][0], spots[i][1], undefined, gradeBoost(1 + (seed % 3), 0, level)));
  fight(b);
  while (b.phase === 'fight') stepBattle(b);
}

const ALL: Record<string, () => void> = {
  ...SCENARIOS,
  heroes1: () => ALL_HEROES.forEach((k, i) => heroFight(k, 700 + i, 1)),
  heroes10: () => ALL_HEROES.forEach((k, i) => heroFight(k, 800 + i, 10)),
  heroes30: () => ALL_HEROES.forEach((k, i) => heroFight(k, 900 + i, 30)),
};

/** Play every scenario and give each one's hash. */
export function identityHashes(only?: readonly string[]): Record<string, string> {
  const out: Record<string, string> = {};
  const was = battleTap.fn;
  battleTap.fn = tap;
  try {
    for (const [name, run] of Object.entries(ALL)) {
      if (only && !only.includes(name)) continue;
      h = 0x811c9dc5;
      run();
      out[name] = h.toString(16).padStart(8, '0');
    }
  } finally {
    battleTap.fn = was;
  }
  return out;
}
