import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bareBoard } from './bare';
import { BARREL_BLAST, canStep, FLY_JUMP, LAVA_STAND, SHRINE_HEAL, sightClear, standable, tileAt, W, D, type Tile } from '../src/sim/board';
import { addUnit, noteTerrain, startBattle, stepBattle, strikeDef, type Battle, type BattleEvent, type Unit } from '../src/sim/battle';
import { UNITS } from '../src/sim/units';

const flat = (extra: Partial<Tile> = {}): Tile => ({ h: 0, deco: 0, ...extra });
function arena(): Battle {
  const b = startBattle(3);
  bareBoard(b);
  b.units = [];
  b.phase = 'fight';
  return b;
}
const run = (b: Battle, ms: number): BattleEvent[] => {
  const out: BattleEvent[] = [];
  for (const end = b.t + ms; b.t < end && b.phase === 'fight'; ) out.push(...stepBattle(b));
  return out;
};
/** A fighter that stays where it is and cannot be hurt to death. */
const still = (b: Battle, def: string, u: number, v: number): Unit => {
  const x = addUnit(b, def, u, v);
  x.busyUntil = 1e9;
  x.hp = x.maxHp = 1e7;
  return x;
};

test('deep water stops a walker and not a flier; a wall, boulder or barrel stops everyone', () => {
  const deep = flat({ ground: 'deep' });
  assert.equal(standable(deep), false);
  assert.equal(canStep(flat(), deep, 4), null);
  assert.equal(canStep(flat(), deep, FLY_JUMP), 1);
  for (const solid of [flat({ wall: true }), flat({ rock: true }), flat({ barrel: true })]) {
    assert.equal(standable(solid), false);
    assert.equal(canStep(flat(), solid, 4), null);
    assert.equal(canStep(flat(), solid, FLY_JUMP), null, 'not even a flier passes through something solid');
  }
  assert.equal(canStep(flat(), flat({ bridge: true }), 2), 1, 'a bridge is plain ground');
  assert.equal(canStep(flat(), flat({ ground: 'shrine' }), 2), 1);
});

test('a ruined wall stops a shot even from a level above; a barrel does not', () => {
  const b = arena().board;
  assert.ok(sightClear(b, { u: 0, v: 0 }, { u: 0, v: 4 }));
  tileAt(b, 0, 2)!.barrel = true;
  assert.ok(sightClear(b, { u: 0, v: 0 }, { u: 0, v: 4 }), 'a barrel is low');
  delete tileAt(b, 0, 2)!.barrel;
  tileAt(b, 0, 2)!.wall = true;
  assert.ok(!sightClear(b, { u: 0, v: 0 }, { u: 0, v: 4 }));
  tileAt(b, 0, 0)!.h = 1;
  assert.ok(!sightClear(b, { u: 0, v: 0 }, { u: 0, v: 4 }), 'a boulder would not stop a shot from here; a wall does');
  assert.ok(sightClear(b, { u: 0, v: 0 }, { u: 0, v: 1 }), 'the next tile is always seen');
});

test('a fighter in tall grass is missed a share of the time, and not otherwise', () => {
  const dodges = (grass: boolean): number => {
    const b = arena();
    if (grass) tileAt(b.board, 3, 5)!.ground = 'tall';
    const foe = addUnit(b, 'skeleton', 3, 4);
    foe.hp = foe.maxHp = 1e7;
    const me = addUnit(b, 'knight', 3, 5);
    me.hp = me.maxHp = 1e7;
    me.busyUntil = 1e9;
    let swings = 0;
    let missed = 0;
    for (const e of run(b, 60_000)) {
      if (e.kind === 'swing' && e.by === foe.id) swings++;
      if (e.kind === 'dodge' && e.to === me.id) missed++;
    }
    return swings ? missed / swings : -1;
  };
  const bare = dodges(false);
  const hidden = dodges(true);
  assert.equal(bare, 0);
  assert.ok(hidden > 0.05 && hidden < 0.2, `missed ${hidden}`);
});

