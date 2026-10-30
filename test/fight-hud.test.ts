// The fight HUD's words and numbers (BATTLE-HUD, docs/notes/battle-hud.md, `src/fightHudRules.ts`): every chip and sheet reads the hero's own kit
// (names, costs, pools, gaps, blood costs, revive faces, ultimates), so the reworked spell kits show as they are; and the rows' layout for a party
// over five.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bareBoard } from './bare';
import { addUnit, startBattle, type Battle, type Unit } from '../src/sim/battle';
import { CHARGE_MAX, keyOf, ULT_LEVEL } from '../src/sim/abilities';
import { HERO_KITS, costOf, heroKitOf, RES, SKILL2_LEVEL } from '../src/sim/heroKits';
import { REVIVE } from '../src/sim/kits/revive';
import { TIER_SKILLS } from '../src/sim/tierSkills';
import { ALL_HEROES } from '../src/sim/units';
import { barNumbers, chipLine, chipOf, gapOf, hudLayout, sheetOf, ultOf, whichCast } from '../src/fightHudRules';

function arena(): Battle {
  const b = startBattle(3);
  bareBoard(b);
  b.units = [];
  b.phase = 'fight';
  b.kits = {};
  return b;
}
const spawn = (b: Battle, def: string, level = 1, at = 0): Unit => addUnit(b, def, at % 8, Math.floor(at / 8), level > 1 ? { level } : {});

test('every hero chip shows its own kit: the skill names, the cost this hero pays, its pool and its gap', () => {
  const b = arena();
  ALL_HEROES.forEach((h, i) => {
    const u = spawn(b, h, ULT_LEVEL, i);
    const hk = HERO_KITS()[h];
    for (const n of [1, 2] as const) {
      const c = chipOf(b, u, n)!;
      const slot = n === 1 ? hk.s1 : hk.s2;
      assert.equal(c.name, slot.skill.name, `${h} skill ${n}`);
      assert.equal(c.cost, Math.round(costOf(u, slot)), `${h} skill ${n}`);
      assert.equal(c.tag, hk.pool === 'mana' ? 'MP' : 'SP', h);
      assert.equal(c.gap, slot.gap ?? (hk.pool === 'mana' ? RES.GAP_MANA_MS : RES.GAP_STAM_MS), h);
      assert.ok(c.open, `${h} skill ${n} is open at level ${ULT_LEVEL}`);
    }
    const v = ultOf(b, u);
    assert.ok(!v.locked && v.skill, `${h} has its ultimate at level ${ULT_LEVEL}`);
  });
});

test('an MP caster, a blood-cost hero, a monster hero and a summoner read right', () => {
  const b = arena();
  const mage = spawn(b, 'lightningMage', 12, 0);
  const barb = spawn(b, 'barbarian', 12, 1);
  const wolf = spawn(b, 'werewolf', 12, 2);
  const beast = spawn(b, 'beastmaster', 12, 3);
  // (mana for the mage, its gap the pool's own)
  const m1 = chipOf(b, mage, 1)!;
  assert.equal(m1.tag, 'MP');
  assert.match(chipLine(m1), /^\d+ MP$/);
  // (the Barbarian's skill 2 is paid in blood too: the chip and the sheet say so)
  const b2 = chipOf(b, barb, 2)!;
  assert.equal(b2.blood, HERO_KITS().barbarian.s2.hpCost);
  assert.equal(chipLine(b2), `${b2.cost} SP +10%HP`);
  const sheet = sheetOf(b, barb, 2)!;
  assert.match(sheet.rows.find(([k]) => k === 'Cost')![1], /and 10% of max health/);
  // (the monster hero's chips are its reworked moves, by name; the summoner's call keeps its own long gap, and its skill 2 is the pack's order)
  assert.equal(chipOf(b, wolf, 1)!.name, heroKitOf(wolf)!.s1.skill.name);
  const s1 = chipOf(b, beast, 1)!;
  assert.equal(s1.name, heroKitOf(beast)!.s1.skill.name);
  assert.equal(s1.gap, 9000);
  assert.match(sheetOf(b, beast, 1)!.rows.find(([k]) => k === 'Cooldown')![1], /^9\.0s/);
  assert.equal(chipOf(b, beast, 2)!.name, 'Pack Tactics');
});

