import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calamityRun } from '../src/sim/modes';
import { startedMeta } from '../src/sim/meta';
import { expeditionOf } from '../src/sim/sanctuary';
import { choices, enterNode, clearNode } from '../src/sim/tower';
import {
  cardRise, coverPoint, exitIndex, fadeAt, homeIndex, isReturn, nearestTurn, riftSpot, roomPan, walkInFrame, walkInPlan, walkOutFrame, walkOutTotal,
  WALK_OUT, WALK_OUT_CALM, type Entered,
} from '../src/hubMotion';

// The living Rift Sanctuary (CALAMITY-HUB): the ring of rifts, the room's slide, the walk into a rift and the walk back out.

test('the chosen rift stands in the middle of the ring, nearest and biggest; the others stand back on either side', () => {
  const mid = riftSpot(0), right = riftSpot(1), left = riftSpot(-1);
  assert.equal(mid.x, 0.5);
  assert.equal(mid.scale, 1);
  assert.ok(right.x > 0.5 && left.x < 0.5);
  assert.ok(Math.abs(right.x - 0.5 - (0.5 - left.x)) < 1e-9, 'the ring is even');
  assert.ok(right.scale < 1 && right.z < mid.z && right.y < mid.y, 'a rift further back is smaller and stands higher up the floor');
  // (three share the ring: whichever is chosen, the other two stand one on each side, inside the scene)
  for (let sel = 0; sel < 3; sel++) {
    const xs = [0, 1, 2].filter((i) => i !== sel).map((i) => riftSpot(nearestTurn(sel, i, 3) - sel, 3).x).sort();
    assert.ok(xs[0] < 0.4 && xs[1] > 0.6 && xs[0] > 0.1 && xs[1] < 0.9, `${sel}: ${xs}`);
  }
  // (the ring turns the short way round: from the left rift to the right one is one step back, not two forward)
  assert.equal(nearestTurn(0, 2, 3), -1);
  assert.equal(nearestTurn(1, 2, 3), 2);
  assert.equal(nearestTurn(2, 0, 3), 3);
  assert.equal(nearestTurn(0, 1, 2), 1, 'two do not go round');
  // (a whole turn of the ring brings every rift back where it was)
  for (let i = 0; i < 3; i++) assert.ok(Math.abs(riftSpot(i + 3, 3).x - riftSpot(i, 3).x) < 1e-9);
});

test('the room slides the other way to the ring, and sits still with the middle rift chosen', () => {
  assert.ok(Math.abs(roomPan(1, 3)) < 1e-12);
  assert.ok(roomPan(2, 3) < 0 && roomPan(0, 3) > 0);
  assert.ok(Math.abs(roomPan(0, 3) + roomPan(2, 3)) < 1e-12);
  assert.ok(Math.abs(roomPan(-1, 3) - roomPan(2, 3)) < 1e-12, 'the left rift turned round the back is the same place as the right one');
  assert.equal(roomPan(0, 1), 0);
  assert.equal(homeIndex(3), 1);
  assert.equal(homeIndex(1), 0);
  assert.equal(homeIndex(0), 0);
});

test('a point of the painting is placed where object-fit: cover draws it', () => {
  // (a tall picture in a square box: it fills the width, and its overflow is cut 64% from the top)
  const p = coverPoint(400, 400, 471, 1672 / 2, 941, 1672);
  const k = 400 / 941;
  assert.ok(Math.abs(p.k - k) < 1e-9);
  assert.ok(Math.abs(p.x - 471 * k) < 1e-9);
  assert.ok(Math.abs(p.y - ((400 - 1672 * k) * 0.64 + (1672 / 2) * k)) < 1e-9);
});

