# Tower elites and relic sets

Rules: `src/sim/elites.ts`, `src/sim/eliteFoes.ts`, `src/sim/relicSets.ts` (pure, deterministic). Page: `src/towerElites.ts`
(+ `src/eliteSets.css`), wired into `towerView.ts` and the boss intro card in `main.ts`. Tests: `test/elites.test.ts`.

## Named elites

An elite node holds one of twelve named mini-bosses, four to an act-tier (act 1, act 2, act 3 and every act after). Each is a
foe of an existing look under its own id (`ELITE_FOES`), with a kit built from existing skills (`eliteKits`, added to `KITS`),
a stat boost on its leader (size, hp, attack) and an escort of three or four existing foes. Which elite waits where comes from
a new side stream: `mixSeed(seed, 0xe117e5, act)` shuffles the tier's four, and the act's elite nodes (by row, then id) take them
in turn. The map's own stream is not touched, so existing maps are unchanged.

| Tier | Elite | Trait | Escort |
| --- | --- | --- | --- |
| 1 | Gorrak the Bonebreaker | Ground Slam; enrages (up to +80% attack) as his hp falls | 2 orc grunts, orc archer |
| 1 | Ysolde Fangmother | Ravage; quicker with every kill | 3 werewolves |
| 1 | The Hollow Knight | Shield Wall; blows from the front lose a quarter | skeleton, spearman, archer |
| 1 | Sethra the Stonegazer | Petrifying Gaze; takes a fifth less from shots | 2 gorgons, satyr |
| 2 | Brakka the Gorebound | Gore Charge; hits the wounded harder | 2 minotaurs, satyr |
| 2 | Cindra the Ashen | Hellfire; blows set heroes alight | 3 imps |
| 2 | Vexor the Imp-Caller | Summons imps when his own are gone, mends 1% a second | 2 imps, demon |
| 2 | Thrum Hillbreaker | Horned Shove; blows from the front lose a quarter | 2 ogres, imp |
| 3 | Nyssa the Plaguebringer | Hex; poison blows, drinks a fifth of what they deal | 2 fox spirits, monk |
| 3 | The Iron Warden | Ground Slam; plated, cannot be knocked back | 2 stone golems, crystal golem |
| 3 | Kuro the Stormcrow | Flies; dives on shooters | 2 crows, seer, fox |
| 3 | Silenus the Mad Piper | Pipes of Pan hasten the pack | 2 werewolves, 2 satyrs |

The elite band is x1.22 as before, its leader boosted by its own `boost` (hp x1.7 to x1.9, attack x1.1 to x1.2; tier 3 hp x2.9, attack x1.55, drawn x1.3 or
bigger). The map's node info shows the elite's portrait, title, trait and what it pays; the fight opens with the boss intro
card (title, epithet). A win pays double gold (was x1.5) and **always a choice of three relics** (`tower.offer`, kept in the
save; `takeRelic`): the first drawn from a set the run has begun (any set when none), the others from anything unowned; with
none left it pays gear. The page shows the choice on the map after "To the map", with the set progress of the one picked.

## Relic sets

Five sets of four relics (10 older relics and 10 new ones: `SET_RELICS`; icons are tiles of the pack already cut for the
equipment, credited in `CREDITS.md`). Two pieces give a small bonus, three a strong one (the two's stays on); a fourth adds
only its own relic. Plain numbers fold into `relicEffects`; the hooks ride on `Stage.relics.set` (`SetHooks`) and are read in
`afterBlow` (burn, chill, bleed) and the regen tick in `abilities.ts`. With no set switched on, `relicEffects` has no `set` key
and the fight is exactly as before (tested).

| Set | Relics | 2 pieces | 3 pieces |
| --- | --- | --- | --- |
| Fire | Phoenix Feather, War Drum, Ember Ruby, Dragon Scale | +2% crit | heroes' blows set foes burning (3% of attack a tick, 2s) |
| Frost | Iron Shield, Hourglass, Frost Sapphire, Winter Cloak | heroes take 2% less | the first blow on each foe chills it for 1s |
| Holy | Banner, Scholar's Scroll, Holy Chalice, Saint's Medal | +2% hp | heroes heal 0.5% of their hp a second |
| Shadow | Feather Charm, Hawk Eye, Shadow Cloak, Viper Fang | heroes slip 2% of blows | +2% crit, and crits make foes bleed (2% of attack a tick, 3s) |
| Beast | Whetstone, Swift Boots, Wolf Fang, Beast Harness | heroes act and walk 2% faster | +2% attack, 1% faster still |

Lucky Coin and Spyglass belong to no set. The older twelve stay `RELIC_IDS` (events and old runs draw from them); the tower's
shops, chests, bosses and elites draw from `ALL_RELIC_IDS` too. The tower header frames each set relic in its set's colour
(lit at two pieces, ringed at three) and a tap opens its set's progress and bonuses.

## Saves

New fields are optional: `FightSpec.elite`, `TowerState.offer`, `TowerState.lastElite`. An old tower save loads as before.

## Balance

`npm run balance -- --no-tables --tower --levels 3,5,8,11,14 --attempts 300` (the greedy player takes the first relic offered,
which leans to a set it has begun). Use 300 climbs: with 40 a row the level-14 median jumps between 38 and 77 by chance.
Floors cleared, median (mean), and the share felling boss 1/2/3, on the merged tree:

| Hero level | No set bonuses | Final sets (tuned) |
| --- | --- | --- |
| 3 | 12 (10.2), 3/1/0% | 12 (10.3), 4/1/0% |
| 5 | 12 (15.2), 21/4/1% | 12 (15.4), 21/5/2% |
| 8 | 25 (24.9), 68/28/4% | 25 (26.8), 69/31/8% |
| 11 | 38 (36.8), 96/70/15% | 38 (40.8), 96/75/24% |
| 14 | 38 (42.6), 98/84/27% | 38 (46.0), 98/85/36% |

The first sets (3-piece bonuses of 15% burn, 3s chill, 2% regen, +10% attack) took level 14 to a mean of 61 and boss 3 to 60%;
the fight hooks (chill and regen above all) were most of it, so every set bonus was cut. The median sits on 38 because
boss 3 (floor 39) is the wall. Tier-3 elite leaders were also raised (hp x2.9, attack x1.55). Before the elites, on the older
tree, the medians were 9, 12, 25, 38, 38 at levels 3 to 14.

Screens: `docs/samples/tower-elites-*.png` from `tools/rogue/elite-shots.mjs`.
