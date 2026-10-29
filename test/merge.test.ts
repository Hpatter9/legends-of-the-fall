// MERGE-TWO (`docs/notes/merge-two.md`): two heroes of the same kind and grade merge into one of the next grade, up to grade 4, only when
// the player merges them (by hand, or the Auto merge button); hires never merge on their own, and a full bench refuses a hire.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { autoMerge, canMerge, merge, mergeMatches, mergeReady } from '../src/sim/merge';
import { benchFull, GRADE_BOOST, gradeMult, heroOf, hireBlock, loadRun, MAX_GRADE, newRun, paidOf, saveRun, summon, SUMMON_BASE, type Owned, type Run } from '../src/sim/run';
import { autoRound } from '../src/sim/autoplay';
import { startedMeta } from '../src/sim/meta';
import { makeGear } from '../src/sim/gear';

/** A run whose roster is exactly `heroes` (kind and grade), ids 1, 2, ... in order, none in the squad. */
function rosterOf(heroes: [string, number][]): Run {
  const r = newRun(1);
  r.roster = heroes.map(([kind, grade], i): Owned => ({ id: i + 1, kind, grade }));
  r.nextId = heroes.length + 1;
  r.squad = [];
  return r;
}

test('two of a kind and grade merge into one of the next grade: the target keeps its id, place and gear, the gold paid adds up', () => {
  const r = rosterOf([['knight', 1], ['knight', 1], ['archer', 1]]);
  r.roster[0].paid = 30;
  r.roster[1].paid = 35;
  r.squad = [2, 3];
  r.items = [makeGear(7, 'weapon', 1), makeGear(8, 'armour', 1)];
  r.roster[0].gear = { weapon: r.items.shift()! };
  r.roster[1].gear = { armour: r.items.shift()! };
  const m = merge(r, 1, 2)!;
  assert.deepEqual(m, { id: 2, kind: 'knight', grade: 2, gone: 1 });
  assert.equal(heroOf(r, 1), undefined);
  assert.equal(heroOf(r, 2)!.grade, 2);
  assert.equal(paidOf(heroOf(r, 2)!), 65);
  assert.deepEqual(r.squad, [2, 3]);
  // (the merged-away hero's gear goes back to the pack; the target keeps what it wears)
  assert.deepEqual(r.items!.map((g) => g.id), [7]);
  assert.equal(heroOf(r, 2)!.gear?.armour?.id, 8);
});

test('a run that levels its own heroes keeps the higher XP of the two', () => {
  const r = rosterOf([['knight', 1], ['knight', 1]]);
  r.local = true;
  r.roster[0].xp = 400;
  r.roster[1].xp = 90;
  merge(r, 1, 2);
  assert.equal(heroOf(r, 2)!.xp, 400);
});

test('mismatched kinds or grades, the same hero twice, an unknown hero, the top grade and an ended run are refused, and nothing changes', () => {
  const r = rosterOf([['knight', 1], ['archer', 1], ['knight', 2], ['knight', 4], ['knight', 4]]);
  const before = JSON.stringify(r);
  assert.equal(canMerge(r, 1, 2), false);
  assert.equal(canMerge(r, 1, 3), false);
  assert.equal(canMerge(r, 1, 1), false);
  assert.equal(canMerge(r, 1, 99), false);
  assert.equal(canMerge(r, 4, 5), false);
  assert.equal(merge(r, 1, 2), null);
  assert.equal(merge(r, 4, 5), null);
  assert.equal(JSON.stringify(r), before);
  const over = rosterOf([['knight', 1], ['knight', 1]]);
  over.over = true;
  assert.equal(merge(over, 1, 2), null);
  // (a cursed mirror's clone is a guest: it never merges)
  const clone = rosterOf([['knight', 1], ['knight', 1]]);
  clone.roster[0].cloneFloors = 2;
  assert.equal(canMerge(clone, 1, 2), false);
});

