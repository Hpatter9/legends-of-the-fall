// STATUS-FX step one: moving the old effects (damage over time, holds, slows, curses, cleanses) into the one ailment model changed
// nothing. With the new ailments switched off, seeded fights of every mode play out exactly as they did on main before the change:
// the same events, tick by tick, and the same health at the end (`tools/status-fx/logs.ts`; the fixture was recorded on main's code).
// (TIER-PROMISES re-recorded three of its scenarios, `army`, `daily` and `tower`, whose merged heroes' tier skills now do what their words say: the
// owner's ask, `docs/notes/tier-promises.md`. Only those three moved; the proof stands for every other mode.)
// (RPG-SPELLS batch 2, docs/notes/spells-b2.md, re-recorded field30, bosses, armyFoes, spells, lands, army and stand: each has the Cleric, High Priestess,
// Wanderer or Druid at level 10 or more, whose kits the owner approved reworking (the revive, Spirit Guardians, Healing Mist...). Only those moved.)
// (RPG-SPELLS batch 3, docs/notes/spells-b3.md, re-recorded field1, field30, bosses, armyFoes, spells, lands, army and stand: each has one of the
// tanks and supports the owner approved reworking (Shield Rush, Divine Smite, Seismic Slam, Tunnel Strike, Bane...). Only those moved.)
// (RPG-SPELLS batch 4, docs/notes/spells-b4.md, re-recorded field30, bosses, armyFoes, spells, lands and stand: each has one of the melee heroes at
// level 10 or more, whose kits the owner approved reworking (Cavalry Charge, Lightning Storm, Berserker Leap, Dragon Dive...). Only those moved.)
// (RPG-SPELLS batch 5, docs/notes/spells-b5.md, re-recorded field1, field30, bosses, armyFoes and spells: each has one of the ranged heroes or
// summoners the owner approved reworking (Bombard's and the Orbital Strike's throws, the Powder Keg, the leaping wolves, the Reaper's drag...).
// Only those moved.)
// (RPG-SPELLS batch 6, docs/notes/spells-b6.md, re-recorded field1, field30, bosses, armyFoes, spells, lands, army and stand: each has one of the
// casters the owner approved reworking (the Wall of Fire, Eldritch Blast, Call Lightning, the Circle of Death...). Only those moved.)
// (RPG-SPELLS batch 7, docs/notes/spells-b7.md, re-recorded field1, field30, bosses, armyFoes, spells, lands and army: each has one of the
// monster heroes the owner approved reworking (Mass Polymorph, Swoop, Gust of Wind, Pounce, Contagion, Tidal Wave...). Only those moved.)
// (SUMMON-TIMERS, the owner's ask for summons and shapeshifts on a timer, docs/notes/summon-timers.md, re-recorded field30, bosses, armyFoes and
// spells: each has the Druid, Beastmaster, Reaper, Samurai Commander, Werewolf, Kitsune or Demon Swordsman at level 10 or more, whose wraith,
// standard and shapes now last longer. Only those moved.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scenarioHashes } from '../tools/status-fx/logs';
import { AILMENT_SWITCH } from '../src/sim/ailments';
import recorded from './fixtures/ailment-logs.json';
import { ARMIES } from '../src/sim/armies';
import { CAL_SCALE } from '../src/sim/calamity';
import { DAILY_ANSWER } from '../src/sim/modes';
import { KITS } from '../src/sim/abilities';
import { BOSS_BIG } from '../src/sim/bossAttacks';

