// RELEASE-TRIM (docs/notes/release-trim.md): the Assault is withdrawn before release, and the Developer page with it. A save from 0.613
// that played the Assault (`fixtures/save-0613-assault.json`, made by 0.613's own code: 28 soldiers standing and 2 fallen in a storming
// under way, two holds conquered, one scouted, a Drill Yard at level 1 with level 2 being built, a Conquest chest in the stash) loads, is
// paid back once, and keeps what it won; and no build lists the Developer page.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadMeta, saveMeta, startedMeta } from '../src/sim/meta';
import { ASSAULT_REFUND, DRILL_YARD_COSTS, assaultGoneLine, lastTribute, settleAssaultGone } from '../src/sim/assaultGone';
import { ROOM_BUILDING_IDS } from '../src/sim/castle';
import { ROOMS } from '../src/sim/rooms';
import { openChest } from '../src/sim/armyStars';

const RAW = readFileSync('test/fixtures/save-0613-assault.json', 'utf8');
const store = (raw: string) => {
  const kept = new Map<string, string>([['legends.meta', raw]]);
  return { getItem: (k: string) => kept.get(k) ?? null, setItem: (k: string, v: string) => void kept.set(k, v) };
};

test('a 0.613 save that played the Assault loads, paid back for its soldiers, scouts, holds and Drill Yard', () => {
  const was = JSON.parse(RAW) as { crowns: number; stash: unknown[] };
  const m = loadMeta(1, store(RAW));
  const paid = 28 * ASSAULT_REFUND.recruit + 1 * ASSAULT_REFUND.scouts + lastTribute('orcs') + lastTribute('undead') + DRILL_YARD_COSTS[0] + DRILL_YARD_COSTS[1];
  assert.equal(m.crowns, was.crowns + paid, 'every refund paid once');
  assert.deepEqual(m.assaultGone, { crowns: paid, soldiers: 28, scouts: 1, holds: 2, drill: 2000 });
  assert.ok(!('assault' in m), 'the Assault\'s data is gone');
  assert.ok(!('drillYard' in m.castle), 'the Drill Yard is gone from the castle');
  assert.equal(m.works, undefined, 'its level being built is dropped (and paid back)');
  assert.match(assaultGoneLine(m.assaultGone!), /The Assault has been withdrawn for now: 4103 crowns returned for 28 soldiers, 1 scouts' report, the last tribute of 2 holds and the Drill Yard/);
  // (the Conquest chest won before stays in the stash and opens as before)
  assert.equal(m.stash.length, was.stash.length);
  const i = m.stash.findIndex((c) => c.conquest);
  assert.ok(i >= 0, 'the Conquest chest is kept');
  assert.ok(openChest(m, i), 'and opens');
});

test('the payment is made once: the save written after it loads with nothing more to pay', () => {
  const s = store(RAW);
  const m = loadMeta(1, s);
  const crowns = m.crowns;
  delete m.assaultGone;
  saveMeta(m, s);
  const again = loadMeta(1, s);
  assert.equal(again.crowns, crowns);
  assert.equal(again.assaultGone, undefined);
});

test('a save that never played the Assault is left alone', () => {
  const m = startedMeta(5);
  m.crowns = 300;
  const raw = JSON.stringify(m);
  assert.equal(settleAssaultGone(JSON.parse(raw)), undefined);
  const back = loadMeta(1, store(raw));
  assert.equal(back.crowns, 300);
  assert.equal(back.assaultGone, undefined);
});

test('odd Assault data is read defensively: no soldier counts twice, a fallen one is lost, a conquered hold is not paid as scouted', () => {
  const m = { crowns: 0, assault: { troops: { knight: [0, -1, 5, 'x', null, 99, 0, 0, 0, 0, 0, 0, 0], samurai: 'nope' }, conquered: { orcs: {}, nowhere: {} }, scouted: { orcs: true, beasts: true } }, castle: { drillYard: 9 } };
  const g = settleAssaultGone(m)!;
  assert.equal(g.soldiers, 10, 'a platoon is ten at most');
  assert.equal(g.holds, 1, 'an unknown army is not a hold');
  assert.equal(g.scouts, 1, 'only the hold still standing was scouted for nothing');
  assert.equal(g.drill, DRILL_YARD_COSTS[0] + DRILL_YARD_COSTS[1], 'the Drill Yard at most its two levels');
  assert.equal(m.crowns, g.crowns);
  assert.ok(!('assault' in (m as object)) && !('drillYard' in m.castle));
});

test('the Drill Yard and its rooms are gone from the castle', () => {
  assert.ok(!(ROOM_BUILDING_IDS as string[]).includes('drillYard'));
  assert.ok(!ROOMS.some((r) => (r.building as string) === 'drillYard'));
});
