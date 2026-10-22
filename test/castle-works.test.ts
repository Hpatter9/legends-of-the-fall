import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BUILD_MS, BUILDING_IDS, maxLevel, CHAPEL_MS, clockText, newCastle, readWorks, settleWorks, startBuild, startChapel, worksLeft, type WorksMeta } from '../src/sim/castle';
import { loadMeta, startedMeta } from '../src/sim/meta';

const meta = (crowns = 5000): WorksMeta => ({ crowns, castle: newCastle() });

test('a level is paid at once but stands only when its time is up', () => {
  const m = meta();
  assert.equal(startBuild(m, 'barracks', 1000), true);
  assert.equal(m.crowns, 5000 - 60);
  assert.equal(m.castle.barracks, 0, 'not built yet');
  assert.equal(worksLeft(m, 1000), BUILD_MS[0]);
  assert.equal(settleWorks(m, 1000 + BUILD_MS[0] - 1), null);
  assert.equal(m.castle.barracks, 0);
  assert.equal(settleWorks(m, 1000 + BUILD_MS[0]), 'barracks');
  assert.equal(m.castle.barracks, 1);
  assert.equal(m.works, undefined);
});

test('every level of every building has a build time, and the Barracks and Armoury reach seven levels', () => {
  for (const id of BUILDING_IDS) assert.ok(maxLevel(id) <= BUILD_MS.length, id);
  assert.equal(maxLevel('barracks'), 7);
  assert.equal(maxLevel('armoury'), 7);
  assert.equal(BUILD_MS[5], 8 * 60 * 60_000);
  assert.equal(BUILD_MS[6], 24 * 60 * 60_000);
  const m = meta();
  m.crowns = 1e6;
  m.castle.barracks = 6;
  assert.equal(startBuild(m, 'barracks', 0), true);
  assert.equal(m.works!.doneAt, BUILD_MS[6]);
  settleWorks(m, BUILD_MS[6]);
  assert.equal(m.castle.barracks, 7);
  assert.equal(startBuild(m, 'barracks', 0), false);
});

test('higher tiers take longer', () => {
  for (let i = 1; i < BUILD_MS.length; i++) assert.ok(BUILD_MS[i] > BUILD_MS[i - 1]);
  const m = meta();
  let t = 0;
  for (let level = 1; level <= 3; level++) {
    startBuild(m, 'armoury', t);
    assert.equal(m.works!.doneAt - t, BUILD_MS[level - 1]);
    t = m.works!.doneAt;
    settleWorks(m, t);
  }
  assert.equal(m.castle.armoury, 3);
});

test('one build at a time; nothing is paid while the builders are busy', () => {
  const m = meta();
  startBuild(m, 'treasury', 0);
  const crowns = m.crowns;
  assert.equal(startBuild(m, 'library', 0), false);
  assert.equal(startChapel(m, 0), false);
  assert.equal(m.crowns, crowns);
});

test('the Chapel takes its time too, and the spellbook opens only when it stands', () => {
  const m = meta();
  assert.equal(startChapel(m, 0), true);
  assert.notEqual(m.chapel, true);
  settleWorks(m, CHAPEL_MS);
  assert.equal(m.chapel, true);
});

test('works survive a save and a bad saved value is dropped', () => {
  const m = startedMeta(1);
  m.crowns = 999;
  startBuild(m, 'stable', 5);
  const back = loadMeta(1, { getItem: () => JSON.stringify(m) });
  assert.deepEqual(back.works, m.works);
  assert.equal(readWorks({ id: 'moat', level: 1, doneAt: 1 }), undefined);
  assert.equal(readWorks({ id: 'stable', level: 9, doneAt: 1 }), undefined);
});

test('time left reads as seconds, minutes or hours', () => {
  assert.equal(clockText(45_000), '45s');
  assert.equal(clockText(245_000), '4:05');
  assert.equal(clockText(3_729_000), '1:02:09');
});
