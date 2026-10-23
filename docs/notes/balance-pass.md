# Balance pass: all 45 ultimates at level 15, a tougher Labyrinth

Two owner decisions (a third, Calamity heroes past level 20 and its re-tune, was dropped from this pass: the Calamity map is changing, and another worker takes it), all measured with the repo's tools (`npm run balance`, `tools/heroSweep.ts`) before and after. Fixed seeds throughout; the climb tool's own noise is about 0.15 tries, the Calamity's about 2 to 3 points a map.

## 1. The first eight ultimates wait for level 15 too

- `ultimates.ts` `heroUltimates` copies the first eight's ultimates (Kitsune, Karasu Tengu, Yamabushi Tengu, Gorgon, Samurai Commander, Great Sage, Demon Swordsman, Tyrant) with `unlock: ULT_LEVEL`. So all 45 are gated by `Boost.level` the same way (a kind's lasting level, or the in-run level in the spire and Calamity): no meter, no charge and no cast below 15, and the hero sheet shows the dimmed ultimate with "Unlocks at level 15." (`menuHeroes.ts` reads `unlock`, nothing changed there).
- **Foes keep theirs.** Kits are shared by name: `eliteSethra` is the Gorgon's kit and `eliteKuro` the Karasu's; the Gorgon Queen and Nine-Tails copy theirs. Gating the hero's table entry would have taken the ultimate from them (a foe never takes a gated one), so `abilities.ts` puts the ungated original back on every non-hero kit that shares one (`GATED`). The bosses' phase kits (`bossPhases.ts`) borrow only non-gated skills (Minotaur, Satyr, Boar King, Devil Leader, Seer, Crystal Golem, Orc Warlord), so they are as they were. Test: `foes that borrow the first eight's kits by name keep their ultimates` (Gorgon Queen, Sethra, Kuro, Nine-Tails have it at level 1 and the Queen casts it).
- **Level-1 parity.** Gating alone moved the eight at level 1 (stage 5, 12,000 seeded fights, lift over the roster average, points):

| Hero | Before | Gated | Gated + trim |
|---|---|---|---|
| Kitsune | 0.0 | -1.0 | -1.5 |
| Karasu Tengu | 0.6 | 0.5 | 0.1 |
| Yamabushi Tengu | -0.0 | -2.8 | -2.1 |
| Gorgon | 0.2 | -0.3 | 0.0 |
| Samurai Commander | 0.7 | 0.4 | 0.1 |
| Great Sage | 0.1 | 0.4 | 0.8 |
| Demon Swordsman | -0.9 | -2.3 | -0.0 |
| Tyrant | -0.7 | -2.6 | -1.8 |
| **largest of all 45** | 2.9 (Peasant) | 3.0 (Peasant) | 2.3 (Peasant) |

  Three base-hp nudges, nothing else: Yamabushi hp 250 to 262, Demon Swordsman hp 200 to 208, Tyrant hp 230 to 242. No skill, no other hero touched.
- **Level 15** (stage 27) is unchanged by the gating (the ultimates are unlocked there, with the same tuned numbers); the three hp nudges moved it a little: largest lift 3.3 before and 3.6 now (Siege Bot -3.6, Samurai Commander -3.5; Kunoichi, Wolf Bard +3.3), the eight now Kitsune 0.6, Karasu 2.3, Yamabushi -0.4, Gorgon 0.0, Samurai Commander -3.5, Great Sage -1.6, Demon Swordsman -0.8, Tyrant -1.7 (were 0.6, 1.6, -3.0, -0.2, -2.9, -1.5, -2.8, -2.8). Both tests (`hero-balance`, `hero-balance-ultimates`) pass unchanged at ±4.
- The realistic climb (`--climb --saves 240`) did not move from the gating alone (every army within 0.1 tries).
- Existing tests that used the eight at level 1 (`ultimates`, `more-heroes`, `talents`) now spawn them at level 15 (`ULT_LEVEL`); Feather Storm's check is now "hurts every foe" (its level-15 tuned power is a share of the old blow).

## 2. The Labyrinth

Its final boss (the Minotaur Champion, `armies.ts` `last`) went from hp 2125 / atk 55 to **hp 2420 / atk 61**. Nothing else in the army changed.

Mean tries, `npm run balance -- --no-tables --climb --saves 240` (the same saves):

| Army | Before (0.116.0) | After |
|---|---|---|
| Orc Warband | 2.7 | 2.7 |
| Undead Legion | 2.4 | 2.4 |
| Beast Packs | 2.1 | 2.1 |
| The Wildwood | 3.2 | 3.2 |
| **The Labyrinth** | **2.4** | **3.6** |
| Ogre Clans | 1.9 | 1.8 |
| Infernal Host | 1.7 | 1.6 |
| Yokai Night Parade | 1.8 | 1.7 |
| Golem Forge | 1.3 | 1.3 |

(0.116.0 measures 2.4 here, not the 2.9 of `ultimates.md`: later changes since then; the owner's 3.4 to 3.6 is the target. The later three armies read 0.1 lower because the party now carries a little more XP out of the Labyrinth; all within the tool's noise.) The trial points that fixed the number (hp / atk, tries): 2125 / 55 = 2.4, 2250 / 57 = 2.7, 2330 / 59 = 3.0, 2400 / 60 = 3.3, 2440 / 61 = 3.7, 2470 / 62 = 3.9, 2550 / 66 = 4.9. It is steep: 100 hp is about a try.

## Tools left for the Calamity work

`tools/tower-balance.ts` prints the starting hero's level by map and at the end, and takes `--cal start=..,growth=..,step=..` (try another foe scale for one run). My exploratory numbers for that dropped part (not shipped): with `CLIMB_XP` 15 for Calamity heroes, start 0.265, step 0.33 and the bosses reshaped (hp 3224 / 3900 / 3575 / 2429 / 1520 on maps 2 to 6), the shares held at 84 / 83 / 65 / 45 / 35 / 16 and a full clear ended with the starter at a median of 25.

## Not sure of

- The level-1 gating nudges were deliberately small (three hp changes); level 15's largest lift grew from 3.3 to 3.6 because of them, inside the ±4 test.
