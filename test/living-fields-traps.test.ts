// LIVING-FIELDS, step 3 (docs/notes/living-fields.md, `src/sim/fieldTraps.ts`): the traps and hazards of the ordinary battlefields. Each is
// laid by its own side stream behind one switch, hits both sides alike, lets fliers over, and is known to the way-finding.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bareBoard } from './bare';
import { AREAS, boardOk, canStep, DEPLOY_ROWS, FLY_JUMP, makeBoard, RISK_COST, standable, tileAt, TRAP_COST, type Board, type Tile, type Trap } from '../src/sim/board';
import { addUnit, atkOf, hurt, noteTerrain, startBattle, stepBattle, stepTo, type Battle, type BattleEvent, type Unit } from '../src/sim/battle';
import { FIELD_HAZARDS, LAND_HAZARDS, MAX_LEVEL, PIECES, TRAPS, fieldOk, hazardLevel, layFieldHazards, trapScore } from '../src/sim/fieldTraps';
import { STRIKES } from '../src/sim/hazards';
import { walkFrom } from '../src/sim/path';
import { TERRAIN_INFO } from '../src/sim/terrainInfo';
import { weatherFor } from '../src/sim/weather';
import { cloneBoard } from '../src/sim/chain';

// (the set is on, the owner's call; these tests are about the set, so they say so themselves)
FIELD_HAZARDS.on = true;

const flat = (extra: Partial<Tile> = {}): Tile => ({ h: 0, deco: 0, ...extra });
function arena(): Battle {
  const b = startBattle(3);
  bareBoard(b);
  b.units = [];
  b.phase = 'fight';
  return b;
}
/** A fighter that does nothing of its own accord and cannot be hurt to death. */
const still = (b: Battle, def: string, u: number, v: number): Unit => {
  const x = addUnit(b, def, u, v);
  x.busyUntil = 1e9;
  x.hp = x.maxHp = 100000;
  return x;
};
const at = (b: Battle, u: number, v: number) => tileAt(b.board, u, v)!;
/** Walk a still fighter one tile, as the fight would. */
const walk = (b: Battle, me: Unit, u: number, v: number): BattleEvent[] => {
  const out: BattleEvent[] = [];
  me.busyUntil = 0;
  stepTo(b, me, v * b.board.w + u, out);
  return out;
};
const lost = (x: Unit) => (x.maxHp - x.hp) / x.maxHp;
const near = (a: number, z: number) => Math.abs(a - z) < 0.002;
/** What a board holds of the set. */
const census = (b: Board) => ({
  traps: b.tiles.flatMap((t, i) => (t.trap ? [[i, t.trap] as [number, Trap]] : [])),
  braziers: b.tiles.flatMap((t, i) => (t.brazier ? [i] : [])),
  strikes: b.hazards ?? [],
});
const laid = (seed: number, area: (typeof AREAS)[number], level: number): Board => {
  const b = makeBoard(seed, area);
  layFieldHazards(b, seed, level);
  return b;
};

test('each land lays only its own, in the middle ground, on open tiles, and everyone can still walk everywhere', () => {
  for (const area of AREAS) {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 60; seed++) {
      const b = laid(seed, area, 3);
      const c = census(b);
      const own = new Set<string>(LAND_HAZARDS[area]);
      for (const [i, k] of c.traps) {
        seen.add(k);
        assert.ok(own.has(k), `${area}: ${k}`);
        const v = Math.floor(i / b.w);
        assert.ok(v >= DEPLOY_ROWS && v < b.d - DEPLOY_ROWS, `${area}: ${k} in a side's rows`);
        assert.ok(standable(b.tiles[i]) && !b.tiles[i].bridge, `${area}: ${k} on a tile nobody stands on`);
        // (thin ice lies on ice; everything else on plain ground)
        assert.equal(b.tiles[i].ground, k === 'thin' ? 'ice' : undefined, `${area}: ${k} over ${b.tiles[i].ground}`);
      }
      for (const i of c.braziers) {
        seen.add('brazier');
        assert.ok(own.has('brazier'), `${area}: a brazier`);
        const v = Math.floor(i / b.w);
        assert.ok(v >= DEPLOY_ROWS && v < b.d - DEPLOY_ROWS);
      }
      for (const h of c.strikes) {
        seen.add(h.kind);
        assert.ok(own.has(h.kind), `${area}: ${h.kind}`);
        assert.ok(h.tell >= 1000, 'told at least a second before');
        for (const i of h.tiles) {
          assert.ok(b.tiles[i].risk, 'a strike\'s tile is marked for the way-finding');
          const v = Math.floor(i / b.w);
          assert.ok(v >= DEPLOY_ROWS && v < b.d - DEPLOY_ROWS);
          assert.ok(!b.tiles[i].trap, 'no trap under a strike');
        }
        if (h.kind === 'lightning') assert.equal(weatherFor(seed, area), 'rain', 'lightning only in the rain');
      }
      assert.ok(boardOk(b), `${area} ${seed}: the board can still be walked`);
    }
    // (every kind of the land turns up, lightning apart on a land where it seldom rains)
    for (const k of LAND_HAZARDS[area]) if (k !== 'lightning') assert.ok(seen.has(k), `${area}: no ${k} in 60 boards`);
    assert.ok(LAND_HAZARDS[area].length >= 2 && LAND_HAZARDS[area].length <= 3, `${area} has two or three of its own`);
  }
});

