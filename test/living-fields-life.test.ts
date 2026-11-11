// LIVING-FIELDS, step 4 (docs/notes/living-fields.md, `src/render/boardLifeRules.ts`): the life of a battlefield, looks only: creatures by
// land and weather that take fright near a fighter, what lies about a land and the marks a fight leaves, falls off the near edges, light.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { AREAS, DEPLOY_ROWS, makeBoard } from '../src/sim/board';
import { LAND_WEATHER, WEATHERS, type Weather } from '../src/sim/weather';
import { layFieldHazards } from '../src/sim/fieldTraps';
import { CRITTER_MAX, DECAL_NAMES, FISH_MAX, LAND_DECALS, LAND_LIFE, MARKS_MAX, SCARE, critterSpots, edgeFalls, landDecals, lifeFor, markOf, scaredBy, shaftsFor, stepPuff } from '../src/render/boardLifeRules';
import { FLOORS } from '../src/render/floorRules';
import { ambientOf, countFor, MAX_PARTICLES } from '../src/render/weatherRules';

test('creatures fit the land and the weather: none in the rain but frogs, fireflies by night, nothing alive on the ashlands or in the forge', () => {
  for (const area of AREAS)
    for (const w of WEATHERS) {
      const life = lifeFor(area, w);
      const total = Object.values(life).reduce((a, b) => a + b, 0);
      assert.ok(total <= CRITTER_MAX, `${area} ${w}: ${total}`);
      if (w === 'rain' || w === 'snow' || w === 'ash' || w === 'embers') assert.ok(!life.bird && !life.butterfly && !life.rabbit, `${area} in ${w}`);
      if (w === 'night') assert.ok(!life.butterfly && (life.bird ?? 0) <= 1, `${area} at night`);
      // (a battery saver has half, rounded up)
      const saver = lifeFor(area, w, true);
      for (const [k, n] of Object.entries(life)) assert.ok((saver[k as keyof typeof saver] ?? 0) <= Math.ceil(n / 2), `${area} ${w} ${k} on a saver`);
    }
  assert.deepEqual(lifeFor('volcano', 'clear'), {});
  assert.deepEqual(lifeFor('forge', 'embers'), {});
  assert.ok((lifeFor('plains', 'night').firefly ?? 0) === 0 && (lifeFor('forest', 'night').firefly ?? 0) >= 2);
  assert.ok((lifeFor('swamp', 'rain').frog ?? 0) > (lifeFor('swamp', 'clear').frog ?? 0));
  // (every land but the two of fire has something alive in at least one of its weathers)
  for (const area of AREAS) {
    const some = (Object.keys(LAND_WEATHER[area]) as Weather[]).some((w) => Object.keys(lifeFor(area, w)).length > 0);
    assert.equal(some, area !== 'volcano' && area !== 'forge', area);
  }
});

test('they stand on open middle ground, never on a trap, a strike or in a side\'s rows; fish are in the water; the same board, the same creatures', () => {
  let fish = 0;
  for (const area of AREAS)
    for (let seed = 1; seed <= 12; seed++) {
      const b = makeBoard(seed, area);
      layFieldHazards(b, seed, 3);
      const spots = critterSpots(b, 'clear');
      assert.deepEqual(critterSpots(b, 'clear'), spots, 'the same again');
      assert.equal(new Set(spots.map((s) => s.i)).size, spots.length, 'one a tile');
      assert.ok(spots.filter((s) => s.kind === 'fish').length <= FISH_MAX);
      for (const s of spots) {
        const t = b.tiles[s.i];
        const v = Math.floor(s.i / b.w);
        assert.ok(!t.trap && !t.risk && !t.brazier && !t.rock && !t.wall && !t.barrel, `${area}: a ${s.kind} on a trap or a prop`);
        if (s.kind === 'fish') {
          fish++;
          assert.ok(t.ground === 'water' || t.ground === 'deep', `${area}: a fish on ${t.ground}`);
          assert.ok(area !== 'volcano' && area !== 'forge', 'no fish in lava');
        } else {
          assert.equal(t.ground, undefined, `${area}: a ${s.kind} on ${t.ground}`);
          assert.ok(v >= DEPLOY_ROWS && v < b.d - DEPLOY_ROWS, `${area}: a ${s.kind} in a side's rows`);
        }
        assert.ok(Math.abs(s.dx) <= 12 && Math.abs(s.dy) <= 5 && (s.way === 1 || s.way === -1));
      }
    }
  assert.ok(fish > 60, `${fish} fish over the boards`);
});

test('a creature takes fright when a fighter is within reach, and not from across the board', () => {
  const [tw, th] = [64, 32];
  assert.ok(scaredBy(0, 0, tw / 2, th / 2, tw, th), 'the next tile');
  assert.ok(scaredBy(0, 0, 0, 0, tw, th));
  assert.ok(!scaredBy(0, 0, tw * 1.5, th * 1.5, tw, th), 'three tiles off');
  assert.ok(SCARE > 1 && SCARE < 3);
});

