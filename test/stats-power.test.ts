import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addUnit, atkOf, startBattle } from '../src/sim/battle';
import { itemStats } from '../src/sim/equipment';
import { lastingBoost } from '../src/sim/levels';
import { powerOf } from '../src/sim/power';
import { gradeBoost } from '../src/sim/run';
import { fightScores, ownMults, skillShare, skillStatOf, statMults, trimOf } from '../src/sim/statPower';
import { derivedOf, STAT_PROFILES } from '../src/sim/stats';
import { TREES } from '../src/sim/talents';
import { ALL_HEROES, UNITS } from '../src/sim/units';

// STATS batch 2 (docs/notes/stats-2.md; the design is docs/notes/rpg-stats-design.md, sections 5 to 7 and 14): the scores move a fight. Health
// grows with CON, blows with the blow ability and each skill with its own ability; the level curve gives back what the scores add on average;
// ranks, grades and awakening give score steps, and the talents' stat nodes and gear give score points.

test("a level-8 Barbarian's STR is 20, and its blows carry +10% of its body attack more than at level 1", () => {
  const p = STAT_PROFILES.barbarian;
  assert.equal(fightScores('barbarian', { level: 8 })!.str, 20);
  assert.equal(fightScores('barbarian', { level: 1 })!.str, 17);
  // (+5 against +3: the body attack times 1.25 in place of 1.15)
  assert.ok(Math.abs(derivedOf(p, { level: 8 }).atkMult - derivedOf(p).atkMult - 0.1) < 1e-9);
  assert.ok(Math.abs(ownMults(p, { level: 8 }).blow - 1.25 / 1.15) < 1e-9);
  // (and in a fight: its attack is the curve's, times its own share over the roster's mean share at level 8)
  const b = startBattle(1);
  const u = addUnit(b, 'barbarian', 2, 9, gradeBoost(1, 0, 8));
  const want = UNITS.barbarian.atk * lastingBoost(8).atk * (1.25 / 1.15 / trimOf(8).blow);
  assert.ok(Math.abs(atkOf(u) - want) < 1e-6, `${atkOf(u)} against ${want}`);
});

test('a rank 4 Knight has CON and STR +3; awakening adds +2 to the primary', () => {
  const r1 = fightScores('knight', { rank: 1 })!;
  const r4 = fightScores('knight', { rank: 4 })!;
  assert.equal(r4.con - r1.con, 3);
  assert.equal(r4.str - r1.str, 3);
  assert.equal(r4.dex, r1.dex);
  assert.deepEqual(fightScores('knight', { rank: 0 }), r1, 'rank 0 and rank 1 give no step');
  const r6 = fightScores('knight', { rank: 6 })!;
  assert.equal(r6.con - r4.con, 4, 'two awakened steps, +2 each');
  // (a grade in a run steps the same two)
  const g3 = fightScores('knight', { grade: 3 })!;
  assert.equal(g3.con - r1.con, 2);
  assert.equal(g3.str - r1.str, 2);
});

test('a hero at level 1, rank 0 or 1, with nothing extra, fights exactly as before', () => {
  const b = startBattle(1);
  for (const [i, kind] of ALL_HEROES.entries()) {
    for (const rank of [0, 1]) {
      const u = addUnit(b, kind, i % 8, 8 + (i % 3), gradeBoost(1, rank, 1));
      assert.equal(u.stats, undefined, kind);
      assert.equal(u.maxHp, Math.round(UNITS[kind].hp * gradeBoost(1, rank, 1).hp!), kind);
    }
  }
});

// The mean hero's power by level on main before this batch (`node tools/stats/budget.mjs`, rank 0, grade 1, nothing worn).
const MAIN_MEAN: Readonly<Record<number, number>> = { 1: 790.8, 4: 1264.5, 8: 1894.8, 10: 2209.8, 12: 2524.8, 16: 2682.2, 20: 2839.7, 25: 3182.0, 30: 3595.0, 40: 3839.1, 50: 4099.0, 60: 4378.5, 80: 5000.1, 100: 5751.0 };

test("the mean hero's power at every level is within 1% of main's", () => {
  for (const [level, main] of Object.entries(MAIN_MEAN)) {
    const mean = ALL_HEROES.reduce((n, k) => n + powerOf(k, gradeBoost(1, 0, Number(level))), 0) / ALL_HEROES.length;
    assert.ok(Math.abs(mean / main - 1) <= 0.01, `level ${level}: ${mean.toFixed(1)} against main's ${main}`);
  }
  // (and at every level from 1 to 100 the curve's trim keeps the mean shares at 1)
  for (let level = 1; level <= 100; level++) {
    const all = ALL_HEROES.map((k) => statMults(k, { level }));
    for (const key of ['hp', 'blow', 'cast'] as const) {
      const mean = all.reduce((n, m) => n + m[key], 0) / all.length;
      assert.ok(Math.abs(mean - 1) < 1e-9, `level ${level} ${key}: ${mean}`);
    }
  }
});

