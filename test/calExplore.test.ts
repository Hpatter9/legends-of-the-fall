import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startedMeta } from '../src/sim/meta';
import { calamityRun } from '../src/sim/modes';
import { CAL_ROWS } from '../src/sim/calamity';
import { buy, calamityMap, choices, clearNode, enterNode, floorOf, hereOf, mapFor, mapProgress, moveTo, routeTo, setGoing, sideChoices, spotFloor } from '../src/sim/tower';
import { fogOf, neighboursOf, routeBetween, SIDE_BASE, sideSpots, START_ID } from '../src/sim/calLand';
import { heroLevel } from '../src/sim/climb';
import { LATE_LEVEL, levelOf, RUN_MAX_LEVEL, xpFor } from '../src/sim/levels';
import { loadSlot, saveSlot, type Run } from '../src/sim/run';

const run = (seed: number): Run => calamityRun(seed, startedMeta(5), 'knight', 0);
const store = () => {
  const s: Record<string, string> = {};
  return { getItem: (k: string) => s[k] ?? null, setItem: (k: string, v: string) => void (s[k] = v) };
};
const reload = (r: Run): Run => {
  const s = store();
  saveSlot(r, s as never);
  return loadSlot('calamity', s as never)!;
};
/** Enter a spot and clear it without fighting (the rules of reaching it are what is tested). */
const clear = (r: Run, id: number): void => {
  assert.equal(enterNode(r, id), true, `spot ${id} can be entered`);
  clearNode(r);
};
const ids = (r: Run) => choices(r).map((n) => n.id);
/** A seed and the first-floor-reachable node of its first map that forks (two ways on). */
function forky(): { r: Run; fork: number } {
  for (let seed = 1; seed < 400; seed++) {
    const r = run(seed);
    const t = r.tower!;
    const n = t.map.find((x) => x.row === 1 && x.next.length >= 2 && t.map.some((p) => p.row === 0 && p.next.includes(x.id)));
    if (n) return { r, fork: n.id };
  }
  throw new Error('no fork');
}
/** Clear the way to a node: its ancestors from the first floor, in order. */
function clearTo(r: Run, id: number): void {
  const t = r.tower!;
  const chain: number[] = [];
  for (let at: number | undefined = id; at !== undefined; ) {
    chain.unshift(at);
    at = t.map.find((n) => n.next.includes(at!) && n.row === t.map[at!].row - 1)?.id;
  }
  for (const c of chain) if (!t.path.includes(c)) clear(r, c);
}

test('every spot of a map can be reached and cleared, in any order, and the boss is last only by choice', () => {
  for (const seed of [3, 9, 21]) {
    const r = run(seed);
    const t = r.tower!;
    let n = 0;
    // (always take the highest id on offer: an order no climb would pick)
    for (let guard = 0; guard < 100; guard++) {
      const pick = choices(r).filter((x) => x.kind !== 'boss').sort((a, b) => b.id - a.id)[0];
      if (!pick) break;
      clear(r, pick.id);
      n++;
    }
    assert.equal(n, t.map.filter((x) => x.kind !== 'boss').length, `seed ${seed}: every spot but the lair was cleared`);
    assert.deepEqual(mapProgress(t), { done: n, total: n });
    assert.deepEqual(ids(r), [t.map.find((x) => x.kind === 'boss')!.id], 'only the lair is left');
  }
});

test('both sides of a fork can be visited, in either order, and the party walks back between them over the cleared spots', () => {
  const { r, fork } = forky();
  const t = r.tower!;
  clearTo(r, fork);
  const [a, b] = t.map[fork].next;
  assert.ok(ids(r).includes(a) && ids(r).includes(b), 'both branches are on offer');
  clear(r, a);
  assert.ok(ids(r).includes(b), 'taking one branch does not lock the other');
  // (back to the fork over the cleared spots, then on to the other branch)
  assert.deepEqual(routeTo(r, fork), [a, fork]);
  assert.deepEqual(routeTo(r, b), [a, fork, b], 'the way to the other branch runs through cleared spots only');
  assert.equal(moveTo(r, fork), true);
  assert.equal(hereOf(r.tower!), fork);
  assert.deepEqual(routeTo(r, b), [fork, b]);
  clear(r, b);
  assert.equal(hereOf(r.tower!), b);
  assert.equal(moveTo(r, START_ID), true, 'and all the way back to the portal');
  assert.equal(hereOf(r.tower!), START_ID);
});

test('a route never runs through a spot that is not cleared, and a spot not shown cannot be walked to or entered', () => {
  const r = run(7);
  const t = r.tower!;
  const sides = sideSpots(r.seed, t.act, t.map);
  const far = t.map.find((n) => n.row === 3)!;
  assert.equal(routeTo(r, far.id), null, 'a spot three floors in has no way yet');
  assert.equal(enterNode(r, far.id), false);
  assert.equal(setGoing(r, far.id), false);
  assert.equal(moveTo(r, far.id), false, 'a spot not cleared cannot be walked to for free');
  const first = ids(r)[0];
  assert.deepEqual(routeBetween(t.map, sides, new Set([START_ID]), START_ID, first), [START_ID, first]);
});

