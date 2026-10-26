import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { D, W } from '../src/sim/board';
import { footDims, turnTile, unturnTile, type Rot } from '../src/sim/turn';

test('WORLD-001: large rectangular sections rotate without losing tile coordinates', () => {
  const w = 12;
  const d = 16;
  for (const rot of [0, 1, 2, 3] as Rot[]) {
    const [fw, fd] = footDims(rot, w, d);
    assert.deepEqual([fw, fd], rot % 2 ? [d, w] : [w, d]);
    const visited = new Set<string>();
    for (let v = 0; v < d; v++) for (let u = 0; u < w; u++) {
      const [a, b] = turnTile(rot, u, v, w, d);
      assert.ok(a >= 0 && a < fw && b >= 0 && b < fd);
      assert.deepEqual(unturnTile(rot, a, b, w, d), [u, v]);
      visited.add(`${a},${b}`);
    }
    assert.equal(visited.size, w * d);
  }
});

test('WORLD-001: default turns retain the existing standard board footprint', () => {
  for (const rot of [0, 1, 2, 3] as Rot[]) {
    assert.deepEqual(footDims(rot), footDims(rot, W, D));
    for (const [u, v] of [[0, 0], [W - 1, D - 1], [Math.floor(W / 2), Math.floor(D / 2)]]) {
      assert.deepEqual(turnTile(rot, u, v), turnTile(rot, u, v, W, D));
    }
  }
});
