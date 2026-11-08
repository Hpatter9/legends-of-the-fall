import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paintedFrame, paintedMotionRow } from '../src/render/paintedAnimation';

test('painted clips loop without missing frames and one-shot clips hold their final frame', () => {
  assert.deepEqual(Array.from({ length: 7 }, (_, i) => paintedFrame(i * 90, 900, true, false)), [0, 1, 2, 3, 4, 5, 0]);
  assert.deepEqual([0, 100, 200, 300, 400, 500, 600, 900].map(t => paintedFrame(t, 600, false, false)), [0, 1, 2, 3, 4, 5, 5, 5]);
  assert.equal(paintedFrame(-100, 600, true, false), 0);
  assert.equal(paintedFrame(10, 0, false, false), 5);
  for (const time of [0, 90, 1000, 987654]) {
    assert.equal(paintedFrame(time, 600, true, true), 0);
    assert.equal(paintedFrame(time, 600, false, true), 0);
  }
});

test('only the three selected painted forms use the motion atlas', () => {
  assert.equal(paintedMotionRow('fire'), 0);
  assert.equal(paintedMotionRow('smoke'), 1);
  assert.equal(paintedMotionRow('electric'), 2);
  assert.equal(paintedMotionRow('shield'), -1);
});
