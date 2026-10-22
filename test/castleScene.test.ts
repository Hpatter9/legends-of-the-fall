import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { BUILDING_IDS, maxLevel } from '../src/sim/castle';
import { BLURB, effectText, footprint, inBlock, isPaved, layoutFor, LIGHTS, LOOKS, lookBox, SPRITE_SIZE, spriteName, stageOf, STAGES, TALL, TILE_H, TILE_W, VENTS, walkTiles, WIDE } from '../src/render/castleSpots';

const LAYOUTS = { tall: TALL, wide: WIDE };
const looksOf = (id: (typeof BUILDING_IDS)[number]) => LOOKS[id];

test('every picture the looks and props name exists, and its size in the table is the file\'s own', () => {
  const dir = 'src/art/castle';
  const files = readdirSync(dir).filter((f) => f.endsWith('.png')).map((f) => f.slice(0, -4));
  assert.deepEqual(Object.keys(SPRITE_SIZE).sort(), files.sort());
  for (const [name, [w, h]] of Object.entries(SPRITE_SIZE)) {
    const png = readFileSync(`${dir}/${name}.png`);
    assert.equal(png.readUInt32BE(16), w, `${name} width`);
    assert.equal(png.readUInt32BE(20), h, `${name} height`);
  }
  for (const id of BUILDING_IDS) for (const look of looksOf(id)) for (const p of look.parts) assert.ok(SPRITE_SIZE[p.sprite], `${id} uses ${p.sprite}`);
  for (const lay of Object.values(LAYOUTS)) for (const p of lay.props) assert.ok(SPRITE_SIZE[p.sprite], p.sprite);
});

test('every picture is used (by a look, a prop or the ground), and the ground tiles are one lattice cell across', () => {
  const used = new Set<string>(['grass_tile', 'cobble_tile']);
  for (const id of BUILDING_IDS) for (const look of looksOf(id)) for (const p of look.parts) used.add(p.sprite);
  for (const lay of Object.values(LAYOUTS)) for (const p of lay.props) used.add(p.sprite);
  assert.deepEqual(Object.keys(SPRITE_SIZE).filter((k) => !used.has(k)), []);
  // (the tiles come from the isometric kits, half size: a diamond about 90 across, so rows half a tile apart meet edge to edge)
  for (const t of ['grass_tile', 'cobble_tile']) assert.ok(Math.abs(SPRITE_SIZE[t][0] - TILE_W) <= 1, t);
  assert.ok(TILE_H > 0 && TILE_H <= SPRITE_SIZE.grass_tile[1]);
});

test('the wall, what stands beyond it and the trees are drawn behind everything, and the yard has flags', () => {
  for (const [name, lay] of Object.entries(LAYOUTS)) {
    const behind = lay.props.filter((p) => p.depth !== undefined);
    assert.ok(behind.length >= 5, `${name} has its wall and trees behind`);
    assert.ok(lay.flags.length >= 2, `${name} flags`);
    for (const f of lay.flags) assert.ok(f.x > 0 && f.x < lay.w && f.y > 0 && f.y < lay.h, `${name} flag`);
  }
});

test('every upgrade has four looks and a plot on the tile lattice, inside the yard, in both arrangements', () => {
  for (const [name, lay] of Object.entries(LAYOUTS)) {
    assert.deepEqual(Object.keys(lay.plots).sort(), [...BUILDING_IDS].sort(), name);
    for (const id of BUILDING_IDS) {
      const p = lay.plots[id];
      assert.ok(Number.isInteger(p.u) && Number.isInteger(p.v) && p.w >= 1 && p.d >= 1, `${name} ${id} tiles`);
      // (the foot line is the plot's middle tile, down by the picture's base)
      assert.ok(p.x > 0 && p.x < lay.w, `${name} ${id} across`);
      assert.ok(p.y > 0 && p.y <= lay.h, `${name} ${id} down`);
      assert.ok(BLURB[id].length > 0, id);
    }
    for (const p of lay.props) assert.ok(p.x > 0 && p.x < lay.w && p.y > 0 && p.y <= lay.h, `${name} ${p.sprite} at ${p.u},${p.v}`);
  }
  for (const id of BUILDING_IDS) assert.equal(looksOf(id).length, STAGES, id);
});

