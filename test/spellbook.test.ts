// The spellbook's rules. Since KING-SPELLS batch 2 (the owner-approved Schools of the Crown, docs/notes/king-spells-b2.md) the power budget is
// gone: three slots take the ruler's school's spells and one open slot any spell known (`src/sim/schools.ts`); these tests were changed to match.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadMeta, startedMeta, saveMeta } from '../src/sim/meta';
import { LOADOUT_SIZE, readLoadout, SPELLS, SPELL_IDS, STARTER_SPELLS } from '../src/sim/spells';
import { castList, equipBlock, equipSpell, fitSchool, unequipSpell } from '../src/sim/schools';
import * as spells from '../src/sim/spells';

const store = () => {
  const raw: Record<string, string> = {};
  return { raw, getItem: (k: string) => raw[k] ?? null, setItem: (k: string, v: string) => void (raw[k] = v) };
};

test('a new game knows the starting three, and fitted to the default ruler holds its school\'s first two and Heal in the open slot', () => {
  const m = startedMeta(1);
  assert.deepEqual(m.spellbook.owned, [...STARTER_SPELLS]);
  fitSchool(m.spellbook, 'iron_stag');
  assert.deepEqual(m.spellbook.equipped, ['rally', 'shield']);
  assert.equal(m.spellbook.open, 'heal');
  assert.deepEqual(castList(m.spellbook), ['rally', 'shield', 'heal']);
  for (const id of STARTER_SPELLS) assert.ok(m.spellbook.owned.includes(id), id);
});

test('a full school refuses another school spell until one is unequipped; an unknown or equipped spell is refused', () => {
  const m = startedMeta(1);
  const l = m.spellbook;
  l.owned = [...SPELL_IDS];
  fitSchool(l, 'iron_stag');
  assert.deepEqual(l.equipped, ['rally', 'shield', 'bulwark']);
  assert.equal(equipBlock(l, 'lance', 'iron_stag'), 'The school slots and the open slot are full: unequip one first');
  assert.equal(equipBlock(l, 'meteor', 'iron_stag'), 'The open slot holds Heal: unequip it first');
  assert.equal(equipBlock(l, 'rally', 'iron_stag'), 'Already equipped');
  assert.ok(unequipSpell(l, 'heal'));
  assert.equal(unequipSpell(l, 'heal'), false);
  // (a spell of another school goes in the open slot; so does one of the school when its slots are full)
  assert.ok(equipSpell(l, 'meteor', 'iron_stag'));
  assert.equal(l.open, 'meteor');
  assert.ok(unequipSpell(l, 'meteor'));
  assert.ok(equipSpell(l, 'lance', 'iron_stag'));
  assert.equal(l.open, 'lance');
  const n = startedMeta(2);
  assert.equal(equipBlock(n.spellbook, 'quake', 'iron_stag'), 'Not learnt yet');
  assert.ok(LOADOUT_SIZE === 3);
});

test('changing ruler re-fits the loadout to the new school; an already fitted loadout keeps the player\'s choices', () => {
  const m = startedMeta(1);
  const l = m.spellbook;
  fitSchool(l, 'iron_stag');
  unequipSpell(l, 'shield');
  fitSchool(l, 'iron_stag');
  assert.deepEqual(l.equipped, ['rally'], 'an emptied slot stays empty');
  fitSchool(l, 'ash_empress');
  assert.equal(l.school, 'ash_empress');
  assert.deepEqual(l.equipped, ['meteor', 'warcry']);
  assert.equal(l.open, 'heal');
  // (every school's first two become known)
  for (const id of ['rally', 'shield', 'meteor', 'warcry'] as const) assert.ok(l.owned.includes(id), id);
  // (an unknown ruler falls back to the default's school)
  fitSchool(l, 'nobody');
  assert.equal(l.school, 'iron_stag');
});

test('an old save keeps every spell it owns; its slots move to the school, and a spell that no longer fits takes the open slot', () => {
  const l = readLoadout({ owned: ['heal', 'meteor', 'haste', 'chain', 'smite'], equipped: ['chain', 'meteor', 'haste'] });
  fitSchool(l, 'storm_corsair');
  assert.deepEqual(l.equipped, ['chain', 'haste']);
  assert.equal(l.open, 'meteor');
  for (const id of ['heal', 'meteor', 'haste', 'chain', 'smite'] as const) assert.ok(l.owned.includes(id), id);
});

test('spells are not bought with crowns: there is no price and no way to buy one', () => {
  assert.equal('unlockSpell' in spells, false);
  for (const id of SPELL_IDS) assert.equal('price' in SPELLS[id], false, id);
});

test('the spellbook is saved and loaded, open slot and school too', () => {
  const s = store();
  const m = startedMeta(3);
  fitSchool(m.spellbook, 'iron_stag');
  m.spellbook.owned.push('bulwark');
  assert.ok(equipSpell(m.spellbook, 'bulwark', 'iron_stag'));
  saveMeta(m, s);
  const back = loadMeta(1, s);
  assert.deepEqual(back.spellbook, m.spellbook);
  assert.deepEqual(castList(back.spellbook), ['rally', 'shield', 'bulwark', 'heal']);
});

test('old saves without a spellbook get the starting three', () => {
  const s = store();
  const m = startedMeta(3) as unknown as Record<string, unknown>;
  delete m.spellbook;
  s.setItem('legends.meta', JSON.stringify(m));
  const back = loadMeta(1, s);
  assert.deepEqual(back.spellbook.owned, [...STARTER_SPELLS]);
  assert.deepEqual(back.spellbook.equipped, [...STARTER_SPELLS]);
});

test('an odd saved spellbook is made sane', () => {
  const l = readLoadout({ owned: ['quake', 'nonsense', 7], equipped: ['quake', 'meteor', 'resurrect', 'heal', 'quake', 'ghost'], open: 'ghost', school: 'iron_stag' });
  assert.deepEqual(l.owned, [...STARTER_SPELLS, 'quake']);
  assert.deepEqual(l.equipped, ['quake', 'meteor', 'heal']);
  assert.equal(l.open, undefined);
  assert.deepEqual(readLoadout('junk'), readLoadout(null));
  const four = readLoadout({ owned: [...SPELL_IDS], equipped: ['heal', 'haste', 'shield', 'smite'], open: 'chain' });
  assert.equal(four.equipped.length, LOADOUT_SIZE);
  assert.equal(four.open, 'chain');
});
