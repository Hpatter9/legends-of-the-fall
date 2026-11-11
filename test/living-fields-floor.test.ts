// LIVING-FIELDS, step 2 (docs/notes/living-fields.md): every land's floor is a coherent set from a painted hold sheet: its ground laid in
// patches, a path, raised ground that is not paved unless the land is stone, ragged edges where two grounds meet, a line only where
// something changes. Looks only: the board the battle reads is never touched.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { AREAS, DEPLOY_ROWS, makeBoard, type Board } from '../src/sim/board';
import { FACE_NAMES, FLOORS, HOLDS, RAISED, RANK, ROLES, faceOf, floorRoles, fringesOf, pathOf, seamsOf, slotOf } from '../src/render/floorRules';

const boards = (area: (typeof AREAS)[number], n = 12): Board[] => Array.from({ length: n }, (_, k) => makeBoard(1000 + k * 37, area));
const roleAt = (r: Uint8Array, i: number) => ROLES[r[i]];

test('every land has a whole set from a hold sheet that is in the repo', () => {
  for (const area of AREAS) {
    const s = FLOORS[area];
    assert.ok(HOLDS.includes(s.hold), `${area}: ${s.hold}`);
    for (const f of ['ground', 'edges', 'faces']) assert.ok(existsSync(`src/art/assault/${s.hold}/${f}.webp`), `${area}: ${s.hold}/${f}.webp`);
    for (const slot of [s.ground, s.second, s.path, s.high, s.outcrop, s.planks, s.dais, s.coals]) assert.ok(Number.isInteger(slot) && slot >= 0 && slot < 16, `${area}: slot ${slot}`);
    for (const slot of [s.shore, s.water, s.lava]) assert.ok(Number.isInteger(slot) && slot >= -1 && slot < 16, `${area}: slot ${slot}`);
    for (const f of Object.values(s.faces)) assert.ok(FACE_NAMES.includes(f), `${area}: face ${f}`);
    // (the path is not the ground it crosses, and the second ground is not the first)
    assert.notEqual(s.path, s.ground, `${area}: path`);
    if (s.share > 0) assert.notEqual(s.second, s.ground, `${area}: second`);
  }
});

test('the floor is looks only and the same every time: the board is not changed, and a seed lays the same floor twice', () => {
  for (const area of AREAS) {
    const b = makeBoard(4242, area);
    const before = JSON.stringify(b);
    const a = floorRoles(b);
    assert.equal(JSON.stringify(b), before, area);
    assert.deepEqual([...floorRoles(makeBoard(4242, area))], [...a], area);
  }
});

test('raised ground keeps the land\'s own ground unless the land is stone', () => {
  for (const area of AREAS) {
    const s = FLOORS[area];
    for (const b of boards(area)) {
      const r = floorRoles(b);
      b.tiles.forEach((t, i) => {
        const role = roleAt(r, i);
        if (role === 'high') assert.ok(t.h >= RAISED || t.paved, `${area}: a low tile is raised ground`);
        // (a land that is not stone never paves a height: its raised top is one of its own grounds, with rock showing through in places)
        if (!s.stone && t.h >= RAISED && !t.ground && !t.bridge) assert.ok(['high', 'second', 'outcrop', 'path', 'shore', 'ground'].includes(role), `${area}: ${role}`);
      });
      if (!s.stone) assert.notEqual(s.high, s.dais, `${area}: its raised ground is not its paving`);
    }
  }
});

test('the grounds lie in patches, not tile by tile: most plain tiles have a neighbour of their own ground', () => {
  for (const area of AREAS) {
    let plain = 0;
    let alone = 0;
    for (const b of boards(area)) {
      const r = floorRoles(b);
      for (let v = 0; v < b.d; v++)
        for (let u = 0; u < b.w; u++) {
          const me = r[v * b.w + u];
          if (roleAt(r, v * b.w + u) !== 'ground' && roleAt(r, v * b.w + u) !== 'second') continue;
          plain++;
          const same = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([du, dv]) => u + du >= 0 && u + du < b.w && v + dv >= 0 && v + dv < b.d && r[(v + dv) * b.w + u + du] === me);
          if (!same) alone++;
        }
    }
    assert.ok(plain > 0, area);
    assert.ok(alone / plain < 0.2, `${area}: ${alone} of ${plain} plain tiles stand alone`);
  }
});

test('the path crosses the middle ground on tiles a fighter can stand on, and stays out of the two sides\' rows', () => {
  let crossed = 0;
  for (const area of AREAS)
    for (const b of boards(area, 6)) {
      const p = pathOf(b);
      if (!p.size) continue;
      crossed++;
      const rows = new Set<number>();
      for (const i of p) {
        const v = Math.floor(i / b.w);
        rows.add(v);
        assert.ok(v >= DEPLOY_ROWS - 1 && v <= b.d - DEPLOY_ROWS, `${area}: path on row ${v}`);
        const t = b.tiles[i];
        assert.ok(!t.rock && !t.wall && !t.barrel && t.ground !== 'deep', `${area}: path on a tile nobody stands on`);
      }
      // (it runs right across: every row of the middle ground has a tile of it)
      for (let v = DEPLOY_ROWS; v < b.d - DEPLOY_ROWS; v++) assert.ok(rows.has(v), `${area}: no path on row ${v}`);
      // (its own side stream: the same seed, the same path)
      assert.deepEqual([...pathOf(makeBoard(b.seed, area))].sort(), [...p].sort());
    }
  assert.ok(crossed > AREAS.length * 4, `${crossed} boards have a path`);
});