test('sparse at first, more on later waves and harder tiers', () => {
  assert.equal(hazardLevel(1, 0), 1);
  assert.equal(hazardLevel(5, 0), 2);
  assert.equal(hazardLevel(1, 2), 2);
  assert.equal(hazardLevel(9, 4), MAX_LEVEL);
  const pieces = (level: number) => {
    let n = 0;
    for (const area of AREAS)
      for (let seed = 1; seed <= 20; seed++) {
        const c = census(laid(seed, area, level));
        // (a piece is a patch of traps, a brazier or a strike: count the tiles for a measure that only grows)
        n += c.traps.length + c.braziers.length + c.strikes.reduce((s, h) => s + h.tiles.length, 0);
      }
    return n / (AREAS.length * 20);
  };
  const [one, two, three] = [pieces(1), pieces(2), pieces(3)];
  assert.equal(pieces(0), 0);
  assert.ok(one > 1 && one < 6, `level 1 lays ${one.toFixed(1)} tiles a board`);
  assert.ok(two > one * 1.3 && three > two * 1.15, `${one.toFixed(1)}, ${two.toFixed(1)}, ${three.toFixed(1)}`);
  assert.ok(three < 14, `level 3 lays ${three.toFixed(1)} tiles a board of 88`);
  assert.deepEqual(PIECES[1], [1, 2], 'one or two a board to begin with');
});

test('its own side stream, behind one switch: the fight\'s stream and the rest of the board are as they were', () => {
  for (const area of AREAS)
    for (const seed of [5, 77, 4242]) {
      const plain = startBattle(seed, 'skeletons', { area });
      const with3 = startBattle(seed, 'skeletons', { area, hazards: 3 });
      assert.equal(with3.rng, plain.rng, 'the fight\'s own stream');
      assert.equal(with3.skillRng, plain.skillRng);
      // (the same board under the traps: heights, grounds apart from nothing, boulders, walls, barrels)
      const strip = (b: Board) => JSON.stringify(b.tiles.map(({ trap, brazier, risk, ...t }) => (void trap, void brazier, void risk, t)));
      assert.equal(strip(with3.board), strip(plain.board), `${area} ${seed}`);
      assert.deepEqual(with3.units.map((x) => [x.def, x.u, x.v]), plain.units.map((x) => [x.def, x.u, x.v]));
      // (laid twice, the same)
      assert.equal(JSON.stringify(startBattle(seed, 'skeletons', { area, hazards: 3 }).board), JSON.stringify(with3.board));
    }
  // (a fight made outside a run has none; nor has any with the switch off)
  assert.deepEqual(census(startBattle(9, 'skeletons', { area: 'dungeon' }).board), { traps: [], braziers: [], strikes: [] });
  FIELD_HAZARDS.on = false;
  try {
    for (const area of AREAS) assert.deepEqual(census(startBattle(9, 'skeletons', { area, hazards: 3 }).board), { traps: [], braziers: [], strikes: [] }, area);
  } finally {
    FIELD_HAZARDS.on = true;
  }
});

