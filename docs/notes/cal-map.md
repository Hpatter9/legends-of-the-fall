# The Calamity's map, shop and rewards (the owner's eleven notes)

Branch `claude/cal-map`. Builds on `calamity-explore.md` (free exploration). Screenshots are in `docs/samples/cal-map-*.png`
(393x852, plus `-360` and `-412` for the other two sizes); `node tools/calmap/cal-map-shots.mjs` makes them
(`npm run web` first), `tools/calmap/cal-map-check.mjs` is the old-save/new-save/full-fight check.

## 1 and 2: one campfire and one recruit spot a map
King God Castle's roguelike map has one rest site a map (and a recruit-style stop); a Calamity map now has **exactly one campfire** (the
floor before the boss) and **exactly one recruit spot** (the third floor). They are made by folding the nodes of those two rows into one
(`oneAt` in `calamityOnce`, `sim/tower.ts`, on its own stream `0xca1b` so the other kinds draw as they did): every path passes the one spot,
which is a hub on the map. Before, every node of those floors was a camp (about 4.6 recruit camps and 3.3 campfires a map).
- The recruit spot offers **one free hero out of three** (`stockHires` cost 0; `hire` refuses once one is taken). Leaving with nobody
  (`leaveOpen`, the "Not now: keep the offer" button) keeps the spot open to come back to; the three offered are the same each time.
- Ascension 2 used to be "the longer maps lose their second recruit camp". That camp no longer exists, so level 2 is now **"heroes for hire in
  the shops cost 40% more"** (`AscRules.hires`, replaces `fewerCamps`). It is listed for the owner below.

## 3: the shop
It already sold a hero, two relics, a piece of gear, a draught and an elixir. The card now groups them under **Heroes for hire / Relics / Gear /
Healing**. A shop stays open to visit again (stock kept); a revisit is not a new spot.

## 4: the back-tracking glitch (reproduced, then fixed)
"Going back to a cleared spot such as the shop, with more gold": after leaving a shop the party stands on it. Tapping it again started a walk
whose route was a single spot; `startWalk` built a one-point path and the animation read past its end (`Cannot read properties of undefined
(reading 'x')`), so the walk never finished, the page stayed "moving" and nothing opened. Reproduced in the browser on the unfixed build (the
error above, the shop card not opening); fixed in `CalMap.startWalk` (a route of one spot arrives at once). `cal-map-shots.mjs` leaves the shop,
gives the party more gold and taps the shop again: it opens, at all three sizes. A sim test (`calMapRewards.test.ts`) keeps the rules under it
(the same stock, what was bought stays bought, a revisit is not a new spot).

## 5: islands further apart
`ROW_A` 8 to 11 (the rows of the map stand a third further apart), the two-spot rows a little wider (b 3, still inside a phone), the hidden
spots search a larger ring. The land is a function of the seed on its own streams; the map's nodes are untouched.

## 6: the next map starts at its start spot
The leader kept the screen position it had on the map before (`CalMap.mount` set which spot the party stood at but not where the sprite was).
A new map now puts the leader at its portal (the start spot) at once.

## 7: a bigger end-of-map recap
`MapRecap` (`sim/tower.ts`): spots cleared of the map's, fights won (and mini-bosses), gold won, relics found, gear found, heroes who joined,
events met. It is gathered as the map is played (`recapOf`; fights, chests, events, elite offers, the recruit spot), kept when the boss falls
(`TowerState.recaps`, and `mapDone` for the page to show once), and shown as a card over the next map (`calClear.ts`, `mapRecapCard`). Old saves
have none and start one when it is next needed.

