import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARMIES, waveBoost } from '../src/sim/armies';
import { armyRun, foeProfOf, startStage } from '../src/sim/run';
import { calamityRun, towerRun } from '../src/sim/modes';
import { startedMeta } from '../src/sim/meta';
import { blowStatsOf } from '../src/sim/blow';
import { CAL_PROF_PER, depthProficiency, DEPTH_PROF_MAX, foeStatsOf, JOINT, SPIRE_PROF_PER, STAND_PROF_PER, TIER_PROFICIENCY } from '../src/sim/stats';
import { UNITS } from '../src/sim/units';

// The joint rebalance (docs/notes/joint-rebalance.md; the D&D stats design's batch 7 with the skills overhaul's batch 8): the rules batches 4
// to 6 held back are on, each a switch (`JOINT`), and the foes fight at their army tier's proficiency, or their depth's in the spire, the
// Calamity and the Last Stand. A fresh party's first wave is eased a little.

test('every held-back rule is on in the game', () => {
  assert.deepEqual(Object.values(JOINT), Object.values(JOINT).map(() => true));
});

test("the foes' proficiency: an army's by its tier (Normal +2 to Mythic +6), the daily's Normal's, the spire's and the Calamity's by their depth", () => {
  for (let tier = 0; tier < TIER_PROFICIENCY.length; tier++) {
    const run = armyRun(7, 'orcs', undefined, undefined, tier);
    assert.equal(foeProfOf(run), TIER_PROFICIENCY[tier]);
    const b = startStage(run);
    assert.equal(b.foeBoost?.prof, TIER_PROFICIENCY[tier]);
    // (a foe's to hit is its family's block at that proficiency)
    const f = b.units.find((u) => u.side === 'foe')!;
    assert.equal(blowStatsOf(b, f).toHit, foeStatsOf(UNITS[f.def], 0, undefined, TIER_PROFICIENCY[tier]).toHit);
  }
  assert.deepEqual(TIER_PROFICIENCY, [2, 3, 4, 5, 6]);
  // (the depths: +2, +1 each `per`, to +8)
  assert.equal(depthProficiency(1, 2), 2);
  assert.equal(depthProficiency(2, 2), 2);
  assert.equal(depthProficiency(3, 2), 3);
  assert.equal(depthProficiency(1, STAND_PROF_PER), 2);
  assert.equal(depthProficiency(1 + STAND_PROF_PER, STAND_PROF_PER), 3);
  assert.equal(depthProficiency(999, 1), DEPTH_PROF_MAX);
  const spire = towerRun(5, startedMeta(5));
  assert.equal(foeProfOf(spire), depthProficiency(spire.tower!.act, SPIRE_PROF_PER));
  spire.tower!.act = 5;
  assert.equal(foeProfOf(spire), depthProficiency(5, SPIRE_PROF_PER));
  const cal = calamityRun(5, startedMeta(5), 'knight');
  cal.tower!.act = 4;
  assert.equal(foeProfOf(cal), depthProficiency(4, CAL_PROF_PER));
});

test('no wave is eased: a fresh party’s first wave is as the curve has it (the owner removed the first-wave ease)', () => {
  for (const a of ARMIES) {
    const plain = (n: number) => a.start * (1 + a.growth * (n - 1));
    assert.ok(Math.abs(waveBoost(a, 1, 0).foes!.hp! - plain(1)) < 1e-9, a.id);
    assert.ok(Math.abs(waveBoost(a, 2, 0).foes!.hp! - plain(2)) < 1e-9, a.id);
  }
});
