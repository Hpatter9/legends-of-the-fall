# Rank up card follows the score system

The fights already gave ranks, grades and awakening their score steps (`stats.ts` `stepBonus`: +1 to the primary and second score per rank above 1
up to `STAT_MAX_RANK`, `AWAKEN_SCORE` +2 to the primary per awakening), fed through `statPower.ts` on top of `rankMult`. The Rank up and
Awakening card (`src/rankUpView.ts`) still worked Hp and Attack from `lastingBoost × rankMult` alone. It does not any more.

- **`src/sim/rankStep.ts`** (pure). `fightFigures(kind, level, rank, extra)` is `addUnit`'s health and attack at grade 1: `gradeBoost` times the
  `statMults` shares. `stepPlan(kind, level, from, to, extra)` gives the before and after of both, the scores that rise (with the modifier
  move and what it means, from `scoreEffects`), and AC, to hit, skill DC and saves, but only those the step changes.
- **`scoreEffects`** was lifted out of `scoreCompare` in `statLines.ts` so the gear compare and the card use the same words ("blows +5%").
- **The hero sheet** (`menuHeroes.ts`) now shows Health and Attack through `fightFigures` too, so the sheet and the card always agree. Before, the
  sheet's two numbers also left the score steps out.
- **The card**: Hp and Attack rows; one line of the scores that rise ("STR 17 → 18 · CON 15 → 16"; an awakening shows its +2 on the primary);
  one small line of what moved ("STR +3 → +4: blows +5% · AC 15 → 16"). Talent and gear score points (`heroStats(...).scores`) are counted, as the
  Stats panel counts them.

Test: `test/rankup-scores.test.ts` (a plan equals the sheet's numbers and tiles at the next rank for every hero; Hp equals a unit built by
`addUnit`; the +1 / +2 steps; figures listed only when changed). Shots: `tools/rankup-scores/shots.mjs` writes `docs/samples/rankup-scores-*.png`.