## 8: detour fights read clearly
A **detour** is a hidden side spot off the road (`calLand.ts`): a hoard or a mini-boss. The line under the map for the detour mini-boss said
"Pays a choice of three relics and double gold", which was false: it paid plain gold, no relic, no gear, no heal, a quarter of the XP, so it read
as a risk with no reason. Now:
- the line says what it is, why, what it pays: *"Detour fight, optional · Pays double gold and gear · No relic, and no healing after"*, with its portrait;
- the button reads "Detour fight!" (and "Open the hoard" for a hoard, "Detour hoard: a hidden stash, no fight. Pays gold only.");
- it **pays double gold and a good piece of gear** (`finishTower`; before: gold only), so there is a reason to take it;
- the footer gives the portrait and three lines the whole width, the button under them.

## 9: no "floor" in the Calamity
Maps and spots in the HUD, the status line ("Map 2 · 3 of 9 cleared"), the banner ("Spot cleared!"), the result summary, the elite line
("Map 1 · ..."), the recap and the tips. The twist "Treasure floor" is now "Treasure ground"; ascension 8 reads "Every boss fight carries a curse".
The endless tower keeps its floors.

## 10: finishing a whole Calamity (`sim/calReward.ts`, `calClear.ts`)
Paid once, on top of the maps' crowns and the gold chests, by `settleCalamity` (`payClear`):
- **crowns**: 2,400 x the ascension multiplier (1 + 0.2 a level), so 2,400 at 0 and 7,200 at 10;
- **hero shards** (the hero-shard rules, `giveShards`: unlock shards for a hero not owned, rank shards for one owned; the heroes by `drawKind`):
  2 + level/2 draws of 5 shards each, so 10 shards at level 0 and 35 at 10;
- **a Legendary piece of gear** (Mythic from level 6), a milestone-level roll;
- **a title** for the level cleared (Calamity Breaker, Dawn Bringer, Rift Warden, Stormbound, Ashen Crown, Voidwalker, Star Forger, Doom Sunderer,
  Eternal Champion, World Shaper, Lord of the Fall), kept in `Meta.calTitles`, shown on the victory screen and under the ascension picker.
The **victory screen** shows the title badge, the crowns counting up, the gear on its rarity frame, the shards (with "joins you!" when one
completes a hero), the gold chest and the run's totals. One-shot only: parts fade in once, a burst of sparks flies out once, a 120 ms light at
0.4 alpha; nothing loops (and none of it under reduced motion). `npm run unlock-pace` with the reward in the model (`tools/unlockPace.ts` calls
`payClear`): all 45 still on day **186**, 10 on day 8, 20 on day 35, 30 on day 70, 40 on day 112 (the same as before).

## 11: fifty relics and six new sets
Before: 12 ordinary, 4 legendary and 10 set pieces = 26. Now **50**: 24 new relics in **six new sets** (`relicSets.ts`), each piece with its own
effect and a DawnLike icon (`tools/relic-icons.py`, credited):

| Set | Pieces | Two | Three |
| --- | --- | --- | --- |
| Storm | Thunder Horn, Cloud Treads, Thunder Pendant, Tempest Ring | 3% faster | skills charge 15% faster, +3% crit |
| Earth | Granite Heart, Moss Amulet, Stone Gauntlet, Earthen Bell | +3% hp | 4% less damage taken, +4% hp |
| Blood | Blood Vial, Bloodstone Ring, Reaver Helm, Ruby Locket | +3% attack | +4% attack, +4% crit |
| Star | Star Chart, Comet Shard, Moon Lantern, Astral Circlet | mana 8% faster | skills 12% faster, mana 10% |
| Fortune | Coin Hoard, Gilded Ingot, Jewelled Crown, Gold Band | +6 gold a win | +10 gold a win, +3% hp |
| Rift | Rift Shard, Void Sigil, Doom Helm, Last Light | foes wait 0.3 s | foes wait 0.5 s more, +3% attack |

They are plain numbers (no new battle hooks), so a set needs nothing from the battle. `setBonus` and `relicEffects` now also fold `reach`,
`first` and `gold` from a set. The new pieces come from the same places as the others (shops, chests, events, elites, bosses); the pool is
larger, so a run completes a set less often.