test('where two grounds meet at one height the higher-ranked lays a ragged edge over the lower, and water takes its bank and foam', () => {
  let edges = 0;
  let foam = 0;
  for (const area of AREAS)
    for (const b of boards(area, 6)) {
      const r = floorRoles(b);
      for (let v = 0; v < b.d; v++)
        for (let u = 0; u < b.w; u++) {
          const me = roleAt(r, v * b.w + u);
          for (const f of fringesOf(b, r, u, v)) {
            assert.ok(f.turn >= 0 && f.turn < 4);
            if (f.foam) {
              foam++;
              assert.ok(me === 'water' || me === 'deep', `${area}: foam on ${me}`);
            } else {
              edges++;
              assert.notEqual(f.role, me, `${area}: a ground edges itself`);
              if (me !== 'water' && me !== 'deep' && me !== 'path' && me !== 'shore') assert.ok(RANK[f.role] > RANK[me], `${area}: ${f.role} over ${me}`);
            }
          }
        }
    }
  assert.ok(edges > 500 && foam > 50, `${edges} edges, ${foam} foam lines`);
});

test('a tile shows a line only where something changes: two tiles of one ground at one height share none', () => {
  const b = makeBoard(7, 'plains', 8, 11, 'plain');
  let open = 0;
  for (let v = 0; v < b.d; v++)
    for (let u = 0; u < b.w - 1; u++) {
      const a = b.tiles[v * b.w + u];
      const z = b.tiles[v * b.w + u + 1];
      const same = a.h === z.h && (a.ground ?? '') === (z.ground ?? '') && !!a.bridge === !!z.bridge;
      // (side 1 is the +u neighbour's, side 3 the -u one's)
      assert.equal(seamsOf(b, u, v)[1], !same, `${u},${v} to its right`);
      assert.equal(seamsOf(b, u + 1, v)[3], !same, `${u + 1},${v} to its left`);
      if (same) open++;
    }
  assert.ok(open > 20, `${open} open seams on an open plain`);
  // (the board's own edge is always a line)
  assert.ok(seamsOf(b, 0, 0)[0] && seamsOf(b, 0, 0)[3]);
});

test('an oasis is green round its water and sand beyond', () => {
  let green = 0;
  let far = 0;
  for (const b of boards('oasis', 20)) {
    const r = floorRoles(b);
    const wet = (u: number, v: number) => u >= 0 && v >= 0 && u < b.w && v < b.d && ['water', 'deep'].includes(b.tiles[v * b.w + u].ground ?? '');
    for (let v = 0; v < b.d; v++)
      for (let u = 0; u < b.w; u++) {
        const role = roleAt(r, v * b.w + u);
        if (role !== 'shore' && role !== 'ground') continue;
        const near = [-1, 0, 1].some((dv) => [-1, 0, 1].some((du) => wet(u + du, v + dv)));
        if (near) green += role === 'shore' ? 1 : 0;
        else far += role === 'shore' ? 1 : 0;
      }
  }
  // (every plain tile beside the water is green; away from it most are sand)
  let sand = 0;
  for (const b of boards('oasis', 20)) sand += [...floorRoles(b)].filter((x) => ROLES[x] === 'ground').length;
  assert.ok(green > 100 && sand > far, `${green} green beside water, ${far} green away from it, ${sand} sand`);
  for (const b of boards('oasis', 20)) {
    const r = floorRoles(b);
    const wet = (u: number, v: number) => u >= 0 && v >= 0 && u < b.w && v < b.d && ['water', 'deep'].includes(b.tiles[v * b.w + u].ground ?? '');
    for (let v = 0; v < b.d; v++)
      for (let u = 0; u < b.w; u++)
        if ([-1, 0, 1].some((dv) => [-1, 0, 1].some((du) => wet(u + du, v + dv)))) assert.notEqual(roleAt(r, v * b.w + u), 'ground', `sand beside water at ${u},${v}`);
  }
});

test('the face under a top fits it: stone under stone, a wet face under water', () => {
  for (const area of AREAS) {
    const s = FLOORS[area];
    assert.equal(faceOf(s, 'water', 0), s.faces.wet);
    assert.equal(faceOf(s, 'dais', 1), s.faces.stone);
    assert.equal(faceOf(s, 'ground', 0), s.faces.low);
    assert.equal(faceOf(s, 'ground', RAISED), s.faces.tall);
    // (a shared picture for what a sheet does not paint)
    assert.equal(slotOf(s, 'ice'), -1);
  }
});