test('the walk into a rift: turn (only when needed), walk, flare to a full flash, then fade off the battle, in two to three seconds', () => {
  const turned = walkInPlan(false, false), centred = walkInPlan(true, false), calm = walkInPlan(false, true);
  assert.ok(turned.total >= 2000 && turned.total <= 3000, `${turned.total}`);
  assert.ok(centred.total >= 2000 && centred.total <= 3000, `${centred.total}`);
  assert.equal(centred.pan, 0);
  assert.equal(turned.total - centred.total, turned.pan);
  // (reduced motion: no walk and no turn, a short cross-fade)
  assert.equal(calm.walk, 0);
  assert.equal(calm.pan, 0);
  assert.ok(calm.total <= 600);
  // (the flash rises smoothly to full at the peak, and is never lit before the walk ends)
  let was = 0;
  for (let ms = 0; ms <= turned.peak; ms += 10) {
    const f = walkInFrame(turned, ms);
    assert.ok(f.flash >= was - 1e-9, `the flash dipped at ${ms}`);
    was = f.flash;
    if (ms < turned.pan + turned.walk) assert.equal(f.flash, 0);
  }
  assert.equal(walkInFrame(turned, turned.peak).flash, 1);
  assert.equal(walkInFrame(turned, turned.peak).walk, 1);
  assert.ok(walkInFrame(turned, turned.peak).zoom > 3, 'the camera zooms into the rift');
  // (then it fades off what is under it, to nothing, without coming back)
  assert.equal(fadeAt(turned, turned.peak), 1);
  assert.equal(fadeAt(turned, turned.total), 0);
  let last = 1;
  for (let ms = turned.peak; ms <= turned.total; ms += 10) { const k = fadeAt(turned, ms); assert.ok(k <= last + 1e-9);last = k; }
});

test('back from a crossing the party steps out of the rift it went in by, walks down under the camera and turns to the rifts', () => {
  const went: Entered = { seed: 14, index: 2, world: 'prism', made: 1 };
  assert.ok(isReturn(went, 14, 2));
  assert.ok(!isReturn(went, 14, 1), 'not until the crossing is made');
  assert.ok(!isReturn(went, 15, 2), 'another run');
  assert.ok(!isReturn(null, 14, 2));
  assert.equal(exitIndex(went, 3), 2);
  assert.equal(exitIndex(went, 1), 0, 'a guardian alone: its one rift');
  assert.equal(exitIndex({ ...went, index: 0 }, 3), 0);
  assert.equal(exitIndex(null, 3), 1, 'unknown (a reload): the middle one');
  const start = walkOutFrame(0), mid = walkOutFrame(WALK_OUT.walk / 2), end = walkOutFrame(WALK_OUT.walk + WALK_OUT.turn + WALK_OUT.settle);
  assert.equal(start.walk, 0);
  assert.equal(start.shown, 0, 'stepping out of the light');
  assert.ok(start.walking && !start.turned);
  assert.ok(mid.zoom > 1.05 && mid.zoom > start.zoom, 'the camera closes in as they walk');
  assert.ok(end.turned && !end.walking && end.walk === 1);
  assert.equal(end.zoom, 1, 'and eases back once they have turned');
});

test('the cards rise one by one from left to right while the party walks; with reduced motion they fade in together', () => {
  const rises = [0, 1, 2].map((i) => cardRise(i, false));
  for (let i = 1; i < 3; i++) {
    assert.equal(rises[i].delay - rises[i - 1].delay, WALK_OUT.stagger);
    assert.ok(rises[i].delay < WALK_OUT.walk, 'every card starts up during the walk');
  }
  assert.ok(rises[0].delay > 0);
  assert.ok(rises.every((r) => r.ms === WALK_OUT.rise));
  assert.ok(walkOutTotal(3, false) >= rises[2].delay + rises[2].ms);
  assert.ok(walkOutTotal(3, false) <= 3000);
  const calm = [0, 1, 2].map((i) => cardRise(i, true));
  assert.ok(calm.every((r) => r.delay === 0 && r.ms === WALK_OUT_CALM));
  assert.equal(walkOutTotal(3, true), WALK_OUT_CALM);
});

test('a won crossing counts as a return; the room before it does not', () => {
  const run = calamityRun(14, startedMeta(1), 'knight');
  const e = expeditionOf(run)!;
  const offers = choices(run);
  const went: Entered = { seed: run.seed, index: 2, world: 'ashen', made: e.history.length };
  assert.ok(!isReturn(went, run.seed, e.history.length));
  enterNode(run, offers[2].id);
  clearNode(run);
  assert.ok(isReturn(went, run.seed, expeditionOf(run)!.history.length));
  assert.equal(exitIndex(went, choices(run).length || 3), 2);
});
