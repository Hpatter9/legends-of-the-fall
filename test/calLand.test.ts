import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startedMeta } from '../src/sim/meta';
import { calamityRun } from '../src/sim/modes';
import { CAL_ROWS } from '../src/sim/calamity';
import { calamityMap, choices, makeMap, clearNode, enterNode, floorOf, mapFor, openTreasure, setGoing, sideChoices } from '../src/sim/tower';
import { fogOf, landOf, roadBetween, SIDE_BASE, sideSpots, START_ID } from '../src/sim/calLand';
import { loadSlot, saveSlot, type Run } from '../src/sim/run';

const run = (seed: number): Run => calamityRun(seed, startedMeta(5), 'knight', 0);

/** Put the run at map `act` standing at `id` with the road before it cleared (as a climb that way would leave it). */
function stand(r: Run, act: number, id: number): void {
  const t = r.tower!;
  t.act = act;
  t.map = mapFor(r, act);
  const up: number[] = [];
  for (let at: number | undefined = id; at !== undefined; ) {
    up.unshift(at);
    at = t.map.find((n) => n.next.includes(at!) && n.row === t.map[at!].row - 1)?.id;
  }
  t.path = up;
  t.at = id;
  t.row = t.map[id].row + 1;
  r.stage = floorOf(act, t.row, t);
}

const store = () => {
  const s: Record<string, string> = {};
  return { getItem: (k: string) => s[k] ?? null, setItem: (k: string, v: string) => void (s[k] = v) };
};

/** The first (seed, act) from `from` whose map has a hidden side spot of `kind`. */
function findSide(kind?: 'treasure' | 'elite', from = 1): { seed: number; act: number; id: number; at: number } {
  for (let seed = from; seed < from + 3000; seed++)
    for (let act = 1; act <= CAL_ROWS.length; act++) {
      const nodes = calamityMap(seed, act, CAL_ROWS[act - 1], 0);
      const s = sideSpots(seed, act, nodes).find((x) => !kind || x.kind === kind);
      if (s) return { seed, act, id: s.id, at: s.from };
    }
  throw new Error('no side spot found');
}

test('the land is a plain function of the seed: the same every time, every node a spot, spots apart, roads of whole steps joining their ends', () => {
  for (const seed of [1, 7, 99, 12345]) {
    for (let act = 1; act <= CAL_ROWS.length; act++) {
      const nodes = calamityMap(seed, act, CAL_ROWS[act - 1], 0);
      const a = landOf(seed, act, nodes);
      assert.deepEqual(a, landOf(seed, act, nodes), 'deterministic');
      for (const n of nodes) assert.ok(a.spots.some((s) => s.id === n.id), `node ${n.id} has a spot`);
      assert.ok(a.spots.some((s) => s.id === START_ID));
      const at = (s: { i: number; j: number }) => ({ x: (s.i - s.j) * 45, y: (s.i + s.j) * 26 });
      for (const [i, p] of a.spots.entries())
        for (const q of a.spots.slice(i + 1)) assert.ok(Math.hypot(at(p).x - at(q).x, at(p).y - at(q).y) >= 80, 'no two spots on top of each other');
      for (const s of a.spots) assert.ok(Math.abs((s.i - s.j) * 45) <= 135, 'inside a phone');
      for (const r of a.roads) {
        const first = r.cells[0];
        const last = r.cells[r.cells.length - 1];
        const from = a.spots.find((s) => s.id === r.from)!;
        const to = a.spots.find((s) => s.id === r.to)!;
        assert.deepEqual([first.i, first.j], [from.i, from.j]);
        assert.deepEqual([last.i, last.j], [to.i, to.j]);
        for (let k = 1; k < r.cells.length; k++) assert.equal(Math.abs(r.cells[k].i - r.cells[k - 1].i) + Math.abs(r.cells[k].j - r.cells[k - 1].j), 1, 'one step at a time');
      }
      // (the road of every link of the graph, and from the start to the first floor)
      for (const n of nodes) for (const to of n.next) assert.ok(roadBetween(a, n.id, to), 'a road for each link');
      for (const n of nodes.filter((x) => x.row === 0)) assert.ok(roadBetween(a, START_ID, n.id));
    }
  }
});

test('the maps keep their nodes: the layout is on its own streams', () => {
  const before = JSON.stringify(calamityMap(7, 3, CAL_ROWS[2], 0));
  landOf(7, 3, calamityMap(7, 3, CAL_ROWS[2], 0));
  sideSpots(7, 3, calamityMap(7, 3, CAL_ROWS[2], 0));
  assert.equal(JSON.stringify(calamityMap(7, 3, CAL_ROWS[2], 0)), before);
});

