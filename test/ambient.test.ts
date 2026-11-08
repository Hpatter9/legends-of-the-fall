import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import {
  birdAt, emberAt, flashAt, flicker, GUTTER, glintAt, hotSpots, inPoly, moteAt, motionPlan, noise1, placeIn, polyArea, polyBox, puffAt, rowShift, sway,
  type LightKind,
} from '../src/render/ambient';
import { SCENE_ART, SCENE_LIFE, type SceneName } from '../src/render/ambientScenes';

// ALIVE: the shared motion of the painted scenes (`render/ambient.ts`) and where each painting's life is (`render/ambientScenes.ts`).

const times = Array.from({ length: 400 }, (_, i) => i * 0.137);

test('a light gutters about its rest, within its depth, never going out; the same moment always looks the same', () => {
  for (const kind of Object.keys(GUTTER) as LightKind[]) {
    const g = GUTTER[kind];
    const vs = times.map((t) => flicker(t, 5, kind));
    for (const v of vs) {
      assert.ok(v > 0.5, `${kind} dims too far`);
      assert.ok(Math.abs(v - 1) <= g.slow + g.quick + 1e-9, `${kind} out of its depth`);
    }
    assert.ok(Math.max(...vs) - Math.min(...vs) > 0.02, `${kind} never moves`);
    assert.equal(flicker(3.3, 9, kind), flicker(3.3, 9, kind));
  }
  // (two lights do not gutter in step)
  assert.notEqual(flicker(2, 1), flicker(2, 2));
});

test('noise is smooth and stays between 0 and 1', () => {
  for (let x = 0; x < 20; x += 0.01) {
    const v = noise1(x, 3);
    assert.ok(v >= 0 && v <= 1);
    assert.ok(Math.abs(noise1(x + 0.01, 3) - v) < 0.05, 'a jump');
  }
});

test('a sway leans both ways, within -1 and 1', () => {
  const vs = times.map((t) => sway(t, 4));
  assert.ok(vs.every((v) => v >= -1 && v <= 1));
  assert.ok(Math.min(...vs) < -0.2 && Math.max(...vs) > 0.2);
});

test('a bending region is held still where it is anchored, and moves most at its free end', () => {
  for (const kind of ['foliage', 'cloth', 'flame'] as const) {
    for (const t of times.slice(0, 50)) {
      assert.equal(Math.abs(rowShift(kind, 1, t, 2, 3, 'bottom')), 0, `${kind} moves at its foot`);
      assert.equal(Math.abs(rowShift(kind, 0, t, 2, 3, 'top')), 0, `${kind} moves where it hangs`);
      assert.ok(Math.abs(rowShift(kind, 0.3, t, 2, 3, 'bottom')) <= 3 * 1.4);
    }
    const free = times.map((t) => Math.abs(rowShift(kind, 0, t, 2, 3, 'bottom')));
    assert.ok(Math.max(...free) > 1, `${kind} never bends`);
  }
  // (water ripples everywhere, within its reach; a waterfall and a floating castle are not bent row by row)
  const water = times.map((t) => rowShift('water', 0.5, t, 1, 2, 'none'));
  assert.ok(water.every((v) => Math.abs(v) <= 2) && Math.max(...water) > 0.5);
  assert.equal(rowShift('fall', 0.5, 3, 1, 2, 'none'), 0);
});

test('embers rise from their fire and fade; smoke rises and thins; nothing shows outside 0 to 1', () => {
  for (let i = 0; i < 12; i++)
    for (const t of times.slice(0, 80)) {
      const e = emberAt(i, t, [0.5, 0.5], { spread: 0.05, rise: 0.2, life: 1.5 });
      assert.ok(e.y <= 0.5 + 1e-9, 'an ember sinks');
      assert.ok(e.a >= 0 && e.a <= 1);
      const p = puffAt(i, t, [0.5, 0.5], { rise: 0.1, life: 4, spread: 0.03 });
      assert.ok(p.y <= 0.5 + 1e-9 && p.a >= 0 && p.a <= 1 && p.size > 0);
    }
});

test('motes, glints and birds keep to their boxes', () => {
  const box = [0.2, 0.3, 0.6, 0.5] as const;
  for (let i = 0; i < 10; i++)
    for (const t of times) {
      const m = moteAt(i, t, box);
      assert.ok(m.x >= 0.2 && m.x <= 0.6 && m.y >= 0.3 && m.y <= 0.5 && m.a >= 0 && m.a <= 1);
      const g = glintAt(i, t, box);
      assert.ok(g.x >= 0.2 && g.x <= 0.6 && g.y >= 0.3 && g.y <= 0.5 && g.a >= 0 && g.a <= 1);
      const b = birdAt(i, t, box, { cross: 10, rest: 5, bob: 0 });
      if (b.a) assert.ok(b.y >= 0.3 && b.y <= 0.5 && b.x >= 0.15 && b.x <= 0.65);
    }
  // (a bird is away for its rest between passes)
  const away = times.filter((t) => !birdAt(0, t, box, { cross: 10, rest: 5 }).a).length;
  assert.ok(away > 0 && away < times.length);
});

