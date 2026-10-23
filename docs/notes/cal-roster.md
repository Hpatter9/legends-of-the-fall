# The Calamity's roster, tiers, boards and scaling

The owner: "there is no reason to merge. Tier upgrades should come with levels... Tier three should be late in the Calamity run." And: "Calamity isn't scaling well. My guys aren't even getting hurt on the second level."
Armies and the other modes are untouched (merging, the 7 x 9 board). Everything below is the Calamity only. Every number is a named constant to tune.

## One of each hero, from all 45 (`tower.ts`, `climb.ts`)
- A hero is hired **once a run**. `hireable(run)` is every kind not on the roster; `hireClosed(run, kind)` is true for a kind it holds. Camps, the shop and the prisoner event draw only from `hireable`; `hire` and `buy` refuse a closed kind
  (an offer made before the same hero came from elsewhere shows "in the party" and cannot be bought).
- **All 45 can turn up**, the ones the player has not unlocked too (`Hire` offers are drawn from `ALL_HEROES`). To keep it fair: the **first of a camp's three offers is always a hero the player owns** (while one is left),
  the other two come from every kind at the same odds, and each camp's draw is from the seed and floor (`0xca11`), so a reload shows the same three. Heroes have no rarity, so a stranger is no stronger than an old friend.
  A hire of an unowned hero is for the run only: it does not unlock the hero or give shards.
- Saves: an old run holding two of a kind plays on (only new hires are blocked).

## Tier follows level (`calamity.ts` `CAL_TIER`, `climb.ts` `promoteByLevel`)
- No merging in a Calamity. A hero's grade (the stars) is **2 at run level 12 and 3 at run level 22** (`CAL_TIER.levels`). A tier multiplies hp and attack by `CAL_TIER.mult` = 1.2 (so 1.44 at tier 3), on top of the level; a merge's `GRADE_MULT` is 1.6 and
  is not used here (`Owned.tiered` marks a hero whose grade came from its level).
- `promoteByLevel(run)` raises every hero whose level has earned a tier and returns the promotions. It runs after a fight's XP (`teachFight`), at a campfire's lesson, when a hero is hired (it joins at the tier its catch-up XP earns),
  and as a safety when a fight node is entered (so an older save with levels past a tier is brought up at once). The promotions are kept in `run.tower.promoted` (`{ id, kind, from, to }[]`, saved with the run, reset by the next fight's result).
- **The promotion moment:** `main.ts` reads `run.tower.promoted` when a fight's result comes in, plays the merge chime and puts the ids in `evolved`, so each promoted hero flashes (`UnitSprite.evolve`) when it next stands on the board and its card
  takes the evolve animation, exactly as a merged hero does. `claude/hero-skills` can hook the same place (`run.tower.promoted`) for flashier promotions and tier skills.
- **When it lands** (300 runs, share of the roster at tier 2+ / at tier 3 after each map's boss): map 1 .27 / 0, map 2 .63 / 0, map 3 .94 / .07, map 4 .99 / .33, map 5 1.00 / .64, map 6 1.00 / .83.
  The starting hero is tier 2.1 after map 3 and 2.7 after map 4 (level 22 comes at the end of map 4, median). So tier 2 is mid-run (maps 2 and 3) and tier 3 is late (maps 4 to 6; most of the party only in 5 and 6). The owner's 12 and 22 are kept.

## Bigger boards (`board.ts`, `battle.ts`, `calamity.ts` `CAL_BOARD`)
- `makeBoard(seed, area, w, d)` (the usual 7 x 9 when not told): a Calamity fight is on **10 x 13 (130 tiles, 2.06 times the area)**, carried in the fight spec's `stage.size`. The height rules are the same (platforms with a staircase, pits,
  boulders, `boardOk`), the land is laid by the same streams, and an area-sized board lays more of each (`areaScale`: one more platform and pit, two more boulders, one more patch of ground); the usual board's tiles are
  byte for byte what they were (a test, and a hash over seeds and areas). Deploy rows are still three at each end (`isDeployTile(v, depth)`, `canPlace`, the autoplay deploy tiles, the twists' lava and narrow pass and the ambush all read the board's own size).
- A fight in a Calamity opens with the camera on the heroes' rows and then follows the fighters as it does for the long map; nothing was needed there (the camera already fits the fighters and pans). At 393 wide the whole board does not fit at a readable scale, so the page
  frames the action instead (screenshots `docs/samples/cal-roster-*`).
- **Foes fill it** (`fitBand`): still one more than the heroes (a boss two more), but past the band's five the band comes round again without its leader: ten heroes meet 11 foes, a boss fight 12 (`CAL_FOES_MAX` 13).
  Foes beyond five make a Calamity fight give more kills, so the XP is shared out: a fight pays the XP of five foes at most (`CAL_XP_BAND`), keeping the levels at their tuned pace.
- The bot, the tests and the tools find the deploy rows from `board.d` now, not `D`.

## Scaling: hurt on map 2, and the shares (`calamity.ts` `CAL_SCALE`, `tools/tower-balance.ts`)
Measured with the new `--calamity` table: the **mean share of the squad's hp each fight takes**, by map (ordinary fights and bosses apart), the fights with a hero down, the fights lost, and the tier shares.
Before (150 runs, same bot): ordinary fights took **12 / 8 / 10 / 12 / 11 / 15 %** of the squad's hp by map (map 2 took less than map 1: the owner's "not getting hurt on the second level"), bosses 36 / 56 / 66 / 62 / 67 / 70 %.
The bigger squads, the tiers and 45 kinds made the Calamity far easier first (77 % cleared with nothing re-tuned), so:
- foes: `perHero` 0.15 to **0.06** (the foes are now more numerous, so each needs less), `step` 0.381 to **0.55**, and a new **`atkBias` 0.35**: from map 2 on, the foes' attack (not their hp) is 35 % more, so fights are shorter in hp but bite;
  the heroes end them hurt rather than the foes simply taking longer. Bosses 2, 3 and 4 hp x1.05 / 1.15 / 1.10, boss 6 x0.95 (hp and half as much attack).
