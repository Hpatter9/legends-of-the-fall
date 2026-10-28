import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bareBoard } from './bare';
import { standable, tileAt, type Hazard } from '../src/sim/board';
import { addUnit, startBattle, stepBattle, type Battle, type BattleEvent, type Unit } from '../src/sim/battle';
import { arenaHazardsOf, BOSS_FEELS, CURRENT_MS, SPRING_HEAL, STRIKES } from '../src/sim/hazards';
import { ARMY_SCENARIOS, planScenario, SCENARIO_SIZE } from '../src/sim/scenario';
import { worldOf } from '../src/sim/chain';

function field(hazards: Hazard[]): Battle {
  const b = startBattle(3);
  bareBoard(b);
  b.units = [];
  b.phase = 'fight';
  b.board.hazards = hazards;
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
  x.hp = x.maxHp = 100000;
  return x;
};
const at = (b: Battle, u: number, v: number) => v * b.board.w + u;
const bossOf = (theme: string) => (n: number) => n === 15 || (theme === 'wildwood' ? n === 5 || n === 10 : n === 8);

test('a strike is told before it comes, then hurts whoever stands on its tiles, either side, and no one else', () => {
  const b = field([]);
  const hero = still(b, 'knight', 2, 5);
  const foe = still(b, 'skeleton', 3, 5);
  const away = still(b, 'skeleton', 6, 2);
  b.board.hazards = [{ kind: 'rockfall', tiles: [at(b, 2, 5), at(b, 3, 5)], period: 5000, offset: 2000, tell: 1000 }];
  const before = run(b, 1000);
  const tell = before.find((e) => e.kind === 'hazard' && e.phase === 'tell');
  assert.ok(tell && b.t >= 1000, 'told at offset - tell');
  assert.ok(!before.some((e) => e.kind === 'hazard' && e.phase === 'go'));
  run(b, 1000);
  const hit = Math.round(100000 * STRIKES.rockfall.share);
  assert.equal(hero.hp, 100000 - hit);
  assert.equal(foe.hp, 100000 - hit);
  assert.equal(away.hp, 100000);
  // (and again a period later)
  run(b, 5000);
  assert.equal(hero.hp, 100000 - 2 * hit);
});

test('spikes, grasping hands and a stampede leave a flier alone; flares and falling rocks do not; hands slow', () => {
  for (const kind of ['spikes', 'grasp', 'stampede', 'flare', 'rockfall'] as const) {
    const b = field([]);
    const flier = still(b, 'demon', 4, 4);
    const walker = still(b, 'skeleton', 4, 5);
    // (a hero off the tiles, so the fight goes on)
    still(b, 'knight', 0, 9);
    b.board.hazards = [{ kind, tiles: [at(b, 4, 4), at(b, 4, 5)], period: 6000, offset: 1000, tell: 500 }];
    run(b, 1100);
    assert.equal(flier.hp < 100000, STRIKES[kind].fliers, `${kind} and a flier`);
    assert.ok(walker.hp < 100000, `${kind} hurts a walker`);
    if (kind === 'grasp') assert.ok((walker.slowUntil ?? 0) > b.t);
  }
});

test('a spring mends both sides; a boss feels the land a third as much', () => {
  const b = field([]);
  const hero = still(b, 'knight', 2, 5);
  const foe = still(b, 'skeleton', 3, 5);
  const boss = still(b, 'skeleton', 2, 4);
  boss.size = 1.6;
  for (const x of [hero, foe, boss]) x.hp = 50000;
  b.board.hazards = [{ kind: 'spring', tiles: [at(b, 2, 5), at(b, 3, 5), at(b, 2, 4)], period: 4000, offset: 1000, tell: 500 }];
  run(b, 1100);
  assert.equal(hero.hp, Math.round(50000 + 100000 * SPRING_HEAL));
  assert.equal(foe.hp, Math.round(50000 + 100000 * SPRING_HEAL));
  assert.equal(Math.round(boss.hp), Math.round(50000 + 100000 * SPRING_HEAL * BOSS_FEELS));
});

