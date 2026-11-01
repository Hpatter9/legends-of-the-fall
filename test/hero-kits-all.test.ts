// Every hero's kit is whole (COMBAT-002): a pool, skill 1, skill 2 and an ultimate, with costs inside their classes' bands, and each of the three can be
// cast, in a short fight, without errors. And a fight of every hero, all three open, plays out the same twice.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bareBoard } from './bare';
import { addUnit, fight, hurt, place, startBattle, stepBattle, type Battle, type BattleEvent, type Unit } from '../src/sim/battle';
import { CHARGE_MAX, ULT_LEVEL, ultimateOf, keyOf } from '../src/sim/abilities';
import { HERO_KITS, heroKitOf, SKILL2_LEVEL } from '../src/sim/heroKits';
import { CLASS_RANGE } from '../src/sim/skillRules';
import { gradeBoost } from '../src/sim/run';
import { mixSeed, Rng } from '../src/sim/rng';
import { ALL_HEROES } from '../src/sim/units';
import { deploySpots } from '../tools/heroSweep';

test('every hero has a pool, two skills and an ultimate, with costs inside the bands', () => {
  for (const h of ALL_HEROES) {
    const k = HERO_KITS()[h];
    assert.ok(keyOf(k.s1.skill) && keyOf(k.s2.skill) && k.s1.skill !== k.s2.skill, h);
    assert.ok(k.role, h);
    // (the bands are each skill's class's since the skills overhaul's batch 2: skill 1 was 25 to 35 stamina or 40 to 50 mana, skill 2 40 to 50
    // or 55 to 75; `test/skill-rules.test.ts` holds the rest of the class rules)
    for (const [n, s] of [[1, k.s1], [2, k.s2]] as const) {
      const [lo, hi] = CLASS_RANGE[s.cls][k.pool];
      assert.ok(s.cost >= lo && s.cost <= hi, `${h} skill ${n} (${s.cls}) costs ${s.cost}`);
    }
    assert.ok(k.s1.tune > 0 && k.s2.tune > 0);
  }
  // (every skill name is its own: the page and the effects find a skill by it)
  const names = ALL_HEROES.flatMap((h) => [keyOf(HERO_KITS()[h].s1.skill), keyOf(HERO_KITS()[h].s2.skill)]);
  assert.equal(new Set(names).size, names.length);
});

/** A hero at level 30 on a bare board with foes round it (`close`: beside it; else three or four tiles off), a hurt friend, a fallen foe and the marks
 *  some skills feed on (a burn, a charge, a stun, a stored charge, a friend's recent past). */
function scene(kind: string, close: boolean): { b: Battle; me: Unit } {
  const b = startBattle(7);
  bareBoard(b);
  b.units = [];
  b.phase = 'fight';
  b.t = 6000;
  b.kits = { rewind: true };
  const me = addUnit(b, kind, 3, 7, { level: ULT_LEVEL });
  const ally = addUnit(b, 'knight', 4, 7, { level: ULT_LEVEL });
  ally.hp = Math.round(ally.maxHp * 0.3);
  ally.charge = 0;
  ally.kx = { hist: [{ t: b.t - 3500, hp: ally.maxHp, u: 4, v: 8 }] };
  const d = close ? 1 : 3;
  const a = addUnit(b, 'skeleton', 3, 7 - d);
  const c = addUnit(b, 'spearman', 4, 7 - d);
  const shooter = addUnit(b, 'boneArcher', 3, 2);
  for (const f of [a, c, shooter]) {
    f.stunUntil = b.t + 2000;
    f.dot = { kind: 'burn', dmg: 2, every: 500, ms: 3000, by: me.id, next: b.t + 500, until: b.t + 3000 };
    f.kx = { charged: b.t + 3000 };
    f.charge = 80;
  }
  const dead = addUnit(b, 'skeleton', 2, 6);
  dead.alive = false;
  dead.hp = 0;
  dead.diedAt = b.t - 1000;
  me.kx = { stored: 1000 };
  me.charge = CHARGE_MAX;
  me.charge2 = CHARGE_MAX;
  return { b, me };
}

test('every hero\'s skill 1, skill 2 and ultimate can be cast, in at least one of two scenes, without errors', () => {
  for (const h of ALL_HEROES) {
    const k = HERO_KITS()[h];
    const skills = [k.s1.skill, k.s2.skill, KITS_ULT(h)];
    skills.forEach((s, i) => {
      let cast = false;
      for (const close of [true, false]) {
        const { b, me } = scene(h, close);
        const out: BattleEvent[] = [];
        if (s.cast(b, me, out)) cast = true;
        // (and the fight goes on after it without errors)
        for (let t = 0; t < 30 && b.phase === 'fight'; t++) stepBattle(b);
      }
      assert.ok(cast, `${h}: ${['skill 1', 'skill 2', 'the ultimate'][i]} (${s.name}) did nothing in either scene`);
    });
  }
});
const KITS_ULT = (h: string) => ultimateOf({ def: h, side: 'hero', level: ULT_LEVEL } as Unit)!;

