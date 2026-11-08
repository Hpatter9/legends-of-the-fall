import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardOk, canStep, CLIMB_MAX, D, DEPLOY_ROWS, DIRS, standable, tileAt, W } from '../src/sim/board';
import { boardTileAt, buildChain, contactPairs, footprint, frameOf, layRoad, MIN_CONTACT, seam, transferFormation, walkAcross, worldOf, type Section } from '../src/sim/chain';
import { footDims, liesBehind, turnDir, turnTile, unturnTile, type Rot } from '../src/sim/turn';
import { armyRun, chainOf, newRun, startStage } from '../src/sim/run';
import { ARMIES } from '../src/sim/armies';
import { mixSeed } from '../src/sim/rng';
import { dropDelay, dropEnd, dropPose, FALL_MS, FALL_PX, WALK_STEP_MS } from '../src/render/dropRules';
import { depthIn, facesRight, inFrame, project, rawAt } from '../src/render/iso';

const road = (seed: number, n = 15) => buildChain(seed, n, 'highlands', (w) => mixSeed(seed, 0x57a6e, w), (w) => w % 5 === 0);
const ROTS: Rot[] = [0, 1, 2, 3];
const overlaps = (a: ReturnType<typeof footprint>, b: ReturnType<typeof footprint>) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

test('a turned board covers its footprint tile for tile, and turns back', () => {
  for (const r of ROTS) {
    const [fw, fd] = footDims(r);
    assert.equal(fw * fd, W * D);
    const seen = new Set<string>();
    for (let v = 0; v < D; v++)
      for (let u = 0; u < W; u++) {
        const [a, b] = turnTile(r, u, v);
        assert.ok(a >= 0 && b >= 0 && a < fw && b < fd);
        seen.add(`${a},${b}`);
        assert.deepEqual(unturnTile(r, a, b), [u, v]);
      }
    assert.equal(seen.size, W * D);
    // (a quarter turn carries neighbours to neighbours: the board's steps are the world's, turned)
    for (const [du, dv] of DIRS) {
      const [a, b] = turnTile(r, 2, 3);
      const [c, d] = turnTile(r, 2 + du, 3 + dv);
      assert.deepEqual([c - a, d - b], turnDir(r, du, dv));
    }
  }
  assert.deepEqual(turnTile(0, 4, 5), [4, 5]);
});

test('the heroes always face the foes across the screen, in every turn, and the first section is as it always was', () => {
  for (const r of ROTS) {
    const f = { rot: r, ou: 0, ov: 0 };
    inFrame(f, () => {
      // heroes face -v (dir 3), foes +v (dir 1): never the same way on the screen
      assert.notEqual(facesRight(3), facesRight(1));
      // and the hero's look is toward the foe's tile
      const [hx] = project(f, 3, D - 1, 0);
      const [fx] = project(f, 3, 0, 0);
      if (Math.abs(hx - fx) > 1) assert.equal(facesRight(3), fx > hx, `rot ${r}`);
      // dir 0 (+u) and dir 2 (-u) are opposite, as are 1 and 3
      assert.notEqual(facesRight(0), facesRight(2));
    });
  }
  inFrame({ rot: 0, ou: 0, ov: 0 }, () => assert.deepEqual([0, 1, 2, 3].map((d) => facesRight(d)), [true, false, false, true]));
  // (the home frame draws as the old projection did)
  assert.deepEqual(rawAt(3, 5, 2), [(3 - 5) * 32, (3 + 5) * 16 - 24]);
});

test('a nearer tile of a turned board is drawn later', () => {
  for (const r of ROTS) {
    const f = { rot: r, ou: 2, ov: -3 };
    for (let v = 0; v < D; v++)
      for (let u = 0; u < W; u++) {
        const [a, b] = turnTile(r, u, v);
        assert.equal(depthIn(f, u, v), (a + 2 + b - 3) * 10);
        // (one step on the screen's diagonal further down is later)
        const [x, y] = project(f, u, v, 0);
        assert.deepEqual([x, y], rawAt(a + 2, b - 3, 0));
      }
  }
});

test('the road is the same for the same seed, and differs between seeds', () => {
  assert.deepEqual(road(7), road(7));
  assert.notDeepEqual(layRoad(1, 15), layRoad(2, 15));
});

