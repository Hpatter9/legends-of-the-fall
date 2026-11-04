// FIXES-4: a marked patch's rim (`render/groundRules.ts`) runs round the patch, not between its tiles, and along a step in it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rimEdges, type PatchTile } from '../src/render/groundRules';

const square = (n: number, h = 0): PatchTile[] => Array.from({ length: n * n }, (_, i) => ({ U: i % n, V: Math.floor(i / n), h }));

test('a lone tile is rimmed on all four edges', () => {
  const t = { U: 0, V: 0, h: 0 };
  assert.equal(rimEdges(t, [t]).length, 4);
});

test('a 3x3 patch is rimmed round its outside only', () => {
  const p = square(3);
  const total = p.reduce((s, t) => s + rimEdges(t, p).length, 0);
  assert.equal(total, 12);
  assert.deepEqual(rimEdges({ U: 1, V: 1, h: 0 }, p), []);
  // (the top corner tile, U 0 V 0: its up-right (V - 1) and up-left (U - 1) edges)
  assert.deepEqual(rimEdges({ U: 0, V: 0, h: 0 }, p), [[0, 1], [3, 0]]);
});

test('a step inside a patch is rimmed', () => {
  const p = [{ U: 0, V: 0, h: 0 }, { U: 1, V: 0, h: 2 }];
  assert.ok(rimEdges(p[0], p).some(([a, b]) => a === 1 && b === 2));
  assert.ok(rimEdges(p[1], p).some(([a, b]) => a === 3 && b === 0));
});
