// ONE-OF-EACH (`docs/notes/one-of-each.md`): the owner's rule, one unit of a hero on the battlefield at a time. A second hero of a kind is
// refused on the field (`placeBlock` says 'twin') and in the squad (`canJoin`); a placed hero still moves; a bench copy merges into its
// fielded twin as before, or swaps in on its tile; the greedy player and auto-place field one of each; an older save with two of a kind
// fielded loads and sends the extra copy back to the bench at the next deploy.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addUnit, canPlace, fight, place, placeBlock, playOut, twinOf, unplace, type Battle } from '../src/sim/battle';
import { autoDeploy, autoRound, deployTiles, oneOfEach, pickSquad } from '../src/sim/autoplay';
import { canMerge, merge } from '../src/sim/merge';
import { armyRun, canJoin, finish, heroOf, isBossRun, loadRun, newRun, noteFight, saveRun, setSquad, startStage, type Owned, type Run } from '../src/sim/run';
import { canSwapTwin, swapTwin } from '../src/sim/oneEach';
import { startedMeta } from '../src/sim/meta';
import { pickEight } from '../src/sim/stand';
import { ratingOf } from '../src/sim/stars';
import { HEROES } from '../src/sim/units';

/** A run whose roster is exactly `heroes` (kind and grade), ids 1, 2, ... in order, none in the squad. */
function rosterOf(heroes: [string, number][]): Run {
  const r = newRun(1);
  r.roster = heroes.map(([kind, grade], i): Owned => ({ id: i + 1, kind, grade }));
  r.nextId = heroes.length + 1;
  r.squad = [];
  return r;
}

/** A deploy board for the run and two free deploy tiles on it. */
function deploy(r: Run): { b: Battle; t: [number, number][] } {
  const b = startStage(r);
  return { b, t: deployTiles(b.board).filter(([u, v]) => canPlace(b, 'knight', u, v, 999)) };
}

const fielded = (b: Battle) => b.units.filter((u) => u.side === 'hero' && u.tag !== undefined).map((u) => u.def);

test('a second hero of a kind is refused on the field with the reason "twin"; another kind is not', () => {
  const r = rosterOf([['knight', 1], ['knight', 2], ['archer', 1]]);
  const { b, t } = deploy(r);
  assert.ok(place(b, 'knight', ...t[0], 1));
  assert.equal(placeBlock(b, 'knight', ...t[1], 2), 'twin');
  assert.equal(canPlace(b, 'knight', ...t[1], 2), false);
  assert.equal(place(b, 'knight', ...t[1], 2), false);
  assert.deepEqual(fielded(b), ['knight']);
  assert.equal(twinOf(b, 'knight', 2)?.tag, 1);
  assert.ok(place(b, 'archer', ...t[1], 3));
  // (the other reasons are as they were: a taken tile, a tile off the rows)
  assert.equal(placeBlock(b, 'knight', ...t[1], 2), 'taken');
  assert.equal(placeBlock(b, 'samurai', 0, 0, 9), 'tile');
});

test('a placed hero still moves to another tile; taken back, its copy may go on', () => {
  const r = rosterOf([['knight', 1], ['knight', 1]]);
  const { b, t } = deploy(r);
  assert.ok(place(b, 'knight', ...t[0], 1));
  assert.ok(place(b, 'knight', ...t[2], 1));
  const k = b.units.find((u) => u.tag === 1)!;
  assert.deepEqual([k.u, k.v], t[2]);
  assert.ok(unplace(b, 'knight', 1));
  assert.ok(place(b, 'knight', ...t[0], 2));
  assert.deepEqual(fielded(b), ['knight']);
});

test('summons, a skill\'s called units and the fallen are not twins', () => {
  const r = rosterOf([['knight', 1], ['knight', 1]]);
  const { b, t } = deploy(r);
  // (a unit a skill called up, of a hero's kind, has an owner)
  addUnit(b, 'knight', ...t[3], {}, 50).owner = 77;
  assert.ok(place(b, 'knight', ...t[0], 1));
  // (summon kinds are never twins)
  assert.ok(place(b, 'wolf', ...t[1], 60));
  assert.ok(place(b, 'wolf', ...t[2], 61));
  // (a fallen hero does not hold its kind's place)
  b.units.find((u) => u.tag === 1)!.alive = false;
  assert.equal(twinOf(b, 'knight', 2), undefined);
});

test('a bench copy merges into its fielded twin as before', () => {
  const r = rosterOf([['knight', 1], ['knight', 1]]);
  r.squad = [1];
  const { b, t } = deploy(r);
  place(b, 'knight', ...t[0], 1);
  assert.ok(canMerge(r, 2, 1));
  const m = merge(r, 2, 1)!;
  assert.deepEqual(m, { id: 1, kind: 'knight', grade: 2, gone: 2 });
  assert.deepEqual(r.squad, [1]);
});

