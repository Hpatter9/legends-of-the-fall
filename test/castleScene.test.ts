import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { BUILDING_IDS, maxLevel } from '../src/sim/castle';
import { BLURB, effectText, footprint, inBlock, isPaved, LIGHTS, lookFor, LOOKS, lookBox, pickScale, PLACE_IDS, PLACE_LOOK, PLACES, PLOT_IDS, SPRITE_SIZE, spriteName, stageOf, STAGES, TILE_H, TILE_W, VENTS, walkTiles, YARD } from '../src/render/castleSpots';

const LAYOUTS = { yard: YARD };
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
  for (const id of PLACE_IDS) for (const p of PLACE_LOOK[id].parts) used.add(p.sprite);
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

test('every upgrade has four looks and a plot on the tile lattice, inside the yard', () => {
  for (const [name, lay] of Object.entries(LAYOUTS)) {
    assert.deepEqual(Object.keys(lay.plots).sort(), [...PLOT_IDS].sort(), name);
    for (const id of PLOT_IDS) {
      const p = lay.plots[id];
      assert.ok(Number.isInteger(p.u) && Number.isInteger(p.v) && p.w >= 1 && p.d >= 1, `${name} ${id} tiles`);
      // (the foot line is the plot's middle tile, down by the picture's base)
      assert.ok(p.x > 0 && p.x < lay.w, `${name} ${id} across`);
      assert.ok(p.y > 0 && p.y <= lay.h, `${name} ${id} down`);
      if (!PLACE_IDS.includes(id as never)) assert.ok(BLURB[id as (typeof BUILDING_IDS)[number]].length > 0, id);
    }
    for (const p of lay.props) assert.ok(p.x > 0 && p.x < lay.w && p.y > 0 && p.y <= lay.h, `${name} ${p.sprite} at ${p.u},${p.v}`);
  }
  for (const id of BUILDING_IDS) assert.equal(looksOf(id).length, STAGES, id);
});

test('no two plots share a tile, and at least one tile of grass or path lies between any two', () => {
  for (const [name, lay] of Object.entries(LAYOUTS))
    for (let i = 0; i < PLOT_IDS.length; i++)
      for (let j = i + 1; j < PLOT_IDS.length; j++) {
        const a = lay.plots[PLOT_IDS[i]];
        const b = lay.plots[PLOT_IDS[j]];
        const gapU = Math.max(a.u, b.u) - Math.min(a.u + a.w, b.u + b.w);
        const gapV = Math.max(a.v, b.v) - Math.min(a.v + a.d, b.v + b.d);
        assert.ok(gapU >= 1 || gapV >= 1, `${name} ${PLOT_IDS[i]} and ${PLOT_IDS[j]} are ${gapU} and ${gapV} tiles apart`);
      }
});

