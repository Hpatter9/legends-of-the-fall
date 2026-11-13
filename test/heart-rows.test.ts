// HEART-ROWS (docs/notes/heart-rows.md): the run's lives in the top bar, a heart each, five to a row, spent from the end.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HEART_STAGGER_MS, heartFades, heartFull, heartRows, heartsLabel } from '../src/heartRowsRules';
import { LIVES } from '../src/sim/lives';

test('ten lives are two rows of five; the cursed march\'s five one row; more would take more rows', () => {
  assert.equal(heartRows(LIVES), 2);
  assert.equal(heartRows(5), 1);
  assert.equal(heartRows(0), 1);
  assert.equal(heartRows(11), 3);
});

test('the full hearts are the first ones: lives go from the last heart of the last row', () => {
  const full = (left: number) => Array.from({ length: 10 }, (_, i) => heartFull(i, left));
  assert.deepEqual(full(7), [true, true, true, true, true, true, true, false, false, false]);
  assert.deepEqual(full(0), Array(10).fill(false));
  assert.deepEqual(full(10), Array(10).fill(true));
});

test('a life spent fades its heart; several fade one after another, the last first', () => {
  assert.deepEqual(heartFades(10, 9, 10), [{ i: 9, delay: 0 }]);
  assert.deepEqual(heartFades(9, 4, 10), [8, 7, 6, 5, 4].map((i, n) => ({ i, delay: n * HEART_STAGGER_MS })));
  // (the first draw, and lives given back, fade nothing)
  assert.deepEqual(heartFades(-1, 6, 10), []);
  assert.deepEqual(heartFades(4, 9, 10), []);
});

test('the hearts keep their words', () => {
  assert.equal(heartsLabel(7, 10, 5), '7 of 10 lives left. A fallen hero rises after 5 seconds for one life.');
});
