import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadMeta, saveMeta, startedMeta } from '../src/sim/meta';
import { openChest, peekChest, sumLoot } from '../src/sim/armyStars';
import { grantSpells, MILESTONE_SPELLS, rollScroll, sourceMet, spellLock, TOWER_SPELLS } from '../src/sim/spellSources';
import { SPELL_IDS, STARTER_SPELLS, type SpellId } from '../src/sim/spells';

const store = () => {
  const raw: Record<string, string> = {};
  return { raw, getItem: (k: string) => raw[k] ?? null, setItem: (k: string, v: string) => void (raw[k] = v) };
};
const clear = (m: ReturnType<typeof startedMeta>, army: string) => (m.armies[army] = { best: 1, won: 1, clears: 1, stars: {} });

test('every spell past the starting three comes from the Mage Tower or a milestone, never both', () => {
  for (const id of SPELL_IDS) {
    if (STARTER_SPELLS.includes(id)) continue;
    const tower = TOWER_SPELLS[id] !== undefined;
    const milestone = MILESTONE_SPELLS[id] !== undefined;
    assert.ok(tower !== milestone, id);
  }
  // (the tower teaches three a level, over its four levels)
  for (let lvl = 1; lvl <= 4; lvl++) assert.equal(Object.values(TOWER_SPELLS).filter((n) => n === lvl).length, 3, `level ${lvl}`);
});

test('the Mage Tower teaches its spells as it rises, and only once', () => {
  const m = startedMeta(1);
  assert.deepEqual(grantSpells(m), []);
  m.castle.mageTower = 1;
  assert.deepEqual(grantSpells(m).sort(), ['cleanse', 'shield', 'smite']);
  assert.deepEqual(grantSpells(m), [], 'once');
  m.castle.mageTower = 3;
  assert.deepEqual(grantSpells(m).sort(), ['blink', 'chain', 'frost', 'hex', 'lance', 'poison']);
  assert.equal(sourceMet(m, 'rally'), false);
});

test('the grand spells are earned by their milestones', () => {
  const m = startedMeta(2);
  clear(m, 'undead');
  assert.deepEqual(grantSpells(m), ['resurrect']);
  clear(m, 'golems');
  clear(m, 'beasts');
  assert.deepEqual(grantSpells(m).sort(), ['quake', 'wolves']);
  m.stand = 14;
  assert.deepEqual(grantSpells(m), []);
  assert.deepEqual(spellLock(m, 'bulwark')?.now, 14);
  m.stand = 15;
  assert.deepEqual(grantSpells(m), ['bulwark']);
  assert.equal(spellLock(m, 'bulwark'), null);
});

test('a save loads with the spells it bought before, and learns what it has already earned', () => {
  const s = store();
  const m = startedMeta(3);
  m.spellbook.owned.push('starfall');
  m.castle.mageTower = 2;
  saveMeta(m, s);
  const back = loadMeta(1, s);
  for (const id of ['starfall', 'shield', 'hex'] as SpellId[]) assert.ok(back.spellbook.owned.includes(id), id);
  assert.equal(back.spellbook.owned.includes('rally'), false);
});

test('the spellbook says where an unknown spell comes from', () => {
  const m = startedMeta(4);
  assert.match(spellLock(m, 'rally')!.line, /Mage Tower at level 4/);
  assert.match(spellLock(m, 'resurrect')!.line, /clear the Undead Legion/);
  assert.equal(spellLock(m, 'heal'), null);
  assert.ok(spellLock(m, 'shield')!.rank < spellLock(m, 'resurrect')!.rank, 'the tower first');
});

test('a gold chest may hold a scroll of a spell not known; it is the same each time and teaches the spell when opened', () => {
  const m = startedMeta(5);
  assert.equal(rollScroll(m, 1, 'silver'), null);
  assert.equal(rollScroll(m, 1, 'bronze'), null);
  let seed = 0;
  while (!rollScroll(m, seed, 'gold')) seed++;
  const id = rollScroll(m, seed, 'gold')!;
  assert.equal(rollScroll(m, seed, 'gold'), id, 'the same chest, the same scroll');
  assert.equal(m.spellbook.owned.includes(id), false);
  m.stash = [{ army: 'orcs', at: 10, tier: 0, seed }];
  const peek = peekChest(m, 0)!;
  assert.equal(m.spellbook.owned.includes(id), false, 'a peek teaches nothing');
  const loot = openChest(m, 0)!;
  assert.deepEqual(loot.items, peek.items);
  assert.ok(m.spellbook.owned.includes(id));
  assert.deepEqual(sumLoot([loot]).spells.map((it) => it.spell), [id]);
  // (a save that knows every spell finds no scroll)
  m.spellbook.owned = [...SPELL_IDS];
  assert.equal(rollScroll(m, seed, 'gold'), null);
});

test('scrolls turn up in a fair share of gold chests and more of Mythic ones', () => {
  const m = startedMeta(6);
  const share = (kind: string) => Array.from({ length: 400 }, (_, i) => rollScroll(m, i, kind)).filter(Boolean).length / 400;
  const gold = share('gold');
  const mythic = share('mythic');
  assert.ok(gold > 0.2 && gold < 0.4, String(gold));
  assert.ok(mythic > gold, String(mythic));
});
