# Recap levels

The owner: the hero recap at the end of a run shows the stats gained from the run's start to its finish; do the same for levels.

## What changed

- Each hero row on the results screen (`src/jrpgRecapView.ts`) now opens its growth block with a **LV** line (`LV 12 → 14  +2`), first, in the same chip style and green gain as the HP, ATK and score lines. A hero that did not level shows no level line (its level stays on the face badge).
- `levelRise` (`src/sim/jrpgRecap.ts`) is the pure rule: the start and end level and the gain, or nothing when the level did not rise.
- No new run field was needed. The start level is read from the XP the hero began the run with (`RunRecap.xpAt`, already kept; `heroGrowth` turns it into `from`), so a run in progress from an older save shows the same line.
- Every mode that ends on this screen (army runs, daily, quests, spire, Calamity) builds its rows through `heroGrowth` / `jrpgResults.ts`, so they all get the line.

## Checks

`test/jrpg-recap.test.ts` covers the line (start → end, none without a level-up, an older run with no start XP).
Shots: `docs/samples/recap-levels-recap-{393,360,412}.png` (`tools/recap-levels/shots.mjs`).
