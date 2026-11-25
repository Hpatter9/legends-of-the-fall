# Duel fair: the three last armies' duels

The owner said yes to making the duels fairer. At their own level, heroes won their duels against the Infernal Host 15%, the Yokai 9% and
the Golem Forge 2% (NEMESIS-DEPTH's measure), while the other armies sat near the band.

## Why

- **The three last armies' walls were built for a stronger hero.** SKILLS-10 (`docs/notes/skills-10.md`) raised exactly the Infernal Host,
  the Yokai and the Golem Forge for heroes with every skill mastered (level 40 and up: skills 5, 5, 5). A duel's nemesis is cut from its
  wave's wall (`duelShare`), so its duel stats grew with them.
- **Their duels were never tuned.** Phase 4 and DUEL-SHOW gave each army its own duel factor (`DUEL_ARMY`), but these three were "out of
  the bot's reach at their own level" and kept the plain share (x1).
- **And they were measured with the wrong hero.** The duel table (`npm run balance -- --duel`) duelled them with an unmastered hero.
  Measured at Might 5, the captain's health against the hero's attack was 56 blows for the Ogre Clans but 60, 69 and 170 for the three; the
  nemesis's attack against the hero's health 0.14 for the Ogres, 0.26, 0.25 and 0.35 for the three. The knight won none of them.

Neither alone mends it: with the mastered hero and the plain share, a sample of twelve kinds (6 seeds) still won 13%, 10% and 2%.

## The fix

Data and the measuring tool only; ordinary fights are untouched.

- `DUEL_MASTERED` (`src/sim/duel.ts`) names the three armies. The duel table gives the hero its mastered skills for them (`giveMastery`,
  the same as `--mastery auto`), the hero their walls were tuned for; `--duel-unmastered` measures the old way.
- `DUEL_ARMY` gains their factors, on the nemesis's duel health and attack alike: **the Infernal Host x0.37, the Yokai x0.47, the Golem
  Forge x0.4**.
- The duel's stakes, outcomes, ring, clock, roles and the boss's cut are unchanged; the other six armies keep their factors.

**The band chosen:** 55 to 65% at the army's own level in all (the duel table's own band), 50 to 75% accepted; the other six sit 55 to 71%.
A duel stays a real risk: by Might (1, 5, 10) the three run 64, 61, 57% (Infernal), 66, 62, 57% (Yokai) and 68, 61, 52% (Golems); with the Dread 68, 71 and 74%.

## Measured

`npm run balance -- --no-tables --duel --duel-seeds 32` (every kind, its army's level on Normal, talents learned, captain and boss at
Might 1, 5 and 10), split by `--only`:

| Army | Before | After |
|---|---|---|
| Orc Warband | 54.7% | 54.7% |
| Undead Legion | 62.3% | 62.3% |
| Beast Packs | 65.2% | 65.2% |
| The Wildwood | 70.8% | 70.8% |
| The Labyrinth | 68.4% | 68.4% |
| Ogre Clans | 59.2% | 59.2% |
| Infernal Host | 6.5% | 60.8% |
| Yokai | 5.9% | 61.8% |
| Golem Forge | 2.7% | 60.0% |

("Before" is the unmastered hero at the plain share, as measured before; the six armies' factors and hero are unchanged, so their duels
play out the same.)

The first try (x0.42, x0.55, x0.44, set from the twelve-kind sample) came to 53.2%, 48.9% and 50.0% over every kind at 32 seeds, so they
were eased to the factors above (60.6%, 60.4% and 61.3% at 8 seeds).

`npm run war-sim`: identical before and after, line for line (46 duels, 89% won). Its bot reaches the three armies late (the
Golem Forge from day 99) and none of its duels' outcomes changed; it does not give its heroes mastered skills.

## Worth knowing

- The factors assume a hero with mastered skills, as the three armies' walls do. A player who reaches them unmastered finds their duels
  harder than the band, as they find the armies' waves.
- Tests: `test/duel-fair.test.ts` (the three named, their factors, the other armies' kept, the share carrying the factor). The pinned
  regressions (`nemesis-regression`, `stand-regression`, `ailments-identical`) pass unchanged.
