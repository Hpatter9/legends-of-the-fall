// Dragging a placed hero back to the bench (docs/notes/bench-titles.md): the generous drop area and the downward flick.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { flickToBench, inReturnZone, pushTrail, RETURN_REACH, type DragPoint } from '../src/benchDrop';

// (the bottom panel of a 393x852 phone)
const panel = { left: 0, right: 393, top: 560, bottom: 852 };

test('the whole panel, and a little above it, takes a hero back', () => {
  assert.ok(inReturnZone(200, 700, panel), 'the middle of the bench');
  assert.ok(inReturnZone(5, 845, panel), 'the bottom bar, at the edge');
  assert.ok(inReturnZone(390, 900, panel), 'past the bottom edge, over the gesture bar');
  assert.ok(inReturnZone(200, panel.top - RETURN_REACH + 1, panel), 'just above the panel');
  assert.ok(!inReturnZone(200, panel.top - RETURN_REACH - 20, panel), 'up on the board');
});

const line = (y0: number, y1: number, ms: number, x0 = 200, x1 = x0): DragPoint[] =>
  Array.from({ length: 9 }, (_, i) => ({ x: x0 + ((x1 - x0) * i) / 8, y: y0 + ((y1 - y0) * i) / 8, t: 1000 + (ms * i) / 8 }));

test('a quick flick down toward the bench counts', () => {
  assert.ok(flickToBench(line(300, 470, 120), panel), 'fast and straight down');
  assert.ok(flickToBench(line(300, 470, 120, 200, 240), panel), 'a little to the side');
});

test('a slow drag, a sideways one or one going up is not a flick', () => {
  assert.ok(!flickToBench(line(300, 470, 900), panel), 'too slow');
  assert.ok(!flickToBench(line(300, 340, 60), panel), 'too short');
  assert.ok(!flickToBench(line(300, 400, 120, 50, 330), panel), 'more sideways than down');
  assert.ok(!flickToBench(line(470, 300, 120), panel), 'upwards');
  assert.ok(!flickToBench([{ x: 1, y: 1, t: 0 }], panel), 'one point');
});

test('a flick that stops short of the bench does not count', () => {
  // (fast down near the top of the board, but carried on it ends well above the panel)
  assert.ok(!flickToBench(line(60, 140, 110), panel));
});

test('the trail keeps only the newest points', () => {
  const trail: DragPoint[] = [];
  for (let t = 0; t <= 2000; t += 16) pushTrail(trail, { x: 0, y: t, t });
  assert.ok(trail.length < 30 && trail[trail.length - 1].t === 2000 && 2000 - trail[0].t <= 300);
});
