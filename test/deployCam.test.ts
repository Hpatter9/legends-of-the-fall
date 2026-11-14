import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DEPLOY_COMFORT, DEPLOY_MAX_K, DEPLOY_PAD, deployBox, deployFit, deployView } from '../src/render/deployCam';
import { rawAt, TH, TW } from '../src/render/iso';
import { DEPLOY_ROWS } from '../src/sim/board';

/** The placement tiles' tops of a flat board `w` across and `d` deep (the near `DEPLOY_ROWS` rows). */
const rows = (w: number, d: number) => {
  const tops = [];
  for (let v = d - DEPLOY_ROWS; v < d; v++) for (let u = 0; u < w; u++) {
    const [x, y] = rawAt(u, v, 0);
    tops.push({ x, y });
  }
  return tops;
};
/** The whole board's tops. */
const all = (w: number, d: number) => {
  const tops = [];
  for (let v = 0; v < d; v++) for (let u = 0; u < w; u++) {
    const [x, y] = rawAt(u, v, 0);
    tops.push({ x, y });
  }
  return tops;
};

describe('the deploy camera', () => {
  it('boxes the placement tiles with room above for the heroes standing on them', () => {
    const box = deployBox([{ x: 0, y: 0 }, { x: 64, y: 32 }])!;
    assert.deepEqual(box, { x0: -TW / 2 - DEPLOY_PAD.side, x1: 64 + TW / 2 + DEPLOY_PAD.side, y0: -TH / 2 - DEPLOY_PAD.top, y1: 32 + TH / 2 + DEPLOY_PAD.bottom });
    assert.equal(deployBox([]), null);
  });
  it('frames the placement rows closer than the whole board, centred on them', () => {
    const near = deployBox(rows(8, 11))!;
    const whole = deployBox(all(8, 11))!;
    assert.ok(near.x1 - near.x0 < whole.x1 - whole.x0);
    const v = deployView(near, 393, 520, 0.7, 0.5, 4);
    assert.ok(v.zoom > 1, `zoomed in: ${v.zoom}`);
    assert.equal(v.cx, (near.x0 + near.x1) / 2);
    assert.equal(v.cy, (near.y0 + near.y1) / 2);
    // (the box fits the room at that zoom)
    const k = 0.7 * v.zoom;
    assert.ok((near.x1 - near.x0) * k <= 393 + 1e-6 && (near.y1 - near.y0) * k <= 520 + 1e-6);
  });
  it('never comes closer than DEPLOY_MAX_K screen px a world px, nor past the free camera\'s most', () => {
    const tiny = deployBox([{ x: 0, y: 0 }])!;
    assert.equal(deployView(tiny, 393, 520, 1, 0.5, 4).zoom, DEPLOY_MAX_K);
    assert.equal(deployView(tiny, 393, 520, 1, 0.5, 1.5).zoom, 1.5);
  });
  it('frames the Calamity\'s wider rows whole, out past the usual view if it must', () => {
    const cal = deployBox(rows(10, 13))!;
    const v = deployView(cal, 360, 480, 1.2, 0.4, 4);
    assert.ok(v.zoom < 1);
    assert.ok((cal.x1 - cal.x0) * 1.2 * v.zoom <= 360 + 1e-6);
    // (a board that does fit stays at least as close as the usual view)
    assert.ok(deployView(cal, 393, 520, 0.5, 0.4, 4).zoom >= 1);
  });
});

describe('the deploy camera set down on the board (FIRST-FIVE)', () => {
  const near = deployBox(rows(14, 18))!;
  const board = deployBox(all(14, 18))!;
  const v = deployView(near, 377, 442, 0.58, 0.47, 6.8);
  const f = deployFit(v, near, board, 377, 442, 0.58, 0.47);
  it('stands a little further back than an exact fit, never out of the close view', () => {
    assert.ok(f.zoom <= v.zoom && f.zoom >= Math.min(1, v.zoom), `${f.zoom} from ${v.zoom}`);
    assert.ok(f.zoom >= v.zoom * DEPLOY_COMFORT - 1e-9);
  });
  it('keeps every placement tile inside the room', () => {
    const k = 0.58 * f.zoom;
    assert.ok(near.x0 >= f.cx - 377 / 2 / k - 1e-6 && near.x1 <= f.cx + 377 / 2 / k + 1e-6);
    assert.ok(near.y0 >= f.cy - 442 / 2 / k - 1e-6 && near.y1 <= f.cy + 442 / 2 / k + 1e-6);
  });
  it('moves towards the middle of the board, not away', () => {
    const mx = (board.x0 + board.x1) / 2;
    const my = (board.y0 + board.y1) / 2;
    assert.ok(Math.hypot(f.cx - mx, f.cy - my) < Math.hypot(v.cx - mx, v.cy - my), 'closer to the board\'s middle');
  });
  it('leaves a box wider than the room centred on itself', () => {
    const wide = { x0: -1000, x1: 1000, y0: 0, y1: 10 };
    const g = deployFit({ cx: 0, cy: 5, zoom: 1 }, wide, { x0: -2000, x1: 2000, y0: -500, y1: 500 }, 300, 400, 0.5, 0.2);
    assert.equal(g.cx, 0);
  });
});
