import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { BUILDING_IDS, maxLevel } from '../src/sim/castle';
import { BLURB, defaultZoom, doubleTapZoom, effectText, footprint, inBlock, isPaved, LIGHTS, lookFor, LOOKS, lookBox, pickScale, PLACE_IDS, PLACE_LOOK, PLACES, pinchStep, PLOT_IDS, rememberedZoom, SPRITE_SIZE, spriteName, stageOf, STAGES, stepZoom, TILE_H, TILE_W, VENTS, walkTiles, WALL_RISE, WALL_STEP, YARD, zoomLevels } from '../src/render/castleSpots';

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
    // (the gatehouse stands in the north-west run, whose face looks down and right: the tile inside it is one step on along `u`)
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

test('the wall has two sides, north-west and north-east: a tower at the corner and at each run\'s end, runs of cells exactly one repeat apart, exactly one gate, the front open', () => {
  const lay = YARD;
  const { u0, v0, u1, v1 } = lay.yard;
  const towers = lay.props.filter((p) => p.sprite === 'watchtower');
  assert.deepEqual(towers.map((p) => `${p.u},${p.v}`).sort(), [`${u0},${v0}`, `${u1},${v0}`, `${u0},${v1}`].sort(), 'a tower at the north corner and at the end of each run');
  const gates = lay.props.filter((p) => p.sprite === 'gatehouse');
  assert.equal(gates.length, 1, 'exactly one gate');
  assert.equal(gates[0].u, u0, 'the gate is in the north-west run');
  const [W] = SPRITE_SIZE.wall;
  const north = towers.find((p) => p.u === u0 && p.v === v0)!;
  const cells = lay.props.filter((p) => p.sprite === 'wall');
  // (each run: cells in order from the north tower; the north-west one goes down-left, the north-east one down-right and mirrored)
  const runs = [
    { name: 'north-west', cells: cells.filter((p) => !p.flip).sort((a, b) => b.x - a.x), sign: -1, far: towers.find((p) => p.u === u0 && p.v === v1)!, tiles: v1 - v0 },
    { name: 'north-east', cells: cells.filter((p) => p.flip).sort((a, b) => a.x - b.x), sign: 1, far: towers.find((p) => p.u === u1 && p.v === v0)!, tiles: u1 - u0 },
  ];
  for (const run of runs) {
    assert.ok(run.cells.length >= 4, `${run.name} run has cells`);
    run.cells.forEach((c, i) => {
      if (i === 0) return;
      const prev = run.cells[i - 1];
      assert.equal(c.x - prev.x, run.sign * WALL_STEP.dx, `${run.name} cell ${i} is one repeat across from the last`);
      assert.equal(c.y - prev.y, WALL_STEP.dy, `${run.name} cell ${i} is one repeat down from the last`);
    });
    // (the foot line of the run: a cell's lowest point is its near-end corner; the far end stands WALL_RISE higher; the next cell's near end is exactly where this one's far end is)
    const first = run.cells[0];
    // the first cell's high end is at the north tower's middle: its far corner (x) and its foot line (y, a dozen pixels above the tower's foot)
    const northX = north.x;
    const edge = run.sign < 0 ? first.x + Math.round(W / 2) - 1 : first.x - Math.round(W / 2) + 1;
    assert.ok(Math.abs(edge - northX) <= 1, `${run.name} run starts at the north tower (${edge} vs ${northX})`);
    assert.equal(first.y - WALL_RISE, north.y - 12, `${run.name} run's foot meets the tower's base`);
    // the run reaches the far tower: the cells cover the whole length between the tower middles, the last one cut exactly where the run ends
    const last = run.cells[run.cells.length - 1];
    const lastWidth = last.cut ? last.cut[1] - last.cut[0] : W;
    const covered = (run.cells.length - 1) * WALL_STEP.dx + lastWidth;
    assert.ok(Math.abs(covered - run.tiles * 45) <= 1, `${run.name} run covers ${covered} of ${run.tiles * 45}`);
    assert.equal(Math.abs(run.far.x - northX), run.tiles * 45, `${run.name} far tower is ${run.tiles} tiles along`);
  }
  // (no wall on the other two sides: nothing stands on the south-east or south-west edge)
  for (const p of lay.props.filter((q) => q.sprite === 'wall' || q.sprite === 'gatehouse' || q.sprite === 'watchtower')) assert.ok(p.u === u0 || p.v === v0, `${p.sprite} at ${p.u},${p.v} is on a back side`);
  // (both runs sit behind everything, the towers over their joints; every plot has a tile of grass behind it)
  for (const p of lay.props.filter((q) => q.sprite === 'wall' || q.sprite === 'gatehouse')) assert.ok(p.depth !== undefined && p.depth <= -1000 + 1, `wall piece at ${p.u},${p.v} is behind`);
  for (const p of towers.filter((q) => q.depth !== undefined)) assert.ok(p.depth! > cells[0].depth!, 'a tower is drawn over the wall');
  for (const id of PLOT_IDS) assert.ok(lay.plots[id].u >= u0 + 1 && lay.plots[id].v >= v0 + 1, `${id} has a tile of grass behind it`);
  // (the chapel is not in the corner: the corner tower shows)
  const chapel = lay.plots.chapel;
  assert.ok(chapel.u >= u0 + 2 && chapel.v >= v0 + 2, 'the chapel stands two tiles in from the corner');
  for (const t of walkTiles(lay)) assert.ok(t.u > u0 && t.v > v0, `road tile ${t.u},${t.v} is inside the wall`);
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

test('zoom: whole steps only, open at about one css pixel per scene pixel, remember the last, step with a pinch, swap with a double tap', () => {
  const fit = (dpr: number, w = 393, h = 654) => pickScale(w, h, dpr, YARD.w, YARD.h).k;
  // (a phone opens at round(dpr) device pixels per scene pixel, about one css pixel, and offers the overview (1) up to one closer than that)
  for (const [dpr, open] of [[2, 2], [2.5, 3], [2.75, 3], [3, 3]] as const) {
    assert.equal(defaultZoom(dpr, fit(dpr)), open, `dpr ${dpr}`);
    assert.deepEqual(zoomLevels(dpr, fit(dpr)), Array.from({ length: open + 1 }, (_, i) => i + 1), `dpr ${dpr}`);
  }
  // (dpr 1: css 1 by default, and css 2 as the one step in)
  assert.equal(defaultZoom(1, fit(1, 1280, 800)), 1);
  assert.deepEqual(zoomLevels(1, fit(1, 1280, 800)), [1, 2]);
  // (a screen that shows the whole village bigger than that opens at what fits)
  assert.equal(defaultZoom(1, 2), 2);
  assert.ok(zoomLevels(1, 3).includes(3));
  // (the remembered zoom is used only when this screen offers it)
  assert.equal(rememberedZoom(1, 3, 1), 1);
  assert.equal(rememberedZoom(4, 3, 1), 4);
  assert.equal(rememberedZoom(null, 3, 1), 3);
  assert.equal(rememberedZoom(3, 1, 1), 1);
  assert.equal(rememberedZoom(9, 3, 1), 3);
  // (a pinch steps one level at a time and stops at the ends)
  const lv = zoomLevels(3, 1);
  assert.equal(stepZoom(1, 1, lv), 2);
  assert.equal(stepZoom(3, 1, lv), 4);
  assert.equal(stepZoom(4, 1, lv), 4);
  assert.equal(stepZoom(1, -1, lv), 1);
  assert.equal(stepZoom(3, -1, lv), 2);
  assert.equal(pinchStep(1.5), 1);
  assert.equal(pinchStep(0.6), -1);
  assert.equal(pinchStep(1.1), 0);
  assert.equal(pinchStep(0.9), 0);
  // (a double tap on empty ground: the overview goes to the opening zoom, anything closer goes to the overview)
  assert.equal(doubleTapZoom(1, 3, 1), 3);
  assert.equal(doubleTapZoom(3, 3, 1), 1);
  assert.equal(doubleTapZoom(4, 3, 1), 1);
  assert.equal(doubleTapZoom(1, 1, 1), 1);
});