test('only the ordinary battlefields: not a field the size of the keep\'s or the Assault\'s, a Calamity zone or a rift\'s court; and a shared board is never touched', () => {
  assert.ok(fieldOk(makeBoard(1, 'ruins')));
  assert.ok(fieldOk(makeBoard(1, 'ruins', 14, 18)), 'an army\'s road section');
  assert.ok(!fieldOk(makeBoard(1, 'ruins', 24, 24)));
  assert.ok(!fieldOk({ ...makeBoard(1, 'ruins'), props: [{ u: 1, v: 1, kind: 'bones' }] }));
  // (an army's section is copied for the fight, and its own strikes kept: the section itself gains nothing)
  const section = makeBoard(12, 'graveyard');
  section.hazards = [{ kind: 'current', tiles: [40], period: 2500, offset: 2500, tell: 0 }];
  const before = JSON.stringify(section);
  const copy = cloneBoard(section);
  layFieldHazards(copy, 12, 3);
  assert.equal(JSON.stringify(section), before);
  assert.equal(copy.hazards![0].kind, 'current');
});

test('a spike trap springs once, on friend or foe, and a flier passes over it', () => {
  for (const def of ['knight', 'skeleton']) {
    const b = arena();
    at(b, 3, 4).trap = 'spikes';
    const me = still(b, def, 3, 5);
    const ev = walk(b, me, 3, 4);
    assert.ok(near(lost(me), TRAPS.SPIKES), `${def} lost ${lost(me)}`);
    assert.equal(at(b, 3, 4).trap, undefined, 'spent');
    assert.ok(ev.some((e) => e.kind === 'fieldTrap' && e.what === 'spikes' && e.gone && e.to === me.id));
    // (the next to step there is not hurt)
    const next = still(b, 'samurai', 3, 3);
    me.u = 0;
    walk(b, next, 3, 4);
    assert.equal(lost(next), 0);
  }
  const b = arena();
  at(b, 3, 4).trap = 'spikes';
  const bird = still(b, 'karasu', 3, 5);
  walk(b, bird, 3, 4);
  assert.equal(lost(bird), 0);
  assert.equal(at(b, 3, 4).trap, 'spikes', 'still set');
});

test('a snare roots: no step until it lets go, though the fighter is free to strike', () => {
  const b = arena();
  at(b, 3, 4).trap = 'snare';
  const me = still(b, 'knight', 3, 5);
  walk(b, me, 3, 4);
  assert.ok(near(lost(me), TRAPS.SNARE));
  assert.equal(me.rootUntil, b.t + TRAPS.SNARE_MS);
  assert.equal(at(b, 3, 4).trap, undefined);
  walk(b, me, 3, 3);
  assert.deepEqual([me.u, me.v], [3, 4], 'held');
  // (it is not stunned: its hold is on its feet only)
  assert.ok((me.stunUntil ?? 0) <= b.t);
  b.t += TRAPS.SNARE_MS;
  walk(b, me, 3, 3);
  assert.deepEqual([me.u, me.v], [3, 3], 'free again');
});

test('a rune ward zaps and stuns the first to cross, once', () => {
  const b = arena();
  at(b, 3, 4).trap = 'ward';
  const me = still(b, 'skeleton', 3, 5);
  walk(b, me, 3, 4);
  assert.ok(near(lost(me), TRAPS.WARD));
  assert.ok((me.stunUntil ?? 0) > b.t, 'stunned');
  assert.equal(at(b, 3, 4).trap, undefined);
});

test('brambles scratch on every entry and slow the step; deep mud only drags', () => {
  const b = arena();
  at(b, 3, 4).trap = 'brambles';
  at(b, 3, 2).trap = 'mud';
  const me = still(b, 'knight', 3, 5);
  const plainMs = (() => {
    const c = arena();
    const x = still(c, 'knight', 3, 5);
    walk(c, x, 3, 4);
    return x.step!.ms;
  })();
  walk(b, me, 3, 4);
  assert.ok(near(lost(me), TRAPS.BRAMBLES));
  assert.equal(me.step!.ms, plainMs * 2, 'a slower step');
  assert.equal(at(b, 3, 4).trap, 'brambles', 'they stay');
  walk(b, me, 3, 3);
  walk(b, me, 3, 4);
  assert.ok(near(lost(me), TRAPS.BRAMBLES * 2), 'again on the way back');
  // deep mud
  const hp = me.hp;
  walk(b, me, 3, 3);
  walk(b, me, 3, 2);
  assert.equal(me.step!.ms, plainMs * 3, 'three times as long');
  assert.equal(me.hp, hp, 'no harm');
});

