import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardOk, canStep, CLIMB_MAX, D, DEPLOY_ROWS, DIRS, FLY_JUMP, makeBoard, standable, AREAS, sightClear, tileAt, W } from '../src/sim/board';

test('the same seed makes the same board', () => {
  assert.deepEqual(makeBoard(42), makeBoard(42));
  assert.notDeepEqual(makeBoard(42).tiles.map((t) => t.h), makeBoard(43).tiles.map((t) => t.h));
});

test('no face between neighbours is taller than the tallest jump climbs, and every tile can be reached', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const b = makeBoard(seed);
    assert.equal(b.tiles.length, W * D);
    for (let v = 0; v < D; v++)
      for (let u = 0; u < W; u++)
        for (const [du, dv] of DIRS) {
          const n = tileAt(b, u + du, v + dv);
          if (n) assert.ok(Math.abs(n.h - tileAt(b, u, v)!.h) <= CLIMB_MAX, `seed ${seed} at ${u},${v}`);
        }
    assert.ok(boardOk(b), `seed ${seed}`);
  }
});

test('the land rolls: boards are not flat', () => {
  const tall = [1, 2, 3, 4, 5, 6, 7, 8].map((s) => Math.max(...makeBoard(s).tiles.map((t) => t.h)) - Math.min(...makeBoard(s).tiles.map((t) => t.h)));
  assert.ok(tall.some((d) => d >= 2), `height ranges ${tall}`);
});

test('a climb costs more, a cliff cannot be stepped, and a boulder cannot be stood on', () => {
  const at = (h: number) => ({ h, deco: 0 });
  assert.equal(canStep(at(0), at(0), 2), 1);
  assert.equal(canStep(at(0), at(2), 2), 3);
  assert.equal(canStep(at(2), at(0), 2), 1);
  assert.equal(canStep(at(0), at(2), 1), null);
  assert.equal(canStep(at(0), at(3), 3), 4, 'a jump of 3 climbs 3');
  assert.equal(canStep(at(0), at(3), 2), null, 'a jump of 2 does not');
  assert.equal(canStep({ h: 0, deco: 0 }, { h: 0, rock: true, deco: 0 }, 2), null);
});

test('a drop may be one further than a climb', () => {
  const at = (h: number) => ({ h, deco: 0 });
  for (const jump of [1, 2, 3, 4]) {
    assert.notEqual(canStep(at(jump), at(0), jump), null, `jump ${jump} drops ${jump}`);
    assert.notEqual(canStep(at(jump + 1), at(0), jump), null, `jump ${jump} drops ${jump + 1}`);
    assert.equal(canStep(at(jump + 2), at(0), jump), null, `jump ${jump} cannot drop ${jump + 2}`);
    assert.equal(canStep(at(0), at(jump + 1), jump), null, `jump ${jump} cannot climb ${jump + 1}`);
  }
  assert.equal(canStep(at(0), at(6), FLY_JUMP), 1, 'a flier goes over anything');
});

test('a ridge between two low tiles blocks the shot', () => {
  const b = makeBoard(1);
  for (const t of b.tiles) (t.h = 0), (t.rock = false);
  assert.ok(sightClear(b, { u: 0, v: 0 }, { u: 0, v: 4 }));
  tileAt(b, 0, 2)!.h = 3;
  assert.ok(!sightClear(b, { u: 0, v: 0 }, { u: 0, v: 4 }));
});

test('rolling land has real height: several levels, tall faces, and a way up by stairs', () => {
  let tall = 0;
  let steep = 0;
  for (let seed = 1; seed <= 120; seed++) {
    const b = makeBoard(seed, 'highlands', W, D, 'classic');
    assert.ok(new Set(b.tiles.map((t) => t.h)).size >= 3, `seed ${seed} has ${new Set(b.tiles.map((t) => t.h)).size} levels`);
    let face = 0;
    for (let v = 0; v < D; v++)
      for (let u = 0; u < W; u++)
        for (const [du, dv] of DIRS) {
          const n = tileAt(b, u + du, v + dv);
          if (n) face = Math.max(face, Math.abs(n.h - tileAt(b, u, v)!.h));
        }
    if (face >= 3) tall++;
    if (face >= 2) steep++;
  }
  assert.ok(steep >= 115, `${steep} of 120 boards have a cliff`);
  assert.ok(tall >= 60, `${tall} of 120 boards have a face of three or more`);
});

test('every standable tile is reachable from every deploy tile by every jump in use, in every area', () => {
  for (const area of AREAS)
    for (let seed = 1; seed <= 60; seed++) {
      const b = makeBoard(seed * 31, area);
      for (let v = D - DEPLOY_ROWS; v < D; v++) for (let u = 0; u < W; u++) assert.ok(standable(tileAt(b, u, v)), `${area} ${seed}: deploy tile ${u},${v}`);
      for (const jump of [1, 2, 3, 4, FLY_JUMP]) {
        const from = (D - 1) * W;
        const seen = new Set([from]);
        const queue = [from];
        while (queue.length) {
          const i = queue.shift()!;
          for (const [du, dv] of DIRS) {
            const u = (i % W) + du;
            const v = Math.floor(i / W) + dv;
            const n = tileAt(b, u, v);
            if (n && !seen.has(v * W + u) && canStep(b.tiles[i], n, jump) !== null) (seen.add(v * W + u), queue.push(v * W + u));
          }
        }
        b.tiles.forEach((t, i) => assert.ok(!standable(t) || seen.has(i), `${area} ${seed}: tile ${i} unreached by jump ${jump}`));
      }
    }
});

test('a good jumper can take a cliff a short one has to go round', () => {
  // (some board has a face of 3 or 4 that a jump of 2 cannot climb but a jump of 4 can)
  let found = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const b = makeBoard(seed, 'highlands', W, D, 'classic');
    for (let i = 0; i < b.tiles.length; i++)
      for (const [du, dv] of DIRS) {
        const n = tileAt(b, (i % W) + du, Math.floor(i / W) + dv);
        if (n && canStep(b.tiles[i], n, 2) === null && canStep(b.tiles[i], n, 4) !== null) found++;
      }
  }
  assert.ok(found > 40, `${found} cliffs`);
});
