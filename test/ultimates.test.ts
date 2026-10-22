import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addUnit, startBattle, stepBattle, place, type Battle, type BattleEvent, type Unit } from '../src/sim/battle';
import { CHARGE_MAX, KITS, tryCast, ULT_RATE, ultimateReady } from '../src/sim/abilities';
import { ALL_HEROES } from '../src/sim/units';
import { gradeBoost } from '../src/sim/run';

// The eight heroes with an ultimate: part of their kits (their identity), not a reward of any tier.
const ULTIMATES = ['demonSwordsman', 'gorgon', 'karasu', 'kitsune', 'sage', 'samuraiCommander', 'tyrant', 'yamabushi'];

function arena(): Battle {
  const b = startBattle(3);
  for (const t of b.board.tiles) (t.h = 0), (t.rock = false);
  b.units = [];
  b.phase = 'fight';
  return b;
}
const run = (b: Battle, ms: number): BattleEvent[] => {
  const out: BattleEvent[] = [];
  for (const end = b.t + ms; b.t < end && b.phase === 'fight'; ) out.push(...stepBattle(b));
  return out;
};
const cast = (b: Battle, me: Unit): BattleEvent[] => {
  const out: BattleEvent[] = [];
  assert.ok(tryCast(b, me, out));
  return out;
};

test('exactly these eight heroes have an ultimate, and it charges slower than the skill', () => {
  assert.deepEqual(ALL_HEROES.filter((k) => KITS[k].ultimate).sort(), ULTIMATES);
  // (the heroes: a few foes of the armies have an ultimate of their own, which is theirs alone)
  for (const k of ALL_HEROES) assert.equal(!!KITS[k].ultimate, ULTIMATES.includes(k), k);
  const b = arena();
  const u = addUnit(b, 'kitsune', 3, 8);
  addUnit(b, 'skeleton', 3, 4);
  run(b, 1000);
  assert.ok(u.charge > 0 && Math.abs((u.charge2 ?? 0) - u.charge * ULT_RATE) < 1e-6);
  assert.equal(ultimateReady(u), false);
});

test('Nine-Tailed Dream charms the three strongest foes', () => {
  const b = arena();
  const me = addUnit(b, 'kitsune', 3, 8);
  const foes = [4, 3, 2, 5].map((u, i) => addUnit(b, 'skeleton', u, 4 + (i % 2)));
  me.charge2 = CHARGE_MAX;
  cast(b, me);
  assert.equal(foes.filter((f) => f.charmUntil && f.charmUntil > b.t).length, 3);
  assert.equal(me.charge2, 0);
  assert.equal(ultimateReady(me), false);
});

test('Feather Storm falls on a crowd for more than double', () => {
  const b = arena();
  const me = addUnit(b, 'karasu', 3, 8);
  const foes = [addUnit(b, 'skeleton', 3, 5), addUnit(b, 'skeleton', 4, 5), addUnit(b, 'skeleton', 3, 4)];
  const hp = foes.map((f) => f.hp);
  me.charge2 = CHARGE_MAX;
  cast(b, me);
  run(b, 1200);
  assert.ok(foes.every((f, i) => f.hp < hp[i] - 20));
});

test('Tempest hurts, shoves and stuns everything within four tiles', () => {
  const b = arena();
  const me = addUnit(b, 'yamabushi', 3, 8);
  const near = addUnit(b, 'skeleton', 3, 5);
  const far = addUnit(b, 'skeleton', 3, 0);
  me.charge2 = CHARGE_MAX;
  const v = near.v;
  cast(b, me);
  assert.ok(near.hp < near.maxHp && near.busyUntil >= b.t + 1500);
  assert.notEqual(near.v, v);
  assert.equal(far.hp, far.maxHp);
});

test('Stone Curse petrifies every foe in sight', () => {
  const b = arena();
  const me = addUnit(b, 'gorgon', 3, 8);
  const foes = [addUnit(b, 'skeleton', 2, 5), addUnit(b, 'skeleton', 4, 5), addUnit(b, 'spearman', 3, 4)];
  me.charge2 = CHARGE_MAX;
  cast(b, me);
  for (const f of foes) assert.ok(f.hp < f.maxHp && f.busyUntil >= b.t + 2500);
});

test('Rally Cry heartens the whole army', () => {
  const b = arena();
  const me = addUnit(b, 'samuraiCommander', 3, 8);
  const ally = addUnit(b, 'knight', 0, 8);
  ally.hp = 100;
  addUnit(b, 'skeleton', 3, 2);
  me.charge2 = CHARGE_MAX;
  cast(b, me);
  assert.ok(ally.hp > 100 && ally.banner && (ally.power ?? 1) > 1);
  assert.ok(me.banner);
});

test('a fight with ultimates is deterministic and its ultimates go off', () => {
  const go = () => {
    const b = startBattle(11, 'skeletons');
    place(b, 'kitsune', 1, 8, 1, gradeBoost(1, 0, 1));
    place(b, 'gorgon', 3, 8, 2, gradeBoost(1, 0, 1));
    place(b, 'knight', 5, 8, 3, gradeBoost(1));
    for (const u of b.units) if (u.side === 'hero') u.charge2 = CHARGE_MAX;
    b.phase = 'fight';
    const names: string[] = [];
    for (let i = 0; i < 1800 && b.phase === 'fight'; i++) for (const e of stepBattle(b)) if (e.kind === 'skill') names.push(e.name);
    return names;
  };
  const a = go();
  assert.deepEqual(a, go());
  assert.ok(a.some((n) => n === 'Nine-Tailed Dream' || n === 'Stone Curse'), a.join());
});

test('every ultimate has a cast effect', async () => {
  const { SKILL_FX } = await import('../src/render/skillFx');
  for (const k of ULTIMATES) assert.ok(SKILL_FX[KITS[k].ultimate!.name]?.cast, k);
});
