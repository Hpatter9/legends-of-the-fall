import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addUnit, startBattle, stepBattle, place, type Battle, type BattleEvent, type Unit } from '../src/sim/battle';
import { CHARGE_MAX, KITS, tryCast, ULT_LEVEL, ULT_RATE, ultimateOf, ultimateReady } from '../src/sim/abilities';
import { localBoost } from '../src/sim/climb';
import { RUN_MAX_LEVEL, xpFor } from '../src/sim/levels';
import { ALL_HEROES } from '../src/sim/units';
import { gradeBoost } from '../src/sim/run';

// The eight heroes that have had an ultimate from the start (their kits' identity); every other hero's is unlocked at level 15.
const FIRST_EIGHT = ['demonSwordsman', 'gorgon', 'karasu', 'kitsune', 'sage', 'samuraiCommander', 'tyrant', 'yamabushi'];
const OTHERS = ALL_HEROES.filter((k) => !FIRST_EIGHT.includes(k));

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

test('every hero has an ultimate, and it charges slower than the skill', () => {
  assert.equal(ALL_HEROES.length, 45);
  for (const k of ALL_HEROES) assert.ok(KITS[k].ultimate, `${k} has an ultimate`);
  // (no two heroes share one)
  const names = ALL_HEROES.map((k) => KITS[k].ultimate!.name);
  assert.equal(new Set(names).size, names.length);
  const b = arena();
  const u = addUnit(b, 'kitsune', 3, 8);
  addUnit(b, 'skeleton', 3, 4);
  run(b, 1000);
  assert.ok(u.charge > 0 && Math.abs((u.charge2 ?? 0) - u.charge * ULT_RATE * (KITS.kitsune.ultimate!.rate ?? 1)) < 1e-6);
  assert.equal(ultimateReady(u), false);
});

test('the first eight ultimates are always the hero\'s own; every other one unlocks at level 15', () => {
  for (const k of FIRST_EIGHT) assert.equal(KITS[k].ultimate!.unlock, undefined, k);
  for (const k of OTHERS) assert.equal(KITS[k].ultimate!.unlock, ULT_LEVEL, k);
  assert.equal(ULT_LEVEL, 15);
  const b = arena();
  const first = addUnit(b, 'kitsune', 1, 8);
  assert.ok(ultimateOf(first), 'a level 1 Kitsune has hers');
  for (const k of OTHERS) {
    const low = addUnit(b, k, 0, 8, gradeBoost(1, 0, ULT_LEVEL - 1));
    const at = addUnit(b, k, 2, 8, gradeBoost(1, 0, ULT_LEVEL));
    const bare = addUnit(b, k, 4, 8);
    assert.equal(ultimateOf(low), undefined, `${k} is locked at level ${ULT_LEVEL - 1}`);
    assert.equal(ultimateOf(bare), undefined, `${k} is locked at level 1`);
    assert.equal(ultimateOf(at)?.name, KITS[k].ultimate!.name, `${k} is unlocked at level ${ULT_LEVEL}`);
    b.units = b.units.filter((x) => x === first);
  }
});

test('a locked ultimate neither charges nor casts, and the unlocked one does both', () => {
  const b = arena();
  const low = addUnit(b, 'knight', 1, 8, gradeBoost(1, 0, ULT_LEVEL - 1));
  const up = addUnit(b, 'knight', 5, 8, gradeBoost(1, 0, ULT_LEVEL));
  addUnit(b, 'skeleton', 4, 5);
  run(b, 1000);
  assert.ok(low.charge > 0 && !low.charge2, 'the skill meter fills, the ultimate\'s does not');
  assert.ok((up.charge2 ?? 0) > 0);
  low.charge2 = CHARGE_MAX;
  up.charge2 = CHARGE_MAX;
  assert.equal(ultimateReady(low), false);
  assert.equal(ultimateReady(up), true);
  const out: BattleEvent[] = [];
  low.charge = 0;
  assert.equal(tryCast(b, low, out), false, 'a locked ultimate does not go off');
  assert.equal(low.charge2, CHARGE_MAX);
  assert.ok(tryCast(b, up, out));
  assert.ok(out.some((e) => e.kind === 'skill' && e.name === KITS.knight.ultimate!.name));
});

test('the level a hero fights at reaches the fight: its kind\'s lasting level, and a run\'s own level capped at 20', () => {
  assert.equal(gradeBoost(1, 0, 15).level, 15);
  const b = arena();
  assert.equal(addUnit(b, 'knight', 1, 8, gradeBoost(1, 0, 22)).level, 22);
  assert.equal(addUnit(b, 'knight', 2, 8, gradeBoost(1)).level, undefined);
  const at = (lv: number) => localBoost({ id: 1, kind: 'knight', grade: 1, xp: xpFor(lv) });
  assert.equal(at(14).level, 14);
  assert.equal(at(15).level, 15);
  assert.equal(localBoost({ id: 1, kind: 'knight', grade: 1, xp: xpFor(29) }).level, RUN_MAX_LEVEL, 'in a run the level stops at 20');
  assert.ok(ultimateOf(addUnit(b, 'cleric', 3, 8, at(15))));
  assert.equal(ultimateOf(addUnit(b, 'cleric', 4, 8, at(14))), undefined);
});

// A hero at level 15 beside a hurt knight, with skeletons coming at it: its ultimate, charged, goes off.
const fires = (kind: string): string[] => {
  const b = arena();
  const me = addUnit(b, kind, 3, 8, gradeBoost(1, 0, ULT_LEVEL));
  const mate = addUnit(b, 'knight', 4, 7, gradeBoost(1, 0, ULT_LEVEL));
  mate.hp = Math.round(mate.maxHp * 0.4);
  [[2, 5], [3, 5], [4, 5], [3, 4], [5, 4], [1, 4]].forEach(([u, v]) => addUnit(b, 'skeleton', u, v));
  me.charge2 = CHARGE_MAX;
  const names: string[] = [];
  for (let i = 0; i < 100 && b.phase === 'fight'; i++) for (const e of stepBattle(b)) if (e.kind === 'skill') names.push(e.name);
  return names;
};

test('every ultimate fires in a fight', () => {
  for (const k of OTHERS) assert.ok(fires(k).includes(KITS[k].ultimate!.name), `${k}: ${KITS[k].ultimate!.name}`);
});

test('a fight with the new ultimates is deterministic', () => {
  const go = () => {
    const b = startBattle(5, 'skeletons');
    OTHERS.slice(0, 5).forEach((k, i) => place(b, k, 1 + i, 8, i + 1, gradeBoost(1, 0, ULT_LEVEL)));
    for (const u of b.units) if (u.side === 'hero') u.charge2 = CHARGE_MAX;
    b.phase = 'fight';
    const log: string[] = [];
    for (let i = 0; i < 1200 && b.phase === 'fight'; i++) for (const e of stepBattle(b)) log.push(e.kind === 'skill' ? e.name : e.kind === 'hit' ? `${e.by}>${e.to}:${e.dmg}` : e.kind);
    return log.join('|') + b.units.map((u) => u.hp).join();
  };
  const a = go();
  assert.equal(a, go());
  assert.ok(OTHERS.slice(0, 5).some((k) => a.includes(KITS[k].ultimate!.name)));
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
  for (const k of ALL_HEROES) assert.ok(SKILL_FX[KITS[k].ultimate!.name]?.cast, k);
});
