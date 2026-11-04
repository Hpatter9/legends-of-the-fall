# The king's spells, batch 6: the re-measure (KING-SPELLS)

The last batch of the owner-approved revamp's game rules ([king-spells-design.md](king-spells-design.md); batches 1 to 4:
[b1](king-spells-b1.md), [b2](king-spells-b2.md), [b3](king-spells-b3.md), [b4](king-spells-b4.md)). Batch 5, the new spells' own art, sounds
and Decree voices, waits for the image credits, so the director asked for this first. The schools, the Decrees and the ranks change what the
king does in every fight. The difficulty was re-measured for a player who plays them, and the knobs that moved were turned back.

## 1. The bot plays the default ruler (`tools/autoplay.ts`)

- `botLoadout(castle, meta)`: the Iron Stag's school of Steel, fitted as `fitSchool` fits a save, from the spells known: the starting three,
  the school's first two, and what the castle's Mage Tower has taught. Heal goes in the open slot. A fresh save casts **Rally, Shield, Heal**;
  a tower at 1 adds Smite, at 3 Light Lance. (It cast Heal, Meteor and Haste at every stage before: `spells-retune.md`.)
- `maybeSpells` also arms the Iron Stag's Decree (Stand Fast) and puts the ranks on the fight (`botRanks`). The bot has one mark for each
  Mage Tower level and each army cleared, spent a rank at a time round its spells in order.
- The Last Stand (`tools/stand-balance.ts`) and the ULT-CHARGE probe set their fights through the same `maybeSpells`.
- `BOT_LOADOUT=heal,meteor,haste` gives the old bot (no Decree, no ranks): the yardstick below. `BOT_DECREE=0` turns the Decree off.

**The yardstick** is what the old bot measured on today's code, on the same seeds. That is the difficulty the owner's tables and calls were set
to, with batches 1 to 4 already in.

## 2. What moved, and the knobs

