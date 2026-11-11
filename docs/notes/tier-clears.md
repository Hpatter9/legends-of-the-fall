## TIER-CLEARS: a harder tier keeps its own clears; the loading screen's snow

Two of the owner's asks, on main 0.475.0.

### Auto on a cleared harder tier

The owner: "Auto doesn't show up on harder difficulties that have been cleared" (the Orc Warband on Hard, 3/3 stars, no Auto beside
Fight again).

- **Cause.** The page settled every army wave as Normal: `settleWave(this.meta, army.id, stage, won, rating.stars)` in `main.ts` never
  passed the run's tier. So a Hard clear was counted as one more Normal clear, `rec.hard` was never written, and
  `tierCleared(m, army, tier)` (`sim/autoReplay.ts`) was false for every harder tier. That closed its Auto (`canAutoReplay`) and its x3
  speed (`maxSpeed`), and a harder tier's waves paid Normal's replay crowns instead of the tier's own (`tierCrowns`). The stars were
  right all along: `settleArmyRun` (`sim/armyStars.ts`) reads the tier from the run.
- **Fix.** The page passes `tierOfRun(run)`. A harder tier now keeps its own waves won, its clears and its pay.
- **Old saves.** `readTiers` (`sim/armies.ts`) gives a clear back to any harder tier whose stars were earned (`rec.met`) or whose first
  clear was paid (`rec.first`) but which has no clear of its own: `hard[tier] = { won: <the army's waves>, clears: 1 }`. Nothing is
  back-paid.
- **Test:** `test/tier-clears.test.ts` (a wave settled on Hard counts for Hard; the old save's repair; a tier never cleared is left alone).

### Heavier snow on the loading screen, and no rising flecks

The owner: "I want heavier snowfall on the main loading screen. There shouldn't be any rising sparks, only falling snow."

- `src/index.html`: the snow goes from 36 flakes to 320 in three depths (far 2 px, middle 3.5 px, near 6 px; slower to faster), laid
  out by a fixed sequence, brighter, with a faint dark rim so a flake reads over the pale clouds and snowfields, shown over more of the
  picture and for more of its fall. Most drift one way, as in a wind.
- The twelve rising gold flecks (`.ldEmbers`) are removed with their styles and keyframes.
- Reduced motion still shows no snow. `tools/loading-check.mjs` expects 320 flakes and no flecks.
