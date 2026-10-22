import { test } from 'node:test';
import assert from 'node:assert/strict';
import { actLook, bossOfAct } from '../src/towerTheme';
import { UNITS } from '../src/sim/units';

test('the first three acts have their own looks and names; later ones reuse them tinted and numbered', () => {
  assert.deepEqual([1, 2, 3].map((a) => actLook(a).look), [0, 1, 2]);
  assert.equal(actLook(2).name, 'The Haunted Halls');
  assert.equal(actLook(1).tint, 0);
  const four = actLook(4);
  assert.equal(four.look, 0);
  assert.equal(four.name, 'The Sunken Crypt II');
  assert.notEqual(four.tint, 0);
  assert.notEqual(actLook(7).name, four.name);
});

test('every act has a boss that exists, and it is the first foe of the boss band the tower fights', () => {
  for (let a = 1; a <= 12; a++) assert.equal(UNITS[bossOfAct(a)]?.side, 'foe', `act ${a}`);
  assert.equal(bossOfAct(1), 'orcWarlord');
});
