# Army stars, tiers and chests (army-stars)

The Armies screen is now a full-screen carousel, each army has **10 stars over four difficulty tiers**, and the 3rd, 5th and 10th
star each give a **chest**.

## The carousel (`src/armiesView.ts`)

One card an army, swiped left and right with scroll-snap (arrows and dots too; a dot glows gold when its army has a chest
waiting). It opens on the furthest unlocked army, or on the army just cleared when that run earned a chest (`focus`). The card
fills the page between the top bar and the tab bar (`#hmSub.armies` takes the `pages` grid area; a tap on a tab leaves it).

- **The scene** (top ~41%): the land's parallax backdrop layers (`backdropFiles`), the army's troops in two ranks of
  idle sprites (the foes' real sheets, drawn at whole-number scales through `sprite(sheet, _, whole)`, facing the viewer's left as
  the foes do, depth-sorted by height), the mid-bosses beside the boss and the **boss large at the back** (2x where its sheet
  is small). A lighting mood per army (`MOODS`): embers, soul fire, snow, leaves, fog, sparks, lanterns or dust particles, a
  colour tint and a vignette. The layers drift slowly and slide with the swipe (`--par`), the crowd a little the other way.
  The title sits in the ribbon. A **locked** army is the same scene darkened, the troops pure silhouettes, with
  "Defeat the <boss> to unlock". Troops idle only on the cards next to the one showing (the timer stops with the page).
- **Below**: the blurb, the four tier picks (Normal / Hard / Elite / Legendary, with their stars and "needs N stars" while
  shut), the 10-star track with a chest under the 3rd, 5th and 10th star, the three conditions of the picked tier (earned ones lit),
  the first-clear and replay crowns for the tier, the foes' multipliers, and the Fight! button. A run going shows
  Continue / Restart as before (a second tap confirms leaving).
- No new art: the chests are three tiles of DawnLike (`src/art/ui/chest-*.png`, see `CREDITS.md`), the scenes are existing
  sheets and backdrops. **PixelLab was not used (0 generations).**

## Stars (`src/sim/tiers.ts`, `src/sim/armyStars.ts`, `src/sim/armies.ts`)

| Tier | Stars | Opens at | Foes hp / atk / speed | Crowns | XP |
| --- | --- | --- | --- | --- | --- |
| Normal | 1-3 | the army | x1 / x1 / x1 (as it was) | x1 | x1 |
| Hard | 4-6 | 3 stars | x1.35 / x1.2 / x1.05 | x1.6 | x1.5 |
| Elite | 7-9 | 6 stars | x1.85 / x1.5 / x1.1 | x2.5 | x2.2 |
| Legendary | 10 | 9 stars | x2.8 / x2.0 / x1.15 | x4 | x3.5 |

- A run's stars come from the **whole army run** (`Run.tally`, filled by `noteFight` after each fight): on Normal, Hard and Elite,
  **1** clear the army, **2** no hero lost in the last boss fight, **3** clear within a battle-time target
  (`timeTarget` = 26 s a wave, a little more on harder tiers, shown as m:ss). Legendary's single star is **flawless: no hero lost in
  any boss fight** (the mid-bosses too; a whole-run flawless was met by about one clear in ten even by a maxed-castle level-20 team,
  so it was loosened to the boss fights). Summoned helpers falling never count.
- **Best ever per tier**: the conditions met are kept as a bitmask per tier (`ArmyRecord.met`), and a replay merges (OR) into it, so it
  adds only conditions still missing. `settleArmyRun` returns which conditions were new, the army's total and any chest reached; the
  result screen shows them (`drawRunStars`, `#armyStars`). At most 3 stars a run by construction.
- **Foes by tier**: `waveBoost(army, wave, tier)` multiplies the foes' hp and attack and sets `Boost.speed`, which `startBattle`
  stores as `Battle.foeSpeed` and `speedOf` applies to the foes only (steps and swings). `RunMode.tier` carries the tier (omitted for
  Normal, so old saved runs and Normal are unchanged).
- **Pay**: crowns of a tier = Normal's amount x the tier's pay (`tierCrowns`); each harder tier keeps its own waves won and clears
  (`ArmyRecord.hard`), so its first win pays full and later ones the replay share. Only the first **Normal** clear opens the next army.
  XP of a fight is multiplied by the tier's `xp`.
- The old per-wave star rating (`stars.ts`) still pays crowns and gold per fight; it is no longer shown on the cards. The top
  bar's star total and achievements read the army stars (`armyStars`, now out of 10 an army); `Meta.stars` (the endless climb's) is untouched.

## Chests

At 3 / 5 / 10 stars an army gets a **bronze / silver / gold** chest, once each (`ArmyRecord.chests`, given by `grantChests`, which is
idempotent; opened ones in `ArmyRecord.opened`). A ready chest glows and bobs under its star; tapping it plays the opening
(`showChest`): the chest shakes, the lid bursts off in a flare of light and rays, sparks fly, the rewards drop into cards one by
one (a tap hurries it), then Collect.

- **Seeded**: `rollChest(seed, army, milestone)` draws from `new Rng(mixSeed(seed, 0xc4e57, armyIndex + 1, milestone))`, independent of the
  meta's other state, so reloading cannot reroll; `openChest` applies it to the meta and refuses a chest not ready or already opened.