test('every building\'s door opens onto a paved tile in front of it, and every door can be reached from the gate', () => {
  for (const [name, lay] of Object.entries(LAYOUTS)) {
    const tiles = walkTiles(lay);
    const key = (t: { u: number; v: number }) => `${t.u},${t.v}`;
    const gate = lay.props.find((p) => p.sprite === 'gatehouse')!;
    // (the gatehouse stands in the south-east run, `u` = the yard's far side: the tile inside it is one step back along `u`)
    const start = { u: gate.u - 1, v: gate.v };
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
    for (const id of PLOT_IDS) {
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

test('props stand on tiles clear of every plot', () => {
  for (const [name, lay] of Object.entries(LAYOUTS)) {
    const used = new Set<string>();
    for (const id of PLOT_IDS) for (const t of footprint(lay.plots[id])) used.add(`${t.u},${t.v}`);
    for (const p of lay.props) if (p.depth === undefined || p.depth > -1000) assert.ok(!used.has(`${p.u},${p.v}`), `${name} ${p.sprite} at ${p.u},${p.v} is on a plot`);
  }
});

test('the wall is one closed ring: a tower at every corner, runs along all four sides with no gap, exactly one gate, and every plot well inside', () => {
  const lay = YARD;
  const { u0, v0, u1, v1 } = lay.yard;
  const towers = lay.props.filter((p) => p.sprite === 'watchtower').map((p) => `${p.u},${p.v}`).sort();
  assert.deepEqual(towers, [`${u0},${v0}`, `${u1},${v0}`, `${u0},${v1}`, `${u1},${v1}`].sort(), 'a tower on each of the four corners');
  const gates = lay.props.filter((p) => p.sprite === 'gatehouse');
  assert.equal(gates.length, 1, 'exactly one gate');
  // (each side: the pieces, in order along it; a wall piece covers one tile either side of its middle, the gatehouse a tile and a half, the corner towers half a tile)
  const sides: { name: string; along: 'u' | 'v'; fixed: number; from: number; to: number; flip?: boolean }[] = [
    { name: 'north-west', along: 'v', fixed: u0, from: v0, to: v1 },
    { name: 'south-east', along: 'v', fixed: u1, from: v0, to: v1 },
    { name: 'north-east', along: 'u', fixed: v0, from: u0, to: u1, flip: true },
    { name: 'south-west', along: 'u', fixed: v1, from: u0, to: u1, flip: true },
  ];
  for (const side of sides) {
    const on = (p: { u: number; v: number }) => (side.along === 'v' ? p.u === side.fixed : p.v === side.fixed);
    const at = (p: { u: number; v: number }) => (side.along === 'v' ? p.v : p.u);
    const pieces = lay.props.filter((p) => (p.sprite === 'wall' || p.sprite === 'gatehouse') && on(p));
    assert.ok(pieces.length >= 3, `${side.name} run has pieces`);
    for (const p of pieces.filter((q) => q.sprite === 'wall')) assert.equal(!!p.flip, !!side.flip, `${side.name} piece faces the right way`);
    const spans = pieces.map((p) => [at(p) - (p.sprite === 'gatehouse' ? 1.5 : 1), at(p) + (p.sprite === 'gatehouse' ? 1.5 : 1)]).sort((a, b) => a[0] - b[0]);
    let reach = side.from + 0.5;
    for (const [a, b] of spans) {
      assert.ok(a <= reach + 0.75, `${side.name} run has a gap before ${a} (covered to ${reach})`);
      reach = Math.max(reach, b);
    }
    assert.ok(reach >= side.to - 0.5 - 0.75, `${side.name} run reaches the far corner`);
  }
  assert.equal(gates[0].u, u1, 'the gate is in the south-east run');
  // (the back runs sit behind everything; the near ones are sorted with the rest by their feet)
  for (const p of lay.props.filter((q) => q.sprite === 'wall')) assert.equal(p.depth !== undefined, p.u === u0 || p.v === v0, `wall piece at ${p.u},${p.v} depth`);
  // (the near runs must not hide any plot: two tiles of grass between a plot and a near run)
  for (const id of PLOT_IDS) {
    const p = lay.plots[id];
    assert.ok(p.u >= u0 + 1 && p.v >= v0 + 1, `${id} has a tile of grass behind it`);
    assert.ok(p.u + p.w - 1 <= u1 - 2 && p.v + p.d - 1 <= v1 - 2, `${id} has grass between it and the near wall`);
  }
  for (const t of walkTiles(lay)) assert.ok(t.u > u0 && t.u < u1 && t.v > v0 && t.v < v1, `road tile ${t.u},${t.v} is inside the wall`);
});

test('a house is never used for two buildings, and every look is bigger than the one before it', () => {
  const HOUSES = ['shrine', 'spiral', 'chapel', 'stockpile', 'longhouse', 'great_hall', 'cottage', 'thatch', 'barracks', 'anvil_stall', 'workshop', 'forge', 'campfire', 'shed', 'cart', 'stable', 'granary', 'atelier', 'manor', 'tavern', 'church'];
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

test('all four buildings fit inside the scene, with nothing clipped', () => {
  for (const [name, lay] of Object.entries(LAYOUTS))
    for (const id of PLOT_IDS) {
      const p = lay.plots[id];
      for (const st of [0, STAGES - 1]) {
        const b = lookBox(lookFor(id, st), p.flip);
        assert.ok(p.x + b.x0 >= 0 && p.x + b.x1 <= lay.w, `${name} ${id} look ${st} across`);
        assert.ok(p.y - b.h >= 0 && p.y <= lay.h, `${name} ${id} look ${st} down`);
      }
      assert.ok(p.tagY! > 0 && p.tagY! <= lay.h, `${name} ${id} tag`);
    }
  // (the whole ring and its towers, with a little grass outside)
  for (const p of YARD.props) assert.ok(p.x > 0 && p.x < YARD.w, `${p.sprite} at ${p.u},${p.v} is inside the scene`);
});

test('the scale is a whole number of device pixels per scene pixel, as large as lets the whole village show, and it fits', () => {
  const frames: [number, number, number][] = [
    [393, 600, 2.75], // a phone standing (the bars take 250 of the 852)
    [393, 600, 3],
    [393, 600, 2.6],
    [852, 300, 2.75], // the same phone lying down
    [852, 300, 3],
    [1280, 800, 1], // a desktop
    [1920, 1000, 1],
    [1920, 1000, 2],
  ];
  for (const [w, h, dpr] of frames) {
    const { k, css } = pickScale(w, h, dpr, YARD.w, YARD.h);
    assert.ok(Number.isInteger(k) && k >= 1, `${w}x${h}@${dpr}: k is whole`);
    assert.ok(Math.abs(css - k / dpr) < 1e-9, 'css is k over the pixel ratio');
    // (the whole village shows: the canvas is YARD.w * k device pixels, i.e. YARD.w * css css pixels)
    if (k > 1 || (YARD.w * k) / dpr <= w) {
      assert.ok(YARD.w * css <= w + 1e-6 && YARD.h * css <= h + 1e-6, `${w}x${h}@${dpr}: the village fits at k=${k}`);
      const bigger = pickScale(w, h, dpr, YARD.w, YARD.h).k + 1;
      assert.ok(YARD.w * bigger / dpr > w || YARD.h * bigger / dpr > h, `${w}x${h}@${dpr}: k=${k} is the largest that fits`);
    }
  }
  // (a phone fits the whole village at one device pixel per scene pixel; a dpr-1 desktop gets a whole css scale)
  assert.equal(pickScale(393, 600, 3, YARD.w, YARD.h).k, 1);
  assert.equal(pickScale(1920, 1000, 1, YARD.w, YARD.h).css, 1);
  // (a screen too small even at one: it still draws at one and pans)
  assert.equal(pickScale(300, 200, 1, YARD.w, YARD.h).k, 1);
  // (a much smaller village could be drawn bigger: the picker takes the largest whole k)
  assert.equal(pickScale(393, 600, 3, 300, 400).k, 3);
});

test('buildings stand apart: at most a corner overlap between their grand looks', () => {
  for (const [name, lay] of Object.entries(LAYOUTS))
    for (let i = 0; i < PLOT_IDS.length; i++)
      for (let j = i + 1; j < PLOT_IDS.length; j++) {
        const a = PLOT_IDS[i];
        const b = PLOT_IDS[j];
        const ba = lookBox(lookFor(a, STAGES - 1), lay.plots[a].flip);
        const bb = lookBox(lookFor(b, STAGES - 1), lay.plots[b].flip);
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

test('the tavern and the chapel are places, not upgrades: one look, a tag that says where they lead, and plots of their own', () => {
  assert.deepEqual([...PLACE_IDS], ['tavern', 'chapel']);
  assert.equal(PLACES.tavern.name, 'Tavern');
  assert.equal(PLACES.tavern.to, 'your heroes');
  assert.equal(PLACES.chapel.name, 'Chapel');
  assert.equal(PLACES.chapel.to, 'spells');
  for (const id of PLACE_IDS) {
    assert.ok(!(BUILDING_IDS as string[]).includes(id), `${id} is not an upgrade`);
    assert.equal(lookFor(id, 0), lookFor(id, 3), `${id} does not grow`);
    assert.ok(YARD.plots[id], id);
  }
  // (the tavern's look has its sign, barrels and a lantern; the chapel is not the mage tower's chapel)
  assert.deepEqual(PLACE_LOOK.tavern.parts.map((p) => p.sprite).sort(), ['barrels', 'lamp', 'signpost', 'tavern']);
  assert.ok(!LOOKS.mageTower.some((l) => l.parts.some((p) => p.sprite === 'church')));
  assert.ok(PLACE_LOOK.chapel.parts.every((p) => p.sprite !== 'chapel'));
});

test('the market and the garden: two or three stalls on the plaza\'s edge or the main road, and a garden of beds in the yard\'s corner', () => {
  const stalls = YARD.props.filter((p) => /^stall\d?$/.test(p.sprite));
  assert.ok(stalls.length >= 2 && stalls.length <= 3, 'two or three stalls');
  const { u0, u1 } = YARD.plaza;
  for (const p of stalls) {
    // (beside the plaza or the road: a tile next to paving)
    const near = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].some(([du, dv]) => isPaved(YARD, p.u + du, p.v + dv));
    assert.ok(near, `stall at ${p.u},${p.v} is by paving`);
    assert.ok(!isPaved(YARD, p.u, p.v), 'a stall is not in the road');
  }
  assert.ok(u1 - u0 === 2);
  const beds = YARD.props.filter((p) => p.sprite === 'field' || p.sprite === 'field2' || p.sprite === 'herb');
  assert.ok(beds.length >= 3, 'a garden of beds');
  // (the beds sit together in the south corner: three on one row, next to each other)
  const row = beds.filter((p) => p.v === 5).map((p) => p.u).sort((a, b) => a - b);
  assert.ok(row.length >= 3 && row.every((u, i) => i === 0 || u === row[i - 1] + 1), 'three beds side by side');
});
