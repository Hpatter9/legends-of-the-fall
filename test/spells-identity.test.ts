// RPG-SPELLS batches 0 and 1 (docs/notes/spells-b01.md): the fixed skill keys and the movement and battlefield toolkit change no
// fight. Seeded fights of every mode, and a fight for each hero at level 1, 10 and 30, play out exactly as on main before the
// batches: every event of every tick and every fighter's end state (`tools/spells/identity.ts`; the fixture was recorded on main's
// code). A later batch that gives a hero a toolkit move re-records the scenarios it moves, and says so here.
// (STAND-RETREAT, the owner's ask, re-recorded `stand` alone: a Last Stand run now begins in the courtyard and falls back to the library after
// wave 5, where the room used to be drawn from the seed; every other scenario's hash is the one recorded on main)
// Batch 2 (the healers, docs/notes/spells-b2.md) re-recorded field30, bosses, armyFoes, spells, lands, army, stand, heroes10 and heroes30: each has the
// Cleric, High Priestess, Wanderer or Druid at level 10 or more (the Last Stand's party of eight has the Cleric at level 30). The `...Others` scenarios, whose teams never hold them, were recorded on main's
// code before the batch and did not move.
// Batch 3 (the tanks and supports, docs/notes/spells-b3.md) re-recorded field1, field30, bosses, armyFoes, spells, lands, army, stand, heroes1,
// heroes10 and heroes30: each has the Knight, Paladin, Peasant, Juggernaut, Samurai Commander, Wolf Bard or Tyrant (field1 and heroes1 at level 1,
// where the Paladin's Divine Smite and the Juggernaut's Seismic Slam are skill 1). The `...Others` scenarios now leave those seven out of every team
// (recorded on main's code before the batch) and did not move; daily, tower and calamity did not move either.
// Batch 4 (the melee heroes, docs/notes/spells-b4.md) re-recorded field30, bosses, armyFoes, spells, lands, stand, heroes10 and heroes30: each has
// one of the ten at level 10 or more (their skill 1s did not change, so the level-1 scenarios did not move). The `...Others` scenarios now leave
// the ten out of every team (recorded on main's code before the batch) and did not move; nor did field1, army, daily, tower, calamity or heroes1.
// Batch 5 (the ranged heroes and summoners, docs/notes/spells-b5.md) re-recorded field1, field30, bosses, armyFoes, spells, heroes1, heroes10 and
// heroes30: each has one of the eight (field1 and heroes1 at level 1, where the Siege Bot's Bombard, which now throws, is skill 1). The
// `...Others` scenarios now leave the eight out of every team (recorded on main's code before the batch) and did not move; nor did lands, army,
// daily, tower, stand or calamity.
// Batch 6 (the casters, docs/notes/spells-b6.md) re-recorded field1, field30, bosses, armyFoes, spells, lands, army, stand, heroes1, heroes10 and
// heroes30: each has one of the six (field1 and heroes1 at level 1, where the Warlock's Eldritch Blast, skill 1, now shoves). The `...Others`
// scenarios now leave the six out of every team (recorded on main's code before the batch) and did not move; nor did daily, tower or calamity.
// (The Yokai Witch, which borrowed the Warlock's Hex, keeps the old Hex.)
// Batch 7 (the monster heroes, docs/notes/spells-b7.md) re-recorded field1, field30, bosses, armyFoes, spells, lands, army, heroes1, heroes10 and
// heroes30: each has one of the ten. The `...Others` scenarios now leave the ten out of every team (recorded on main's code before the batch)
// and did not move; nor did daily, tower, stand or calamity. (The foes that borrow their moves, the wolf packs, the maze minotaurs and gorgons,
// the grove satyrs, the yokai and the Nine-Tailed Fox, keep the old ones: `monsterKits` puts the new ones on the heroes' own kits only.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { identityHashes } from '../tools/spells/identity';
import recorded from './fixtures/spells-identity.json';

test('every mode, and every hero at level 1, 10 and 30, plays as recorded; and with the healers left out, exactly as on main', () => {
  assert.deepEqual(identityHashes(), recorded);
});
