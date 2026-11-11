import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARMIES } from '../src/sim/armies';
import { armyChallenge, armyTarget, challengeLabel, suggestedArmyTier } from '../src/sim/armyChallenge';
import { startedMeta } from '../src/sim/meta';
import { partyPower } from '../src/sim/power';

test('challenge boundaries distinguish a stretch from a fair fight and a wall', () => {
  assert.equal(challengeLabel(130, 100), 'Comfortable');
  assert.equal(challengeLabel(129, 100), 'Matched');
  assert.equal(challengeLabel(90, 100), 'Matched');
  assert.equal(challengeLabel(89, 100), 'Stretch');
  assert.equal(challengeLabel(70, 100), 'Stretch');
  assert.equal(challengeLabel(69, 100), 'Overmatched');
  assert.equal(challengeLabel(0, 100), 'Overmatched');
});

test('army advice uses the actual selected party and recalculates its strength', () => {
  const m = startedMeta(1);
  const saved = JSON.stringify(m);
  const full = armyChallenge(m, ARMIES[0], 0);
  const draft = armyChallenge(m, ARMIES[0], 0, m.party.slice(0, 2));
  assert.equal(full.strength, partyPower(m, m.party));
  assert.equal(draft.strength, partyPower(m, m.party.slice(0, 2)));
  assert.ok(draft.strength < full.strength);
  assert.equal(armyChallenge(m, ARMIES[0], 0, []).label, 'Overmatched');
  assert.equal(JSON.stringify(m), saved, 'advice never changes the save');
});

test('every army tier has a finite target reflecting its actual stronger waves', () => {
  for (const a of ARMIES) {
    let before = 0;
    for (let tier = 0; tier < 5; tier++) {
      const target = armyTarget(a, tier);
      assert.ok(Number.isFinite(target) && target > 0);
      assert.ok(target > before, `${a.id} tier ${tier}: ${target} > ${before}`);
      before = target;
    }
  }
});

test('a starting three-hero company is compared with three slots, not five', () => {
  const m = startedMeta(1);
  m.unlocked = m.unlocked.slice(0, 3);
  m.party = [...m.unlocked];
  const advice = armyChallenge(m, ARMIES[0], 0);
  assert.equal(advice.target, armyTarget(ARMIES[0], 0, 3));
  assert.ok(advice.target < armyTarget(ARMIES[0], 0));
  const before = advice.strength;
  m.xp[m.party[0]] = 100000;
  assert.ok(armyChallenge(m, ARMIES[0], 0).strength > before);
});


test('a suggestion respects tier gates and avoids an overmatched tier when a viable one exists', () => {
  const m = startedMeta(1);
  const a = ARMIES[0];
  assert.equal(suggestedArmyTier(m, a), 0);
  m.armies.orcs = { stars: {}, won: 15, clears: 1, best: 15, met: { 0: 7, 1: 7, 2: 7, 3: 1, 4: 1 } };
  const suggestion = suggestedArmyTier(m, a);
  assert.notEqual(armyChallenge(m, a, suggestion).label, 'Overmatched');
  m.party = [];
  assert.equal(suggestedArmyTier(m, a), 0);
});