// (MERGE-TWO, the owner's change to merging, re-recorded the three scenarios that hire and merge: `army`, `daily` and `tower` (two of a kind merge,
// by the greedy player's Auto merge, and the spire's foes grow faster); every other scenario's hash is the one recorded on main)
// (MID-EVENTS, the owner's ask for more events between waves, re-recorded `daily`: its gaps can bring the road's cards, whose hazards the greedy
// player must answer (a card with no way off); `army` and every other scenario keep their hashes)
// (STAND-RETREAT, the owner's ask, re-recorded `stand`: a Last Stand run now begins in the courtyard and falls back to the library after wave 5,
// where the room used to be drawn from the seed; every other scenario keeps its hash)
// (ONE-OF-EACH, the owner's rule of one unit of a hero on the field, docs/notes/one-of-each.md, re-recorded `army` and `daily`: the greedy player
// fields one of each kind, where it fielded two of a kind before; `daily` again for its foes' new start, `DAILY_START` 0.565; every other
// scenario keeps its hash)
// (RELICS-2, the owner's approved relic redesign, docs/notes/relics-2.md, re-recorded `army`, `daily` and `stand`: the greedy player finds and
// buys relics on the way, and the relics' rules and draws are new; every other scenario keeps its hash)
// (SPELLS-RETUNE, the owner's call to tune the game for a player whose Auto casts the king's spells, docs/notes/spells-retune.md, re-recorded
// `daily` and `stand` alone: the daily's foes start stronger (`DAILY_START` 0.565 to 0.76) and the Last Stand's waves are eased less (`HALL_EASE`
// 0.88 to 1.2). The armies' and the Calamity's raised strengths are put back for this proof, and its greedy players cast no spells; every other
// scenario keeps its hash)
// (BOSS-BIG, the owner's ask for bosses with huge attacks, docs/notes/boss-big-attacks.md: the bosses' signature attacks are switched off for
// this proof, as the ailments are; with them off every scenario plays as recorded)
// (the balance pass that followed, step two, moved a few foe strengths and the Shambler's Plague Tide to answer the ailments: they are put back to
// main's for this proof)
// (XP-SPLIT, the owner's ask for a fight's kill XP to be shared, docs/notes/xp-split.md, re-recorded `daily`: its greedy player levels its
// heroes from the XP of each fight as it goes, and the split moves which hero levels when, so its later fights move; every other scenario
// keeps its hash, the fights themselves are unchanged; then `tower` too, when the spire and the Calamity took the same split: its heroes level
// from their own run XP fight by fight. `calamity` did not move)
// (SKILLS-1, the skills overhaul's batch 2, docs/notes/skills-1.md, re-recorded every scenario: field1, field30, bosses, armyFoes, spells, lands,
// army, daily, tower, stand and calamity. Every hero's skills now cost and cool by their class, so every fight with a hero moves; batch 1 moved none.)
// (SKILLS-1 batch 3, docs/notes/skills-1.md, re-recorded army, daily and tower, the scenarios with merged heroes, whose tier skills went; the rest kept
// their hashes)
// (SKILLS-4, the skills overhaul's batch 4, docs/notes/skills-4.md: every hero's skill 3, open from level 20, re-recorded field30, bosses, armyFoes,
// spells, army and stand, the scenarios with heroes at level 20 or more; field1, lands, daily, tower and calamity kept their hashes)
// (STATS-2, the D&D stats design's batch 2, docs/notes/stats-2.md: the scores move every scenario with a hero above level 1, rank 1 or grade 1.
// Re-recorded field30, bosses, armyFoes, spells, lands, army, daily, tower and stand, by the test's own hashes; field1 and calamity kept theirs)
// (STATS batch 4, "AC and the blow", docs/notes/stats-4.md, re-recorded every scenario: the blows' d20 against Armour Class, initiative, and
// the dodges and tall grass as Armour Class move every fight. The new hashes: field1 750d7f85, field30 9985c20a, bosses ed8d0233, armyFoes
// e78dd722, spells 8d8d569b, lands 2ee6e036, army 2758d962, daily b2d1b62a, tower 8b2517af, stand 1a34e1e0, calamity 0a98c5c7.)
test('with the new ailments off, every mode plays as it did before the ailment model', () => {
  const was = AILMENT_SWITCH.on;
  const infernal = ARMIES.find((a) => a.id === 'infernal') as unknown as { start: number };
  // (LATE-RETUNE made the Yokai and the Golem Forge tougher on Normal, `docs/notes/late-retune.md`: put back to the strengths recorded)
  type Strength = { start: number; mid?: { hp: number; atk: number }; last?: { hp: number; atk: number } };
  const yokai = ARMIES.find((a) => a.id === 'yokai') as unknown as Strength;
  const golems = ARMIES.find((a) => a.id === 'golems') as unknown as Strength;
  const undead = ARMIES.find((a) => a.id === 'undead') as unknown as { start: number };
  const late = { yokai: { ...yokai }, golems: golems.start, undead: undead.start, calStart: CAL_SCALE.start };
  const plague = KITS.shambler.ultimate!.tuned!;
  const tuned = { start: infernal.start, bossHp: CAL_SCALE.bossHp, ult: DAILY_ANSWER.ult, plague: plague.power };
  AILMENT_SWITCH.on = false;
  infernal.start = 10;
  Object.assign(yokai, { start: 12.5, mid: { hp: 2200, atk: 52 }, last: { hp: 2500, atk: 50 } });
  golems.start = 12.7;
  // (SPELLS-RETUNE raised the Undead Legion's start and the Calamity's, docs/notes/spells-retune.md: put back to the strengths recorded)
  undead.start = 1.48;
  CAL_SCALE.start = 0.435;
  CAL_SCALE.bossHp = 1;
  DAILY_ANSWER.ult = 0.17;
  plague.power = 0.99;
  BOSS_BIG.on = false;
  try {
    assert.deepEqual(scenarioHashes(), recorded);
  } finally {
    BOSS_BIG.on = true;
    AILMENT_SWITCH.on = was;
    infernal.start = tuned.start;
    Object.assign(yokai, late.yokai);
    golems.start = late.golems;
    undead.start = late.undead;
    CAL_SCALE.start = late.calStart;
    CAL_SCALE.bossHp = tuned.bossHp;
    DAILY_ANSWER.ult = tuned.ult;
    plague.power = tuned.plague;
  }
});
