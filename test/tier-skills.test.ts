import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startBattle, addUnit, stepBattle, fight, type Battle, type BattleEvent, type Unit } from '../src/sim/battle';
import { KITS, CHARGE_MAX, tryCast } from '../src/sim/abilities';
import { MISSING_TIERS, TIER_SKILLS, TOP_TIER, runRiders, tierSkillOf, type TierSkill } from '../src/sim/tierSkills';
import { TAL_KEYS } from '../src/sim/talents';
import { ailmentsOf, stunFor } from '../src/sim/ailments';
import { hashSeed } from '../src/sim/rng';
import { ALL_HEROES, UNITS } from '../src/sim/units';
import { gradeBoost } from '../src/sim/run';

// A hero of `kind` at `grade` on the heroes' rows, with skeletons on the far rows.
function arena(kind: string, grade: number, u = 3, v = 8): { b: Battle; me: Unit } {
  const b = startBattle(7, 'skeletons');
  const me = addUnit(b, kind, u, v, gradeBoost(grade, 0, 1));
  return { b, me };
}

test('every hero has a tier 2, a tier 3 and a tier 4 skill, each with a name and a plain-English line', () => {
  assert.deepEqual(MISSING_TIERS(), []);
  for (const k of ALL_HEROES) {
    const [a, c, d] = TIER_SKILLS[k];
    for (const s of [a, c, d]) {
      assert.ok(s.name.length > 2 && s.text.length > 10, k);
      assert.ok(Object.keys(s.mods ?? {}).length + (s.riders?.length ?? 0) > 0, `${k}: ${s.name} changes something`);
    }
    assert.equal(new Set([a.name, c.name, d.name]).size, 3, k);
  }
  // (the tier 4 names are the heroes' own: no two alike)
  assert.equal(new Set(ALL_HEROES.map((k) => TIER_SKILLS[k][2].name)).size, ALL_HEROES.length);
});

test('every tier 4 skill\'s modifiers are talent keys and its riders are sound', () => {
  for (const k of ALL_HEROES) {
    const d = TIER_SKILLS[k][2];
    for (const [m, v] of Object.entries(d.mods ?? {})) {
      assert.ok(m in TAL_KEYS, `${k}: ${m} is a talent key`);
      assert.ok(Number.isFinite(v) && v > 0, `${k}: ${m}`);
    }
    for (const r of d.riders ?? []) {
      if (r.kind === 'echo') assert.ok(r.ms > 0 && r.share > 0 && r.share <= 1, `${k}: echo`);
      else if (r.kind === 'summon') assert.ok(UNITS[r.unit]?.summon && r.n > 0, `${k}: summon ${r.unit}`);
      else if (r.kind === 'nova' || r.kind === 'mend') assert.ok(r.reach >= 0 && r.mult > 0, `${k}: ${r.kind}`);
      else if (r.kind === 'haste') assert.ok(r.reach >= 0 && r.ms > 0, `${k}: haste`);
      else if (r.kind === 'ward') assert.ok(r.reach >= 0 && r.share > 0 && r.share < 0.1, `${k}: ward`);
      else if (r.kind === 'charge') assert.ok(r.reach >= 0 && r.amount > 0, `${k}: charge`);
      else if (r.kind === 'cleanse') assert.ok(r.reach >= 0, `${k}: cleanse`);
      else assert.fail(`${k}: an unknown rider`);
    }
  }
});

test('every tier 4 skill is a step past its tier 3: no modifier lower, no rider lost, and something more', () => {
  const weaker: string[] = [];
  for (const k of ALL_HEROES) {
    const [, c, d] = TIER_SKILLS[k];
    for (const [m, v] of Object.entries(c.mods ?? {})) if ((d.mods?.[m] ?? 0) < v) weaker.push(`${k}: ${m}`);
    for (const r of c.riders ?? []) if (!(d.riders ?? []).some((x) => x.kind === r.kind)) weaker.push(`${k}: its ${r.kind}`);
    const more = Object.entries(d.mods ?? {}).some(([m, v]) => v > (c.mods?.[m] ?? 0)) || (d.riders?.length ?? 0) > (c.riders?.length ?? 0);
    assert.ok(more, `${k}: tier 4 adds something`);
  }
  assert.deepEqual(weaker, []);
});

test('a hero at grade 1 has no tier skill, grade 2 its tier 2 and grade 3 its tier 3', () => {
  assert.equal(tierSkillOf('archer', 1), undefined);
  assert.equal(tierSkillOf('archer', 2)?.name, TIER_SKILLS.archer[0].name);
  assert.equal(tierSkillOf('archer', 3)?.name, TIER_SKILLS.archer[1].name);
  assert.equal(tierSkillOf('wolf', 3), undefined);
});

test('a grade 4 hero takes its tier 4 skill, and so does any higher grade (the lookup reads the grade itself)', () => {
  assert.equal(TOP_TIER, 4);
  assert.equal(tierSkillOf('archer', 4)?.name, TIER_SKILLS.archer[2].name);
  assert.equal(tierSkillOf('archer', 5)?.name, TIER_SKILLS.archer[2].name);
  assert.equal(tierSkillOf('wolf', 4), undefined);
  const b = startBattle(7, 'skeletons');
  const a = addUnit(b, 'archer', 3, 8, { grade: 4 });
  assert.deepEqual(a.eq!.tal, TIER_SKILLS.archer[2].mods, 'its talents are the tier 4 skill\'s');
});