test('a walker stepping onto ice may slide a tile further, never onto lava, a fighter or a climb, and a flier never slides', () => {
  let slid = 0;
  let steps = 0;
  for (let seed = 1; seed <= 60; seed++) {
    const b = arena();
    b.seed = seed;
    for (let v = 3; v <= 6; v++) for (let u = 0; u < W; u++) tileAt(b.board, u, v)!.ground = 'ice';
    tileAt(b.board, 3, 4)!.ground = 'lava';
    tileAt(b.board, 4, 4)!.h = 1;
    const me = addUnit(b, 'knight', 3, 8);
    addUnit(b, 'skeleton', 3, 0).busyUntil = 1e9;
    for (let i = 0; i < 80 && me.alive; i++) {
      const was = { u: me.u, v: me.v };
      stepBattle(b);
      if (me.u === was.u && me.v === was.v) continue;
      steps++;
      const d = Math.abs(me.u - was.u) + Math.abs(me.v - was.v);
      assert.ok(d === 1 || d === 2, `a step of ${d}`);
      if (d === 2) {
        slid++;
        const t = tileAt(b.board, me.u, me.v)!;
        assert.notEqual(t.ground, 'lava');
        assert.ok(t.h <= 1);
      }
    }
  }
  assert.ok(slid > 20 && slid < steps * 0.9, `${slid} slides in ${steps} steps`);
  // a flier never slides
  const b = arena();
  for (let v = 0; v < D; v++) for (let u = 0; u < W; u++) tileAt(b.board, u, v)!.ground = 'ice';
  const bird = addUnit(b, 'karasu', 3, 8);
  addUnit(b, 'skeleton', 3, 0).busyUntil = 1e9;
  for (let i = 0; i < 100; i++) {
    const was = { u: bird.u, v: bird.v };
    stepBattle(b);
    assert.ok(Math.abs(bird.u - was.u) + Math.abs(bird.v - was.v) <= 1);
  }
});

test('a shrine mends whoever stands on it, a share of its health each second, friend or foe', () => {
  const b = arena();
  tileAt(b.board, 3, 6)!.ground = 'shrine';
  noteTerrain(b);
  const me = still(b, 'knight', 3, 6);
  me.hp = Math.round(me.maxHp * 0.1);
  const off = still(b, 'knight', 5, 6);
  off.hp = Math.round(off.maxHp * 0.1);
  const foe = still(b, 'skeleton', 3, 0);
  foe.hp = foe.maxHp * 0.1;
  tileAt(b.board, 3, 0)!.ground = 'shrine';
  noteTerrain(b);
  const start = me.hp;
  const events = run(b, 3000);
  assert.equal(me.hp, start + 3 * Math.round(me.maxHp * SHRINE_HEAL), 'three seconds, three mends');
  assert.equal(off.hp, Math.round(off.maxHp * 0.1), 'beside it is not on it');
  assert.ok(foe.hp > foe.maxHp * 0.1, 'a foe on a shrine mends too');
  assert.ok(events.some((e) => e.kind === 'heal' && e.to === me.id));
});

test('lava burns a walker standing in it each second, and not a flier', () => {
  const b = arena();
  tileAt(b.board, 3, 6)!.ground = 'lava';
  tileAt(b.board, 5, 6)!.ground = 'lava';
  noteTerrain(b);
  const me = still(b, 'knight', 3, 6);
  const bird = still(b, 'karasu', 5, 6);
  still(b, 'skeleton', 0, 0);
  const full = me.maxHp;
  run(b, 2000);
  assert.equal(me.maxHp - me.hp, 2 * Math.max(1, Math.round(full * LAVA_STAND)));
  assert.equal(bird.hp, bird.maxHp);
});

test('a blow beside a powder barrel sets it off: it is gone, and everyone within a tile loses a share of their health', () => {
  const b = arena();
  tileAt(b.board, 4, 5)!.barrel = true;
  noteTerrain(b);
  assert.deepEqual(b.barrels, [5 * W + 4]);
  const me = addUnit(b, 'knight', 3, 5);
  me.busyUntil = 1e9;
  const next = still(b, 'knight', 5, 6);
  const far = still(b, 'knight', 7, 9);
  // (the foe beside the barrel strikes the knight, also beside it)
  const foe = addUnit(b, 'skeleton', 3, 4);
  foe.hp = foe.maxHp = 1e7;
  const hp = [me.hp, next.hp, foe.hp];
  const events = run(b, 1500);
  assert.ok(events.some((e) => e.kind === 'boom' && e.u === 4 && e.v === 5), 'the barrel went off');
  assert.equal(tileAt(b.board, 4, 5)!.barrel, undefined);
  assert.equal(b.barrels?.length ?? 0, 0);
  assert.ok(standable(tileAt(b.board, 4, 5)), 'where it stood can be walked on');
  assert.ok(hp[1] - next.hp >= Math.round(hp[1] * BARREL_BLAST), 'a fighter a tile off the barrel loses its share');
  assert.equal(far.hp, far.maxHp, 'two tiles off is safe');
  // (it goes off once)
  assert.equal(events.filter((e) => e.kind === 'boom').length, 1);
});