test('the boss can be fought as soon as its lair is shown, with spots left; before that it is hidden', () => {
  const r = run(11);
  const t = r.tower!;
  const boss = t.map.find((n) => n.kind === 'boss')!;
  assert.ok(!ids(r).includes(boss.id));
  const door = t.map.find((n) => n.next.includes(boss.id))!;
  assert.equal(enterNode(r, boss.id), false, 'not before the lair is shown');
  clearTo(r, door.id);
  assert.ok(ids(r).includes(boss.id), 'shown with the campfire before it cleared');
  const { done, total } = mapProgress(t);
  assert.ok(done < total, 'and most of the map left');
  assert.equal(enterNode(r, boss.id), true);
  assert.equal(r.tower!.cur?.kind, 'boss');
  clearNode(r);
  assert.equal(r.tower!.act, 2, 'its fall opens the next map');
  assert.equal(hereOf(r.tower!), -1);
  assert.deepEqual(r.tower!.path, []);
  assert.equal(r.stage, floorOf(2, 0, r.tower!));
});

test('a cleared spot stays cleared: it is not on offer again, cannot be entered, and walking through it is free', () => {
  const r = run(5);
  const t = r.tower!;
  const first = ids(r)[0];
  clear(r, first);
  assert.ok(t.path.includes(first));
  assert.ok(!ids(r).includes(first));
  assert.equal(enterNode(r, first), false, 'a fight is spent once used');
  const hp = JSON.stringify(t.hp);
  const gold = r.gold;
  assert.equal(moveTo(r, first), true);
  assert.equal(JSON.stringify(t.hp), hp);
  assert.equal(r.gold, gold, 'walking back costs nothing');
  assert.ok(!t.cur, 'and starts nothing');
  assert.equal(mapProgress(t).done, 1);
});

test('a shop stays open to visit again, with what was bought gone, also after a reload', () => {
  let r: Run | undefined;
  let shop = -1;
  for (let seed = 1; seed < 80 && shop < 0; seed++) {
    r = run(seed);
    shop = r.tower!.map.find((n) => n.kind === 'shop')?.id ?? -1;
  }
  assert.ok(r && shop >= 0);
  const t = r.tower!;
  clearTo(r, shop);
  // (stand in the shop before leaving: buy the cheapest thing)
  const spots0 = t.spots;
  moveTo(r, t.map[shop].row ? t.path[0] : START_ID);
  assert.equal(enterNode(r, shop), true, 'a shop cleared can be entered again');
  assert.equal(t.spots, spots0, 'it is not a new spot');
  r.gold = 500;
  const stock = t.cur!.shop!;
  const i = stock.findIndex((x) => x.kind === 'heal');
  assert.ok(buy(r, i));
  clearNode(r);
  assert.equal(mapProgress(t).done, t.path.filter((x) => t.map[x].kind !== 'boss').length);
  const back = reload(r);
  assert.equal(enterNode(back, shop), true);
  assert.equal(back.tower!.cur!.shop![i].sold, true, 'what was bought stays gone');
  assert.equal(back.tower!.path.filter((x) => x === shop).length, 1, 'cleared once');
});

test('the fog shows the portal and the first floor, then what a bridge leads to from every cleared spot, both ways; nothing further', () => {
  const { r, fork } = forky();
  const t = r.tower!;
  const first = fogOf(t, []);
  assert.deepEqual([...first.spots].sort((a, b) => a - b), [START_ID, ...t.map.filter((n) => n.row === 0).map((n) => n.id)].sort((a, b) => a - b));
  clearTo(r, fork);
  const fog = fogOf(t, sideSpots(r.seed, t.act, t.map));
  for (const to of neighboursOf(t.map, [], fork)) assert.ok(fog.spots.has(to), `${to} next to the fork is shown`);
  const known = new Set<number>([START_ID, ...t.path]);
  const near = new Set<number>(known);
  for (const id of known) for (const to of neighboursOf(t.map, sideSpots(r.seed, t.act, t.map), id)) near.add(to);
  for (const s of fog.spots) assert.ok(near.has(s), `spot ${s} is next to a cleared one`);
  for (const n of t.map) if (!near.has(n.id)) assert.ok(!fog.spots.has(n.id), `spot ${n.id} is still hidden`);
});

