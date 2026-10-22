import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardOk, canStep, CLIMB_MAX, D, DEPLOY_ROWS, DIRS, standable, tileAt, W } from '../src/sim/board';
import { buildChain, edgeOf, joinsOf, seam, stepOf, transferFormation, walkAcross, DRIFT_MAX } from '../src/sim/chain';
import { armyRun, chainOf, startStage } from '../src/sim/run';
import { ARMIES } from '../src/sim/armies';
import { mixSeed } from '../src/sim/rng';
import { dropDelay, dropEnd, dropPose, FALL_MS, FALL_PX, stepMs } from '../src/render/dropRules';

const road = (seed: number, n = 15) => buildChain(seed, n, 'highlands', (w) => mixSeed(seed, 0x57a6e, w), (w) => w % 5 === 0);

test('the road is the same for the same seed, and differs between seeds', () => {
  assert.deepEqual(road(7), road(7));
  assert.notDeepEqual(road(7).map((s) => s.board.tiles.map((t) => t.h)), road(8).map((s) => s.board.tiles.map((t) => t.h)));
  assert.notDeepEqual(joinsOf(1, 15), joinsOf(2, 15));
});

test('the first section is the board a wave always had', () => {
  const c = road(11);
  assert.equal(c[0].join, null);
  assert.equal(c.length, 15);
  assert.equal(c[0].board.tiles.length, W * D);
});

test('every joined edge can be walked across, and every section stays one region', () => {
  for (let seed = 1; seed <= 60; seed++) {
    const c = road(seed);
    for (let k = 1; k < c.length; k++) {
      const { board, offset } = seam(c[k - 1].board, c[k].board, c[k].join!);
      assert.ok(boardOk(c[k].board), `seed ${seed} section ${k + 1}`);
      // every tile across the seam from another is within a climb, and at least one pair can be stepped
      let open = 0;
      const edge = edgeOf(c[k].board, c[k].join!);
      edge.forEach((idx) => {
        const u = idx % W;
        const v = Math.floor(idx / W);
        const [du, dv] = c[k].join === 'ne' ? DIRS[1] : DIRS[0];
        const n = tileAt(board, u + du, v + dv)!;
        assert.ok(Math.abs(n.h - board.tiles[v * board.w + u].h) <= 1, `seed ${seed} join ${k + 1}`);
        if (canStep(board.tiles[v * board.w + u], n, 2) !== null) open++;
      });
      assert.ok(open >= 5, `seed ${seed} join ${k + 1} has ${open} open tiles`);
      assert.deepEqual(offset, c[k].join === 'ne' ? { u: 0, v: D } : { u: W, v: 0 });
      for (let v = 0; v < D; v++)
        for (let u = 0; u < W; u++)
          for (const [du, dv] of DIRS) {
            const t = tileAt(c[k].board, u + du, v + dv);
            if (t) assert.ok(Math.abs(t.h - tileAt(c[k].board, u, v)!.h) <= CLIMB_MAX, `seed ${seed} section ${k + 1} at ${u},${v}`);
          }
    }
  }
});

test('a hero can walk from the old formation to the new one over the seam', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const c = road(seed, 6);
    for (let k = 1; k < c.length; k++) {
      const from = { u: 3, v: 8 };
      // (any standable tile of the old deploy rows to any standable tile of the new)
      for (let v = D - DEPLOY_ROWS; v < D; v++)
        for (let u = 0; u < W; u++) {
          if (!standable(tileAt(c[k - 1].board, from.u, from.v)) || !standable(tileAt(c[k].board, u, v))) continue;
          const p = walkAcross(c[k - 1].board, c[k].board, c[k].join!, from, { u, v }, 2);
          const off = stepOf(c[k].join!);
          assert.deepEqual(p[0], { u: from.u - off.u, v: from.v - off.v });
          assert.deepEqual(p[p.length - 1], { u, v });
          assert.ok(p.length > 2, 'the walk crosses the seam');
          for (let i = 1; i < p.length; i++) assert.equal(Math.abs(p[i].u - p[i - 1].u) + Math.abs(p[i].v - p[i - 1].v), 1);
        }
    }
  }
});

test('the formation moves over to the same tiles of the new section', () => {
  const c = road(5, 3);
  const spots = [
    { id: '1', u: 1, v: 8 },
    { id: '2', u: 3, v: 7 },
    { id: '3', u: 5, v: 6 },
    { id: '4', u: 2, v: 6 },
    { id: '5', u: 4, v: 8 },
  ];
  const got = transferFormation(c[1].board, spots);
  for (const s of spots) assert.deepEqual(got.get(s.id), [s.u, s.v]);
});