test('parity: no hero is lifted far above the rest by its scores (heroes have no rarity)', () => {
  for (let level = 1; level <= 100; level++) {
    for (const kind of ALL_HEROES) {
      const m = statMults(kind, { level });
      // (its health and blows together, and its spells where it casts with another ability than it strikes with: at most 3% over the mean
      // hero at any level. Below the mean is the joint rebalance's to answer, by each hero's skill tune: the Beastmaster, whose power is
      // his wolves (CHA), strikes with a STR of 10, and the Kraken and the Dread Pirate cast with their third score.)
      const body = Math.sqrt(m.hp * m.blow);
      const p = STAT_PROFILES[kind];
      const spells = p.cast !== p.blow || !['str', 'dex'].includes(p.cast) ? m.cast : m.blow;
      assert.ok(body <= 1.03 && spells <= 1.03, `${kind} at level ${level}: body ${body.toFixed(3)}, skills ${spells.toFixed(3)}`);
      assert.ok(body >= 0.85 && spells >= 0.9, `${kind} at level ${level}: body ${body.toFixed(3)}, skills ${spells.toFixed(3)}`);
    }
  }
});

test('health grows with CON, blows with the blow ability, and each skill with its own ability', () => {
  // (the Cleric strikes with STR and casts with WIS; the Dragoon breathes with CON)
  assert.equal(skillStatOf('Guiding Bolt', STAT_PROFILES.cleric), 'cast');
  assert.equal(skillStatOf('Divine Smite', STAT_PROFILES.paladin), 'blow');
  assert.equal(skillStatOf('Dragon Breath', STAT_PROFILES.dragoon), 'con');
  assert.equal(skillStatOf('Dragon Dive', STAT_PROFILES.dragoon), 'blow');
  assert.equal(skillStatOf('Cannonade', STAT_PROFILES.dreadPirate), 'cast');
  assert.equal(skillStatOf('Grapeshot', STAT_PROFILES.dreadPirate), 'blow');
  // (a martial's skills are weapon skills, and stay so in a book on a wizard)
  assert.equal(skillStatOf('Kesa Cut', STAT_PROFILES.samurai), 'blow');
  const b = startBattle(1);
  const cleric = addUnit(b, 'cleric', 2, 9, gradeBoost(1, 0, 20));
  const m = cleric.stats!;
  assert.ok(m, 'a level-20 Cleric has score shares');
  assert.equal(cleric.maxHp, Math.round(UNITS.cleric.hp * gradeBoost(1, 0, 20).hp! * m.hp));
  assert.ok(Math.abs(skillShare(m, 'cast') - m.cast / m.blow) < 1e-12);
  assert.equal(skillShare(m, 'blow'), 1);
  // (the Cleric's WIS 17 rises to 20 by level 8: its spells carry WIS +5 against its level-1 +3)
  assert.equal(fightScores('cleric', { level: 20 })!.wis, 20);
  assert.ok(Math.abs(ownMults(STAT_PROFILES.cleric, { level: 20 }).cast - 1.25 / 1.15) < 1e-9);
});

test("talents' health and attack nodes give score points, and gear gives its base's score from Rare up", () => {
  const knight = TREES.knight.nodes;
  const steel = knight.find((n) => n.id === 'knight:1a')!;
  assert.equal(steel.name, 'Tempered Steel');
  assert.deepEqual(steel.scores, { con: 2 });
  assert.equal(steel.text, 'CON +2');
  assert.equal(steel.stats, undefined);
  assert.deepEqual(knight.find((n) => n.id === 'knight:1b')!.scores, { str: 2 }, 'the Knight strikes with STR');
  assert.deepEqual(TREES.archer.nodes.filter((n) => n.tier === 1 && n.scores?.dex).length, 1, 'the Archer strikes with DEX');
  assert.equal(itemStats({ base: 'plateCuirass', rarity: 1, level: 1 }).scores, undefined);
  assert.deepEqual(itemStats({ base: 'plateCuirass', rarity: 2, level: 1 }).scores, { con: 1 });
  assert.deepEqual(itemStats({ base: 'plateCuirass', rarity: 4, level: 1 }).scores, { con: 2 });
  assert.deepEqual(itemStats({ base: 'healerLyre', rarity: 5, level: 1 }).scores, { cha: 2 });
  // (and a fight reads them: CON +2 is one more point of modifier, +5% of body health; the Knight's CON 17 is +3 at level 1)
  const extra = statMults('knight', { level: 1, equip: { scores: { con: 2 } } });
  assert.ok(Math.abs(extra.hp - 1.2 / 1.15) < 1e-9);
});
