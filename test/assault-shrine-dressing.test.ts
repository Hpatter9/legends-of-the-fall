import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildHold } from '../src/sim/assault/fieldMap';
import { MOONLIT_SHRINE } from '../src/sim/assault/maps/yokai';
import { BLOODTUSK } from '../src/sim/assault/maps/orcs';
import { placementsOf, clutterOf, decalOf, materialsOf, MAT } from '../src/render/fieldLooks';
import { SPRITES, DECALS } from '../src/render/assaultYokaiAtlas';

// Dressing must preserve routes, hazards, destructible structures and the grid.
test('shrine dressing is deterministic, leaves the board untouched and names real art', () => {
  const map = buildHold(MOONLIT_SHRINE);
  const before = structuredClone(map);
  const first = placementsOf(map.board, map.zone, MOONLIT_SHRINE, map.forts);
  assert.deepEqual(first, placementsOf(map.board, map.zone, MOONLIT_SHRINE, map.forts));
  assert.deepEqual(map, before);
  for (const p of first) if (!p.road) assert.ok(SPRITES[p.name], p.name);
  for (const name of ['landmarkA', 'landmarkB', 'landmarkC', 'landmarkD', 'prop1', 'prop3', 'prop8', 'waterProp10', 'waterFlowers']) assert.ok(first.some(p => p.name === name), name);
  for (const [i, f] of map.forts.entries()) assert.ok(first.some(p => p.fort === i), `fort ${f.name} retained`);
});

test('large water landmarks fit entirely on flat deep water, away from the bridge and fords', () => {
  const { board: b, zone, forts } = buildHold(MOONLIT_SHRINE);
  const list = placementsOf(b, zone, MOONLIT_SHRINE, forts);
  for (const p of list.filter(p => p.name === 'landmarkC' || p.name === 'landmarkD')) {
    const [fu, fv] = SPRITES[p.name].fp;
    assert.equal(fu, 3); assert.equal(fv, 3);
    assert.ok((p.scale ?? 1) <= 1);
    for (let v = p.v - 1; v <= p.v + 1; v++) for (let u = p.u - 1; u <= p.u + 1; u++) {
      const t = b.tiles[v * b.w + u];
      assert.equal(t.ground, 'deep'); assert.ok(!t.bridge);
      assert.equal(t.h, b.tiles[p.front].h);
    }
  }
  for (const p of list.filter(p => p.name.startsWith('water') && !p.name.endsWith('Steps'))) {
    assert.equal(b.tiles[p.front].ground, 'deep'); assert.ok(!b.tiles[p.front].bridge);
  }
});

test('the Orc hold keeps its original art and landmarks', () => {
  const {board, zone, forts} = buildHold(BLOODTUSK);
  const list = placementsOf(board, zone, BLOODTUSK, forts);
  assert.ok(list.some(p => p.name === 'longhouse'));
  assert.ok(!list.some(p => p.name.startsWith('landmark') || p.name.startsWith('prop')));
});


test('regional ground details cover woods, ruins, shoreline, bailey and reserve without touching paths or the map', () => {
  const map = buildHold(MOONLIT_SHRINE);
  const before = structuredClone(map);
  const { board: b, zone } = map;
  const mats = materialsOf(b, zone, MOONLIT_SHRINE);
  const counts: Record<string, number> = {};
  for (let v = 0; v < b.d; v++) for (let u = 0; u < b.w; u++) {
    const i = v * b.w + u, t = b.tiles[i];
    const c = clutterOf(b, zone, mats, u, v, 'yokai');
    assert.equal(c, clutterOf(b, zone, mats, u, v, 'yokai'));
    if (c) {
      assert.ok(SPRITES[c], c);
      assert.ok(!t.paved && !t.ramp && !t.bridge && !t.rock && !t.wall);
      const area = mats[i] === MAT.shingle ? 'shore' : String.fromCharCode(zone[i]);
      counts[area] = (counts[area] ?? 0) + 1;
    }
    const d = decalOf(b, zone, mats, MOONLIT_SHRINE, u, v);
    if (d) {
      assert.ok((DECALS as readonly string[]).includes(d.name), d.name);
      if (zone[i] === 'T'.charCodeAt(0)) counts.tallGrassDecals = (counts.tallGrassDecals ?? 0) + 1;
    }
  }
  // Ambush grass stays free of extra props; it receives ground decals instead.
  for (const area of ['K', 'V', 'N', 'B', 'I', 'shore', 'tallGrassDecals']) assert.ok(counts[area] > 0, `${area} has its own ground details`);
  assert.deepEqual(map, before);
});

test('wall and camp details stay on their existing solid plots and all tall scenery remains off routes', () => {
  const { board: b, zone, forts } = buildHold(MOONLIT_SHRINE);
  const list = placementsOf(b, zone, MOONLIT_SHRINE, forts);
  const wallLamps = list.filter(p => p.name === 'prop8' && p.scale === 0.6);
  assert.ok(wallLamps.length > 10);
  for (const p of wallLamps) assert.ok(b.tiles[p.front].wall, `wall lamp ${p.front}`);
  const tentDetails = list.filter(p => p.low && p.scale === 0.35);
  assert.ok(tentDetails.length >= 3);
  for (const p of tentDetails) assert.ok(b.tiles[p.front].rock, `tent supplies ${p.front}`);
  assert.ok(list.some(p => p.name === 'prop12'), 'wish trees');
  assert.ok(list.some(p => p.name === 'prop14'), 'sacred stones');
});
