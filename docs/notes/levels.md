# Levels (hero XP)

Heroes gain XP from each fight and level up between fights. A level adds to the kind's hp and attack for good. Most of
the XP comes from what a hero killed, so the foes that matter (the bosses, and the deeper stages) are worth the most, and
a hero that has lost a fight still keeps what it earned. That is what lets a run that loses on the first boss feed the
next run.

- **Rules**: `src/sim/levels.ts`. `fightXp(b)` gives each hero that fought (placed) its XP: 5 for taking part, +5 for a
  win, +1 per 40 damage dealt, +1 per 40 healing done (credited to the healer), and the XP its kills are worth. A fallen
  hero keeps all of it. The totals are summed by hero kind.
- **Kills**: `killXp(foe)` is a tenth of the foe's max hp, so a kill is worth more on a deeper stage (a stage's boost
  raises the hp). A boss kill is worth `BOSS_KILL` (three) times that. The killing blow's XP is added to the killer as it
  lands (`hurt` in `battle.ts`, into `Unit.slain`).
- **Counters**: `Unit.dealt`, `Unit.healed`, `Unit.kills` and `Unit.slain` in `src/sim/battle.ts` (set in `hurt` and
  `mendUnit`). They only record; no rule reads them during a fight, so fights play out as before.
- **Storage**: `Meta.xp` keeps the total XP per kind (missing is none). The level is read from it, so it can't drift.
  Old saves load with none; bad entries are dropped.
- **Curve**: a level needs `30 × (level − 1) × level` total XP, so each level costs 60 more than the one before. Level 2 at
  60 XP, level 3 at 180, level 5 at 600, level 10 at 2,700, level 20 (the cap, `MAX_LEVEL`) at 11,400.
- **Stats**: each level above the first adds 22% hp and 18% attack (linear, from the base) up to level 12. Past level 12
  each level adds only a quarter of that (`DIM_LEVEL`, `DIM_SHARE`), so a long run's levels stop being decisive; level 20
  is 13 steps in all. The gains are steep on purpose: a team's levels, not just its grades, decide the walls (see
  `balance.md`). `levelBoost` gives the
  multipliers. They stack with the grade and the shard rank: `gradeBoost(grade, rank, level)` in `src/sim/run.ts`, which
  `src/main.ts` passes `levelOfKind(meta, kind)` to, at the place and the drag.
- **Result screen**: an XP section under the stats (`#xp`, built in `showXp` in `src/main.ts`). One row per hero kind
  that fought: the bar fills with its XP. A level up fills the bar, then shows "reached level N! +hp% HP · +atk% Atk",
  the bar starts again from the new level, and the `levelUp` chime plays.
- **Bench and Heroes page**: a bench card shows "Lv N". The Heroes page shows the level, the XP to the next, and a bar.
- **Why these numbers**: `npm run balance` plays a greedy player through five runs on fresh saves (its table 4, in
  `balance.md`). The kill XP alone made the first run's heroes level 3 to 5 by the boss, and a greedy first run won the
  boss about 80% of the time, so the first boss got much stronger (the orc warlord's stats in `foes.ts`). With that, a first run at level 1 cannot
  win it, and the curve and the per-level gains set how fast the second and third runs catch up.
- Tests: `test/levels.test.ts`, and `test/progression.test.ts` (a fresh team at level 1 loses the first boss; the same team
  at the levels a few runs give usually wins it).