test('a hire never merges on its own', () => {
  const r = newRun(9, ['knight']);
  r.gold = 100000;
  for (let i = 0; i < 6; i++) assert.ok(summon(r));
  assert.equal(r.roster.length, 8);
  assert.ok(r.roster.every((h) => h.kind === 'knight' && h.grade <= 2));
  assert.ok(mergeReady(r).length >= 1);
});

test('Auto merge cascades up to grade 4 and stops there, lowest grades first', () => {
  const r = rosterOf(Array.from({ length: 17 }, (): [string, number] => ['knight', 1]));
  const done = autoMerge(r);
  // (16 grade-1 knights make two grade 4s: 8 + 4 + 2 merges; the 17th waits alone)
  assert.equal(done.length, 14);
  assert.deepEqual(r.roster.map((h) => h.grade).sort(), [1, 4, 4]);
  assert.ok(r.roster.every((h) => h.grade <= MAX_GRADE));
  // (two grade 4s are at the top: no pair is ready, and a second tap does nothing)
  assert.deepEqual(mergeReady(r), []);
  assert.deepEqual(autoMerge(r), []);
  // (the order: every grade-1 pair before the grade-2 pairs they make)
  const grades = done.map((m) => m.grade);
  assert.deepEqual(grades, [...grades].sort((a, b) => a - b));
});

test('the pairs ready: each hero in one pair at most, the oldest first, a fielded hero kept as the target', () => {
  const r = rosterOf([['knight', 1], ['archer', 1], ['knight', 1], ['knight', 1], ['archer', 2], ['archer', 1]]);
  r.squad = [3];
  // (the knights 1 and 3 pair, 3 is fielded so 1 merges into it; 4 waits; the archers 2 and 6 pair; the grade-2 archer has none)
  assert.deepEqual(mergeReady(r), [[1, 3], [6, 2]]);
  assert.deepEqual([...mergeMatches(r)].sort((a, b) => a - b), [1, 2, 3, 6]);
});

test('a full bench refuses a hire until a pair is merged', () => {
  const r = newRun(4, ['knight']);
  r.gold = 100000;
  while (summon(r));
  assert.ok(benchFull(r));
  assert.equal(hireBlock(r), 'bench');
  autoMerge(r);
  assert.equal(benchFull(r), false);
  assert.equal(hireBlock(r), null);
});

test('an older save with three of a kind left over loads, and shows them as a pair to merge', () => {
  const store: Record<string, string> = {};
  const old = rosterOf([['knight', 1], ['knight', 1], ['knight', 1], ['archer', 3]]);
  saveRun(old, { setItem: (k, v) => void (store[k] = v) });
  const r = loadRun({ getItem: (k) => store[k] ?? null })!;
  assert.ok(r);
  assert.deepEqual(mergeReady(r), [[2, 1]]);
  // (a hero with no record of its gold is taken to hold a base price for each grade-1 hero: two a grade now)
  assert.equal(paidOf(heroOf(r, 4)!), SUMMON_BASE * 4);
  autoMerge(r);
  assert.deepEqual(r.roster.map((h) => `${h.kind}${h.grade}`).sort(), ['archer3', 'knight1', 'knight2']);
});

test('the greedy player merges as the Auto merge button does: no pair is left after a round', () => {
  const r = newRun(6);
  r.gold = 2000;
  autoRound(r, startedMeta(1));
  assert.deepEqual(mergeReady(r), []);
  assert.ok(r.roster.some((h) => h.grade > 1));
});

test('each grade is stronger than the last, and rank 4 is the biggest step', () => {
  assert.equal(GRADE_BOOST.length, MAX_GRADE);
  assert.equal(gradeMult(1), 1);
  for (let g = 2; g <= MAX_GRADE; g++) assert.ok(gradeMult(g) > gradeMult(g - 1));
  const steps = [2, 3, 4].map((g) => gradeMult(g) / gradeMult(g - 1));
  assert.ok(steps[2] > steps[0] && steps[2] > steps[1]);
});
