import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canRetry, fallOutcome, finish, MAX_RETRIES, newRun, retriesLeft, retryGold, retryWave, summonCost, type Run } from '../src/sim/run';
import { startDaily } from '../src/sim/modes';
import { startedMeta } from '../src/sim/meta';

// A fall with a heart left burns the heart and starts the same wave again on its own (no prompt, no give-up); with none left the run ends.

test('a fall with hearts left spends one, keeps the wave and adds the retry gold', () => {
  const r = newRun(21);
  r.stage = 5;
  const gold = r.gold;
  const boost = retryGold(r);
  assert.equal(boost, summonCost(r));
  assert.equal(fallOutcome(r), 'heart');
  assert.equal(retryWave(r), boost);
  assert.equal(r.stage, 5, 'the same wave again');
  assert.equal(r.gold, gold + boost);
  assert.equal(retriesLeft(r), MAX_RETRIES - 1);
  assert.equal(r.over, false);
});

test('a fall with no heart left ends the run as a loss', () => {
  const r = newRun(22);
  for (let i = 0; i < MAX_RETRIES; i++) assert.ok(retryWave(r) !== null);
  assert.equal(fallOutcome(r), 'end');
  const gold = r.gold;
  assert.equal(retryWave(r), null, 'no heart, no boost');
  assert.equal(r.gold, gold);
  finish(r, false);
  assert.equal(r.over, true);
  assert.equal(fallOutcome(r), 'end');
});

test('the daily loses hearts like an army; a run on the tower or the calamity has none', () => {
  const daily = startDaily(startedMeta(6), 20261021);
  assert.equal(fallOutcome(daily), 'heart');
  assert.ok(retryWave(daily));
  const tower = { ...newRun(23), tower: {} } as unknown as Run;
  assert.equal(canRetry(tower), false);
  assert.equal(fallOutcome(tower), 'end');
  const calamity = { ...tower, mode: { kind: 'calamity' } } as unknown as Run;
  assert.equal(fallOutcome(calamity), 'end');
});

test('a revive is deterministic: the same run revived twice is the same run', () => {
  const a = newRun(24);
  const b = newRun(24);
  retryWave(a);
  retryWave(b);
  assert.deepEqual(a, b);
});
