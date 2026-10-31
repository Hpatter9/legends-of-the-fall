# STATS batch 1: the six ability scores as data

The first batch of the owner-approved D&D stats design ([rpg-stats-design.md](rpg-stats-design.md), section 14, batch 1; the owner's answers
of 31 October 2026 at its end). **No fight changes**: nothing in a fight reads the scores yet, and the identity fixtures
(`test/spells-identity.test.ts`) did not move.

## What it adds

- **`src/sim/stats.ts`** (pure: no Pixi, no DOM, no draw from any fight stream):
  - **The six scores** (`ABILITIES`, `Scores`) and **every hero's profile** (`STAT_PROFILES`, `profileOf`): the design's section 4 table, as
    written: its six scores at level 1, its blow ability, its casting ability, its armour and its two trained saves, and its nearest D&D
    calling. Every profile is the set 17, 15, 13, 12, 10, 8 (`HERO_ARRAY`), so each adds up to 75 (`SCORE_TOTAL`).
  - **The modifier** (`modOf`: (score − 10) ÷ 2, rounded down) and **proficiency by level** (`proficiencyOf`, `PROFICIENCY`: +2 at 1–9 to +7 at
    80–100).
  - **Growth by level, fixed by calling** (the owner's answer 1): `scoresAtLevel` pours an ability score improvement (+2, `ASI_LEVELS` 4, 8,
    12, 16, 20) into the calling's order (`orderOf`) up to `ASI_CAPS` (the primary to 20, the second to 18, the third to 16, the fourth to
    14), and an epic boon (+1, `BOON_LEVELS` 30, 40 ... 100) up to `BOON_CAPS` (24, 20, 18). The two lowest scores never grow from levels.
  - **Ranks, grades and awakening** (the owner's answer 4): `stepBonus` gives +1 to the primary and the second for each rank above 1 (to
    `STAT_MAX_RANK` 4) and each grade above 1, and `AWAKEN_SCORE` (+2) to the primary for each awakening step (ranks 5 and 6, as `heroRank`
    counts them). `scoresOf` adds them (and an `extra` for later talents and gear) and stops every score at `SCORE_CAP` 30.
  - **The derived numbers** (`derivedOf`): Armour Class by armour (`acOf`: heavy 16; medium 13 + DEX to +2; light 11 + DEX; robes 10 + DEX;
    monk 10 + DEX + WIS; brute 10 + DEX + CON), to hit (proficiency + the blow ability), skill DC (8 + proficiency + the casting ability),
    crit (5% + 1% a point of DEX from +1), initiative, the six saves (proficiency on the two trained), and the multipliers the later
    batches will use (`hpMult`, `atkMult`, `castMult` at 5% a point; `blowSpeed` 2% a point of DEX; `cooldown` 2% a point of INT, at most
    10%; `ultFill` 3% a point of CHA; the stamina and mana tops and refills). The per-point shares are one table, `PER_POINT`, as the
    design's section 10 asks (each is a knob).
  - **The fitted body** (`bodyOf`, `scaledBody`): a hero's health, attack and blow time with the level-1 scores' share taken out, and what
    the scores make of them at a level. `scaledBody` at level 1, rank 1 is the kind's own `hp`, `atk` and `atkMs` exactly (it multiplies by
    a ratio to the level-1 share, which is 1).
  - **Foes' family blocks** (section 9): `FOE_BLOCKS` (brute, skirmisher, shooter, caster, armoured, flyer), `foeFamilyOf` (spell-throwers
    casters, other shooters shooters, wolves, imps, the quick yokai and boars skirmishers, demons and fliers flyers, bones and golems
    armoured, the rest brutes; 33 brutes, 16 skirmishers, 11 shooters, 11 armoured, 7 casters, 6 flyers), and `foeStatsOf` with
    proficiency by the army's tier (`TIER_PROFICIENCY` +2 to +6) and the bosses' +2 proficiency, +2 to two scores, +2 AC and every save.
  - **The d20s** (section 12): `d20At` and `initiativeRoll` are hashes of the seed and the moment (`STATS_SALT`, `INIT_SALT` through
    `mixSeed`), never draws from `b.rng` or `b.skillRng`; `blowResult` turns a roll into crit, hit, glance (missing by 1 to 5,
    `GLANCE_BAND`) or miss.
- **`tools/stats/fit.mjs`** (`node tools/stats/fit.mjs [--level N --rank N --grade N]`): prints every hero's scores and modifiers, AC, to
  hit, DC, crit, initiative, fitted body and saves. Read-only.
- **`test/stats.test.ts`**: every hero has a profile; every profile is 17, 15, 13, 12, 10, 8 (75), with a primary of 17, a weakness of 8
  and two trained saves; the modifier and proficiency tables; the Knight's worked growth table level by level; +10 points by 20 and +8
  more by 100 for every hero, gained only at the right levels, in the calling's order, the two lowest untouched; the design's scores at 20
  and 100 for five heroes of different shapes; ranks, grades and awakening (a rank 4 Knight CON +3, STR +3) and the cap of 30; the derived
  level-1 numbers of fifteen heroes and five at level 100; each hero's level-1 health, attack and blow time equal today's; the odds table
  of the d20 against AC; determinism and the d20's fairness; the foes' families and the bosses' blocks.

## Checked against the design

A one-off script compared every one of the 45 rows of the design's "What the scores make of them" table (AC, to hit, skill DC, crit, the
scores at 20 and at 100, to hit and DC at 100) with `derivedOf` and `scoresAtLevel`: all 45 match.

## Not in this batch

- **No page.** The design puts the hero sheet's Stats panel, the unit card's rows, the recap's lines and the gear compare in batch 3, after
  batch 2 makes the numbers true in a fight, so this batch shows nothing to the player and has no screenshots.
- **Batch 0 (measuring main)** was not run here: it is the baseline for batch 2, which moves fights.
- The talents' stat nodes and gear's scores (section 6) are batch 2: `StatInput.extra` is where they will plug in.
- Pools in `derivedOf` give both the stamina and the mana numbers; which a hero uses stays its kit's (`poolOf`), read by the batch that
  hooks them in.

## Open points

- **Rank 0.** A hero joins at rank 0 (`heroRank`); the design counts ranks 1 to 4 with rank 4 giving +3. Here ranks 0 and 1 both give no
  step (`max(0, min(rank, 4) − 1)`).
- **The foes' blow and casting ability** are not in the design's family table: here a foe's blows use the better of STR and DEX, and its
  DC its best of INT, WIS and CHA.
- **A boss's "+2 to two scores"** goes to its block's two best (ties in D&D order).
