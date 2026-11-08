# Hiding the Last Stand and the Calamity

The owner: "They aren't what I want them to be... for now they're pretty bad." Both modes are hidden until they are reworked as part
of Assault mode (phase 5). Nothing is deleted: the code, the saves and the modes' own sim tests all stay.

## The switch
`src/sim/hiddenModes.ts` (pure): `modesHidden()` (default `true`), `modeShown('tower' | 'calamity')`, `questShown(q)`,
`achievementShown(id, earned)`. To bring the modes back, change the default of `hidden` to `false`. A test file that tests the modes' own
rules calls `setModesHidden(false)` (each test file runs in its own process).

## What is hidden
- **Camp overlook:** the Last Stand's watchtower plate and the Calamity citadel's plate are not built and their slots are removed
  (`home.ts`, `drawBattle`). The painted scene stays; nothing on it can be tapped. The camp's aria-label no longer mentions them.
- **Entry points:** `Home.enterCalamity`, `Main.openStand`, `Main.openMode`, the "Take me there" button for a mode goal (goes to the
  Armies instead) and the end card's "To the Calamity" button all do nothing / fall back while hidden.
- **Quests:** `canOffer` refuses a quest that needs either mode (its `needs`, an objective on a mode, or a Last Stand / Calamity goal),
  and `refreshOffers` takes down such an offer already on a board. 77 of the 383 quests (now 60: the 17 quests of six hero chains were re-pointed, see below) (the `rift` giver, the Clock, Archivist, Herald,
  Falconer, Gaoler and others). A quest already taken stays in the log and can be dropped; its destination falls back to the Armies.
- **Achievements:** "Hold the Keep" (`tower1`) and "Last Stand" (`tower20`) are not listed, counted or earned. One already earned
  stays listed and claimable.
- **Tips:** the `tower` and `calamity` tips wait; the crowns tip no longer promises the modes.
- **Scenes:** the Calamity's reveal (`calOpen`) and its story scenes are not due; no cinematic queues when stars would open it.
- **Trophy wall:** a locked herald's text no longer tells the player to go to the Spire or Calamity.
- **Developer menu:** it only grants crowns, shards and stones; it had no mode entries, so nothing changed.

## Saves
Nothing is deleted or rewritten. A run in `legends.stand`, `legends.tower` or `legends.calamity` stays in its slot, untouched, and is
simply not offered. `Meta.opened`, `stand`, `calamity` and the rest are untouched. (The existing `migrateOldClimb` at startup is as before.)

## Heroes stay earnable (the director's must-fix)
While the modes are hidden, the six hero chains that ran through them are re-pointed (`src/sim/questRetune/hiddenModes.ts`, applied by
`questData.ts` only while `modesHidden()`; `setModesHidden` rebuilds `QUESTS` in place, so the original goals come back with the modes).
Every part of each chain was re-pointed, not only the last, since each part's needs or goal ran through a mode. Story, giver, ids, pay and
the final quest battle are unchanged; the words of a part that named a mode are rewritten.

| Hero (final quest) | Was | Now |
| --- | --- | --- |
| Dread Pirate (`taleChainsTide`) | wave 10 of the Last Stand, 40 skeletons, the battle | win 20 army waves, 40 skeletons, the battle; needs 3 armies |
| Tyrant (`taleThroneAppeal`) | wave 30 of the Last Stand, hold the line 3 times, the battle | 3 Hard or harder army bosses, clear 3 dailies, the battle; needs 6 armies |
| Time Witch (`taleClockHour`) | 2 Calamity guardians (map 4+), the battle | 4 Hard or harder army bosses, the battle; needs 5 armies |
| Dragoon (`taleEyrieNest`) | clear a Calamity twice, 40 ogre foes, the battle | clear an army on Elite or harder twice, 40 ogre foes, the battle; needs 6 armies and an Elite clear |
| Astrax (`mythic-astrax-trial`) | 6 guardians (map 4+), 2 Calamities without a heart, the trial | 8 Legendary or harder army bosses, 2 Legendary or harder clears without a heart, all without a Mythic, the trial; needs 7 armies, a Legendary clear, level 75 |
| Nyxara (`mythic-nyxara-trial`) | 8 guardians (map 5+), 6 Legendary bosses without ultimates, the trial | 4 Mythic-tier army bosses without a Mythic, the unchanged 6 Legendary bosses without ultimates, the trial; needs 9 armies, a Mythic-tier clear, 75% of the bestiary, level 80 |

No new goal kind was added, so the Nemesis War is not used. Anything that follows these quests appears again. `isMythicQuest` now
compares by id, since a patched quest is a new object.

## Rewards now unreachable
- Everything the Last Stand and the Calamity paid: their crowns per wave and map, Calamity trophies (the trophy wall's heralds stay
  locked) and the `rift` giver's spoils.
- Achievements `tower1` (10 crowns) and `tower20` (40 crowns, 3 stones).
- The pay of the 60 quests still hidden (crowns, stones, chests, ores, tomes, books, keepsakes). No hero is among them: all six
  hero-giving chains above are re-pointed. (Quests that follow a still-hidden quest in a chain never appear.)

No player is stuck: every hidden quest and achievement is removed from the board and list rather than left asking for something
unreachable.

## Tests
- New: `test/hide-modes.test.ts` (flag on; no hidden-mode quest offered even on a save with the modes open; no shown quest has a mode goal;
  the two achievements not earned or listed; the Calamity reveal not due; the camp, `enterCalamity`, `openStand`, `openMode` and the quest
  goto all guard on `modeShown`).
- Changed (each now calls `setModesHidden(false)` at the top, because it tests the modes' own rules, which stay, and asserted that the
  modes' quests, scenes and tales are offered or due): `cinematics`, `lost-techniques`, `mythic-heroes`, `quests-content`, `scene-fixes`,
  `secret-heroes`. No assertion was loosened.
- New in this pass: every hero, tale hero and Mythic has a reachable earning path while hidden (each chain's parts offered, none with a mode
  goal, every quest battle exists); the original goals return with `setModesHidden(false)`; the Mythic chains stay at Legendary tier or above.
- The modes' own sim tests run unchanged.

Screenshots of the camp (a save with both modes open, plates gone) are in `docs/samples/hide-modes/`
(`tools/camp/hide-modes-shots.mjs`).
