# The holds retuned against the realistic force (ASSAULT-RETUNE)

**Withdrawn before release (RELEASE-TRIM, [release-trim.md](release-trim.md)):** the Assault and everything here that only it used are gone from the game; this note is kept as the record of what was built. The nine hold sheets (`src/art/assault/`) stay, as every battlefield's floor and set pieces.

The owner's call ("Yes, retune them"), on the first balance read of Try an Assault (`docs/notes/assault-dev.md`): with the force a player
really has when they reach a hold, every storming was won, most of them trivially. The holds had been tuned for a bare party: the level
alone, rank 0, no talents and skills at Level 1 (`npm run balance -- --assault`).

**The yardstick** is the trial's force at "As expected" (`trialForce` in `src/sim/assault/devTrial.ts`: the level, rank, talents, skills,
castle and host of the game's paces), the balance party (Knight, Samurai, Archer, Wizard, Dragoon), the muster's default plan, Auto:
`node tools/assault-dev/run.mjs`.

**The targets** (the director's, for the owner): each hold won about 70 to 80% of the time, about 40 to 70% of the host lost; the Last
Hold the hardest; the Warband regrouped at Mythic hard but fair; Weak still winnable sometimes.

## The levers

- `HOLD_SHARE` (a hold's first storming): each hold's own share, now 1.6 to 4.0 times what it was.
- `LAST_SHARE` (the Last Hold, on top of `HOLD_SHARE`): now 0.92 to 2.63. `test/assault-last-hold.test.ts` held it under 2; that bound
  is now 3, with the reason beside it (the Last Hold is fought at level 100, a conquest at the hold's own mark of 55 to 100).
- `RESTORM_SHARE` (new; the Warband regrouped, on top of `HOLD_SHARE` and the Mythic tier's own multipliers): 0.87 to 2.19. The re-storm
  had no share of its own; it only took the Mythic tier. `shareOf` applies it for an assault at tier 4 (`test/assault-retune.test.ts`).

All three are in `src/sim/assault/garrison.ts`. Nothing else in the fight changed.

| Hold | `HOLD_SHARE` before → after | `LAST_SHARE` | `RESTORM_SHARE` |
| --- | --- | --- | --- |
| Bloodtusk Hold | 0.155 → 0.248 | 0.95 → 2.63 | 2.188 |
| Barrow Necropolis | 0.1175 → 0.2598 | 1.12 → 2.097 | 1.872 |
| Howling Den | 0.14 → 0.322 | 0.8 → 1.984 | 1.522 |
| Elder Root | 0.095 → 0.1995 | 0.97 → 1.922 | 1.668 |
| Heart of the Maze | 0.125 → 0.2062 | 0.88 → 1.553 | 0.909 |
| Bonefire Crag | 0.095 → 0.285 | 1.45 → 1.836 | 1.015 |
| Brimstone Gate | 0.075 → 0.27 | 1.25 → 1.33 | 0.873 |
| Moonlit Shrine | 0.07 → 0.168 | 0.91 → 1.16 | 0.958 |
| Iron Foundry | 0.0775 → 0.31 | 0.9 → 0.919 | 1.056 |

**How it was found.** A sweep of each storming's share times a factor (the tool's `--scale`, 8 seeds a step), a finer one round each
crossing (16 seeds), then confirmation at 24 and 32 seeds with small nudges where a cell stayed out of the band.

## Before and after ("As expected", Auto, the balance party)

Wins, then the share of the host lost. Before: 16 seeds a cell (the code of main 0.600.0). After: 32 seeds a cell (the final values).

| Hold | Conquest before | Conquest after | Last Hold before | Last Hold after | Regrouped before | Regrouped after |
| --- | --- | --- | --- | --- | --- | --- |
| Bloodtusk Hold | 100%, 36% | 72%, 80% | 100%, 9% | 75%, 85% | 100%, 14% | 75%, 79% |
| Barrow Necropolis | 100%, 10% | 84%, 70% | 100%, 4% | 63%, 85% | 100%, 12% | 69%, 76% |
| Howling Den | 100%, 9% | 78%, 85% | 100%, 1% | 81%, 89% | 100%, 6% | 78%, 87% |
| Elder Root | 100%, 4% | 81%, 71% | 100%, 2% | 81%, 85% | 100%, 4% | 75%, 78% |
| Heart of the Maze | 100%, 26% | 84%, 70% | 100%, 8% | 84%, 79% | 100%, 35% | 81%, 75% |
| Bonefire Crag | 100%, 3% | 84%, 66% | 100%, 1% | 72%, 92% | 100%, 6% | 88%, 76% |
| Brimstone Gate | 100%, 3% | 81%, 60% | 100%, 4% | 81%, 82% | 100%, 8% | 59%, 81% |
| Moonlit Shrine | 100%, 30% | 84%, 75% | 100%, 13% | 75%, 74% | 100%, 31% | 75%, 80% |
| Iron Foundry | 100%, 4% | 84%, 83% | 100%, 8% | 72%, 91% | 100%, 9% | 78%, 90% |

Before, 20 of the 27 were trivial (always won, under a fifth of the host lost). After, the wins run 59 to 88%, and the stormings take 3 to 9
minutes of battle time where they took a minute and a half.

## Weak and Strong now

Wins, host lost. Weak is ten levels down (8 seeds a cell; the Bloodtusk, Necropolis, Elder Root and Brimstone rows at 16 seeds on the final
values). Strong is ten levels up, a full castle and Veterans (at the Last Hold and the Warband regrouped, already at level 100, a rank higher
instead); 8 seeds a cell, measured just before the last small nudge to four cells (the Last Hold at Bloodtusk and Brimstone, the
Necropolis's conquest and Elder Root regrouped).

| Hold | Weak: Conquest | Last Hold | Regrouped | Strong: Conquest | Last Hold | Regrouped |
| --- | --- | --- | --- | --- | --- | --- |
| Bloodtusk Hold | 44%, 92% | 25%, 96% | 19%, 94% | 100%, 54% | 63%, 89% | 63%, 84% |
| Barrow Necropolis | 19%, 89% | 25%, 89% | 31%, 90% | 100%, 45% | 88%, 79% | 88%, 76% |
| Howling Den | 38%, 98% | 13%, 97% | 25%, 99% | 100%, 90% | 75%, 66% | 88%, 71% |
| Elder Root | 69%, 83% | 19%, 95% | 13%, 95% | 100%, 37% | 75%, 68% | 75%, 83% |
| Heart of the Maze | 100%, 75% | 38%, 95% | 88%, 87% | 100%, 52% | 88%, 66% | 88%, 70% |
| Bonefire Crag | 63%, 71% | 25%, 94% | 13%, 93% | 100%, 19% | 100%, 83% | 100%, 65% |
| Brimstone Gate | 56%, 80% | 31%, 89% | 25%, 89% | 88%, 66% | 88%, 85% | 100%, 60% |
| Moonlit Shrine | 38%, 84% | 50%, 94% | 50%, 96% | 88%, 69% | 63%, 78% | 100%, 81% |
| Iron Foundry | 88%, 92% | 38%, 96% | 50%, 94% | 100%, 84% | 88%, 87% | 100%, 84% |

Every Weak storming can be won (13 to 100%). A Strong conquest is won 88 to 100% of the time. Strong at the Last Hold is 63 to 100%, since
there it is only a rank higher.

## What it does not reach

- **The host's losses run high.** The fight swings steeply with the share: at every hold the win rate falls from 100% to about half within
  a fifth of the share, and the host's losses climb from about 40% to over 85% over the same stretch. Where the wins sit at 70 to 80%, the
  host loses 60 to 90%, not 40 to 70%. I held the wins in band and let the losses run high: a share that keeps the losses under 70% wins
  85 to 100% of the time.
- **The Last Hold is the hardest by its host's losses, not always by its wins.** It loses the most of the host at most holds,
  but its win rate is within the noise of the conquest's at several (74 to 92% of the host lost; the Moonlit Shrine's the least).
- **The table is noisy.** The same values measured 10 to 20 points apart between runs, even at 32 seeds (the Den's Last Hold: 59%, then 81%).
  A cell within ten points of the band is as close as these seeds can say.
- **Brimstone Gate regrouped** (59%) and **Bonefire Crag regrouped** (88%) end just outside the band on the final run; their values moved
  between 63 and 94% over the passes on small changes. I left them.
- **The old balance tables** (`npm run balance -- --assault`, the bare party) no longer read the targets: a bare party at a hold's mark now
  loses most stormings. They still measure the fight; the hold tables in `assault-1.md` to `assault-5.md` are the old tuning, kept as history.

## Run

```bash
node tools/assault-dev/run.mjs --seeds 32 --brief                                # the after table
node tools/assault-dev/run.mjs --strength weak --seeds 16 --brief                # Weak
node tools/assault-dev/run.mjs --only orcs --kinds last --scale 0.9,1,1.1 --seeds 16 --brief   # a share's sweep
```