test('a chip cools from its last cast, greys while the pool cannot pay, and is shut below level 10', () => {
  const b = arena();
  const u = spawn(b, 'knight', 12);
  const hk = heroKitOf(u)!;
  u.charge = 0;
  b.t = 10000;
  u.ks = { at1: 9000 };
  const c = chipOf(b, u, 1)!;
  assert.ok(c.short && c.pay === 0);
  assert.ok(Math.abs(c.cd - (1 - 1000 / gapOf(hk, hk.s1))) < 1e-9);
  assert.match(chipLine(c), /· \d+\.\ds$/);
  u.charge = CHARGE_MAX;
  assert.ok(!chipOf(b, u, 1)!.short);
  const low = spawn(b, 'knight', 1, 5);
  const shut = chipOf(b, low, 2)!;
  assert.ok(!shut.open);
  assert.equal(chipLine(shut), `Lv ${SKILL2_LEVEL}`);
  assert.equal(chipLine(shut, true), `Lv${SKILL2_LEVEL}`);
  assert.equal(chipLine(chipOf(b, low, 1)!, true), String(Math.round(costOf(low, hk.s1))));
});

test("a healer's skill 2 shows its revive face while a friend lies fallen, and the cast is matched to it", () => {
  const b = arena();
  const cleric = spawn(b, 'cleric', 12, 0);
  const friend = spawn(b, 'knight', 12, 1);
  cleric.charge = CHARGE_MAX;
  assert.ok(!chipOf(b, cleric, 2)!.revive);
  friend.alive = false;
  friend.hp = 0;
  const c = chipOf(b, cleric, 2)!;
  assert.ok(c.revive, 'the revive face is up');
  const face = heroKitOf(cleric)!.s2.revive!.skill;
  assert.equal(c.name, face.name);
  assert.equal(c.gap, REVIVE.GAP_MS);
  assert.equal(whichCast(cleric, keyOf(face)), 2);
  assert.equal(whichCast(cleric, keyOf(heroKitOf(cleric)!.s1.skill)), 1);
  assert.equal(whichCast(cleric, 'Nothing of his'), null);
});

test("the ultimate's sheet: locked below level 30, else its meter and how it fires", () => {
  const b = arena();
  const low = spawn(b, 'samurai', 5, 0);
  const lowSheet = sheetOf(b, low, 'ult')!;
  assert.equal(lowSheet.label, 'Ultimate');
  assert.deepEqual(lowSheet.rows[0], ['Locked', `Opens at level ${ULT_LEVEL}`]);
  assert.ok(ultOf(b, low).locked);
  const u = spawn(b, 'samurai', ULT_LEVEL, 1);
  u.charge2 = 50;
  const s = sheetOf(b, u, 'ult', false)!;
  assert.equal(whichCast(u, keyOf(s.skill)), 'ult');
  assert.match(s.rows.find(([k]) => k === 'Meter')![1], /^50%/);
  assert.match(s.rows.find(([k]) => k === 'To fire')![1], /TAP/);
  assert.match(sheetOf(b, u, 'ult', true)!.rows.find(([k]) => k === 'To fire')![1], /Auto is on/);
  u.charge2 = CHARGE_MAX;
  assert.ok(ultOf(b, u).ready);
});

test("the tier lines: the skill a tier improves lists its tiers (the reached ones lit); the other gets cheaper at tier 3", () => {
  const b = arena();
  const u = addUnit(b, 'samurai', 0, 0, { level: 12, grade: 3 });
  const own = sheetOf(b, u, 1)!;
  assert.equal(own.tiers.length, 3);
  assert.equal(own.tiers[0].title, `Tier 2: ${TIER_SKILLS.samurai[0].name}`);
  assert.deepEqual(own.tiers.map((t) => [t.on, t.now]), [[true, false], [true, true], [false, false]]);
  const other = sheetOf(b, u, 2)!;
  assert.equal(other.tiers.length, 1);
  assert.ok(other.tiers[0].now);
});

test('the bars show health and the pool with their numbers', () => {
  const b = arena();
  const u = spawn(b, 'wizard', 12);
  u.hp = Math.round(u.maxHp / 2);
  u.charge = CHARGE_MAX / 4;
  const n = barNumbers(u);
  assert.equal(n.hp, `${u.hp}/${u.maxHp}`);
  assert.equal(n.pool, '25/100 MP');
  assert.equal(n.poolShare, 0.25);
});

test('up to five heroes take a full row each; more (the Last Stand eight, a Calamity ten) two columns of compact rows', () => {
  assert.deepEqual(hudLayout(5), { pairs: false, rows: 5 });
  assert.deepEqual(hudLayout(3), { pairs: false, rows: 3 });
  assert.deepEqual(hudLayout(8), { pairs: true, rows: 4 });
  assert.deepEqual(hudLayout(10), { pairs: true, rows: 5 });
  assert.deepEqual(hudLayout(7), { pairs: true, rows: 4 });
});
