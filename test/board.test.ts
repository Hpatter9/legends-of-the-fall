import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardOk, canStep, CLIMB_MAX, D, DIRS, makeBoard, sightClear, tileAt, W } from '../src/sim/board';

test('the same seed makes the same board', () => {
  assert.deepEqual(makeBoard(42), makeBoard(42));
  assert.notDeepEqual(makeBoard(42).tiles.map((t) => t.h), makeBoard(43).tiles.map((t) => t.h));
});

test('no step between neighbours is taller than a foot can climb, and every tile can be reached', () => {
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
  assert.equal(canStep({ h: 0, deco: 0 }, { h: 0, deco: 0 }, 2), 1);
  assert.equal(canStep({ h: 0, deco: 0 }, { h: 2, deco: 0 }, 2), 3);
  assert.equal(canStep({ h: 2, deco: 0 }, { h: 0, deco: 0 }, 2), 1);
  assert.equal(canStep({ h: 0, deco: 0 }, { h: 2, deco: 0 }, 1), null);
  assert.equal(canStep({ h: 0, deco: 0 }, { h: 3, deco: 0 }, 3), null);
  assert.equal(canStep({ h: 0, deco: 0 }, { h: 0, rock: true, deco: 0 }, 2), null);
});

test('a ridge between two low tiles blocks the shot', () => {
  const b = makeBoard(1);
  for (const t of b.tiles) (t.h = 0), (t.rock = false);
  assert.ok(sightClear(b, { u: 0, v: 0 }, { u: 0, v: 4 }));
  tileAt(b, 0, 2)!.h = 3;
  assert.ok(!sightClear(b, { u: 0, v: 0 }, { u: 0, v: 4 }));
});
