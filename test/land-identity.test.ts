// LAND-IDENTITY (docs/notes/land-identity.md, `src/render/landRimRules.ts`): what stands round and on a battlefield that says where you
// are. Looks only: none of it is a tile of the board, and none of it can hide a fighter or change where anyone stands.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AREAS, makeBoard } from '../src/sim/board';
import { LAND_LIGHT, MAX_DARK, RIMS, RIM_LIGHTS_MAX, RIM_PIECES_MAX, dressingOf, lightsOf, rimOf, wallTorches, wetLow } from '../src/render/landRimRules';
import { FLOORS, ROLES, floorRoles } from '../src/render/floorRules';
import { BATS, batsFor, edgeFalls, lifeFor } from '../src/render/boardLifeRules';

const atlasOf = (hold: string): string => readFileSync(`src/render/assault${hold === 'orc' ? 'Orc' : hold[0].toUpperCase() + hold.slice(1)}Atlas.ts`, 'utf8');

test('the rim lies outside the board, and the board is not changed by it', () => {
  for (const area of AREAS)
    for (let seed = 1; seed <= 10; seed++) {
      const b = makeBoard(seed, area);
      const before = JSON.stringify(b);
      const rim = rimOf(b);
      assert.equal(JSON.stringify(b), before, area);
      assert.deepEqual(rimOf(makeBoard(seed, area)), rim, 'the same board, the same rim');
      if (!RIMS[area]) assert.equal(rim.length, 0, `${area} has no rim yet`);
      for (const r of rim) {
        assert.ok(r.u < 0 || r.v < 0 || r.u >= b.w || r.v >= b.d, `${area}: a rim column on the board at ${r.u},${r.v}`);
        assert.ok(ROLES.includes(r.role));
      }
      assert.equal(new Set(rim.map((r) => `${r.u},${r.v}`)).size, rim.length, 'one column a place');
      assert.ok(rim.reduce((n, r) => n + r.pieces.length, 0) <= RIM_PIECES_MAX);
      assert.ok(rim.reduce((n, r) => n + r.pieces.filter((p) => p.light).length, 0) <= RIM_LIGHTS_MAX);
    }
});

test('a wall stands on the far edges only and over the board; nothing stands in front of a fighter', () => {
  for (const area of AREAS) {
    const spec = RIMS[area];
    if (!spec) continue;
    for (let seed = 1; seed <= 12; seed++) {
      const b = makeBoard(seed, area);
      for (const r of rimOf(b)) {
        const far = r.u < 0 || r.v < 0;
        const near = !far;
        if (spec.rise) {
          // (a wall: only beyond row 0 and column 0, and taller than every board tile beside it)
          assert.ok(far, `${area}: a wall on a near edge`);
          const u = Math.max(0, Math.min(b.w - 1, r.u));
          const v = Math.max(0, Math.min(b.d - 1, r.v));
          assert.ok(r.h >= b.tiles[v * b.w + u].h + spec.rise[0], `${area}: the wall is not over the board at ${r.u},${r.v}`);
        }
        if (near) {
          // (a near edge: only a land of water, below every board tile, and only things that lie flat)
          assert.ok(spec.near > 0 && r.near);
          assert.ok(r.h <= Math.min(...b.tiles.map((t) => t.h)), `${area}: a near column stands as high as the board`);
          for (const p of r.pieces) assert.ok(['waterFlowers', 'waterPlants'].includes(p.name), `${area}: ${p.name} on a near edge`);
        }
      }
      // (the torches hang on the far walls, one about every three columns of each)
      const torches = wallTorches(b);
      for (const t of torches) assert.ok((t.edge === 'v' && t.v === -1 && t.u >= 0 && t.u < b.w) || (t.edge === 'u' && t.u === -1 && t.v >= 0 && t.v < b.d));
      if (spec.rise) assert.ok(torches.length >= 4 && torches.length <= 8, `${area}: ${torches.length} torches`);
      else assert.equal(torches.length, 0);
    }
  }
});

test('every set piece is a piece of the land\'s own hold sheet', () => {
  for (const area of AREAS) {
    const atlas = atlasOf(FLOORS[area].hold);
    const names = new Set<string>();
    for (let seed = 1; seed <= 30; seed++) {
      const b = makeBoard(seed, area);
      for (const r of rimOf(b)) for (const p of r.pieces) names.add(p.name);
      for (const d of dressingOf(b)) names.add(d.piece.name);
    }
    if (RIMS[area]?.rise) names.add('wallLight');
    for (const n of names) assert.ok(new RegExp(`\\n  ${n}: \\{ r: \\[`).test(atlas), `${area}: ${n} is not in the ${FLOORS[area].hold} sheet`);
    if (RIMS[area]) assert.ok(names.size >= 3, `${area}: only ${[...names].join(', ')}`);
  }
});

