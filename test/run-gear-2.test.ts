// RUN-GEAR-2 (docs/notes/run-gear-2.md): the pack line on the wave card, the stash count and "full" check, and the auto-replay recap's finds.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { STASH_MAX, grantEquipment, stashCount, stashFull } from '../src/sim/equipment';
import { waveNotes } from '../src/sim/waveCard';
import { FINDS_KEPT, afterFight, startAuto } from '../src/sim/autoReplay';
import { startedMeta } from '../src/sim/meta';

const quiet = { ups: [], fell: [], hearts: 0, heartsLeft: 0, found: [] };

describe('the wave card pack line', () => {
  it('says one find waits, or how many', () => {
    assert.deepEqual(waveNotes({ ...quiet, waiting: 1 }).map((n) => n.text), ['A find waits in the pack']);
    assert.deepEqual(waveNotes({ ...quiet, waiting: 3 })[0], { kind: 'pack', text: '3 finds wait in the pack' });
  });
  it('says nothing when none wait', () => {
    assert.deepEqual(waveNotes({ ...quiet }), []);
    assert.deepEqual(waveNotes({ ...quiet, waiting: 0 }), []);
  });
});

describe('the stash count and the full check', () => {
  it('counts spare pieces against the cap and is full at it', () => {
    const m = startedMeta(1);
    const n0 = m.equipment?.length ?? 0;
    assert.equal(stashCount(m), `${n0} / ${STASH_MAX}`);
    assert.equal(stashFull(m), false);
    while ((m.equipment?.length ?? 0) < STASH_MAX) grantEquipment(m, { base: 'ironRing', rarity: 1, level: 1 });
    assert.equal(stashCount(m), `${STASH_MAX} / ${STASH_MAX}`);
    assert.equal(stashFull(m), true);
  });
});

describe('the auto-replay recap finds', () => {
  const piece = (id: number) => ({ id, base: 'ironRing', rarity: 1 as const, level: 1 });
  it('collects the pieces of every run, capped', () => {
    const m = startedMeta(1);
    const a = startAuto(m, 'orcs', 0, 1);
    const t = a ?? { army: 'orcs', tier: 0, count: 3, run: 1, totals: { runs: 0, crowns: 0, xp: 0, chests: 0, gear: 0 } };
    afterFight(t, { won: true, cleared: true, wave: 5, crowns: 1, xp: 1, finds: [piece(1), piece(2)] });
    assert.deepEqual(t.totals.finds?.map((p) => p.id), [1, 2]);
    afterFight(t, { won: true, cleared: true, wave: 5, crowns: 1, xp: 1, finds: Array.from({ length: FINDS_KEPT }, (_, i) => piece(10 + i)) });
    assert.equal(t.totals.finds?.length, FINDS_KEPT);
  });
});