test('no two plots share a tile, and at least one tile of grass or path lies between any two', () => {
  for (const [name, lay] of Object.entries(LAYOUTS))
    for (let i = 0; i < BUILDING_IDS.length; i++)
      for (let j = i + 1; j < BUILDING_IDS.length; j++) {
        const a = lay.plots[BUILDING_IDS[i]];
        const b = lay.plots[BUILDING_IDS[j]];
        const gapU = Math.max(a.u, b.u) - Math.min(a.u + a.w, b.u + b.w);
        const gapV = Math.max(a.v, b.v) - Math.min(a.v + a.d, b.v + b.d);
        assert.ok(gapU >= 1 || gapV >= 1, `${name} ${BUILDING_IDS[i]} and ${BUILDING_IDS[j]} are ${gapU} and ${gapV} tiles apart`);
      }
});

test('every building\'s door opens onto a paved tile in front of it, and every door can be reached from the gate', () => {
  for (const [name, lay] of Object.entries(LAYOUTS)) {
    const tiles = walkTiles(lay);
    const key = (t: { u: number; v: number }) => `${t.u},${t.v}`;
    const gate = lay.props.find((p) => p.sprite === 'gatehouse')!;
    // (the gatehouse's face looks down and right: the tile in front of it is one step along `u`)
    const start = { u: gate.u + 1, v: gate.v };
    assert.ok(isPaved(lay, start.u, start.v), `${name} the road starts at the gate`);
    const seen = new Set([key(start)]);
    const queue = [start];
    for (let i = 0; i < queue.length; i++)
      for (const [du, dv] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = { u: queue[i].u + du, v: queue[i].v + dv };
        if (isPaved(lay, n.u, n.v) && !seen.has(key(n))) {
          seen.add(key(n));
          queue.push(n);
        }
      }
    for (const id of BUILDING_IDS) {
      const p = lay.plots[id];
      assert.ok(isPaved(lay, p.door.u, p.door.v), `${name} ${id} door has road in front`);
      assert.ok(seen.has(key(p.door)), `${name} ${id} door is on the road from the gate`);
      // (mirrored pictures open down-right, past the last tile in `u`; the others open down-left, past the last in `v`)
      if (p.flip) assert.ok(p.door.u === p.u + p.w && p.door.v >= p.v && p.door.v < p.v + p.d, `${name} ${id} door faces its road`);
      else assert.ok(p.door.v === p.v + p.d && p.door.u >= p.u && p.door.u < p.u + p.w, `${name} ${id} door faces its road`);
      for (const t of footprint(p)) assert.ok(!isPaved(lay, t.u, t.v), `${name} ${id} stands on grass`);
    }
    assert.ok(tiles.every((t) => seen.has(key(t))), `${name} every paved tile is on the road network`);
  }
});

test('the plaza is a clear 3 x 3 of paving with the statue in its middle and a brazier at each corner', () => {
  for (const [name, lay] of Object.entries(LAYOUTS)) {
    const pz = lay.plaza;
    assert.equal(pz.u1 - pz.u0, 2, `${name} plaza width`);
    assert.equal(pz.v1 - pz.v0, 2, `${name} plaza depth`);
    const mid = { u: pz.u0 + 1, v: pz.v0 + 1 };
    const statue = lay.props.filter((p) => p.sprite === 'statue');
    assert.equal(statue.length, 1, name);
    assert.deepEqual([statue[0].u, statue[0].v], [mid.u, mid.v], `${name} statue is centred`);
    const braziers = lay.props.filter((p) => p.sprite === 'brazier').map((p) => `${p.u},${p.v}`).sort();
    assert.deepEqual(braziers, [`${pz.u0},${pz.v0}`, `${pz.u0},${pz.v1}`, `${pz.u1},${pz.v0}`, `${pz.u1},${pz.v1}`].sort(), `${name} braziers`);
    // (nothing else stands on the paving: props belong on the grass beside it)
    for (const p of lay.props)
      if (p.depth === undefined && isPaved(lay, p.u, p.v)) assert.ok(inBlock(pz, p.u, p.v), `${name} ${p.sprite} at ${p.u},${p.v} stands in a road`);
  }
});

