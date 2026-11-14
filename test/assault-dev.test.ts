import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startedMeta } from '../src/sim/meta';
import { heroRank } from '../src/sim/awaken';
import { levelOfKind, MAX_LEVEL } from '../src/sim/levels';
import { ARMIES } from '../src/sim/armies';
import { HOLDS } from '../src/sim/assault/holds';
import { HOLD_MARK } from '../src/sim/assault/garrison';
import { isLastHold } from '../src/sim/assault/lastHold';
import { assaultInput, assaultParty, defaultPlan, settleAssault } from '../src/sim/assault/assaultMode';
import { playAssault, startAssault } from '../src/sim/assault/assault';
import { troopsOf } from '../src/sim/assault/economy';
import { pointsSpent } from '../src/sim/talents';
import { DESIGN_PARTY, rankAtLevel, trialArmies, trialForce, trialHeroes, trialMeta, TRIAL_KINDS, TRIAL_STRENGTHS } from '../src/sim/assault/devTrial';

// ASSAULT-DEV (docs/notes/assault-dev.md): Settings, Developer, Try an Assault. Every hold can be tried, as a conquest, the Last Hold or the
// Warband regrouped, with the force a player has when they get there, on a throwaway copy of the save.

test('every army with a hold can be tried, in all three stormings', () => {
  assert.deepEqual(trialArmies().sort(), Object.keys(HOLDS).sort());
  assert.equal(trialArmies().length, ARMIES.length);
  assert.deepEqual(TRIAL_KINDS.map((k) => k.id), ['hold', 'last', 'regroup']);
  assert.deepEqual(TRIAL_STRENGTHS.map((k) => k.id), ['expected', 'strong', 'weak']);
});

test('the force: the hold\'s mark for a conquest, the cap for the Last Hold and the Warband regrouped, ten levels either side', () => {
  for (const army of trialArmies()) {
    const hold = trialForce(army, 'hold', 'expected');
    assert.equal(hold.level, HOLD_MARK[army], army);
    assert.equal(hold.tier, 3);
    // (the Last Hold falls last: every other hold, the level-100 ones among them, has fallen first)
    assert.equal(trialForce(army, 'last', 'expected').level, MAX_LEVEL, army);
    const re = trialForce(army, 'regroup', 'expected');
    assert.equal(re.level, MAX_LEVEL);
    assert.equal(re.tier, 4);
    for (const kind of ['hold', 'last', 'regroup'] as const) {
      const e = trialForce(army, kind, 'expected');
      const w = trialForce(army, kind, 'weak');
      const s = trialForce(army, kind, 'strong');
      assert.equal(w.level, e.level - 10, `${army} ${kind} weak`);
      assert.ok(s.level >= e.level && s.level <= MAX_LEVEL);
      assert.ok(s.level > e.level || s.rank > e.rank, `${army} ${kind}: strong is stronger`);
      assert.ok(w.rank <= e.rank && e.rank <= s.rank);
      assert.ok(s.castleLevels >= e.castleLevels && e.castleLevels >= w.castleLevels);
      assert.ok(s.marks >= 3, 'strong is a Veteran host');
    }
  }
});

test('the rank follows the paces: none at the start, higher with the level, awakened by level 100', () => {
  assert.equal(rankAtLevel(1), 0);
  let last = 0;
  for (let L = 1; L <= 100; L++) {
    const r = rankAtLevel(L);
    assert.ok(r >= last && r <= 6, `level ${L}`);
    last = r;
  }
  assert.equal(rankAtLevel(55), 4);
  assert.equal(rankAtLevel(100), 5);
});

test('the trial meta fields the force: its levels, ranks, talents, ten to a platoon, a full Council', () => {
  const save = startedMeta(7);
  for (const army of ['orcs', 'golems']) {
    const f = trialForce(army, 'hold', 'expected');
    const m = trialMeta(save, { army, kind: 'hold', strength: 'expected', heroes: 'design' });
    assert.deepEqual(assaultParty(m), [...DESIGN_PARTY]);
    for (const k of assaultParty(m)) {
      assert.equal(levelOfKind(m, k), f.level, k);
      assert.equal(heroRank(m, k), f.rank, k);
      assert.ok(pointsSpent(m, k) > 0, `${k} has talents`);
      assert.equal(troopsOf(m, k).length, 10);
    }
    assert.equal(m.war!.members.length, 13);
    assert.ok(!isLastHold(m, army));
  }
  const last = trialMeta(save, { army: 'beasts', kind: 'last', strength: 'expected', heroes: 'design' });
  assert.ok(isLastHold(last, 'beasts'));
  const input = assaultInput(last, 'beasts', 1);
  assert.equal(input.last, true);
  assert.equal(input.council!.length, 12);
  assert.ok(input.warchief);
  const re = trialMeta(save, { army: 'yokai', kind: 'regroup', strength: 'expected', heroes: 'recruits' });
  assert.ok(re.assault!.conquered.yokai);
  assert.ok(!isLastHold(re, 'yokai'));
  // (the save's own party when it has five; else the design party stands in)
  assert.deepEqual(trialHeroes({ party: ['knight', 'cleric', 'archer', 'wizard', 'paladin'] }, 'party'), ['knight', 'cleric', 'archer', 'wizard', 'paladin']);
  assert.deepEqual(trialHeroes({ party: ['knight', 'cleric'] }, 'party'), [...DESIGN_PARTY]);
});

test('a dev assault, played to its end and settled, leaves the save byte for byte unchanged', () => {
  const save = startedMeta(11);
  save.crowns = 1234;
  const before = JSON.stringify(save);
  const m = trialMeta(save, { army: 'orcs', kind: 'last', strength: 'strong', heroes: 'design' });
  const party = assaultParty(m);
  const input = assaultInput(m, 'orcs', 99, defaultPlan(party));
  input.auto = true;
  const b = startAssault(input);
  playAssault(b);
  const r = settleAssault(m, b, 1);
  assert.equal(r.last, true);
  // (the trial's own copy took the ending: shown, not recorded)
  if (r.won) {
    assert.equal(r.warEnded, true);
    assert.ok(m.war!.end);
  }
  assert.ok(m.assault!.tries.orcs);
  assert.equal(JSON.stringify(save), before);
  assert.equal(save.war, undefined);
  assert.equal(save.assault, undefined);
});