- a built castle: the Calamity's foes answer it by `CASTLE_ANSWER.share` (1.2) **plus `CAL_CASTLE_EXTRA` 0.3** (the heroes' tiers would otherwise carry a castle save through the middle maps; the spire keeps 1.2). `test/difficulty.test.ts` states it.

**After** (300 runs, the greedy bot, no castle). Share felling each map's boss: **90 / 82 / 66 / 49 / 34 / 12 %** (target 85 / 81 / 63 / 44 / 35 / 15; map 4 is five over, map 1 five over: the lone-hero opening is unchanged).
Starter's level after each boss, median: 10 / 16 / 20 / 22 / 25 / 28 (before 10 / 16 / 20 / 22 / 26 / 30); at the end median 21, mean 20.2; cleared whole (37 runs) median 28.

| map | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|
| ordinary fight: share of hp lost | 12 % | 15 % | 21 % | 22 % | 22 % | 28 % |
| ... fights where a hero falls | 3 % | 31 % | 70 % | 78 % | 76 % | 85 % |
| boss fight: share of hp lost | 34 % | 48 % | 55 % | 46 % | 54 % | 57 % |

(A fallen hero comes back at a quarter hp, so "a hero falls" counts the weakest of ten dropping; it is not a lost hero.) Map 2 now takes twice what it did (8 to 15 %), and from map 3 a fight costs a fifth of the party's hp.
- **A careless party** (`--rush 4`: faces the boss after four spots a map; 100 runs): clears 61 / 36 / 14 / 3 / 3 / 2 %; `--rush 8`: 71 / 36 / 11 / 5 / 3 / 3 %. It loses plenty.
- **A castle**: maxed (150 runs) 94 / 93 / 75 / 53 / 38 / 8 % (before the change: 95 / 93 / 70 / 50 / 38 / 16); half-built 87 / 86 / 76 / 56 / 35 / 11 %.

Re-run: `npm run balance -- --no-tables --calamity --attempts 300 [--castle maxed|half] [--rush n] [--cal perHero=..,step=..,atkBias=..] [--tier 12,22,1.2] [--asc n]`.

## For the owner
- The first hire of every camp is a hero you own; the other two are any of the 45. Say if you would rather have all three random, or if unowned heroes should only start showing up later.
- Tier 2 and 3 multiply by 1.2 each (not the merge's 1.6). Tier 3 reaches most of the party in maps 5 and 6.
- The Calamity foes bite harder from map 2 (`atkBias`); a built castle makes them tougher than the spire's answer.
- The whole board does not fit the phone at a readable size; the camera frames the fight. A lone hero on map 1 also meets its two foes on the big board, so the first fights take longer to start.
