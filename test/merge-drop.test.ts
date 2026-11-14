import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BODY_PAD, bodyBox, CARD_PAD, mergeDropTarget, type DropBody } from '../src/mergeDropRules';

// EASY-MERGE: a held hero merges into a match when let go over its drawn body, padded a little, so a drop a little off still merges.
const body = (id: number, x: number, y: number, match = true, w = 40, h = 60): DropBody => ({ id, box: { x, y, w, h }, match });

test('a drop on the body, or within its pad, merges', () => {
  const m = [body(7, 100, 100)];
  assert.equal(mergeDropTarget(m, [{ x: 120, y: 130 }]), 7);
  // (off the body's right edge, but inside the pad: an empty tile next to it, and still a merge)
  assert.equal(mergeDropTarget(m, [{ x: 140 + BODY_PAD - 2, y: 130 }]), 7);
  assert.equal(mergeDropTarget(m, [{ x: 120, y: 100 - BODY_PAD + 2 }]), 7);
});

test('a drop clearly away from the match does not merge', () => {
  const m = [body(7, 100, 100)];
  assert.equal(mergeDropTarget(m, [{ x: 140 + BODY_PAD + 6, y: 130 }]), null);
  assert.equal(mergeDropTarget(m, [{ x: 20, y: 300 }]), null);
});

test('no match means no merge, even squarely on a body', () => {
  assert.equal(mergeDropTarget([body(3, 100, 100, false)], [{ x: 120, y: 130 }]), null);
  assert.equal(mergeDropTarget([], [{ x: 120, y: 130 }]), null);
});

test('where two matches are near, the nearest body centre wins', () => {
  const m = [body(1, 100, 100), body(2, 150, 100)];
  // (between them, in both pads: nearer the second's centre)
  assert.equal(mergeDropTarget(m, [{ x: 146, y: 130 }]), 2);
  assert.equal(mergeDropTarget(m, [{ x: 143, y: 130 }]), 1);
});

test("the pad never takes a drop squarely on another hero's body", () => {
  const m = [body(1, 100, 100), body(9, 150, 100, false)];
  // (on the non-match's body, within the match's pad: that drop swaps or places as before)
  assert.equal(mergeDropTarget(m, [{ x: 152, y: 130 }]), null);
  // (but on the match's own body, where the two overlap, the match wins)
  const o = [body(1, 100, 100), body(9, 130, 100, false)];
  assert.equal(mergeDropTarget(o, [{ x: 135, y: 130 }]), 1);
});

test("either the finger or the held hero's feet over it may count", () => {
  const m = [body(5, 100, 100)];
  // (the finger is below the body's pad; the held hero's feet, 24 px above it, are on it)
  assert.equal(mergeDropTarget(m, [{ x: 120, y: 190 }, { x: 120, y: 166 }]), 5);
  assert.equal(mergeDropTarget(m, [{ x: 120, y: 190 }]), null);
});

test('a bench card takes the smaller pad', () => {
  const c = [body(4, 0, 0, true, 60, 80)];
  assert.equal(mergeDropTarget(c, [{ x: 60 + CARD_PAD - 1, y: 40 }], CARD_PAD), 4);
  assert.equal(mergeDropTarget(c, [{ x: 60 + CARD_PAD + 4, y: 40 }], CARD_PAD), null);
});

test('a body box is measured in screen px, so it grows with the zoom and stands on the feet wherever they are drawn', () => {
  const near = bodyBox(200, 400, 40, 32, 1);
  const close = bodyBox(200, 400, 40, 32, 2);
  assert.deepEqual(near, { x: 184, y: 360, w: 32, h: 46 });
  assert.deepEqual(close, { x: 168, y: 320, w: 64, h: 92 });
  // (a hero on a hill: its feet are drawn higher, and so is its box)
  assert.equal(bodyBox(200, 330, 40, 32, 1).y, 290);
});
