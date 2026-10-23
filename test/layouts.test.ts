import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AREAS, boardOk, DEPLOY_ROWS, makeBoard, standable, tileAt, W, D } from '../src/sim/board';
import { LAYOUT_IDS, layoutFor, type LayoutId } from '../src/sim/layouts';

test('probe: how often each layout takes', () => {
  const taken: Record<string, number> = {};
  const tried: Record<string, number> = {};
  for (const area of AREAS)
    for (let s = 1; s <= 200; s++) {
      for (const id of LAYOUT_IDS) {
        const b = makeBoard(s * 7919, area, W, D, id as LayoutId);
        tried[id] = (tried[id] ?? 0) + 1;
        if (b.layout === id) taken[id] = (taken[id] ?? 0) + 1;
        assert.ok(boardOk(b), `${id} ${area} ${s}`);
      }
    }
  console.log(Object.fromEntries(LAYOUT_IDS.map((id) => [id, ((taken[id] ?? 0) / tried[id]).toFixed(2)])));
  const mix: Record<string, number> = {};
  for (let s = 1; s <= 600; s++) mix[layoutFor(s, 'highlands')] = (mix[layoutFor(s, 'highlands')] ?? 0) + 1;
  console.log(mix);
});
