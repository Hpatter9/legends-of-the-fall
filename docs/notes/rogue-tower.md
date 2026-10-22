# The roguelike tower

The endless tower is a floor-by-floor roguelike in the spirit of Slay the Spire's map. Rules: `src/sim/tower.ts` (pure,
deterministic) and `src/sim/health.ts`; screens: `src/towerView.ts` + `src/rogue.css`; balance: `tools/tower-balance.ts`.

- **Acts and maps.** A run climbs acts of 13 floors (`ACT_ROWS`): 12 path floors and a boss. `makeMap(seed, act)` draws an
  act's map from its own side stream (`mixSeed(seed, 0x70ad, act)`): four paths walked up five lanes (each step to the same
  or a neighbouring lane, passing over a step that would cross another path), every path ending at the boss. So a map is
  always connected: each first-floor node leads to the boss and each node is on a path from the start (tested over 900
  maps). The floors keep counting through the acts: `run.stage` is the floor about to be climbed.
- **Nodes.** Fight, Elite (not before floor 3), Campfire, Shop, Treasure, Mystery, Boss. The first floor is all fights,
  floor 6 is treasure, the floor before the boss is a campfire, and a special (elite, campfire, shop) never follows one of
  its own kind. Every map has a shop and an elite. The player picks from the nodes joined to the last (`choices`),
  `enterNode` lays the node out (a fight's band and strength, a shop's stock and a chest's contents are fixed then, so a
  saved run replays), `clearNode` climbs on (a boss falling opens the next act's map).
- **Fights.** `fightSpec`: foes' hp and attack are `FOE_START x (1 + TOWER_GROWTH x (floor - 1))` (`TOWER_GROWTH` 0.17, no
  cap); an elite is x1.22 with a mini-boss leader (x1.7 hp, x1.2 attack, drawn x1.3); the act boss is the old boss bands in
  turn (`BOSS_BANDS`). Act 1 draws the usual field bands; later acts draw them and the non-boss waves of every army that was
  unlocked when the run began (`tower.armies`). The fight is the run's ordinary `startStage`, which reads
  `run.tower.cur.fight` when set.
- **Health carries over** (`health.ts`). `run.tower.hp` holds each hero's share of its hp by roster id; a fight starts with
  it (`Boost.carry`, kept through the trait and relic hp bonuses) and `finishTower` stores what is left. A hero that fell
  returns at 25%. A won fight heals everyone 10%, a boss 50%; a campfire's rest 45% (the fallen too); the shop sells a
  draught (40%) and an elixir (all of it); a spring event 40%; the blood altar costs 25%.
- **Campfire**: rest, or train a hero (the kind gains `40 + 10 x floor` XP in the meta, for good). **Shop**: two relics, a
  piece of gear, a hero of the run's pool (grade 1, merges as ever), a healing draught and an elixir, for run gold.
  **Treasure**: gold and a relic or gear. **Mystery** reuses the event cards (`events.ts`) with three new kinds for the
  tower (`TOWER_EVENT_KINDS`): a healing spring, a dicing goblin (a coin flip drawn with the card) and a blood altar (hp for a
  relic). Elites drop a relic or gear, bosses gear and a relic.
- **End of a run** (`settleTower`, once, saved as `tower.summary`): paid by the furthest floor cleared. Crowns come from the
  fights as before (`earn`, quadratic on a loss, so deeper pays far more). Chests go into the stash: a bronze every 8
  floors, a silver for each act boss, a gold for every third boss (`StashChest.tower` marks them so several of one
  milestone survive a reload). Equipment: a chance of `0.12 + 0.025 x floors` (to 90%) of a piece, one more roll for every
  two bosses, bronze, silver (from floor 13) or gold (from floor 39) quality, from the run's seed. The summary screen shows
  all of it. `Meta.tower` (floors cleared) is still the record, the war camp's Tower notice shows it, and the unlock rule
  (stage 10 or the Orc Warband) is unchanged.
- **Saves.** `Run.tower` is optional. A tower run saved by the old tower (mode tower, no map) gets a map on resume
  (`migrateTower`): the act and row it was on. The old best floor is `Meta.tower` and carries over untouched.
- **The page.** The war camp's Tower button opens the map: header with act, floor, gold, Pack and Home, the squad's faces
  with health bars (red when low), the relics; the map scrolls (the first floor at the foot, the boss at the top; stone
  nodes with DawnLike icons: crossed swords, skull, campfire, coin pile, chest, question mark, crown; the choices glow and
  the walked path is gold). Tap a glowing node for what it is, then Climb. A battle node closes the map and plays on the
  usual board; its result screen goes back to the map ("To the map") or, on a loss, to the summary. The icons are cut by
  `tools/rogue-icons.py` into `src/art/rogue/` (bundled into game.js, so offline works). Screens: `docs/samples/rogue-*.png`
  from `tools/rogue/shots.mjs`.

## Balance

`npm run balance -- --no-tables --tower --levels 1,3,5,8,11,14,20 --attempts 40` plays greedy climbs (`playTower` in
`tools/autoplay.ts`: picks the node it wants most, rests when hurt, spends at shops, opens chests, takes a mystery's first
option; the starting five, no castle, the party's XP carried through the climb). Floors cleared, with 40 climbs a row:

| Hero level | Median | Mean | Min | Max | Felled boss 1 | boss 2 | boss 3 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 4 | 5.2 | 1 | 12 | 0% | 0% | 0% |
| 3 | 9 | 8.8 | 1 | 12 | 0% | 0% | 0% |
| 5 | 12 | 11.9 | 3 | 38 | 5% | 3% | 0% |
| 8 | 25 | 19.8 | 3 | 38 | 55% | 8% | 0% |
| 11 | 35 | 31.4 | 12 | 51 | 95% | 55% | 3% |
| 14 | 38 | 35.6 | 12 | 77 | 98% | 75% | 8% |
| 20 | 38 | 38.6 | 25 | 64 | 100% | 90% | 13% |

A fresh-ish team (the tower opens at stage 10, so about level 3 to 5) gets to about the first boss; a strong one goes
deep, and there is no cap. The lever is `TOWER_GROWTH` (0.13 let level 14 reach floor 64 and was too easy; 0.21 stopped
level 20 at floor 28).

Tests: `test/tower.test.ts` (maps deterministic and connected, node effects, shops, healing, carried health, rewards by
floor, saves and migration, the greedy climb).
