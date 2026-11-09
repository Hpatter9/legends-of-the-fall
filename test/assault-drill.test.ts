// ASSAULT-DRILL (docs/notes/assault-3.md; the design's 6.3, phase 3, its "Barracks" named the Drill Yard): a castle building of two levels,
// built like the other room buildings, whose rooms raise the rank the Assault's new recruits join at: Blooded at its first level, Veterans
// at its second. The old Barracks (+6% hp for every hero) is untouched, and a castle saved before the Drill Yard reads as it did.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buyRecruit, recruitMarks, troopsOf } from '../src/sim/assault/economy';
import { rankOf } from '../src/sim/assault/troops';
import { BUILDINGS, buildMs, heroBoost, readCastle, ROOM_BUILDINGS, settleWorks, siteLevel, siteTop, startSite } from '../src/sim/castle';
import { roomsOf } from '../src/sim/rooms';
import { startedMeta } from '../src/sim/meta';

test('the Drill Yard has two levels, Blooded then Veteran, built like any room building; the old Barracks is as it was', () => {
  assert.equal(ROOM_BUILDINGS.drillYard.name, 'Drill Yard');
  assert.equal(siteTop('drillYard'), 2);
  assert.deepEqual(roomsOf('drillYard').map((r) => [r.id, r.level]), [['bloodedDrill', 1], ['veteranDrill', 2]]);
  assert.equal(BUILDINGS.barracks.name, 'Barracks');
  assert.equal(BUILDINGS.barracks.perLevel, '+6% hp for every hero');
  const m = startedMeta(3);
  m.crowns = 10_000;
  assert.equal(startSite(m, 'drillYard', 0), true);
  assert.equal(m.crowns, 10_000 - ROOM_BUILDINGS.drillYard.costs[0]);
  assert.equal(settleWorks(m, buildMs('drillYard', 1)), 'drillYard');
  assert.equal(siteLevel(m.castle, 'drillYard'), 1);
  assert.equal(heroBoost(m.castle).hp, 1, 'the Drill Yard gives the heroes nothing');
});

test('new recruits join at the Drill Yard\'s rank: Recruit without it, Blooded at its first level, Veteran at its second', () => {
  const m = startedMeta(4);
  m.crowns = 10_000;
  const ranks: string[] = [];
  for (const level of [0, 1, 2]) {
    if (level) m.castle.drillYard = level;
    assert.equal(rankOf(recruitMarks(m.castle)).rank, ['recruit', 'blooded', 'veteran'][level]);
    assert.ok(buyRecruit(m, 'knight'));
    ranks.push(rankOf(troopsOf(m, 'knight').at(-1)!).rank);
  }
  assert.deepEqual(ranks, ['recruit', 'blooded', 'veteran']);
  // (a soldier who earned more keeps his marks: the drill only sets where a new one starts)
  m.assault!.troops.knight[0] = 7;
  m.castle.drillYard = 2;
  assert.equal(troopsOf(m, 'knight')[0], 7);
});

test('a castle saved before the Drill Yard reads as it did; a level too high is its top', () => {
  const old = readCastle({ treasury: 2, barracks: 3, armoury: 0, mageTower: 0, stable: 0, library: 0 });
  assert.equal(old.drillYard, undefined);
  assert.equal(siteLevel(old, 'drillYard'), 0);
  assert.equal(recruitMarks(old), 0);
  assert.equal(readCastle({ drillYard: 9 }).drillYard, 2);
});
