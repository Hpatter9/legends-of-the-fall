# Tower reset: a climb that levels its own heroes, and saved climbs

**Rules** (`src/sim/climb.ts`, `modes.ts` `towerRun`, `tower.ts`):
- A climb starts with the whole party (every kind in `meta.party`, one hero each, all in the squad), every hero at level 1
  with nothing worn and no talents, and no shard rank. `Run.local` marks a run whose heroes level within it; the meta's
  levels, gear, talents and XP are neither read nor changed (the castle still counts). A page boost comes from `localBoost`.
- XP is per hero (`Owned.xp`), by the same curve as the lasting levels (`levels.ts`). `finishTower` teaches every hero that
  fought (`fightXpByHero`, times `CLIMB_XP` = 4) and keeps `tower.gains` for the result screen. Campfire training and a
  mystery trainer teach the hero in the run. A hero merged in the shop keeps the best XP of the three.
- Gear: plain fights drop a piece 30% of the time (`FIGHT_GEAR`, own stream), elites always, besides the chests, shops,
  bosses and mimics as before.
- Old tower saves (no `local`) play on as before, on the meta's levels.

**Saving.** The tower and the calamity each have their own slot (`legends.tower`, `legends.calamity`; `saveSlot`,
`loadSlot`, `dropSlot` in `run.ts`), so an army run no longer overwrites a climb. Tapping Tower or Calamity resumes the saved
run at the same node (the card reads "Floor 7 · continue"); a saved fight replays the same fight. A run only ends when it is
lost, cleared, or abandoned ("Abandon this climb", behind a confirm: pays like a lost run, then empties the slot). A tower
run left in the ordinary slot by an older version is moved to its own (`adoptOldTower`).

**Balance** (`npm run balance -- --no-tables --tower --attempts 100`, a greedy climb, no castle). Floors cleared:

| | median | mean | boss 1 felled |
| --- | --- | --- | --- |
| before: lasting level 1 | 7 | 6.6 | 0% |
| before: level 3 | 10 | 10.6 | 4% |
| before: level 5 | 12 | 15.0 | 19% |
| before: level 8 | 25 | 27.2 | 74% |
| after: reset climb | 12 | 19.9 | 23% |

`CLIMB_XP` was the lever (1 gave a median of 9 and nobody past the first boss). Tests: `test/calamity.test.ts`.
Shots: `docs/samples/tower-reset-*.png` (`tools/calamity/shots.mjs`).
Not asked, decided: the shard rank is dropped from a climb too, so every hero starts alike.
