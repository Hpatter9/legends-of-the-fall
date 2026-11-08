import { test } from 'node:test';
import { readdirSync, readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { ROOMS, roomOpen, roomReachable, roomsOf, roomsOpenedAt, roomToast } from '../src/sim/rooms';
import { BUILDING_IDS, CHAPEL_COSTS, ROOM_BUILDING_IDS, buildMs, chapelLevel, newCastle, readCastle, readWorks, settleWorks, siteLevel, siteTop, startChapel, startSite, type WorksMeta } from '../src/sim/castle';
import { loadMeta, newMeta } from '../src/sim/meta';

const store = (v: unknown) => ({ getItem: () => JSON.stringify(v) });

test('every room names a real building and a level it can reach, and ids are unique', () => {
  const sites = new Set<string>([...BUILDING_IDS, ...ROOM_BUILDING_IDS, 'chapel']);
  for (const r of ROOMS) {
    assert.ok(sites.has(r.building), r.id);
    assert.ok(roomReachable(r), r.id);
    assert.ok(r.name && r.line, r.id);
  }
  assert.equal(new Set(ROOMS.map((r) => r.id)).size, ROOMS.length);
  // (the Treasury and Stable have no room in the first pass)
  assert.equal(roomsOf('treasury').length, 0);
  assert.equal(roomsOf('stable').length, 0);
  assert.equal(roomsOf('hall').length, 4);
});

test('a room opens at its level and not before', () => {
  for (const r of ROOMS) {
    const c = newCastle();
    for (let lv = 0; lv <= siteTop(r.building); lv++) {
      c[r.building] = lv;
      assert.equal(roomOpen(c, r.id), lv >= r.level, `${r.id} at ${lv}`);
    }
  }
  assert.equal(roomOpen(undefined, 'vigil'), false);
});

test('the Chapel flag of an old save counts as Chapel level 1 for its rooms', () => {
  const c = newCastle();
  assert.equal(siteLevel(c, 'chapel', true), 1);
  assert.equal(roomOpen(c, 'vigil', true), false);
  c.chapel = 2;
  assert.equal(roomOpen(c, 'vigil'), true);
  assert.equal(roomOpen(c, 'lastRites'), false);
});

test('a save from before loads with the Chapel at level 1 and the new buildings at 0', () => {
  const m0 = newMeta(1) as unknown as Record<string, unknown>;
  const castle = { treasury: 1, barracks: 2, armoury: 0, mageTower: 0, stable: 0, library: 0 };
  const m = loadMeta(1, store({ ...m0, castle, chapel: true }));
  assert.equal(chapelLevel(m), 1);
  assert.equal(m.castle.chapel, 1);
  for (const id of ROOM_BUILDING_IDS) assert.equal(siteLevel(m.castle, id), 0);
  assert.equal(m.castle.barracks, 2);
  // (a castle from before reads with no new keys at all, so tools and runs that copy it see what they did)
  assert.deepEqual(Object.keys(readCastle(castle)).sort(), Object.keys(castle).sort());
  // (and a castle written with a Chapel level keeps the flag the spellbook reads)
  const m2 = loadMeta(1, store({ ...m0, castle: { ...castle, chapel: 2, smithy: 9 }, chapel: false }));
  assert.equal(m2.chapel, true);
  assert.equal(m2.castle.chapel, 2);
  assert.equal(m2.castle.smithy, siteTop('smithy'), 'a too-high level is the top');
});

test('the builders raise a room building and the Chapel level by level', () => {
  const m: WorksMeta = { crowns: 10_000, castle: newCastle() };
  assert.equal(startSite(m, 'smithy', 0), true);
  assert.equal(startSite(m, 'watchtower', 0), false, 'one job at a time');
  assert.deepEqual(readWorks(m.works), m.works, 'a room building\'s works survive a save');
  assert.equal(settleWorks(m, buildMs('smithy', 1)), 'smithy');
  assert.equal(m.castle.smithy, 1);
  assert.equal(roomOpen(m.castle, 'fieldAnvil'), true);
  // (the Chapel: level 1 is the old purchase and sets the flag; then levels 2 and 3)
  for (let lv = 1; lv <= CHAPEL_COSTS.length; lv++) {
    const before = m.crowns;
    assert.equal(startChapel(m, 0), true);
    assert.equal(before - m.crowns, CHAPEL_COSTS[lv - 1]);
    settleWorks(m, 1e12);
    assert.equal(chapelLevel(m), lv);
    assert.equal(m.chapel, true);
  }
  assert.equal(startChapel(m, 0), false, 'the top');
  assert.equal(buildMs('chapel', 1), buildMs('barracks', 2), 'the first Chapel level takes as long as before');
});

test('a raised level names the rooms it opened', () => {
  assert.deepEqual(roomsOpenedAt('library', 2).map((r) => r.id), ['readingRoom']);
  assert.equal(roomToast(roomsOpenedAt('smithy', 1)[0]), "The Smithy's Field Anvil is open");
});

test('every room has its own icon picture in src/art/rooms, and every picture there is a room\'s icon (INT-330)', () => {
  const files = readdirSync('src/art/rooms').filter((f) => f.endsWith('.webp')).map((f) => f.slice(0, -5));
  assert.deepEqual([...new Set(ROOMS.map((r) => r.icon))].sort(), files.sort());
  const src = readFileSync('src/roomIcons.ts', 'utf8');
  for (const f of files) assert.ok(src.includes(`'./art/rooms/${f}.webp'`), `${f} is bundled by roomIcons.ts`);
});
