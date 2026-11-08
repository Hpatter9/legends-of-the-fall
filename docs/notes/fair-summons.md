## Fair summons (FAIR-SUMMONS)

The owner asked that "the heroes should be random who gets summoned. There shouldn't be some that show up more commonly". They chose "every hero equal".

- **A pull** (`drawKind` in `src/sim/unlock.ts`) picks any pullable hero, or an owned content hero, with equal odds, whether owned or not and whether begun or not.
  - Gone: `STICKY`, which made a begun hero 6x likelier per shard held.
  - Gone: `ownedWeight` / `OWNED_BOOST` / `OWNED_POW`, which made owned heroes grow likelier as the roster grew.
- **An army chest's shard drop** (`dropKind` in `src/sim/armyDrops.ts`) is likewise even among the heroes not yet owned.
- **The pity stays.** After `pityAt(owned)` pulls with no unlock shards, the pull is the hero closest to joining. With even odds it seldom comes on its own late in the game.
- **The first heroes.** Without the tilt, a first session's shards spread over every hero, so the party's 4th and 5th heroes now join on a single shard (`WELCOME = 2` in `unlockRules.ts`). The slope from `NEED_FIRST` (2) to `NEED_LAST` (100) starts after them.
- **The pace** (`npm run unlock-pace -- --seeds 20`). Median heroes owned, old against new:

  | Day | Old | New |
  | --- | --- | --- |
  | 1 | 5 | 5 |
  | 7 | 7 | 8 |
  | 30 | 11 | 12 |
  | 60 | 14 | 16 |
  | 120 | 20 | 23 |
  | 180 | 27 | 29 |
  | 365 | 41 | 44 |

  So heroes come a little sooner through the year. More pulls now give new-hero shards and fewer give rank shards.

**Tests:** in `test/hero-shards.test.ts`, the odds test now checks even odds, and the pity test sets up a dry run. `test/army-drops.test.ts` checks that a begun hero is no likelier.