test('a formation tile that is not free is replaced by the nearest free deploy tile', () => {
  const c = road(5, 3);
  const b = c[1].board;
  // (a boulder under hero 1's tile, and two heroes asking for the same one)
  tileAt(b, 1, 8)!.rock = true;
  const got = transferFormation(b, [
    { id: '1', u: 1, v: 8 },
    { id: '2', u: 3, v: 7 },
    { id: '3', u: 3, v: 7 },
  ]);
  assert.equal(got.size, 3);
  const keys = [...got.values()].map(([u, v]) => `${u},${v}`);
  assert.equal(new Set(keys).size, 3);
  for (const [u, v] of got.values()) {
    assert.ok(v >= D - DEPLOY_ROWS);
    assert.ok(standable(tileAt(b, u, v)));
  }
  assert.deepEqual(got.get('2'), [3, 7]);
});

test('fifteen sections wind without overlapping, and the road does not run away to a side', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const c = road(seed);
    const seen = new Set<string>();
    for (const s of c) {
      for (let v = 0; v < D; v++) for (let u = 0; u < W; u++) {
        const key = `${s.origin.u + u},${s.origin.v + v}`;
        assert.ok(!seen.has(key), `seed ${seed}: section ${s.wave} overlaps at ${key}`);
        seen.add(key);
      }
    }
    assert.equal(seen.size, 15 * W * D);
    // (each section's rectangle meets the one before along a whole edge)
    for (let k = 1; k < c.length; k++) {
      const s = stepOf(c[k].join!);
      assert.deepEqual({ u: c[k].origin.u - c[k - 1].origin.u, v: c[k].origin.v - c[k - 1].origin.v }, s);
    }
    let drift = 0;
    let worst = 0;
    for (const j of joinsOf(seed, 15)) {
      if (j) drift += j === 'ne' ? 1 : -1;
      worst = Math.max(worst, Math.abs(drift));
    }
    assert.ok(worst <= DRIFT_MAX, `seed ${seed} drifted ${worst}`);
    // (and it bends: not all one way)
    assert.ok(new Set(joinsOf(seed, 15)).size === 3, `seed ${seed} never bends`);
  }
});

test('an army run fights each wave on its section of the long map', () => {
  const army = ARMIES[0];
  const run = armyRun(99, army.id);
  const c = chainOf(run)!;
  assert.equal(c.length, army.waves.length);
  for (let w = 1; w <= 4; w++) {
    run.stage = w;
    const b = startStage(run);
    assert.deepEqual(b.board.tiles, c[w - 1].board.tiles);
    assert.notEqual(b.board, c[w - 1].board);
  }
  // (retrying a wave replays the same section)
  run.stage = 3;
  assert.deepEqual(startStage(run).board, startStage(run).board);
  // (a bossed wave is marked)
  assert.deepEqual(c.map((s) => s.boss), army.waves.map((w) => !!w.boss));
});

test('only armies have a long map', () => {
  const run = armyRun(1, ARMIES[0].id);
  assert.ok(chainOf(run));
  run.mode = { kind: 'daily', date: 20260101, practice: false };
  assert.equal(chainOf(run), null);
});

test('columns fall one row after another from the joined edge, each lands once and nothing flashes', () => {
  for (const join of ['ne', 'nw'] as const) {
    // the joined edge lands first
    const edge = join === 'ne' ? [3, D - 1] : [W - 1, 4];
    const far = join === 'ne' ? [3, 0] : [0, 4];
    assert.ok(dropDelay(join, edge[0], edge[1]) < dropDelay(join, far[0], far[1]));
    for (let v = 0; v < D; v++)
      for (let u = 0; u < W; u++) {
        const d = dropDelay(join, u, v);
        assert.ok(d >= 0 && d < dropEnd(join));
        let landedAt = -1;
        let prevAlpha = 0;
        let prevY = -Infinity;
        for (let t = 0; t <= dropEnd(join) + 100; t += 10) {
          const p = dropPose(t, d);
          // (it fades in and stays: the alpha never drops)
          assert.ok(p.alpha >= prevAlpha);
          prevAlpha = p.alpha;
          if (!p.landed) {
            // (it only falls until it lands)
            assert.ok(p.dy >= prevY);
            prevY = p.dy;
          } else if (landedAt < 0) landedAt = t;
          assert.ok(p.dy <= 0 && p.dy >= -FALL_PX);
        }
        assert.ok(landedAt >= d + FALL_MS && landedAt < d + FALL_MS + 20);
        assert.deepEqual(dropPose(dropEnd(join) + 500, d), { dy: 0, alpha: 1, landed: true });
      }
  }
  assert.ok(dropEnd('ne') < 2000, 'the whole section is down in under two seconds');
});

test('a walk step lasts a hero\'s own pace, within bounds', () => {
  assert.equal(stepMs(100), 230);
  assert.equal(stepMs(10000), 420);
  assert.ok(stepMs(700) > 230 && stepMs(700) < 420);
});