test('hidden side spots can be taken whenever the party likes once their node is cleared, and stay cleared', () => {
  for (let seed = 1; seed < 300; seed++) {
    const r = run(seed);
    const t = r.tower!;
    const s = sideSpots(seed, 1, t.map)[0];
    if (!s) continue;
    assert.equal(sideChoices(r).length, 0);
    clearTo(r, s.from);
    // (move on without it, back again later)
    const next = ids(r).find((x) => x !== undefined);
    if (next !== undefined) clear(r, next);
    assert.ok(sideChoices(r).some((x) => x.id === s.id), 'still on offer after moving on');
    assert.equal(enterNode(r, s.id), true);
    assert.equal(t.cur!.side, true);
    clearNode(r);
    assert.equal(hereOf(t), s.id, 'the party stands on the side spot');
    assert.deepEqual(routeTo(r, s.from), [s.id, s.from]);
    assert.ok(!sideChoices(r).some((x) => x.id === s.id));
    assert.ok(s.id >= SIDE_BASE);
    return;
  }
  throw new Error('no side spot found');
});

test('a spot counts as its row: further from the start is harder, whatever the order it is reached in; a hidden spot is one floor deeper', () => {
  const r = run(13);
  const t = r.tower!;
  for (const n of t.map) assert.equal(spotFloor(r, n.id), floorOf(t.act, n.row, t));
  const deep = t.map.find((n) => n.row === 3)!;
  const shallow = t.map.find((n) => n.row === 1)!;
  assert.ok(spotFloor(r, deep.id) > spotFloor(r, shallow.id));
  // (the same fight whenever it is entered: the band and strength come from the spot)
  clearTo(r, shallow.id);
  const spec = (id: number) => {
    const q = run(13);
    clearTo(q, id);
    const c = choices(q).find((x) => x.kind === 'fight' || x.kind === 'elite');
    return c ? (enterNode(q, c.id), JSON.stringify(q.tower!.cur!.fight)) : '';
  };
  assert.equal(spec(shallow.id), spec(shallow.id), 'deterministic');
});

test('closed and reopened mid-map: the cleared spots, where the party stands, the shops and the count come back exactly', () => {
  const { r, fork } = forky();
  const t = r.tower!;
  clearTo(r, fork);
  const [a] = t.map[fork].next;
  clear(r, a);
  moveTo(r, fork);
  const back = reload(r);
  assert.deepEqual(back, JSON.parse(JSON.stringify(r)));
  assert.deepEqual(choices(back).map((n) => n.id), ids(r));
  assert.equal(hereOf(back.tower!), fork);
  assert.equal(back.tower!.spots, r.tower!.spots);
  assert.deepEqual(fogOf(back.tower!, []), fogOf(t, []));
  // (closed mid-walk)
  const to = ids(r).find((x) => x !== a)!;
  assert.equal(setGoing(r, to), true);
  assert.equal(reload(r).tower!.going, to);
});

test('a calamity saved before free exploration loads and carries on: its cleared road is its cleared set, and the branches it passed are open', () => {
  const r = run(17);
  const t = r.tower!;
  // (an old save: the nodes taken in order, `at` the last, `row` the next floor, no `here`, `shops` or `spots`)
  const first = t.map.find((n) => n.row === 0)!;
  const second = t.map[first.next[0]];
  t.path = [first.id, second.id];
  t.at = second.id;
  t.row = second.row + 1;
  r.stage = 3;
  const old = reload(r);
  assert.equal(old.tower!.here, undefined);
  assert.equal(hereOf(old.tower!), second.id);
  const others = t.map.filter((n) => n.row === 0 && n.id !== first.id);
  for (const o of others) assert.ok(choices(old).some((n) => n.id === o.id), 'the branch it passed is open now');
  assert.ok(second.next.every((id) => choices(old).some((n) => n.id === id)));
  clear(old, choices(old)[0].id);
  assert.equal(old.tower!.spots, 1);
});

test('a run\'s level goes on to 30: levels past 20 cost more, and the run\'s hero levels past 20', () => {
  assert.equal(RUN_MAX_LEVEL, 30);
  assert.equal(levelOf(xpFor(LATE_LEVEL), RUN_MAX_LEVEL), 20);
  assert.equal(levelOf(xpFor(25), RUN_MAX_LEVEL), 25, 'level 25 is reached');
  assert.equal(levelOf(xpFor(30), RUN_MAX_LEVEL), 30);
  assert.equal(levelOf(1e9, RUN_MAX_LEVEL), 30, 'and no further');
  assert.ok(xpFor(21) - xpFor(20) > xpFor(20) - xpFor(19), 'a level past 20 costs more than one before it');
  assert.equal(heroLevel({ id: 1, kind: 'knight', grade: 1, xp: xpFor(24) }), 24);
});

test('the calamity\'s map nodes are as they were, and the same for a seed every time', () => {
  for (const seed of [1, 7, 99])
    for (let act = 1; act <= CAL_ROWS.length; act++) {
      const a = calamityMap(seed, act, CAL_ROWS[act - 1], 0);
      assert.deepEqual(a, calamityMap(seed, act, CAL_ROWS[act - 1], 0));
      if (act === 1) assert.deepEqual(a, mapFor(run(seed), 1), 'the run\'s first map is the same one');
    }
});
