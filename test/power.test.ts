import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyStats } from '../src/sim/equipment';
import { startedMeta } from '../src/sim/meta';
import { gradeBoost } from '../src/sim/run';
import { kindPower, powerOf } from '../src/sim/power';
import { HEROES } from '../src/sim/units';

test('a fresh hero has a power near a thousand', () => {
  const m = startedMeta(1);
  for (const k of HEROES) {
    const p = kindPower(m, k);
    assert.ok(p > 300 && p < 3000, `${k} ${p}`);
  }
});

test('grade, level and equipment each raise a hero\'s power', () => {
  const k = HEROES[0];
  const base = powerOf(k, gradeBoost(1, 0, 1));
  assert.ok(powerOf(k, gradeBoost(2, 0, 1)) > base);
  assert.ok(powerOf(k, gradeBoost(1, 0, 10)) > base);
  const eq = { ...emptyStats(), atk: 0.2, hp: 0.2 };
  assert.ok(powerOf(k, { ...gradeBoost(1, 0, 1), equip: eq }) > base);
});
