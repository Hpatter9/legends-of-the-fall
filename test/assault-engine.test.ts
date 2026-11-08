// ASSAULT-0 (docs/notes/assault-0.md, the design's sections 7.3 and 7.6): the Assault's engine spike. The bounded walk is the plain walk
// inside its window; the sector graph knows the walls and follows the breaks; the occupancy grid and buckets keep up with the
// fighters; sleeping posts do not decide; the placeholder hold is the same for its seed and walkable where it should be; and the same
// seed plays the same fight.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canStep, DIRS, makeBoard, standable, type Board } from '../src/sim/board';
import { walkFrom, walkNear, nearIndex } from '../src/sim/path';
import { startBattle } from '../src/sim/battle';
import { mixSeed, Rng } from '../src/sim/rng';
import { buildSectors, jumpClass, reaches, rebuildSectors, JUMP_CLASSES } from '../src/sim/assault/sectors';
import { buildField, FIELD, placeholderStencil, STENCIL } from '../src/sim/assault/stencil';
import { playSpike, spikeChecksum, startSpike, stepSpike, breakTiles, SPIKE_POSTS } from '../src/sim/assault/spike';
import { BUCKET } from '../src/sim/assault/field';
import { detailFor, MID_AT, NEAR_AT } from '../src/render/fieldDetail';

/** Every tile a walker who jumps `jump` reaches from `from`, by a plain flood over `canStep`. */
function flood(b: Board, from: number, jump: number): Uint8Array {
  const seen = new Uint8Array(b.w * b.d);
  const q = [from];
  seen[from] = 1;
  while (q.length) {
    const i = q.pop()!;
    const u = i % b.w;
    const v = Math.floor(i / b.w);
    for (const [du, dv] of DIRS) {
      const nu = u + du;
      const nv = v + dv;
      if (nu < 0 || nv < 0 || nu >= b.w || nv >= b.d) continue;
      const j = nv * b.w + nu;
      if (seen[j] || canStep(b.tiles[i], b.tiles[j], jump) === null) continue;
      seen[j] = 1;
      q.push(j);
    }
  }
  return seen;
}

const zoneAt = (zone: Uint8Array, i: number) => String.fromCharCode(zone[i]);

test('walkNear walks exactly as walkFrom does on the board cut to its window', () => {
  const field = buildField(placeholderStencil(), 3).board;
  const boards = [field, makeBoard(11), makeBoard(12, 'snow')];
  const rng = new Rng(mixSeed(5, 0xa5));
  for (const b of boards)
    for (let n = 0; n < 25; n++) {
      const u = rng.int(0, b.w - 1);
      const v = rng.int(0, b.d - 1);
      if (!standable(b.tiles[v * b.w + u])) continue;
      const jump = rng.int(1, 4);
      // (a few tiles held by others)
      const held = new Set<number>();
      for (let k = 0; k < 12; k++) held.add(rng.int(0, b.w * b.d - 1));
      held.delete(v * b.w + u);
      const near = walkNear(b, { u, v }, jump, (j) => held.has(j), 8);
      const cost = [...near.cost];
      const from = [...near.from];
      const blocked = new Set(held);
      for (let i = 0; i < b.w * b.d; i++) if (nearIndex(near, b.w, i) < 0) blocked.add(i);
      const plain = walkFrom(b, { u, v }, jump, blocked);
      for (let i = 0; i < b.w * b.d; i++) {
        const k = nearIndex(near, b.w, i);
        if (k < 0) continue;
        assert.equal(cost[k], plain.cost[i], `cost at ${i} from ${u},${v}`);
        assert.equal(from[k], plain.from[i], `the way into ${i} from ${u},${v}`);
      }
    }
});

