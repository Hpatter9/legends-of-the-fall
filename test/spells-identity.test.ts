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
// SUMMON-TIMERS (the owner's ask: summons and shapeshifts on a timer, kept from wave to wave; docs/notes/summon-timers.md) re-recorded field30,
// bosses, spells, heroes10 and heroes30: each has the Druid, Beastmaster, Reaper, Samurai Commander, Werewolf, Kitsune or Demon Swordsman at
// level 10 or more, whose wraith, standard and shapes now last longer. The `...Others` scenarios now leave those seven out of every team
// (recorded on main's code before this work) and did not move; nor did field1, armyFoes, lands, army, daily, tower, stand, calamity or heroes1.
// RELICS-2 (the owner's approved relic redesign, docs/notes/relics-2.md) re-recorded army, daily and stand: the greedy player finds and buys the
// new relics on the way. Only those moved.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { identityHashes } from '../tools/spells/identity';
import recorded from './fixtures/spells-identity.json';
import { BOSS_BIG } from '../src/sim/bossAttacks';

// (ONE-OF-EACH, the owner's rule of one unit of a hero on the field, docs/notes/one-of-each.md, re-recorded `army` and `daily`: the greedy player
// fields one of each kind, where it fielded two of a kind before; `daily` again for its foes' new start, `DAILY_START` 0.565; every other
// scenario keeps its hash)
// (BOSS-BIG, the owner's ask for bosses with huge attacks, docs/notes/boss-big-attacks.md: the bosses' signature attacks, and the heroes'
// stepping out of their marks, are meant to move every fight with a boss in it. With them switched off every scenario plays as recorded;
// with them on, the scenarios with no boss (every field fight, every hero alone, the tower's and the Calamity's early floors) still do, so
// the dodge changes nothing where no boss has marked the ground. Only bosses, armyFoes, army, daily and stand move.)
// (XP-SPLIT, the owner's ask for a fight's kill XP to be shared, docs/notes/xp-split.md, re-recorded `daily`: its greedy player levels its
// heroes from the XP of each fight as it goes, and the split moves which hero levels when, so its later fights move; every other scenario
// keeps its hash, the fights themselves are unchanged; then `tower` too, when the spire and the Calamity took the same split: its heroes level
// from their own run XP fight by fight. `calamity` did not move)
test('every mode, and every hero at level 1, 10 and 30, plays as recorded; and with the healers left out, exactly as on main', () => {
  BOSS_BIG.on = false;
  try {
    assert.deepEqual(identityHashes(), recorded);
  } finally {
    BOSS_BIG.on = true;
  }
});

test('with the bosses\u2019 signature attacks on, every scenario without a boss still plays as recorded', () => {
  const moved = ['bosses', 'armyFoes', 'army', 'daily', 'stand'];
  const rest = Object.keys(recorded).filter((k) => !moved.includes(k));
  assert.deepEqual(identityHashes(rest), Object.fromEntries(rest.map((k) => [k, (recorded as Record<string, string>)[k]])));
  const now = identityHashes(moved);
  for (const k of moved) assert.notEqual(now[k], (recorded as Record<string, string>)[k], `${k} has a boss whose signatures move it`);
});
