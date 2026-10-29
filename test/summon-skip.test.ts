import test from 'node:test';
import assert from 'node:assert/strict';
import { skipAction, summonPlan, SKIP_GUARD_MS } from '../src/render/summonRules';
import type { Pull } from '../src/sim/meta';

// The owner's bug report: a pull that recruits a hero must play its unlock show. A tap on the show (often the second half of a
// double tap on the summon button) used to end it at once, before the hero ever appeared.
const pull = (isNew = true, kind = 'x'): Pull => ({ kind, isNew, shards: isNew ? 0 : 1 });

test('taps in the first moments of a show are let go', () => {
  assert.equal(skipAction(summonPlan([pull(true)]), 0), 'ignore');
  assert.equal(skipAction(summonPlan([pull(true)]), SKIP_GUARD_MS - 1), 'ignore');
  assert.equal(skipAction(summonPlan([pull(false)]), SKIP_GUARD_MS - 1), 'ignore');
});

test('a tap while a new hero is still coming jumps to its reveal, never past it', () => {
  for (const got of [[pull(true)], [pull(false), pull(true), pull(false)], Array.from({ length: 10 }, (_, i) => pull(i === 7))]) {
    for (const reduced of [false, true]) {
      const plan = summonPlan(got, reduced);
      if (plan.revealAt <= SKIP_GUARD_MS) continue;
      assert.equal(skipAction(plan, SKIP_GUARD_MS), 'reveal');
      assert.equal(skipAction(plan, plan.revealAt - 1), 'reveal');
      assert.equal(skipAction(plan, plan.revealAt), 'end');
    }
  }
});

test('a show of repeats ends on a tap', () => {
  const plan = summonPlan([pull(false), pull(false)]);
  assert.equal(skipAction(plan, SKIP_GUARD_MS), 'end');
  assert.equal(skipAction(plan, plan.tl.done - 1), 'end');
});
