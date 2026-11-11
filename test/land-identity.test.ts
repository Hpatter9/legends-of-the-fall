// LAND-IDENTITY (docs/notes/land-identity.md, `src/render/landRimRules.ts`): what stands round and on a battlefield that says where you
// are. Looks only: none of it is a tile of the board, and none of it can hide a fighter or change where anyone stands.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AREAS, makeBoard } from '../src/sim/board';
import { DARK_MARGIN, darkTint, PUDDLE_SHARE, TORCH_UPS, WALL_STUDS, puddleOn, wallStuds, CLOUDS, CLOUD_DARK, LAND_LIGHT, LAND_WASH, MAX_DARK, RIMS, RIM_LIGHTS_MAX, RIM_PIECES_MAX, WASH_MAX, cloudsFor, dressingOf, lightsOf, rimNames, rimOf, wallTorches, washFor, wetLow } from '../src/render/landRimRules';
import { FLOORS, ROLES, floorRoles } from '../src/render/floorRules';
import { BATS, LAND_AIR, SOARERS, batsFor, edgeFalls, lifeFor, soarersFor } from '../src/render/boardLifeRules';

const atlasOf = (hold: string): string => readFileSync(`src/render/assault${hold === 'orc' ? 'Orc' : hold[0].toUpperCase() + hold.slice(1)}Atlas.ts`, 'utf8');

