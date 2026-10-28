import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readyBattle } from './helpers';
import { fight, playOut, stepBattle, heroesPlaced, type Battle } from '../src/sim/battle';
import { DUCHESS_LEVEL, DUCHESS_ODDS, declineDuchess, duchessDue, duchessIn, duchessModeOk, duchessRolls, joinDuchess } from '../src/sim/duchessFight';
import { lastingBoost } from '../src/sim/levels';
import { ratingOf } from '../src/sim/stars';
import { fightXp } from '../src/sim/levels';
import { armyRun, startStage } from '../src/sim/run';
import { ARMIES } from '../src/sim/armies';
import { UNITS } from '../src/sim/units';

const goat = (b: Battle) => b.units.find((u) => u.def === 'duchess');

test('about one fight in a thousand brings her, from the seed alone', () => {
  let n = 0;
  for (let seed = 1; seed <= 200_000; seed++) if (duchessRolls(seed)) n++;
  const share = n / 200_000;
  assert.ok(share > 0.7 / DUCHESS_ODDS && share < 1.3 / DUCHESS_ODDS, `share ${share}`);
  // (the same seed always answers the same)
  for (let seed = 1; seed < 5000; seed++) assert.equal(duchessRolls(seed), duchessRolls(seed));
  assert.equal(duchessDue(7, 'always'), true);
  assert.equal(duchessDue(7, 'never'), false);
});

test('a fight told to bring her has her join as it begins, at level 100, beside the heroes', () => {
  const b = readyBattle(3, undefined, { duchess: 'always' });
  assert.equal(b.duchess, true);
  assert.equal(goat(b), undefined, 'not on the board while the heroes are placed');
  const placed = heroesPlaced(b);
  assert.ok(fight(b));
  const me = goat(b)!;
  assert.ok(me, 'she has joined');
  assert.equal(me.level, DUCHESS_LEVEL);
  assert.equal(me.side, 'hero');
  assert.equal(me.maxHp, Math.round(UNITS.duchess.hp * lastingBoost(DUCHESS_LEVEL).hp));
  assert.ok(me.v >= b.board.d - 3, 'on the heroes\' rows');
  assert.equal(heroesPlaced(b), placed, 'she is not one of the placed heroes');
  assert.ok(stepBattle(b).some((e) => e.kind === 'duchess'), 'the page is told');
  assert.equal(joinDuchess(b), null, 'only one of her');
});

test('a fight without her plays out exactly as before', () => {
  const plain = playOut(readyBattle(11));
  const never = playOut(readyBattle(11, undefined, { duchess: 'never' }));
  assert.equal(never.t, plain.t);
  assert.equal(never.phase, plain.phase);
  assert.deepEqual(never.units.map((u) => u.hp), plain.units.map((u) => u.hp));
});

test('a fight with her plays out the same every time, and she earns no XP and costs no star', () => {
  const a = readyBattle(5, undefined, { duchess: 'always' });
  const c = readyBattle(5, undefined, { duchess: 'always' });
  fight(a);
  fight(c);
  playOut(a);
  playOut(c);
  assert.equal(a.t, c.t);
  assert.deepEqual(a.units.map((u) => u.hp), c.units.map((u) => u.hp));
  assert.ok(duchessIn(a).fought);
  assert.equal(fightXp(a).duchess, undefined);
  // (her fall alone does not take the "No one fell" star)
  const me = goat(a)!;
  if (a.phase === 'won' && a.units.every((u) => u.def === 'duchess' || u.side !== 'hero' || u.alive)) {
    me.alive = false;
    assert.ok(ratingOf(a, false).rules[1].earned);
  }
});

test('"Not today" sends her off before the fight, and not after', () => {
  const b = readyBattle(3, undefined, { duchess: 'always' });
  assert.ok(declineDuchess(b));
  fight(b);
  assert.equal(goat(b), undefined);
  const c = readyBattle(3, undefined, { duchess: 'always' });
  fight(c);
  assert.equal(declineDuchess(c), false);
});

test('a run\'s fight rolls for her only when the page asks, and never in the modes she stays out of', () => {
  const run = armyRun(9, ARMIES[0].id);
  assert.equal(startStage(run).duchess, undefined, 'headless callers never bring her');
  assert.equal(startStage(run, 'always').duchess, true);
  assert.equal(duchessModeOk({ kind: 'army', army: ARMIES[0].id }), true);
  assert.equal(duchessModeOk({ kind: 'daily', date: 20261028, practice: false }), true);
});
