// ASSAULT-LOOKS (docs/notes/assault-1.md, phase 1b; the art plan's 1.2 and its rule that looks never hide or fake the rules): every tile of
// Bloodtusk Hold has a ground material of the hold's sheet; the fringes and decals are what the rules say; every standing piece is a picture
// of the hold's atlas, and any taller than half a tile stands on a tile the rules make solid (or is a pole, or one of the camp's set
// pieces); a structure's picture follows its hp; and the looks are the same every time.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { holdMapOf, blueprintOf } from '../src/sim/assault/assault';
import { standable } from '../src/sim/board';
import { clutterOf, decalOf, DEEP, faceOf, fortLook, fringesOf, MAT, materialsOf, placementsOf, THIN } from '../src/render/fieldLooks';
import { DECALS, EDGES, FACES, GROUND, SPRITES } from '../src/render/assaultOrcAtlas';

const bp = blueprintOf('orcs')!;
const map = holdMapOf('orcs')!;
const b = map.board;
const mats = materialsOf(b, map.zone, bp);

test('every tile has a ground material of the sheet: water as water, the roads cobbled, the crag paths heath, the bridge planks', () => {
  for (let i = 0; i < b.w * b.d; i++) {
    const t = b.tiles[i];
    const m = mats[i];
    assert.ok(m === DEEP || m < GROUND.length, `tile ${i}`);
    if (t.ground === 'deep') assert.equal(m, DEEP);
    if (t.ground === 'water') assert.equal(m, MAT.shallows);
    if (t.bridge) assert.equal(m, MAT.planks);
    if (map.zone[i] === 83) assert.equal(m, MAT.heath);
  }
  // (the road from the bridge to the South Gate)
  assert.equal(mats[65 * b.w + 76], MAT.cobbles);
  // (more than a handful of grounds: not a green carpet)
  assert.ok(new Set(mats).size >= 12, `${new Set(mats).size} materials`);
});

test('the fringes, faces and decals name the sheets\' cells, and lie only between tiles at one height', () => {
  let fringes = 0;
  let decals = 0;
  for (let v = 0; v < b.d; v++)
    for (let u = 0; u < b.w; u++) {
      for (const f of fringesOf(b, mats, u, v)) {
        assert.ok((EDGES as readonly string[]).includes(f.edge), f.edge);
        assert.ok(f.turn >= 0 && f.turn < 4);
        fringes++;
      }
      const d = decalOf(b, map.zone, mats, bp, u, v);
      if (d) {
        assert.ok((DECALS as readonly string[]).includes(d.name), d.name);
        assert.ok(u % 2 === 0 && v % 2 === 0, 'two decals never touch');
        decals++;
      }
      const c = clutterOf(b, map.zone, mats, u, v);
      if (c) assert.ok(SPRITES[c], c);
      const i = v * b.w + u;
      assert.ok((FACES as readonly string[]).includes(faceOf(b, map.zone, i, u + 1 < b.w ? i + 1 : -1)));
    }
  assert.ok(fringes > 1000 && decals > 300, `${fringes} fringes, ${decals} decals`);
  // (a cliff's foot takes no fringe from its top: the wall's foot in the bailey)
  assert.ok(!fringesOf(b, mats, 50, 62).some((f) => f.edge.startsWith('flags')));
});

test('every standing piece is the hold\'s picture, and none taller than half a tile hides a fighter on open ground', () => {
  const list = placementsOf(b, map.zone, bp, map.forts);
  const fortTiles = new Set(map.forts.flatMap((f) => f.tiles));
  for (const p of list) {
    if (p.road || p.name === 'landBoulder') continue;
    assert.ok(SPRITES[p.name], p.name);
    if (p.low || p.set || THIN.has(p.name) || p.fort !== undefined) continue;
    // (the clutter and pens are low; a pole hides nobody; the camp's set pieces are as phase 1 drew them)
    const t = b.tiles[p.front];
    // (a tower's top stands on its perch, sorted behind its crew)
    assert.ok(!standable(t) || fortTiles.has(p.front) || (t.perch && p.depth !== undefined), `${p.name} at (${p.front % b.w}, ${Math.floor(p.front / b.w)}) stands on open ground`);
  }
  // (each structure shows; the keep, the throne and the corner towers are there)
  for (let n = 0; n < map.forts.length; n++) assert.ok(list.some((p) => p.fort === n), map.forts[n].id);
  for (const name of ['keep', 'throne', 'lookout', 'gateTower', 'watchtower', 'longhouse', 'hideHut', 'warTent', 'smallBanner']) assert.ok(list.some((p) => p.name === name), name);
  assert.deepEqual(placementsOf(b, map.zone, bp, map.forts), list, 'the same every time');
});

