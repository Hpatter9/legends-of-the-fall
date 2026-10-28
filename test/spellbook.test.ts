import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newCastle, spellBudget, SPELL_BUDGET } from '../src/sim/castle';
import { loadMeta, startedMeta, saveMeta } from '../src/sim/meta';
import { budgetOf, equipBlock, equipSpell, LOADOUT_SIZE, powerOf, readLoadout, SPELLS, SPELL_IDS, STARTER_SPELLS, unequipSpell } from '../src/sim/spells';
import * as spells from '../src/sim/spells';

const store = () => {
  const raw: Record<string, string> = {};
  return { raw, getItem: (k: string) => raw[k] ?? null, setItem: (k: string, v: string) => void (raw[k] = v) };
};

test('a new game owns and has equipped the starting three, within the budget', () => {
  const m = startedMeta(1);
  assert.deepEqual(m.spellbook.owned, [...STARTER_SPELLS]);
  assert.deepEqual(m.spellbook.equipped, [...STARTER_SPELLS]);
  assert.ok(powerOf(m.spellbook.equipped) <= budgetOf(m));
});

test('three strong spells cannot be equipped together', () => {
  const m = startedMeta(1);
  m.spellbook.owned = [...SPELL_IDS];
  m.spellbook.equipped = [];
  assert.ok(equipSpell(m, 'meteor'));
  assert.ok(equipSpell(m, 'quake')); // 4 + 4 = 8 of 9
  assert.equal(equipBlock(m, 'resurrect'), 'Over the power budget');
  assert.equal(equipSpell(m, 'smite'), false);
  assert.deepEqual(m.spellbook.equipped, ['meteor', 'quake']);
  // the strongest three in the book never fit
  const top = [...SPELL_IDS].sort((a, b) => SPELLS[b].power - SPELLS[a].power).slice(0, LOADOUT_SIZE);
  assert.ok(powerOf(top) > spellBudget({ ...newCastle(), mageTower: 4 }));
});

test('a full loadout refuses another until one is unequipped; an unowned or equipped spell is refused', () => {
  const m = startedMeta(1);
  m.spellbook.owned = [...SPELL_IDS];
  assert.equal(equipBlock(m, 'shield'), 'All three slots are full: unequip one first');
  assert.equal(equipBlock(m, 'heal'), 'Already equipped');
  assert.ok(unequipSpell(m, 'meteor'));
  assert.equal(unequipSpell(m, 'meteor'), false);
  assert.ok(equipSpell(m, 'shield'));
  const n = startedMeta(2);
  assert.equal(equipBlock(n, 'quake'), 'Not unlocked yet');
});

test('the Mage Tower raises the budget at levels 2 and 4', () => {
  const c = newCastle();
  assert.equal(spellBudget(c), SPELL_BUDGET);
  c.mageTower = 1;
  assert.equal(spellBudget(c), SPELL_BUDGET);
  c.mageTower = 2;
  assert.equal(spellBudget(c), SPELL_BUDGET + 1);
  c.mageTower = 4;
  assert.equal(spellBudget(c), SPELL_BUDGET + 2);
  const m = startedMeta(1);
  m.spellbook.owned = [...SPELL_IDS];
  m.spellbook.equipped = ['meteor', 'quake'];
  assert.equal(equipBlock(m, 'heal'), 'Over the power budget');
  m.castle.mageTower = 2;
  assert.equal(equipBlock(m, 'heal'), null);
});

test('spells are not bought with crowns: there is no price and no way to buy one', () => {
  assert.equal('unlockSpell' in spells, false);
  for (const id of SPELL_IDS) assert.equal('price' in SPELLS[id], false, id);
});

test('the spellbook is saved and loaded', () => {
  const s = store();
  const m = startedMeta(3);
  m.spellbook.owned.push('shield');
  unequipSpell(m, 'meteor');
  equipSpell(m, 'shield');
  saveMeta(m, s);
  const back = loadMeta(1, s);
  assert.deepEqual(back.spellbook, m.spellbook);
  assert.deepEqual(back.spellbook.equipped, ['heal', 'haste', 'shield']);
});

test('old saves without a spellbook get the starting three equipped', () => {
  const s = store();
  const m = startedMeta(3) as unknown as Record<string, unknown>;
  delete m.spellbook;
  s.setItem('legends.meta', JSON.stringify(m));
  const back = loadMeta(1, s);
  assert.deepEqual(back.spellbook.owned, [...STARTER_SPELLS]);
  assert.deepEqual(back.spellbook.equipped, [...STARTER_SPELLS]);
});

test('a odd saved spellbook is made sane', () => {
  const budget = SPELL_BUDGET;
  const l = readLoadout({ owned: ['quake', 'nonsense', 7], equipped: ['quake', 'meteor', 'resurrect', 'heal', 'quake', 'ghost'] }, budget);
  assert.deepEqual(l.owned, [...STARTER_SPELLS, 'quake']);
  // resurrect isn't owned; quake 4 + meteor 4 fit, heal (2) would be 10
  assert.deepEqual(l.equipped, ['quake', 'meteor']);
  assert.deepEqual(readLoadout('junk', budget), readLoadout(null, budget));
  const four = readLoadout({ owned: [...SPELL_IDS], equipped: ['heal', 'haste', 'shield', 'smite'] }, 99);
  assert.equal(four.equipped.length, LOADOUT_SIZE);
});
