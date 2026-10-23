# The Calamity map: free exploration

The owner: "For the calamity map, I should be able to go to all the spots on the map. So I can backtrack. It's not a floor change. It's a map to clear before moving to the next map."

## The rules (`sim/tower.ts`, `sim/calLand.ts`; only the Calamity changes, the tower's climb is as it was)
- **A map is cleared in any order.** The state is the set of spots cleared (`TowerState.path`, now an unordered set; no longer a chain), where the party stands (`here`: any spot, a hidden side spot, or the portal;
  `at` is the last cleared node, as before), the shops it has opened (`shops`) and a count of spots cleared in all (`spots`). `row` and the floor-by-floor climb are not used by a calamity.
- **Bridges go both ways.** The graph's `next` links are taken as undirected bridges (`neighboursOf`; the portal joins the first floor; a hidden side spot joins its node). `choices(run)` for a calamity is
  every spot a bridge leads to from a cleared spot (or the portal) that is not cleared yet: both sides of a fork, branches passed by, the first floor. Nothing locks out anything else.
- **The boss can be fought any time its lair is shown** (it shows when a spot next to it is cleared, the campfire before it). All else is optional: skipping is less XP, gold and loot, and a faster run. Its fall
  opens the next map at its start (`path`, `sideDone`, `shops`, `here` reset; `run.stage` is the new map's first floor).
- **Cleared spots stay cleared.** A fight, chest, campfire, recruit camp, mystery or hidden spot is spent once used and cannot be entered again; walking through a cleared spot is free and safe (`moveTo`,
  nothing starts, nothing is paid). **A shop stays open**: `enterNode` lets a cleared shop in again, and what is left in it is kept in `shops` (a visit is not a new spot).
- **Fog** (`fogOf`): the portal and the first floor, every cleared spot and every spot a bridge leads to from one (both ways), the spot in play, a hidden side spot once its node is cleared. Nothing further.
  Hidden side spots can be taken whenever the party likes once shown (they are never skipped for good); the party then stands on the side spot, and walks back over its bridge.
- **The walk** (`routeTo` / `routeBetween`): the shortest way over the bridges from where the party stands, through cleared spots only (ties to the lower id: deterministic); an uncleared spot ends a route. The leader
  walks it on the stones of each bridge (0.5 to 1.5 s in all, tap to skip), the camera following.
- **Difficulty** (`spotFloor`): a spot counts as its row's floor, running on through the maps (a hidden spot one floor deeper), so a spot further from the start is harder whenever it is reached. A fight's band and
  strength come from the spot, not from the order the party took, so the same spot is the same fight. `run.stage` is set to the spot's floor when it is entered (rewards, shops and events read it).
- **Saves:** every new field is optional. A saved calamity from before loads and carries on **under the new rules**: its `path` is its cleared set, `at` is where it stands, the branches it passed are open, and its
  `row` is ignored. (`test/calExplore.test.ts` keeps one.) Closed mid-walk: `going` is saved as before, and now also for a cleared shop.

## The screen (`calMap.ts`, `towerView.ts`)
- Any spot a lit bridge leads to can be tapped, and **any cleared spot to walk back to it** ("Walk there"); a cleared shop says "Visit the shop again". Cleared spots look spent (as before, with the green tick);
  a shop cleared wears a green ring. The portal can be walked back to too.
- The header reads **"Map 2/6"** with **"5 of 9 spots cleared"** under it (the lair is not counted).
- The lair is tappable once shown. With spots left it asks first: **"Face the boss now? N spots unexplored"** (the confirm box, "Keep going" / "Face the boss").
- **The camera follows the party home:** when the map is drawn again after a spot is cleared (a fight's result, a chest, a campfire, a recruit camp, a mystery, a shop closing, or the boss opening the next map), it
  **eases onto the leader** the way it follows a walk (about half a second, no snap; at once under reduced motion), whether or not the map was panned away. A new map opens with the camera a little off the
  portal and easing onto it.
- Summary and battle labels say "spots cleared", not floors.

## Levels
Not redone here: the in-run cap 30 (`RUN_MAX_LEVEL`, `LATE_LEVEL` 20 for lasting levels) and the Calamity's own XP rate (`CALAMITY_XP`) came from the balance pass (`balance-pass.md`). The one change: **`CALAMITY_XP` 15 to 9**, because free
exploration is many more fights (about 80 spots in a run against about 30 nodes) and the starter would otherwise end a full clear near level 28 to 30.

## The bot and the balance (`tools/autoplay.ts`, `tools/tower-balance.ts`)
- **Policy** (`explore`): clear every spot it can reach, the best-wanted first (fires and shops when hurt, recruits while there is room, a hoard always, a mini-boss while the squad is hale); take a hidden spot as it shows
  (a hoard always, a mini-boss above 70% health); look in again at a cleared shop with 70 gold or more; **only then the boss**. So it clears each map in full, the thorough player. (`explore.limit` caps the spots cleared per map.)
- **Tables** (300 runs, `npm run balance -- --no-tables --calamity --attempts 300`; share felling each map's boss / the starter's median level after each boss):
  - before (the balance pass, one climb): 84 / 83 / 65 / 45 / 35 / 16 %; levels 12 / 15 / 20 / 21 / 23 / 25.
  - free exploration, nothing re-tuned: 97 % on every map; levels 11 / 17 / 20 / 23 / 25 / 28 (median at the end 28).
  - **re-tuned: 85 / 83 / 61 / 43 / 35 / 15 %** (target 85 / 81 / 63 / 44 / 35 / 15); starter's level after each boss, median **10 / 16 / 20 / 22 / 24 / 27**; at the end, median 22, mean 19.6 over all runs; cleared whole
    (46 runs) median 27, mean 24.9, max 30.
  - re-tune: `CAL_SCALE` start 0.265 to 0.40, growth 0.06 to 0.05, step 0.33 to 0.43; `CALAMITY_XP` 15 to 9; boss hp and attack 2400/66, 3708/80, 2964/70, 3575/60, 2623/50, 1398/31 (maps 3 and 6 down, 1, 2 and 5 up).
  - the full-clear starter's median is above the 22 to 25 asked for (27; its mean is 25): a clear is a selection of the strongest runs. Lowering `CALAMITY_XP` further moved the shares more than the level.
- The spire (`--tower`) is unchanged.

## The opening, and the final numbers (after the director's review)
- **A gentler opening** (`CAL_OPENING` 0.6 / 0.75 / 0.9 on floors 1 to 3): a lone level-1 hero is not lost in the first fight (0 of 300 seeds at ascension 0; 7 of 300 at ascension 10, from 3 of 20). The strength is put
  back by `CAL_SCALE` (start 0.425, growth 0.05, step 0.381) and `CALAMITY_XP` 10. The ascension test is back on its original seed (3).
- **The bot never gives a hero away** (it passes over a mystery's "offer a hero"): with about 80 spots a run it met many more mysteries and could lose its starter, which made a full clear look like a level-5 starter.
- **Final** (300 runs): **88 / 84 / 62 / 45 / 35 / 14 %** (target 85 / 81 / 63 / 44 / 35 / 15); starter's level at the end median 22, mean 20.8 over all runs, cleared whole (42 runs) median 28, mean 26.3.
- The army climb (`--climb --saves 240`, mean tries) is unchanged: 2.7 / 2.4 / 2.1 / 3.2 / **3.6** (the Labyrinth) / 1.8 / 1.6 / 1.7 / 1.3; the spire (`--tower`) 12 median, 13.1 mean (13.2 before), bosses 7 / 3 / 3 %.
