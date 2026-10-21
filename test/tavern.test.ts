import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALL_HEROES, HEROES } from '../src/sim/units';
import { gradeOfRank, PROPS, ROOM_H, ROOM_W, SPOTS, WALL_H } from '../src/render/tavernSpots';

test('every hero has a spot of their own, and no spot belongs to a stranger', () => {
  assert.deepEqual(Object.keys(SPOTS).sort(), [...ALL_HEROES].sort());
  const seen = new Set(Object.values(SPOTS).map((s) => `${s.x},${s.y}`));
  assert.equal(seen.size, ALL_HEROES.length);
});

test('spots lie on the floor inside the room, and the room can sort them front to back', () => {
  for (const [k, s] of Object.entries(SPOTS)) {
    assert.ok(s.x >= 12 && s.x <= ROOM_W - 12, `${k} across`);
    assert.ok(s.y > WALL_H && s.y <= ROOM_H, `${k} down`);
    assert.ok(Math.abs(s.depth - s.y) <= 3, `${k} depth follows y`);
    assert.ok(s.facing === 1 || s.facing === -1, k);
  }
  for (const p of PROPS) assert.ok(p.x > 0 && p.x < ROOM_W && p.y <= ROOM_H, p.sprite);
});

test('no two heroes stand on top of each other', () => {
  const list = Object.entries(SPOTS);
  for (let i = 0; i < list.length; i++)
    for (let j = i + 1; j < list.length; j++) {
      const [a, p] = list[i];
      const [b, q] = list[j];
      assert.ok(Math.abs(p.x - q.x) >= 16 || Math.abs(p.y - q.y) >= 10, `${a} and ${b}`);
    }
});

test('the starting five sit in the middle of the room, so a young tavern looks lived-in', () => {
  for (const k of HEROES) assert.ok(SPOTS[k].x >= 150 && SPOTS[k].x <= 300, k);
});

test('a hero looks upgraded from rank 2 and fully evolved at the top rank', () => {
  assert.deepEqual([0, 1, 2, 3, 4].map(gradeOfRank), [1, 1, 2, 2, 3]);
});
