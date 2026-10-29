> Hero rarity was removed later (see `no-rarity.md`): where this note gives a hero a tier, rarity frame or tier bonus, that no longer applies.

# Army stars, tiers and chests (army-stars)

The Armies screen is now a full-screen carousel, each army has **10 stars over four difficulty tiers**, and the 3rd, 5th and 10th
star each give a **chest**.

## The carousel (`src/armiesView.ts`)

One card an army, swiped left and right with scroll-snap (arrows and dots too; a dot glows gold when its army has a chest
waiting). It opens on the furthest unlocked army, or on the army just cleared when that run earned a chest (`focus`). The card
fills the page between the top bar and the tab bar (`#hmSub.armies` takes the `pages` grid area; a tap on a tab leaves it).

- **The scene** (it takes all the page's slack above the info, Fight! pinned at the bottom; a locked card has the same layout, greyed, with a disabled Locked button): the land's parallax backdrop layers (`backdropFiles`), the army's troops in two ranks of
  idle sprites (the foes' real sheets, each at the whole-number scale nearest to a common 84 px figure height, so the ranks stand level, through `sprite(sheet, _, whole)`; facing the viewer's left as
  the foes do, depth-sorted by height), the mid-bosses beside the boss and the **boss large at the back** (the whole-number scale that makes it about 1.75x a troop, 1.4x for a mid-boss). A lighting mood per army (`MOODS`): embers, soul fire, snow, leaves, fog, sparks, lanterns or dust particles, a
  colour tint and a vignette. The layers drift slowly and slide with the swipe (`--par`), the crowd a little the other way.
  The title sits in the ribbon. A **locked** army is the same scene darkened, the troops pure silhouettes, with
  "Defeat the <boss> to unlock". Troops idle only on the cards next to the one showing (the timer stops with the page).
- **Below**: the blurb, the four tier picks (Normal / Hard / Elite / Legendary, with their stars and "needs N stars" while
  shut), the 10-star track with a chest under the 3rd, 5th and 10th star, the three conditions of the picked tier (earned ones lit),
  the first-clear and replay crowns for the tier, the foes' multipliers, and the Fight! button. A run going shows
  Continue / Restart as before (a second tap confirms leaving).
- No new art: the chest is the Craftpix platformer tileset's chest (closed and open frames, `src/art/ui/chest-*.png`, iron bands tinted bronze, silver and gold; see `CREDITS.md`) used on the cards, in the stash and in the opening (the lid-burst became a swap to the open frame with a pop and the light), the scenes are existing
  sheets and backdrops. **PixelLab was not used (0 generations).**

## Stars (`src/sim/tiers.ts`, `src/sim/armyStars.ts`, `src/sim/armies.ts`)

| Tier | Stars | Opens at | Foes hp / atk / speed | Crowns | XP |
| --- | --- | --- | --- | --- | --- |
| Normal | 1-3 | the army | x1 / x1 / x1 (as it was) | x1 | x1 |
| Hard | 4-6 | 3 stars | x1.35 / x1.2 / x1.05 | x1.6 | x1.5 |
| Elite | 7-9 | 6 stars | x1.85 / x1.5 / x1.1 | x2.5 | x2.2 |
| Legendary | 10 | 9 stars | x2.8 / x2.0 / x1.15 | x4 | x3.5 |

- A run's stars come from the **whole army run** (`Run.tally`, filled by `noteFight` after each fight): on Normal, Hard and Elite,
  **1** clear the army, **2** clear without using a heart (until 0.234.0 this was "no hero lost in the last boss fight"; the owner swapped it for the heart, which is easier to earn), **3** clear within a battle-time target
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

## Chests and the stash (`src/chestStash.ts`, `src/sim/armyStars.ts`)

At 3 / 5 / 10 stars an army earns a **bronze / silver / gold** chest, once each (`ArmyRecord.chests` records the milestones given, so
`grantChests` is idempotent). The chest goes straight into **`Meta.stash`**, an ordered list of unopened chests
`{army, at, tier, seed}`. It is **not** opened on the army card: the card only marks the milestone earned (a small chest icon with a tick).
The result screen says a chest was added to the stash.

- **The stash** is its own module, `src/chestStash.ts`: `drawChestStash(host, meta, onChange)` fills a host element, and the home screen
  mounts it in `drawBattle` as `.csStash` (a stack down the left of the Battle tab, clear of the Battle! button and the hero lineup;
  nothing shows when empty; four chests are shown, with a "+N" badge for more). To move it, mount the same call somewhere else and move the
  `.csStash` CSS. A tap opens that chest: `openChest(meta, index)` removes it from the stash and pays it once, then `showChest` plays the
  opening (the chest shakes, the lid bursts off in light and rays, sparks fly, the rewards drop into cards one by one, a tap hurries it, then
  Collect).
- **Deterministic per chest**: the seed is fixed **when the chest is earned** (`chestSeed` = `mixSeed(saveSeed, 0xc4e57, armyIndex + 1, milestone)`
  and stored in the stash entry), and `rollChest(seed, army, milestone, tier)` draws only from it, so the order of opening does not matter and
  a reload cannot reroll.
- **Contents**: crowns (150 / 420 / 1300 x (1 + 0.32 x army index) x (1 + 0.15 x tier), +-15%); shards for random heroes (owned or not) by the pull
  rarity weights tilted to the rarer by quality `1 + 0.28 x (step - 1) + 0.06 x army index + 0.1 x tier` (2 / 3 / 5 draws); silver: a 30%+ chance of a
  Rare-or-better recruit; **gold: a guaranteed hero** (Epic or better; Legendary or better from the 4th army, a Mythic from the 8th; a new hero is
  unlocked, an owned one pays 2 shards).
- **The `gear` hook**: relics and run gear are no longer in chests (they were, in an earlier version of this branch, via a vault; that is gone).
  `rollGear(rng, step, armyIdx, tier): GearDrop[]` in `armyStars.ts` is the typed slot for permanent hero gear and **rolls nothing yet**;
  `rollChest` returns `gear` from it, `LootItem` has a `gear` type, and the reveal shows any it returns. It draws **last** from the chest's own stream, so
  filling it in later does not change any other reward of any chest. The follow-up worker adds the gear itself and the hero-gear store.

## Saves

`migrateArmies`: an army already beaten gets its Normal clear star (`met: {0: 1}`), plus the "no hero lost" star when its last wave had all
three old stars; the old per-wave stars are kept. No chest is given by migration (it never reaches 3 stars), and chests given or opened are
only ever added. `loadMeta` reads `met`, `hard`, `chests` and `stash` defensively (masks cut to the tier's stars, milestones filtered) and
an empty `stash` for older saves. A save from the earlier chest format (given and `opened` lists on the army record, a vault) keeps its **unopened** chests:
`readStash` moves each given-but-not-opened milestone into the stash with the seed it would have been earned with (the vault, never released, is dropped), and none is added twice.

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

Tier numbering and unlock order; stars capped at 3 a run (and Legendary's one); the three conditions; the best-ever merge; a milestone puts a chest in
the stash exactly once (not again on later runs or loads), opening removes it and pays it once, in any order; deterministic chest contents (fixed by
save seed, army and milestone; independent of crowns, pulls and opening order; survives a save and reload); reward scaling by milestone, army and
tier (crowns, item counts, rarity); the 10-star chest's guaranteed hero by army; the gear hook rolling nothing; the stash's save checks and the
earlier chest format's migration; foe scaling by tier (hp, attack, speed, a fight's foes, Normal unchanged,
deterministic); tier pay with its own firsts and clears, and only Normal opening the next army; the run tally; save migration and the loader's checks.

## Screenshots

`docs/samples/army-stars-*.png` at 393x852 (plain names) and `-360x780`, `-412x915`, made by `node tools/armies/shots-stars.mjs out/web`:
`fresh` (the carousel on a fresh save), `mid` and `mid-prev` (mid-progress, with Hard picked), `locked`, `stash` and `stash-many` (the Battle tab's chest stash, with the badge), `chest` (the army card with its milestones ticked), `chest-shake`,
`chest-burst`, `chest-loot`, `chest-after`, `gold-army` and `gold-loot` (a gold chest from the 8th army, opened from the stash), `result` (the stars on the result screen).

## Steady backdrops

The army cards' backdrop layers no longer drift (`.asLayer` in src/pixel.css, `animation: none`). The drift slid the scaled
pixel-art layers by fractions of a pixel in sixty steps, so the mountains shimmered and seemed to tear on every step. The
layers now stand still, offset by a whole number of pixels for the parallax depth; the embers, dust and fog still move.
