import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { BUILDING_IDS, maxLevel } from '../src/sim/castle';
import { BLURB, cellX, cellY, decorAt, effectText, footprint, inBlock, isPaved, pavingAt, TOP_GAP, viewFor, VIEW_W, LIGHTS, lookFor, LOOKS, lookBox, pickScale, PLACE_IDS, PLACE_LOOK, PLACES, PLOT_IDS, SPRITE_SIZE, spriteName, stageOf, STAGES, TILE_H, TILE_W, VENTS, walkTiles, WALL_RISE, WALL_STEP, YARD } from '../src/render/castleSpots';

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
  // (the paving's flagstones, and the woods and lawn scenery, are picked tile by tile)
  for (const lay of Object.values(LAYOUTS)) for (let u = -40; u <= 60; u++) for (let v = -40; v <= 60; v++) {
    const d = decorAt(lay, u, v);
    if (d) used.add(d.sprite);
    const pv = pavingAt(lay, u, v);
    if (pv) used.add(pv);
  }
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
    // (the gatehouse stands in the north-east run, whose face looks down and left: the tile inside it is one step on along `v`)
    const start = { u: gate.u, v: gate.v + 1 };
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
  assert.equal(gates[0].v, v0, 'the gate is in the north-east run');
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
  // (the chapel does not hide the corner tower: its spire stays below the tower's top)
  const chapel = lay.plots.chapel;
  assert.ok(chapel.y - lookBox(lookFor('chapel', 0)).h > north.y - SPRITE_SIZE.watchtower[1] + 40, 'the corner tower shows above the chapel');
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

test('one close-up scale: a whole number of device pixels per scene pixel that shows about the same width on every screen', () => {
  // (a phone standing: 2 device pixels per scene pixel at a ratio of 2.6 to 3, the frame showing about 540 to 620 scene pixels across)
  for (const w of [360, 393, 412]) for (const dpr of [2.6, 2.75, 3]) {
    const { k, css } = pickScale(w, dpr);
    assert.equal(k, 2, `${w}@${dpr}`);
    assert.ok(Math.abs(css - k / dpr) < 1e-9);
    assert.ok(w / css >= 450 && w / css <= 650, `${w}@${dpr} shows ${w / css} scene pixels across`);
  }
  // (any other screen gets the whole number that shows about the same: a ratio of 1 a whole css scale)
  for (const [w, dpr] of [[393, 1], [393, 2], [412, 1.5], [1280, 1], [1920, 1], [1920, 2], [2560, 1]] as const) {
    const { k, css } = pickScale(w, dpr);
    assert.ok(Number.isInteger(k) && k >= 1, `${w}@${dpr}: k is whole`);
    assert.ok(Math.abs(css - k / dpr) < 1e-9);
    if (dpr === 1) assert.ok(Number.isInteger(css), `${w}@${dpr}: a whole css scale`);
    if (w >= 1000) assert.ok(w / css >= VIEW_W * 0.65 && w / css <= VIEW_W * 1.6, `${w}@${dpr} shows ${w / css}`);
  }
});

// the three phones the game is checked on (css pixels: the frame is what is left between the chips bar and the tab bar)
const PHONES: [number, number][] = [[393, 650], [360, 580], [412, 715]];

