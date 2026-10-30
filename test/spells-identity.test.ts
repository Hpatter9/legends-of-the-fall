// RPG-SPELLS batches 0 and 1 (docs/notes/spells-b01.md): the fixed skill keys and the movement and battlefield toolkit change no
// fight. Seeded fights of every mode, and a fight for each hero at level 1, 10 and 30, play out exactly as on main before the
// batches: every event of every tick and every fighter's end state (`tools/spells/identity.ts`; the fixture was recorded on main's
// code). A later batch that gives a hero a toolkit move re-records the scenarios it moves, and says so here.
// (STAND-RETREAT, the owner's ask, re-recorded `stand` alone: a Last Stand run now begins in the courtyard and falls back to the library after
// wave 5, where the room used to be drawn from the seed; every other scenario's hash is the one recorded on main)
// Batch 2 (the healers, docs/notes/spells-b2.md) re-recorded field30, bosses, armyFoes, spells, lands, army, stand, heroes10 and heroes30: each has the
// Cleric, High Priestess, Wanderer or Druid at level 10 or more (the Last Stand's party of eight has the Cleric at level 30). The `...Others` scenarios, whose teams never hold them, were recorded on main's
// code before the batch and did not move.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { identityHashes } from '../tools/spells/identity';
import recorded from './fixtures/spells-identity.json';

test('every mode, and every hero at level 1, 10 and 30, plays as recorded; and with the healers left out, exactly as on main', () => {
  assert.deepEqual(identityHashes(), recorded);
});
