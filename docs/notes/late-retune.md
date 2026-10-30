# The late armies made tougher again (LATE-RETUNE)

The owner's ask, after two of a kind merging (MERGE-TWO, 0.224.0, `merge-two.md`) made the late armies easier: "harder late game".
Keep the start as it is (`GRADE_BOOST` [1, 1.3, 1.6, 2.4], the starting five on the second army checked at level 22, rank 4 x2.4) and
make the late armies tougher through their own strength, so they take about as many tries as on main 0.218.0, before merge-two; keep the
order (the Infernal Host falls just before the first army's 11 stars, the Yokai and the Golem Forge after them); answer the rank-4 outliers
that TIER-PROMISES left (the Tyrant at level 1, the Juggernaut at level 30); and leave the early game, the daily, the Last Stand and hero
parity at grade 1 as they are.

## What changed

- **The late armies' Normal strength** (`src/sim/armies.ts`): the Infernal Host's `start` 9.4 to **10.2**; the Yokai Night Parade's 12.5 to
  **12.8**, with its mid-boss 2200 hp / 52 attack to **2600 / 58** and its last boss 2500 / 50 to **3000 / 57** (its bosses were what merging
  made easy); the Golem Forge's 12.7 to **13.7**. The Yokai's and the Golems' harder tiers scale from `tierStart`, which is unchanged, so their
  `tierLift` rose a little with Normal so each tier still stands over the one below (`test/armyStars.test.ts`'s "tougher by tier"): the Yokai
  [1, 3.45, 2.76, 0.79, 0.67] to **[1, 3.57, 2.81, 0.81, 0.68]**, the Golems [1, 3.3, 2.5, 0.74, 0.73] to **[1, 3.49, 2.69, 0.78, 0.73]**.
  Their XP is unchanged (`xpStart` stays, and a tier's lift is taken back out of its XP as before).
- **Mythic** (`src/sim/tiers.ts`): its `answer` 2.6 to **2.76**: merging brought every army's Mythic sooner, the first army's included.
- **The Tyrant's and the Juggernaut's tier 4** (`src/sim/tierSkills.ts`, their own tier-4 entries; tiers 2 and 3 are untouched):
  - The Iron Throne: the judgements fall two tiles wider (the step past tier 3) and the wave of dread holds the foes near (0.21, tier 3's
    strength); it no longer also hits harder (`pow` 0.12), its wave is no stronger (0.28) and the lighter verdict that fell again (`echo`) is
    gone. Its words say only what it does.
  - Earthshatter: the quake's hold 0.42 to **0.3** (still longer than tier 3's 0.23, so "holds far longer" is still true), its blow `pow`
    0.15 to **0.08** and the ground's split 0.3 to **0.22**; the reach and the wards are as they were.
- The daily is untouched: an earlier draft of this branch moved `DAILY_START` and `DAILY_ANSWER.ult`, and both went back to main's once
  measured (main is in its band on the fresh save, below).

## The tools (the yardstick)

- `tools/army-pace/pace.ts` has a **`gate`** mode: the armies' Normals in order from `FROM` (the Infernal Host), each tried only once
  `armyUnlocked` opens it (the army before beaten and the stars: the army gate, `army-gate.md`), XP carried, an army never beaten keeping
  the rest shut. It prints, per army, the tries of the saves that reached it, the saves that beat it, and the tries from `FROM` to beating it.
  `tools/balance.ts`'s realistic climb already played the armies in order, stopping at the first it could not beat (a comment says so now).
- Both pace tools (`tools/army-pace/pace.ts`, `tools/merge-two/pace.ts`) take **`HEARTS=1`**: a lost wave burns a heart and is fought again,
  as the page does. By default a loss ends the try, as every figure in the notes was measured; the star "no heart used" is then met by every
  clear. Stars are read from `armyRules`, so both follow the stars' rules as they are (0.234.0: the clear, no heart used, the battle-time
  target); `tools/merge-two/pace.ts` now prints the share of tries meeting each star.

## Numbers

Army cells (`node tools/army-pace/run.mjs cell infernal:55 yokai:65 golems:65`, `SAVES=48`, mean tries to clear Normal, a save that never
clears in 25 counts 26; the same seeds on each tree). The owner's figures for 0.218.0 (14.5, 11.1, 7.0) were 8 saves, where one save that
never clears moves the mean by 2 to 3 tries: on 48 saves 0.218.0 itself is the column below, and that is what the branch was matched to.

| Cell | 0.218.0 (before merge-two) | main 0.232.0 | this branch |
| --- | --- | --- | --- |
| Infernal Host, Normal, level 55 | 4.4 (100%) | 2.2 (100%, 24 saves) | 4.8 (98%) |
| Yokai Night Parade, Normal, level 65 | 8.5 (96%) | 4.3 (100%, 24 saves) | 10.1 (90%) |
| Golem Forge, Normal, level 65 | 10.4 (96%) | 7.3 (92%, 24 saves) | 9.9 (94%) |

(With 8 saves, as the owner's figures: 0.218.0 Yokai 14.5, Golems 11.1, Infernal 7.0 at 55; the first draft of this branch, Infernal 11 and
Yokai 13.35, read 7.8, 12.9 and 9.0 there and 7.5, 16.0, 9.5 on 24 saves: too hard for the Infernal and the Yokai once measured properly.)

The first army's 11 stars (`node tools/army-pace/run.mjs stars 50,55,60,65`, 12 saves, on main 0.234.0's rule: the clear, no heart used,
the battle-time target; Mythic's one star flawless). Mean Mythic tries, and the saves with all 11 (Normal to Legendary take 1 to 2.4 tries
on every tree). 0.218.0's figures are from `merge-two.md` (its rule then: the clear, no hero lost in the last boss fight, the time target).

