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

STARS_TABLE

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

**Kept as they are** (the same tools and seeds on main and the branch):

| Measure | main | this branch |
| --- | --- | --- |
| Daily, fresh save with hearts (`npm run daily-rate`, 60 runs) | 75% (60% without hearts) | 75% (60%) |
| Daily, levelled save at 30 / 50 (`node tools/ult-charge/run.mjs 40 --only daily`, 80 dates) | 73%, 78% | 73%, 78% |
| Last Stand medians at levels 1 / 10 / 20 / 40 / 60 / 80 (`npm run stand-balance`) | 3 / 9 / 11 / 15 / 20 / 22 | the same, every row |
| Hero parity at grade 1, levels 1 and 30 (`test/hero-balance.test.ts`) | passes | passes (the late armies and tier 4 are not in it) |
| The starting five against the second army at level 22 (`test/armies.test.ts`) | passes | passes (the first armies are untouched) |

## Tests

No test was changed. `test/armyStars.test.ts`'s "the foes get tougher by tier" holds with the lifts above.

## Files

`src/sim/armies.ts`, `src/sim/tiers.ts`, `src/sim/tierSkills.ts`, `tools/army-pace/pace.ts`, `tools/merge-two/pace.ts`, `tools/balance.ts`
(a comment), `docs/notes/late-retune.md`, `docs/TASKS.md`.
