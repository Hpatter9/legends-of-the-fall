import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ARMIES } from '../src/sim/armies';
import { newMeta } from '../src/sim/meta';
import { autoMergeOpen, autoPlaceOpen, featuresToTell, markTold } from '../src/sim/featureUnlocks';

const beat = (m: ReturnType<typeof newMeta>, n: number): void => {
  for (const a of ARMIES.slice(0, n)) m.armies[a.id] = { best: 15, won: 15, clears: 1, stars: {} };
};

describe('the earned deploy helpers', () => {
  it('a new save has neither Auto merge nor Auto place', () => {
    const m = newMeta(1);
    assert.equal(autoMergeOpen(m), false);
    assert.equal(autoPlaceOpen(m), false);
    assert.deepEqual(featuresToTell(m), []);
  });
  it('Auto merge opens when the second army falls, Auto place when the fourth does', () => {
    const m = newMeta(1);
    beat(m, 1);
    assert.equal(autoMergeOpen(m), false);
    beat(m, 2);
    assert.equal(autoMergeOpen(m), true);
    assert.equal(autoPlaceOpen(m), false);
    beat(m, 3);
    assert.equal(autoPlaceOpen(m), false);
    beat(m, 4);
    assert.equal(autoPlaceOpen(m), true);
  });
  it('an army opened but not beaten does not count', () => {
    const m = newMeta(1);
    m.opened = ARMIES.slice(0, 5).map((a) => a.id);
    assert.equal(autoMergeOpen(m), false);
    assert.equal(autoPlaceOpen(m), false);
  });
  it('a save that has already beaten them gets both at once, each told once', () => {
    const m = newMeta(1);
    beat(m, 4);
    assert.deepEqual(featuresToTell(m), ['autoMerge', 'autoPlace']);
    markTold(m, featuresToTell(m));
    assert.deepEqual(featuresToTell(m), []);
    assert.deepEqual(m.featuresTold, ['autoMerge', 'autoPlace']);
  });
  it('tells Auto merge alone first, then Auto place when it comes', () => {
    const m = newMeta(1);
    beat(m, 2);
    assert.deepEqual(featuresToTell(m), ['autoMerge']);
    markTold(m, ['autoMerge']);
    beat(m, 4);
    assert.deepEqual(featuresToTell(m), ['autoPlace']);
  });
});