| Level | 0.218.0 | main 0.234.0 | this branch | main, `HEARTS=1` | this branch, `HEARTS=1` |
| --- | --- | --- | --- | --- | --- |
| 50 | - | 16.9, 7/12 | 18.5, 4/12 | 15.9, 9/12 | 13.7, 9/12 |
| 55 | 15.2, 8/12 | 9.8, 12/12 | 18.9, 6/12 | 7.4, 12/12 | 12.8, 10/12 |
| 60 | - | 5.2, 12/12 | 9.4, 12/12 | 3.6, 12/12 | 5.3, 12/12 |
| 65 | 5.3, 12/12 | 3.1, 12/12 | 4.8, 12/12 | 2.4, 12/12 | 3.2, 12/12 |

Without hearts (the convention every figure above and in the earlier notes uses) the star "no heart used" comes with every clear, so the
new rule moves nothing here: the Mythic is the last star, and it comes between 55 and 60 as on 0.218.0 (a little later at 55).

With hearts burned as the page burns them (`HEARTS=1`, 24 saves, this branch), every army is easier: the Infernal Host 1.8 tries at 50 and
1.5 at 55, the Yokai 4.8 at 60 and 4.2 at 65, the Golem Forge 4.0 at 60 and 3.8 at 65. There, the first army's stars and the Yokai and Golems
come together at about 60, not one after the other. The owner's targets were all measured without hearts, so the branch is tuned to those;
a hearts-on target would want its own call (below).

The army gate (`gate 55,60,65`, 12 saves, from the Infernal Host with the armies before it beaten; tries at each army, saves that beat it):

| Level | main 0.233.0: Infernal / Yokai / Golems | this branch |
| --- | --- | --- |
| 55 | 2.5 12/12, 19.0 7/12, 22.1 1/12 | 4.3 12/12, 24.8 1/12, 25 tries 0/12 (1 save reached it) |
| 60 | 1.3 12/12, 7.3 12/12, 9.4 10/12 | 1.6 12/12, 15.4 10/12, 15.1 7/12 |
| 65 | 1.4 12/12, 3.6 12/12, 8.4 12/12 | 1.3 12/12, 10.3 11/12, 13.1 7/12 |

