// MARCH-STAYS (docs/notes/march-stays.md): the party never leaves the stage between two waves until the next fight's fighters are
// made, and a board is never taken down before the one that takes its place is ready.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BUILD_ORDER, fightersTakeOver, filmFaults, hostOnShow, marcherAfter, marcherDrawn, stageAfter, standFacing, type BuildStep, type Marcher, type MarchEvent } from '../src/render/marchStayRules';
import { turnDir, type Rot } from '../src/sim/turn';

const EVENTS: MarchEvent[] = ['arrived', 'cut', 'built', 'synced', 'fighters'];

test('a marcher leaves the stage for one reason only: the next fight\'s fighters are made', () => {
  for (const at of ['walking', 'standing'] as Marcher[])
    for (const ev of EVENTS) {
      const next = marcherAfter(at, ev);
      assert.equal(next === 'gone', ev === 'fighters', `${at} + ${ev}`);
      assert.equal(marcherDrawn(next), ev !== 'fighters');
    }
  // (the walk's end, or a walk cut short, stands the hero where it was going)
  assert.equal(marcherAfter('walking', 'arrived'), 'standing');
  assert.equal(marcherAfter('walking', 'cut'), 'standing');
  // (a board built under the party, or the road laid again, changes nothing: the next board's build, the loop watch's cure)
  assert.equal(marcherAfter('walking', 'built'), 'walking');
  assert.equal(marcherAfter('standing', 'built'), 'standing');
  assert.equal(marcherAfter('standing', 'synced'), 'standing');
  // (gone is gone)
  for (const ev of EVENTS) assert.equal(marcherAfter('gone', ev), 'gone');
});

test('however long the next board takes, and whatever happens meanwhile, the party is drawn until the fighters are made', () => {
  // (every order of the things that can happen between the walk's end and the deploy, up to five of them)
  const others: MarchEvent[] = ['arrived', 'cut', 'built', 'synced'];
  const walk = (at: Marcher, left: number): void => {
    assert.ok(marcherDrawn(at));
    if (!left) return;
    for (const ev of others) walk(marcherAfter(at, ev), left - 1);
  };
  walk('walking', 5);
});

test('only the next fight\'s fighters take over: the finished fight\'s, made again by the loop watch, do not', () => {
  const old = { id: 'the fight marched from' };
  const next = { id: 'the next fight' };
  assert.equal(fightersTakeOver(old, old), false);
  assert.equal(fightersTakeOver(old, next), true);
  // (no march: nothing stands, nothing to keep)
  assert.equal(fightersTakeOver(null, next), true);
  assert.equal(fightersTakeOver(undefined, next), true);
});

test('between two waves the host on show is the section marched to, not the finished fight\'s board', () => {
  assert.equal(hostOnShow({ marched: true, hasNext: true }), 'next section');
  assert.equal(hostOnShow({ marched: false, hasNext: true }), 'the battle');
  assert.equal(hostOnShow({ marched: true, hasNext: false }), 'the battle');
});

test('a board\'s build never leaves the field empty: the new is made before the old is taken down', () => {
  assert.deepEqual([...BUILD_ORDER], ['make the new', 'take the old down', 'put the new up']);
  // (a fault after any number of the steps, in the rule's order: only between the last two is there nothing, and they are two
  // plain lines of the same frame with nothing between that can fault)
  const done: BuildStep[] = [];
  assert.equal(stageAfter(done), 'old');
  done.push(BUILD_ORDER[0]);
  assert.equal(stageAfter(done), 'old', 'a fault while making, or just after: the old picture stands');
  done.push(BUILD_ORDER[1], BUILD_ORDER[2]);
  assert.equal(stageAfter(done), 'new');
  // (the order it had: taken down first, so a fault while making left nothing)
  assert.equal(stageAfter(['take the old down']), 'nothing');
});

test('the board view makes the new columns before it takes the old picture down, and the march ends without taking the walkers off', () => {
  const view = readFileSync('src/render/boardView.ts', 'utf8');
  const build = view.slice(view.indexOf('  build(b: Board'), view.indexOf('  /** A Calamity zone\'s air'));
  const make = build.indexOf('this.section(');
  const down = build.indexOf('removeChildren()');
  const up = build.indexOf('this.root.addChild(...this.built.tiles)');
  assert.ok(make > 0 && down > make && up > down, 'make, take down, put up');
  const chain = readFileSync('src/render/chainView.ts', 'utf8');
  const finish = chain.slice(chain.indexOf('  finish(): void {'));
  assert.ok(!/sprite\.root\.destroy/.test(finish), 'the march\'s end destroys no walker');
  const release = chain.slice(chain.indexOf('  release(): void {'), chain.indexOf('  /** The move is over'));
  assert.ok(/marcherAfter\(m\.at, 'fighters'\)/.test(release) && /sprite\.root\.destroy/.test(release), 'only the release does');
  // (and the page lets them go only from where the fighters are made)
  const main = readFileSync('src/main.ts', 'utf8');
  assert.equal(main.split('this.chain.release()').length - 1, 1);
  const sync = main.slice(main.indexOf('  private syncSprites(all = false): void {'), main.indexOf('/* -------------------------------------------------------------- the camera */'));
  assert.ok(sync.includes('this.chain.release()') && sync.indexOf('new UnitSprite(') < sync.indexOf('this.chain.release()'), 'after the fighters are made');
});

test('a stander faces as the deploy\'s fighter will, whichever way the section lies', () => {
  const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  for (const rot of [0, 1, 2, 3] as Rot[]) {
    const f = standFacing(rot);
    // (a hero is set down facing the far edge: the sim's facing 3, through the section's turn)
    assert.deepEqual(DIRS[f], turnDir(rot, DIRS[3][0], DIRS[3][1]).map((x) => x + 0));
  }
  assert.equal(standFacing(0), 3);
});

test('the film\'s measure: a picture short of a marcher, short of a settled tile, or with a tile in the air again, is counted', () => {
  const ok = { heroes: 5, tiles: 88, shown: 88, lifted: 0, settled: true };
  assert.deepEqual(filmFaults([ok, ok, ok], 5), { heroGaps: 0, tileGaps: 0, refalls: 0 });
  // (the fault the owner saw: the walk over, nobody drawn until the deploy)
  assert.deepEqual(filmFaults([ok, { ...ok, heroes: 0 }, { ...ok, heroes: 0 }, ok], 5), { heroGaps: 2, tileGaps: 0, refalls: 0 });
  // (tiles still falling before the section has settled are the march, not a fault)
  assert.deepEqual(filmFaults([{ heroes: 5, tiles: 88, shown: 40, lifted: 48, settled: false }], 5), { heroGaps: 0, tileGaps: 0, refalls: 0 });
  // (an empty field, a tile missing and a second fall, once it has settled, are)
  assert.deepEqual(filmFaults([{ ...ok, tiles: 0, shown: 0 }, { ...ok, shown: 87 }, { ...ok, lifted: 3 }], 5), { heroGaps: 0, tileGaps: 2, refalls: 1 });
});
