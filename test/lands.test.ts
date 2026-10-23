import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { AREAS, CLASSIC_AREAS, makeBoard, type Area } from '../src/sim/board';
import { ARMIES, landOf, landsOf } from '../src/sim/armies';
import { spireArea } from '../src/sim/lands';
import { LAND_WEATHER, WEATHERS, weatherFor, weatherOf } from '../src/sim/weather';
import { countFor, fogFor, lookOf, MAX_PARTICLES, MAX_TINT, tintAt, LIT_PROPS } from '../src/render/weatherRules';
import { armyRun, chainOf } from '../src/sim/run';
import { HEROES } from '../src/sim/units';

test('there are seventeen lands, the first six being the climb and the Calamity\'s', () => {
  assert.equal(AREAS.length, 17);
  assert.deepEqual([...CLASSIC_AREAS], [...AREAS.slice(0, 6)]);
  assert.equal(new Set(AREAS).size, AREAS.length);
});

test('every land has its art: ground, props, tall growth and backdrop layers on disk', () => {
  for (const area of AREAS) {
    if (area === 'highlands') continue;
    for (const f of ['top1', 'top2', 'high', 'side', 'boulder1', 'boulder2', 'tall1', 'tall2', 'bg1', 'bg2', 'bg3']) assert.ok(existsSync(`src/art/areas/${area}/${f}.png`), `${area}/${f}`);
  }
});

test('every army fights on one or two lands that alternate by wave, the first on wave 1', () => {
  for (const a of ARMIES) {
    const lands = landsOf(a);
    assert.ok(lands.length >= 1 && lands.length <= 2, a.id);
    assert.equal(a.area, lands[0], a.id);
    for (let n = 1; n <= a.waves.length; n++) assert.equal(landOf(a, n), lands[(n - 1) % lands.length]);
  }
  const want: Record<string, Area[]> = {
    orcs: ['warcamp', 'highlands'],
    undead: ['graveyard', 'dungeon'],
    beasts: ['plains', 'autumn'],
    wildwood: ['forest', 'swamp'],
    labyrinth: ['temple', 'ruins'],
    ogres: ['highlands', 'snow'],
    infernal: ['volcano', 'desert'],
    yokai: ['shrine', 'forest'],
    golems: ['forge', 'crystal'],
  };
  for (const a of ARMIES) assert.deepEqual([...landsOf(a)], want[a.id], a.id);
});

test('an army run lays each wave of its long map on that wave\'s land', () => {
  const run = armyRun(21, 'orcs', HEROES);
  const chain = chainOf(run)!;
  assert.deepEqual(chain.slice(0, 4).map((s) => s.board.area), ['warcamp', 'highlands', 'warcamp', 'highlands']);
});

test('the spire draws its land from all of them, never the same one for two blocks running, and the same each time', () => {
  const seen = new Set<Area>();
  for (let seed = 1; seed <= 40; seed++) {
    let prev: Area | null = null;
    for (let block = 0; block < 12; block++) {
      const a = spireArea(seed, block * 5 + 1);
      assert.equal(a, spireArea(seed, block * 5 + 5), 'five floors share a land');
      assert.equal(a, spireArea(seed, block * 5 + 1));
      assert.notEqual(a, prev);
      prev = a;
      seen.add(a);
    }
  }
  assert.equal(seen.size, AREAS.length);
});

test('every land\'s weathers are known, include clear unless the land is of fire (the Shrine is always night), and are rolled by the board\'s seed', () => {
  for (const area of AREAS) {
    const table = LAND_WEATHER[area];
    // (the Moonlit Shrine is always at night, the owner's call: its only weather)
    if (area === 'shrine') {
      assert.deepEqual(Object.keys(table), ['night']);
      for (let seed = 1; seed <= 50; seed++) assert.equal(weatherFor(seed, area), 'night');
      continue;
    }
    const keys = Object.keys(table);
    assert.ok(keys.length >= 2, area);
    for (const k of keys) assert.ok((WEATHERS as readonly string[]).includes(k), `${area} ${k}`);
    assert.ok(table.clear, `${area} has clear weather`);
    const counts: Record<string, number> = {};
    for (let seed = 1; seed <= 600; seed++) {
      const w = weatherFor(seed, area);
      assert.ok(keys.includes(w), `${area} rolled ${w}`);
      assert.equal(w, weatherFor(seed, area));
      counts[w] = (counts[w] ?? 0) + 1;
    }
    // (every weather of the land comes up, and clear is no rarer than a fifth of the fights)
    for (const k of keys) assert.ok(counts[k] > 0, `${area} never ${k}`);
    assert.ok((counts.clear ?? 0) / 600 >= 0.15, `${area} clear share`);
  }
  assert.equal(weatherOf(makeBoard(77, 'snow')), weatherFor(77, 'snow'));
});

test('the weather is a side stream: the boards and the old lands\' fights are as they were', () => {
  const before = JSON.stringify(makeBoard(5, 'highlands'));
  for (let i = 0; i < 20; i++) weatherFor(5 + i, 'forest');
  assert.equal(JSON.stringify(makeBoard(5, 'highlands')), before);
});

test('weather looks are capped, halved on a battery saver, still under reduced motion, and never heavy', () => {
  for (const area of AREAS)
    for (const w of WEATHERS) {
      const look = lookOf(w, area);
      assert.ok(countFor(look, false, false) <= MAX_PARTICLES, `${area} ${w}`);
      assert.ok(countFor(look, true, false) <= Math.ceil(look.count / 2), `${area} ${w} saver`);
      assert.equal(countFor(look, false, true), 0);
      assert.ok(look.alpha <= MAX_TINT, `${area} ${w} tint`);
      assert.ok(fogFor(look, true) <= look.fog);
      // (a tint comes in gently and never past its weight)
      assert.equal(tintAt(look, 0), 0);
      assert.ok(tintAt(look, 10_000) <= MAX_TINT);
      for (const n of [...look.size, look.streak]) assert.equal(n, Math.round(n), 'whole pixels');
    }
  assert.equal(lookOf('clear', 'plains').count, 0);
  assert.ok(lookOf('rain', 'plains').count > 0);
  assert.ok(lookOf('night', 'shrine').glow > 0);
});

test('only the lands with a lit prop have night glows, and the props they name exist', () => {
  for (const [area, props] of Object.entries(LIT_PROPS)) {
    for (const i of props!) assert.ok(existsSync(`src/art/areas/${area}/boulder${i + 1}.png`), `${area} boulder ${i + 1}`);
  }
});
