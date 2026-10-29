## Lucky summons

A bought summon now and then arrives already at grade 2 (two stars) instead of grade 1. The chance is `LUCKY_SUMMON`
(5%), read through `luckyChance(run)` in `src/sim/run.ts`, the one place a castle building, relic or item can add to it
later. The roll comes from its own side stream (`mixSeed(run.seed, 0x1c4b, run.nextId)`), so which hero a summon draws
is the same as before. The two free starting heroes and the tower shop's hires stay grade 1. A lucky hero merges like any
other grade 2 (two make a grade 3 since MERGE-TWO, `merge-two.md`; it was three), and on the bench it flashes and sounds like a merge. Test: `test/run.test.ts`.
