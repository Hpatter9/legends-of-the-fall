// Skill levels by use (the skills overhaul's batch 5, docs/notes/skills-overhaul-design.md section 5, docs/notes/skills-5.md): the points a fight
// earns (casts and fielding, auto-replay half), the five levels and what each does in a fight, the Level 5 steps, the Last Stand's tally, the
// spire and the Calamity fighting at Level 1, and a save's points read sanely. That a Level 1 fight plays exactly as before is the identity
// fixtures' (`spells-identity.test.ts`, not re-recorded by this batch).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bareBoard } from './bare';
import { addUnit, fight, place, startBattle, stepBattle, type Battle, type Unit } from '../src/sim/battle';
import { keyOf, tal } from '../src/sim/abilities';
import { HERO_KITS, castHero, heroKitOf, SKILL2_LEVEL, SKILL3_LEVEL } from '../src/sim/heroKits';
import {
  AUTO_SHARE, castModsOf, castPoints, CONJURE_TREANT, FIELD_POINTS, fightLevels, fightUse, LEVEL_STEPS, levelLine, levelOfUse, levelUpWords, MAX_USE, readSkillUse,
  settleSkillUse, slotKeysOf, SUMMON_BEAST, USE_AT, useOf, useShare,
} from '../src/sim/skillLevels';
import { LV5 } from '../src/sim/kits/lv5';
import { lv5Table } from '../tools/skills/lv5';
import { gradeBoost, boostOf } from '../src/sim/run';
import { heroStats } from '../src/sim/talents';
import { localBoost } from '../src/sim/climb';
import { newMeta } from '../src/sim/meta';
import { newCastle } from '../src/sim/castle';
import { ARMIES } from '../src/sim/armies';
import { newStandRun, startFirstWave, startStand, stepStand, type Stand } from '../src/sim/stand';
import { ALL_HEROES } from '../src/sim/units';
import { SAVES } from '../src/sim/saves';
import { REST } from '../src/sim/statRest';

function arena(): Battle {
  const b = startBattle(3);
  bareBoard(b);
  b.units = [];
  b.phase = 'fight';
  b.kits = {};
  b.t = 10000;
  return b;
}
const owned = (kinds: string[]) => {
  const m = newMeta(1);
  m.unlocked = [...kinds];
  return m;
};

