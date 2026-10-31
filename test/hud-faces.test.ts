// HUD-FACES (docs/notes/hud-faces.md): every hero has a face box in both its paintings, each box lies inside its picture, and the rest fall back.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { ALL_HEROES } from '../src/sim/units';
import { HUD_FACES, bustRect, faceBox, faceRect, faceUrl, hasFace } from '../src/heroFaceRules';

/** A WebP's width and height, from its header (lossy, lossless or extended). */
function webpSize(file: string): { w: number; h: number } {
  const b = readFileSync(file);
  const kind = b.toString('ascii', 12, 16);
  if (kind === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
  if (kind === 'VP8L') {
    const bits = b.readUInt32LE(21);
    return { w: 1 + (bits & 0x3fff), h: 1 + ((bits >> 14) & 0x3fff) };
  }
  return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
}

test('every hero has a face box in its plain and awakened paintings, and each painting is there', () => {
  for (const kind of ALL_HEROES) {
    assert.ok(hasFace(kind), `${kind} has a face box`);
    for (const step of [0, 1]) {
      assert.ok(faceBox(kind, step), `${kind} ${step}`);
      assert.ok(existsSync(`src/art/${faceUrl(kind, step)}`), `${faceUrl(kind, step)} exists`);
    }
  }
  assert.deepEqual(Object.keys(HUD_FACES).sort(), [...ALL_HEROES].sort(), 'no box for a hero that is not there');
});

test('each face box sits inside its painting and is a sensible size', () => {
  for (const kind of ALL_HEROES) {
    for (const step of [0, 1]) {
      const box = faceBox(kind, step)!;
      const { w, h } = webpSize(`src/art/${faceUrl(kind, step)}`);
      const side = box[2] * w;
      assert.ok(box[2] > 0.15 && box[2] < 0.7, `${kind} ${step}: side ${box[2]}`);
      assert.ok(box[0] * w - side / 2 >= -1 && box[0] * w + side / 2 <= w + 1, `${kind} ${step}: inside across`);
      assert.ok(box[1] * h - side / 2 >= -1 && box[1] * h + side / 2 <= h + 1, `${kind} ${step}: inside down`);
      assert.ok(side >= 48, `${kind} ${step}: at least 48 pixels of painting to scale down (${Math.round(side)})`);
    }
  }
});

test('summons, guests and foes have no face: they keep their sprite', () => {
  for (const kind of ['treant', 'imp', 'skeleton', 'goblin', 'nobody']) {
    assert.equal(hasFace(kind), false, kind);
    assert.equal(faceBox(kind, 0), undefined, kind);
  }
});

test('a face square is kept inside its picture', () => {
  assert.deepEqual(faceRect([0.5, 0.5, 0.2], 100, 200), { x: 40, y: 90, side: 20 });
  assert.deepEqual(faceRect([0.02, 0.01, 0.3], 100, 100), { x: 0, y: 0, side: 30 });
  assert.deepEqual(faceRect([0.99, 0.99, 0.3], 100, 100), { x: 70, y: 70, side: 30 });
  assert.deepEqual(faceRect([0.5, 0.5, 2], 100, 60), { x: 20, y: 0, side: 60 });
});

test("the MVP's bust is about twice the face across, starts just above it, and stays inside the picture", () => {
  for (const kind of ALL_HEROES) {
    for (const step of [0, 1]) {
      const box = faceBox(kind, step)!;
      const { w, h } = webpSize(`src/art/${faceUrl(kind, step)}`);
      const r = bustRect(box, w, h, 136 / 176);
      assert.ok(r.x >= 0 && r.y >= 0 && r.x + r.w <= w + 1 && r.y + r.h <= h + 1, `${kind} ${step}: inside`);
      assert.ok(Math.abs(r.w / r.h - 136 / 176) < 0.02, `${kind} ${step}: its shape`);
      assert.ok(r.y <= box[1] * h && r.y + r.h >= box[1] * h, `${kind} ${step}: the face's centre is in it`);
    }
  }
});
