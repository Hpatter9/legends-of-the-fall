import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadMeta, saveMeta, startedMeta } from '../src/sim/meta';
import { pickedTactic, pickTactic, readTactics, tacticKey, TACTIC_WORDS } from '../src/sim/tacticPick';
import { TACTICS, TACTICS_LIST } from '../src/sim/tactics';

// The party's tactic as the player picks it (docs/notes/tactics.md, batch 3): kept per army in the army runs and per mode in the others,
// Advance together where none was picked, and read back from a save with anything unknown dropped.

test('a pick is kept by army in the army runs, and by mode in the others; none picked is the default, Advance together', () => {
  assert.equal(tacticKey({ kind: 'army', army: 'ogres' }), 'army:ogres');
  assert.equal(tacticKey({ kind: 'daily', date: 20261104, practice: false }), 'daily');
  assert.equal(tacticKey(undefined), 'classic');
  const m: { tactics?: Record<string, string> } = {};
  assert.equal(pickedTactic(m.tactics, { kind: 'army', army: 'ogres' }), TACTICS.fallback);
  assert.equal(TACTICS.fallback, 'advance');
  pickTactic(m, { kind: 'army', army: 'ogres' }, 'hold');
  pickTactic(m, { kind: 'army', army: 'undead' }, 'charge');
  assert.equal(pickedTactic(m.tactics, { kind: 'army', army: 'ogres', tier: 2 }), 'hold', 'the same army on any tier');
  assert.equal(pickedTactic(m.tactics, { kind: 'army', army: 'undead' }), 'charge');
  assert.equal(pickedTactic(m.tactics, { kind: 'army', army: 'beasts' }), 'advance', 'another army is untouched');
  assert.equal(pickedTactic(m.tactics, { kind: 'calamity' }), 'advance');
});

test('the picks are saved and loaded; an unknown tactic in a save is dropped, and a save from before has none', () => {
  const store: Record<string, string> = {};
  const m = startedMeta(8);
  pickTactic(m, { kind: 'army', army: 'ogres' }, 'hold');
  (m.tactics as Record<string, string>).daily = 'retreat';
  saveMeta(m, { setItem: (k, v) => void (store[k] = v) });
  const back = loadMeta(1, { getItem: (k) => store[k] ?? null });
  assert.deepEqual(back.tactics, { 'army:ogres': 'hold' });
  assert.equal(readTactics(undefined), undefined);
  assert.equal(readTactics({ daily: 7 }), undefined);
  assert.equal(loadMeta(5, { getItem: () => null }).tactics, undefined);
});

test('every tactic has its words for the sheet', () => {
  for (const t of TACTICS_LIST) {
    const w = TACTIC_WORDS[t];
    assert.ok(w.name && w.short && w.line.endsWith('.'), t);
    assert.ok(w.short.length <= 8, `${t}: the chip's word fits beside Auto`);
  }
});
