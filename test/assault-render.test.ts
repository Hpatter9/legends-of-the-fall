// ASSAULT-RENDER (docs/notes/assault-0.md, "The render fix"): the field's chunk culling. Every chunk any of whose tiles shows inside
// the phone's screen is wanted, at Near and at Mid, on the three upright phone sizes, wherever the camera looks; and the camera's focus
// is drawn halfway down the play area between the info panel and the buttons.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildField, placeholderStencil } from '../src/sim/assault/stencil';
import { CHUNK, chunkHeights, chunksInView, focusOnScreen, screenRect, viewRect, type FieldCam } from '../src/render/fieldCull';
import { FOOT, HH, rawAt, TH, TW } from '../src/render/iso';
import { detailFor } from '../src/render/fieldDetail';

const board = buildField(placeholderStencil(), 1).board;
const { w, d } = board;
const hOf = (u: number, v: number) => (u >= 0 && v >= 0 && u < w && v < d ? board.tiles[v * w + u].h : -FOOT / HH);
const heights = chunkHeights(w, d, hOf);

/** A tile's own pixels on the screen: its top's diamond and its side faces down to its lower front neighbour. */
function tileOnScreen(u: number, v: number, cam: FieldCam, focus: [number, number]): [number, number, number, number] {
  const h = hOf(u, v);
  const [x, y] = rawAt(u, v, h);
  const low = Math.min(h, hOf(u + 1, v), hOf(u, v + 1));
  const sx = (px: number) => focus[0] + (px - cam.x) * cam.zoom;
  const sy = (py: number) => focus[1] + (py - cam.y) * cam.zoom;
  return [sx(x - TW / 2), sx(x + TW / 2), sy(y - TH / 2), sy(y + TH / 2 + (h - low) * HH)];
}

const PHONES: [number, number][] = [
  [411, 915],
  [393, 852],
  [360, 780],
  [412, 915],
];

test('every chunk with a tile on the screen is wanted, at Near and Mid, on every phone, wherever the camera looks', () => {
  let checked = 0;
  for (const [vw, vh] of PHONES)
    for (const zoom of [0.8, 0.5, 0.36, 0.22, 0.15])
      for (let cu = 0; cu <= 100; cu += 20)
        for (let cv = 0; cv <= 100; cv += 20) {
          const [x, y] = rawAt(cu, cv, 2);
          const cam = { x, y, zoom };
          // (with and without a play area: the bench's readout above and buttons below)
          for (const play of [undefined, { top: 120, bottom: vh - 64 }]) {
            const focus = focusOnScreen(vw, vh, play);
            const want = new Set(chunksInView(viewRect(cam, vw, vh, focus), w, d, heights));
            for (let v = 0; v < d; v++)
              for (let u = 0; u < w; u++) {
                const [x0, x1, y0, y1] = tileOnScreen(u, v, cam, focus);
                if (x1 < 0 || x0 > vw || y1 < 0 || y0 > vh) continue;
                const key = Math.floor(v / CHUNK) * 100 + Math.floor(u / CHUNK);
                assert.ok(want.has(key), `tile (${u}, ${v}) shows on a ${vw} x ${vh} screen at zoom ${zoom} looking at (${cu}, ${cv}), but chunk ${key} is not wanted`);
                checked++;
              }
          }
        }
  assert.ok(checked > 100000);
});

test('the screen rectangle is the whole screen in world pixels (CSS pixels, the zoom alone; no device pixel ratio)', () => {
  const cam = { x: 1000, y: 2000, zoom: 0.25 };
  const r = screenRect(cam, 400, 800, focusOnScreen(400, 800));
  assert.deepEqual(r, { x0: 200, x1: 1800, y0: 400, y1: 3600 });
  // phase 0's bench saw a 2.6th of this, in the top-left corner, on a phone whose pixel ratio was 2.6
  assert.ok((r.x1 - r.x0) * cam.zoom === 400 && (r.y1 - r.y0) * cam.zoom === 800);
});

test('the camera focus is drawn halfway down the play area, between the info panel and the buttons', () => {
  assert.deepEqual(focusOnScreen(411, 915), [205.5, 457.5]);
  assert.deepEqual(focusOnScreen(411, 915, { top: 140, bottom: 855 }), [205.5, 497.5]);
  // (a play area off the screen is held to it)
  assert.deepEqual(focusOnScreen(400, 800, { top: -50, bottom: 2000 }), [200, 400]);
});

test('at Near and Mid the cull keeps the work small: a phone screen wants under half the field at Near', () => {
  for (const [vw, vh] of PHONES)
    for (const zoom of [0.5, 0.22]) {
      assert.notEqual(detailFor(zoom, 'near'), 'far');
      const [x, y] = rawAt(50, 50, 2);
      const n = chunksInView(viewRect({ x, y, zoom }, vw, vh, focusOnScreen(vw, vh)), w, d, heights).length;
      assert.ok(n <= (zoom >= 0.35 ? 45 : 80), `${n} chunks at zoom ${zoom} on ${vw} x ${vh}`);
    }
});