test('a poison bog bites on entry and each second stood in it', () => {
  const b = arena();
  at(b, 3, 4).trap = 'bog';
  noteTerrain(b);
  assert.ok(b.trapFx);
  // (a foe far off, so the fight goes on)
  still(b, 'skeleton', 0, 0);
  const me = still(b, 'knight', 3, 5);
  walk(b, me, 3, 4);
  assert.ok(near(lost(me), TRAPS.BOG));
  me.busyUntil = 1e9;
  const was = me.hp;
  for (let i = 0; i < 30; i++) stepBattle(b);
  // (three seconds: three bites, and its poison's ticks on top)
  assert.ok(was - me.hp >= me.maxHp * TRAPS.BOG_STAND * 3 - 1, `lost ${was - me.hp} standing`);
  const bird = still(b, 'karasu', 5, 5);
  at(b, 5, 5).trap = 'bog';
  for (let i = 0; i < 20; i++) stepBattle(b);
  assert.equal(lost(bird), 0, 'a flier hovers over it');
});

test('thin ice cracks under the first walker and breaks under the next: shallow water after, and a cold bath', () => {
  const b = arena();
  b.seed = 2;
  Object.assign(at(b, 3, 4), { ground: 'ice', trap: 'thin' });
  // (walled in on the far side, so a slide cannot carry the walker on)
  at(b, 3, 3).rock = true;
  const one = still(b, 'knight', 3, 5);
  const ev = walk(b, one, 3, 4);
  assert.equal(at(b, 3, 4).trap, 'cracked');
  assert.equal(lost(one), 0, 'the first is not hurt');
  assert.ok(ev.some((e) => e.kind === 'fieldTrap' && e.what === 'cracked'));
  one.u = 0;
  const two = still(b, 'skeleton', 4, 4);
  const ev2 = walk(b, two, 3, 4);
  assert.equal(at(b, 3, 4).ground, 'water');
  assert.equal(at(b, 3, 4).trap, undefined);
  assert.ok(near(lost(two), TRAPS.ICE));
  assert.ok((two.slowUntil ?? 0) > b.t, 'chilled');
  assert.ok(ev2.some((e) => e.kind === 'fieldTrap' && e.what === 'thin' && e.gone));
});

test('a totem strengthens whoever holds its tile, and only while they hold it', () => {
  const b = arena();
  at(b, 3, 4).trap = 'totem';
  noteTerrain(b);
  for (const def of ['knight', 'skeleton']) {
    const me = still(b, def, 3, 5);
    const base = atkOf(me);
    walk(b, me, 3, 4);
    assert.ok(Math.abs(atkOf(me) - base * TRAPS.TOTEM) < 1e-9, `${def} on the totem`);
    walk(b, me, 3, 3);
    assert.equal(atkOf(me), base, `${def} off it`);
    me.alive = false;
  }
  // (thrown onto it or off it, the once-a-second tick puts it right)
  still(b, 'skeleton', 0, 0);
  const me = still(b, 'knight', 5, 5);
  const base = atkOf(me);
  me.u = 3;
  me.v = 4;
  for (let i = 0; i < 10; i++) stepBattle(b);
  assert.ok(atkOf(me) > base);
  me.u = 6;
  for (let i = 0; i < 10; i++) stepBattle(b);
  assert.equal(atkOf(me), base);
});

test('a brazier is in the way until a blow beside it tips it: coals round it, and everyone near is seared', () => {
  const b = arena();
  at(b, 3, 4).brazier = true;
  noteTerrain(b);
  assert.deepEqual(b.braziers, [4 * b.board.w + 3]);
  assert.equal(standable(at(b, 3, 4)), false);
  assert.equal(canStep(flat(), flat({ brazier: true }), 4), null);
  assert.equal(canStep(flat(), flat({ brazier: true }), FLY_JUMP), null);
  const hero = still(b, 'knight', 3, 5);
  const foe = still(b, 'skeleton', 2, 4);
  const far = still(b, 'samurai', 6, 8);
  at(b, 4, 4).ground = 'water';
  const out: BattleEvent[] = [];
  // (the land's own harm does not tip it; a blow does)
  hurt(b, hero, hero, 5, false, false, out, 'dot');
  assert.ok(at(b, 3, 4).brazier);
  hurt(b, foe, hero, 5, false, false, out);
  assert.equal(at(b, 3, 4).brazier, undefined);
  assert.equal(b.braziers, undefined);
  for (const [u, v] of [[3, 4], [3, 3], [2, 4], [3, 5]]) assert.equal(at(b, u, v).ground, 'coals', `${u},${v}`);
  assert.equal(at(b, 4, 4).ground, 'water', 'no coals on water');
  assert.ok(b.groundFx, 'the coals act from now on');
  assert.ok(lost(foe) >= TRAPS.BRAZIER - 0.002 && lost(hero) >= TRAPS.BRAZIER - 0.002, 'both sides');
  assert.equal(lost(far), 0);
  const ev = out.find((e) => e.kind === 'fieldTrap' && e.what === 'brazier');
  assert.ok(ev && ev.kind === 'fieldTrap' && ev.tiles!.length === 4);
});

