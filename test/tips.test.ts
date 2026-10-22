import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSeen, placeBubble, saveSeen, TIPS, type TipId } from '../src/tips';

/** A store in memory, like localStorage. */
const memory = (start?: string) => {
  const m = new Map<string, string>(start === undefined ? [] : [['legends.tips', start]]);
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m };
};

test('the seen tips are kept, and junk in the store is ignored', () => {
  const store = memory();
  assert.equal(loadSeen(store).size, 0);
  saveSeen(new Set<TipId>(['home', 'fight']), store);
  assert.deepEqual([...loadSeen(store)].sort(), ['fight', 'home']);
  assert.equal(loadSeen(memory('not json')).size, 0);
  assert.equal(loadSeen(memory('{"a":1}')).size, 0);
  assert.deepEqual([...loadSeen(memory('["mana","nope"]'))], ['mana']);
});

test('every tip has its text and a page', () => {
  for (const id of Object.keys(TIPS) as TipId[]) {
    assert.ok(TIPS[id].text.length > 0);
    assert.ok(TIPS[id].page === 'home' || TIPS[id].page === 'game');
  }
});

test('a bubble goes beside its anchor, clear of it, and inside the screen', () => {
  const view = { w: 393, h: 852 };
  const size = { w: 280, h: 90 };
  // a button low on the phone: the bubble goes above it, its tail at the button's middle
  const low = placeBubble({ x: 300, y: 780, w: 80, h: 40 }, size, view);
  assert.equal(low.side, 'above');
  assert.equal(low.y + size.h, 780 - 12);
  assert.ok(low.x >= 8 && low.x + size.w <= view.w - 8);
  assert.equal(low.ax, 340 - low.x);
  // at the top of the screen there is no room above, so the bubble goes below
  assert.equal(placeBubble({ x: 100, y: 10, w: 80, h: 30 }, size, view).side, 'below');
});