test('the fog: at first the start and the first floor, then a cleared spot shows what its road leads to, both ways at a fork, nothing further', () => {
  const r = run(5);
  const t = r.tower!;
  const first = fogOf(t, []);
  assert.deepEqual([...first.spots].sort((a, b) => a - b), [START_ID, ...t.map.filter((n) => n.row === 0).map((n) => n.id)].sort((a, b) => a - b));
  // (a node with two ways on, found on some map)
  let seed = 1;
  let fork = -1;
  for (; fork < 0 && seed < 500; seed++) {
    const q = run(seed);
    fork = q.tower!.map.find((n) => n.row === 1 && n.next.length >= 2)?.id ?? -1;
    if (fork >= 0) {
      stand(q, 1, fork);
      const fog = fogOf(q.tower!, []);
      const n = q.tower!.map[fork];
      for (const to of n.next) assert.ok(fog.spots.has(to), 'both branches shown');
      const far = new Set(n.next.flatMap((to) => q.tower!.map[to].next));
      for (const id of far) assert.ok(!fog.spots.has(id), 'nothing further');
      assert.ok(fog.spots.has(fork));
    }
  }
  assert.ok(fork >= 0, 'a fork was found');
});

test('a hidden side spot shows only when the fog next to it lifts, and is optional', () => {
  const f = findSide('treasure');
  const r = run(f.seed);
  const t = r.tower!;
  stand(r, f.act, 0);
  const nodes = mapFor(r, f.act);
  const sides = sideSpots(f.seed, f.act, nodes);
  const s = sides.find((x) => x.id === f.id)!;
  // (before the node it hangs from is cleared: hidden, and not on offer)
  t.path = [];
  t.at = -1;
  t.row = 0;
  assert.ok(!fogOf(t, sides).spots.has(s.id));
  assert.equal(sideChoices(r).length, 0);
  // (cleared: shown, and on offer beside the road's own choices)
  stand(r, f.act, s.from);
  assert.ok(fogOf(t, sides).spots.has(s.id));
  assert.ok(sideChoices(r).some((x) => x.id === s.id));
  assert.ok(choices(r).length > 0, 'the road goes on whether or not it is taken');
  // (moving on without it: it is no longer on offer, and the road's choices are what they were)
  const next = choices(r)[0];
  enterNode(r, next.id);
  assert.equal(sideChoices(r).length, 0, 'none while another node is in play');
});

test('taking a side spot leaves the road as it was: same floor, same place, same choices, and the spot is done', () => {
  for (const kind of ['treasure', 'elite'] as const) {
    const f = findSide(kind, 3);
    const r = run(f.seed);
    const t = r.tower!;
    const sides = sideSpots(f.seed, f.act, mapFor(r, f.act));
    const s = sides.find((x) => x.id === f.id)!;
    stand(r, f.act, s.from);
    const stage = r.stage;
    const at = t.at;
    const row = t.row;
    const ways = choices(r).map((n) => n.id);
    assert.equal(enterNode(r, s.id), true);
    assert.equal(t.cur?.side, true);
    assert.equal(t.cur?.kind, kind);
    assert.equal(!!t.cur?.fight, kind === 'elite', 'an elite is a fight');
    if (kind === 'treasure') assert.ok(openTreasure(r));
    clearNode(r);
    assert.equal(r.stage, stage, 'the floor did not move');
    assert.equal(t.at, at);
    assert.equal(t.row, row);
    assert.deepEqual(choices(r).map((n) => n.id), ways, 'the road ahead is as it was');
    assert.equal(sideChoices(r).some((x) => x.id === s.id), false, 'it cannot be taken twice');
    assert.ok(t.sideDone?.includes(s.id));
    assert.ok(!t.path.includes(s.id), 'it is not a step of the road');
  }
});

test('side spots are from the seed: the same ones every time, ids past the nodes, each on a different row, few of them', () => {
  let any = 0;
  let none = 0;
  for (let seed = 1; seed <= 60; seed++)
    for (let act = 1; act <= CAL_ROWS.length; act++) {
      const nodes = calamityMap(seed, act, CAL_ROWS[act - 1], 0);
      const a = sideSpots(seed, act, nodes);
      assert.deepEqual(a, sideSpots(seed, act, nodes));
      assert.ok(a.length <= 2);
      const rows = a.map((s) => nodes[s.from].row);
      assert.equal(new Set(rows).size, rows.length);
      for (const s of a) {
        assert.ok(s.id >= SIDE_BASE);
        assert.notEqual(nodes[s.from].kind, 'boss');
      }
      if (a.length) any++;
      else none++;
    }
  assert.ok(any > 0 && none > 0, 'some maps have one, some none');
});

test('a calamity saved before side spots existed loads and carries on; a side spot in play saves and reloads', () => {
  const r = run(21);
  const old = JSON.parse(JSON.stringify(r)) as Run;
  assert.equal(old.tower!.sideDone, undefined);
  const s = store();
  saveSlot(old, s as never);
  const back = loadSlot('calamity', s as never)!;
  assert.ok(back);
  assert.ok(enterNode(back, choices(back)[0].id));
  const f = findSide('treasure', 40);
  const q = run(f.seed);
  stand(q, f.act, sideSpots(f.seed, f.act, mapFor(q, f.act)).find((x) => x.id === f.id)!.from);
  assert.ok(enterNode(q, f.id));
  const s2 = store();
  saveSlot(q, s2 as never);
  const again = loadSlot('calamity', s2 as never)!;
  assert.equal(again.tower!.cur!.side, true);
  openTreasure(again);
  clearNode(again);
  assert.deepEqual(again.tower!.sideDone, [f.id]);
});

