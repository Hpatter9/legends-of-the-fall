// WAVE-DELAY (docs/notes/wave-delay.md): what may slow or stop a fight in the middle of a wave. The slow moment for a fall is a boss's
// alone (it was every foe of 400 health or more: about five a wave past the early stages). The large sheets a fight draws from go
// to the graphics card ahead of it, one a frame, and stay there while it lasts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FALL_SLOW_MS, fallSlowMs, ultCastBeat } from '../src/render/fxRules';
import { mayRelease, nextToWarm } from '../src/render/texReadyRules';

test('the slow moment for a fall is a boss\'s alone, and none with the screen kept still', () => {
  assert.equal(fallSlowMs(true, false), FALL_SLOW_MS);
  assert.equal(fallSlowMs(false, false), 0);
  assert.equal(fallSlowMs(true, true), 0);
  assert.equal(fallSlowMs(false, true), 0);
  assert.ok(FALL_SLOW_MS > 0 && FALL_SLOW_MS <= 1000);
});

test('the kept sheets go to the graphics card one a frame, in order, and are held there while a fight is on', () => {
  const on = new Set<string>(['b']);
  const kept = ['a', 'b', 'c', 'd'];
  const order: string[] = [];
  for (let frame = 0; frame < 10; frame++) {
    const next = nextToWarm(kept, (x) => on.has(x));
    if (!next) break;
    order.push(next);
    on.add(next);
  }
  assert.deepEqual(order, ['a', 'c', 'd']);
  assert.equal(nextToWarm(kept, (x) => on.has(x)), null);
  assert.equal(nextToWarm([], () => false), null);
  assert.equal(mayRelease(true), false);
  assert.equal(mayRelease(false), true);
});

test('an ultimate\'s short version (Auto\'s, or a second one\'s) never slows or stops the fight; the full moment keeps its beat', () => {
  assert.deepEqual(ultCastBeat(false), { slow: 0, stop: 0 });
  const full = ultCastBeat(true);
  assert.ok(full.slow > 0 && full.stop > 0);
});
