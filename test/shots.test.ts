// SHOTS: the rendered orbs of the shots and the rendered strands between two fighters (docs/notes/shots.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ARC_STRAND, BFX_SCALE, STRAND_STRETCH, bfxClip, shotOrb, strandLay } from '../src/render/blenderFxRules';
import { ELEMENTS, arcStyle, missileOf } from '../src/render/fxRules';

test('every element has a rendered orb, a short loop held with the atlases every fight has', () => {
  for (const el of ELEMENTS) {
    const key = shotOrb(el);
    assert.ok(key, el);
    const c = bfxClip(key!)!;
    assert.ok(c.loop && c.a <= 1, key);
    // (the ball is at the clip's leading end, its tail behind it: the anchor sits right of the middle)
    assert.ok(c.ax > c.w / 2, key);
  }
  assert.equal(shotOrb('nothing'), undefined);
});

test('arrows and bones stay painted sprites: only an orb takes a rendered clip', () => {
  const src = readFileSync('src/render/fx.ts', 'utf8');
  assert.match(src, /const rkey = m\.look === 'orb' \? shotOrb\(m\.el\) : undefined/);
  assert.equal(missileOf('arrow', 'Archer').look, 'arrow');
});

test('each kind of arc has its strand, a loop in the atlases every fight has', () => {
  for (const def of ['kitsune', 'warlock', 'lightningMage']) {
    const c = bfxClip(ARC_STRAND[arcStyle(def)]);
    assert.ok(c && c.loop && c.a <= 1, def);
    // (it runs along its clip, anchored at its middle)
    assert.ok(Math.abs(c.ax - c.w / 2) <= 1 && c.w > c.h * 2, def);
  }
});

test('a strand is laid from one fighter to the other, never stretched beyond its limit', () => {
  const own = bfxClip('arc-bolt')!.w * BFX_SCALE;
  for (const len of [10, own, own * 1.3, own * 1.4, own * 3.1, own * 6]) {
    const lay = strandLay(100, 50, 100 + len * 0.6, 50 + len * 0.8, own);
    assert.ok(lay.stretch <= STRAND_STRETCH + 1e-9, String(len));
    // (its lengths cover the whole line: the first starts at one end and the last ends at the other)
    assert.ok(Math.abs(lay.at.length * lay.stretch * own - len) < 1e-6);
    const first = lay.at[0];
    const half = (lay.stretch * own) / 2;
    assert.ok(Math.abs(Math.hypot(first.x - 100, first.y - 50) - half) < 1e-6);
    assert.ok(Math.abs(lay.turn - Math.atan2(0.8, 0.6)) < 1e-9);
  }
  assert.equal(strandLay(0, 0, own, 0, own).at.length, 1);
  assert.equal(strandLay(0, 0, own * 2, 0, own).at.length, 2);
});

test('the hand-drawn line and the painted orb stay as the fallback when a clip is not held', () => {
  const src = readFileSync('src/render/fx.ts', 'utf8');
  assert.match(src, /if \(this\.bfxStrand\(ARC_STRAND\[style\], x0, y0, x1, y1, life\)\) return;/);
  assert.match(src, /const orb = m\.look === 'orb' && !made \? PACK/);
});
