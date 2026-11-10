// FX-ALIVE (docs/notes/fx-alive.md): a patch of marked ground lives and lets the heroes in it show: a faint fill and a bright rim, each tile on
// its own beat, thinned under a fighter, still and fainter with reduced motion.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ALIVE, breath, stripFrame, tileLook, tilePhase } from '../src/render/fxAlive';
import { OVER_FIGHTER_STATUS_ALPHA } from '../src/render/overFighter';

test('the edge carries the area: the rim is bright and the fill faint', () => {
  for (let t = 0; t < ALIVE.BREATH_MS; t += 100) {
    const k = tileLook(t, 0, false, false);
    assert.ok(k.fill <= ALIVE.FILL + 1e-9 && k.fill > 0, `fill ${k.fill}`);
    assert.ok(k.rim >= 4 * k.fill, `rim ${k.rim} against fill ${k.fill}`);
  }
  // (the fill was 0.2 to 0.45 before; now it never passes an eighth)
  assert.ok(ALIVE.FILL <= 0.125);
});

test('each tile breathes on its own beat: neighbours are never in step, and the patch moves over time', () => {
  for (let u = 0; u < 8; u++)
    for (let v = 0; v < 11; v++) {
      const p = tilePhase(u, v);
      assert.ok(p >= 0 && p < 1);
      assert.notEqual(p, tilePhase(u + 1, v), `${u},${v} and its right`);
      assert.notEqual(p, tilePhase(u, v + 1), `${u},${v} and below`);
    }
  // (a tile's rim brightens and dims through a breath)
  const rims = Array.from({ length: 16 }, (_, i) => tileLook(i * 100, 0.25, false, false).rim);
  assert.ok(Math.max(...rims) - Math.min(...rims) > 0.3);
  // (its strip turns over, each tile a few frames from its neighbour)
  assert.notEqual(stripFrame(0, tilePhase(0, 0), 8, false), stripFrame(0, tilePhase(1, 0), 8, false));
  assert.notEqual(stripFrame(0, 0, 8, false), stripFrame(ALIVE.STRIP_MS * 3, 0, 8, false));
});

test('a fighter standing on a tile thins its fill and strip; the rim stays, so the edge still shows', () => {
  const open = tileLook(400, 0.5, false, false);
  const under = tileLook(400, 0.5, true, false);
  assert.ok(Math.abs(under.fill - open.fill * ALIVE.OCCUPIED) < 1e-9);
  assert.ok(Math.abs(under.strip - open.strip * ALIVE.OCCUPIED) < 1e-9);
  assert.equal(under.rim, open.rim);
  assert.ok(ALIVE.OCCUPIED < 0.5);
});

test('with reduced motion a patch holds still and fainter; its strength scales everything', () => {
  assert.deepEqual(tileLook(0, 0.3, false, true), tileLook(9999, 0.8, false, true));
  assert.ok(tileLook(0, 0, false, true).rim < ALIVE.RIM);
  assert.equal(breath(1234, 0.4, true), 0.5);
  assert.equal(stripFrame(1234, 0.4, 8, true), 0);
  const half = tileLook(300, 0.2, false, false, 0.5);
  const full = tileLook(300, 0.2, false, false, 1);
  assert.ok(Math.abs(half.rim - full.rim / 2) < 1e-9 && Math.abs(half.fill - full.fill / 2) < 1e-9);
  assert.deepEqual(tileLook(300, 0.2, false, false, 0), { fill: 0, rim: 0, strip: 0 });
});

test('the marks in front of a fighter are drawn at half their strength; the living-ground atlas is ready for its sheet', () => {
  assert.equal(OVER_FIGHTER_STATUS_ALPHA, 0.5);
  const m = JSON.parse(readFileSync('src/art/fx/alive/atlas.json', 'utf8')) as { cell: number[]; rows: Record<string, number[]> };
  assert.deepEqual(m.cell, [128, 64], 'a 2:1 tile, as the prompt asks');
  for (const [el, row] of Object.entries(m.rows)) assert.ok(row.length === 2 && row[1] > 1, el);
});
