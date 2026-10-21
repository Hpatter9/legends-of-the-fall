# Shards (hero ranks)

- A repeat pull gives 1 shard of that hero kind (`DUPLICATE_SHARDS`), in place of the old crown refund. A new kind
  still unlocks and gives none.
- Shards are kept per kind in `Meta.shards` (`src/sim/meta.ts`). A kind's rank is how many thresholds it has reached:
  `RANK_SHARDS = [1, 3, 6, 10]`, so rank 1 at 1 shard, rank 2 at 3, rank 3 at 6, rank 4 at 10 (`MAX_RANK` 4).
- Each rank is +5% hp and attack for every hero of that kind (`RANK_MULT` 1.05, `rankMult`). It multiplies into the grade
  boost: `gradeBoost(grade, rank)` in `src/sim/run.ts`, which `src/main.ts` passes `rankOf(meta, kind)` to. It applies
  from the next fight that places the hero.
- Old saves: a save without `shards` loads with none, and shards for kinds no longer in the game are dropped. Crown
  refunds already paid stay as they were.
- The recruiting screen (`src/gacha.ts`) reads "+1 shard" on a repeat, and each unlocked hero in the collection shows
  "Rank N" with a bar of its shards towards the next rank.
- Tests: `test/shards.test.ts`, and `test/meta.test.ts` for the pull results.
