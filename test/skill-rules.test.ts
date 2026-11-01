// The skills overhaul's rules as data (docs/notes/skills-overhaul-design.md section 3, docs/notes/skills-1.md): every hero skill has a class and
// a cooldown of its own, a kit lists its skills in slots, and the AI weighs any number of them in a fixed order.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bareBoard } from './bare';
import { addUnit, startBattle, type Battle, type BattleEvent, type Unit } from '../src/sim/battle';
import { CHARGE_MAX, keyOf } from '../src/sim/abilities';
import { HERO_KITS, RES, SLOT_LEVELS, canPay, castHero, costOf, resMax, slotOpen, type HeroKit } from '../src/sim/heroKits';
import { CLASSES, THIRD_KINDS } from '../src/sim/kits/table';
import { CAST_EXEMPT, CLASS_RANGE, CLASS_WEIGHT, INCOME, kitDemand, slotDemand } from '../src/sim/skillRules';
import { ALL_HEROES } from '../src/sim/units';

function arena(): Battle {
  const b = startBattle(3);
  bareBoard(b);
  b.units = [];
  b.phase = 'fight';
  b.kits = {};
  return b;
}
const spawn = (b: Battle, def: string, u: number, v: number, level = 1): Unit => addUnit(b, def, u, v, level > 1 ? { level } : {});

test('every hero kit lists its skills in slots, the first two the same as s1 and s2 (the third as s3), each with a class and a cooldown', () => {
  for (const h of ALL_HEROES) {
    const hk = HERO_KITS()[h];
    // (the skills overhaul's batch 4: a third skill for each hero)
    assert.equal(hk.slots.length, THIRD_KINDS.includes(h) ? 3 : 2, h);
    assert.equal(hk.slots[0], hk.s1, h);
    assert.equal(hk.slots[1], hk.s2, h);
    assert.equal(hk.slots[2], hk.s3, h);
    hk.slots.forEach((s, i) => {
      if (i < 2) assert.equal(s.cls, CLASSES[h][i], `${h} skill ${i + 1}`);
      assert.ok(CLASS_RANGE[s.cls], `${h} skill ${i + 1}`);
      assert.ok(s.cd > 0, `${h} skill ${i + 1} has a cooldown`);
    });
  }
});

test('the slots open at their levels: skill 1 from level 1, skill 2 from level 10, skill 3 from level 20', () => {
  assert.deepEqual(SLOT_LEVELS, [1, 10, 20]);
  const b = arena();
  const low = spawn(b, 'knight', 1, 1, 9);
  const high = spawn(b, 'knight', 2, 2, 10);
  const top = spawn(b, 'knight', 3, 3, 20);
  assert.ok(slotOpen(low, 1) && !slotOpen(low, 2));
  assert.ok(slotOpen(high, 1) && slotOpen(high, 2));
  assert.ok(!slotOpen(high, 3), 'skill 3 is shut below level 20');
  assert.ok(slotOpen(top, 3) && !slotOpen(top, 4));
});

test('a slot past the kit, or one not yet open, is never paid for or cast', () => {
  const b = arena();
  const k = spawn(b, 'archer', 3, 8);
  spawn(b, 'skeleton', 3, 4);
  const hk = HERO_KITS().archer;
  k.charge = CHARGE_MAX;
  assert.ok(!canPay(b, k, hk, 2), 'skill 2 is shut at level 1');
  assert.ok(!canPay(b, k, hk, 3), 'slot 3 is shut at level 1');
  assert.ok(!canPay(b, k, hk, 4), 'there is no slot 4');
  // (a kit given a third slot that opens at no level is never cast)
  const three: HeroKit = { ...hk, slots: [...hk.slots, { ...hk.s2 }] };
  const out: BattleEvent[] = [];
  castHero(b, k, three, out);
  assert.equal(k.ks?.at3, undefined);
});

// Batch 2: cooldowns and costs by class (the design's section 3 rules 1, 3, 4 and 6; rule 2, a jab never empties the pool, waits for the
// third skills, the first jabs).
test('every skill sits in its class\'s ranges: cost, cooldown and cast time (the design\'s few slow or quick casts kept as they are)', () => {
  for (const h of ALL_HEROES) {
    const hk = HERO_KITS()[h];
    hk.slots.forEach((s, i) => {
      const r = CLASS_RANGE[s.cls];
      const what = `${h} skill ${i + 1} (${s.skill.name}, ${s.cls})`;
      assert.ok(s.cost >= r[hk.pool][0] && s.cost <= r[hk.pool][1], `${what} costs ${s.cost}`);
      assert.ok(s.cd >= r.cd[0] && s.cd <= r.cd[1], `${what} cools for ${s.cd} ms`);
      if (!CAST_EXEMPT.has(keyOf(s.skill))) assert.ok(s.skill.castMs >= r.cast[0] && s.skill.castMs <= r.cast[1], `${what} casts in ${s.skill.castMs} ms`);
    });
  }
});

test('no pool gap is left: every skill\'s cooldown is its own', () => {
  assert.equal((RES as Record<string, unknown>).GAP_STAM_MS, undefined);
  assert.equal((RES as Record<string, unknown>).GAP_MANA_MS, undefined);
});

test('within a kit a heavy skill is its dearest and a jab its cheapest', () => {
  for (const h of ALL_HEROES) {
    const hk = HERO_KITS()[h];
    for (const s of hk.slots)
      for (const o of hk.slots) {
        if (s.cls === 'heavy') assert.ok(s.cost >= o.cost, `${h}: ${s.skill.name} (heavy) costs no less than ${o.skill.name}`);
        if (s.cls === 'jab') assert.ok(s.cost <= o.cost, `${h}: ${s.skill.name} (jab) costs no more than ${o.skill.name}`);
      }
  }
});