test('the wall runs off both sides of the screen with no end tower showing, and the courtyard and every door are on screen at every phone size', () => {
  const lay = YARD;
  const towers = lay.props.filter((p) => p.sprite === 'watchtower');
  const [tw] = SPRITE_SIZE.watchtower;
  for (const [w, h] of PHONES)
    for (const dpr of [2.75, 3]) {
      const view = viewFor(lay, w, h, dpr);
      const left = -view.ox;
      const right = view.w - view.ox;
      assert.equal(view.h, Math.ceil(h / view.css), 'the canvas is exactly the frame');
      // (the corner tower stands under the top of the frame; the other two towers, at the runs' far ends, are off the screen)
      const north = towers.find((p) => p.u === lay.yard.u0 && p.v === lay.yard.v0)!;
      assert.ok(Math.abs((view.oy + north.y - 134) * view.css - TOP_GAP) < 2, `${w}x${h}@${dpr} corner tower under the top`);
      for (const t of towers) if (t !== north) assert.ok(t.x + tw / 2 < left || t.x - tw / 2 > right, `${w}x${h}@${dpr} the tower at ${t.u},${t.v} is off the screen`);
      // (so the two runs reach both edges)
      const cells = lay.props.filter((p) => p.sprite === 'wall');
      assert.ok(cells.some((c) => c.x < left + 10), `${w}x${h}@${dpr} the north-west run reaches the left edge`);
      assert.ok(cells.some((c) => c.x > right - 10), `${w}x${h}@${dpr} the north-east run reaches the right edge`);
      // (the plaza, every door and every tag are inside the frame, the sign and its tag too)
      const inside = (x: number, y: number, what: string): void => {
        assert.ok(x >= left && x <= right && y >= -view.oy && y <= view.h - view.oy, `${w}x${h}@${dpr} ${what} (${x}, ${y}) is on screen`);
      };
      const plaza = lay.plaza;
      for (const [u, v] of [[plaza.u0, plaza.v0], [plaza.u1, plaza.v0], [plaza.u0, plaza.v1], [plaza.u1, plaza.v1]]) inside(cellX(lay.grid, u, v), cellY(lay.grid, u, v), 'a plaza corner');
      for (const id of PLOT_IDS) {
        const p = lay.plots[id];
        inside(cellX(lay.grid, p.door.u, p.door.v), cellY(lay.grid, p.door.u, p.door.v), `${id} door`);
        const box = lookBox(lookFor(id, STAGES - 1), p.flip);
        const tx = p.x + (box.x0 + box.x1) / 2 + (p.tagDx ?? 0);
        // (a tag is about 55 css pixels across: its whole width fits)
        const half = 30 / view.css;
        assert.ok(tx - half >= left && tx + half <= right, `${w}x${h}@${dpr} ${id} tag fits across`);
        inside(tx, p.tagY!, `${id} tag`);
        // (a building at the edge may be cropped, but more than half of it shows)
        const shown = Math.min(p.x + box.x1, right) - Math.max(p.x + box.x0, left);
        assert.ok(shown >= box.w * 0.55, `${w}x${h}@${dpr} ${id} is cropped to ${Math.round((shown / box.w) * 100)}%`);
      }
    }
});

test('the countryside is only the road, the lawn and its scenery: nothing stands on a road, a plot or a village prop, and the signpost is on the road', () => {
  const lay = YARD;
  const taken = new Set<string>();
  for (const id of PLOT_IDS) for (const t of footprint(lay.plots[id])) taken.add(`${t.u},${t.v}`);
  for (const p of lay.props) taken.add(`${p.u},${p.v}`);
  let count = 0;
  for (let u = -40; u <= 60; u++)
    for (let v = -40; v <= 60; v++) {
      const d = decorAt(lay, u, v);
      if (!d) continue;
      count++;
      assert.ok(!taken.has(`${u},${v}`) && !isPaved(lay, u, v), `${d.sprite} at ${u},${v} is on a road, a plot or a prop`);
      assert.ok(u < lay.yard.u0 || v < lay.yard.v0 || u > lay.yard.u1 || v > lay.yard.v1, `${d.sprite} at ${u},${v} is inside the wall`);
    }
  assert.ok(count > 200, 'woods behind the wall and scenery on the lawn');
  // (the road runs from the village's south street to the bottom of the scene)
  assert.ok(isPaved(lay, 3, 6), 'the road starts at the village');
  assert.ok(Math.max(...lay.land.road.map((r) => r.u0 + r.v0)) * 26 + lay.grid.y > lay.h - 100, 'the road runs to the bottom');
  assert.ok(isPaved(lay, lay.plots.armies.door.u, lay.plots.armies.door.v), 'the signpost opens onto the road');
  assert.equal(pavingAt(lay, 1, 1), 'flagstone');
  assert.equal(pavingAt(lay, 1, 2), 'cobble_tile');
  assert.equal(pavingAt(lay, 20, -20), null);
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

test('the tavern, the chapel and the Armies signpost are places, not upgrades: one look, a tag that says where they lead, and plots of their own', () => {
  assert.deepEqual([...PLACE_IDS], ['tavern', 'chapel', 'armies']);
  assert.equal(PLACES.armies.name, 'Armies');
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