test('a barrel beside another sets it off too, in a chain; a blast alone does not start one', () => {
  const b = arena();
  tileAt(b.board, 4, 5)!.barrel = true;
  tileAt(b.board, 5, 5)!.barrel = true;
  tileAt(b.board, 6, 2)!.barrel = true;
  noteTerrain(b);
  const me = addUnit(b, 'knight', 3, 5);
  me.hp = me.maxHp = 1e7;
  me.busyUntil = 1e9;
  const foe = addUnit(b, 'skeleton', 3, 4);
  foe.hp = foe.maxHp = 1e7;
  const events = run(b, 1500);
  assert.equal(events.filter((e) => e.kind === 'boom').length, 2, 'the pair went; the lone barrel across the field stood');
  assert.deepEqual(b.barrels, [2 * W + 6]);
});

test('weather: a foggy fight shortens every shooter\'s range a tile (the weather is the board\'s own data, `weather.ts`), and a blade\'s not at all', async () => {
  const { weatherOf } = await import('../src/sim/weather');
  const { FOG_RANGE } = await import('../src/sim/battle');
  const seeds = Array.from({ length: 200 }, (_, i) => i + 1);
  const foggy = seeds.find((s) => weatherOf({ seed: s, area: 'highlands' }) === 'fog')!;
  const clear = seeds.find((s) => weatherOf({ seed: s, area: 'highlands' }) === 'clear')!;
  assert.ok(foggy && clear);
  const mist = startBattle(foggy, 'skeletons');
  const plain = startBattle(clear, 'skeletons');
  assert.equal(mist.fog, FOG_RANGE);
  assert.equal(plain.fog, undefined);
  const a = addUnit(mist, 'archer', 3, D - 1);
  const b = addUnit(plain, 'archer', 3, D - 1);
  assert.equal(strikeDef(mist, a).range, strikeDef(plain, b).range - FOG_RANGE);
  const knight = addUnit(mist, 'knight', 2, D - 1);
  assert.equal(strikeDef(mist, knight).range, UNITS.knight.range, 'a blade is not shortened');
});

test('a badly hurt fighter with nobody to strike walks to a shrine close by, and a healthy one does not', () => {
  const hurt = (share: number): { u: number; v: number } => {
    const b = arena();
    tileAt(b.board, 3, 6)!.ground = 'shrine';
    noteTerrain(b);
    const me = addUnit(b, 'knight', 3, 8);
    me.hp = Math.round(me.maxHp * share);
    const foe = addUnit(b, 'skeleton', 7, 8);
    foe.busyUntil = 1e9;
    stepBattle(b);
    return { u: me.u, v: me.v };
  };
  assert.deepEqual(hurt(0.2), { u: 3, v: 7 }, 'one step toward the shrine');
  // (a healthy knight heads for the foe, along its own row)
  assert.deepEqual(hurt(1), { u: 4, v: 8 }, 'it did not go for the shrine');
});

test('the codex explains every ground, with the rules\' own numbers, and every battlefield shape', async () => {
  const { TERRAIN_INFO, LAYOUT_LIST } = await import('../src/sim/terrainInfo');
  const { GROUND_COST, LAVA_BURN, TALL_DODGE } = await import('../src/sim/board');
  const ids = TERRAIN_INFO.map((t) => t.id);
  for (const g of Object.keys(GROUND_COST)) assert.ok(ids.includes(g), `${g} is explained`);
  for (const extra of ['wall', 'barrel', 'bridge']) assert.ok(ids.includes(extra), `${extra} is explained`);
  assert.ok(TERRAIN_INFO.find((t) => t.id === 'lava')!.tip.includes(`${Math.round(LAVA_BURN * 100)}%`));
  assert.ok(TERRAIN_INFO.find((t) => t.id === 'tall')!.tip.includes(`${Math.round(TALL_DODGE * 100)}%`));
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(LAYOUT_LIST.length, 9);
  for (const t of [...TERRAIN_INFO, ...LAYOUT_LIST]) assert.ok(t.name.length > 0 && t.tip.length > 10);
});

test('on the usual board a step takes `USUAL_WALK` of its time, so the two sides meet about as soon as on the old, shorter one; a Calamity board keeps the full time', async () => {
  const { USUAL_WALK } = await import('../src/sim/battle');
  assert.equal(startBattle(3).walk, USUAL_WALK);
  assert.equal(startBattle(3, 'skeletons', { size: { w: 10, d: 13 } }).walk, undefined);
  const step = (walk: number | undefined): number => {
    const b = arena();
    if (walk !== undefined) b.walk = walk;
    const me = addUnit(b, 'knight', 3, 8);
    addUnit(b, 'skeleton', 3, 0).busyUntil = 1e9;
    stepBattle(b);
    return me.step!.ms;
  };
  assert.equal(step(undefined), UNITS.knight.moveMs);
  assert.equal(step(USUAL_WALK), Math.round(UNITS.knight.moveMs * USUAL_WALK));
});
