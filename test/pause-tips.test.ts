import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ARMIES } from '../src/sim/armies';
import { newMeta, type Meta } from '../src/sim/meta';
import { dueAtWave, dueOnPage, markTutorialSeen, resetTutorials, settleTutorials, tutorialSeen, TUTORIALS, WAVE_CAP } from '../src/tutorialRules';
import { LOOP, loopCure } from '../src/loopRules';

const beat = (m: Meta, n: number): void => {
  for (const a of ARMIES.slice(0, n)) m.armies[a.id] = { best: 15, won: 15, clears: 1, stars: {} };
};
/** A fresh save that has met the tutorials (as a new player's does on its first load). */
const fresh = (): Meta => {
  const m = newMeta(1);
  assert.equal(settleTutorials(m), true);
  return m;
};

describe('PAUSE-TIPS: the unlock tutorials', () => {
  it('every tutorial has an id of its own, two to four short lines and the words of what opens it', () => {
    assert.equal(new Set(TUTORIALS.map((t) => t.id)).size, TUTORIALS.length);
    for (const t of TUTORIALS) {
      assert.ok(t.lines.length >= 2 && t.lines.length <= 4, t.id);
      assert.ok(t.when.length > 0, t.id);
      for (const l of t.lines) assert.ok(l.length <= 160, `${t.id}: ${l}`);
    }
  });

  it('a new save has nothing due at its first wave', () => {
    assert.deepEqual(dueAtWave(fresh()), []);
  });

  it('Auto merge is explained at the first wave after the second army falls', () => {
    const m = fresh();
    beat(m, 1);
    for (const id of dueAtWave(m)) markTutorialSeen(m, id);
    while (dueAtWave(m).length) for (const id of dueAtWave(m)) markTutorialSeen(m, id);
    assert.ok(!dueAtWave(m).includes('autoMerge'));
    beat(m, 2);
    assert.ok(dueAtWave(m).includes('autoMerge'));
  });

  it('at most two hold a wave; the rest wait, in order, for the next waves', () => {
    const m = fresh();
    beat(m, 4);
    const all = TUTORIALS.filter((t) => t.at === 'wave' && t.open(m)).map((t) => t.id);
    assert.ok(all.length > WAVE_CAP);
    assert.equal(WAVE_CAP, 2);
    const shown: string[] = [];
    for (let wave = 0; wave < 20 && dueAtWave(m).length; wave++) {
      const due = dueAtWave(m);
      assert.ok(due.length <= WAVE_CAP);
      for (const id of due) {
        shown.push(id);
        markTutorialSeen(m, id);
      }
    }
    assert.deepEqual(shown, all);
  });

  it('each is shown once a save, and the page ones wait for their page', () => {
    const m = fresh();
    assert.deepEqual(dueOnPage(m, 'tavern'), ['tavern']);
    markTutorialSeen(m, 'tavern');
    markTutorialSeen(m, 'tavern');
    assert.deepEqual(m.tutorials, ['tavern']);
    assert.deepEqual(dueOnPage(m, 'tavern'), []);
    assert.ok(!dueAtWave(m).includes('tavern'));
    assert.deepEqual(dueOnPage(m, 'council'), []);
  });

  it('Show tips again makes every one due again', () => {
    const m = fresh();
    beat(m, 2);
    for (const id of dueAtWave(m)) markTutorialSeen(m, id);
    resetTutorials(m);
    assert.equal(tutorialSeen(m, 'pause'), false);
    assert.equal(dueAtWave(m)[0], 'pause');
  });

  it("a veteran's first load marks what it already has open as seen, but for the newer ones", () => {
    const m = newMeta(1);
    beat(m, 4);
    delete m.tutorials;
    assert.equal(settleTutorials(m), true);
    assert.ok(tutorialSeen(m, 'autoMerge'));
    assert.ok(tutorialSeen(m, 'autoPlace'));
    assert.ok(tutorialSeen(m, 'tavern'));
    assert.ok(!tutorialSeen(m, 'pause'));
    assert.ok(!tutorialSeen(m, 'traitPerks'));
    assert.deepEqual(dueAtWave(m), ['pause', 'traitPerks']);
    // (what opens later is still explained in its turn)
    assert.ok(!tutorialSeen(m, 'ultimates'));
    // (settled once: a second load changes nothing)
    assert.equal(settleTutorials(m), false);
  });
});

describe('PAUSE-TIPS: a paused fight and the loop watch', () => {
  const base = { running: true, hidden: false, sinceFrame: 0, faults: 0, restarts: 0, rebuilt: false };
  it('a paused fight is never loaded again, however long its loop has stood', () => {
    assert.equal(loopCure({ ...base, sinceFrame: LOOP.STALL_MS * 10, restarts: LOOP.RESTARTS + 5 }), 'reload');
    assert.equal(loopCure({ ...base, paused: true, sinceFrame: LOOP.STALL_MS * 10, restarts: LOOP.RESTARTS + 5 }), 'restart');
    assert.equal(loopCure({ ...base, paused: true, faults: LOOP.FAULTS, rebuilt: true }), 'none');
    assert.equal(loopCure({ ...base, paused: true, faults: LOOP.FAULTS }), 'rebuild');
  });
  it('a paused fight whose picture turns is left alone', () => {
    assert.equal(loopCure({ ...base, paused: true, sinceFrame: 100 }), 'none');
  });
});
