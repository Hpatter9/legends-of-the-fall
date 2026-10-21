import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DEAD_MOVE, easeTo, framing, settle, viewFor } from '../src/render/cameraRules';
import { liftClear, placeLabel } from '../src/render/labelRules';
import { BOSS_TITLES, titleOf } from '../src/render/bossTitles';
import { BOSS_BANDS, BOSS_IDS, FOE_BANDS } from '../src/sim/foes';

describe('the fight camera', () => {
  it('frames the fighters with room for bars and effects', () => {
    const box = framing([{ x: 0, y: 100, tall: 40 }, { x: 100, y: 50, tall: 60 }])!;
    assert.ok(box.x0 < 0 && box.x1 > 100 && box.y0 < -10 && box.y1 > 100);
    assert.equal(framing([]), null);
  });
  it('zooms in as they bunch up and out as they spread, within the limits', () => {
    const near = viewFor(framing([{ x: 0, y: 0, tall: 40 }, { x: 40, y: 0, tall: 40 }])!, 393, 500, 1, 0.6, 1.8);
    const far = viewFor(framing([{ x: 0, y: 0, tall: 40 }, { x: 900, y: 0, tall: 40 }])!, 393, 500, 1, 0.6, 1.8);
    assert.equal(near.zoom, 1.8);
    assert.equal(far.zoom, 0.6);
    const mid = viewFor(framing([{ x: 0, y: 0, tall: 40 }, { x: 300, y: 0, tall: 40 }])!, 393, 500, 1, 0.6, 1.8);
    assert.ok(mid.zoom > 0.6 && mid.zoom < 1.8);
  });
  it('keeps the box centred', () => {
    const v = viewFor({ x0: 0, x1: 200, y0: 0, y1: 100 }, 400, 400, 1, 0.5, 2);
    assert.deepEqual([v.cx, v.cy], [100, 50]);
  });
  it('holds still for a small move and follows a big one', () => {
    const held = { cx: 0, cy: 0, zoom: 1 };
    assert.equal(settle(held, { cx: DEAD_MOVE - 2, cy: 0, zoom: 1.02 }), held);
    const big = { cx: DEAD_MOVE * 3, cy: 0, zoom: 1 };
    assert.equal(settle(held, big), big);
    const zoomed = { cx: 0, cy: 0, zoom: 1.3 };
    assert.equal(settle(held, zoomed), zoomed);
  });
  it('eases without overshooting or jumping', () => {
    let v = 0;
    let last = 0;
    for (let i = 0; i < 100; i++) {
      v = easeTo(v, 100, 16, 400);
      assert.ok(v >= last && v <= 100);
      assert.ok(v - last < 20);
      last = v;
    }
    assert.ok(v > 90);
    assert.equal(easeTo(5, 5, 16, 400), 5);
  });
});

describe('floating labels', () => {
  const lab = (x: number, y: number) => ({ x, y, w: 60, h: 16 });
  it('leaves a clear spot alone', () => {
    assert.equal(liftClear([lab(0, 0)], lab(200, 0)), 0);
    assert.equal(liftClear([], lab(0, 0)), 0);
  });
  it('lifts a label clear of one it would cover', () => {
    const lift = liftClear([lab(0, 0)], lab(10, -4));
    assert.ok(lift >= 12 + 2);
    assert.equal(liftClear([lab(0, 0)], lab(10, -4 - lift)), 0);
  });
  it('clears a whole stack of them, fading ones included', () => {
    const shown = [lab(0, 0), lab(0, -18), lab(5, -36)];
    const lift = liftClear(shown, lab(0, -2));
    const me = lab(0, -2 - lift);
    for (const o of shown) assert.ok(me.y <= o.y - o.h || me.y - me.h >= o.y, 'overlaps');
  });
});

describe('boss intros', () => {
  it('every boss has a title of its own', () => {
    for (const id of BOSS_IDS) assert.ok(BOSS_TITLES[id], id);
    for (const band of BOSS_BANDS) assert.ok(BOSS_TITLES[FOE_BANDS[band][0]], band);
    assert.ok(titleOf('nobody').length > 0);
  });
});

describe('placing labels in the board room', () => {
  const lab = (x: number, y: number) => ({ x, y, w: 60, h: 16 });
  const view = { x0: 0, x1: 300, y0: 0, y1: 300 };
  it('pulls a label in from the screen edge', () => {
    assert.equal(placeLabel([], lab(5, 100), view).x, 30);
    assert.equal(placeLabel([], lab(299, 100), view).x, 270);
  });
  it('stacks downward when there is no room above', () => {
    const shown = [lab(100, 20)];
    const p = placeLabel(shown, lab(100, 20), view);
    assert.ok(p.y > 20);
    assert.equal(liftClear(shown, { ...lab(100, p.y) }), 0);
  });
});
