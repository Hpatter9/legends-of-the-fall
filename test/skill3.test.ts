// The third skills (the skills overhaul's batch 4, docs/notes/skills-overhaul-design.md section 2, docs/notes/skills-4.md): every hero's skill 3
// opens at level 20 and does what its row says; and the AI casts it in its case (its cooldown run, the others cooling, or a guard's trigger).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bareBoard } from './bare';
import { addUnit, hurt, startBattle, type Battle, type BattleEvent, type Unit } from '../src/sim/battle';
import { CHARGE_MAX, keyOf, powered } from '../src/sim/abilities';
import { bleedFor, hasAil } from '../src/sim/ailments';
import { HERO_KITS, SKILL3_LEVEL, castHero, type HeroKit } from '../src/sim/heroKits';
import { THIRD_KINDS } from '../src/sim/kits/table';
import { ALL_HEROES } from '../src/sim/units';

function arena(): Battle {
  const b = startBattle(3);
  bareBoard(b);
  b.units = [];
  b.phase = 'fight';
  b.kits = {};
  b.t = 10000;
  return b;
}
const at = (b: Battle, def: string, u: number, v: number, level = SKILL3_LEVEL): Unit => addUnit(b, def, u, v, { level });
/** A foe, made tough enough that no skill 3 fells it (so what it leaves on it can be read). */
const foe = (b: Battle, u: number, v: number, def = 'orcGrunt'): Unit => {
  const f = addUnit(b, def, u, v);
  f.maxHp = f.hp = 50000;
  return f;
};
/** Cast a hero's skill 3 as the AI would (its strength lifting its attack), and return what it said. */
function cast3(b: Battle, me: Unit): { ok: boolean; out: BattleEvent[] } {
  const s3 = HERO_KITS()[me.def].s3!;
  const out: BattleEvent[] = [];
  return { ok: powered(b, me, s3.skill, s3.tune - 1, out), out };
}
const hitsOn = (out: BattleEvent[], to: Unit, by?: Unit) => out.filter((e) => e.kind === 'hit' && e.to === to.id && (!by || e.by === by.id)).length;

/** Each third skill, set up in its case, cast, and checked against its row. The setup returns a check run after the cast. */
type Case = (b: Battle, me: Unit) => (out: BattleEvent[]) => void;
const CASES: Record<string, Case> = {
  knight: (b, me) => {
    foe(b, 3, 5);
    me.hp = Math.round(me.maxHp * 0.3);
    bleedFor(b, b.units[1], me, 0.01, 5000);
    const was = me.hp;
    return () => {
      assert.ok(me.hp >= was + me.maxHp * 0.15, 'about a fifth comes back');
      assert.ok(!hasAil(me, 'bleed'), 'he shook off the bleed');
    };
  },
  paladin: (b, me) => {
    const f = foe(b, 3, 4);
    const ally = at(b, 'archer', 3, 5);
    ally.hp = Math.round(ally.maxHp * 0.2);
    return () => {
      assert.ok(ally.kx?.bond && ally.kx.bond.by === me.id, 'the friend is bound');
      const a0 = ally.hp;
      const p0 = me.hp;
      hurt(b, f, ally, 100, false, false, [], 'blow');
      assert.ok(me.hp < p0, 'part of the blow came to him');
      assert.ok(a0 - ally.hp <= 46, `the friend took less than half (${a0 - ally.hp})`);
    };
  },
  peasant: (b) => {
    const f = foe(b, 3, 5);
    const hp = f.hp;
    return () => {
      assert.ok(f.hp < hp, 'struck');
      assert.equal(f.v, 4, 'shoved a tile back');
    };
  },
  juggernaut: (b) => {
    // (the archer behind him is the friend most at risk; the wall rises across the foes' way to her)
    const a = at(b, 'archer', 4, 7, 1);
    a.hp = Math.round(a.maxHp / 2);
    foe(b, 3, 3);
    foe(b, 4, 3);
    foe(b, 5, 3);
    return () => assert.ok((b.walls ?? []).some((w) => w.kind === 'stone'), 'a stone wall stands');
  },
  samurai: (b) => {
    const f = foe(b, 3, 5);
    return () => assert.ok(hasAil(f, 'bleed'), 'it bleeds');
  },
  kunoichi: (b) => {
    const fs = [foe(b, 3, 5), foe(b, 3, 3), foe(b, 5, 6), foe(b, 0, 0)];
    return (out) => {
      assert.equal(fs.filter((f) => hitsOn(out, f) > 0).length, 3, 'three shuriken');
      assert.equal(hitsOn(out, fs[3]), 0, 'none past 4 tiles');
      for (const f of fs.slice(0, 3)) assert.ok(hasAil(f, 'chill'), 'each slowed');
    };
  },
  ninjaMonk: (b, me) => {
    foe(b, 3, 5);
    foe(b, 2, 6);
    return () => {
      assert.ok(me.u !== 3 || me.v !== 6, 'he stepped away');
      assert.ok((me.hideUntil ?? 0) > b.t, 'he slips every blow a moment');
    };
  },
  barbarian: (b, me) => {
    const f = foe(b, 3, 5);
    const hp = f.hp;
    return () => {
      assert.ok(f.hp < hp, 'struck');
      assert.ok(me.kx?.exposed && me.kx.exposed.mult === 0.1 && me.kx.exposed.until > b.t, 'he takes more a while');
    };
  },
  mercenary: (b) => {
    const f = foe(b, 3, 5);
    return () => assert.ok((f.kx?.smoke ?? 0) > b.t, 'it misses half its blows');
  },
  lancer: (b, me) => {
    const fs = [foe(b, 3, 5), foe(b, 2, 6)];
    return () => {
      for (const f of fs) assert.equal(Math.abs(f.u - me.u) + Math.abs(f.v - me.v), 2, 'shoved a tile');
      assert.equal(me.kx?.momentum, 1, 'a step of Momentum');
    };
  },
  arcBlade: (b, me) => {
    const f = foe(b, 3, 5);
    return () => {
      assert.ok(hasAil(f, 'shock'), 'shocked');
      assert.ok((me.kx?.stored ?? 0) > 0, 'part of the cut stored');
    };
  },
  demonSwordsman: (b) => {
    const f = foe(b, 3, 5);
    return () => {
      assert.ok((f.kx?.brand ?? 0) > b.t, 'branded');
      assert.ok(hasAil(f, 'burn'), 'burning');
    };
  },
  buccaneer: (b) => {
    const f = foe(b, 3, 3, 'orcArcher');
    return () => assert.ok(hasAil(f, 'stun') || (f.stunUntil ?? 0) > b.t, 'the shooter is staggered');
  },
  dragoon: (b, me) => {
    const f = foe(b, 3, 5);
    me.hp = Math.round(me.maxHp * 0.4);
    return () => {
      assert.ok((me.kx?.scales ?? 0) > b.t, 'her scales hardened');
      const hp = me.hp;
      hurt(b, f, me, 100, false, false, [], 'blow');
      assert.ok(hp - me.hp <= 70, `she takes less (${hp - me.hp})`);
      assert.ok(hasAil(f, 'burn'), 'her striker burns');
    };
  },
  samuraiCommander: (b) => {
    const ally = at(b, 'knight', 4, 6, 1);
    const f = foe(b, 3, 5);
    const g = foe(b, 4, 5);
    return (out) => {
      assert.ok(hitsOn(out, f) > 0, 'he struck');
      assert.ok(hitsOn(out, g, ally) > 0, 'the friend struck too');
    };
  },
  wolfBard: (b, me) => {
    const f = foe(b, 3, 3);
    const ally = at(b, 'knight', 3, 7, 1);
    bleedFor(b, f, me, 0.01, 5000);
    bleedFor(b, f, ally, 0.01, 5000);
    return () => {
      for (const u of [me, ally]) {
        assert.ok(!hasAil(u, 'bleed'), 'freed');
        assert.ok((u.wardUntil ?? 0) > b.t, 'warded');
      }
    };
  },
  tyrant: (b) => {
    const f = foe(b, 3, 4);
    return () => assert.ok((f.weakUntil ?? 0) > b.t, 'weakened');
  },
};