/** Every hero, nine fights of five, all at level 30 (both skills and the ultimate open), against a band with a lot of health (a long fight: the ultimates end a short one before every skill comes round; hp 16 until ULT-CHARGE's full-strength ultimates came round once or twice a fight, 80 until STATUS-FX's ailments, whose burns, shocks and bleeds end it sooner again). */
function season(): string {
  let trace = '';
  for (let g = 0; g < 9; g++) {
    const seed = 900 + g;
    const b = startBattle(seed, ['orcs', 'skeletons', 'mixed'][g % 3], { foes: { hp: 100, atk: 1.6 } });
    const spots = deploySpots(b, new Rng(mixSeed(seed, 0xba1a)));
    ALL_HEROES.slice(g * 5, g * 5 + 5).forEach((id, i) => place(b, id, spots[i][0], spots[i][1], undefined, { ...gradeBoost(1, 0, ULT_LEVEL), charge2: 60 }));
    fight(b);
    const seen = new Set<string>();
    while (b.phase === 'fight') for (const e of stepBattle(b)) if (e.kind === 'skill') seen.add(e.name);
    trace += `${b.phase}@${b.t}:${[...seen].sort().join(',')}|`;
  }
  return trace;
}

test('every hero fights with its whole kit open, and the fights are deterministic', () => {
  const first = season();
  assert.equal(season(), first);
  // (most heroes cast both skills in a long fight)
  let both = 0;
  for (const h of ALL_HEROES) {
    const k = HERO_KITS()[h];
    if (first.includes(keyOf(k.s1.skill)) && first.includes(keyOf(k.s2.skill))) both++;
  }
  const missing = ALL_HEROES.filter((h) => !(first.includes(keyOf(HERO_KITS()[h].s1.skill)) && first.includes(keyOf(HERO_KITS()[h].s2.skill))));
  assert.ok(both >= 35, `${both} of 45 heroes cast both skills; not: ${missing.join(' ')} | ${first}`);
});

test('skill 2 is never cast below its level', () => {
  const b = startBattle(4, 'orcs', { foes: { hp: 3, atk: 1.5 } });
  const spots = deploySpots(b, new Rng(mixSeed(4, 0xba1a)));
  ALL_HEROES.slice(0, 5).forEach((id, i) => place(b, id, spots[i][0], spots[i][1], undefined, gradeBoost(1, 0, SKILL2_LEVEL - 1)));
  fight(b);
  const second = new Set(ALL_HEROES.slice(0, 5).map((h) => keyOf(HERO_KITS()[h].s2.skill)));
  while (b.phase === 'fight') for (const e of stepBattle(b)) assert.ok(!(e.kind === 'skill' && second.has(e.name) && heroKitOf(b.units.find((u) => u.id === e.by)!)), e.kind === 'skill' ? e.name : '');
});

test('every readiness look names a real skill 2 or 3 (the third skills\' utilities, the skills overhaul\'s batch 4)', async () => {
  const { SKILL2_WHEN } = await import('../src/sim/kits/when');
  const second = new Set(ALL_HEROES.flatMap((h) => HERO_KITS()[h].slots.slice(1).map((s) => keyOf(s.skill))));
  // (the lost techniques are in no kit: a book puts one in a slot, `kits/lost.ts`)
  const { LOST } = await import('../src/sim/kits/lost');
  for (const d of Object.values(LOST)) second.add(keyOf(d.skill));
  for (const name of Object.keys(SKILL2_WHEN)) assert.ok(second.has(name), name);
});

test('two vowed Paladins side by side do not pass one blow back and forth', () => {
  const b = startBattle(7);
  bareBoard(b);
  b.units = [];
  b.phase = 'fight';
  b.kits = { vows: true };
  const p1 = addUnit(b, 'paladin', 3, 6, { level: SKILL2_LEVEL });
  const p2 = addUnit(b, 'paladin', 4, 6, { level: SKILL2_LEVEL });
  const foe = addUnit(b, 'skeleton', 3, 5);
  p1.kx = { vow: 1e9 };
  p2.kx = { vow: 1e9 };
  const out: BattleEvent[] = [];
  hurt(b, foe, p1, 100, false, false, out, 'skill');
  assert.ok(p1.hp < p1.maxHp && p2.hp < p2.maxHp, 'the blow is shared once');
});
