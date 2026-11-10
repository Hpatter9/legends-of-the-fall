// SEVEN-SLOT GEAR batch 6: wounds (`wounds.ts`, `health.ts`). After a won wave the fallen stand again at half (the Ring of Returning's
// wearer whole), those standing are whole; a lost wave leaves everyone whole; the next fight starts each hero at its share; the spire keeps
// its own.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { armyRun, finish, noteFight, recruit, startStage, type Run } from '../src/sim/run';
import { emptyStats } from '../src/sim/equipment';
import { hpShare, setShare } from '../src/sim/health';
import { isOldRisenLine, REVIVE_SHARE, RISEN_HEAD, risenLine } from '../src/sim/wounds';
import { waveNotes } from '../src/sim/waveCard';
import { place, type Battle } from '../src/sim/battle';

function run2(): Run {
  const run = armyRun(4, 'orcs');
  recruit(run, 'knight');
  recruit(run, 'archer');
  run.squad = run.roster.map((h) => h.id);
  return run;
}
/** A settled fight: the given roster ids fell, the phase as given (the units are made by hand: only their tags and life matter). */
function fought(run: Run, fell: number[], phase: 'won' | 'lost', ring: number[] = []): Battle {
  const units = run.roster.map((h) => ({ side: 'hero', tag: h.id, def: h.kind, alive: !fell.includes(h.id), ...(ring.includes(h.id) ? { eq: { ...emptyStats(), powers: [{ id: 'ringReturning', name: 'r', s: 1 }] } } : {}) }));
  return { phase, units, t: 0 } as unknown as Battle;
}

test('after a won wave the fallen stand again at half and the standing are whole; the card says so', () => {
  const run = run2();
  const [a, b] = run.roster;
  noteFight(run, fought(run, [a.id], 'won'));
  assert.equal(hpShare(run, a.id), REVIVE_SHARE);
  assert.equal(hpShare(run, b.id), 1);
  finish(run, true);
  // (FIRST-HOUR 3, the owner's ask: the risen are not among the finds ("Found: Kwame stands again at half" read oddly); the card has a
  // row of its own for them, read from `run.risen`)
  assert.ok(!(run.found ?? []).some((l) => /stands again|half/.test(l)));
  assert.equal(risenLine(run, () => 'Aiko'), 'Aiko, at half health');
  const notes = waveNotes({ ups: [], fell: [], hearts: 0, heartsLeft: 2, found: ['Ember rune I', 'Kwame stands again at half'], risen: risenLine(run, () => 'Aiko') });
  assert.deepEqual(notes.filter((n) => n.kind === 'risen'), [{ kind: 'risen', head: RISEN_HEAD, text: 'Aiko, at half health' }]);
  assert.equal(RISEN_HEAD, 'Back on their feet');
  assert.deepEqual(notes.filter((n) => n.kind === 'found').map((n) => n.text), ['Found Ember rune I'], 'an old save\'s line is left out of the finds');
  assert.ok(isOldRisenLine('Kwame stands again at half') && isOldRisenLine('Kwame stands again at half.') && !isOldRisenLine('Ember rune I'));
  assert.equal(waveNotes({ ups: [], fell: [], hearts: 0, heartsLeft: 2, found: [] }).filter((n) => n.kind === 'risen').length, 0, 'no row when nobody rose');
  // (the next wave: those that stand fall again or not; a hero not fallen this time is whole again)
  noteFight(run, fought(run, [b.id], 'won'));
  assert.equal(hpShare(run, a.id), 1);
  assert.equal(hpShare(run, b.id), 0.5);
});

test('a lost wave leaves everyone whole (the heart is the price); the Ring of Returning brings its wearer back whole', () => {
  const run = run2();
  const [a, b] = run.roster;
  noteFight(run, fought(run, [a.id], 'won'));
  noteFight(run, fought(run, [a.id, b.id], 'lost'));
  assert.equal(hpShare(run, a.id), 1);
  assert.equal(run.wounds, undefined);
  noteFight(run, fought(run, [a.id, b.id], 'won', [b.id]));
  assert.equal(hpShare(run, a.id), 0.5);
  assert.equal(hpShare(run, b.id), 1, 'the ring');
});

test('the next fight starts a wounded hero at its share; the spire keeps its own wounds; a run from before has none', () => {
  const run = run2();
  const [a] = run.roster;
  setShare(run, a.id, 0.5);
  const b = startStage(run);
  let ok = false;
  for (let v = b.board.d - 1; v >= 0 && !ok; v--) for (let u = 0; u < b.board.w && !ok; u++) ok = place(b, a.kind, u, v, a.id, { carry: hpShare(run, a.id) });
  assert.ok(ok);
  const u = b.units.find((x) => x.tag === a.id)!;
  assert.equal(u.hp, Math.round(u.maxHp * 0.5));
  setShare(run, a.id, 1);
  assert.equal(run.wounds?.[String(a.id)], undefined, 'whole is dropped');
  // (the spire: its own record)
  const tower = { ...run2(), tower: { hp: {} } } as unknown as Run;
  noteFight(tower, fought(tower, [tower.roster[0].id], 'won'));
  assert.equal(tower.wounds, undefined);
  // (a run saved before runes finishes on its old rules: whole after every wave)
  const old = run2();
  delete old.runes;
  noteFight(old, fought(old, [old.roster[0].id], 'won'));
  assert.equal(old.wounds, undefined);
});
