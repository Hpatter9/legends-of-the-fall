// ASSAULT-RESTORM (docs/notes/assault-2.md; the design's Q4 and phase 2): once a week a conquered hold's Warband regroups and can be stormed
// again at Mythic; the week is read from the day key, never the clock; the garrison stands at the Mythic tier; a win pays half a Conquest chest
// and spends the week's re-storm.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { regrouped, RESTORM_TIER, weekOf } from '../src/sim/assault/economy';
import { settleAssault, FOUGHT_MS } from '../src/sim/assault/assaultMode';
import { startedMeta } from '../src/sim/meta';
import { fell, quiet, steps, PARTY } from './assaultKit';

test('the week runs Monday to Sunday, read from the day key', () => {
  // (2026-11-08 is a Sunday, 2026-11-09 a Monday)
  assert.equal(weekOf(20261102), weekOf(20261108));
  assert.equal(weekOf(20261109), weekOf(20261108) + 1);
  assert.equal(weekOf(20270104) - weekOf(20261228), 1, 'over the year');
});

test('only a conquered hold regroups, and once beaten again it waits for the next week', () => {
  const m = startedMeta(5);
  assert.ok(!regrouped(m, 'orcs', 20261108), 'not conquered');
  m.assault = { v: 1, troops: {}, tries: {}, conquered: { orcs: { day: 20261101, tier: 3, wins: 1 } } };
  assert.ok(regrouped(m, 'orcs', 20261103));
  m.assault.conquered.orcs.regrouped = 20261103;
  assert.ok(!regrouped(m, 'orcs', 20261108), 'the same week');
  assert.ok(regrouped(m, 'orcs', 20261109), 'the next');
});

test('the Warband regrouped stands at Mythic, and beating it pays half a Conquest chest and spends the week', () => {
  const legend = quiet();
  const mythic = quiet({ tier: RESTORM_TIER });
  const gate = (b: typeof legend) => b.field!.hold!.forts.find((f) => f.spec.kind === 'southGate')!.maxHp;
  assert.ok(gate(mythic) > gate(legend), 'a stronger hold');
  const m = startedMeta(5);
  m.party = [...PARTY];
  m.assault = { v: 1, troops: {}, tries: {}, conquered: { orcs: { day: 20261101, tier: 3, wins: 1 } } };
  const h = mythic.field!.hold!;
  mythic.t = Math.max(mythic.t, FOUGHT_MS);
  fell(mythic, h.lord);
  steps(mythic, 80);
  assert.equal(h.outcome, 'won');
  const crowns = m.crowns;
  const r = settleAssault(m, mythic, 20261104);
  assert.ok(r.regroup && r.chest && !r.first);
  assert.equal(r.spoils, 0);
  assert.equal(m.crowns, crowns, 'no Spoils the second time');
  const chest = m.stash.find((c) => c.conquest);
  assert.ok(chest?.half && chest.tier === RESTORM_TIER, 'half a Conquest chest, at Mythic');
  assert.equal(m.assault.conquered.orcs.regrouped, 20261104);
  assert.equal(m.assault.conquered.orcs.wins, 2);
  assert.ok(!regrouped(m, 'orcs', 20261108));
});