So the order holds: the Infernal Host falls at 55 in a few tries, as the first army's stars are being finished; the Yokai and the Golems
take most of a save's tries at 60 and are cleared about 65, after the stars.

**Rank-4 parity** (`npm run balance -- --heroes-only --hero-grade 4 --hero-stage S [--hero-level 30] --seed-offset 0|100000 --json`, two runs
of 4,000 teams each, the same seeds on both trees; lift = a hero's win rate in its teams against the roster's average):

| | main 0.232.0 | this branch |
| --- | --- | --- |
| Level 1, stage 24 (average 47.3% / 46.1%) | Tyrant +11.1, Juggernaut +4.6 | Tyrant **+5.4**, Juggernaut +0.6 |
| Level 30, stage 260 (average 47.5% / 46.8%) | Juggernaut +6.4, Tyrant +2.7 | Juggernaut **+2.4**, Tyrant +1.3 |
| Others beyond 6 at level 1 | Knight +11.9, Beastmaster +11.0, Karasu +10.4, Wolf Bard +7.5, Arc Blade +6.7, Demon Swordsman +6.7, Peasant +6.6, Dread Pirate -6.3, Druid -6.7, Lightning Mage -6.8, Great Sage -7.0, Kitsune -8.2 | the same heroes, within a point |
| Others beyond 6 at level 30 | Siege Bot +9.9, Great Sage +8.4, Dread Pirate +6.8, Mercenary -6.2, Kunoichi -6.5, Queen Dragoon -6.7, Karasu -8.2 | Siege Bot +10.1, Great Sage +8.1, Dread Pirate +6.8, Mercenary -6.2, Karasu -8.1 |

The older rank-4 outliers (`rank4-skills.md`: the Knight and the Beastmaster at level 1, the Siege Bot and the Dread Pirate at level 30) are
left: they stood out by the same margin casting their tier 3 skill (the Knight +12.8, the Beastmaster +15.6, the Siege Bot +12.2, the Dread
Pirate +11.8), so it is how their kits grow with a grade's stats, not their tier 4 entries, and no light touch to tier 4 answers them.

## For the owner

- The targets in tries (14.5, 11, 7) were 8-save means; on 48 saves 0.218.0 itself is 8.5, 10.4 and 4.4, and the branch matches those.
- Every pace figure before "Tuned again for a player who burns hearts" is a player whose run ends at the first lost wave. The owner then chose to tune
  for a player who burns hearts: that section supersedes the late armies' strengths here.

**Kept as they are** (the same tools and seeds on main and the branch):

| Measure | main | this branch |
| --- | --- | --- |
| Daily, fresh save with hearts (`npm run daily-rate`, 60 runs) | 75% (60% without hearts) | 75% (60%) |
| Daily, levelled save at 30 / 50 (`node tools/ult-charge/run.mjs 40 --only daily`, 80 dates) | 73%, 78% | 73%, 78% |
| Last Stand medians at levels 1 / 10 / 20 / 40 / 60 / 80 (`npm run stand-balance`) | 3 / 9 / 11 / 15 / 20 / 22 | the same, every row |
| Hero parity at grade 1, levels 1 and 30 (`test/hero-balance.test.ts`) | passes | passes (the late armies and tier 4 are not in it) |
| The starting five against the second army at level 22 (`test/armies.test.ts`) | passes | passes (the first armies are untouched) |

## Tuned again for a player who burns hearts (the owner's call)

The figures above are a player whose run ends at the first lost wave. The page burns a heart instead (two a run) and fights the wave again,
and with hearts the Yokai and the Golem Forge fell at about the level the first army's 11th star comes, not after it. The owner chose "Yes,
tune with hearts": the late armies tougher again, measured with `HEARTS=1`, so the order holds for that player: the Infernal Host just before
the first army's 11 stars, the Yokai and the Golem Forge a few levels after, the 11 stars still about 55 to 65.

