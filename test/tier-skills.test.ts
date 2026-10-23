import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startBattle, addUnit, stepBattle, fight, type Battle, type BattleEvent, type Unit } from '../src/sim/battle';
import { KITS, CHARGE_MAX, tryCast } from '../src/sim/abilities';
import { MISSING_TIERS, TIER_SKILLS, tierSkillOf } from '../src/sim/tierSkills';
import { ALL_HEROES, UNITS } from '../src/sim/units';
import { gradeBoost } from '../src/sim/run';

// A hero of `kind` at `grade` on the heroes' rows, with skeletons on the far rows.
function arena(kind: string, grade: number, u = 3, v = 8): { b: Battle; me: Unit } {
  const b = startBattle(7, 'skeletons');
  const me = addUnit(b, kind, u, v, gradeBoost(grade, 0, 1));
  return { b, me };
}

test('every hero has a tier 2 and a tier 3 skill, each with a name and a plain-English line', () => {
  assert.deepEqual(MISSING_TIERS(), []);
  for (const k of ALL_HEROES) {
    const [a, c] = TIER_SKILLS[k];
    for (const s of [a, c]) {
      assert.ok(s.name.length > 2 && s.text.length > 10, k);
      assert.ok(Object.keys(s.mods ?? {}).length + (s.riders?.length ?? 0) > 0, `${k}: ${s.name} changes something`);
    }
    assert.notEqual(a.name, c.name, k);
  }
});

test('a hero at grade 1 has no tier skill, grade 2 its tier 2 and grade 3 its tier 3', () => {
  assert.equal(tierSkillOf('archer', 1), undefined);
  assert.equal(tierSkillOf('archer', 2)?.name, TIER_SKILLS.archer[0].name);
  assert.equal(tierSkillOf('archer', 3)?.name, TIER_SKILLS.archer[1].name);
  assert.equal(tierSkillOf('wolf', 3), undefined);
});

test('a merged hero takes its tier skill\'s modifiers into its talents, without touching the shared equipment', () => {
  const b = startBattle(7, 'skeletons');
  const equip = { hp: 0, atk: 0, def: 0, atkSpeed: 0, moveSpeed: 0, crit: 0, range: 0, dodge: 0, charge: 0, regen: 0, resist: 0, abilities: [], tal: { extra: 1 } };
  const a = addUnit(b, 'archer', 3, 8, { grade: 3, equip });
  assert.equal(a.eq!.tal!.extra, 3, 'the equipment\'s one extra plus the tier 3 skill\'s two');
  assert.equal(equip.tal.extra, 1, 'the equipment object is a copy');
  const plain = addUnit(b, 'archer', 4, 8, {});
  assert.equal(plain.eq, undefined);
});

test('a tier 3 Beastmaster calls up three wolves at a cast, one of them a dire wolf', () => {
  const { b, me } = arena('beastmaster', 3);
  fight(b);
  me.charge = CHARGE_MAX;
  const out: BattleEvent[] = [];
  assert.ok(tryCast(b, me, out));
  const mine = b.units.filter((x) => x.alive && x.owner === me.id);
  assert.equal(mine.filter((x) => x.def === 'wolf').length, 2);
  assert.equal(mine.filter((x) => x.def === 'direWolf').length, 1);
  assert.equal(UNITS.wolf.sheet, 'wolf_grey');
});

test('a tier 2 Beastmaster calls up two wolves at a cast; a plain one calls one', () => {
  for (const [grade, n] of [[1, 1], [2, 2]] as const) {
    const { b, me } = arena('beastmaster', grade);
    fight(b);
    me.charge = CHARGE_MAX;
    assert.ok(tryCast(b, me, []));
    assert.equal(b.units.filter((x) => x.alive && x.def === 'wolf' && x.owner === me.id).length, n, `grade ${grade}`);
  }
});

test('a tier 3 Samurai\'s cut echoes: a second skill event follows a moment later', () => {
  const b = startBattle(11, 'skeletons');
  const me = addUnit(b, 'samurai', 3, 3, gradeBoost(3, 0, 1));
  const foe = b.units.find((x) => x.side === 'foe')!;
  foe.u = 3;
  foe.v = 2;
  foe.hp = foe.maxHp = 5000;
  fight(b);
  me.charge = CHARGE_MAX;
  const events: BattleEvent[] = [];
  assert.ok(tryCast(b, me, events));
  assert.equal(events.filter((e) => e.kind === 'skill').length, 1);
  assert.equal(b.pending.filter((p) => p.kind === 'echo').length, 1);
  let echoes = 0;
  for (let i = 0; i < 20 && b.phase === 'fight'; i++) for (const e of stepBattle(b)) if (e.kind === 'skill' && e.by === me.id) echoes++;
  assert.ok(echoes >= 1, 'the echo went off');
});

test('a tier 3 Knight\'s Fortress slams the ground round him: a burst, and foes near are hurt', () => {
  const b = startBattle(13, 'skeletons');
  const me = addUnit(b, 'knight', 3, 4, gradeBoost(3, 0, 1));
  const foe = b.units.find((x) => x.side === 'foe')!;
  foe.u = 3;
  foe.v = 3;
  fight(b);
  me.charge = CHARGE_MAX;
  const events: BattleEvent[] = [];
  const before = foe.hp;
  assert.ok(tryCast(b, me, events));
  assert.ok(events.some((e) => e.kind === 'burst' && e.by === me.id));
  assert.ok(foe.hp < before);
  assert.ok((foe.stunUntil ?? 0) > b.t);
});

test('the tier skills are deterministic: the same fight twice gives the same result', () => {
  const play = () => {
    const b = startBattle(21, 'skeletons');
    ['knight', 'archer', 'wizard', 'cleric', 'beastmaster'].forEach((k, i) => addUnit(b, k, 1 + i, 8, gradeBoost(3, 0, 1)));
    fight(b);
    while (b.phase === 'fight') stepBattle(b);
    return [b.phase, b.t, b.units.map((u) => u.hp).join(',')].join('|');
  };
  assert.equal(play(), play());
});

test('every hero\'s kit exists for its tier skill', () => {
  for (const k of ALL_HEROES) assert.ok(KITS[k], k);
});
