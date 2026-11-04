// KING-SPELLS batch 1 (docs/notes/king-spells-b1.md): mana over the bar's top is kept, the damage spells grow with the foes, the soft snap aims
// the 3x3, and Auto casts its area spells on two foes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bareBoard } from './bare';
import { addUnit, defOf, startBattle, stepBattle, TICK_MS, type Battle } from '../src/sim/battle';
import { castSpell, fillMana, kingMight, manaText, MANA_MAX, MANA_PER_SEC, MIGHT_FROM, SMITE_POWER, SPILL_MAX, SPELLS } from '../src/sim/spells';
import { snapSpell } from '../src/sim/spellAim';
import { chooseSpell } from '../src/sim/autoCast';

function arena(): Battle {
  const b = startBattle(3);
  bareBoard(b);
  b.units = [];
  b.phase = 'fight';
  b.kits = {};
  return b;
}
const still = (b: Battle) => {
  for (const x of b.units) x.busyUntil = 1e9;
};

test('mana over the top of the bar is kept as spill (to a limit) and pours back in once a cast makes room', () => {
  const b = arena();
  b.spells.mana = MANA_MAX;
  const tick = (TICK_MS * MANA_PER_SEC * b.spells.rate) / 1000;
  for (let i = 0; i < 40; i++) fillMana(b);
  assert.equal(b.spells.mana, MANA_MAX);
  assert.ok(Math.abs(b.spells.spill! - 40 * tick) < 1e-6);
  assert.equal(manaText(b.spells), `10/10 +${Math.floor(40 * tick)}`);
  // (it stops at its own limit)
  for (let i = 0; i < 1000; i++) fillMana(b);
  assert.equal(b.spells.spill, SPILL_MAX);
  // (spend 5: the spill fills the bar again at the next tick)
  b.spells.mana -= 5;
  fillMana(b);
  assert.equal(b.spells.mana, MANA_MAX);
  assert.ok(Math.abs(b.spells.spill! - (SPILL_MAX - 5 + tick)) < 1e-6);
});

test('a fight that never fills the bar has no spill, and its mana reads as before', () => {
  const b = arena();
  addUnit(b, 'knight', 3, 7);
  addUnit(b, 'skeleton', 3, 0);
  for (let i = 0; i < 10; i++) stepBattle(b);
  assert.equal(b.spells.spill, undefined);
  assert.equal(manaText(b.spells), `${Math.floor(b.spells.mana)}/10`);
});

test("the king's might is 1 for the first armies and any fight with no boost, and grows with the foes' health boost", () => {
  const b = arena();
  assert.equal(kingMight(b), 1);
  b.foeBoost = { hp: 1 };
  assert.equal(kingMight(b), 1);
  b.foeBoost = { hp: MIGHT_FROM * 16 };
  assert.ok(Math.abs(kingMight(b) - 4) < 1e-9);
});

test('a smite lands harder on boosted foes, by the might', () => {
  const b = arena();
  addUnit(b, 'knight', 3, 7);
  const foe = addUnit(b, 'skeleton', 3, 2);
  foe.hp = foe.maxHp = 50000;
  still(b);
  b.foeBoost = { hp: MIGHT_FROM * 4 };
  b.spells.mana = MANA_MAX;
  assert.ok(castSpell(b, 'smite', 3, 2));
  assert.equal(foe.hp, 50000 - (SMITE_POWER * 2 - defOf(foe).def));
});

test('the soft snap slides a harm spell one tile onto more foes, a heal onto the hurt, and leaves Blink exactly where it is put', () => {
  const b = arena();
  const hero = addUnit(b, 'knight', 1, 8);
  for (const [u, v] of [[4, 3], [5, 3], [5, 4]]) addUnit(b, 'skeleton', u, v);
  // (a tap on (3, 3) catches one foe; (4, 3) catches all three)
  assert.deepEqual(snapSpell(b, 'meteor', 3, 3), [4, 3]);
  // (a tap already on the best spot, or a tie, stays put)
  assert.deepEqual(snapSpell(b, 'meteor', 4, 3), [4, 3]);
  assert.deepEqual(snapSpell(b, 'meteor', 0, 9), [0, 9]);
  hero.hp = Math.round(hero.maxHp * 0.3);
  assert.deepEqual(snapSpell(b, 'heal', 3, 8), [2, 8]);
  assert.deepEqual(snapSpell(b, 'blink', 3, 3), [3, 3]);
  assert.deepEqual(snapSpell(b, 'rally', 3, 3), [3, 3]);
  // (Light Lance steps sideways only, to the fullest column)
  assert.deepEqual(snapSpell(b, 'lance', 4, 6), [5, 6]);
});

test('Auto casts an area spell on two foes worth hitting, or on one elite, and not on one ordinary foe', () => {
  const b = arena();
  for (const u of [2, 3]) addUnit(b, 'knight', u, 6);
  addUnit(b, 'skeleton', 2, 5);
  const second = addUnit(b, 'skeleton', 3, 5);
  b.spells.mana = MANA_MAX;
  assert.equal(chooseSpell(b, ['meteor'])?.id, 'meteor');
  second.alive = false;
  addUnit(b, 'skeleton', 7, 0);
  assert.equal(chooseSpell(b, ['meteor']), undefined);
  assert.ok(SPELLS.meteor.cost <= MANA_MAX);
});