- **`src/sim/armies.ts`**: the Infernal Host's `start` 10.2 to **12.5**, the Yokai's 12.8 to **14.2**, the Golem Forge's 13.7 to **14.6**
  (bisected with `HEARTS=1 SAVES=24 node tools/army-pace/run.mjs tune infernal:55 yokai:65 golems:65`, for about 5, 10 and 10 tries; the
  curve is steep, a tenth of a point moves a cell by two or three tries). The Golem Forge at 14.8 read a little harder, but then the strong
  party of `test/army-pace.test.ts` (level 80, every castle level) no longer cleared it in three tries, so it stays at 14.6. The bosses
  are as they were.
- Their `tierLift` raised just enough that each tier's last wave stays at least 3% over the one below in hp and attack (the Normal rise had
  put Hard's attack under Normal's): the Infernal Host [1, 2.97, 2.38, 0.76, 0.87] to **[1, 3.27, 2.51, 0.76, 0.87]**, the Yokai
  [1, 3.57, 2.81, 0.81, 0.68] to **[1, 3.99, 3.06, 0.88, 0.72]**, the Golems [1, 3.49, 2.69, 0.78, 0.73] to **[1, 3.8, 2.92, 0.84, 0.73]**.
  XP is unchanged (`xpStart` stays; a tier's lift is taken back out of its XP).
- Mythic's `answer` (2.76) and the first army are untouched: with hearts its 11 stars come at 55 to 60 already (below).
- `test/ailments-identical.test.ts` already puts the recorded `start`s back by value (10, 12.5, 12.7), so it needed nothing new.

Army cells (`cell`, 24 saves, mean tries to clear Normal, a save that never clears in 25 counts 26; the same seeds on both trees):

| Cell | before, `HEARTS=1` | after, `HEARTS=1` | before, no hearts | after, no hearts |
| --- | --- | --- | --- | --- |
| Infernal Host, level 45 | - | 16.3 (63%) | - | - |
| Infernal Host, level 50 | 1.8 (100%) | 5.4 (100%) | - | - |
| Infernal Host, level 55 | 1.5 (100%) | 4.8 (100%) | 4.7 (100%) | 21.3 (38%) |
| Infernal Host, level 60 | 1.1 (100%) | 1.4 (100%) | 1.5 (100%) | 4.4 (100%) |
| Yokai, level 60 | 4.8 (100%) | 12.8 (83%) | - | - |
| Yokai, level 65 | 4.2 (100%) | 11.9 (83%) | 11.2 (92%) | 19.9 (38%) |
| Yokai, level 70 | 2.6 (100%) | 5.3 (96%) | 5.4 (100%) | 11.5 (83%) |
| Yokai, level 75 | - | 3.2 (100%) | - | - |
| Golem Forge, level 60 | 4.0 (100%) | 8.0 (100%) | - | - |
| Golem Forge, level 65 | 3.8 (100%) | 7.6 (100%) | 10.8 (83%) | 16.0 (67%) |
| Golem Forge, level 70 | 2.9 (100%) | 5.3 (96%) | 6.0 (100%) | 12.0 (92%) |
| Golem Forge, level 75 | - | 3.0 (100%) | - | - |

Main 0.241.0, merged in afterwards, adds the road's events and the passing cart's market to an army's gaps (MID-EVENTS); a spot check
there with hearts reads the Infernal Host 6.3 tries at 55 (96%), the Yokai 11.6 at 65 (88%) and the Golem Forge 10.0 at 65 (96%), within
the cells' noise of the figures above (the Golems a little harder).

The army gate (`gate 55,60,65,70`, 24 saves, from the Infernal Host with the armies before it beaten, XP carried; tries at each army of the
saves that reached it, and the saves that beat it):

| Level | before, `HEARTS=1` | after, `HEARTS=1` | before, no hearts | after, no hearts |
| --- | --- | --- | --- | --- |
| 55 | Inf 2.0 24/24; Yokai 20.1 10/24; Golems 18.8 2/24 | Inf 5.9 24/24; Yokai 24.6 2/24; Golems never reached | Inf 4.2 24/24; Yokai 24.5 2/24; Golems 25 0/24 | Inf 17.6 15/24; Yokai 25 0/24 |
| 60 | Inf 1.2; Yokai 4.2 22/24; Golems 4.8 19/24 | Inf 1.7; Yokai 7.6 19/24; Golems 7.7 9/24 | Inf 1.3; Yokai 14.4 20/24; Golems 14.6 15/24 | Inf 3.3; Yokai 20.0 10/24; Golems 21.9 2/24 |
| 65 | Inf 1.1; Yokai 4.1 23/24; Golems 6.3 19/24 | Inf 1.5; Yokai 8.8 18/24; Golems 8.0 6/24 | Inf 1.3; Yokai 11.2 22/24; Golems 15.7 17/24 | Inf 3.0; Yokai 22.5 7/24; Golems 18.9 4/24 |
| 70 | Inf 1.1; Yokai 2.6 23/24; Golems 3.1 23/24 | Inf 1.3; Yokai 3.9 21/24; Golems 3.6 17/24 | Inf 1.1; Yokai 4.1 24/24; Golems 7.6 24/24 | Inf 1.8; Yokai 12.0 20/24; Golems 10.1 18/24 |

The first army's 11 stars with hearts (`HEARTS=1 SAVES=24 node tools/army-pace/run.mjs stars 50,55,60,65`, the 0.234.0 rule: the clear,
no heart used, the time target; a try that burns a heart cannot earn the second star, so a save earns it on a try that burned none, the mix
the tool plays). The first army is untouched, so before and after are the same:

| Level | Normal / Hard / Elite / Legendary / Mythic tries | all 11 stars |
| --- | --- | --- |
| 50 | 1.0 / 1.0 / 1.0 / 2.0 / 14.5 | 16/24 |
| 55 | 1.0 / 1.0 / 1.0 / 2.1 / 15.5 | 19/24 |
| 60 | 1.0 / 1.0 / 1.0 / 1.9 / 4.3 | 24/24 |
| 65 | 1.0 / 1.0 / 1.0 / 1.6 / 4.2 | 24/24 |

So, for a player who uses hearts: the Infernal Host falls at about 55 in five or six tries, as the first army's stars are being finished
(55 to 60); the Yokai is beaten by most saves at 60 to 65 in eight to thirteen tries, and the Golem Forge after it, by most saves about 70.
The hearts-on gate after the change sits about where the no-hearts gate stood before it, the order the owner signed off. A player who never
uses a heart now finds the three late armies much harder (the Infernal Host 21 tries at 55, the Yokai and the Golems most of 25 at 65).

Kept: the daily, the Last Stand and hero parity read neither an army's `start` nor its `tierLift` (the Last Stand takes only the armies'
rosters), so they are as main has them; the start (`GRADE_BOOST`, the starting five against the second army at level 22) and the first four
armies are untouched (`test/armies.test.ts`, `test/army-pace.test.ts`).

## Tests

`test/armyStars.test.ts`'s "the foes get tougher by tier" holds with the lifts above. `test/ailments-identical.test.ts` (the proof that
the old effects play as before the ailment model) plays the Yokai and the Golem Forge: as it already does for the Infernal Host's `start`,
it now puts their recorded strengths back for the proof (the Yokai's `start` 12.5 and bosses 2200/52 and 2500/50, the Golems' `start` 12.7);
the fixture is unchanged.

## Files

`src/sim/armies.ts`, `src/sim/tiers.ts`, `src/sim/tierSkills.ts`, `tools/army-pace/pace.ts`, `tools/merge-two/pace.ts`, `tools/balance.ts`
(a comment), `test/ailments-identical.test.ts`, `docs/notes/late-retune.md`, `docs/TASKS.md`.