test('props stand on tiles clear of every plot, and the wall closes the yard: a corner tower, a gatehouse and runs that meet', () => {
  for (const [name, lay] of Object.entries(LAYOUTS)) {
    const used = new Set<string>();
    for (const id of BUILDING_IDS) for (const t of footprint(lay.plots[id])) used.add(`${t.u},${t.v}`);
    for (const p of lay.props) if (p.depth === undefined) assert.ok(!used.has(`${p.u},${p.v}`), `${name} ${p.sprite} at ${p.u},${p.v} is on a plot`);
    const tower = lay.props.find((p) => p.sprite === 'watchtower')!;
    const gate = lay.props.find((p) => p.sprite === 'gatehouse')!;
    assert.ok(tower && gate, name);
    // (the left run is along `v` at the tower's `u`, the right run along `u` at its `v`; the gatehouse is in the left run)
    assert.equal(gate.u, tower.u, `${name} gate is in the left wall`);
    assert.ok(gate.v > tower.v, `${name} gate is below the tower`);
    for (const p of lay.props.filter((q) => q.sprite === 'wall')) assert.ok(p.flip ? p.v === tower.v && p.u > tower.u : p.u === tower.u && p.v > tower.v, `${name} wall piece at ${p.u},${p.v} is in line with the tower`);
    // (the yard lies inside the wall: no plot, road or plaza tile is behind it)
    for (const id of BUILDING_IDS) assert.ok(lay.plots[id].u > tower.u + 1 && lay.plots[id].v > tower.v + 1, `${name} ${id} is inside the wall`);
    for (const t of walkTiles(lay)) assert.ok(t.u > tower.u && t.v > tower.v, `${name} road tile ${t.u},${t.v} is inside the wall`);
  }
});

test('a house is never used for two buildings, and every look is bigger than the one before it', () => {
  const HOUSES = ['shrine', 'spiral', 'chapel', 'stockpile', 'longhouse', 'great_hall', 'cottage', 'thatch', 'barracks', 'anvil_stall', 'workshop', 'forge', 'campfire'];
  const owner: Record<string, string> = {};
  for (const id of BUILDING_IDS)
    for (const look of looksOf(id))
      for (const p of look.parts)
        if (HOUSES.includes(p.sprite)) {
          assert.ok(!owner[p.sprite] || owner[p.sprite] === id, `${p.sprite} is in ${owner[p.sprite]} and ${id}`);
          owner[p.sprite] = id;
        }
  for (const id of BUILDING_IDS) {
    const sizes = looksOf(id).map((l) => lookBox(l));
    for (let i = 1; i < sizes.length; i++) assert.ok(sizes[i].w * sizes[i].h > sizes[i - 1].w * sizes[i - 1].h, `${id} look ${i} grows`);
  }
});