test('a flash is rare and brief', () => {
  const lit = Array.from({ length: 6000 }, (_, i) => flashAt(i * 0.01, 3, 7)).filter((v) => v > 0).length;
  assert.ok(lit > 0, 'never flashes');
  assert.ok(lit < 6000 * 0.08, 'flashes too often');
});

test('how a scene plays: nothing while hidden, held still for reduced motion, half as busy on a battery saver', () => {
  assert.equal(motionPlan({ reduced: false, saver: false, hidden: true }).run, false);
  const calm = motionPlan({ reduced: true, saver: false, hidden: false });
  assert.equal(calm.run, false);
  assert.equal(calm.particles, 0);
  assert.equal(calm.warp, false);
  const saver = motionPlan({ reduced: false, saver: true, hidden: false });
  assert.ok(saver.run && saver.gap >= 33 && saver.particles === 0.5);
  const full = motionPlan({ reduced: false, saver: false, hidden: false });
  assert.ok(full.run && full.gap === 0 && full.particles === 1 && full.warp);
});

test('polygons: inside, the box round them, their area', () => {
  const sq = [[0.1, 0.1], [0.5, 0.1], [0.5, 0.5], [0.1, 0.5]] as const;
  assert.ok(inPoly([0.3, 0.3], sq));
  assert.ok(!inPoly([0.6, 0.3], sq));
  assert.deepEqual(polyBox(sq), [0.1, 0.1, 0.5, 0.5]);
  assert.ok(Math.abs(polyArea(sq) - 0.16) < 1e-9);
});

test('a painting covering a box fills it, cropped evenly; filling it stretches it', () => {
  const c = placeIn(400, 800, 1000, 1000, { fit: 'cover' });
  assert.equal(c.h, 800);
  assert.equal(c.x, -200);
  assert.deepEqual(placeIn(300, 200, 10, 10, { fit: 'fill' }), { x: 0, y: 0, w: 300, h: 200 });
  const top = placeIn(400, 800, 1000, 1000, { fit: 'cover', pos: [0.5, 0] });
  assert.equal(top.y, 0);
});

test('the fires of a picture are found where they burn, strongest first, apart', () => {
  const w = 64;
  const h = 32;
  const px = new Uint8ClampedArray(w * h * 4);
  const fire = (cx: number, cy: number, r: number) => {
    for (let y = cy - r; y <= cy + r; y++)
      for (let x = cx - r; x <= cx + r; x++) px.set([255, 160, 40, 255], (y * w + x) * 4);
  };
  fire(10, 10, 2);
  fire(50, 20, 1);
  const spots = hotSpots(px, w, h, { cell: 8, least: 3 });
  assert.equal(spots.length, 2);
  assert.ok(spots[0].n >= spots[1].n);
  assert.ok(Math.abs(spots[0].at[0] - 10 / w) < 0.05 && Math.abs(spots[0].at[1] - 10 / h) < 0.08);
  assert.ok(Math.abs(spots[1].at[0] - 50 / w) < 0.05);
  // (a dark picture has none)
  assert.equal(hotSpots(new Uint8ClampedArray(w * h * 4), w, h).length, 0);
});

/** A PNG's size, from its header. */
function pngSize(path: string): [number, number] {
  const b = readFileSync(path);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

test('every painted scene is well made: its painting is there at its size, and all its life lies on it', () => {
  const inside = (p: readonly [number, number], what: string) => assert.ok(p[0] >= 0 && p[0] <= 1 && p[1] >= 0 && p[1] <= 1, what);
  for (const name of Object.keys(SCENE_LIFE) as SceneName[]) {
    const life = SCENE_LIFE[name];
    const art = SCENE_ART[name];
    assert.ok(existsSync(art), `${name}: ${art} is missing`);
    if (art.endsWith('.png')) assert.deepEqual(pngSize(art), [...life.size], `${name}: its size`);
    for (const l of life.lights) {
      inside(l.at, `${name}: a light off the painting`);
      assert.ok(l.r > 0 && l.r < 0.5, `${name}: a light's reach`);
      assert.ok((l.power ?? 0.5) > 0 && (l.power ?? 0.5) <= 1);
    }
    for (const r of life.regions) {
      assert.ok(r.poly.length >= 3, `${name}: a ${r.kind} region is not a shape`);
      r.poly.forEach((p) => inside(p, `${name}: a ${r.kind} region off the painting`));
      assert.ok(polyArea(r.poly) > 1e-5, `${name}: a ${r.kind} region with no area`);
      assert.ok(r.amp >= 0 && r.amp <= 0.02, `${name}: a ${r.kind} region moves too far`);
    }
    for (const s of life.spouts) inside(s.at, `${name}: a spout off the painting`);
    for (const d of life.drifts) {
      const [l, t, r, b] = d.box;
      assert.ok(l < r && t < b, `${name}: an empty ${d.kind} box`);
      inside([l, t], name);
      inside([r, b], name);
    }
  }
});