test('a structure\'s picture follows its hp: whole, battered, broken, its breach', () => {
  assert.equal(fortLook('palisade', 1000, 1000, false, false), 'palisadeRun');
  assert.equal(fortLook('palisade', 500, 1000, false, false), 'palisadeBattered');
  assert.equal(fortLook('palisade', 200, 1000, false, false), 'palisadeBroken');
  assert.equal(fortLook('palisade', 0, 1000, true, false), 'palisadeBreach');
  assert.equal(fortLook('southGate', 2000, 5000, false, false), 'southGateBattered');
  assert.equal(fortLook('ironGate', 0, 9000, true, false), 'ironGateBroken');
  assert.equal(fortLook('sallyPort', 2400, 2400, false, true), 'sallyPortBroken');
  assert.equal(fortLook('northGate', 100, 3000, false, false), 'northGate');
  assert.equal(fortLook('drum', 0, 1500, true, false), 'drumSilenced');
  for (const k of ['palisadeRun', 'palisadeBattered', 'palisadeBroken', 'palisadeBreach', 'palisadeInner', 'southGate', 'southGateBattered', 'southGateBroken', 'northGate', 'northGateBroken', 'ironGate', 'ironGateBattered', 'ironGateBroken', 'sallyPort', 'sallyPortBattered', 'sallyPortBroken', 'drumStruck', 'drumSilenced', 'burntHeap', 'ladder', 'ram'])
    assert.ok(SPRITES[k], k);
});


test('the orc inner defences are exposed rock and timber lookouts, with a larger summit hall', () => {
  const list = placementsOf(b, map.zone, bp, map.forts);
  const wall = map.zone.findIndex((z) => z === 83);
  assert.equal(faceOf(b, map.zone, wall, wall + 1, bp), 'cliff');
  assert.ok(!list.some((p) => p.name === 'cornerTower' || p.name === 'crenel'), 'the continuous dressed-stone curtain is gone');
  assert.equal(list.filter((p) => p.name === 'lookout').length, 4);
  const hall = list.find((p) => p.name === 'keep')!;
  assert.ok(hall.scale! >= 0.85);
  assert.equal(b.tiles[hall.front].h, 12);
  assert.ok(hall.u < bp.throne.u && hall.v < bp.throne.v);
});


test('weathered timber keeps actual damage states and earth tracks remain distinct from stone roads', () => {
  const list = placementsOf(b, map.zone, bp, map.forts);
  const timber = list.filter((p) => p.fort !== undefined && map.forts[p.fort].kind === 'palisade' && !p.low);
  assert.ok(new Set(timber.map((p) => p.scale)).size > 5);
  assert.ok(timber.some((p) => p.lean! < 0) && timber.some((p) => p.lean! > 0));
  assert.ok(timber.every((p) => p.name === 'palisadeRun'), 'healthy walls are not drawn as damage or breaches');
  assert.ok(list.some((p) => p.name === 'brokenRail' && p.low));
  let tracks = 0;
  for (let i = 0; i < b.tiles.length; i++) if (b.tiles[i].trail && !b.tiles[i].ramp && map.zone[i] !== 83 && !b.tiles[i].ground) {
    assert.ok(mats[i] === MAT.mud2 || mats[i] === MAT.trampled, `earth track at ${i}`);
    tracks++;
  }
  assert.ok(tracks > 100);
  assert.equal(mats[65 * b.w + 76], MAT.cobbles, 'the old stone bridge road remains paved');
});