test('the caves are walled and lit by torches and crystals; the mire is ringed with water, trees and reeds, and its low ground lies wet', () => {
  let trees = 0;
  let wisps = 0;
  let wet = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const cave = makeBoard(seed, 'crystal');
    const rim = rimOf(cave);
    assert.ok(rim.length >= (cave.w + cave.d) * 2, 'two rings of wall');
    assert.ok(rim.every((r) => r.role === 'outcrop' || r.role === 'high'), 'rock');
    assert.ok(rim.some((r) => r.pieces.some((p) => p.name.startsWith('darkRocks'))), 'crystals on the walls');
    const lights = lightsOf(cave, rim);
    assert.ok(lights.filter((l) => l.kind === 'torch').length >= 4, 'torches');
    const mire = makeBoard(seed, 'swamp');
    const water = rimOf(mire);
    assert.ok(water.every((r) => r.role === 'water' || r.role === 'deep'));
    assert.ok(water.length > rim.length, 'water on all four sides');
    trees += water.filter((r) => r.pieces.some((p) => p.name === 'gnarledTree' || p.name === 'weepingWillow')).length;
    wisps += water.filter((r) => r.pieces.some((p) => p.name === 'waterProp14')).length;
    // (reeds and lilies only on water; wet ground only on plain open tiles at the lowest height)
    for (const d of dressingOf(mire)) assert.ok(mire.tiles[d.i].ground === 'water' || mire.tiles[d.i].ground === 'deep');
    const roles = floorRoles(mire);
    mire.tiles.forEach((t, i) => {
      if (!wetLow(mire, i)) return;
      wet++;
      assert.ok(!t.ground && !t.rock && !t.wall);
      assert.ok(ROLES[roles[i]] === 'shore' || ROLES[roles[i]] === 'path', `wet low ground is drawn ${ROLES[roles[i]]}`);
    });
    assert.deepEqual(edgeFalls(mire), [], 'nothing falls off an island in the water');
    assert.deepEqual(dressingOf(cave), []);
  }
  assert.ok(trees >= 40 && wisps >= 15 && wet >= 40, `${trees} trees, ${wisps} wisps, ${wet} wet tiles over 20 boards`);
  // (no other land's ground is made wet)
  for (const area of AREAS) if (area !== 'swamp') assert.ok(!makeBoard(3, area).tiles.some((_, i) => wetLow(makeBoard(3, area), i)), area);
});

test('a dark land is never so dark that a fighter is lost: the dark is capped, and a hero and a dark foe still stand out from its ground under it', () => {
  // (the floors' own measure, `living-fields-floor.test.ts`, with the dark laid over the ground: the fighters are drawn over the dark)
  const lin = (c: number) => (c / 255 <= 0.04045 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
  const L = (rgb: number) => 0.2126 * lin((rgb >> 16) & 255) + 0.7152 * lin((rgb >> 8) & 255) + 0.0722 * lin(rgb & 255);
  const over = (rgb: number, dark: number, a: number) => (Math.round(((rgb >> 16) & 255) * (1 - a) + ((dark >> 16) & 255) * a) << 16) | (Math.round(((rgb >> 8) & 255) * (1 - a) + ((dark >> 8) & 255) * a) << 8) | Math.round((rgb & 255) * (1 - a) + (dark & 255) * a);
  const ratio = (a: number, b: number) => (Math.max(L(a), L(b)) + 0.05) / (Math.min(L(a), L(b)) + 0.05);
  for (const [area, light] of Object.entries(LAND_LIGHT)) {
    assert.ok(light.dark > 0 && light.dark <= MAX_DARK, `${area}: ${light.dark}`);
    const ground = over(FLOORS[area as keyof typeof FLOORS].tint!.ground!, light.colour, light.dark);
    // (a hero, drawn over the dark, is lighter than the darkened ground by a clear step)
    assert.ok(ratio(ground, 0x505050) >= 1.25, `${area}: a hero on its darkened ground (${ratio(ground, 0x505050).toFixed(2)})`);
    assert.ok(ratio(ground, 0x281f21) >= 1.15, `${area}: a dark foe on its darkened ground (${ratio(ground, 0x281f21).toFixed(2)})`);
  }
  assert.ok(MAX_DARK <= 0.45);
});

test('bats in the caves and the crypt, dragonflies and frogs in the mire', () => {
  assert.ok((BATS.crystal ?? 0) >= 4 && (BATS.dungeon ?? 0) >= 3);
  assert.equal(batsFor('plains', false), 0);
  assert.ok(batsFor('crystal', true) <= Math.ceil(BATS.crystal! / 2), 'half on a battery saver');
  assert.ok((lifeFor('swamp', 'clear').dragonfly ?? 0) >= 2 && (lifeFor('swamp', 'clear').frog ?? 0) >= 2);
  assert.equal(lifeFor('swamp', 'rain').dragonfly, undefined);
});
