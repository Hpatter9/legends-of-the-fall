import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pinchZoom, wheelZoom, zoomAbout, zoomLimits } from '../src/render/fightCam';

// FIGHT-FIXES: the fight camera is the player's to pan and zoom during a wave.

test('a pinch zooms by how far the fingers spread, within the limits', () => {
  assert.equal(pinchZoom(1, 100, 200, 0.5, 3), 2);
  assert.equal(pinchZoom(1, 100, 50, 0.5, 3), 0.5);
  assert.equal(pinchZoom(1, 100, 1000, 0.5, 3), 3);
  assert.equal(pinchZoom(1, 100, 10, 0.5, 3), 0.5);
});

test('the wheel zooms in on a turn up and out on a turn down, within the limits', () => {
  assert.ok(wheelZoom(1, -100, 0.5, 3) > 1);
  assert.ok(wheelZoom(1, 100, 0.5, 3) < 1);
  assert.equal(wheelZoom(3, -100, 0.5, 3), 3);
  assert.equal(wheelZoom(0.5, 100, 0.5, 3), 0.5);
});

test('zooming about a point keeps the world under it still', () => {
  const k0 = 2;
  const k1 = 3;
  const { cx, cy } = zoomAbout(100, 50, k0, k1, 40, -30);
  // (the world point under the fingers before and after)
  assert.ok(Math.abs(100 + 40 / k0 - (cx + 40 / k1)) < 1e-9);
  assert.ok(Math.abs(50 - 30 / k0 - (cy - 30 / k1)) < 1e-9);
  // (no zoom and no move: the camera stays)
  assert.deepEqual(zoomAbout(10, 20, 2, 2, 5, 5), { cx: 10, cy: 20 });
});

test('the limits reach out past the whole board and in to a close look', () => {
  const { lo, hi } = zoomLimits(0.9, 1.5);
  assert.ok(lo < 0.9 && hi > 2);
});
