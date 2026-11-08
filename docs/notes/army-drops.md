# Army drops: rare hero shards and XP tomes from army waves (ARMY-DROPS)

The owner's ask: "I want shards and tomes to be able to drop from armies too. It's just much much rarer."

## The rules (`src/sim/armyDrops.ts`)

- **A won army wave rolls a rare drop** (`settleArmyDrop`, called by the page where the wave settles, beside the rift ores). Two
  chances, drawn apart, so a lucky wave can drop both:
  - **shards** of one hero: 2, one more on a boss wave, and a 50% chance of one more again (2 to 4). The hero is a pullable hero
    **not yet owned**, a begun one likelier (`1 + STICKY x shards held`, the stone's own weight); never a content hero. Once every
    pullable hero is owned, the shards are rank shards of a hero owned. They go in through `giveShards`, so an early hero whose bar
    fills joins at once (its first-time reveal tells it, once, as the run's result is left: `docs/notes/unlock-once.md`).
  - **an XP tome**: small 60, medium 35, large 5 by weight; each tier above Normal moves 9 of weight from small to medium (6) and
    large (3).
- **The chances** (`SHARD_CHANCE`, `TOME_CHANCE`), each tier above Normal lifting both by `TIER_LIFT` (15%: Hard x1.15, Mythic x1.6):

| Wave | Shards | Tome |
| --- | --- | --- |
| A plain wave | 0.04% | 0.015% |
| The mid-army boss | 0.2% | 0.075% |
| The last boss | 0.3% | 0.125% |
| **A whole run on Normal** (13 plain, 1 mid, 1 last boss) | **1.0%: one in about 98 runs** | **0.4%: one in about 250** |
| A whole run on Elite | one in about 75 | one in about 195 |

  For the model's player (13 army runs a day, ten of them auto) that is a shard drop about every six days and a tome about every
  fifteen. Chests come many times as often, so this is "much, much rarer".
- **Armies only.** The daily, the spire, the Last Stand and the Calamity have none (the default; the ask named the armies). Replays
  of cleared armies, by hand or by auto-replay, roll at the same rates.
- **Its own side stream:** `new Rng(mixSeed(run.seed, DROP_SALT, wave))`, five draws in the same order whatever drops. The fight's
  stream (`b.rng`) and every other reward's stream are untouched, so fights and the scenario and ailment hashes play the same.
- **No farming by retrying:** the roll is the run's seed and the wave's number, so a wave refought in the same run (a reload mid-fight)
  rolls the same, and a lost wave rolls nothing. A new run is a new seed, as any reward's.
- **Banking:** the drop goes into the meta as the wave is won (`giveShards`, `grantTomes`), and the meta is saved with the wave, so
  leaving or losing later keeps it. Nothing new is saved: `Meta.unlock`, `Meta.shards` and `Meta.tomes` hold it (old saves load as they did).
- **The dev hook:** `window.__forceDrop = 'shards' | 'tome' | 'both'` makes the next won army wave drop that (its hero and size still from
  the wave's stream), for screenshots.

## Where it shows

- **The short wave card** (`waveCard.ts` `drops`, a `drop` note, first of the finds): "Found: 3 shards of Kwame · Knight" or "Found: a
  medium XP tome", in gold with a warm glow and one slow shine across it as it arrives (`battleReports.css`, `.wn.drop`; it settles,
  nothing loops; reduced motion shows it still).
- **The run recap's spoils** (`run.recap.found`, through `noteWave`): the same words, beside the gear.
- **The auto-replay summary**: a "Rare drops" row (`AutoTotals.drops`) when any came.

## The pace (`npm run unlock-pace -- --seeds 60`, before with `--nodrops 1`)

Day reached, median of 60 seeds (the typical player of `docs/notes/hero-shards.md` and `summon-stones.md`). The drops' runs are the
model's farm (13 a day on the best tier cleared); the first clears' runs are left out, so this is a little generous.

| Pullable heroes owned | Before | With the drops |
| --- | --- | --- |
| 10th | day 20 | day 18 |
| 15th | day 62 | day 56 |
| 20th | day 89 | day 86 |
| 30th | day 147 | day 144 |
| 35th (the last pullable) | day 176 | day 175 |

All heroes (45): day 186 both (the Tyrant's tower floors set the end). Heroes owned on day 60 / 90 / 120 / 150: 16, 26, 32, 37 before;
17, 27, 33, 38 with the drops. A year holds about 58 shard drops and 24 tomes; the tomes add about 2% to the XP the tomes give in all
(day 180: 1,181,000 before, 1,209,000 after). So collecting speeds up by a few days in the middle game and hardly at all at the end.

Why not "one every several runs": at ten times these rates (a shard drop in about 5 runs) the model's 35th hero came on day 105
instead of 176, and the 15th on day 17 instead of 62. Late on, a stone's pull is almost always a rank shard, so a drop aimed at a hero
not owned is worth far more than its count; the rate has to be low for the pace to hold. `--droprate <x>` tries other rates.

## Tests (`test/army-drops.test.ts`)

Deterministic per seed and wave; a wave refought rolls the same; the rates over 60,000 Normal runs (a shard drop in 70 to 130 runs,
a tome in 180 to 340); bosses and tiers lift a little; shards go to a hero being collected (never a content hero, never one owned while
some are left), rank shards when all are owned; a loss drops nothing and a win pays only shards and tomes; the card's line; no fight
draws; a save round trip and an old save.

Changed: `test/summon-stones.test.ts` "shards come only from stones" now allows `armyDrops.ts` as a caller of `giveShards` (the owner's
new ask makes the armies a second source of shards).
