// ASSAULT-ISOLATION (docs/notes/assault-1.md; the design's 7.1 and 7.6): the Assault changes no other fight. Its hooks run only on a fight with
// a field; `walkFrom` takes its windowed way only on a board bigger than any other; and the troops are fighters nothing counts as heroes.
// (The regression and identity fixtures, nemesis-regression, stand-regression, spells-identity and ailments-identical, hold the rest.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fight, place, playOut, startBattle } from '../src/sim/battle';
import { makeBoard } from '../src/sim/board';
import { BIG_WALK, walkFrom } from '../src/sim/path';
import { CAL_BOARD } from '../src/sim/calamity';
import { SCENARIO_SIZE } from '../src/sim/scenario';
import '../src/sim/assault/assault';
import { TROOP_UNITS } from '../src/sim/assault/troops';
import { realHero } from '../src/sim/kits/effects';
import { input } from './assaultKit';
import { startAssault } from '../src/sim/assault/assault';

test('no board but the field is big enough for the windowed walk', () => {
  for (const [w, d] of [[8, 11], [CAL_BOARD.w, CAL_BOARD.d], [SCENARIO_SIZE.w, SCENARIO_SIZE.d]]) assert.ok(w * d <= BIG_WALK, `${w} x ${d}`);
  const b = makeBoard(3);
  const walk = walkFrom(b, { u: 2, v: 9 }, 2, new Set());
  assert.equal(walk.cost.length, b.w * b.d);
  assert.ok(walk.cost.filter((c) => c < Infinity).length > b.w * b.d / 2, 'the whole board, as ever');
});

test('an ordinary fight has no field and plays as it did, with the Assault loaded', () => {
  const play = () => {
    const b = startBattle(11, 'orcs');
    place(b, 'knight', 3, 9);
    place(b, 'archer', 5, 10);
    fight(b);
    playOut(b);
    return b;
  };
  const a = play();
  const c = play();
  assert.equal(a.field, undefined);
  assert.equal(a.t, c.t);
  assert.equal(a.rng, c.rng);
  assert.equal(a.phase, c.phase);
});

test('the troops are never counted as heroes (the end of a fight, the XP, the revives)', () => {
  const b = startAssault(input());
  for (const x of b.units) if (TROOP_UNITS[x.def]) assert.ok(!realHero(x));
  assert.equal(b.units.filter((x) => realHero(x)).length, 5);
});