test('the rim lies outside the board, and the board is not changed by it', () => {
  for (const area of AREAS)
    for (let seed = 1; seed <= 10; seed++) {
      const b = makeBoard(seed, area);
      const before = JSON.stringify(b);
      const rim = rimOf(b);
      assert.equal(JSON.stringify(b), before, area);
      assert.deepEqual(rimOf(makeBoard(seed, area)), rim, 'the same board, the same rim');
      assert.ok(rim.length >= (b.w + b.d) * (RIMS[area].far - (RIMS[area].fades ? 1 : 0)), `${area}: every land has a rim along its far edges`);
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
          // (beside the board only what lies flat on the water; further out, low things as well: never a tree)
          const low = r.ring === 0 ? ['waterFlowers', 'waterPlants'] : ['waterFlowers', 'waterPlants', 'reeds1', 'sunkenLog', 'wetBoulders', 'waterProp14', 'mist'];
          for (const p of r.pieces) assert.ok(low.includes(p.name), `${area}: ${p.name} on a near edge, ring ${r.ring}`);
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
    for (const n of rimNames(area)) names.add(n);
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

test('every land is its own place: open country follows the board, the indoor lands are walled and dark, and each carries its own things', () => {
  const walled = AREAS.filter((a) => RIMS[a].rise);
  assert.deepEqual([...walled].sort(), ['crystal', 'dungeon', 'forge']);
  for (const a of walled) assert.ok(LAND_LIGHT[a], `${a} is walled, so it is dark and lit by its torches`);
  const has = (area: (typeof AREAS)[number], names: string[]) => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 30; seed++) for (const r of rimOf(makeBoard(seed, area))) for (const p of r.pieces) seen.add(p.name);
    for (const n of names) assert.ok(seen.has(n), `${area}: no ${n} in 30 boards (${[...seen].join(', ')})`);
  };
  // (what the owner asked for by name, where the land's sheet has it)
  has('forest', ['greatOak', 'pine1']);
  has('snow', ['snowyPine', 'prop15']);
  has('graveyard', ['prop1', 'kitStakeFence', 'gnarledTree']);
  has('ruins', ['prop5', 'mazeVine']);
  has('temple', ['prop5', 'prop6', 'mazeBanner']);
  has('forge', ['prop5', 'prop4', 'forgeFire']);
  has('shrine', ['prop1', 'prop4', 'prop5']);
  has('warcamp', ['stakeLine', 'warTent', 'greatBanner', 'bonfire']);
  has('dungeon', ['prop3', 'prop10']);
  for (let seed = 1; seed <= 12; seed++) {
    for (const area of AREAS) {
      const spec = RIMS[area];
      if (!spec.follow) continue;
      const b = makeBoard(seed, area);
      for (const r of rimOf(b)) {
        if (r.role === 'lava') {
          // (the ashlands' river of lava lies beyond the rocks, at the foot)
          assert.ok(area === 'volcano' && r.h === 0 && r.ground === 'lava' && (r.u < -1 || r.v < -1));
          continue;
        }
        // (open country stands no more than its two steps over the board's edge beside it: a slope, not a wall)
        const u = Math.max(0, Math.min(b.w - 1, r.u));
        const v = Math.max(0, Math.min(b.d - 1, r.v));
        assert.ok(r.h - b.tiles[v * b.w + u].h <= spec.follow[1] && r.h >= 0, `${area}: ${r.h} beside ${b.tiles[v * b.w + u].h}`);
      }
    }
    // (lava stands only in the ashlands' rim, and only things that belong in it stand on it)
    const ash = rimOf(makeBoard(seed, 'volcano'));
    assert.ok(ash.some((r) => r.role === 'lava'));
    for (const r of ash) if (r.role === 'lava') for (const p of r.pieces) assert.ok(['waterProp13', 'prop5'].includes(p.name));
  }
});

test('the sky\'s light: cloud shadows on a clear day over open country only, a weak wash, wheeling birds and drifting leaves', () => {
  for (const area of AREAS) {
    const n = cloudsFor(area, 'clear', false);
    assert.equal(n, CLOUDS[area] ?? 0);
    assert.ok(n <= 3);
    if (RIMS[area].rise || LAND_LIGHT[area]) assert.equal(n, 0, `${area} has a roof or its own dusk: no clouds`);
    for (const w of ['rain', 'fog', 'night', 'snow', 'ash']) assert.equal(cloudsFor(area, w, false), 0);
    assert.ok(cloudsFor(area, 'clear', true) <= Math.max(0, n - 1) || n === 0);
    const wash = LAND_WASH[area];
    if (wash) {
      assert.ok(wash.alpha > 0 && wash.alpha <= WASH_MAX, `${area}: a wash of ${wash.alpha}`);
      assert.equal(washFor(area, 'night'), null);
      assert.equal(washFor(area, 'fog'), null);
      assert.ok(!LAND_LIGHT[area], 'a dark land has its dark, not a wash');
    }
    assert.ok(soarersFor(area, 'clear', false) <= 2 && soarersFor(area, 'rain', false) === 0 && soarersFor(area, 'clear', true) <= 1);
  }
  assert.ok(CLOUD_DARK <= 0.15 && WASH_MAX <= 0.1);
  assert.ok(LAND_WASH.snow && LAND_WASH.snow.mode === 'tint' && LAND_WASH.volcano?.below, 'cold light on the snows, a glow from below in the ashlands');
  assert.ok(SOARERS.highlands && SOARERS.desert && SOARERS.graveyard);
  assert.ok(LAND_AIR.autumn && LAND_AIR.shrine && LAND_AIR.volcano?.rises && LAND_AIR.forge?.rises);
  for (const a of Object.values(LAND_AIR)) assert.ok(a.every >= 400, 'a few at a time');
});

test('the mire\'s water is the land\'s own murky green, thins away into the backdrop with no straight outer edge, and its low ground has puddles', () => {
  const spec = RIMS.swamp;
  assert.ok(spec.fades && spec.tones && spec.tones.length >= 3 && spec.near >= 3 && spec.far >= 4);
  for (const tone of spec.tones!) {
    // (green to teal, never brown or plain blue: much more green than red, and no more blue than a teal has)
    const [r, g, bl] = tone.match(/\d+/g)!.map(Number);
    assert.ok(g > r * 2 && bl <= g + 12, tone);
  }
  let puddles = 0;
  let low = 0;
  for (let seed = 1; seed <= 12; seed++) {
    const b = makeBoard(seed, 'swamp');
    const rim = rimOf(b);
    assert.ok(rim.every((r) => r.role === 'water' && r.ground === 'water'));
    // (the ring beside the board is whole and solid; the outermost is faint and broken)
    const outer = rim.filter((r) => r.ring === (r.near ? spec.near : spec.far) - 1);
    const inner = rim.filter((r) => r.ring === 0);
    assert.ok(inner.every((r) => r.alpha === 1) && inner.length >= (b.w + b.d) * 2);
    assert.ok(outer.every((r) => r.alpha < 0.5));
    const whole = (b.w + b.d) * 2 + 4 * (spec.far + spec.near);
    assert.ok(outer.length < whole * 0.85 && outer.length > whole * 0.2, `the outer ring is broken up: ${outer.length} of about ${whole}`);
    // (plenty lying in the water on the near sides too)
    assert.ok(rim.filter((r) => r.near && r.pieces.length).length >= 10, 'lilies, reeds and logs on the near sides');
    b.tiles.forEach((t, i) => {
      if (wetLow(b, i)) low++;
      if (!puddleOn(b, i)) return;
      puddles++;
      assert.ok(wetLow(b, i) && !t.ground && !t.trap);
    });
  }
  assert.ok(puddles > 0 && puddles <= low && Math.abs(puddles / low - PUDDLE_SHARE) < 0.2, `${puddles} puddles on ${low} low tiles`);
  // (no other land has puddles; every open land thins away the same way, and a wall never does)
  for (const area of AREAS) {
    const b = makeBoard(2, area);
    if (area !== 'swamp') assert.ok(!b.tiles.some((_, i) => puddleOn(b, i)), area);
    const rim = rimOf(b);
    assert.equal(!!RIMS[area].fades, !RIMS[area].rise, `${area}: open country thins into the backdrop, a wall stands solid`);
    if (RIMS[area].rise) assert.ok(rim.every((r) => r.alpha === 1));
    else {
      assert.ok(RIMS[area].far >= 3, `${area}: three rings, to thin away over`);
      assert.ok(rim.filter((r) => r.ring === 0).every((r) => r.alpha === 1) && rim.some((r) => r.alpha < 0.5) && rim.some((r) => r.alpha > 0.5 && r.alpha < 1));
    }
  }
});

test('the underground lands are rooms: tall walls, torches at two heights, and their faces broken up', () => {
  assert.ok(RIMS.crystal.rise![0] >= 8 && RIMS.crystal.rise![1] >= 12, 'the caves\' walls are eight to twelve steps over the board');
  assert.ok(RIMS.dungeon.rise![0] >= 6 && RIMS.forge.rise![0] >= 6);
  for (const area of ['crystal', 'dungeon', 'forge'] as const) {
    assert.ok(WALL_STUDS[area]);
    for (let seed = 1; seed <= 10; seed++) {
      const b = makeBoard(seed, area);
      const torches = wallTorches(b);
      assert.ok(TORCH_UPS.every((up) => torches.some((t) => t.up === up)), `${area}: torches low and high`);
      for (const t of torches) assert.ok(t.up < RIMS[area].rise![0], 'a torch hangs on the wall, under its top');
      const studs = wallStuds(b);
      assert.ok(studs.length >= 4, `${area}: ${studs.length} on the face`);
      const taken = new Set(torches.map((t) => `${t.u},${t.v}`));
      for (const x of studs) {
        assert.ok(!taken.has(`${x.u},${x.v}`), 'not on a torch');
        assert.ok(x.up >= 2 && x.up < RIMS[area].rise![0], 'on the face, over the fighters\' heads and under the top');
        assert.ok((x.edge === 'v' && x.v === -1) || (x.edge === 'u' && x.u === -1), 'on a far wall');
      }
      // (the wall's second ring stands higher still, so its top is stepped, not a flat rampart)
      const rim = rimOf(b);
      const tops = new Set(rim.map((r) => r.h));
      assert.ok(tops.size >= 4, `${area}: the wall's top varies (${[...tops].join(',')})`);
    }
  }
  assert.equal(wallStuds(makeBoard(1, 'plains')).length, 0);
});

test('a dark land\'s walls take its dark as a tint, so the dark layer covers only the floor', () => {
  for (const area of AREAS) {
    const tint = darkTint(area);
    if (!LAND_LIGHT[area]) {
      assert.equal(tint, 0xffffff, `${area} is not dark: its rim is drawn as it is`);
      continue;
    }
    // (each channel is the dark laid over white at the land's weight: darker than white, never black)
    const { dark, colour } = LAND_LIGHT[area]!;
    for (const shift of [16, 8, 0]) {
      const ch = (tint >> shift) & 255;
      assert.equal(ch, Math.round(255 * (1 - dark) + ((colour >> shift) & 255) * dark));
      assert.ok(ch < 255 && ch > 120, `${area}: ${ch}`);
    }
  }
  assert.ok(DARK_MARGIN <= 1);
});
