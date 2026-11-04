// The kit rules every batch of coming heroes is held to (docs/notes/twenty-heroes.md), the roster's own (`test/skill-rules.test.ts`,
// `test/hero-kits-all.test.ts`, `test/skill3.test.ts`): imported by each batch's test file (`vampire-kits.test.ts`, `wave2-kits.test.ts`)
// with its five heroes. The heroes wait outside the roster, so these read `comingHeroKits()`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bareBoard } from './bare';
import { addUnit, fight, place, startBattle, stepBattle, type Battle, type BattleEvent, type Unit } from '../src/sim/battle';
import { KITS, keyOf, kitOf, powered, ULT_LEVEL, ultimateOf } from '../src/sim/abilities';
import { HERO_KITS, heroKitOf, skill2Open, skill3Open, SKILL2_LEVEL, SKILL3_LEVEL } from '../src/sim/heroKits';
import { CAST_EXEMPT, CLASS_RANGE, heroIncome, kitDemand, slotDemand } from '../src/sim/skillRules';
import { comingHeroKits, comingKits } from '../src/sim/kits/coming';
import { gradeBoost } from '../src/sim/run';
import { mixSeed, Rng } from '../src/sim/rng';
import { profileOf } from '../src/sim/stats';
import { ALL_HEROES } from '../src/sim/units';
import { deploySpots } from '../tools/heroSweep';


