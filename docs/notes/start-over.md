## Start over, and skills that keep their charge

**Start over** (Settings, the last row): wipes every save and reloads to a fresh game, to try everything from the start.
Two taps: the first turns the button to "Sure? Tap again" for four seconds, and the second wipes. It removes the meta
(heroes, crowns, castle, armies, gear, chests), the run in progress, the tips and the achievements page's seen list
(`SAVE_KEYS` in src/settings.ts); the settings (volume, speed, shake and the rest) and the sound switch are kept.

**Skill charge carries between waves.** Skills fill slowly and rarely went off before a wave ended, so a hero's skill
charge (and a Mythic's ultimate charge) no longer resets to 0 between waves of a run. When a wave is won, `keepCharges`
(src/sim/run.ts) stores each standing hero's charge on its roster entry (`Owned.charge`, `charge2`, saved with the run);
`boostOf` passes it on and `addUnit` (src/sim/battle.ts) starts the hero at that charge next wave, capped at `CHARGE_MAX`.
A hero that fell, or sat a wave out, starts the next one empty. Deterministic, and test/run.test.ts covers it.
