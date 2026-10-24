# Map layouts: shapes, terrain rules and a bigger board

The owner's ask: "We need to get more variety on the battle maps." Three things came of it: **layout templates** (hand-made
shapes mixed with the seeded land), **terrain with light, readable rules**, and a **bigger usual board** (7 x 9 to 8 x 11). Pure
rules are in `src/sim/` (`layouts.ts`, `board.ts`, `battle.ts`, `chain.ts`, `twists.ts`, `terrainInfo.ts`); the page draws the new
ground and props (`render/boardView.ts`, `render/terrainArt.ts`), plays the barrel's blast (`render/fx.ts`) and explains it all in
the codex's new Terrain tab (`codexView.ts`).

## Layouts (`src/sim/layouts.ts`)

`makeBoard(seed, area, w, d, layout?)` rolls the land as before (noise of the seed, eased to a ramp), then lays one **layout** over
its middle ground (the rows between the two sides' three deploy rows): the template pins the heights of the tiles it shapes, puts
its obstacles there, and the rest of the land is eased to a ramp round it (`easeAround`: a loose tile keeps its own height as far
as the pinned tiles allow). The layout comes from `layoutFor(seed, area)`, a side stream of the seed (`mixSeed(seed, 0x1a70)`), by
weights per land; `Board.layout` says which was laid, and `Stage.layout` can ask for one.

| Layout | The shape | Leans to |
|---|---|---|
| Rolling land (`classic`) | The old board: hills, 2 or 3 platforms with a staircase, pits | all (weight 5) |
| Open plain | Low, level ground (heights 0 and 1), a few boulders: for contrast | snow |
| The river | One or two rows of deep water across the middle (a lake of lava on a volcano or at a forge), banks a level, two or three crossings: a bridge, or a ford of shallows | highlands, forest |
| The hill | A pyramid hill in the middle, up to 6, flat topped half the time, one side a 3-level cliff | highlands |
| The pass | Ridges (to 4, ramped at both ends) close in on a way 2 or 3 wide through the middle, bending a tile | desert, forest, dungeon |
| The ruined fort | A ring of broken wall (`wall`) round a courtyard a level or two up, two gates and some crumbled gaps | dungeon |
| The islands | A sea (deep water; a lake of lava on a volcano or at a forge) with two islands joined by a causeway a level lower, a spit or two, stepping-stone shallows | volcano, snow, swamp |
| The ring | A pit (a lake of lava on a volcano or at a forge) at the foot of a raised rim of 3 or 4, with steps down on one or two sides | volcano, snow, dungeon |
| The ravine | Two plateaus (3 or 4 up) with a ravine between (floor 0, some shallows) and one bridge across, flush with both tops | desert |

- **Every template keeps `boardOk`** (every standable tile reachable from the heroes' rows by a fighter that climbs one level, so both
  sides can reach each other and nobody is walled into a pocket) **and the deploy rows**: no obstacle, no deep water in the three rows
  at each end (`fit`). A template that fails is tried again with another stream (five tries), then the board is laid the old way.
  Over 6 areas x 40 seeds, each template took at least 90% of the time (`test/layouts.test.ts`).
- **The old land is kept**: `makeBoard(seed, area, 7, 9, 'classic')` is byte for byte the 0.139.0 board (a hash in the test), apart
  from the shrines and barrels, which are new (`laySpecials`, their own side stream).
- **The long map** (`chain.ts`): a section is joined as before (edge cleared of boulders, ground, walls, barrels and bridges, heights
  within a step of the section before); a section whose shape the join cuts apart (`boardOk` fails) is laid the old way instead. The
  first section's border ring is smoothed too, so a section laid against it meets gentle ground.
- **Calamity** boards (10 x 13) take the same layouts.

## Terrain

| Ground | Rule | Numbers |
|---|---|---|
| Shallow water (`water`) | slows a step (cost +1) | as before |
| Deep water (`deep`) | not standable: nobody on foot enters it; fliers cross and hover over it | new |
| Lava | burns whoever steps onto it, and each second they stand in it; fliers pass over | 8% a step (as before), **4% a second** (new) |
| Ice | a quick step (-0.5) as before; **a walker may slide one tile on** if that tile is free, no higher and not lava | `ICE_SLIDE` 50% (a hash of the moment, no stream) |
| Tall grass (`tall`) | hides from shots (as before) and **blows on a fighter in it miss** | `TALL_DODGE` 12% |
| Ruined wall (`wall`) | solid (not even a flier passes) and **blocks shots, even from a level above** | `WALL_TOP` 2.6 (a boulder is 1.6, the eye 1.6) |
| Shrine (`shrine`) | **mends whoever stands on it each second**, friend or foe | `SHRINE_HEAL` 5% of max hp |
| Powder barrel (`barrel`) | solid until a **blow on anyone beside it sets it off**: it is gone, and everyone within a tile (any side) loses 12%; a barrel beside it goes too | `BARREL_BLAST` 12% |
| Bridge (`bridge`) | looks only: plain ground over the water | |

- **Cost**: nothing runs each tick but a check in `hurt` when a barrel still stands (a scan of a handful of barrels); shrines and lava
  act once a second, only on a board that has them (`Battle.groundFx`, `noteTerrain`); the ice slide and the grass dodge are hashes of
  the moment's time and the fighters (`mixSeed(seed, salt, t, id...)`), so **no stream moves**. `standable` / `solid` are two field reads.
- **The AI** (`battle.ts`): `groundScore` weighs where a fighter stands, in steps of walking: lava +3 for a walker, tall grass -0.6 for a
  shooter (-0.2 a blade), a shrine -2 for a fighter more than 40% hurt (-0.3 otherwise), ice +0.3; used when choosing where to strike from
  and when stepping up to a perch. A fighter more than 40% hurt with nobody in reach walks to a shrine within 5 steps of cost. Walking costs
  already routed round lava and shallows; deep water and walls are not walkable at all.
- **Weather**: `claude/map-lands` made the weather data of the board (`weatherOf(board)`, `weather.ts`). A **foggy** fight takes `FOG_RANGE` (1) tile off every shooter's range
  (`Battle.fog`, read by `strikeDef`, added to the twist's fog). Fog is about one fight in ten (lands differ), and both sides shoot a tile less far.
- **Codex**: the Terrain tab lists every ground and every battlefield shape with a tooltip line, the numbers read from the constants
  (`sim/terrainInfo.ts`), so the page cannot drift from the rules.
- **Twists**: lava cracks now pick a tile that can be stood on (not a wall, deep water, a bridge, a shrine or lava already).
- **Art** (all from the packs, credited in `CREDITS.md`, cut by `tools/map-layouts/terrain-art.py`): the barrel (dungeon pack), the ruined walls
  (undead tileset), the shrine crystal (cave objects), the bridge planks (bridges pack); deep water is the shallows' texture darkened. The shrine's
  glow is still (no pulse); the barrel's blast is a one-shot burst and a shake (which the shake setting turns off), no flash.

## The bigger board

`BOARD_W` x `BOARD_D` in `board.ts` (the constants `W` and `D`) are **8 x 11** (were 7 x 9): the armies' long map (each section), the daily and
the spire all fight on it; the Calamity stays 10 x 13 (`CAL_BOARD`). `areaScale` counts from the old 7 x 9 (`BASE_AREA`), so a board lays the
platforms, pits and boulders it always did for its area, and the Calamity's 2.06 is unchanged. `node build.mjs --board 7x9 --out out/web79`
builds the old size to compare (the build defines `__BOARD__`; the tests, which do not, get 8 x 11).

Screenshots at 393 x 852, the same stage and save: `docs/samples/map-layouts-size-7x9-*` against `map-layouts-size-8x11-*` (deploy, early and
mid fight; `tools/map-layouts/compare.mjs`). The camera does the same on both: it frames the heroes' rows when deploying and follows the fighters
in the fight, at the same zoom, so the sprites are the same size and as readable; the 8 x 11 board is simply more field to look along.

## Balance, before and after

"Before" is origin/main at 0.146.0 unchanged, "after" this branch merged with it. Fixed seeds; the tools of `docs/notes/balance.md` (Calamity 300 runs, spire
100 climbs `--levels 3,8,14`, daily 336 dates, heroes 12000 games, armies `--climb --saves 120`).

What moved fights, and what was done about it:
- **Longer approach, more room for shooters.** The two extra rows put five empty rows between the armies (three before): shooters got free fire and the
  front-liners lost value. `USUAL_WALK` 0.75 (a step takes three quarters of its time on the usual board; the Calamity's board keeps 1) put the average win rate back
  (51.7% against 52.1% before, at stage 5 level 1).
- **Hero parity** needed hp nudges (before them: Knight -5.2 / -5.6, Ranger +5.1, Beastmaster, High Priestess, Buccaneer, Lancer beyond 4 points, spread 9.6 and 10.7):
  Knight 285 to 300, Samurai 200 to 210, Wolf Bard 222 to 247, Rifle Bot 138 to 154, Great Sage 185 to 204, Demon Swordsman 208 to 220, Paladin 255 to 273,
  Kraken Mate 275 to 297, Peasant 306 to 321, Mummy 285 to 299, Shambler 295 to 310, Yamabushi Tengu 262 to 275, Dread Pirate 255 to 263, Mercenary 198 to 206,
  Lightning Mage 160 to 166, Fire Wizard 145 to 149; down: Lancer 230 to 209, Beastmaster 200 to 182, Buccaneer 225 to 207, Ranger 185 to 165, Wanderer 150 to 141,
  Druid 225 to 214, Satyr 265 to 254, Reaper 175 to 168, Kitsune 190 to 182, High Priestess 215 to 209.
- **Calamity**: `CAL_SCALE.step` 0.63 to **0.58** and `final` 0.2 to **0.33** (the layouts and the 10 x 13 board's barrels cost it a few points on the middle maps; the lava
  seas cost it most, so they are impassable lakes now rather than walkable fire).
- **Daily**: `DAILY_START` 0.56 to **0.57**.
- The spire and the armies needed nothing.

| | Before (0.146.0) | After |
|---|---|---|
| Calamity, share felling each boss, maps 1 to 6 (target 91 / 81 / 60 / 44 / 32 / 15) | 91 / 81 / 60 / 44 / 32 / 15 | 90 / 81 / 56 / 45 / 40 / 20 |
| Calamity, hp lost an ordinary fight (target about 12 / 15 / 21 / 22 / 22 / 28 %) | 13 / 12 / 17 / 22 / 22 / 28 | 14 / 12 / 15 / 21 / 18 / 28 |
| Spire (median / mean floors, bosses 1 to 3) | 12 / 14.5, 15 / 8 / 4% | 12 / 15.5, 17 / 9 / 6% |
| Daily, with hearts / no hearts | 73% / 56% | 71% / 56% |
| Hero parity, stage 5 level 1: spread, beyond 4 points | 4.8, none | 5.7, none |
| Hero parity, stage 27 level 15: spread, beyond 4 points | 10.1, Samurai, Lightning Mage, Samurai Commander | 8.2, Samurai Commander |

Armies, tries to clear on Normal (`--climb --saves 120`; noise about 0.4), before then after: Orc Warband 2.8 / 2.9, Undead Legion 3.5 / 3.1, Beast Packs 1.9 / 2.2,
Wildwood 3.2 / 3.4, Labyrinth 2.5 / 2.4, Ogre Clans 2.3 / 2.3, Infernal Host 2.1 / 2.6, Yokai Night Parade 2.3 / 2.0, Golem Forge 2.8 / 3.0. Nothing moved beyond the noise; the
`start` values are untouched. The Calamity's late maps are a little easier than the target and its middle maps' hp loss a little lighter: the shares are within about 8 points
of it on every map (300 runs is 3 or 4 points of noise); the knobs that remain are `step` (steep: 0.01 moves the late maps ten points) and `final`.

Cost: a fight tick took 29 microseconds on 8 x 11 against 18 to 21 on 7 x 9 (150 mixed fights, the same machine under load): the board has 40% more tiles, and the terrain adds
nothing measurable. A tick has 100 ms.

## One land for an army's whole attempt

The owner: "The map doesn't need to change during an army battle since it's one long battle." `landOf(army, seed)` (armies.ts) now picks one of the army's lands once, by the
run's seed (`mixSeed(seed, 0x1a4d)`), and every wave of the attempt is fought on it; the long map is built on that one land (`chainOf`), so the weather rolled by each section's
board follows the land only. Changed: armies only (`armies.ts`, `run.ts`, `lands.ts`'s comment, `test/lands.test.ts`, `test/armies.test.ts`). The daily has no `lands`, and the spire
and Calamity do not use `landOf`: unchanged.

## Tests

`test/layouts.test.ts` (size, the old land's hash, every layout x area x seed crossable with clear deploy rows, each layout's own shape, the odds,
fliers over a river, the Calamity board in every shape, a fight to its end on every layout x area, the long map's sections), `test/terrain.test.ts`
(deep water and walls in `canStep`, a wall against a shot, the grass dodge's rate, the ice slide, the shrine, lava's second-by-second burn, a barrel's
blast and chain, the weather hook, a hurt fighter's walk to a shrine, the codex's words). The fights' tests that stood on bare ground
(`bareBoard` in `test/bare.ts`) now strip the new terrain too; the long-map tests count in `D` where they had 7 x 9's rows in them.

## For the owner

- **8 x 11** is the director's recommendation; at 393 x 852 the sprites are the same size on both (the camera's zoom is the same), so readability is as it was. See
  `docs/samples/map-layouts-size-7x9-*` against `map-layouts-size-8x11-*`. The cost is `USUAL_WALK` (everyone walks a quarter quicker on it) and the hp nudges above: say if you
  would rather keep 7 x 9 (`BOARD` default in `board.ts`, `node build.mjs --board 7x9` to see it) or 8 x 9.
- **Odds**: rolling land (the old board) is about a quarter of fights, the other eight shapes share the rest, leaning to the land (river for highlands and the Oasis, forts for the
  Dungeon and the Ruins, passes for the Desert...). The weights are in `BASE` and `BY_AREA`.
- **Barrels and shrines hurt and heal both sides** (any fighter beside a barrel, any on a shrine); the AI makes for a shrine when badly hurt but does not aim at barrels.
- **Lava seas are impassable** (drawn as lava on the Volcano and the Forge, but to the rules deep water): walkable lava seas cost the Calamity too many points. Small walkable lava
  patches stay, and burn 4% a second as well as 8% a step.
- **Fog** takes one tile off every shooter's range (about one fight in ten).
- The tests that stood on a bare field now strip the new terrain too (`test/bare.ts`); the equipment trials and long-map tests count in the board's own size. No test was loosened.
- The Codex has a fifth tab, Terrain, with a line for each ground and battlefield shape.
