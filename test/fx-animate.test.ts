// FX-ANIMATE: every painted still is one picture, so its life is in its pose. These check that each kind of effect moves, and that none of it blinks.
import test from 'node:test';
import assert from 'node:assert/strict';
import { flicker, paintedPose } from '../src/render/cinematicRules';
import type { Family } from '../src/render/fxRules';

const FAMILIES: Family[] = ['orb', 'hit', 'explosion', 'slash', 'circle', 'rune', 'shield', 'status', 'gather', 'nova', 'cross', 'puff', 'smoke', 'sparkle', 'aura', 'vortex', 'pillar', 'strike', 'spikes', 'wave', 'flame'];
/** The pose every 50 ms of a held (looping) effect, mid-life. */
const held = (family: Family, form?: string) => Array.from({ length: 40 }, (_, i) => paintedPose(family, 0.5, 600 + i * 50, true, false, form));
const range = (xs: number[]) => Math.max(...xs) - Math.min(...xs);

test('a flame flickers: its height, lean and lift wander, smoothly', () => {
  const poses = held('flame', 'fire');
  assert.ok(range(poses.map((p) => p.y)) > 0.12);
  assert.ok(range(poses.map((p) => p.turn)) > 0.04);
  // (smooth: no two samples 50 ms apart jump by more than 0.3, which is under a tenth in a 60 fps frame)
  for (let i = 1; i < poses.length; i++) assert.ok(Math.abs(poses[i].y - poses[i - 1].y) < 0.3);
  assert.ok(Math.abs(flicker(1234, 1)) <= 1);
});

test('every held painted family keeps moving (breathes, turns, flickers or drifts), and none dims out', () => {
  for (const family of FAMILIES) {
    if (family === 'slash' || family === 'wave' || family === 'hit' || family === 'explosion' || family === 'nova' || family === 'strike' || family === 'pillar' || family === 'spikes' || family === 'smoke' || family === 'puff') continue;
    const poses = held(family);
    const moves = range(poses.map((p) => p.x)) + range(poses.map((p) => p.y)) + range(poses.map((p) => p.turn)) + range(poses.map((p) => p.dy));
    assert.ok(moves > 0.05, `${family} held still`);
    const a = poses.map((p) => p.alpha);
    assert.ok(range(a) < 1e-9 && a[0] > 0.4, `${family} blinked`);
  }
});

test('a burst slams out and keeps swelling to its end; a fiery one billows upward and twists', () => {
  const at = (t: number, form?: string) => paintedPose('explosion', t, t * 600, false, false, form);
  assert.ok(at(0.3).x > at(0.05).x && at(0.8).x > at(0.5).x);
  assert.ok(at(0.9, 'fire').dy < at(0.1, 'fire').dy);
  assert.ok(at(0.9, 'fire').dy < at(0.9, 'ice').dy);
  assert.ok(at(0.9, 'fire').turn > at(0.1, 'fire').turn);
});

test('smoke rises, a bolt drops into place, spikes jab up out of the ground with their foot fixed', () => {
  const smoke = (t: number) => paintedPose('smoke', t, t * 900, false, false);
  assert.ok(smoke(0.8).dy < smoke(0.1).dy);
  const strike = (t: number) => paintedPose('strike', t, t * 400, false, false);
  assert.ok(strike(0.02).dy < strike(0.5).dy && strike(0.9).dy > -0.05);
  const spikes = (t: number) => paintedPose('spikes', t, t * 500, false, false);
  assert.ok(spikes(0.4).y > spikes(0.05).y);
  // (the foot stays put: the sprite's centre moves down by the height it has not yet grown, over half a frame)
  for (const t of [0.05, 0.2, 0.5]) assert.ok(Math.abs(spikes(t).dy - (1 - spikes(t).y) * 0.5) < 1e-9);
});

test('a ring turns and breathes; reduced motion holds every pose still at its own size', () => {
  const ring = held('circle', 'rune');
  assert.ok(ring[39].turn > ring[0].turn && range(ring.map((p) => p.x)) > 0.03);
  for (const family of FAMILIES) {
    const p = paintedPose(family, 0.5, 700, true, true, 'fire');
    assert.deepEqual([p.x, p.y, p.turn, p.dx, p.dy], [1, 1, 0, 0, 0], family);
  }
});