test('the current carries a walker a tile downstream, but not onto a fighter, a cliff or off the road; a flier is not carried', () => {
  const b = field([]);
  const river = [at(b, 1, 5), at(b, 2, 5), at(b, 3, 5), at(b, 4, 5)];
  for (const i of river) b.board.tiles[i].ground = 'water';
  b.board.hazards = [{ kind: 'current', tiles: river, period: 2000, offset: 2000, tell: 0, flow: [1, 0] }];
  const swimmer = still(b, 'skeleton', 1, 5);
  swimmer.busyUntil = 0;
  const blocked = still(b, 'skeleton', 3, 5);
  still(b, 'knight', 4, 5);
  const flier = still(b, 'demon', 2, 4);
  b.board.tiles[at(b, 2, 4)].ground = 'water';
  b.board.hazards[0].tiles.push(at(b, 2, 4));
  // (the swimmer is held still by being busy only until the current comes)
  swimmer.busyUntil = 1e9;
  const out = run(b, 2000);
  assert.deepEqual([swimmer.u, swimmer.v], [2, 5]);
  assert.ok(swimmer.step && swimmer.step.ms === CURRENT_MS);
  assert.deepEqual([blocked.u, blocked.v], [3, 5], 'the tile downstream is taken');
  assert.deepEqual([flier.u, flier.v], [2, 4]);
  assert.ok(out.some((e) => e.kind === 'hazard' && e.what === 'current' && e.tiles.includes(at(b, 2, 5))));
  // (a cliff stops it)
  blocked.u = 6;
  tileAt(b.board, 3, 5)!.h = 2;
  run(b, 2000);
  assert.deepEqual([swimmer.u, swimmer.v], [2, 5], 'a cliff of two is not carried over');
});

test('every army\'s arenas carry its own hazards, on tiles a walker can stand on, the same for the same seed', () => {
  for (const theme of ARMY_SCENARIOS) {
    const want = new Set(arenaHazardsOf(theme).map((h) => h.kind));
    assert.ok(want.size, `${theme} has arena hazards`);
    for (const seed of [1, 7, 23]) {
      const p = planScenario(seed, theme, 15, bossOf(theme));
      assert.deepEqual(p, planScenario(seed, theme, 15, bossOf(theme)));
      for (const s of p.sections) {
        for (const h of s.board.hazards ?? []) {
          assert.ok(h.tiles.length, `${theme}/${seed}/${s.wave} ${h.kind} has tiles`);
          for (const i of h.tiles) assert.ok(standable(s.board.tiles[i]), `${theme} ${h.kind} on a standable tile`);
          assert.ok(h.period % 100 === 0 && h.offset % 100 === 0 && h.tell % 100 === 0 && h.tell < h.period, 'on the tick');
        }
        if (!s.boss) continue;
        const kinds = new Set((s.board.hazards ?? []).map((h) => h.kind));
        for (const k of want) assert.ok(kinds.has(k), `${theme}/${seed}/${s.wave} arena has ${k}`);
      }
    }
  }
});

test('a river runs one way across a section and pours off an open edge, never into another section', () => {
  let falls = 0;
  for (const theme of ARMY_SCENARIOS)
    for (const seed of [2, 9]) {
      const p = planScenario(seed, theme, 15, bossOf(theme));
      const rects = p.sections.map((s) => {
        const xs: number[] = [];
        const ys: number[] = [];
        for (const [u, v] of [[0, 0], [SCENARIO_SIZE.w - 1, SCENARIO_SIZE.d - 1]]) {
          const [U, V] = worldOf(s, u, v);
          xs.push(U);
          ys.push(V);
        }
        return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
      });
      for (const s of p.sections)
        for (const f of s.board.falls ?? []) {
          falls++;
          assert.ok(f.u === 0 || f.u === s.board.w - 1, 'on an edge');
          assert.deepEqual([f.du, f.dv], s.board.flow);
          const [U, V] = worldOf(s, f.u + f.du, f.v + f.dv);
          assert.ok(rects.every((r) => U < r.x0 || U > r.x1 || V < r.y0 || V > r.y1), `${theme}/${seed}/${s.wave}: a fall pours into another section`);
        }
    }
  assert.ok(falls > 0);
});