test('the first section is the board a wave always had, not turned, with the heroes in the southwest', () => {
  const c = road(11);
  assert.equal(c[0].join, null);
  assert.equal(c[0].rot, 0);
  assert.deepEqual(c[0].origin, { u: 0, v: 0 });
  assert.equal(c.length, 15);
  assert.equal(c[0].board.tiles.length, W * D);
});

test('the road never overlaps itself, never turns back on the edge it came in by, and stays compact: 1000 seeds', () => {
  const dirs = new Set<string>();
  let widest = 0;
  for (let seed = 1; seed <= 1000; seed++) {
    const places = layRoad(seed, 15);
    assert.deepEqual(layRoad(seed, 15), places, `seed ${seed} is not repeatable`);
    const rects = places.map((p) => footprint({ rot: p.rot, origin: { u: p.ou, v: p.ov } } as Section));
    for (let a = 0; a < rects.length; a++) for (let b = 0; b < a; b++) assert.ok(!overlaps(rects[a], rects[b]), `seed ${seed}: ${a + 1} overlaps ${b + 1}`);
    for (let k = 1; k < places.length; k++) {
      const p = places[k - 1];
      const n = places[k];
      // (the new heroes' edge is against the old section, and the old section's own heroes' edge is not the one it uses)
      const back = turnDir(p.rot, 0, 1);
      const away = turnDir(n.rot, 0, -1);
      assert.notDeepEqual([-away[0], -away[1]], back, `seed ${seed}: ${k + 1} doubles back`);
      dirs.add(`${n.rot}`);
    }
    const x0 = Math.min(...rects.map((r) => r.x0));
    const x1 = Math.max(...rects.map((r) => r.x1));
    const y0 = Math.min(...rects.map((r) => r.y0));
    const y1 = Math.max(...rects.map((r) => r.y1));
    widest = Math.max(widest, x1 - x0, y1 - y0);
  }
  // (every way of lying turns up, and a 15-section road fits in about five sections' width)
  assert.equal(dirs.size, 4);
  // (48 tiles was for sections 9 deep: the same reach in sections' depths)
  assert.ok(widest <= Math.round((48 / 9) * D), `the road reached ${widest} tiles across`);
});

test('every joined edge meets enough of the section before, within a step, with a way across', () => {
  for (let seed = 1; seed <= 150; seed++) {
    const c = road(seed);
    for (let k = 1; k < c.length; k++) {
      const pairs = contactPairs(c[k - 1], c[k]);
      assert.ok(pairs.length >= MIN_CONTACT, `seed ${seed} join ${k + 1} touches ${pairs.length}`);
      let open = 0;
      for (const { n, p } of pairs) {
        const tn = c[k].board.tiles[n[1] * W + n[0]];
        const tp = c[k - 1].board.tiles[p[1] * W + p[0]];
        assert.ok(Math.abs(tn.h - tp.h) <= 1, `seed ${seed} join ${k + 1}`);
        assert.ok(!tn.rock && !tn.ground, 'the joined edge is clear');
        if (canStep(tp, tn, 2) !== null && canStep(tn, tp, 2) !== null) open++;
      }
      assert.ok(open >= 1, `seed ${seed} join ${k + 1} has no way across`);
      assert.ok(boardOk(c[k].board), `seed ${seed} section ${k + 1}`);
      for (let v = 0; v < D; v++)
        for (let u = 0; u < W; u++)
          for (const [du, dv] of DIRS) {
            const t = tileAt(c[k].board, u + du, v + dv);
            if (t) assert.ok(Math.abs(t.h - tileAt(c[k].board, u, v)!.h) <= CLIMB_MAX, `seed ${seed} section ${k + 1} at ${u},${v}`);
          }
    }
  }
});

test('heroes arrive on the edge joined to the road and face along it', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const c = road(seed);
    for (let k = 1; k < c.length; k++) {
      // the deploy rows are against the section before; the foes' row is the far side
      const near = worldOf(c[k], 3, D - 1);
      const far = worldOf(c[k], 3, 0);
      const back = worldOf(c[k - 1], 3, 4);
      const fp = footprint(c[k - 1]);
      const dist = (a: number[]) => Math.abs(a[0] - (fp.x0 + fp.x1) / 2) + Math.abs(a[1] - (fp.y0 + fp.y1) / 2);
      assert.ok(dist(near) < dist(far), `seed ${seed} section ${k + 1}: deploy rows are not the near edge`);
      assert.ok(back);
    }
  }
});