/** Register the kit tests for `heroes` (five coming heroes, fielded together in the long fights), named for `who`. */
export function comingKitTests(who: string, heroes: readonly string[]): void {
  test(`${who}: each hero has a pool, three skills and an ultimate, its own profile, and none of it is in the roster's tables yet`, () => {
    const roster = new Set(ALL_HEROES.flatMap((h) => [...HERO_KITS()[h].slots.map((s) => keyOf(s.skill)), keyOf(KITS[h].ultimate!)]));
    const mine: string[] = [];
    for (const h of heroes) {
      const hk = comingHeroKits()[h];
      assert.ok(hk && hk.s3 && hk.slots.length === 3 && hk.slots[0] === hk.s1 && hk.slots[1] === hk.s2 && hk.slots[2] === hk.s3, h);
      assert.ok(hk.role, h);
      assert.ok(comingKits()[h].ultimate?.unlock === ULT_LEVEL && comingKits()[h].ultimate?.tuned, `${h}: its ultimate opens at level 30, tuned`);
      assert.equal(comingKits()[h].skill, hk.s1.skill, `${h}: skill 1 is its kit's own skill`);
      assert.ok(profileOf(h), `${h} has scores`);
      assert.ok(!HERO_KITS()[h] && !KITS[h], `${h} is not in the roster's kits`);
      mine.push(...hk.slots.map((s) => keyOf(s.skill)), keyOf(comingKits()[h].ultimate!));
    }
    assert.equal(new Set(mine).size, mine.length, 'every name is its own');
    for (const k of mine) assert.ok(!roster.has(k), `${k} is not a roster skill's name`);
    // (a placed Vampire reads its kit, as a roster hero does)
    const b = startBattle(3);
    const u = addUnit(b, 'vampireLord', 2, 8, { level: 1 });
    assert.equal(heroKitOf(u), comingHeroKits().vampireLord);
    assert.equal(kitOf(u), comingKits().vampireLord);
  });

  test(`${who}: every skill sits in its class's ranges, a heavy is its kit's dearest and a jab its cheapest`, () => {
    for (const h of heroes) {
      const hk = comingHeroKits()[h];
      hk.slots.forEach((s, i) => {
        const r = CLASS_RANGE[s.cls];
        const what = `${h} skill ${i + 1} (${s.skill.name}, ${s.cls})`;
        assert.ok(s.cost >= r[hk.pool][0] && s.cost <= r[hk.pool][1], `${what} costs ${s.cost}`);
        assert.ok(s.cd >= r.cd[0] && s.cd <= r.cd[1], `${what} cools for ${s.cd} ms`);
        if (!CAST_EXEMPT.has(keyOf(s.skill))) assert.ok(s.skill.castMs >= r.cast[0] && s.skill.castMs <= r.cast[1], `${what} casts in ${s.skill.castMs} ms`);
        assert.ok(s.tune > 0, what);
      });
      for (const s of hk.slots)
        for (const o of hk.slots) {
          if (s.cls === 'heavy') assert.ok(s.cost >= o.cost, `${h}: ${s.skill.name} (heavy) costs no less than ${o.skill.name}`);
          if (s.cls === 'jab') assert.ok(s.cost <= o.cost, `${h}: ${s.skill.name} (jab) costs no more than ${o.skill.name}`);
        }
    }
  });

  test(`${who}: each kit asks between 1.4 and 3.5 times its own income, and a jab never empties the pool on its own (rules 3 and 2)`, () => {
    for (const h of heroes) {
      const hk = comingHeroKits()[h];
      const d = kitDemand(hk, undefined, h);
      assert.ok(d >= 1.4 && d <= 3.5, `${h} asks ${d.toFixed(2)}`);
      const income = heroIncome(h);
      for (const s of hk.slots) if (s.cls === 'jab') assert.ok(slotDemand(s) < income, `${h}: ${s.skill.name} asks ${slotDemand(s).toFixed(2)} against ${income.toFixed(2)}`);
    }
  });

  /** A Vampire at level 30 on a bare board, foes round it (`close`: beside it; else three or four tiles off) and a hurt friend. */
  function scene(kind: string, close: boolean): { b: Battle; me: Unit; ally: Unit } {
    const b = startBattle(7);
    bareBoard(b);
    b.units = [];
    b.phase = 'fight';
    b.t = 6000;
    b.kits = {};
    const me = addUnit(b, kind, 3, 7, { level: ULT_LEVEL });
    const ally = addUnit(b, 'knight', 4, 7, { level: ULT_LEVEL });
    ally.hp = Math.round(ally.maxHp * 0.3);
    const d = close ? 1 : 3;
    for (const [def, u, v] of [['orcGrunt', 3, 7 - d], ['orcGrunt', 4, 7 - d], ['orcArcher', 3, 2]] as const) {
      const f = addUnit(b, def, u, v);
      f.maxHp = f.hp = 50000;
    }
    return { b, me, ally };
  }

  test(`${who}: each hero's three skills and ultimate can be cast, in at least one of two scenes, and the fight goes on without errors`, () => {
    for (const h of heroes) {
      const hk = comingHeroKits()[h];
      const skills = [...hk.slots.map((s) => s.skill), comingKits()[h].ultimate!];
      skills.forEach((s, i) => {
        let cast = false;
        for (const close of [true, false]) {
          const { b, me } = scene(h, close);
          // (a guard's case: the caster low with a foe beside it, and its friend low with a foe beside it)
          if (hk.slots[i]?.emergency) me.hp = Math.round(me.maxHp * 0.3);
          const out: BattleEvent[] = [];
          if (s.cast(b, me, out)) {
            cast = true;
            assert.ok(out.length > 0, `${h}: ${s.name} said nothing`);
          }
          for (let t = 0; t < 30 && b.phase === 'fight'; t++) stepBattle(b);
        }
        assert.ok(cast, `${h}: ${['skill 1', 'skill 2', 'skill 3', 'the ultimate'][i]} (${s.name}) did nothing in either scene`);
      });
    }
  });

  test(`${who}: a guard is cast only in its case: its own cast checks the trigger the AI reads`, () => {
    for (const h of heroes) {
      for (const s of comingHeroKits()[h].slots.filter((x) => x.cls === 'guard')) {
        const { b, me } = scene(h, true);
        me.hp = me.maxHp;
        for (const a of b.units) if (a.side === 'hero') a.hp = a.maxHp;
        // (at full health and with every friend well, there is nothing to answer, unless the trigger is a foe beside her)
        const calm = s.emergency!(b, me);
        assert.equal(s.skill.cast(b, me, []), calm, `${h}: ${s.skill.name} casts exactly when its trigger holds`);
        // (with the foes out of reach its trigger cannot hold)
        const far = scene(h, false);
        far.me.hp = far.me.maxHp;
        for (const a of far.b.units) if (a.side === 'hero') a.hp = a.maxHp;
        for (const f of far.b.units) if (f.side === 'foe') f.v = 0;
        assert.ok(!s.emergency!(far.b, far.me) && !s.skill.cast(far.b, far.me, []), `${h}: ${s.skill.name} waits`);
      }
    }
  });

  test(`${who}: the slots open at their levels, as the roster's: skill 2 at 10, skill 3 at 20, the ultimate at 30`, () => {
    for (const h of heroes) {
      const b = startBattle(3);
      const open = (level: number) => {
        const u = addUnit(b, h, 2, 8, { level });
        return [skill2Open(u), skill3Open(u), ultimateOf(u) !== undefined];
      };
      assert.deepEqual(open(1), [false, false, false], h);
      assert.deepEqual(open(SKILL2_LEVEL - 1), [false, false, false], h);
      assert.deepEqual(open(SKILL2_LEVEL), [true, false, false], h);
      assert.deepEqual(open(SKILL3_LEVEL - 1), [true, false, false], h);
      assert.deepEqual(open(SKILL3_LEVEL), [true, true, false], h);
      assert.deepEqual(open(ULT_LEVEL - 1), [true, true, false], h);
      assert.deepEqual(open(ULT_LEVEL), [true, true, true], h);
    }
  });

  /** The five at level 30 against a tough band, every skill open: which skills each casts, and how the fight ends. */
  function season(seed: number): { trace: string; seen: Map<string, Set<string>> } {
    const b = startBattle(seed, ['orcs', 'werewolves', 'mixed'][seed % 3], { foes: { hp: 60, atk: 1.6 } });
    const spots = deploySpots(b, new Rng(mixSeed(seed, 0xba1a)));
    heroes.forEach((id, i) => place(b, id, spots[i][0], spots[i][1], undefined, { ...gradeBoost(1, 0, ULT_LEVEL), charge2: 60 }));
    fight(b);
    const seen = new Map(heroes.map((h) => [h, new Set<string>()]));
    const byId = new Map(b.units.map((u) => [u.id, u.def]));
    let trace = '';
    while (b.phase === 'fight') for (const e of stepBattle(b)) if (e.kind === 'skill') {
      seen.get(byId.get(e.by) ?? '')?.add(e.name);
      trace += `${e.by}:${e.name}@${b.t};`;
    }
    return { trace: `${b.phase}@${b.t}|${trace}`, seen };
  }

  test(`${who}: the five fight together with their whole kits open, every skill comes round, and the fights are deterministic`, () => {
    const first = season(905);
    assert.equal(season(905).trace, first.trace);
    const cast = new Map(heroes.map((h) => [h, new Set<string>()]));
    for (const seed of [905, 906, 907, 908]) for (const [h, s] of season(seed).seen) for (const n of s) cast.get(h)!.add(n);
    for (const h of heroes) {
      const hk = comingHeroKits()[h];
      // (a guard is cast only in its case; the others come round in a long fight)
      for (const s of hk.slots.filter((x) => x.cls !== 'guard')) assert.ok(cast.get(h)!.has(keyOf(s.skill)), `${h} cast ${s.skill.name} (${[...cast.get(h)!].join(', ')})`);
      assert.ok(cast.get(h)!.has(keyOf(comingKits()[h].ultimate!)), `${h} let its ultimate go`);
    }
  });

  test(`${who}: a skill cast as the AI casts it (its strength lifting its attack) strikes the foe before it`, () => {
    const { b, me } = scene(heroes[0], true);
    const s1 = comingHeroKits()[heroes[0]].s1;
    const out: BattleEvent[] = [];
    assert.ok(powered(b, me, s1.skill, s1.tune - 1, out));
    assert.ok(out.some((e) => e.kind === 'hit' && e.by === me.id));
  });
}
