import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GHOST_MS, isGhostClick, type TapNode } from '../src/tapGuardRules';

// MENU-GLITCH: a tap that opens a panel on pointerup must not also click what of the panel is under the finger.
class N implements TapNode {
  kids: N[] = [];
  isConnected = true;
  constructor(public parent: N | null = null) {
    parent?.kids.push(this);
  }
  contains(o: TapNode | null): boolean {
    for (let n = o as N | null; n; n = n.parent) if (n === this) return true;
    return false;
  }
}

test('a click on what the finger went down on, inside it or round it, is the tap’s own', () => {
  const page = new N();
  const button = new N(page);
  const label = new N(button);
  assert.equal(isGhostClick(button, button, 10), false);
  assert.equal(isGhostClick(label, button, 10), false);
  assert.equal(isGhostClick(button, label, 10), false);
  assert.equal(isGhostClick(label, page, 10), false);
});

test('a click landing on a panel the tap opened is a ghost', () => {
  const page = new N();
  const canvas = new N(page);
  const sheet = new N(page);
  const row = new N(sheet);
  assert.equal(isGhostClick(canvas, row, 20), true);
  assert.equal(isGhostClick(canvas, sheet, 20), true);
});

test('no tap before it, a tap long gone, or a redrawn list: the click passes', () => {
  const page = new N();
  const old = new N(page);
  const fresh = new N(page);
  assert.equal(isGhostClick(null, fresh, 0), false);
  assert.equal(isGhostClick(old, fresh, GHOST_MS + 1), false);
  old.isConnected = false;
  assert.equal(isGhostClick(old, fresh, 10), false);
});
