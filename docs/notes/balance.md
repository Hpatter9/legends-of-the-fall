# Balance

`npm run balance` plays thousands of seeded, headless fights with the sim and prints three tables. It is the tool for
tuning: change a number in `units.ts`, `foes.ts` or `run.ts`, run it again, compare.

- `npm run balance` plays 4000 fights for the hero table and a quarter of that per cell in the others (a few minutes).
- `npm run balance -- --games 2000` is quicker and noisier; `--hero-stage 1` plays the hero table at another stage.
- `tools/balance.ts` holds the report; `tools/balance.mjs` bundles it with esbuild and runs it (as `test.mjs` does).

**What it plays.** Every fight is the plain sim: `startBattle` on a seed's board, the heroes placed at random on their
rows (`place`), then `fight` and `stepBattle` to the end. Foes are `FIELD_BANDS` or `BOSS_BANDS` at a stage's boost
(`stageBoost`, `bandFor`). The tool does not model the castle upgrades, hero levels, stars, synergies or the king's
spells, so its numbers are for the fight itself, with heroes at grade 1 (or 2 and 3 where a table says so).

1. **Hero value**: random five-hero teams (every hero there is), six field bands in turn, at stage 5. Each hero's win rate
   in the teams with it, against the teams without it (value = with minus without). "vs avg" is its win rate against the
   average of all heroes; anything beyond 8 points is marked. Dealt and taken are hp per fight.
2. **Foe bands**: each field band against random grade-1 teams at stages 1, 5, 10 and 15 (the band's own strength at
   that stage's boost).
3. **Stage curve**: stages 1 to 15 as a run meets them (the band in turn, boss stages marked), against random teams at
   grade 1, 2 and 3 (every hero's hp and attack x1.6 per grade). The king's spells are not measured: they need a
   player, so a random-play tool cannot say what they do.

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
