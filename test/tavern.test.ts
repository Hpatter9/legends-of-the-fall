import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALL_HEROES, HEROES } from '../src/sim/units';
import { DOORWAYS, figureBox, GLOWS, gradeOfRank, PROPS, ROOM_H, ROOM_NAMES, ROOM_W, ROOMS, SCENE_W, SPOTS, WALL_H } from '../src/render/tavernSpots';

test('every hero has a spot of their own, and no spot belongs to a stranger', () => {
  assert.deepEqual(Object.keys(SPOTS).sort(), [...ALL_HEROES].sort());
  const seen = new Set(Object.values(SPOTS).map((s) => `${s.x},${s.y}`));
  assert.equal(seen.size, ALL_HEROES.length);
});

test('the scene is three rooms wide, joined by two doorways at the seams', () => {
  assert.equal(SCENE_W, ROOM_W * ROOMS);
  assert.equal(ROOMS, ROOM_NAMES.length);
  assert.deepEqual([...DOORWAYS], [ROOM_W, ROOM_W * 2]);
  ROOM_NAMES.forEach((r, i) => assert.equal(r.x, i * ROOM_W));
});

test('every spot lies on the floor inside the scene, and the scene can sort it front to back', () => {
  for (const [k, s] of Object.entries(SPOTS)) {
    assert.ok(s.x >= 14 && s.x <= SCENE_W - 14, `${k} across`);
    assert.ok(s.y > WALL_H && s.y <= ROOM_H, `${k} down`);
    assert.ok(Math.abs(s.depth - s.y) <= 3, `${k} depth follows y`);
    assert.ok(s.facing === 1 || s.facing === -1, k);
    // (a hero never stands in a doorway: the arch is in the way)
    for (const d of DOORWAYS) assert.ok(Math.abs(s.x - d) > 40 || s.y > WALL_H + 60, `${k} clear of a doorway`);
  }
  for (const p of PROPS) assert.ok(p.x > 0 && p.x < SCENE_W && p.y <= ROOM_H, p.sprite);
  for (const g of GLOWS) assert.ok(g.x > 0 && g.x < SCENE_W && g.y >= 0 && g.y <= ROOM_H);
});

test('each room holds fifteen heroes, so none is crowded', () => {
  const per = [0, 0, 0];
  for (const s of Object.values(SPOTS)) per[Math.min(ROOMS - 1, Math.floor(s.x / ROOM_W))]++;
  assert.deepEqual(per, [15, 15, 15]);
});

test('no two figures overlap: they are apart across, or far enough apart down that the one behind shows', () => {
  const list = Object.entries(SPOTS).map(([kind, s]) => ({ kind, s, b: figureBox(kind) }));
  for (const { kind, b } of list) assert.ok(b.w > 0 && b.h > 0, `${kind} has a sheet`);
  for (let i = 0; i < list.length; i++)
    for (let j = i + 1; j < list.length; j++) {
      const p = list[i];
      const q = list[j];
      const across = Math.abs(p.s.x - q.s.x) >= (p.b.w + q.b.w) / 2;
      // (a hero behind may show over the shoulder of the one in front: at least this much of their height has to be clear)
      const down = Math.abs(p.s.y - q.s.y) >= 0.7 * Math.min(p.b.h, q.b.h);
      assert.ok(across || down, `${p.kind} and ${q.kind} overlap`);
    }
});

test('the starting five sit in the first room, along the bar, so a young tavern looks lived-in', () => {
  for (const k of HEROES) assert.ok(SPOTS[k].x >= 150 && SPOTS[k].x <= 350, k);
});

test('a hero looks upgraded from rank 2 and fully evolved at the top rank', () => {
  assert.deepEqual([0, 1, 2, 3, 4].map(gradeOfRank), [1, 1, 2, 2, 3]);
});
