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

## Levels (`levels.ts`, `climb.ts`)
- **In-run cap 20 to 30** (`RUN_LEVEL_CAP`; `heroLevel` uses `runLevelOf`). The curve is the plain one to level 20; each level past it costs `RUN_LATE_XP` = 3 times what the plain curve asks (a lasting level costs 4 times), so
  a thorough run reaches the low twenties and a perfect one more. `RUN_MAX_LEVEL` (20) still sets where the lasting curve and the run curve turn. Hires still join at 70% of the roster's mean XP. In-run level 15 unlocks a hero's
  ultimate, which now happens mid-run. Run XP rates are unchanged (`CLIMB_XP` 4).
- **The spire shares these rules**: its heroes may now pass level 20 too. It rarely gets there (see below); tower balance is as it was within noise.

## The bot and the balance (`tools/autoplay.ts`, `tools/tower-balance.ts`)
- **Policy** (`explore`): clear every spot it can reach, the best-wanted first (fires and shops when hurt, recruits while there is room, a hoard always, a mini-boss while the squad is hale); take a hidden spot as it shows
  (a hoard always, a mini-boss above 70% health); look in again at a cleared shop with 70 gold or more; **only then the boss**. So it clears each map in full, the risk-free "thorough" player. (`explore.limit` caps the spots
  cleared per map for tuning.)
- **Re-tune** to hold the share felling each map's boss (300 runs, `npm run balance -- --no-tables --calamity --attempts 300`):
  - before (the one-climb rules): 86 / 81 / 63 / 45 / 35 / 18 %; the starter's level after each boss, median 5 / 7 / 9 / 13 / 15 / 18, max 7 / 13 / 18 / 20 / 20 / 20.
  - with free exploration and nothing else changed: 99% on every map (a full clear in nearly every run).
  - re-tuned: `CAL_SCALE` start 0.2 to 0.32, growth 0.06 to 0.07, step 0.3 to 0.28 and the bosses' hp (2060, 3100, 3030, 4150, 3490, 2100; attack to match): 
  - **after: 87 / 83 / 64 / 44 / 32 / 17 %** (300 runs; the target 85 / 81 / 63 / 44 / 35 / 15, every map within 3); the starter's level after each boss, median **6 / 10 / 14 / 18 / 20 / 23**, max **10 / 19 / 22 / 26 / 30 / 30**
    (the median is of the runs that felled it; a full clear ends at about 23). The greedy bot clears about 80 spots in a run (median).
  - the spire (`--tower`, 30 climbs): 12 floors median, 13.2 mean, bosses 7 / 3 / 3 %, the same before and after.
  - XP was not slowed; the foes and bosses were made harder to answer the extra fights, levels and ultimates.
