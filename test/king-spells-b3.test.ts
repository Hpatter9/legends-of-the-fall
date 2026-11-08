// KING-SPELLS batch 3 (docs/notes/king-spells-b3.md): the spells' ranks, the school marks that buy them, and the rank-3 riders.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bareBoard } from './bare';
import { addUnit, startBattle, stepBattle, type Battle } from '../src/sim/battle';
import { castSpell, HEAL_SHARE, MANA_MAX, RANK_COOL, RANK_MAX, RIDERS, SPELLS, SPELL_IDS, WOLVES, readLoadout } from '../src/sim/spells';
import { fightRanks, marksEarned, marksFree, marksSpent, rankBlock, rankIn, rankUp } from '../src/sim/spellRanks';
import { loadMeta, saveMeta, startedMeta } from '../src/sim/meta';

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
const store = () => {
  const raw: Record<string, string> = {};
  return { raw, getItem: (k: string) => raw[k] ?? null, setItem: (k: string, v: string) => void (raw[k] = v) };
};

test('marks come from the Mage Tower\'s levels and the armies cleared, and each raises a known spell one rank to the top', () => {
  const m = startedMeta(1);
  assert.equal(marksEarned(m), 0);
  assert.equal(rankBlock(m, 'heal'), 'No school mark free: raise the Mage Tower or clear an army');
  m.castle.mageTower = 2;
  m.armies.orcs = { best: 15, won: 15, clears: 1 } as never;
  assert.equal(marksEarned(m), 3);
  assert.equal(rankBlock(m, 'quake'), 'Not learnt yet');
  assert.ok(rankUp(m, 'heal'));
  assert.ok(rankUp(m, 'heal'));
  assert.equal(rankIn(m.spellbook, 'heal'), RANK_MAX);
  assert.equal(rankBlock(m, 'heal'), 'Already at its top rank');
  assert.equal(marksSpent(m.spellbook), 2);
  assert.equal(marksFree(m), 1);
  assert.ok(rankUp(m, 'meteor'));
  assert.equal(rankUp(m, 'haste'), false);
  assert.deepEqual(fightRanks(m.spellbook), { heal: 3, meteor: 2 });
  assert.equal(fightRanks(startedMeta(2).spellbook), undefined);
});

test('ranks are saved and loaded, and an odd saved value is made sane', () => {
  const s = store();
  const m = startedMeta(3);
  m.castle.mageTower = 1;
  assert.ok(rankUp(m, 'heal'));
  saveMeta(m, s);
  assert.deepEqual(loadMeta(1, s).spellbook.ranks, { heal: 2 });
  const l = readLoadout({ owned: ['heal'], equipped: ['heal'], ranks: { heal: 9, meteor: 1, ghost: 2, haste: 'x', smite: 2.7 } });
  assert.deepEqual(l.ranks, { heal: 3, smite: 2 });
});

test('a ranked spell strikes and heals harder and cools sooner; a fight with no ranks plays as before', () => {
  const heal = (rank?: number) => {
    const b = arena();
    const x = addUnit(b, 'knight', 3, 7);
    x.maxHp = 1000;
    x.hp = 100;
    still(b);
    if (rank) b.spells.ranks = { heal: rank };
    b.spells.mana = MANA_MAX;
    assert.ok(castSpell(b, 'heal', 3, 7));
    return { gained: x.hp - 100, ready: b.spells.ready.heal - b.t };
  };
  assert.deepEqual(heal(), { gained: 1000 * HEAL_SHARE, ready: SPELLS.heal.cooldownMs });
  assert.deepEqual(heal(1), heal());
  assert.deepEqual(heal(2), { gained: Math.round(1000 * HEAL_SHARE * 1.2), ready: Math.round(SPELLS.heal.cooldownMs * RANK_COOL[2]) });
  assert.equal(heal(3).gained, Math.round(1000 * HEAL_SHARE * 1.4));
});

test('every spell has a rider, and three of them do what they say at rank 3', () => {
  for (const id of SPELL_IDS) assert.ok(RIDERS[id].length > 8, id);
  // (Chain Lightning leaps once more)
  const chain = (rank: number) => {
    const b = arena();
    addUnit(b, 'knight', 0, 9);
    for (let u = 1; u <= 6; u++) addUnit(b, 'skeleton', u, 3).hp = 5000;
    still(b);
    b.spells.ranks = { chain: rank };
    b.spells.mana = MANA_MAX;
    assert.ok(castSpell(b, 'chain', 1, 3));
    return b.spells.events.filter((e) => e.kind === 'arc').length;
  };
  assert.equal(chain(3), chain(1) + 1);
  // (a second meteor falls on the spot)
  const b = arena();
  addUnit(b, 'knight', 3, 9);
  still(b);
  b.spells.ranks = { meteor: 3 };
  b.spells.mana = MANA_MAX;
  assert.ok(castSpell(b, 'meteor', 3, 3));
  assert.equal(b.spells.falls.length, 2);
  // (three wolves come)
  const w = arena();
  addUnit(w, 'knight', 3, 9);
  w.spells.ranks = { wolves: 3 };
  w.spells.mana = MANA_MAX;
  assert.ok(castSpell(w, 'wolves', 3, 6));
  assert.equal(w.units.filter((x) => x.def === 'wolf').length, WOLVES + 1);
  stepBattle(w);
});
