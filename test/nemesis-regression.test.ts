// The Nemesis War (`docs/notes/nemesis-1.md`) adds hooks to the fight (`Unit.nem`, the damage-taken step, the ailments' immunities) and a
// nemesis may take a foe's place in an army's wave. A fight with no nemesis in it must play out exactly as it did before: these twelve army
// waves were played on the code as it stood before the War's hooks landed (main 0.376.0), and their outcomes are pinned here, as
// `stand-regression.test.ts` pins the ordinary fights for the Last Stand. (BATTLE-FEEL, docs/notes/battle-feel.md, re-pinned three of the eight from
// the test's own output: a melee hero now walks for the foe it can strike soonest, and changes places with a still shooter of its own in a gap.) (HEROES-JOIN 2, docs/notes/heroes-join-2.md, re-pinned them again from the test's own
// output: eleven more heroes in the roster move the pools and means the fights are sized against.) (HEROES-JOIN, docs/notes/heroes-join.md, re-pinned them from the test's
// own output: nine more heroes in the roster move every hero's pools, which the fights are sized against.)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fight, playOut } from '../src/sim/battle';
import { armyRun, finish, noteFight, startStage } from '../src/sim/run';
import { autoDeploy, autoRound } from '../src/sim/autoplay';
import { maybeSpells, savedAt } from '../tools/autoplay';
import { FIELD_HAZARDS } from '../src/sim/fieldTraps';
import { LAND_TERRAIN } from '../src/sim/landTerrain';

// (LIVING-FIELDS: these fights were recorded before the land's traps and hazards, `fieldTraps.ts`; the set's one switch is off here, so every
// fight is laid as it was and plays as recorded)
FIELD_HAZARDS.on = false;
// (LAND-IDENTITY: nor had the lands' own terrain been laid thicker, `landTerrain.ts`: the mire's pools are off here for the same reason.
//  What the two switches do to a fight is held by their own tests, `living-fields-traps` and `land-terrain`.)
LAND_TERRAIN.on = false;

const party = ['knight', 'paladin', 'archer', 'warlock', 'cleric'];

/** An army run's first `waves` waves as the greedy player plays them: each wave's outcome, time, the standing on each side and the stream. */
function signature(army: string, level: number, seed: number, tier: number, waves: number): string[] {
  const meta = savedAt(level, party, seed);
  const run = armyRun(seed, army, party, undefined, tier);
  const out: string[] = [];
  while (!run.over && out.length < waves) {
    autoRound(run, meta, false);
    const b = startStage(run);
    autoDeploy(b, run, meta);
    fight(b);
    maybeSpells(b, meta);
    playOut(b);
    const alive = (side: string) => b.units.filter((x) => x.alive && x.side === side).length;
    out.push(`${run.stage}:${b.phase} ${b.t} ${alive('hero')}/${alive('foe')} ${b.rng}`);
    noteFight(run, b);
    finish(run, b.phase === 'won');
  }
  return out;
}

const CASES: [string, number, number, number, number][] = [
  ['orcs', 4, 1, 0, 9],
  ['orcs', 14, 2, 0, 9],
  ['undead', 16, 3, 0, 9],
  ['undead', 30, 4, 1, 9],
  ['beasts', 24, 5, 0, 9],
  ['wildwood', 32, 6, 0, 6],
  ['labyrinth', 45, 7, 0, 9],
  ['ogres', 55, 8, 0, 9],
];

test('army waves with no nemesis play out as they did before the Nemesis War', () => {
  const got = CASES.map(([army, level, seed, tier, waves]) => signature(army, level, seed, tier, waves).join(' | '));
  assert.deepEqual(got, PINNED);
});

const PINNED: string[] = [
  '1:won 18600 2/0 1430750612 | 2:won 12200 2/0 594009586 | 3:won 26300 3/0 2306707048 | 4:won 13500 4/0 1319412879 | 5:won 32200 4/0 1172045363 | 6:won 27000 3/0 2225551348 | 7:won 31100 4/0 3284437915 | 8:won 39700 4/0 415330416 | 9:won 29800 4/0 2158621151',
  '1:won 18200 2/0 779030198 | 2:won 8600 2/0 218677383 | 3:won 15000 3/0 754319160 | 4:won 12000 3/0 443329871 | 5:won 16800 4/0 3096842226 | 6:won 27800 4/0 2522288471 | 7:won 22800 4/0 33299809 | 8:won 22100 4/0 631766613 | 9:won 16000 4/0 3767357442',
  '1:won 67600 1/0 2801410344 | 2:won 47900 1/0 321018448 | 3:won 24000 2/0 3638529622 | 4:won 26600 3/0 1299369207 | 5:won 19200 4/0 1653556141 | 6:won 34300 4/0 2911384128 | 7:won 26000 4/0 56803627 | 8:won 67800 3/0 2748525963 | 9:won 24500 4/0 3691419861',
  '1:won 17800 2/0 1229364258 | 2:won 10600 2/0 3705349462 | 3:won 16200 2/0 582405497 | 4:won 14800 2/0 3557677139 | 5:won 12500 2/0 2855541775 | 6:won 17400 3/0 666448449 | 7:won 19400 4/0 3850791794 | 8:won 18300 5/0 3990802937 | 9:won 14800 5/0 1252390026',
  '1:won 17200 2/0 3531020768 | 2:won 23000 2/0 835006930 | 3:won 25600 3/0 2729339402 | 4:won 14600 3/0 986811696 | 5:won 14800 3/0 390622657 | 6:won 19700 4/0 1050377223 | 7:won 17600 5/0 1897288376 | 8:won 39100 4/0 2656417700 | 9:won 19800 5/0 4275319020',
  '1:won 16300 2/0 1046832989 | 2:won 18000 2/0 246202491 | 3:won 18200 2/0 1556686575 | 4:won 17000 2/0 4179660263 | 5:won 35900 3/0 2998996455 | 6:won 15900 4/0 995320354',
  '1:won 48600 2/0 1873580207 | 2:won 38900 2/0 2039163057 | 3:won 37500 3/0 3361444322 | 4:won 29000 4/0 711293297 | 5:won 35500 5/0 3324015673 | 6:won 18000 5/0 3781168195 | 7:won 24600 5/0 3681244941 | 8:won 44400 5/0 2222879963 | 9:won 29300 5/0 483912201',
  '1:lost 58000 0/2 4081342976',
];