test('the sector graph knows the walls: the inner bailey is shut to every walker until a gate breaks, and open after', () => {
  const map = buildField(placeholderStencil(), 1);
  const b = map.board;
  const g = buildSectors(b);
  const landing = 95 * b.w + 95;
  const keep = 50 * b.w + 50;
  for (let c = 0; c < 4; c++) assert.equal(reaches(g, c, landing, keep), false, `jump class ${JUMP_CLASSES[c]} reaches the keep through a shut gate`);
  // (a flier goes over the wall)
  assert.equal(reaches(g, jumpClass(9), landing, keep), true);
  // (and the graph agrees with a plain flood wherever it says no)
  const reach = flood(b, landing, 2);
  assert.equal(reach[keep], 0);
  for (const i of map.ironGates[0]) {
    delete b.tiles[i].wall;
  }
  rebuildSectors(g, b, map.ironGates[0]);
  assert.equal(g.builds, 2);
  for (let c = 0; c < 4; c++) assert.equal(reaches(g, c, landing, keep), JUMP_CLASSES[c] >= 1, `jump class ${JUMP_CLASSES[c]} after the breach`);
  assert.equal(flood(b, landing, 1)[keep], 1);
});

test('a rebuild of the broken tiles\' sectors alone finds the same ways as a whole rebuild', () => {
  const map = buildField(placeholderStencil(), 2);
  const b = map.board;
  const part = buildSectors(b);
  const broken = [...map.ironGates[1], 22 * b.w + 50, 23 * b.w + 50];
  for (const i of broken) {
    delete b.tiles[i].wall;
    delete b.tiles[i].rock;
  }
  rebuildSectors(part, b, broken);
  const whole = buildSectors(b);
  const rng = new Rng(77);
  for (let n = 0; n < 300; n++) {
    const a = rng.int(0, b.w * b.d - 1);
    const z = rng.int(0, b.w * b.d - 1);
    const c = rng.int(0, 4);
    assert.equal(reaches(part, c, a, z), reaches(whole, c, a, z), `from ${a} to ${z}, class ${c}`);
  }
});

test('the placeholder hold: 100 x 100 from a 50 x 50 stencil, the same for its seed, every outside tile walkable from the Landing at jump 1', () => {
  const stencil = placeholderStencil();
  assert.equal(stencil.length, STENCIL);
  assert.ok(stencil.every((row) => row.length === STENCIL));
  const a = buildField(stencil, 4);
  const again = buildField(stencil, 4);
  assert.equal(a.board.w, FIELD);
  assert.deepEqual(a.board.tiles, again.board.tiles);
  assert.notDeepEqual(a.board.tiles, buildField(stencil, 5).board.tiles);
  const b = a.board;
  const reach = flood(b, 95 * b.w + 95, 1);
  const outside = new Set(['L', 'K', 'N', 'F', 'Y']);
  for (let i = 0; i < b.w * b.d; i++) {
    if (!outside.has(zoneAt(a.zone, i)) || !standable(b.tiles[i])) continue;
    assert.equal(reach[i], 1, `outside tile ${i % b.w},${Math.floor(i / b.w)} (${zoneAt(a.zone, i)}) cannot be walked to from the Landing`);
  }
  // (and nothing inside the stone wall is, at any walking jump, while its gates stand)
  for (const jump of [1, 2, 3, 4]) {
    const r = flood(b, 95 * b.w + 95, jump);
    for (let i = 0; i < b.w * b.d; i++) if (zoneAt(a.zone, i) === 'M' || zoneAt(a.zone, i) === 'I') assert.equal(r[i], 0, `inner tile ${i} at jump ${jump}`);
  }
});

test('the spike: 55 of ours against 200 at their posts, and the posts sleep until ours come near', () => {
  const b = startSpike(1);
  const f = b.field!;
  assert.equal(b.units.filter((x) => x.side === 'hero').length, 55);
  assert.equal(b.units.filter((x) => x.side === 'foe').length, 200);
  assert.equal(SPIKE_POSTS.reduce((n, p) => n + p.roster.replace(/ /g, '').length, 0), 200);
  // (nobody stands on a solid tile, or on another)
  const seen = new Set<number>();
  for (const x of b.units) {
    assert.ok(standable(b.board.tiles[x.v * b.board.w + x.u]));
    assert.ok(!seen.has(x.v * 100 + x.u));
    seen.add(x.v * 100 + x.u);
  }
  stepSpike(b);
  assert.equal(f.stats.tickDecided, 50, 'only ours decide on the first tick (the five heroes are leaders; every post sleeps)');
  assert.ok(f.groups.filter((g) => g.side === 'foe').every((g) => !g.awake));
});