test('a bench copy put on its twin\'s tile swaps in: the twin goes back to the bench', () => {
  const r = rosterOf([['knight', 1], ['knight', 2], ['archer', 1]]);
  r.squad = [3, 1];
  const { b, t } = deploy(r);
  place(b, 'archer', ...t[1], 3);
  place(b, 'knight', ...t[0], 1);
  assert.ok(canSwapTwin(b, r, 2));
  assert.equal(canSwapTwin(b, r, 3), false);
  assert.equal(swapTwin(b, r, 2), 1);
  assert.deepEqual(r.squad, [3, 2]);
  const k = b.units.find((u) => u.def === 'knight')!;
  assert.equal(k.tag, 2);
  assert.deepEqual([k.u, k.v], t[0]);
  assert.deepEqual(fielded(b).sort(), ['archer', 'knight']);
  // (with no twin on the field there is nothing to swap)
  unplace(b, 'knight', 2);
  assert.equal(swapTwin(b, r, 1), null);
});

test('the squad takes one of each kind: setSquad and canJoin refuse a second', () => {
  const r = rosterOf([['knight', 1], ['knight', 1], ['archer', 1]]);
  assert.ok(setSquad(r, 1, true));
  assert.equal(canJoin(r, 2), false);
  assert.equal(setSquad(r, 2, true), false);
  assert.ok(setSquad(r, 3, true));
  assert.deepEqual(r.squad, [1, 3]);
  // (released, its copy may join)
  assert.ok(setSquad(r, 1, false));
  assert.ok(setSquad(r, 2, true));
});

test('the greedy player picks one of each, the strongest copy first, and auto-place fields them', () => {
  const r = rosterOf([['knight', 1], ['knight', 2], ['archer', 1], ['archer', 1], ['cleric', 1], ['paladin', 1], ['warlock', 1], ['samurai', 1]]);
  const meta = startedMeta(3);
  const squad = pickSquad(r, meta);
  assert.equal(squad.length, 5);
  assert.equal(new Set(squad.map((h) => h.kind)).size, 5);
  assert.ok(squad.some((h) => h.id === 2), 'the grade-2 knight is the one taken');
  // (kept heroes come first, a kept second of a kind is dropped)
  assert.deepEqual(pickSquad(r, meta, [1, 2]).filter((h) => h.kind === 'knight').map((h) => h.id), [1]);
  r.squad = squad.map((h) => h.id);
  const b = startStage(r);
  autoDeploy(b, r, meta);
  assert.equal(new Set(fielded(b)).size, fielded(b).length);
  assert.deepEqual(oneOfEach([{ kind: 'a' }, { kind: 'b' }, { kind: 'a' }]), [{ kind: 'a' }, { kind: 'b' }]);
});

test('a roster of fewer kinds than the squad fields only one of each', () => {
  const r = rosterOf([['knight', 1], ['knight', 1], ['knight', 1], ['archer', 1], ['archer', 1]]);
  const squad = pickSquad(r, startedMeta(1));
  assert.deepEqual(squad.map((h) => h.kind).sort(), ['archer', 'knight']);
});

test('an older save with two of a kind fielded loads, and the extra copy goes back to the bench at the next deploy', () => {
  const r = rosterOf([['knight', 1], ['knight', 1], ['archer', 1]]);
  r.squad = [1, 2, 3];
  const store = new Map<string, string>();
  saveRun(r, { setItem: (k, v) => void store.set(k, v) });
  const loaded = loadRun({ getItem: (k) => store.get(k) ?? null })!;
  assert.deepEqual(loaded.squad, [1, 2, 3]);
  const b = startStage(loaded);
  autoDeploy(b, loaded, startedMeta(1));
  assert.deepEqual(fielded(b).sort(), ['archer', 'knight']);
  assert.deepEqual(loaded.squad, [1, 3]);
  assert.ok(heroOf(loaded, 2), 'the copy is still owned, on the bench');
});

test('an army played by the greedy player never fields two of a kind', () => {
  const meta = startedMeta(5);
  const run = armyRun(41, 'orcs', HEROES);
  for (let wave = 0; wave < 6 && !run.over; wave++) {
    autoRound(run, meta);
    assert.equal(new Set(run.squad.map((id) => heroOf(run, id)!.kind)).size, run.squad.length);
    const b = startStage(run);
    autoDeploy(b, run, meta);
    const defs = fielded(b);
    assert.equal(new Set(defs).size, defs.length);
    fight(b);
    playOut(b);
    noteFight(run, b);
    finish(run, b.phase === 'won', ratingOf(b, isBossRun(run)).stars);
  }
});

test('the Last Stand\'s eight are one of each', () => {
  const m = startedMeta(2);
  const eight = pickEight(m, ['knight', 'knight', ...m.unlocked]);
  assert.equal(new Set(eight).size, eight.length);
});
