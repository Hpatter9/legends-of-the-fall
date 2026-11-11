// TIER-CLEARS: a harder tier keeps its own clears, so its Auto and x3 open once it is cleared; and a save from before the fix,
// whose Hard stars were earned while every wave was settled as Normal, is given its clear back.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ARMIES, migrateArmies, settleWave } from '../src/sim/armies';
import { canAutoReplay, tierCleared } from '../src/sim/autoReplay';
import { startedMeta } from '../src/sim/meta';

const a = ARMIES[0];

test('a wave settled on a harder tier counts for that tier, not for Normal', () => {
  const m = startedMeta(1);
  for (let n = 1; n <= a.waves.length; n++) settleWave(m, a.id, n, true, 3);
  assert.equal(tierCleared(m, a.id, 0), true);
  assert.equal(tierCleared(m, a.id, 1), false);
  const normalClears = m.armies[a.id].clears;
  for (let n = 1; n <= a.waves.length; n++) settleWave(m, a.id, n, true, 3, 1);
  assert.equal(m.armies[a.id].clears, normalClears, 'a Hard clear is not one more Normal clear');
  assert.equal(m.armies[a.id].hard?.['1']?.clears, 1);
  assert.equal(canAutoReplay(m, a.id, 1), true, 'Auto opens on Hard once Hard is cleared');
  assert.equal(canAutoReplay(m, a.id, 2), false, 'and not on Elite');
});

test('an old save with a harder tier\'s stars but no clear of its own is given the clear', () => {
  // (as the page left it before the fix: three Normal clears, Hard's three stars met, its first clear paid, and no `hard` record)
  const raw = { [a.id]: { waves: a.waves.length, best: a.waves.length, won: a.waves.length, clears: 3, stars: {}, met: { '0': 7, '1': 7 }, first: 3 } };
  const armies = migrateArmies(raw, 0);
  assert.equal(armies[a.id].hard?.['1']?.clears, 1);
  assert.equal(armies[a.id].hard?.['1']?.won, a.waves.length);
  assert.equal(armies[a.id].hard?.['2'], undefined, 'a tier never cleared stays uncleared');
  const m = startedMeta(1);
  m.armies = armies;
  assert.equal(canAutoReplay(m, a.id, 1), true);
  assert.equal(canAutoReplay(m, a.id, 2), false);
});

test('a save whose harder tier was truly never cleared is left alone', () => {
  const raw = { [a.id]: { waves: a.waves.length, best: a.waves.length, won: a.waves.length, clears: 1, stars: {}, met: { '0': 1 }, first: 1 } };
  assert.equal(migrateArmies(raw, 0)[a.id].hard, undefined);
});
