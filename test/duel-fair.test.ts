// DUEL-FAIR (docs/notes/duel-fair.md): the three last armies' duels, eased to the band the others sit in.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARMIES } from '../src/sim/armies';
import { DUEL_ARMY, DUEL_MASTERED, duelShare } from '../src/sim/duel';

test('the armies whose walls were tuned for mastered skills are the three last ones', () => {
  assert.deepEqual([...DUEL_MASTERED].sort(), ['golems', 'infernal', 'yokai']);
  for (const id of DUEL_MASTERED) assert.ok(ARMIES.some((a) => a.id === id), `${id} is an army`);
});

test('every army has its own duel factor; the three last ones are eased below the plain share', () => {
  for (const a of ARMIES) assert.ok(DUEL_ARMY[a.id] > 0, `${a.id} has a factor`);
  for (const id of DUEL_MASTERED) assert.ok(DUEL_ARMY[id] < 1, `${id} eased`);
  assert.deepEqual({ infernal: DUEL_ARMY.infernal, yokai: DUEL_ARMY.yokai, golems: DUEL_ARMY.golems }, { infernal: 0.42, yokai: 0.55, golems: 0.44 });
});

test('the other armies keep the factors they had', () => {
  const { orcs, undead, beasts, wildwood, labyrinth, ogres } = DUEL_ARMY;
  assert.deepEqual({ orcs, undead, beasts, wildwood, labyrinth, ogres }, { orcs: 0.6, undead: 0.8, beasts: 1.46, wildwood: 1.35, labyrinth: 0.95, ogres: 0.78 });
});

test('the nemesis’s duel share carries its army’s factor, on health and attack alike', () => {
  for (const id of DUEL_MASTERED)
    for (const boss of [false, true]) {
      const plain = duelShare('knight', boss);
      const s = duelShare('knight', boss, id);
      assert.ok(Math.abs(s.hp - plain.hp * DUEL_ARMY[id]) < 1e-12, `${id} hp`);
      assert.ok(Math.abs(s.atk - plain.atk * DUEL_ARMY[id]) < 1e-12, `${id} atk`);
    }
});
