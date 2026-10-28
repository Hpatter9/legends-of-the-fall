import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ELEMENTS, type Family } from '../src/render/fxRules';
import { FORMS, PALETTE, formOf, paintedPose } from '../src/render/cinematicRules';

const families: Family[] = ['orb', 'hit', 'explosion', 'slash', 'circle', 'rune', 'shield', 'status', 'gather', 'nova', 'cross', 'puff', 'smoke', 'sparkle', 'aura', 'vortex', 'pillar', 'strike', 'spikes', 'wave', 'flame'];

test('every combat element and family resolves to painted art', () => {
  for (const el of ELEMENTS) {
    assert.ok(PALETTE[el] > 0);
    for (const family of families) assert.ok(FORMS.includes(formOf(el, family)), `${el}-${family}`);
  }
  const png = readFileSync('src/art/fx/cinematic/painted-atlas.png');
  assert.equal(png.readUInt32BE(16), png.readUInt32BE(20), 'source atlas is square');
  assert.equal(png[25], 6, 'source has RGBA transparency');
});

test('elements retain distinct impact silhouettes and useful semantic shapes', () => {
  assert.equal(formOf('fire', 'explosion'), 'fire');
  assert.equal(formOf('ice', 'explosion'), 'ice');
  assert.equal(formOf('lightning', 'strike'), 'bolt');
  assert.equal(formOf('poison', 'smoke'), 'poison');
  assert.equal(formOf('earth', 'explosion'), 'stone');
  assert.equal(formOf('forest', 'gather'), 'heal');
  for (const el of ELEMENTS) assert.equal(formOf(el, 'shield'), 'shield');
});

test('all painted motions settle, remain finite and fade away at the end', () => {
  for (const family of families) for (const loop of [false, true]) for (const calm of [false, true]) {
    for (const t of [-1, 0, 0.1, 0.5, 0.9, 1, 2]) {
      const pose = paintedPose(family, t, Math.max(0, t) * 900, loop, calm);
      assert.ok(Object.values(pose).every(Number.isFinite));
      assert.ok(pose.x > 0 && pose.y > 0);
      assert.ok(pose.alpha >= 0 && pose.alpha <= 1);
      if (t >= 1) assert.equal(pose.alpha, 0);
      if (calm) assert.deepEqual([pose.x, pose.y, pose.turn], [1, 1, 0]);
    }
  }
});

test('held wards keep their opacity through the middle of a cast', () => {
  for (const family of ['circle', 'rune', 'shield', 'status'] as Family[]) {
    const samples = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7].map(t => paintedPose(family, t, t * 2000, true, false).alpha);
    assert.ok(samples.every(a => a === samples[0] && a > 0));
  }
});