test('every hero has a skill 3 from level 20, with a key of its own and a look', () => {
  assert.equal(SKILL3_LEVEL, 20);
  const keys = new Set<string>();
  for (const h of THIRD_KINDS) {
    const s3 = HERO_KITS()[h].s3!;
    assert.ok(s3, h);
    const k = keyOf(s3.skill);
    assert.ok(!keys.has(k), `${h}: ${k} is its own`);
    keys.add(k);
  }
  assert.ok(THIRD_KINDS.every((h) => ALL_HEROES.includes(h)));
});

for (const h of Object.keys(CASES))
  test(`${h}'s skill 3 does what its row says`, () => {
    const b = arena();
    const me = at(b, h, 3, 6);
    const check = CASES[h](b, me);
    const { ok, out } = cast3(b, me);
    assert.ok(ok, `${HERO_KITS()[h].s3!.skill.name} went off`);
    check(out);
  });

test('the AI casts skill 3 in its case: open, paid, its cooldown run (skills 1 and 2 cooling), or a guard\'s trigger at once', () => {
  for (const h of Object.keys(CASES)) {
    const b = arena();
    const me = at(b, h, 3, 6);
    CASES[h](b, me);
    const hk: HeroKit = HERO_KITS()[h];
    me.charge = CHARGE_MAX;
    me.ks = { at1: b.t, at2: b.t };
    const out: BattleEvent[] = [];
    castHero(b, me, hk, out);
    const said = out.find((e) => e.kind === 'skill' && e.by === me.id);
    assert.ok(said && said.kind === 'skill' && said.name === keyOf(hk.s3!.skill), `${h} cast ${said && said.kind === 'skill' ? said.name : 'nothing'}`);
    // (and below level 20 it never does)
    const b2 = arena();
    const low = at(b2, h, 3, 6, SKILL3_LEVEL - 1);
    CASES[h](b2, low);
    low.charge = CHARGE_MAX;
    low.ks = { at1: b2.t, at2: b2.t };
    const out2: BattleEvent[] = [];
    castHero(b2, low, hk, out2);
    assert.ok(!out2.some((e) => e.kind === 'skill' && e.by === low.id && e.name === keyOf(hk.s3!.skill)), `${h} is shut below 20`);
  }
});
