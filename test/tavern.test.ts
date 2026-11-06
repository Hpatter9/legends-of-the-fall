import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALL_HEROES, HEROES } from '../src/sim/units';
import { DOORWAYS, figureBox, GLOWS, gradeOfRank, HESTER, hesterNews, PROPS, ROOM_H, ROOM_NAMES, ROOM_W, ROOMS, SCENE_W, SPOTS, WALL_H } from '../src/render/tavernSpots';

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

test('Hester’s corner stands in the hearth hall, on the floor by the back room’s doorway, clear of every hero (CLIFF-ROAM)', () => {
  const hall = ROOM_NAMES.find((r) => r.id === 'hearth')!;
  const { stall, hester, visitor, box } = HESTER;
  for (const p of [stall, hester, visitor]) {
    assert.ok(p.x > hall.x && p.x < hall.x + ROOM_W, 'in the hearth hall');
    assert.ok(p.foot > WALL_H && p.foot <= ROOM_H, 'on the floor');
  }
  // (Hester and the trader stand in front of the stall, either side of it; her crate stands in front of her)
  assert.ok(hester.foot > stall.foot && visitor.foot > stall.foot && hester.x < stall.x && visitor.x > stall.x);
  assert.ok(PROPS.some((p) => p.sprite === 'crates' && Math.abs(p.x - hester.x) < 6 && p.y > hester.foot), 'her crate in front of her');
  // (the corner's tap box holds the three of them, and no hero stands in it, so a tap there is always the stall's)
  for (const p of [stall, hester, visitor]) assert.ok(p.x >= box.x0 && p.x <= box.x1 && p.foot <= box.y1 + 2);
  assert.ok(box.x1 < DOORWAYS[1], 'short of the doorway');
  for (const [kind, s] of Object.entries(SPOTS)) {
    const b = figureBox(kind);
    const hitsAcross = s.x + b.w / 2 > box.x0 && s.x - b.w / 2 < box.x1;
    const hitsDown = s.y > box.y0 && s.y - b.h < box.y1;
    assert.ok(!(hitsAcross && hitsDown && s.y <= box.y1 + 4), `${kind} stands in Hester's corner`);
  }
});

test('Hester’s news: new stock until the stall is looked at today, and the visiting trader (CLIFF-ROAM)', () => {
  const day = 20261106;
  const m = { seed: 7, stall: { day, sold: {}, spent: 0 } } as unknown as Parameters<typeof hesterNews>[0];
  assert.equal(hesterNews(m, day).fresh, true);
  (m.stall as { seen?: number }).seen = day;
  assert.equal(hesterNews(m, day).fresh, false);
  assert.ok([null, 'caravan', 'dealer'].includes(hesterNews(m, day).visitor));
});