The army cells (mean tries to clear; `node tools/spells-retune/run.mjs cell ...`, 12 saves; flags as there: `c` the curve's castle, `t` every
talent, `p` the pace's castle, `h` hearts):

| Cell | Old bot (target) | New bot, before | New bot, retuned |
| --- | --- | --- | --- |
| Orc Warband, 1 (c) | 1.8 | 1.8 | (unchanged) |
| Undead Legion, 8 (c) | 4.2 | 2.3 | 4.3 |
| Beast Packs, 15 (c) | 2.5 | 1.4 | 1.6 * |
| The Wildwood, 22 (c) | 1.4 | 1.3 | (unchanged) |
| The Labyrinth, 35 (tp) | 2.2 | 2.2 | (unchanged) |
| Ogre Clans, 45 (tp) | 1.8 | 1.8 | (unchanged) |
| Infernal Host, 55 (tph) | 5.8 | 4.3 | bisected to 5.8 |
| Yokai, 65 (tph) | 9.4 (92%) | 5.8 | bisected to 9.4 |
| Golem Forge, 65 (tph) | 6.8 | 5.8 | 5.9 * |
| Golem Forge, 74 (tp) | 7.7 | 4.9 | 6.6 (92%) * |

\* Held back by a test, so a little easier than the target:

- The Beasts at 2.64 would hit 2.5 tries at level 15, but then a bare starting five no longer clears them three times in ten at level 23
  (`test/armies.test.ts`). They stay at 2.52.
- The Golem Forge at 28.9 would hit 6.8 at 65, but then the strong party of `test/army-pace.test.ts` no longer clears it at level 80. It stays at
  28.2.

The default ruler's loadout is the change, not the Decree: with `BOT_DECREE=0` the cells read the same within a tenth.

| Knob | Before | After | Why |
| --- | --- | --- | --- |
| Undead Legion `start` | 2.02 | **2.19** | bisected to 4.2 tries at level 8 |
| Beast Packs `start` | 2.39 | **2.52** | toward 2.5 tries at 15 (2.64), held by the level-23 test |
| Infernal Host `start` | 20.6 | **22.7** | bisected to 5.8 tries at 55 with hearts |
| Yokai `start` | 23.3 | **25.3** | bisected to 9.4 tries at 65 with hearts (noisy: 6.8 at 25.05, 11.4 at 25.48) |
| Golem Forge `start` | 27.6 | **28.2** | toward 6.8 tries at 65 (28.9), held by the level-80 test |
| The tiers' `answer` (Hard, Elite, Legendary, Mythic) | 1.18, 1.18, 3.3, 3.26 | **1.3, 1.3, 3.63, 3.59** | x1.1 on every tier: see below |
| `DAILY_START` | 0.785 | **0.8** | see below |
| Last Stand `HALL_EASE` | 1.2 | **1.3** | see below |
| Calamity `CAL_SCALE.start` | 0.66 | **0.7** | see below |

- Every army keeps its `xpStart`, so a run pays the XP it did.
- **The tiers**: the harder tiers scale from each army's own `tierStart`, not its Normal `start`. Raising Normal put the Infernal Host's
  Normal last wave over its Hard (`test/armyStars.test.ts`). The stronger player also cleared the Wildwood's Elite at level 15 and the Infernal
  Host's Mythic at 100 on the first try (`test/difficulty.test.ts`).
  - One factor on every tier (x1.1) keeps their order and those rules, as SPELLS-RETUNE's x1.18 did.
  - The tiers' XP is taken back out through `armyXpShare`, as before.
  - The tier cells were not bisected one by one: the difficulty tests' bars hold.
- **The daily** (`npm run daily-rate -- --days 112`, a fresh save):
  - the old bot: 86% of dates cleared with hearts, 69% without;
  - the new bot: 91% and 79%;
  - trials at 0.84 (80% / 65%) and 0.81 (84% / 65%), and 0.8 (**86% / 71%**).
- **The Last Stand** (`npm run stand-balance -- --levels 1,10,20,40,60,80 --attempts 20`):

  | Median wave at level | 1 | 10 | 20 | 40 | 60 | 80 |
  | --- | --- | --- | --- | --- | --- | --- |
  | Old bot | 4 | 9 | 11 | 18 | 20 | 21 |
  | New bot | 4 | 10 | 12 | 21 | 23 | 25 |
  | At 1.27 | 3 | 10 | 12 | 20 | 24 | 24 |
  | At 1.32 | 3 | 10 | 11 | 19 | 20 | 23 |

  1.3 lies between the two trials, which are noisy at 20 runs. A harder hall costs level 1 the most: its mean wave falls from 3.8 to about 3.3.
- **The Calamity** (`npm run balance -- --no-tables --calamity`, 30 runs, no castle):
  - the runs that reached map 2: 19 with the old bot, 25 with the new;
  - full clears: 1 with the old bot, 2 with the new;
  - at 0.7: **21** reached map 2, and 1 cleared.

## 3. Tests (changed because the rule did)

- `test/army-pace.test.ts`: the first armies' Normal strength is now 2.19 for the Undead and 2.52 for the Beasts. Their `xpStart` is unchanged.
  The header says why.
- **Identity fixtures re-recorded: `daily` and `stand`**, in `test/fixtures/ailment-logs.json` and `test/fixtures/spells-identity.json`, for
  `DAILY_START` and `HALL_EASE`, which are constants, as SPELLS-RETUNE did. The proofs put the raised army strengths back by value, and their bots
  cast nothing, so no other scenario moved.
- Every other difficulty bar (`armies`, `army-pace`, `armyStars`, `difficulty`, `stand-*`, `calamity`) passes unchanged on the new bot.

## 4. For the owner

1. **The measure is the default ruler.** A player of another ruler casts another school; the other seven were not measured (eight schools
   times every cell is days of the bot). Steel's Rally and Shield proved stronger than Heal, Meteor and Haste, so a school built on damage may
   find the game a little harder than these tables.
2. **Two armies sit a little easier than the target** because of their tests: the Beast Packs at level 15 (1.6 tries against 2.5) and the Golem
   Forge (5.9 against 6.8 at 65). Raise them past those bars, or keep the bars?
3. **The Last Stand's level 1** loses about half a wave on average to the stronger hall.

## Checks

The full `npm test` (2416 tests, all pass), `npm run typecheck`, `npm run web`. No page or renderer changed in this batch.