test('a grade 4 Samurai casts its tier 4 skill: two echoes follow the cut, where tier 3 has one', () => {
  for (const [grade, n] of [[3, 1], [4, 2]] as const) {
    const b = startBattle(11, 'skeletons');
    const me = addUnit(b, 'samurai', 3, 3, gradeBoost(grade, 0, 1));
    const foe = b.units.find((x) => x.side === 'foe')!;
    foe.u = 3;
    foe.v = 2;
    foe.hp = foe.maxHp = 50000;
    fight(b);
    me.charge = CHARGE_MAX;
    const events: BattleEvent[] = [];
    assert.ok(tryCast(b, me, events));
    assert.equal(b.pending.filter((p) => p.kind === 'echo' && p.by === me.id).length, n, `grade ${grade}`);
    let skills = 0;
    for (let i = 0; i < 30 && b.phase === 'fight'; i++) for (const e of stepBattle(b)) if (e.kind === 'skill' && e.by === me.id) skills++;
    assert.ok(skills >= n, `grade ${grade}: the echoes went off`);
  }
});

test('a tier 4 cleanse frees the allies of their ailments; tier 3 does not', () => {
  for (const [grade, freed] of [[3, false], [4, true]] as const) {
    const b = startBattle(5, 'skeletons');
    const me = addUnit(b, 'priestess', 3, 8, gradeBoost(grade, 0, 1));
    const friend = addUnit(b, 'knight', 4, 8, gradeBoost(1, 0, 1));
    fight(b);
    stunFor(b, friend, 3000);
    assert.ok(ailmentsOf(friend).length > 0);
    runRiders(b, me, [], () => {});
    assert.equal(ailmentsOf(friend).length === 0, freed, `grade ${grade}`);
  }
});

test('a grade 3 fight is the same whatever the tier 4 skills say', () => {
  // (the hash of every event of nine fights, grade 3 heroes at level 1 and at level 30, as the tier 4 entries stand and with each swapped for a
  //  wild one: the same both ways. Checked by hand against main before tier 4 was added: the same hashes.)
  const hashOf = (): string => {
    let all = '';
    for (const level of [1, 30])
      for (let f = 0; f < 9; f++) {
        const b = startBattle(300 + f, 'skeletons');
        for (let i = 0; i < 5; i++) addUnit(b, ALL_HEROES[(f * 5 + i) % ALL_HEROES.length], 1 + i, 8 + (i % 2), gradeBoost(3, 0, level));
        fight(b);
        let s = '';
        while (b.phase === 'fight') s += JSON.stringify(stepBattle(b));
        all += `${hashSeed(s).toString(16)}:${b.phase},`;
      }
    return all;
  };
  const before = hashOf();
  const table = TIER_SKILLS as unknown as Record<string, TierSkill[]>;
  const kept = ALL_HEROES.map((k) => table[k][2]);
  try {
    for (const k of ALL_HEROES) table[k][2] = { name: 'Wild', text: 'A test\'s stand-in', mods: { pow: 5, extra: 4, reach: 3 }, riders: [{ kind: 'nova', reach: 9, mult: 9, stun: 2000 }, { kind: 'echo', ms: 300, share: 1 }] };
    assert.equal(hashOf(), before);
  } finally {
    ALL_HEROES.forEach((k, i) => (table[k][2] = kept[i]));
  }
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

test('a tier 3 Beastmaster calls a wolf and a great dire wolf at a cast', () => {
  const { b, me } = arena('beastmaster', 3);
  fight(b);
  me.charge = CHARGE_MAX;
  const out: BattleEvent[] = [];
  assert.ok(tryCast(b, me, out));
  const mine = b.units.filter((x) => x.alive && x.owner === me.id);
  assert.equal(mine.filter((x) => x.def === 'wolf').length, 1);
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

test('promoting a hero in a fight swaps its tier skill and sends a promote event; a lower or equal grade does nothing', async () => {
  const { promoteUnit } = await import('../src/sim/tierSkills');
  const b = startBattle(7, 'skeletons');
  const a = addUnit(b, 'archer', 3, 8, gradeBoost(2, 0, 1));
  assert.equal(a.eq!.tal!.extra, 1);
  const out: BattleEvent[] = [];
  assert.equal(promoteUnit(a, 2, out), false);
  assert.equal(promoteUnit(a, 3, out), true);
  assert.equal(a.grade, 3);
  assert.equal(a.eq!.tal!.extra, 2, 'tier 3\'s two extras replace tier 2\'s one');
  assert.deepEqual(out, [{ kind: 'promote', to: a.id, grade: 3 }]);
  const plain = addUnit(b, 'archer', 4, 8, {});
  assert.equal(promoteUnit(plain, 2, []), true);
  assert.equal(plain.eq!.tal!.extra, 1);
  const foe = b.units.find((x) => x.side === 'foe')!;
  assert.equal(promoteUnit(foe, 3, []), false, 'a foe is never promoted');
});
