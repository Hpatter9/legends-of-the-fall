// ASSAULT-LOOKS (docs/notes/assault-1.md, phase 1b; the art plan's 1.2 and its rule that looks never hide or fake the rules): every tile of
// Bloodtusk Hold has a ground material of the hold's sheet; the fringes and decals are what the rules say; every standing piece is a picture
// of the hold's atlas, and any taller than half a tile stands on a tile the rules make solid (or is a pole, or one of the camp's set
// pieces); a structure's picture follows its hp; and the looks are the same every time.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { holdMapOf, blueprintOf } from '../src/sim/assault/assault';
import { standable } from '../src/sim/board';
import { clutterOf, decalOf, DEEP, faceOf, fortLook, timberGateLook, timberGateFoot, contourTimber, fringesOf, MAT, materialsOf, placementsOf, THIN, BRIDGE_RAILS } from '../src/render/fieldLooks';
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
  for (const name of ['timberHall', 'throne', 'lookout', 'longhouse', 'hideHut', 'warTent', 'smallBanner']) assert.ok(list.some((p) => p.name === name), name);
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
  assert.equal(list.filter((p) => p.name === 'lookout').length, 8, 'corner, worksite and gate towers share timber construction');
  const hall = list.find((p) => p.name === 'timberHall')!;
  assert.ok(hall.scale! >= 0.85);
  assert.equal(b.tiles[hall.front].h, 12);
  assert.ok(hall.u < bp.throne.u && hall.v < bp.throne.v);
});


test('weathered timber keeps actual damage states and earth tracks remain distinct from stone roads', () => {
  const list = placementsOf(b, map.zone, bp, map.forts);
  const timber = list.filter((p) => p.fort !== undefined && map.forts[p.fort].kind === 'palisade' && !p.low && !p.joint);
  assert.ok(new Set(timber.map((p) => p.scale)).size > 5);
  assert.ok(timber.some((p) => p.lean! < 0) && timber.some((p) => p.lean! > 0));
  assert.ok(timber.every((p) => p.name === 'palisadeRun'), 'healthy walls are not drawn as damage or breaches');
  assert.equal(new Set(timber.map((p) => p.intact)).size, 4, 'four healthy timber variants');
  assert.ok(timber.every((p) => p.intact && SPRITES[p.intact]), 'all variants are packed');
  assert.ok(list.some((p) => p.name === 'timberJoint' && p.joint));
  let tracks = 0;
  for (let i = 0; i < b.tiles.length; i++) if (b.tiles[i].trail && !b.tiles[i].ramp && map.zone[i] !== 83 && !b.tiles[i].ground) {
    assert.ok(mats[i] === MAT.mud2 || mats[i] === MAT.trampled, `earth track at ${i}`);
    tracks++;
  }
  assert.ok(tracks > 100);
  assert.equal(mats[65 * b.w + 76], MAT.cobbles, 'the old stone bridge road remains paved');
});

test('bespoke camp art replaces stand-ins without adding tall clutter on open routes', () => {
  const list = placementsOf(b, map.zone, bp, map.forts);
  const repair = list.find((p) => p.name === 'siegeAssembly');
  assert.ok(repair && !standable(b.tiles[repair.front]), 'engine occupies its existing solid repair footprint');
  for (const name of ['earthApron', 'timberSill', 'earthThreshold', 'ridgeScree', 'ridgeRoots', 'ridgeRockfall', 'rootApron']) {
    assert.ok(list.some((p) => p.name === name && p.low), `${name} remains low decoration`);
  }
  for (const job of ['Smith', 'Woodcutter', 'Butcher']) for (let frame = 0; frame < 4; frame++) {
    const def = SPRITES[`worker${job}${frame}`];
    assert.ok(def && def.r[2] > 0 && def.r[3] > 0, `${job} frame ${frame}`);
  }
});