test('the occupancy grid and the buckets keep up with the fighters', () => {
  const b = startSpike(2);
  const f = b.field!;
  for (let t = 0; t < 1500; t++) {
    stepSpike(b);
    if (t % 250) continue;
    // (each living fighter is on the grid where it stands, and the grid holds nobody else)
    let held = 0;
    for (let i = 0; i < f.occ.length; i++) if (f.occ[i] >= 0) held++;
    const alive = b.units.filter((x) => x.alive);
    assert.equal(held, alive.length);
    for (const x of alive) assert.equal(f.occ[x.v * f.w + x.u], x.id);
    // (the buckets, as built at the start of this tick, list every living fighter once, each list in id order)
    const listed: number[] = [];
    for (let k = 0; k < f.bw * f.bd; k++) {
      const ids = [...f.items.subarray(f.start[k], f.start[k + 1])];
      assert.deepEqual(ids, [...ids].sort((p, q) => p - q));
      listed.push(...ids);
    }
    assert.equal(new Set(listed).size, listed.length);
  }
  assert.equal(BUCKET, 8);
});

test('the same seed plays the same fight; another seed another', () => {
  const run = (seed: number) => {
    const b = startSpike(seed);
    for (let t = 0; t < 2400 && b.phase === 'fight'; t++) stepSpike(b);
    return { sum: spikeChecksum(b), rng: b.rng, t: b.t, hp: b.units.map((x) => x.hp), at: b.units.map((x) => x.u * 1000 + x.v) };
  };
  const one = run(6);
  assert.deepEqual(run(6), one);
  assert.notEqual(run(7).sum, one.sum);
  // (and to the end)
  const a = playSpike(startSpike(8));
  const z = playSpike(startSpike(8));
  assert.equal(spikeChecksum(a), spikeChecksum(z));
  assert.equal(a.phase, z.phase);
  assert.equal(a.rng, z.rng);
});

test('the budget, counted (design 7.6): few bounded walks a tick, never more than 60 decisions, a rebuild for each break', () => {
  const b = startSpike(1);
  const f = b.field!;
  let breaks = 0;
  for (let t = 0; t < 600 * 10 && b.phase === 'fight'; t++) for (const e of stepSpike(b)) if (e.kind === 'breach') breaks++;
  assert.ok(f.stats.walks / f.stats.ticks <= 8, `bounded walks a tick: ${f.stats.walks / f.stats.ticks}`);
  assert.ok(f.stats.mostDecided <= 60, `the most decisions in a tick: ${f.stats.mostDecided}`);
  assert.equal(f.stats.rebuilds, breaks);
  assert.ok(breaks >= 1, 'the fight broke a gate of the stone wall');
  // (a break by hand is one more)
  breakTiles(b, [10 * 100 + 10]);
  assert.equal(f.stats.rebuilds, breaks + 1);
});

test('the field is behind Battle.field: no other fight has one', () => {
  assert.equal(startBattle(1, 'orcs').field, undefined);
  assert.ok(startSpike(1).field);
});

test('the levels of detail change only past a band either side of each threshold', () => {
  assert.equal(detailFor(0.5, 'near'), 'near');
  assert.equal(detailFor(NEAR_AT * 0.97, 'near'), 'near');
  assert.equal(detailFor(NEAR_AT * 0.94, 'near'), 'mid');
  assert.equal(detailFor(NEAR_AT * 1.03, 'mid'), 'mid');
  assert.equal(detailFor(NEAR_AT * 1.06, 'mid'), 'near');
  assert.equal(detailFor(MID_AT * 0.97, 'mid'), 'mid');
  assert.equal(detailFor(MID_AT * 0.94, 'mid'), 'far');
  assert.equal(detailFor(MID_AT * 1.03, 'far'), 'far');
  assert.equal(detailFor(MID_AT * 1.06, 'far'), 'mid');
  assert.equal(detailFor(0.6, 'far'), 'near');
  assert.equal(detailFor(0.05, 'near'), 'far');
});
