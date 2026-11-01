// The unit's info card (UNIT-INFO, docs/notes/unit-info.md, `src/unitInfoRules.ts`): a press-and-hold between waves reads a hero's stats and
// moves from the kit data (skill 2 and the ultimate locked below their levels), a foe's kit, family and tips, a boss's second form, and small
// cards for the summons, the king and Duchess; reading never changes the battle.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bareBoard } from './bare';
import { addUnit, startBattle, type Battle } from '../src/sim/battle';
import { KITS, ULT_LEVEL } from '../src/sim/abilities';
import { HERO_KITS, SKILL2_LEVEL } from '../src/sim/heroKits';
import { PHASE2 } from '../src/sim/bossPhases';
import { HERO_NAMES } from '../src/sim/heroNames';
import { ALL_HEROES, UNITS } from '../src/sim/units';
import { HOLD_SLOP, familyOf, holdBroken, infoOf, phaseLines, previewUnit } from '../src/unitInfoRules';

function deploy(): Battle {
  const b = startBattle(5);
  bareBoard(b);
  b.units = [];
  return b;
}

test('every hero card lists skills 1, 2 and 3 and the ultimate from its kit, with skills 2 and 3 and the ultimate locked below their levels', () => {
  const b = deploy();
  ALL_HEROES.forEach((h, i) => {
    const low = addUnit(b, h, i % 8, 9, {});
    const info = infoOf(b, low);
    const hk = HERO_KITS()[h];
    assert.equal(info.kind, 'hero');
    // (the skills overhaul's batch 4: skill 3, locked below level 20, between skill 2 and the ultimate)
    const [s1, s2, ...more] = info.moves;
    const s3 = hk.s3 ? more.shift() : undefined;
    const ult = more[0];
    if (hk.s3) {
      assert.equal(s3!.name, hk.s3.skill.name, h);
      assert.equal(s3!.label, 'Skill 3');
      assert.ok(s3!.locked && s3!.rows.some(([k, v]) => k === 'Locked' && v === 'Opens at level 20'), `${h}: skill 3 waits for level 20`);
    }
    assert.equal(s1.name, hk.s1.skill.name, h);
    assert.equal(s1.locked, false);
    assert.equal(s2.name, hk.s2.skill.name, h);
    assert.equal(s2.locked, true, `${h}: skill 2 waits for level ${SKILL2_LEVEL}`);
    assert.equal(ult.label, 'Ultimate');
    assert.equal(ult.name, KITS[h].ultimate!.name);
    assert.equal(ult.locked, true);
    assert.ok(s1.rows.some(([k, v]) => k === 'Cost' && v.includes(hk.pool)), `${h}: the cost names its pool`);
    assert.equal(info.moves.at(-1)!.label, 'Passive');
    const high = addUnit(b, h, i % 8, 10, { level: ULT_LEVEL });
    const open = infoOf(b, high);
    assert.ok(open.moves.slice(0, -1).every((m) => !m.locked), `${h}: every move open at level ${ULT_LEVEL}`);
    assert.equal(open.level, ULT_LEVEL);
  });
});

test('a hero card shows its pool, health, attack and traits; a mana caster says MP and a stamina hero SP', () => {
  const b = deploy();
  const wiz = addUnit(b, 'wizard', 0, 9, { level: 12, grade: 2 });
  const info = infoOf(b, wiz);
  const pool = info.stats.find(([k]) => k === 'Pool')![1];
  assert.match(pool, HERO_KITS().wizard.pool === 'mana' ? /Mana: \d+\/100 MP/ : /Stamina: \d+\/60 SP/);
  assert.equal(info.hp, `${wiz.maxHp}/${wiz.maxHp}`);
  assert.equal(info.grade, 2);
  assert.equal(info.name, HERO_NAMES.wizard?.name ?? 'Fire Wizard');
  assert.ok(info.title, 'a hero has its bench title');
  assert.ok(info.traits.length >= 1);
  const knight = infoOf(b, addUnit(b, 'knight', 1, 9, {}));
  assert.match(knight.stats[0][1], HERO_KITS().knight.pool === 'mana' ? /MP/ : /SP/);
});

test('a bench hero is read from a scratch unit: the battle keeps its units and next id', () => {
  const b = deploy();
  addUnit(b, 'archer', 0, 9, {});
  const before = JSON.stringify({ units: b.units, next: b.nextId });
  const u = previewUnit(b, 'samurai', { level: 15, grade: 3 }, 7);
  const info = infoOf(b, u);
  assert.equal(info.level, 15);
  assert.equal(info.grade, 3);
  assert.equal(info.moves[1].locked, false);
  assert.equal(JSON.stringify({ units: b.units, next: b.nextId }), before);
  // (reading a placed hero changes nothing either)
  const was = JSON.stringify(b);
  infoOf(b, b.units[0]);
  assert.equal(JSON.stringify(b), was);
});

test('a foe card has its family, its kit and the codex tips; a boss with a second form lists the form', () => {
  const b = deploy();
  const wolf = addUnit(b, 'wolfBlack', 3, 1, {});
  const info = infoOf(b, wolf);
  assert.equal(info.kind, 'foe');
  assert.equal(familyOf(UNITS.wolfBlack), 'Werewolf');
  assert.match(info.sub, /Werewolf/);
  assert.ok(info.tips.length);
  if (KITS.wolfBlack) assert.equal(info.moves[0].name, KITS.wolfBlack.skill.name);
  const boss = addUnit(b, 'orcWarlord', 4, 1, { phase: 0.5, size: 1.4 });
  const bi = infoOf(b, boss);
  assert.equal(bi.kind, 'boss');
  assert.equal(bi.phase.length, phaseLines(PHASE2.orcWarlord, 0.5).length);
  assert.match(bi.phase[0], /50% health/);
  assert.ok(bi.phase.some((l) => /Orc Grunts/.test(l)));
  // (a boss with no second form armed shows none)
  assert.deepEqual(infoOf(b, addUnit(b, 'demonLord', 5, 1, {})).phase, []);
});

test('the summons, the king and Duchess have cards of their own', () => {
  const b = deploy();
  const druid = addUnit(b, 'druid', 0, 9, {});
  const tree = addUnit(b, 'treant', 1, 9, {});
  tree.owner = druid.id;
  const t = infoOf(b, tree);
  assert.equal(t.kind, 'summon');
  assert.match(t.note!, /Called up by/);
  assert.equal(infoOf(b, addUnit(b, 'standKing', 3, 5, {})).kind, 'king');
  assert.equal(infoOf(b, addUnit(b, 'duchess', 4, 9, {})).kind, 'duchess');
});

test('a hold gives way to a drag once the finger strays as far as the drag threshold', () => {
  assert.equal(holdBroken(10, 10, 10 + HOLD_SLOP - 1, 10), false);
  assert.equal(holdBroken(10, 10, 10 + HOLD_SLOP, 10), true);
});