/** What the map shows and offers, from a run's state: the same after a save and a reload. */
const view = (r: Run) => {
  const t = r.tower!;
  const sides = sideSpots(r.seed, t.act, t.map);
  const fog = fogOf(t, sides);
  return {
    act: t.act,
    spots: [...fog.spots].sort((a, b) => a - b),
    roads: [...fog.roads].sort(),
    choices: choices(r).map((n) => n.id),
    sides: sideChoices(r).map((s) => s.id),
    path: [...t.path],
    sideDone: [...(t.sideDone ?? [])],
    at: t.at,
    going: t.going,
    cur: t.cur?.id,
  };
};

const reload = (r: Run): Run => {
  const s = store();
  saveSlot(r, s as never);
  return loadSlot('calamity', s as never)!;
};

test('closed and reopened mid-map: the fog, the spots taken, the spent landmarks and the leader come back exactly', () => {
  const f = findSide('treasure', 60);
  const r = run(f.seed);
  const t = r.tower!;
  const s = sideSpots(f.seed, f.act, mapFor(r, f.act)).find((x) => x.id === f.id)!;
  stand(r, f.act, s.from);
  // (the side spot taken: gold from the hoard, and back on the road)
  assert.ok(enterNode(r, s.id));
  openTreasure(r);
  clearNode(r);
  const before = view(r);
  assert.deepEqual(before.sideDone, [s.id]);
  assert.ok(before.path.length >= 2, 'several spots are spent');
  const back = reload(r);
  assert.deepEqual(back, JSON.parse(JSON.stringify(r)), 'the whole run is the same');
  assert.deepEqual(view(back), before, 'what the map shows and offers is the same');
  // (a side spot skipped, one revealed but not yet taken, and a spot left behind are all derived from the same state)
  const next = choices(back)[0];
  enterNode(back, next.id);
  clearNode(back);
  const moved = view(back);
  assert.ok(!moved.sides.includes(s.id), 'moving on skips the side spot for good');
  assert.deepEqual(view(reload(back)), moved);
  assert.deepEqual(t.sideDone, [s.id]);
});

test('closed mid-walk: the spot being walked to is saved, the leader is there on reopening and its fight is not yet started', () => {
  const r = run(5);
  const t = r.tower!;
  const to = choices(r)[0].id;
  assert.equal(setGoing(r, to), true);
  const back = reload(r);
  assert.equal(back.tower!.going, to);
  assert.equal(back.tower!.cur, undefined, 'not entered: no fight is begun');
  assert.deepEqual(view(back), view(r));
  // (a spot that is not on offer cannot be walked to)
  assert.equal(setGoing(back, t.map.find((n) => n.row === 3)!.id), false);
  // (reaching it enters it, and the walk is over)
  assert.ok(enterNode(back, to));
  assert.equal(back.tower!.going, undefined);
  assert.equal((back.tower as { cur?: { id: number } }).cur?.id, to);
  assert.equal(reload(back).tower!.cur?.id, to, 'closed in the fight: it reopens at that fight, as every fight of the tower does');
});

test('closed between maps: it reopens on the next map, at its start, with only the first floor lit', () => {
  const r = run(9);
  const t = r.tower!;
  const last = t.map.find((n) => n.kind === 'boss')!;
  stand(r, 1, t.map.find((n) => n.next.includes(last.id))!.id);
  assert.ok(enterNode(r, last.id));
  assert.equal(r.tower!.cur?.kind, 'boss');
  clearNode(r);
  assert.equal(r.tower!.act, 2);
  const back = reload(r);
  assert.equal(back.tower!.act, 2);
  assert.equal(back.tower!.at, -1);
  assert.deepEqual(back.tower!.path, []);
  const v = view(back);
  assert.deepEqual(v.spots, [START_ID, ...back.tower!.map.filter((n) => n.row === 0).map((n) => n.id)].sort((a, b) => a - b));
  assert.deepEqual(v.sideDone, []);
  assert.deepEqual(v, view(r));
});

test('a calamity map starts at one spot or two: the first floor never lights more than two (the endless tower\'s maps keep their wider start)', () => {
  for (let seed = 1; seed <= 80; seed++)
    for (let act = 1; act <= CAL_ROWS.length; act++) {
      const nodes = calamityMap(seed, act, CAL_ROWS[act - 1], 0);
      const first = nodes.filter((n) => n.row === 0);
      assert.ok(first.length >= 1 && first.length <= 2, `seed ${seed} map ${act}: ${first.length} first-floor spots`);
      // (every node is still reached from a start, and every path ends at the boss)
      const reach = new Set(first.map((n) => n.id));
      for (const n of nodes) if (reach.has(n.id)) for (const to of n.next) reach.add(to);
      assert.equal(reach.size, nodes.length);
    }
  let wide = 0;
  for (let seed = 1; seed <= 80; seed++) if (makeMap(seed, 1).filter((n) => n.row === 0).length > 2) wide++;
  assert.ok(wide > 0, 'the tower still starts from three or four spots on some maps');
});
