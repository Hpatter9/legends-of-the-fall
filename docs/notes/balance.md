# Balance

`npm run balance` plays thousands of seeded, headless fights with the sim and prints four tables. It is the tool for
tuning: change a number in `units.ts`, `foes.ts`, `run.ts` or `levels.ts`, run it again, compare.

- `npm run balance` plays 4000 fights for the hero table, a quarter of that per cell in the foe and stage tables, and 1000
  fresh saves (five runs each) for the whole-run table. It takes several minutes.
- `npm run balance -- --games 2000` is quicker and noisier; `--hero-stage 1` plays the hero table at another stage;
  `--saves 300` plays fewer saves; `--runs-only` prints only the whole-run table (quick when tuning the levels).
- `tools/balance.ts` holds the report; `tools/balance.mjs` bundles it with esbuild and runs it (as `test.mjs` does).

**What it plays.** Tables 1 to 3 are the plain fight: `startBattle` on a seed's board, the heroes placed at random on their
rows (`place`), then `fight` and `stepBattle` to the end. A field band gets no boss; a boss stage meets its boss band
(`bandFor`). They do not model the castle upgrades, stars, synergies, gear or the king's spells, and heroes are grade 1 (or 2
and 3 where a table says so).

Table 4 plays whole runs with the game's own functions (`newRun`, `summon`, `startStage`, `finish`, and `fightXp` into
`gainXp` for the hero levels). The greedy player takes the first option of an event (leaving when it cannot be taken),
summons whenever it can afford to, fields the five strongest heroes on the deploy rows, buys no castle upgrades, recruits
nothing (so a run's pool is the five starting heroes) and equips no gear. The meta carries the XP from run to run, as the
game does.

## Round 2: hero XP and the first boss

The owner's target: stage 5, the first boss, is not winnable on the first run; the heroes keep the XP they earned, so a run
that lost can level up; after a couple of runs the team can win; by the third run it usually does.

**What changed**

- **XP** (`levels.ts`, rules in `levels.md`): taking part 5 and a win 5 (were 10 and 10); damage and healing 1 per 40 (were
  1 per 20); a kill is a tenth of the foe's max hp, and a boss kill three times that (was a flat 5 a kill); a fallen hero keeps
  all of it (was 75%).
- **Curve**: `30 × (level − 1) × level` (was 12): level 2 at 60 XP (was 24), level 5 at 600, level 10 at 2,700.
- **Per level**: +22% hp and +18% attack (were 4% and 3%).
- **The first boss** (`foes.ts`, the orc warlord): 2,280 hp and 78 attack (were 380 and 26), six and three times its kind's
  stats. The other bosses keep their stats. (The boss boost was first put on every boss in `run.ts`, which made stage 10 a
  wall even for grade-3 teams, so it moved to the first boss's own stats.)
- **The tool**: a field band no longer gets the boss boost on a boss stage (the first version did, which made every field band
  impossible at stages 5, 10 and 15).
- **Tests**: `levels.test.ts` (the new XP and curve numbers, a fallen hero keeps all it earned, and a kill is worth a tenth of
  the foe's hp, three times that for a boss); `foes.test.ts` (the 20 to 80% range leaves out the orc warlord, which is the gate
  by design); `progression.test.ts` (new: a fresh team at level 1 loses the first boss, and the same team at the levels of the
  table after run 3 usually wins it).

**Tuning.** The levers were the first boss's strength, the curve and the per-level gains. The stage 5 win rate of the greedy
first, second and third runs, as each setting was tried (saves in the last column):

| Setting | Run 1 | Run 2 | Run 3 | Saves |
| --- | --- | --- | --- | --- |
| Start: the new XP, boss x1.5 size only, curve 12, per level 4% / 3% | 79.5 | 89.5 | 94.3 | 400 |
| Boss x3 hp, curve 30 | 49.0 | 55.0 | 71.3 | 300 |
| Boss x6 hp, x1.6 attack, curve 30, per level 12% / 9% | 14.7 | 34.7 | 63.3 | 300 |
| Same, per level 18% / 14% | 32.3 | 69.0 | 90.3 | 300 |
| Boss x6 hp, x3 attack, curve 30, per level 22% / 18% (**final**) | 4.9 | 26.5 | 60.9 | 1000 |

Levels grow with the square root of the XP, so each run's team is only a little stronger than the last unless a level is
worth a lot; that is why the per-level gains are steep. Boss hp and attack move runs 1 and 3 down together, and the gains
move run 3 up faster than run 1, so the final setting is a pair picked from about two dozen whole-run sweeps (boss hp 4 to
12, attack 1.6 to 3.5, per-level gains 8/6% to 24/19%). Two examples: boss hp 12 with attack 1.6 holds run 1 at 3% but drops
run 3 to 49%; boss hp 4 to 5 with attack 1.6 leaves run 1 at 25 to 33%.

**Stage 5 on its own.** Two probes of the boss with the five starting heroes on its board (`progression.test.ts` plays the
same): a fresh team at level 1 wins 0 of 200 seeds; the same five at the table's levels after run 3 (7, 11, 6, 8 and 7)
win 199 of 200. The greedy's run 3 wins 61%, a lower figure because the table's levels are read after the run (they include
that run's kills, so the fight started lower) and the greedy's team is not the starting five.

**Hero value** (win % with the hero / without it; value = with minus without; "vs avg" = with minus the average; flagged beyond 8 points)

| Hero | With | Without | Value | vs avg | Dealt | Taken |
| --- | --- | --- | --- | --- | --- | --- |
| Knight | 79.7 | 63.2 | 16.5 | 9.6 (off) | 249 | 262 |
| Samurai | 73.9 | 67.4 | 6.5 | 3.8 | 419 | 217 |
| Kunoichi | 66.8 | 72.5 | -5.7 | -3.3 | 224 | 199 |
| Archer | 62.9 | 75.2 | -12.3 | -7.2 | 337 | 119 |
| Fire Wizard | 65.2 | 73.7 | -8.5 | -4.9 | 347 | 121 |
| Peasant | 68.0 | 71.7 | -3.7 | -2.1 | 249 | 243 |
| Ninja Monk | 69.7 | 70.6 | -0.8 | -0.4 | 306 | 244 |
| Wanderer | 70.4 | 70.0 | 0.4 | 0.3 | 132 | 182 |
| Lightning Mage | 64.3 | 74.2 | -9.9 | -5.8 | 368 | 131 |
| Kitsune | 73.1 | 68.0 | 5.0 | 2.9 | 247 | 250 |
| Karasu Tengu | 71.3 | 69.4 | 1.9 | 1.2 | 331 | 213 |
| Yamabushi Tengu | 76.0 | 65.9 | 10.1 | 5.9 | 302 | 307 |

Average win rate with a hero: 70.1%.

**Foe bands** (heroes' win %, random grade-1 teams; stage 1 and 5 use the band's own strength at that stage, the field bands with no boss)

| Band | Stage 1 | Stage 5 | Stage 10 | Stage 15 |
| --- | --- | --- | --- | --- |
| skeletons | 100.0 | 71.7 | 0.0 | 0.0 |
| werewolves | 100.0 | 66.7 | 0.0 | 0.0 |
| minotaurs | 100.0 | 73.1 | 0.2 | 0.0 |
| gorgons | 100.0 | 69.4 | 0.0 | 0.0 |
| satyrs | 100.0 | 72.7 | 0.0 | 0.0 |
| mixed | 100.0 | 69.9 | 0.0 | 0.0 |
| orcs | 100.0 | 69.2 | 0.0 | 0.0 |
| demons | 100.0 | 59.4 | 0.0 | 0.0 |
| ogres | 100.0 | 76.6 | 0.0 | 0.0 |

**Stage curve** (heroes' win %, random teams at each grade)

| Stage | Band | Grade 1 | Grade 2 | Grade 3 |
| --- | --- | --- | --- | --- |
| 1 | skeletons | 100.0 | 100.0 | 100.0 |
| 2 | werewolves | 100.0 | 100.0 | 100.0 |
| 3 | minotaurs | 99.9 | 100.0 | 100.0 |
| 4 | gorgons | 94.6 | 100.0 | 100.0 |
| 5 | orcWarlord (boss) | 0.0 | 14.1 | 100.0 |
| 6 | satyrs | 34.4 | 100.0 | 100.0 |
| 7 | mixed | 7.9 | 99.9 | 100.0 |
| 8 | orcs | 0.4 | 99.1 | 100.0 |
| 9 | demons | 0.1 | 86.8 | 100.0 |
| 10 | forestBoss1 (boss) | 0.0 | 58.9 | 100.0 |
| 11 | ogres | 0.0 | 61.8 | 100.0 |
| 12 | skeletons | 0.0 | 27.8 | 100.0 |
| 13 | werewolves | 0.0 | 5.8 | 100.0 |
| 14 | minotaurs | 0.0 | 8.7 | 100.0 |
| 15 | demonLord (boss) | 0.0 | 0.4 | 96.5 |

**Whole runs** (a greedy player, 1000 fresh saves, five runs in a row; the hero levels carried between runs; the mean level of each starting kind after the run)

| Run | Lost on 1-4 | Lost to stage 5 | Won stage 5 | Mean furthest stage | Knight | Samurai | Kunoichi | Archer | Fire Wizard |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 2.6 | 92.5 | 4.9 | 6.15 | 2.2 | 3.3 | 2.3 | 2.6 | 2.3 |
| 2 | 0.5 | 73.0 | 26.5 | 11.48 | 4.1 | 6.9 | 4.0 | 4.8 | 4.5 |
| 3 | 0.5 | 38.6 | 60.9 | 20.05 | 6.7 | 11.5 | 6.4 | 8.1 | 7.3 |
| 4 | 0.0 | 15.3 | 84.7 | 26.13 | 9.3 | 15.7 | 8.8 | 11.0 | 9.9 |
| 5 | 0.1 | 3.9 | 96.0 | 29.00 | 11.5 | 18.2 | 10.5 | 13.2 | 11.8 |

**Whole runs** (table 4, the important one). After run 1 the greedy team clears stages 1 to 4 in 97% of saves and loses the
boss in 92.5%, winning it in 4.9%. Run 2 wins it 26.5% of the time, run 3 60.9%. The stage columns are shares of saves, and
the furthest stage is `run.best`, the furthest stage fought.

**Open for the owner**

- **Later stages are not a wall for a levelled greedy player.** Its mean furthest stage is 20 after run 3 and 29 (of the
  30 the tool plays to) after run 5, and 96% of run 5s reach stage 10 or more. Grade-1 teams lose every boss
  from stage 5 to 15, and grade-2 teams win stage 10 about 59% of the time and stage 15 under 1% (table 3); the greedy merges
  to grade 3 along the way. The steep per-level gains
  (22% and 18%) are the lever to bring in if later stages should need more: a gain that falls off after a few levels, or a
  steeper curve past level 5. I did not change them, since they move runs 1 to 3.
- The first boss is a gate by design: 2,280 hp and 78 attack, against 350 to 700 for the other bosses. Whether it should
  look like that is the owner's call.
- The knight is still about 10 above average (flagged in table 1), as before this round.

## Round 1: the first pass (for the record)

The tables below are the earlier pass, before the hero XP rules and the first boss changed. The table numbers are from that
pass and are kept as they were; table 4 above supersedes them for the stage 5 numbers.

## The curve

The win rate moves about 6 points for each 1% of foe strength near 50%, so the stage numbers are steep. The old curve
(12% a stage) had grade-1 teams winning 63% on stage 1 and 22% on stage 2, and nothing past stage 4; grade 2 fell from
64% on stage 5 to 0.3% on stage 10. The new curve in `run.ts`:

- `FOE_START` (new, 0.55): foes' hp and attack at stage 1, as a share of their stats in `foes.ts`.
- `STAGE_GROWTH` 0.12 -> 0.2: foes grow by this share for each stage after the first, on top of `FOE_START`.

With these, a grade-1 team wins stages 1 to 4 most of the time, about half of stage 5 (the first boss), and little
after 6. Grade 2 is a real test at 10 (about 60%) and falls off by 13 (about 5%); grade 3 carries 15 (97%). So the
merges are what get a run past stage 10, which is the intent.

## Before and after

Before is the upstream branch (`1cd683f`, with hero levels, bosses, stars and synergies) played by this tool. After is
this branch. The hero table is played at stage 1 before (the old curve has no grade-1 fights past it) and at stage 5 after
(the new curve is near even there, so the values show). At stage 1 after, every hero wins 100%.

**Hero value** (win % with the hero / without it; value = with minus without; "vs avg" = with minus the average)

| Hero | Before, stage 1: with / without | value | vs avg | After, stage 5: with / without | value | vs avg |
| --- | --- | --- | --- | --- | --- | --- |
| Knight | 82.2 / 59.5 | +22.7 | +13.1 | 81.2 / 64.3 | +16.9 | +9.8 |
| Samurai | 75.1 / 64.8 | +10.2 | +6.0 | 75.6 / 68.5 | +7.1 | +4.1 |
| Kunoichi | 64.4 / 72.5 | -8.0 | -4.6 | 67.6 / 74.3 | -6.7 | -3.9 |
| Archer | 60.1 / 75.4 | -15.3 | -9.0 | 65.5 / 75.6 | -10.2 | -6.0 |
| Fire Wizard | 62.5 / 73.8 | -11.3 | -6.6 | 65.9 / 75.5 | -9.6 | -5.6 |
| Peasant | 66.5 / 71.1 | -4.6 | -2.6 | 69.6 / 72.9 | -3.3 | -1.8 |
| Ninja Monk | 68.3 / 69.8 | -1.5 | -0.7 | 70.9 / 72.0 | -1.1 | -0.5 |
| Wanderer | 69.0 / 69.4 | -0.4 | -0.1 | 72.1 / 71.1 | +1.0 | +0.7 |
| Lightning Mage | 60.2 / 75.3 | -15.1 | -8.8 | 65.0 / 76.0 | -11.0 | -6.5 |
| Kitsune | 72.8 / 66.5 | +6.4 | +3.7 | 75.1 / 68.8 | +6.4 | +3.7 |
| Karasu Tengu | 69.7 / 68.8 | +0.9 | +0.6 | 71.9 / 71.2 | +0.7 | +0.5 |
| Yamabushi Tengu | 78.0 / 62.7 | +15.3 | +8.9 | 76.8 / 67.6 | +9.2 | +5.4 |
| Average | 69.1 | | | 71.4 | | |

**Foe bands** (heroes' win %, grade-1 teams; stage 5, 10 and 15 are each band at that stage's strength)

| Band | Before: 1 | 5 | 10 | 15 | After: 1 | 5 | 10 | 15 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| skeletons | 63.3 | 0.0 | 0.0 | 0.0 | 100.0 | 72.8 | 0.0 | 0.0 |
| werewolves | 60.9 | 0.0 | 0.0 | 0.0 | 100.0 | 66.3 | 0.0 | 0.0 |
| minotaurs | 65.2 | 0.0 | 0.0 | 0.0 | 100.0 | 73.3 | 0.2 | 0.0 |
| gorgons | 75.1 | 0.3 | 0.0 | 0.0 | 100.0 | 68.0 | 0.0 | 0.0 |
| satyrs | 69.6 | 0.1 | 0.0 | 0.0 | 100.0 | 72.5 | 0.0 | 0.0 |
| mixed | 73.0 | 0.2 | 0.0 | 0.0 | 100.0 | 70.4 | 0.0 | 0.0 |
| orcs | 63.8 | 0.0 | 0.0 | 0.0 | 100.0 | 69.8 | 0.0 | 0.0 |
| demons | 65.1 | 0.0 | 0.0 | 0.0 | 100.0 | 65.1 | 0.0 | 0.0 |
| ogres | 67.1 | 0.1 | 0.0 | 0.0 | 100.0 | 76.6 | 0.0 | 0.0 |

**Stage curve** (heroes' win %, random teams at each grade)

| Stage | Band | Before: grade 1 | grade 2 | grade 3 | After: grade 1 | grade 2 | grade 3 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | skeletons | 63.3 | 100.0 | 100.0 | 100.0 | 100.0 | 100.0 |
| 2 | werewolves | 22.2 | 100.0 | 100.0 | 100.0 | 100.0 | 100.0 |
| 3 | minotaurs | 5.2 | 100.0 | 100.0 | 100.0 | 100.0 | 100.0 |
| 4 | gorgons | 1.3 | 97.8 | 100.0 | 94.8 | 100.0 | 100.0 |
| 5 | orcWarlord (boss) | 0.0 | 63.9 | 100.0 | 46.8 | 100.0 | 100.0 |
| 6 | satyrs | 0.0 | 68.6 | 100.0 | 33.9 | 100.0 | 100.0 |
| 7 | mixed | 0.0 | 43.8 | 100.0 | 6.9 | 99.9 | 100.0 |
| 8 | orcs | 0.0 | 12.9 | 99.9 | 0.6 | 99.2 | 100.0 |
| 9 | demons | 0.0 | 3.1 | 99.6 | 0.0 | 90.6 | 100.0 |
| 10 | forestBoss1 (boss) | 0.0 | 0.3 | 97.1 | 0.0 | 59.9 | 100.0 |
| 11 | ogres | 0.0 | 1.1 | 97.3 | 0.0 | 63.5 | 100.0 |
| 12 | skeletons | 0.0 | 0.1 | 88.6 | 0.0 | 28.7 | 100.0 |
| 13 | werewolves | 0.0 | 0.1 | 61.4 | 0.0 | 5.4 | 100.0 |
| 14 | minotaurs | 0.0 | 0.1 | 78.6 | 0.0 | 8.5 | 100.0 |
| 15 | demonLord (boss) | 0.0 | 0.0 | 27.8 | 0.0 | 0.4 | 96.8 |

## What changed, and why

**Heroes** (`units.ts`). The knight had the biggest value (+13 before) and the archer, lightning mage and fire wizard were
about 9 below. Changes: knight attack 19 -> 17 and defence 11 -> 10; samurai attack 34 -> 31; kunoichi hp 165 -> 178;
archer hp 142 -> 158 and attack 24 -> 26; fire wizard attack 26 -> 30; lightning mage attack 30 -> 34; peasant hp 280 ->
300; yamabushi hp 330 -> 300. The archer, wizard and lightning mage are still about 6 below the average, and the knight is
still about 10 above it.

**Foes** (`foes.ts`). The bands were uneven at stage 1 (gorgons 75%, werewolves 61%). Werewolves gain hp (230 -> 250) and
red werewolves lose attack (26 -> 25); gorgons gain hp and attack (280/24 -> 300/26); satyrs gain hp (300 -> 320); demons
gain attack (30 -> 32); the orc warlord (the stage 5 boss) loses hp (500 -> 380), since a grade-1 team could not get past
it at all.

**Stage curve** (`run.ts`). `FOE_START` 0.55 and `STAGE_GROWTH` 0.2 (see The curve above). `BOSS` is the upstream's, size
only: the bosses carry their own stats in `foes.ts`.

**Tests.** Two fixtures tied to the old knight stats were changed, without loosening their assertions: the knightly
trait test compares against `UNITS.knight.hp` (not the number 380), and the fallen-hero XP test reads the hero's
standing XP while it still stands (seed 7's knight now falls in that fight). Every other test is unchanged and passes
(119 of 119).

## Open for the owner

- **The knight is still about 10 above average.** Lowering its defence to 9 drops the `boarKing` band to 7 of 40 wins in
  the band test (its floor is 8), so the test ties its numbers down. Its real strength is the Shield Wall in
  `abilities.ts`, which is rules, not numbers, so I left it.
- The stage curve is steep: each 1% of foe strength moves a grade-1 team about 6 points near 50%. Small later changes to
  foes or to a boss will show up as big swings in the stage table, so rerun the tool after each.
- The tool plays level-1 heroes with no castle, stars or synergies. A real run adds all of these, so it is stronger than
  the grade-1 rows; the table is a guide, not a promise.
