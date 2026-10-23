import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AREAS, CLASSIC_AREAS, boardOk, canStep, D, DEPLOY_ROWS, GROUND_COST, LAVA_BURN, makeBoard, sightClear, tileAt, W, type Area, type Tile } from '../src/sim/board';
import { addUnit, fight, place, startBattle, stepBattle } from '../src/sim/battle';
import { AREA_STAGES, areaFor, newRun, startStage } from '../src/sim/run';
import { walkFrom } from '../src/sim/path';

const flat = (extra: Partial<Tile> = {}): Tile => ({ h: 0, deco: 0, ...extra });
/** A board with every tile level and bare. */
const bare = () => {
  const b = makeBoard(1, 'highlands', W, D, 'classic');
  for (const t of b.tiles) {
    t.h = 0;
    delete t.rock;
    delete t.barrel;
    delete t.ground;
    delete t.bush;
  }
  return b;
};

test('the area follows the stage: five stages each, in turn, then round again', () => {
  assert.equal(areaFor(1), 'highlands');
  assert.equal(areaFor(AREA_STAGES), 'highlands');
  assert.equal(areaFor(AREA_STAGES + 1), 'forest');
  assert.deepEqual([1, 6, 11, 16, 21, 26].map(areaFor), [...CLASSIC_AREAS]);
  assert.equal(areaFor(AREA_STAGES * CLASSIC_AREAS.length + 1), 'highlands');
  assert.equal(startStage(newRun(5)).board.area, 'highlands');
  const run = newRun(5);
  run.stage = 21;
  assert.equal(startStage(run).board.area, 'volcano');
});

test('every area makes a valid board, the same each time for a seed', () => {
  for (const area of AREAS)
    for (let seed = 1; seed <= 150; seed++) {
      const b = makeBoard(seed, area);
      assert.equal(b.area, area);
      assert.equal(b.tiles.length, W * D);
      assert.ok(boardOk(b), `${area} seed ${seed}`);
      assert.deepEqual(b, makeBoard(seed, area));
      for (const t of b.tiles) assert.ok(!(t.rock && t.ground), 'nothing lies under a boulder');
    }
});

test('the land and boulders are the same in every area; the ground is laid on top', () => {
  // (the rolling land: a shape laid over it, and the area's odds of one, are the layouts' business, `layouts.test.ts`)
  const base = makeBoard(9, 'highlands', W, D, 'classic');
  for (const area of AREAS) {
    const b = makeBoard(9, area, W, D, 'classic');
    assert.deepEqual(b.tiles.map((t) => [t.h, !!t.rock]), base.tiles.map((t) => [t.h, !!t.rock]));
  }
});

test('each area lays its own ground, and lava stays out of the deploy rows', () => {
  const seen = (area: Area, g: string) => Array.from({ length: 120 }, (_, s) => makeBoard(s + 1, area)).some((b) => b.tiles.some((t) => t.ground === g));
  assert.ok(seen('snow', 'ice'));
  assert.ok(seen('volcano', 'lava'));
  assert.ok(seen('desert', 'water'));
  assert.ok(seen('forest', 'tall'));
  assert.ok(!seen('highlands', 'lava') && !seen('highlands', 'ice') && !seen('forest', 'lava') && !seen('snow', 'lava'));
  for (let s = 1; s <= 120; s++) {
    const b = makeBoard(s, 'volcano');
    for (let v = 0; v < D; v++) if (v < DEPLOY_ROWS || v >= D - DEPLOY_ROWS) for (let u = 0; u < W; u++) assert.notEqual(tileAt(b, u, v)!.ground, 'lava');
  }
});

test('shallows slow a step, ice speeds it, lava slows it, and fliers ignore them all', () => {
  assert.equal(canStep(flat(), flat(), 2), 1);
  assert.equal(canStep(flat(), flat({ ground: 'water' }), 2), 1 + GROUND_COST.water);
  assert.equal(canStep(flat(), flat({ ground: 'ice' }), 2), 1 + GROUND_COST.ice);
  assert.ok(canStep(flat(), flat({ ground: 'ice' }), 2)! < 1);
  assert.equal(canStep(flat(), flat({ ground: 'lava' }), 2), 1 + GROUND_COST.lava);
  assert.equal(canStep(flat(), flat({ ground: 'tall' }), 2), 1);
  assert.equal(canStep(flat(), flat({ ground: 'water' }), 9), 1);
});

test('a walk goes round the shallows through the dry gap, and ice is quicker', () => {
  const b = bare();
  for (let u = 0; u < W; u++) tileAt(b, u, 4)!.ground = 'water';
  delete tileAt(b, 3, 4)!.ground;
  const w = walkFrom(b, { u: 3, v: 8 }, 2, new Set());
  assert.equal(w.cost[3], 8, 'straight up the dry gap');
  // (stepping into a shallow tile of the wall costs 2, one more than a dry tile)
  assert.equal(w.cost[4 * W + 0], 3 + 3 + 2, 'three across, three up, and into the shallows');
  for (let u = 0; u < W; u++) tileAt(b, u, 4)!.ground = 'ice';
  const f = walkFrom(b, { u: 3, v: 8 }, 2, new Set());
  assert.ok(f.cost[3] < 8, 'ice is quicker');
});

test('tall growth blocks a shot between two low tiles, but not one that ends in it', () => {
  const b = bare();
  assert.ok(sightClear(b, { u: 0, v: 0 }, { u: 0, v: 4 }));
  tileAt(b, 0, 2)!.ground = 'tall';
  assert.ok(!sightClear(b, { u: 0, v: 0 }, { u: 0, v: 4 }));
  assert.ok(sightClear(b, { u: 0, v: 0 }, { u: 0, v: 2 }), 'the tall tile itself can be shot into');
  // (high ground looks over it)
  tileAt(b, 0, 0)!.h = 2;
  assert.ok(sightClear(b, { u: 0, v: 0 }, { u: 0, v: 4 }));
});

test('lava burns a fighter whose step ends on it', () => {
  const b = startBattle(3, 'skeletons', { area: 'volcano' });
  b.units = [];
  Object.assign(b.board, bare());
  // lava all across the middle: the only way to the foe is over it
  for (let u = 0; u < W; u++) for (let v = 3; v <= 5; v++) tileAt(b.board, u, v)!.ground = 'lava';
  const me = addUnit(b, 'knight', 3, 6);
  addUnit(b, 'skeleton', 3, 0);
  b.phase = 'fight';
  let burned = false;
  for (let i = 0; i < 60 && !burned; i++) {
    stepBattle(b);
    burned = me.hp < me.maxHp && tileAt(b.board, me.u, me.v)!.ground === 'lava';
  }
  assert.ok(burned, 'lost hp stepping onto lava');
  assert.ok(me.maxHp - me.hp >= Math.max(1, Math.round(me.maxHp * LAVA_BURN)));
});

test('a fight on each area plays out to its end', () => {
  for (const area of AREAS) {
    const b = startBattle(11, 'skeletons', { area });
    const at = b.board.tiles.findIndex((t, i) => !t.rock && Math.floor(i / W) === D - 1);
    assert.ok(place(b, 'knight', at % W, D - 1), area);
    assert.ok(fight(b), area);
    for (let i = 0; i < 3000 && b.phase === 'fight'; i++) stepBattle(b);
    assert.notEqual(b.phase, 'fight', area);
  }
});