test('the contour has one timber panel per outer ditch edge, correct perspective and no internal fences', () => {
  const edges = contourTimber(b, map.zone, map.forts).filter((p) => !p.joint);
  const expected = new Set<string>();
  for (const f of map.forts) if (f.kind === 'palisade') for (const i of f.tiles) {
    const u = i % b.w, v = Math.floor(i / b.w);
    for (const [du, dv] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if ([68, 75, 78, 84].includes(map.zone[(v + dv) * b.w + u + du])) expected.add(`${u + du / 2},${v + dv / 2}`);
    }
  }
  assert.equal(edges.length, expected.size);
  assert.deepEqual(new Set(edges.map((p) => `${p.u},${p.v}`)), expected);
  assert.ok(edges.every((p) => p.flip === Number.isInteger(p.u)), 'mirrored art follows the positive u-axis slope');
  for (const p of edges) assert.notEqual(faceOf(b, map.zone, p.front, p.front + 1, bp), 'palisade', 'earth bank is not a second timber wall');
  for (const [i, f] of map.forts.entries()) if (f.kind === 'palisade') assert.ok(edges.some((p) => p.fort === i), `${f.id} is represented`);
});

test('timber gate states preserve closed, damaged and traversable opening semantics', () => {
  for (const kind of ['southGate', 'northGate', 'ironGate', 'sallyPort']) {
    const whole = timberGateLook(fortLook(kind, 100, 100, false, false));
    const battered = timberGateLook(fortLook(kind, 40, 100, false, false));
    const broken = timberGateLook(fortLook(kind, 0, 100, true, false));
    const opened = timberGateLook(fortLook(kind, 100, 100, false, true));
    assert.ok(SPRITES[whole] && SPRITES[battered] && SPRITES[broken]);
    assert.ok(whole.endsWith('Whole'));
    assert.ok(broken.endsWith('Open'));
    assert.equal(opened, broken);
  }
});


test('timber gate feet meet the outer opening plane with the matching axis', () => {
  for (const f of map.forts) {
    if (f.kind === 'palisade' || f.kind === 'drum') continue;
    const pose = timberGateFoot(f, b.w);
    const us = f.tiles.map((i) => i % b.w), vs = f.tiles.map((i) => Math.floor(i / b.w));
    if (pose.flip) {
      assert.equal(pose.u, (Math.min(...us) + Math.max(...us)) / 2);
      assert.ok(pose.v === Math.min(...vs) - 0.5 || pose.v === Math.max(...vs) + 0.5);
    } else {
      assert.equal(pose.v, (Math.min(...vs) + Math.max(...vs)) / 2);
      assert.ok(pose.u === Math.min(...us) - 0.5 || pose.u === Math.max(...us) + 0.5);
    }
  }
});

test('every painted hold\'s bridge takes its painted rails: posts on its water edges, a piece at each corner of its two ends', () => {
  for (const army of BRIDGE_RAILS) {
    const ybp = blueprintOf(army as Parameters<typeof blueprintOf>[0])!;
    const ymap = holdMapOf(army as Parameters<typeof holdMapOf>[0])!;
    const yb = ymap.board;
    const list = placementsOf(yb, ymap.zone, ybp, ymap.forts);
    const posts = list.filter((p) => p.name === 'pier');
    const ends = list.filter((p) => p.name === 'deckEnd');
    assert.ok(posts.length >= 2, `${army}: ${posts.length} posts`);
    for (const p of posts) {
      const t = yb.tiles[p.front];
      assert.ok(t.ground === 'water' || t.ground === 'deep', `${army}: a post stands at the water's edge`);
      // (half a tile out from a bridge tile)
      assert.ok([[0.45, 0], [-0.45, 0], [0, 0.45], [0, -0.45]].some(([du, dv]) => yb.tiles[Math.round(p.v - dv) * yb.w + Math.round(p.u - du)]?.bridge), `${army}: post at ${p.u}, ${p.v}`);
    }
    // (two ends, two corners each)
    assert.equal(ends.length, 4, army);
    for (const p of ends) assert.ok(!yb.tiles[p.front].bridge && yb.tiles[p.front].ground !== 'water' && yb.tiles[p.front].ground !== 'deep', army);
  }
  // (Bloodtusk Hold's bridge keeps its plain planks)
  assert.ok(!BRIDGE_RAILS.has('orcs'));
  assert.ok(!placementsOf(b, map.zone, bp, map.forts).some((p) => p.name === 'pier' || p.name === 'deckEnd'));
});