test('the way-finding knows them: a walker goes round a trap when the way round is short, and nobody stands in one by choice', () => {
  for (const k of ['spikes', 'snare', 'ward', 'brambles', 'mud', 'bog', 'cracked'] as Trap[]) {
    assert.ok(TRAP_COST[k] > 0, `${k} costs the way-finding`);
    assert.ok(canStep(flat(), flat({ trap: k }), 2)! > canStep(flat(), flat(), 2)!);
    assert.ok(trapScore(false, false, flat({ trap: k })) > 0, `${k} is poor footing`);
    assert.equal(canStep(flat(), flat({ trap: k }), FLY_JUMP), 1, 'a flier does not mind');
    assert.equal(trapScore(true, false, flat({ trap: k })), 0);
  }
  assert.ok(trapScore(false, true, flat({ trap: 'totem' })) < 0, 'a totem is worth holding');
  assert.ok(trapScore(false, false, flat({ risk: true })) > 0);
  assert.equal(canStep(flat(), flat({ risk: true }), 2), 1 + RISK_COST);
  // a trap in the straight way: the cheapest walk to the far side goes round it
  const b = arena();
  at(b, 3, 5).trap = 'bog';
  const w = walkFrom(b.board, { u: 3, v: 7 }, 2, new Set());
  let i = 3 * b.board.w + 3;
  const path: number[] = [];
  for (; i >= 0; i = w.from[i]) path.push(i);
  assert.ok(!path.includes(5 * b.board.w + 3), 'round the bog');
  assert.equal(w.cost[3 * b.board.w + 3], 6, 'two steps the longer');
  // and in a fight: a knight walking up the board to a foe never ends a step in the bog that lies in its straight way
  for (let seed = 1; seed <= 12; seed++) {
    const c = arena();
    c.seed = seed;
    at(c, 3, 5).trap = 'bog';
    noteTerrain(c);
    const me = addUnit(c, 'knight', 3, 8);
    me.hp = me.maxHp = 100000;
    still(c, 'skeleton', 3, 1);
    for (let k = 0; k < 150; k++) {
      stepBattle(c);
      assert.notEqual(at(c, me.u, me.v).trap, 'bog', `seed ${seed}: it stepped into the bog`);
    }
    assert.ok(me.v <= 3, `seed ${seed}: it got there (row ${me.v})`);
  }
});

test('the timed strikes are told, then hit whoever stands there, either side; a boss feels a third', () => {
  for (const kind of ['blades', 'lightning'] as const) {
    const b = arena();
    const tiles = [4 * b.board.w + 3, 4 * b.board.w + 4];
    b.board.hazards = [{ kind, tiles, period: 6000, offset: 3200, tell: 1200 }];
    const hero = still(b, 'knight', 3, 4);
    const foe = still(b, 'skeleton', 4, 4);
    const away = still(b, 'samurai', 0, 8);
    const bird = still(b, 'karasu', 3, 4);
    bird.u = 4;
    const ev: BattleEvent[] = [];
    while (b.t < 3200) ev.push(...stepBattle(b));
    const told = ev.find((e) => e.kind === 'hazard' && e.phase === 'tell');
    assert.ok(told && told.kind === 'hazard' && told.ms === 1200 && told.what === kind);
    assert.ok(near(lost(hero), STRIKES[kind].share), `${kind}: the hero lost ${lost(hero)}`);
    assert.ok(near(lost(foe), STRIKES[kind].share));
    assert.equal(lost(away), 0);
    // (blades sweep under a flier; lightning does not spare it)
    assert.equal(lost(bird) > 0, STRIKES[kind].fliers, `${kind} and a flier`);
    if (kind === 'lightning') assert.ok((hero.stunUntil ?? 0) >= b.t);
  }
  const b = arena();
  at(b, 3, 4).trap = 'spikes';
  const boss = still(b, 'skeleton', 3, 5);
  boss.size = 2;
  walk(b, boss, 3, 4);
  assert.ok(near(lost(boss), TRAPS.SPIKES / 3));
});

