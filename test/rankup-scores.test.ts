import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALL_HEROES } from '../src/sim/units';
import { AWAKEN_SCORE, derivedOf, profileOf, orderOf } from '../src/sim/stats';
import { fightFigures, stepPlan } from '../src/sim/rankStep';
import { statPanelOf } from '../src/sim/statLines';
import { addUnit, startBattle } from '../src/sim/battle';
import { gradeBoost } from '../src/sim/run';

// The Rank up card's numbers (docs/notes/rankup-scores.md): a plan's "after" is the hero sheet's number at the next rank or awakening step.

test('a plan equals the sheet at the next rank, for every hero', () => {
  for (const kind of ALL_HEROES) {
    for (const [from, to] of [[1, 2], [2, 3], [3, 4], [4, 5], [5, 6]]) {
      const plan = stepPlan(kind, 12, from, to)!;
      const sheet = fightFigures(kind, 12, to);
      assert.deepEqual(plan.hp, [fightFigures(kind, 12, from).hp, sheet.hp], `${kind} ${to} hp`);
      assert.deepEqual(plan.atk, [fightFigures(kind, 12, from).atk, sheet.atk], `${kind} ${to} atk`);
      const panel = statPanelOf(kind, { level: 12, rank: to, grade: 1 })!;
      for (const s of plan.scores) assert.equal(panel.tiles.find((t) => t.ability === s.ability)!.score, s.to, `${kind} ${s.short}`);
    }
  }
});

test('the card figures are the fight\'s own health and attack', () => {
  const kind = 'knight';
  const b = startBattle(1);
  const boost = gradeBoost(1, 4, 12);
  const u = addUnit(b, kind, 0, 0, boost);
  assert.equal(u.maxHp, fightFigures(kind, 12, 4).hp);
});

test('score steps: a rank gives +1 to the two best, an awakening +2 to the primary', () => {
  const kind = 'knight';
  const p = profileOf(kind)!;
  const [first, second] = orderOf(p);
  const rank = stepPlan(kind, 1, 1, 2)!;
  assert.deepEqual(rank.scores.map((s) => [s.ability, s.to - s.from]).sort(), [[first, 1], [second, 1]].sort());
  const awake = stepPlan(kind, 1, 4, 5)!;
  assert.deepEqual(awake.scores.map((s) => [s.ability, s.to - s.from]), [[first, AWAKEN_SCORE]]);
  assert.ok(awake.hp[1] > awake.hp[0] && awake.atk[1] > awake.atk[0]);
});

test('figures are listed only when the step changes them', () => {
  for (const kind of ALL_HEROES) {
    const p = profileOf(kind)!;
    const plan = stepPlan(kind, 12, 1, 2)!;
    const a = derivedOf(p, { level: 12, rank: 1 });
    const b = derivedOf(p, { level: 12, rank: 2 });
    assert.equal(plan.figures.some((f) => f.startsWith('AC')), a.ac !== b.ac, kind);
    assert.equal(plan.figures.some((f) => f.startsWith('To hit')), a.toHit !== b.toHit, kind);
  }
});