test('five levels at 200, 600, 1,500 and 3,500 points; the words say where a skill stands', () => {
  assert.deepEqual(USE_AT, [0, 200, 600, 1500, 3500]);
  assert.deepEqual([0, 199, 200, 599, 600, 1499, 1500, 3499, 3500, 9999].map(levelOfUse), [1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
  assert.equal(levelLine(812), 'Level 3 · 812 of 1,500 to Level 4');
  assert.equal(levelLine(3500), 'Level 5 · Mastered');
  assert.deepEqual(levelUpWords([{ kind: 'knight', key: keyOf(HERO_KITS().knight.s1.skill), level: 3 }]), [`${HERO_KITS().knight.s1.skill.name} reached Level 3!`]);
});

test('a cast earns its cooldown in whole seconds; a wave fought gives each open skill 2; auto-replay half', () => {
  assert.equal(castPoints(3000), 3);
  assert.equal(castPoints(16000), 16);
  assert.equal(castPoints(3500), 4);
  // (a fight of a level-10 knight: his casts and the wave's 2 for each of his two open skills)
  const b = startBattle(11, undefined, undefined);
  place(b, 'knight', 3, b.board.d - 1, undefined, gradeBoost(1, 0, SKILL2_LEVEL));
  fight(b);
  const casts = [0, 0, 0];
  const hk = HERO_KITS().knight;
  for (let i = 0; i < 4000 && b.phase === 'fight'; i++)
    for (const e of stepBattle(b)) if (e.kind === 'skill' && b.units.find((x) => x.id === e.by)?.def === 'knight') casts[hk.slots.findIndex((s) => keyOf(s.skill) === e.name)]++;
  const gain = fightUse(b).knight;
  const want = (n: number) => casts[n] * castPoints(hk.slots[n].cd) + FIELD_POINTS;
  assert.equal(gain[keyOf(hk.s1.skill)], want(0), 'skill 1: its casts and the wave');
  assert.equal(gain[keyOf(hk.s2.skill)], want(1), 'skill 2: open at level 10');
  assert.equal(gain[keyOf(hk.s3!.skill)], undefined, 'skill 3 is shut below level 20 and earns nothing');
  assert.equal(fightUse(b, ['archer']).knight, undefined, 'a kind the save does not have (a guest) is left out');
  // (into a save: in full, then half under auto-replay, rounded down)
  const m = owned(['knight']);
  settleSkillUse(m, { knight: gain });
  assert.equal(useOf(m, 'knight', keyOf(hk.s1.skill)), want(0));
  settleSkillUse(m, { knight: gain }, AUTO_SHARE);
  assert.equal(useOf(m, 'knight', keyOf(hk.s1.skill)), want(0) + Math.floor(want(0) * AUTO_SHARE));
});

test('points stop at 3,500 (Level 5); each new level is told once', () => {
  const m = owned(['archer']);
  const key = keyOf(HERO_KITS().archer.s1.skill);
  assert.deepEqual(settleSkillUse(m, { archer: { [key]: 199 } }), []);
  assert.deepEqual(settleSkillUse(m, { archer: { [key]: 1 } }), [{ kind: 'archer', key, level: 2 }]);
  assert.deepEqual(settleSkillUse(m, { archer: { [key]: 5000 } }), [{ kind: 'archer', key, level: 5 }]);
  assert.equal(useOf(m, 'archer', key), MAX_USE);
  assert.deepEqual(settleSkillUse(m, { archer: { [key]: 50 } }), [], 'nothing past the top');
  assert.deepEqual(settleSkillUse(m, { archer: { 'Not a skill': 50 }, nobody: { [key]: 50 } }), [], 'unknown keys and kinds are not counted');
});

test('a learned skill levels under its own key for the kind that learned it, in whichever slot it sits', () => {
  const m = owned(['samurai']);
  const ww = keyOf(HERO_KITS().barbarian.s1.skill);
  m.learned = { samurai: ['whirlingStep'] };
  m.loadout = { samurai: ['own1', 'whirlingStep'] };
  const keys = slotKeysOf(m, 'samurai');
  assert.equal(keys[1], ww, 'Whirlwind sits in his slot 2');
  m.skillUse = { samurai: { [ww]: 600 } };
  assert.deepEqual(fightLevels(m, 'samurai'), keys.map((k) => (k === ww ? 3 : 1)));
  assert.equal(useOf(m, 'barbarian', ww), 0, "the Barbarian's own Whirlwind keeps its own level");
});

test("each level's numbers: stronger, then cheaper from Level 3, then quicker and longer from Level 4", () => {
  const base = HERO_KITS().knight;
  for (let lv = 1; lv <= 5; lv++) {
    const b = arena();
    const u = addUnit(b, 'knight', 3, 7, { level: SKILL3_LEVEL, skillLv: [lv, lv, lv] });
    const hk = heroKitOf(u)!;
    const st = LEVEL_STEPS[lv - 1];
    hk.slots.forEach((s, i) => {
      const was = base.slots[i];
      const pow = st.pow + (lv === 5 && LV5[keyOf(s.skill)] === 'pow' ? 0.08 : 0);
      assert.ok(Math.abs(s.tune - was.tune * pow) < 1e-9, `level ${lv} strength`);
      assert.equal(s.cost, Math.round(was.cost * st.cost * 10) / 10, `level ${lv} cost`);
      assert.equal(s.cd, Math.round(was.cd * st.cd), `level ${lv} cooldown`);
    });
    if (lv === 1) assert.equal(hk, base, 'Level 1 is the kit itself');
  }
  assert.deepEqual([1, 2, 3, 4, 5].map((lv) => LEVEL_STEPS[lv - 1].pow), [1, 1.08, 1.15, 1.22, 1.3]);
  assert.deepEqual([1, 2, 3, 4, 5].map((lv) => LEVEL_STEPS[lv - 1].cost), [1, 1, 0.9, 0.9, 0.85]);
  assert.deepEqual([1, 2, 3, 4, 5].map((lv) => LEVEL_STEPS[lv - 1].cd), [1, 1, 1, 0.9, 0.85]);
});

test('a levelled skill lengthens its durations and takes its Level 5 step only while it is cast', () => {
  const durKey = Object.keys(LV5).find((k) => LV5[k] === 'dur')!;
  const reachKey = Object.keys(LV5).find((k) => LV5[k] === 'reach')!;
  const extraKey = Object.keys(LV5).find((k) => LV5[k] === 'extra' && k !== SUMMON_BEAST)!;
  assert.equal(castModsOf(durKey, 3), undefined);
  assert.deepEqual(castModsOf(durKey, 4), { dur: 0.15 });
  assert.deepEqual(castModsOf(durKey, 5), { dur: 0.4 });
  assert.deepEqual(castModsOf(reachKey, 5), { dur: 0.25, reach: 1 });
  assert.deepEqual(castModsOf(extraKey, 5), { dur: 0.25, extra: 1 });
  assert.deepEqual(castModsOf(SUMMON_BEAST, 3), { extra: 1 }, 'Summon Beast: three wolves from Level 3');
  assert.deepEqual(castModsOf(SUMMON_BEAST, 5), { dur: 0.25, extra: 1, dire: 1 }, 'and a dire wolf at Level 5');
  assert.equal(LV5[CONJURE_TREANT], 'extra', 'Conjure Treant: a second treant at Level 5');
  // (the hero's talents are as they were once the cast is over)
  const b = arena();
  const me = addUnit(b, 'knight', 3, 7, { level: SKILL3_LEVEL, skillLv: [5, 5, 5] });
  const f = addUnit(b, 'orcGrunt', 3, 6);
  f.maxHp = f.hp = 50000;
  me.charge = 100;
  castHero(b, me, heroKitOf(me)!, []);
  assert.equal(me.castMods, undefined);
  assert.equal(tal(me, 'dur'), 0);
});

test('Summon Beast at Level 3 lets a third wolf stand, and at Level 5 a dire wolf answers beside the wolf', () => {
  const wolves = (lv: number) => {
    const b = arena();
    const me = addUnit(b, 'beastmaster', 3, 8, { level: 1, skillLv: [lv, lv, lv] });
    const f = addUnit(b, 'orcGrunt', 3, 2);
    f.maxHp = f.hp = 50000;
    const slot = heroKitOf(me)!.slots.find((s) => keyOf(s.skill) === SUMMON_BEAST)!;
    for (let i = 0; i < 5; i++) {
      me.castMods = slot.mods;
      slot.skill.cast(b, me, []);
      delete me.castMods;
    }
    const mine = b.units.filter((x) => x.alive && x.owner === me.id);
    return { wolf: mine.filter((x) => x.def === 'wolf').length, dire: mine.filter((x) => x.def === 'direWolf').length };
  };
  assert.deepEqual(wolves(1), { wolf: 2, dire: 0 });
  assert.deepEqual(wolves(3), { wolf: 3, dire: 0 });
  assert.deepEqual(wolves(5), { wolf: 3, dire: 1 });
});

test('a Level 5 skill wins more of the same fight than a Level 1 one', () => {
  // (the same hero, the same seeded foes: its blows are its own; only its skills' level differs)
  let lo = 0;
  let hi = 0;
  for (let seed = 1; seed <= 6; seed++)
    for (const lv of [1, 5]) {
      const b = startBattle(seed);
      place(b, 'barbarian', 3, b.board.d - 1, undefined, { ...gradeBoost(1, 0, SKILL3_LEVEL), skillLv: [lv, lv, lv] });
      fight(b);
      let dealt = 0;
      for (let i = 0; i < 3000 && b.phase === 'fight'; i++) for (const e of stepBattle(b)) if (e.kind === 'hit' && b.units.find((x) => x.id === e.by)?.side === 'hero') dealt += e.dmg;
      if (lv === 1) lo += dealt;
      else hi += dealt;
    }
  assert.ok(hi > lo, `Level 5 dealt more (${hi} against ${lo})`);
});

test('the levels reach the fight from the save, but not in the spire or the Calamity, whose heroes start bare', () => {
  const m = owned(['knight']);
  m.xp = { knight: 0 };
  const k1 = keyOf(HERO_KITS().knight.s1.skill);
  assert.equal(heroStats(m, 'knight')?.skillLv, undefined, 'no use, no levels: a fresh save fights as before (no head start)');
  m.skillUse = { knight: { [k1]: 1500 } };
  assert.deepEqual(heroStats(m, 'knight')?.skillLv, [4, 1, 1]);
  const b = arena();
  const own = addUnit(b, 'knight', 3, 7, boostOf({ id: 1, kind: 'knight', grade: 1 }, 0, 1, heroStats(m, 'knight')));
  assert.equal(heroKitOf(own)!.s1.lv, 4, 'an army, the daily, a quest or the Stand: Level 4');
  const spire = addUnit(b, 'knight', 4, 7, localBoost({ id: 2, kind: 'knight', grade: 1 }));
  assert.equal(spire.skillLv, undefined);
  assert.equal(heroKitOf(spire), HERO_KITS().knight, 'the spire and the Calamity: the base kit, Level 1');
});

test("the Last Stand tallies each wave's use on the run, to count it when the run ends", () => {
  const eight = ['knight', 'paladin', 'samurai', 'kunoichi', 'archer', 'ranger', 'wizard', 'cleric'];
  const s: Stand = startStand(newStandRun(5, eight, ARMIES.map((a) => a.id)), { boost: () => gradeBoost(1, 0, SKILL2_LEVEL), castle: newCastle() });
  startFirstWave(s);
  for (let i = 0; i < 20000 && s.run.wave < 2 && s.phase !== 'over'; i++) stepStand(s);
  assert.ok(s.run.wave >= 2, 'the first wave was cleared');
  const use = s.run.use!;
  for (const k of eight.filter((k) => s.b.units.some((u) => u.def === k && u.tag !== undefined))) {
    const hk = HERO_KITS()[k];
    assert.ok((use[k]?.[keyOf(hk.s1.skill)] ?? 0) >= FIELD_POINTS, `${k}: skill 1 counted`);
    assert.ok((use[k]?.[keyOf(hk.s2.skill)] ?? 0) >= FIELD_POINTS, `${k}: skill 2 (open at 10) counted`);
  }
  assert.ok(s.b.units.every((u) => !u.usePts), 'the casts were taken off the fighters: the next wave counts from nothing');
});

test('every skill has its Level 5 step, as the probe of its cast finds it', (t) => {
  // (it stages the skill's written numbers: the saving throws, STATS batch 5, are held off for it and staged in `test/stats-saves.test.ts`)
  SAVES.on = false;
  // (and the pools and cooldowns by score, STATS batch 6, staged in `stats-rest`)
  REST.pools = REST.cooldown = false;
  t.after(() => void (SAVES.on = REST.pools = REST.cooldown = true));
  const probe = lv5Table();
  const keys = ALL_HEROES.flatMap((k) => HERO_KITS()[k]?.slots.map((s) => keyOf(s.skill)) ?? []);
  for (const k of keys) assert.ok(LV5[k], `${k} has a step`);
  assert.deepEqual(LV5, probe, 'src/sim/kits/lv5.ts is the probe written out (node tools/skills/lv5.mjs --write)');
});

test('saved points that are nonsense are dropped', () => {
  const m = owned(['knight']);
  const k1 = keyOf(HERO_KITS().knight.s1.skill);
  (m as { skillUse?: unknown }).skillUse = { knight: { [k1]: 812.7, 'No Such Skill': 50, [keyOf(HERO_KITS().knight.s2.skill)]: -4 }, nobody: { [k1]: 50 }, archer: { [k1]: 9999 } };
  readSkillUse(m);
  assert.deepEqual(m.skillUse, { knight: { [k1]: 812 } });
  (m as { skillUse?: unknown }).skillUse = 'junk';
  readSkillUse(m);
  assert.equal(m.skillUse, undefined);
});

test("a hero's own boost of Level 1 skills changes nothing on the fighter", () => {
  const b = arena();
  const u: Unit = addUnit(b, 'archer', 3, 7, { level: 30, skillLv: [1, 1, 1] });
  assert.equal(u.skillLv, undefined);
  assert.equal(heroKitOf(u), HERO_KITS().archer);
  assert.ok(SKILL3_LEVEL > SKILL2_LEVEL);
});

test('the owner\'s answers: a practice replay counts nothing, auto-replay half, every other mode in full (the spire and the Calamity too)', () => {
  assert.equal(useShare({ kind: 'daily', practice: true }, false), 0);
  assert.equal(useShare({ kind: 'quest', practice: true }, false), 0);
  assert.equal(useShare({ kind: 'daily', practice: false }, false), 0, 'only army runs count (the owner\'s answer)');
  assert.equal(useShare({ kind: 'quest' }, false), 0);
  assert.equal(useShare({ kind: 'army' }, true), AUTO_SHARE);
  assert.equal(useShare({ kind: 'army' }, false), 1);
  assert.equal(useShare({ kind: 'tower' }, false), 0);
  assert.equal(useShare({ kind: 'calamity' }, false), 0, 'the Calamity is a separate game (the owner\'s later answer)');
  assert.equal(useShare(undefined, false), 1);
});

test('a fight built at Level 1 still earns use toward the lasting levels when it is an army run', () => {
  const m = owned(['knight']);
  const k1 = keyOf(HERO_KITS().knight.s1.skill);
  m.skillUse = { knight: { [k1]: 1500 } };
  const b = startBattle(11);
  place(b, 'knight', 3, b.board.d - 1, 300, localBoost({ id: 300, kind: 'knight', grade: 1 }));
  const u = b.units.find((x) => x.def === 'knight')!;
  assert.equal(heroKitOf(u), HERO_KITS().knight, 'Level 1 in the fight');
  fight(b);
  for (let i = 0; i < 4000 && b.phase === 'fight'; i++) stepBattle(b);
  const gain = fightUse(b, m.unlocked);
  assert.ok((gain.knight?.[k1] ?? 0) >= FIELD_POINTS, 'its casts and the wave counted');
  settleSkillUse(m, gain, useShare({ kind: 'army' }, false));
  assert.equal(useOf(m, 'knight', k1), 1500 + gain.knight[k1], 'into the lasting points');
});