test('a kit\'s skills ask between 1.4 and 3.5 times its pool\'s income (rule 3; the floor once the kit has its third skill)', () => {
  for (const h of ALL_HEROES) {
    const d = kitDemand(HERO_KITS()[h]);
    assert.ok(d <= 3.5, `${h} asks ${d.toFixed(2)}`);
    if (HERO_KITS()[h].s3) assert.ok(d >= 1.4, `${h} asks ${d.toFixed(2)}`);
  }
});

test('a jab never empties the pool on its own: its cost over its cooldown is under the pool\'s income (rule 2, the measured income)', () => {
  for (const h of ALL_HEROES) {
    const hk = HERO_KITS()[h];
    for (const s of hk.slots) if (s.cls === 'jab') assert.ok(slotDemand(s) < INCOME[hk.pool], `${h}: ${s.skill.name} asks ${slotDemand(s).toFixed(2)} a second`);
  }
});

const full = (u: Unit) => (u.charge = CHARGE_MAX);
const cast = (b: Battle, u: Unit): string | undefined => {
  const out: BattleEvent[] = [];
  castHero(b, u, HERO_KITS()[u.def], out);
  return out.find((e) => e.kind === 'skill')?.name;
};

test('the AI weighs a heavy skill before a strike, whatever its slot', () => {
  // (the Archer: Aimed Shot, a heavy, is skill 2; Volley, a strike, skill 1)
  const b = arena();
  const a = spawn(b, 'archer', 3, 7, 10);
  spawn(b, 'skeleton', 3, 4).busyUntil = 1e9;
  full(a);
  assert.equal(cast(b, a), keyOf(HERO_KITS().archer.s2.skill));
  // (the Beastmaster: Summon Beast, a utility, is skill 1; Pack Tactics, a strike, skill 2)
  assert.ok(CLASS_WEIGHT.utility > CLASS_WEIGHT.strike);
  assert.equal(HERO_KITS().beastmaster.s1.cls, 'utility');
});

test('the breath: after a cast ends the hero waits RES.BREATH_MS before another skill', () => {
  const b = arena();
  const a = spawn(b, 'archer', 3, 7, 10);
  spawn(b, 'skeleton', 3, 4).busyUntil = 1e9;
  full(a);
  const hk = HERO_KITS().archer;
  assert.ok(RES.BREATH_MS >= 500 && RES.BREATH_MS <= 1000);
  assert.ok(cast(b, a));
  a.busyUntil = 0;
  b.t += hk.s2.skill.castMs + RES.BREATH_MS - 100;
  full(a);
  assert.equal(cast(b, a), undefined, 'still taking its breath');
  b.t += 100;
  assert.equal(cast(b, a), keyOf(hk.s1.skill), 'then the strike');
});

test('a guard\'s emergency ignores the breath; another skill\'s emergency waits for it', () => {
  const b = arena();
  // (the Kunoichi's Smoke Bomb, a guard, goes at once when she is badly hurt with a foe beside her)
  const k = spawn(b, 'kunoichi', 3, 5, 10);
  spawn(b, 'skeleton', 3, 4).busyUntil = 1e9;
  full(k);
  k.hp = Math.round(k.maxHp * 0.2);
  k.ks = { breath: b.t + 5000 };
  assert.equal(HERO_KITS().kunoichi.s2.cls, 'guard');
  assert.equal(cast(b, k), keyOf(HERO_KITS().kunoichi.s2.skill));
  // (the Knight's Shield Wall, a utility with an emergency, waits)
  const b2 = arena();
  const n = spawn(b2, 'knight', 3, 5);
  spawn(b2, 'skeleton', 3, 4).busyUntil = 1e9;
  full(n);
  n.hp = Math.round(n.maxHp * 0.2);
  n.ks = { breath: b2.t + 5000 };
  assert.equal(cast(b2, n), undefined);
});

test('a lighter skill is held for a heavier one only when its cooldown ends within the hold and paying would leave it short', () => {
  const b = arena();
  const a = spawn(b, 'archer', 3, 7, 10);
  spawn(b, 'skeleton', 3, 4).busyUntil = 1e9;
  const hk = HERO_KITS().archer;
  const set = (pts: number) => (a.charge = (pts / resMax('stamina')) * CHARGE_MAX);
  // (Aimed Shot just cast: its cooldown is long, so Volley goes at once)
  a.ks = { at2: b.t - 1000 };
  set(costOf(a, hk.s1) + 1);
  assert.equal(cast(b, a), keyOf(hk.s1.skill));
  // (Aimed Shot about to come round and a whisker short: Volley waits for it)
  a.busyUntil = 0;
  a.ks = { at2: b.t - hk.s2.cd + 500 };
  set(costOf(a, hk.s2) - 0.2);
  assert.equal(cast(b, a), undefined);
  // (with enough for both, nothing is held)
  set(costOf(a, hk.s2) + costOf(a, hk.s1));
  assert.equal(cast(b, a), keyOf(hk.s1.skill));
});

test('two skills of a class take turns: the one cast last goes last', () => {
  // (the Druid: Conjure Treant and Wild Shape are both utilities)
  const b = arena();
  const d = spawn(b, 'druid', 3, 5, 10);
  spawn(b, 'skeleton', 3, 4).busyUntil = 1e9;
  const hk = HERO_KITS().druid;
  assert.equal(hk.s1.cls, hk.s2.cls);
  full(d);
  d.ks = { at1: b.t - 30000, at2: b.t - 25000 };
  assert.equal(cast(b, d), keyOf(hk.s1.skill), 'skill 1 was cast longer ago');
});