- **Contents**: crowns (150 / 420 / 1300 x (1 + 0.32 x army index), +-15%); shards for random heroes (owned or not) by the pull
  rarity weights tilted to the rarer by quality `1 + 0.28 x (step - 1) + 0.06 x army index` (2 / 3 / 5 draws); silver: a relic (and
  often a tier-2 piece of gear) and a 30%+ chance of a Rare-or-better recruit; bronze: a 40% chance of a relic or gear; **gold: a guaranteed hero**
  (Epic or better; Legendary or better from the 4th army, a Mythic from the 8th, a new hero is unlocked, an owned one pays 2 shards), shards,
  a relic, two pieces of gear (one a tier up). Relics and gear go to `Meta.vault` and **a new run starts with them** (`takeVault` in the
  page's army start), because relics and gear only live inside a run.

## Saves

`migrateArmies`: an army already beaten gets its Normal clear star (`met: {0: 1}`), plus the "no hero lost" star when its last wave had all
three old stars; the old per-wave stars are kept. No chest is given by migration (it never reaches 3 stars), and chests given or opened are
only ever added. `loadMeta` reads `met`, `hard`, `chests` and `opened` defensively (masks cut to the tier's stars, milestones filtered) and
an empty `vault` for older saves.

## Balance (`npm run balance -- --no-tables --tiers --levels 8,14,20 --attempts 16`, raw output in `docs/samples/army-stars-balance.txt`)

Normal is unchanged (the first table re-run gives the Orc Warband 40/100/100%, Undead 0/10/80%, Beasts 0/0/30% at levels 5/8/11, as in `armies.md`).
Table 5e plays the recruits party (Knight, Paladin, Archer, Warlock, Cleric) with a maxed castle and gear: % of attempts that cleared / mean
stars of a clear. Level 8 / 14 / 20 (Normal | Hard | Elite | Legendary):

| Army | Level 8 | Level 14 | Level 20 |
| --- | --- | --- | --- |
| Orc Warband | 100 / 100 / 100 / 25 | 100 / 100 / 100 / 88 | 100 / 100 / 100 / 94 |
| Undead Legion | 100 / 94 / 56 / 6 | 100 / 100 / 100 / 6 | 100 / 100 / 100 / 25 |
| Beast Packs | 100 / 69 / 6 / 0 | 100 / 100 / 75 / 0 | 100 / 100 / 94 / 0 |
| The Wildwood | 69 / 44 / 0 / 0 | 88 / 69 / 0 / 0 | 94 / 88 / 6 / 0 |
| The Labyrinth | 69 / 31 / 0 / 0 | 94 / 50 / 0 / 0 | 100 / 75 / 0 / 0 |
| Ogre Clans | 69 / 19 / 0 / 0 | 94 / 56 / 0 / 0 | 100 / 69 / 0 / 0 |
| Infernal Host | 25 / 0 / 0 / 0 | 75 / 19 / 0 / 0 | 100 / 25 / 0 / 0 |
| Yokai Night Parade | 6 / 0 / 0 / 0 | 50 / 0 / 0 / 0 | 69 / 6 / 0 / 0 |
| Golem Forge | 6 / 0 / 0 / 0 | 25 / 6 / 0 / 0 | 69 / 6 / 0 / 0 |

The tiers rise steeply: from the Beast Packs on, Elite wants a level-14 team with a maxed castle, and Legendary (x2.8 hp, x2 attack, x1.15
speed, then also a flawless boss fight) is out of reach of this bot everywhere but the first two armies at level 14 and up; its star was
earned by about one clear in ten. That is the point: it wants a strong, levelled, evolved team (mythics, ranks, grades, the king's spells).
The Hard multipliers were first 1.45 / 1.3 and Legendary 3.1 / 2.2; the later armies went to 0% on Hard, so they were eased to the numbers above.

## Tests (`test/armyStars.test.ts`)

Tier numbering and unlock order; stars capped at 3 a run (and Legendary's one); the three conditions; the best-ever merge; chests given exactly
once (and not again on later runs, loads or migration) and opened once; deterministic chest contents (same seed, army and milestone; independent of
crowns and pulls; survives a save and reload); reward scaling by milestone and army (crowns, item counts, rarity); the 10-star chest's guaranteed hero
by army; opening pays the meta and the vault goes into the next run once; foe scaling by tier (hp, attack, speed, a fight's foes, Normal unchanged,
deterministic); tier pay with its own firsts and clears, and only Normal opening the next army; the run tally; save migration and the loader's checks.

## Screenshots

`docs/samples/army-stars-*.png` at 393x852 (plain names) and `-360x780`, `-412x915`, made by `node tools/armies/shots-stars.mjs out/web`:
`fresh` (the carousel on a fresh save), `mid` and `mid-prev` (mid-progress, with Hard picked), `locked`, `chest` (two chests glowing), `chest-shake`,
`chest-burst`, `chest-loot`, `chest-after`, `gold-army` and `gold-loot` (a gold chest on the 8th army), `result` (the stars on the result screen).