test('all four buildings fit inside the scene, with nothing clipped, and the upright scene is narrow enough for a phone', () => {
  for (const [name, lay] of Object.entries(LAYOUTS))
    for (const id of BUILDING_IDS) {
      const p = lay.plots[id];
      for (const st of [0, STAGES - 1]) {
        const b = lookBox(looksOf(id)[st], p.flip);
        assert.ok(p.x + b.x0 >= 0 && p.x + b.x1 <= lay.w, `${name} ${id} look ${st} across`);
        assert.ok(p.y - b.h >= 0 && p.y <= lay.h, `${name} ${id} look ${st} down`);
      }
      assert.ok(p.tagY! > 0 && p.tagY! <= lay.h, `${name} ${id} tag`);
    }
  // (393 css pixels wide on the phone this is made for, 852 high: with the bars the scene gets 600, so the upright yard fits without panning)
  assert.ok(TALL.w <= 393 && TALL.h <= 600);
  assert.ok(WIDE.openTop >= 0 && WIDE.openTop < WIDE.h);
});

test('buildings stand apart: at most a corner overlap between their grand looks', () => {
  for (const [name, lay] of Object.entries(LAYOUTS))
    for (let i = 0; i < BUILDING_IDS.length; i++)
      for (let j = i + 1; j < BUILDING_IDS.length; j++) {
        const a = BUILDING_IDS[i];
        const b = BUILDING_IDS[j];
        const ba = lookBox(looksOf(a)[STAGES - 1], lay.plots[a].flip);
        const bb = lookBox(looksOf(b)[STAGES - 1], lay.plots[b].flip);
        const ax = lay.plots[a].x + (ba.x0 + ba.x1) / 2;
        const bx = lay.plots[b].x + (bb.x0 + bb.x1) / 2;
        const across = (ba.w + bb.w) / 2 - Math.abs(ax - bx);
        const down = Math.min(ba.h, bb.h) - Math.abs(lay.plots[a].y - lay.plots[b].y);
        assert.ok(across < 24 || down <= 12, `${name} ${a} and ${b} overlap by ${across} across and ${down} down`);
      }
});

test('a building has a plot at level 0, the grand look at its top level, and every look in between is reached in order', () => {
  assert.equal(STAGES, 4);
  for (const id of BUILDING_IDS) {
    const seen: number[] = [];
    for (let l = 0; l <= maxLevel(id); l++) seen.push(stageOf(id, l));
    assert.equal(seen[0], 0, id);
    assert.equal(seen[seen.length - 1], STAGES - 1, id);
    assert.deepEqual([...seen].sort((a, b) => a - b), seen, `${id} never shrinks`);
    assert.deepEqual([...new Set(seen)], [0, 1, 2, 3], `${id} shows all four looks`);
  }
  assert.equal(stageOf('treasury', -3), 0);
  assert.equal(stageOf('treasury', 99), STAGES - 1);
  assert.equal(spriteName('mageTower', 2), 'mageTower2');
});

test('the upright yard is for portrait screens and the wide one for the rest', () => {
  assert.equal(layoutFor(true), TALL);
  assert.equal(layoutFor(false), WIDE);
});

test('vents and lights sit on the look they belong to', () => {
  for (const id of BUILDING_IDS) {
    assert.equal(VENTS[id].length, STAGES, id);
    assert.equal(LIGHTS[id].length, STAGES, id);
    for (let st = 0; st < STAGES; st++) {
      const b = lookBox(looksOf(id)[st]);
      for (const v of VENTS[id][st]) {
        assert.ok(v.dx >= b.x0 - 2 && v.dx <= b.x1 + 2 && v.dy <= 2 && v.dy >= -b.h - 2, `${id} look ${st} ${v.kind}`);
      }
      for (const l of LIGHTS[id][st]) assert.ok(l.dy <= 0 && l.dy >= -b.h - 4, `${id} light ${st}`);
    }
  }
});

test('the upgrade card words grow with the level', () => {
  assert.equal(effectText('treasury', 3), '+30 starting gold');
  assert.equal(effectText('barracks', 2), '+12% hp for every hero');
  assert.equal(effectText('armoury', 1), '+5% attack for every hero');
  assert.match(effectText('mageTower', 4), /48% faster, \+2 spell power/);
  assert.match(effectText('mageTower', 0), /0% faster, \+0 spell power/);
});
