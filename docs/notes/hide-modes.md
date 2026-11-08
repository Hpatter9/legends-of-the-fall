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
  and `refreshOffers` takes down such an offer already on a board. 77 of the 383 quests (the `rift` giver, the Clock, Archivist, Herald,
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

## Rewards now unreachable
- Everything the Last Stand and the Calamity paid: their crowns per wave and map, Calamity trophies (the trophy wall's heralds stay
  locked), run-only items and the `rift` giver's spoils.
- Achievements `tower1` (10 crowns) and `tower20` (40 crowns, 3 stones).
- 77 quests, with crowns, stones, chests, ores, tomes, books and keepsakes. Six give a hero, so these heroes are unreachable by quest while
  hidden: Dread Pirate (`taleChainsTide`), Tyrant (`taleThroneAppeal`), Time Witch (`taleClockHour`), Dragoon (`taleEyrieNest`),
  Astrax (`mythic-astrax-trial`) and Nyxara (`mythic-nyxara-trial`). Any other way of collecting those heroes (shards) is unchanged.
- Quests that sit after a hidden quest in a chain (`after`) never appear, since the part before cannot be handed in.

No player is stuck: every hidden quest and achievement is removed from the board and list rather than left asking for something
unreachable; none is shown as a goal the page cannot send the player to.

## Tests
- New: `test/hide-modes.test.ts` (flag on; no hidden-mode quest offered even on a save with the modes open; no shown quest has a mode goal;
  the two achievements not earned or listed; the Calamity reveal not due; the camp, `enterCalamity`, `openStand`, `openMode` and the quest
  goto all guard on `modeShown`).
- Changed (each now calls `setModesHidden(false)` at the top, because it tests the modes' own rules, which stay, and asserted that the
  modes' quests, scenes and tales are offered or due): `cinematics`, `lost-techniques`, `mythic-heroes`, `quests-content`, `scene-fixes`,
  `secret-heroes`. No assertion was loosened.
- The modes' own sim tests run unchanged.

Screenshots of the camp (a save with both modes open, plates gone) are in `docs/samples/hide-modes/`
(`tools/camp/hide-modes-shots.mjs`).
