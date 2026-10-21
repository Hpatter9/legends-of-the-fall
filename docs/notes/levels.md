# Levels (hero XP)

Heroes gain XP from each fight and level up between fights. A level adds to the kind's hp and attack for good.

- **Rules**: `src/sim/levels.ts`. `fightXp(b)` gives each hero that fought (placed) its XP: 10 for taking part, +10 for a
  win, +1 per 20 damage dealt, +1 per 20 healing done (credited to the healer), and +5 per kill. A fallen hero keeps 75%
  of its XP. The totals are summed by hero kind.
- **Counters**: `Unit.dealt`, `Unit.healed` and `Unit.kills` in `src/sim/battle.ts` (set in `hurt` and `mendUnit`). They
  only record; no rule reads them during a fight, so fights play out as before.
- **Storage**: `Meta.xp` keeps the total XP per kind (missing is none). The level is read from it, so it can't drift.
  Old saves load with none; bad entries are dropped.
- **Curve**: a level needs `12 × (level − 1) × level` total XP, so each level costs 24 more than the one before. Level 2 at
  24 XP, level 5 at 240, level 10 at 1,080, level 20 (the cap, `MAX_LEVEL`) at 4,560.
- **Stats**: each level above the first adds 4% hp and 3% attack (linear, from the base). `levelBoost` gives the
  multipliers. They stack with the grade and the shard rank: `gradeBoost(grade, rank, level)` in `src/sim/run.ts`, which
  `src/main.ts` passes `levelOfKind(meta, kind)` to, at the place and the drag.
- **Result screen**: an XP section under the stats (`#xp`, built in `showXp` in `src/main.ts`). One row per hero kind
  that fought: the bar fills with its XP. A level up fills the bar, then shows "reached level N! +hp% HP · +atk% Atk",
  the bar starts again from the new level, and the `levelUp` chime plays.
- **Bench and Heroes page**: a bench card shows "Lv N". The Heroes page shows the level, the XP to the next, and a bar.
- Tests: `test/levels.test.ts`.