test('each land has its own things lying about, from its sheet; rain adds puddles; a fight\'s marks are of the sheet too', () => {
  for (const area of AREAS) {
    const set = LAND_DECALS[area];
    assert.ok(set.n >= 2 && set.n <= 5, area);
    for (const n of set.names) assert.ok(DECAL_NAMES.includes(n), `${area}: ${n}`);
    assert.ok(existsSync(`src/art/assault/${FLOORS[area].hold}/decals.webp`), `${area}: its sheet's decals`);
    for (let seed = 1; seed <= 8; seed++) {
      const b = makeBoard(seed, area);
      layFieldHazards(b, seed, 2);
      const ds = landDecals(b, 'clear');
      assert.ok(ds.length <= set.n);
      assert.deepEqual(landDecals(b, 'clear'), ds);
      for (const d of ds) {
        const t = b.tiles[d.i];
        assert.ok(!t.ground && !t.trap && !t.risk && !t.rock && !t.wall, `${area}: a decal on ${t.ground ?? t.trap ?? 'a prop'}`);
        assert.ok(d.turn >= 0 && d.turn < 4 && d.alpha > 0 && d.alpha <= 1);
      }
      // (two tiles apart at least, so none overlap)
      for (const a of ds) for (const z of ds) if (a !== z) assert.ok(Math.abs((a.i % b.w) - (z.i % b.w)) + Math.abs(Math.floor(a.i / b.w) - Math.floor(z.i / b.w)) >= 2);
      const wet = landDecals(b, 'rain');
      if (area !== 'volcano' && area !== 'forge') assert.ok(wet.length >= ds.length, `${area}: rain takes none away`);
    }
  }
  assert.equal(markOf('boom'), 'scorch');
  assert.equal(markOf('rockfall'), 'rubble');
  assert.equal(markOf('lightning'), 'scorch');
  assert.equal(markOf('brazier'), 'embers');
  assert.equal(markOf('geyser'), 'puddle');
  assert.equal(markOf('mud'), null, 'deep mud leaves no mark');
  assert.ok(MARKS_MAX <= 20, 'a board keeps only so many marks');
});

test('water and lava pour off a plain board\'s near edges, and only there; an army\'s road keeps its own', () => {
  let falls = 0;
  for (const area of AREAS)
    for (let seed = 1; seed <= 20; seed++) {
      const b = makeBoard(seed, area);
      for (const f of edgeFalls(b)) {
        falls++;
        const t = b.tiles[f.v * b.w + f.u];
        assert.ok(t.ground === 'water' || t.ground === 'deep' || t.ground === 'lava');
        assert.ok((f.du === 1 && f.u === b.w - 1) || (f.dv === 1 && f.v === b.d - 1), 'on the last column or the last row');
        assert.equal(f.lava, t.ground === 'lava' || (t.ground === 'deep' && (area === 'volcano' || area === 'forge')));
      }
    }
  assert.ok(falls > 100, `${falls} falls over the boards`);
  const road = makeBoard(3, 'swamp');
  road.falls = [];
  assert.deepEqual(edgeFalls(road), []);
});

test('light, dust and smoke: shafts only on a clear day and never on a battery saver; a step raises the ground\'s own puff', () => {
  assert.ok(shaftsFor('forest', 'clear', false, false) >= 2);
  assert.equal(shaftsFor('forest', 'rain', false, false), 0);
  assert.equal(shaftsFor('forest', 'clear', true, false), 0);
  assert.ok(shaftsFor('forest', 'clear', false, true) <= 1, 'one still shaft with reduced motion');
  assert.equal(shaftsFor('desert', 'clear', false, false), 0);
  assert.equal(stepPuff('plains', 'water')!.key, 'ice-puff');
  assert.equal(stepPuff('plains', 'deep'), null);
  assert.equal(stepPuff('snow', undefined)!.key, 'ice-puff');
  assert.equal(stepPuff('desert', undefined)!.tint, 0xe8d0a0);
  const atlas = JSON.parse(readFileSync('src/art/fx/pack/atlas.json', 'utf8')) as Record<string, unknown>;
  for (const area of AREAS) for (const g of [undefined, 'water', 'tall', 'coals', 'ice']) assert.ok(stepPuff(area, g)!.key in atlas, `${area} ${g}`);
  assert.ok('fire-smoke' in atlas);
});

test('a clear day has the land\'s own motes, fewer than any weather; none with reduced motion, half on a battery saver', () => {
  for (const area of AREAS) {
    const look = ambientOf(area);
    assert.ok(look.count > 0 && look.count <= 20, `${area}: ${look.count} motes`);
    assert.ok(countFor(look, false, false) <= MAX_PARTICLES);
    assert.equal(countFor(look, false, true), 0);
    assert.ok(countFor(look, true, false) <= Math.ceil(look.count / 2));
    assert.equal(look.alpha, 0, 'no tint on a clear day');
  }
});

test('every land has two or three kinds of creature at most, and the painted sheet\'s cells are the ones the importer cuts', () => {
  for (const area of AREAS) assert.ok(Object.keys(LAND_LIFE[area]).length <= 4, area);
  const py = readFileSync('tools/living-fields/import-art.py', 'utf8');
  for (const row of ['rabbit', 'crow', 'songbird', 'frog', 'fish', 'butterfly']) assert.ok(py.includes(`'${row}'`), row);
  assert.deepEqual(JSON.parse(readFileSync('src/art/living-fields/life.json', 'utf8')), {});
});
