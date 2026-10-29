import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dungeonDirection, dungeonHall, dungeonLayout, type DungeonDirection } from '../src/sim/dungeonLayout';
import { neighboursOf, openSet, routeBetween, sideSpots, START_ID } from '../src/sim/calLand';
import { calamityMap, choices, clearNode, enterNode, moveTo } from '../src/sim/tower';
import { calamityRun } from '../src/sim/modes';
import { CAL_ROWS } from '../src/sim/calamity';
import { RIFT_ROWS } from '../src/sim/rift';
import { startedMeta } from '../src/sim/meta';
import { loadSlot, saveSlot } from '../src/sim/run';

function floor(seed: number, rowCount = 6, act = 1) {
  const map = calamityMap(seed, act, rowCount);
  const sides = sideSpots(seed, act, map);
  return { map, sides, layout: dungeonLayout(map, sides) };
}

test('the dungeon is deterministic, preserves encounters, and has a permanent arrival portal', () => {
  for (const seed of [1, 14, 38, 91]) for (const [i, count] of RIFT_ROWS.entries()) {
    const { map, sides, layout } = floor(seed, count, i + 1);
    const before = JSON.stringify({ map, sides });
    assert.deepEqual(layout, dungeonLayout(map, sides));
    assert.equal(layout.rooms.length, map.length + sides.length + 1);
    assert.deepEqual(layout.rooms.filter((r) => r.kind === 'start').map((r) => r.id), [START_ID]);
    for (const node of map) assert.equal(layout.rooms.find((r) => r.id === node.id)?.kind, node.kind);
    assert.equal(JSON.stringify({ map, sides }), before);
    const entrances = layout.halls.filter((h) => h.from === START_ID);
    assert.deepEqual(entrances.map((h) => h.to).sort((a,b) => a-b), map.filter((n) => n.row === 0).map((n) => n.id));
  }
});

test('new and legacy floors keep every real link, and each corridor is orthogonal and reversible', () => {
  for (const counts of [RIFT_ROWS, CAL_ROWS]) for (const [i, count] of counts.entries()) {
    const { map, sides, layout } = floor(91, count, i + 1);
    const edgeCount = map.reduce((n, r) => n + r.next.length, 0) + map.filter((r) => r.row === 0).length + sides.length;
    assert.equal(layout.halls.length, edgeCount);
    for (const hall of layout.halls) {
      const a = layout.rooms.find((r) => r.id === hall.from)!, b = layout.rooms.find((r) => r.id === hall.to)!;
      assert.deepEqual(hall.points[0], { x:a.x, y:a.y });
      assert.deepEqual(hall.points.at(-1), { x:b.x, y:b.y });
      assert.ok(neighboursOf(map, sides, a.id).includes(b.id));
      for (let k = 1; k < hall.points.length; k++) {
        const p = hall.points[k-1], q = hall.points[k];
        assert.ok(p.x === q.x || p.y === q.y);
        assert.notDeepEqual(p, q);
      }
      assert.deepEqual(dungeonHall(layout, b.id, a.id), [...hall.points].reverse());
    }
  }
});

test('portal, main chambers and side chambers fit inside a phone floor without overlapping', () => {
  let detours = 0;
  for (let seed = 1; seed <= 36; seed++) {
    const { layout } = floor(seed);
    for (const [i,a] of layout.rooms.entries()) {
      assert.ok(a.x >= 36 && a.x <= layout.width - 36);
      assert.ok(a.y >= 40 && a.y <= layout.height - 40);
      if (a.side) detours++;
      for (const b of layout.rooms.slice(i+1)) {
        const horizontal = Math.abs(a.x-b.x), vertical = Math.abs(a.y-b.y);
        assert.ok(horizontal >= 64 || vertical >= 60, `${seed}: rooms ${a.id} and ${b.id} overlap`);
      }
    }
  }
  assert.ok(detours > 0);
});

test('the visible walk follows the simulation route through cleared chambers only', () => {
  const { map, sides, layout } = floor(14);
  const cleared = new Set([START_ID]);
  const first = map.filter((n) => n.row === 0);
  for (const n of first) {
    const route = routeBetween(map, sides, cleared, START_ID, n.id)!;
    assert.deepEqual(route, [START_ID,n.id]);
    assert.ok(dungeonHall(layout, route[0], route[1]));
  }
  const boss = map.find((n) => n.kind === 'boss')!;
  assert.equal(routeBetween(map,sides,cleared,START_ID,boss.id),null);
  for (const n of map) cleared.add(n.id);
  const route = routeBetween(map,sides,cleared,START_ID,boss.id)!;
  for (let i=1;i<route.length;i++) assert.ok(dungeonHall(layout,route[i-1],route[i]));
});

test('arrows select reachable neighbours, including a safe way back to the arrival portal', () => {
  const { map,sides,layout } = floor(14);
  const allowed = new Set([START_ID,...map.filter((r) => r.row === 0).map((r) => r.id)]);
  const first = dungeonDirection(layout,START_ID,allowed,'up')!;
  assert.ok(map.filter((r) => r.row === 0).some((r) => r.id === first));
  assert.equal(dungeonDirection(layout,first,allowed,'down'),START_ID);
  assert.equal(dungeonDirection(layout,START_ID,new Set(),'up'),undefined);
  for (const room of layout.rooms) for (const direction of ['up','down','left','right'] as DungeonDirection[]) {
    const next = dungeonDirection(layout,room.id,allowed,direction);
    if (next !== undefined) {
      assert.ok(allowed.has(next));
      assert.ok(neighboursOf(map,sides,room.id).includes(next));
    }
  }
});

test('returning to the portal and reloading keeps the cleared route and encounter progress', () => {
  const run=calamityRun(14,startedMeta(1),'knight');
  const first=choices(run)[0];
  assert.equal(enterNode(run,first.id),true);
  // This test marks only the route clear; real battle wins remain owned by finishTower.
  clearNode(run);
  const path=[...run.tower!.path], gold=run.gold;
  assert.equal(moveTo(run,START_ID),true);
  assert.deepEqual(run.tower!.path,path);
  assert.equal(run.tower!.here,START_ID);
  assert.equal(run.gold,gold);
  const values:Record<string,string>={};
  const storage={setItem:(k:string,v:string)=>{values[k]=v},getItem:(k:string)=>values[k]??null};
  saveSlot(run,storage);
  const restored=loadSlot('calamity',storage)!;
  assert.equal(restored.tower!.here,START_ID);
  assert.deepEqual(restored.tower!.path,path);
  assert.ok(openSet(restored.tower!).has(START_ID));
  assert.equal(moveTo(restored,first.id),true);
});