test('the codex has a line for every one of them, with the rules\' own numbers', () => {
  const ids = TERRAIN_INFO.map((t) => t.id);
  for (const area of AREAS) for (const k of LAND_HAZARDS[area]) assert.ok(ids.includes(k), `${k} is explained`);
  assert.equal(new Set(ids).size, ids.length);
  const tip = (id: string) => TERRAIN_INFO.find((t) => t.id === id)!.tip;
  assert.ok(tip('spikes').includes(`${Math.round(TRAPS.SPIKES * 100)}%`));
  assert.ok(tip('totem').includes('15%'));
  assert.ok(tip('snare').includes('2.5 s'));
  assert.ok(tip('blades').includes(`${Math.round(STRIKES.blades.share * 100)}%`));
});

test('a boss\'s wave has none of the set (a boss feels a third of a trap, which would tilt its fight), and a run lays the rest by wave and tier', async () => {
  const { armyRun, isBossRun, startStage } = await import('../src/sim/run');
  const { ARMIES } = await import('../src/sim/armies');
  let plain = 0;
  let laidOn = 0;
  for (const army of ARMIES.slice(0, 3)) {
    const run = armyRun(31, army.id);
    for (let w = 1; w <= army.waves.length; w++) {
      run.stage = w;
      const b = startStage(run);
      const c = census(b.board);
      const mine = c.traps.length + c.braziers.length + b.board.tiles.filter((t) => t.risk).length;
      if (isBossRun(run)) assert.equal(mine, 0, `${army.id} wave ${w}: a boss's wave`);
      else {
        plain++;
        if (mine) laidOn++;
      }
    }
  }
  assert.ok(laidOn > plain * 0.6, `${laidOn} of ${plain} plain waves have something`);
});

test('every strip a trap plays is in the effects atlas', async () => {
  const { readFileSync } = await import('node:fs');
  const { TRAP_LOOKS } = await import('../src/render/trapLooks');
  const { HAZARD_LOOKS } = await import('../src/render/hazardLooks');
  const atlas = JSON.parse(readFileSync('src/art/fx/pack/atlas.json', 'utf8')) as Record<string, unknown>;
  for (const [k, look] of [...Object.entries(TRAP_LOOKS), ...Object.entries(HAZARD_LOOKS)]) for (const fx of look.go) assert.ok(fx.key in atlas, `${k}: ${fx.key}`);
});

test('every painted cell the board asks for is a cell of the sheet the importer cuts', async () => {
  const { readFileSync } = await import('node:fs');
  const { propCell, trapCell } = await import('../src/render/trapLooks');
  const py = readFileSync('tools/living-fields/import-art.py', 'utf8');
  const block = py.slice(py.indexOf("'traps': dict("), py.indexOf("'life': dict("));
  const names = new Set([...block.matchAll(/'([a-zA-Z0-9]+)'/g)].map((m) => m[1]));
  assert.equal(names.size - 1, 40, 'forty cells (and the word "traps")');
  const asked = new Set<string>();
  for (const area of AREAS) {
    for (const trap of ['spikes', 'snare', 'ward', 'brambles', 'mud', 'bog', 'thin', 'cracked', 'totem'] as Trap[]) asked.add(trapCell({ trap }, area)!);
    asked.add(trapCell({ brazier: true }, area)!);
    for (const strike of ['geyser', 'rockfall', 'grasp', 'blades', 'lightning'] as const) asked.add(trapCell({}, area, strike)!);
    for (const deco of [0, 1]) asked.add(propCell('wall', area, deco)!);
    asked.add(propCell('shrine', area)!);
    const keg = propCell('barrel', area);
    if (keg) asked.add(keg);
  }
  for (const n of asked) assert.ok(names.has(n), `${n} is not a cell of the sheet`);
  assert.ok(asked.size >= 28, `${asked.size} cells are used`);
  // (the atlas is empty until the sheet is painted: the board keeps its stand-ins)
  assert.deepEqual(JSON.parse(readFileSync('src/art/living-fields/traps.json', 'utf8')), {});
});