test('a hero can walk from the old formation to the new one over the seam, in every direction', () => {
  const joins = new Set<string>();
  for (let seed = 1; seed <= 60; seed++) {
    const c = road(seed, 8);
    for (let k = 1; k < c.length; k++) {
      joins.add(c[k].join!);
      const from = { u: 3, v: 8 };
      for (let v = D - DEPLOY_ROWS; v < D; v++)
        for (let u = 0; u < W; u++) {
          if (!standable(tileAt(c[k - 1].board, from.u, from.v)) || !standable(tileAt(c[k].board, u, v))) continue;
          const p = walkAcross(c[k - 1], c[k], from, { u, v }, 2);
          const [fu, fv] = worldOf(c[k - 1], from.u, from.v);
          const [tu, tv] = worldOf(c[k], u, v);
          assert.deepEqual(p[0], { u: fu, v: fv });
          assert.deepEqual(p[p.length - 1], { u: tu, v: tv });
          assert.ok(p.length > 2, 'the walk crosses the seam');
          for (let i = 1; i < p.length; i++) assert.equal(Math.abs(p[i].u - p[i - 1].u) + Math.abs(p[i].v - p[i - 1].v), 1);
        }
    }
  }
  assert.ok(joins.size >= 3, `joins seen: ${[...joins]}`);
});

test('the seam board holds both sections, tile for tile', () => {
  const c = road(3, 4);
  for (let k = 1; k < c.length; k++) {
    const { board, minU, minV } = seam(c[k - 1], c[k]);
    for (const s of [c[k - 1], c[k]])
      for (let v = 0; v < D; v++)
        for (let u = 0; u < W; u++) {
          const [U, V] = worldOf(s, u, v);
          assert.equal(board.tiles[(V - minV) * board.w + (U - minU)], s.board.tiles[v * W + u]);
          assert.deepEqual(boardTileAt(s, U, V), [u, v]);
        }
    assert.deepEqual(frameOf(c[k], c[k]), { rot: c[k].rot, ou: 0, ov: 0 });
  }
});

test('the formation moves over to the same tiles of the new section', () => {
  const c = road(5, 3);
  const spots = [
    { id: '1', u: 1, v: D - 1 },
    { id: '2', u: 3, v: D - 2 },
    { id: '3', u: 5, v: D - 3 },
    { id: '4', u: 2, v: D - 3 },
    { id: '5', u: 4, v: D - 1 },
  ];
  const got = transferFormation(c[1].board, spots);
  for (const s of spots) assert.deepEqual(got.get(s.id), [s.u, s.v]);
});

test('a formation tile that is not free is replaced by the nearest free deploy tile', () => {
  const c = road(5, 3);
  const b = c[1].board;
  // (a boulder under hero 1's tile, and two heroes asking for the same one)
  tileAt(b, 1, D - 1)!.rock = true;
  const got = transferFormation(b, [
    { id: '1', u: 1, v: D - 1 },
    { id: '2', u: 3, v: D - 2 },
    { id: '3', u: 3, v: D - 2 },
  ]);
  assert.equal(got.size, 3);
  const keys = [...got.values()].map(([u, v]) => `${u},${v}`);
  assert.equal(new Set(keys).size, 3);
  for (const [u, v] of got.values()) {
    assert.ok(v >= D - DEPLOY_ROWS);
    assert.ok(standable(tileAt(b, u, v)));
  }
  assert.deepEqual(got.get('2'), [3, D - 2]);
});

test('an army run fights each wave on its section of the long map, in the board\'s own coordinates', () => {
  const army = ARMIES[0];
  const run = armyRun(99, army.id);
  const c = chainOf(run)!;
  assert.equal(c.length, army.waves.length);
  for (let w = 1; w <= 4; w++) {
    run.stage = w;
    const b = startStage(run);
    assert.deepEqual(b.board.tiles, c[w - 1].board.tiles);
    assert.notEqual(b.board, c[w - 1].board);
    // (the fight is as ever: foes in the rows at v = 0, heroes to deploy at the rows from v = 6)
    for (const u of b.units) assert.ok(u.v < DEPLOY_ROWS);
  }
  // (retrying a wave replays the same section)
  run.stage = 3;
  assert.deepEqual(startStage(run).board, startStage(run).board);
  // (a bossed wave is marked)
  assert.deepEqual(c.map((s) => s.boss), army.waves.map((w) => !!w.boss));
});

