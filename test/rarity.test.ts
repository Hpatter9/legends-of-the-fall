import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addUnit, place, startBattle, stepBattle, type Battle, type BattleEvent, type Unit } from '../src/sim/battle';
import { CHARGE_MAX, KITS, tryCast, ULT_RATE, ultimateReady } from '../src/sim/abilities';
import { ALL_HEROES, HEROES, UNITS } from '../src/sim/units';
import { loadMeta, MYTHIC_PITY, MYTHIC_SIZE, newMeta, PITY, pullOnce, RARITY_NAMES, RATES, rarityOf, TIER_MULT, tierMult } from '../src/sim/meta';
import { boostOf, gradeBoost } from '../src/sim/run';

const MYTHICS = ALL_HEROES.filter((k) => rarityOf(k) === 5);

test('every hero has a tier, in the planned spread, and the starting five are Common', () => {
  const count = [0, 0, 0, 0, 0, 0];
  for (const k of ALL_HEROES) {
    const r = UNITS[k].rarity;
    assert.ok(r && r >= 1 && r <= 5, k);
    count[r!]++;
  }
  assert.deepEqual(count.slice(1), [6, 6, 5, 3, 5]);
  for (const k of HEROES) assert.equal(rarityOf(k), 1);
  assert.equal(RARITY_NAMES[5], 'Mythic');
});

test('higher tiers multiply hp and attack, and a Mythic is drawn bigger', () => {
  for (let r = 2; r <= 5; r++) assert.ok(TIER_MULT[r] > TIER_MULT[r - 1]);
  assert.equal(TIER_MULT[1], 1);
  assert.equal(TIER_MULT[5], 1.4);
  const common = gradeBoost(1, 0, 1, 'knight');
  assert.deepEqual(common, gradeBoost(1));
  const mythic = gradeBoost(1, 0, 1, 'kitsune');
  assert.ok(Math.abs(mythic.hp! - 1.4) < 1e-9 && Math.abs(mythic.atk! - 1.4) < 1e-9);
  assert.equal(mythic.size, MYTHIC_SIZE);
  assert.equal(gradeBoost(1, 0, 1, 'cleric').size, undefined);
  assert.equal(tierMult('gunslinger'), TIER_MULT[4]);
  // (a roster hero carries its tier into the fight)
  assert.ok(boostOf({ id: 1, kind: 'gorgon', grade: 1 }).atk! > boostOf({ id: 2, kind: 'knight', grade: 1 }).atk!);
  const b = startBattle(2);
  place(b, 'karasu', 0, 8, 1, boostOf({ id: 1, kind: 'karasu', grade: 1 }));
  place(b, 'knight', 1, 8, 2, boostOf({ id: 2, kind: 'knight', grade: 1 }));
  const k = b.units.find((x) => x.def === 'karasu')!;
  const n = b.units.find((x) => x.def === 'knight')!;
  assert.equal(k.maxHp, Math.round(UNITS.karasu.hp * 1.4));
  assert.equal(k.size, MYTHIC_SIZE);
  assert.equal(n.maxHp, UNITS.knight.hp);
});

test('the rates sum to 100 and a long run of pulls follows them', () => {
  assert.equal(Object.values(RATES).reduce((a, b) => a + b, 0), 100);
  const m = newMeta(77);
  const seen = [0, 0, 0, 0, 0, 0];
  const N = 30000;
  for (let i = 0; i < N; i++) seen[pullOnce(m).rarity]++;
  // (pity adds a little to the top tiers)
  for (const r of [1, 2, 3] as const) assert.ok(Math.abs(seen[r] / N - RATES[r] / 100) < 0.03, `tier ${r}: ${seen[r] / N}`);
  assert.ok(seen[4] / N >= RATES[4] / 100 - 0.01 && seen[4] / N < 0.12);
  assert.ok(seen[5] / N >= RATES[5] / 100 - 0.005 && seen[5] / N < 0.05);
});

test('pity: a Legendary or better by pull 30, a Mythic by pull 90, on every seed', () => {
  for (let seed = 1; seed <= 12; seed++) {
    const m = newMeta(seed);
    let dry = 0;
    let dryM = 0;
    for (let i = 0; i < 1500; i++) {
      const r = pullOnce(m).rarity;
      dry = r >= 4 ? 0 : dry + 1;
      dryM = r === 5 ? 0 : dryM + 1;
      assert.ok(dry < PITY && dryM < MYTHIC_PITY, `seed ${seed} pull ${i}`);
    }
  }
  const m = newMeta(4);
  m.dryMythic = MYTHIC_PITY - 1;
  assert.equal(pullOnce(m).rarity, 5);
  assert.equal(m.dryMythic, 0);
  assert.equal(m.dry, 0);
});

test('a duplicate still gives a shard', () => {
  const m = newMeta(6);
  m.unlocked = [...ALL_HEROES];
  const p = pullOnce(m);
  assert.equal(p.isNew, false);
  assert.equal(m.shards[p.kind], 1);
});

test('an old save without the Mythic counter loads', () => {
  const old = newMeta(3) as unknown as Record<string, unknown>;
  delete old.dryMythic;
  old.dry = 4;
  const m = loadMeta(1, { getItem: () => JSON.stringify(old) });
  assert.equal(m.dryMythic, 0);
  assert.equal(m.dry, 4);
  assert.equal(typeof pullOnce(m).kind, 'string');
});

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

test('exactly the Mythics have an ultimate, and it charges slower than the skill', () => {
  assert.deepEqual(MYTHICS.sort(), ['gorgon', 'karasu', 'kitsune', 'samuraiCommander', 'yamabushi']);
  // (the heroes: a few foes of the armies have an ultimate of their own, which is theirs alone)
  for (const k of ALL_HEROES) assert.equal(!!KITS[k].ultimate, MYTHICS.includes(k), k);
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

test('a Mythic fight is deterministic and its ultimates go off', () => {
  const go = () => {
    const b = startBattle(11, 'skeletons');
    place(b, 'kitsune', 1, 8, 1, gradeBoost(1, 0, 1, 'kitsune'));
    place(b, 'gorgon', 3, 8, 2, gradeBoost(1, 0, 1, 'gorgon'));
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
  for (const k of MYTHICS) assert.ok(SKILL_FX[KITS[k].ultimate!.name]?.cast, k);
});
