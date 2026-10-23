import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Rng } from '../src/sim/rng';
import { chewBob, FRAME, goatFrame, GOAT_SPEED, HOP_MS, HOP_PX, hopLift, newGoat, NIBBLE_MS, stepGoat, tapGoat, type Ground } from '../src/render/duchessRules';

const ground: Ground = { min: 40, max: 240, friends: [100, 180] };

/** Run her for `ms` of game time and give back where she has been. */
function run(seed: number, ms: number, g = newGoat(120), gr = ground, still = false) {
  const rng = new Rng(seed);
  const rand = () => rng.next();
  const seen = { modes: new Set<string>(), xs: [] as number[] };
  for (let t = 0; t < ms; t += 50) {
    stepGoat(g, 50, t, gr, rand, still);
    seen.modes.add(g.mode);
    seen.xs.push(g.x);
  }
  return { g, seen };
}

test('Duchess stays on her ground', () => {
  for (let seed = 1; seed < 20; seed++) {
    const { seen } = run(seed, 120000);
    for (const x of seen.xs) assert.ok(x >= ground.min && x <= ground.max, `x ${x}`);
  }
});

test('she grazes, ambles, and goes to nibble at a hero', () => {
  const seen = new Set<string>();
  let nibbledNear = false;
  for (let seed = 1; seed < 20; seed++) {
    const rng = new Rng(seed);
    const g = newGoat(120);
    for (let t = 0; t < 120000; t += 50) {
      stepGoat(g, 50, t, ground, () => rng.next());
      seen.add(g.mode);
      if (g.mode === 'nibble' && ground.friends.some((f) => Math.abs(f - g.x) <= 14.5)) nibbledNear = true;
    }
  }
  for (const m of ['graze', 'walk', 'nibble']) assert.ok(seen.has(m), m);
  assert.ok(nibbledNear, 'a nibble happens beside a hero');
});

test('she walks at an amble, not a dash', () => {
  const g = newGoat(40);
  g.mode = 'walk';
  g.to = 240;
  g.then = 'graze';
  stepGoat(g, 1000, 0, ground, () => 0.5);
  assert.ok(Math.abs(g.x - 40 - GOAT_SPEED) < 0.01);
});

test('a tap is one hop, over by itself, and a second tap inside it is ignored', () => {
  const g = newGoat(100);
  assert.equal(hopLift(g, 0), 0);
  assert.ok(tapGoat(g, 1000));
  assert.equal(tapGoat(g, 1100), false);
  let top = 0;
  for (let t = 1000; t <= 1000 + HOP_MS; t += 10) top = Math.max(top, hopLift(g, t));
  assert.ok(top > HOP_PX - 0.5 && top <= HOP_PX);
  assert.equal(hopLift(g, 1000 + HOP_MS), 0, 'back on the ground');
  stepGoat(g, 50, 1000 + HOP_MS, ground, () => 0.5);
  assert.equal(g.mode, 'graze');
  assert.ok(tapGoat(g, 3000), 'she can hop again later');
});

test('a hop never leaves her anywhere but where she was', () => {
  const g = newGoat(100);
  tapGoat(g, 0);
  for (let t = 0; t <= HOP_MS + 100; t += 50) stepGoat(g, 50, t, ground, () => 0.5);
  assert.equal(g.x, 100);
});

test('under reduced motion she stands still, but still hops when tapped', () => {
  const { g, seen } = run(3, 60000, newGoat(120), ground, true);
  assert.equal(g.x, 120);
  assert.deepEqual([...seen.modes], ['graze']);
  assert.equal(chewBob(g, 1000, true), 0);
  tapGoat(g, 61000);
  assert.equal(g.mode, 'hop');
});

test('her frames are on the sheet, facing the way she walks', () => {
  const g = newGoat(100);
  g.face = -1;
  assert.equal(goatFrame(g), 1);
  g.face = 1;
  assert.equal(goatFrame(g), 4);
  g.mode = 'walk';
  for (let s = 0; s < 40; s += 1) {
    g.steps = s;
    const f = goatFrame(g);
    assert.ok(f >= 3 && f <= 5);
  }
  assert.equal(FRAME, 48);
});

test('chewing is a one-pixel bob, only while she grazes or nibbles', () => {
  const g = newGoat(100);
  const seen = new Set<number>();
  for (let t = 0; t < 2000; t += 100) seen.add(chewBob(g, t, false));
  assert.deepEqual([...seen].sort(), [0, 1]);
  g.mode = 'walk';
  assert.equal(chewBob(g, 100, false), 0);
  assert.ok(NIBBLE_MS > 1000);
});