test('only armies and the fixed daily have a long map', () => {
  const run = armyRun(1, ARMIES[0].id);
  assert.ok(chainOf(run));
  run.mode = { kind: 'daily', date: 20260101, practice: false };
  assert.equal(chainOf(run)?.length, 10, 'the daily has a section for each of its ten waves');
  run.mode = { kind: 'tower' };
  assert.equal(chainOf(run), null);
  assert.equal(chainOf(newRun(1)), null);
});

test('columns fall one row after another from the joined edge, each lands once and nothing flashes', () => {
  {
    // the joined edge lands first
    const edge = [3, D - 1];
    const far = [3, 0];
    assert.ok(dropDelay(edge[0], edge[1]) < dropDelay(far[0], far[1]));
    for (let v = 0; v < D; v++)
      for (let u = 0; u < W; u++) {
        const d = dropDelay(u, v);
        assert.ok(d >= 0 && d < dropEnd());
        let landedAt = -1;
        let prevAlpha = 0;
        let prevY = -Infinity;
        for (let t = 0; t <= dropEnd() + 100; t += 10) {
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
        assert.deepEqual(dropPose(dropEnd() + 500, d), { dy: 0, alpha: 1, landed: true });
      }
  }
  assert.ok(dropEnd() < 2000, 'the whole section is down in under two seconds');
});

// (the owner's ask changed this rule: a step between waves once lasted a hero's own pace (230 to 420 ms); now every hero walks at
// the same brisk pace, and a climb costs no more than a level step)
test('every hero walks between waves at the same brisk pace', () => {
  assert.ok(WALK_STEP_MS > 0 && WALK_STEP_MS <= 230);
});

test('the walk between waves takes the fewest tiles: a hill in the way is walked over, not round', () => {
  let climbs = 0;
  for (let seed = 1; seed <= 30; seed++) {
    const c = road(seed, 6);
    for (let k = 1; k < c.length; k++) {
      const { board, minU, minV } = seam(c[k - 1], c[k]);
      const from = { u: 3, v: 8 };
      if (!standable(tileAt(c[k - 1].board, from.u, from.v))) continue;
      for (let v = D - DEPLOY_ROWS; v < D; v++)
        for (let u = 0; u < W; u++) {
          if (!standable(tileAt(c[k].board, u, v))) continue;
          const p = walkAcross(c[k - 1], c[k], from, { u, v });
          const old = walkAcross(c[k - 1], c[k], from, { u, v }, 2);
          // (never longer than a walker who must go round the hills, and always a tile at a time)
          assert.ok(p.length <= old.length, `seed ${seed}: ${p.length} > ${old.length}`);
          for (let i = 1; i < p.length; i++) {
            assert.equal(Math.abs(p[i].u - p[i - 1].u) + Math.abs(p[i].v - p[i - 1].v), 1);
            const a = board.tiles[(p[i - 1].v - minV) * board.w + p[i - 1].u - minU];
            const b = board.tiles[(p[i].v - minV) * board.w + p[i].u - minU];
            assert.ok(b.ground !== 'deep' && !b.scene, 'the walk never crosses deep water or scenery');
            if (b.h - a.h > 2) climbs++;
          }
        }
    }
  }
  assert.ok(climbs > 0, 'some walk climbs a step a slow climber could not');
});

test('a finished section further from the screen than the host is drawn behind it, a nearer one in front', () => {
  // (beside the host's footprint on each side: -U and -V are further off, +U and +V nearer)
  for (const r of ROTS) {
    const [w, d] = footDims(r);
    const [hw, hd] = footDims(0);
    assert.equal(liesBehind(r, -w, 0, 0), true);
    assert.equal(liesBehind(r, 0, -d, 0), true);
    assert.equal(liesBehind(r, hw, 0, 0), false);
    assert.equal(liesBehind(r, 0, hd, 0), false);
  }
  // (on real roads, of any two sections exactly one lies behind the other, as each sees it)
  for (let seed = 1; seed <= 100; seed++) {
    const sections = road(seed);
    for (const host of sections)
      for (const s of sections) {
        if (s === host) continue;
        const a = liesBehind(s.rot, s.origin.u - host.origin.u, s.origin.v - host.origin.v, host.rot);
        const b = liesBehind(host.rot, host.origin.u - s.origin.u, host.origin.v - s.origin.v, s.rot);
        assert.notEqual(a, b, `seed ${seed}`);
      }
  }
});
