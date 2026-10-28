# WORLD-ROAD: the army road, its arenas and the living land

The owner: "The battle maps need an update. They need to be able to be irregular shaped so they follow a better more realistic path. And the boss
sections are terrible." The owner's answers: **road plus scenery** (the walkable ground of each army section is a winding road, roughly 6 to 10 tiles
wide, with low unwalkable scenery beside it, so a section no longer reads as a full 14x18 slab); **a themed arena** for each army's boss waves (the
mid-boss at wave 8, the Wildwood's at 5 and 10, the final at 15).

**Phase A** (a working prototype and real in-game mock-ups) was approved by the owner with seven answers; **phase B** (below, "Phase B: the living
land") finished it: pack walls and set pieces, a living environment, running water and waterfalls, and the balance re-measured and retuned. The
phase A sections that follow are kept as they were written, with corrections marked; phase B's own sections come after them. Nothing is merged;
the version is not bumped.

Mock-ups (393x852, real renders of the prototype, the wave set by hand as a presentation fixture, not a played run):

- Contact sheet: [army-road-mock-sheet.png](../samples/army-road-mock-sheet.png)
- Road sections: [orcs wave 3](../samples/army-road-mock-orcs-section-close.png), [undead wave 4](../samples/army-road-mock-undead-section-close.png),
  [wildwood wave 3](../samples/army-road-mock-wildwood-section-close.png), [infernal wave 3](../samples/army-road-mock-infernal-section-close.png)
- The road across sections and its joins (the map's stand-back view): [orcs](../samples/army-road-mock-orcs-road.png), [undead](../samples/army-road-mock-undead-road.png)
- Arenas, mid and final: orcs [8](../samples/army-road-mock-orcs-mid-close.png) / [15](../samples/army-road-mock-orcs-final-close.png),
  undead [8](../samples/army-road-mock-undead-mid-close.png) / [15](../samples/army-road-mock-undead-final-close.png),
  infernal [8](../samples/army-road-mock-infernal-mid-close.png) / [15](../samples/army-road-mock-infernal-final-close.png),
  wildwood [5](../samples/army-road-mock-wildwood-mid-close.png) / [15](../samples/army-road-mock-wildwood-final-close.png);
  finals for [beasts](../samples/army-road-mock-beasts-final-close.png), [ogres](../samples/army-road-mock-ogres-final-close.png),
  [golems](../samples/army-road-mock-golems-final-close.png), [yokai](../samples/army-road-mock-yokai-final-close.png),
  [labyrinth](../samples/army-road-mock-labyrinth-final-close.png).

Re-shoot with `npm run web`, then `MOCK=1 node tools/army-road/shots.mjs army-road-mock orcs:3:section-close orcs:6:road orcs:15:final-close ...`
(env `CHROMIUM_PATH` and `PLAYWRIGHT_MODULE` as for `tools/world-001/browser.mjs`). `tools/army-road/ascii.ts <theme> <seed> [waves]` prints a plan
as text, and `tools/army-road/check.ts` audits every theme over many seeds.

## How the road is made (`src/sim/armyRoad.ts`, used by `planScenario` in `src/sim/scenario.ts`)

- The sections still lie where `planThematicRoad` puts them (14x18, joined edge to edge). For each section, `touching` finds the tiles that meet the
  section before (on its heroes' row) and the section after (on its foes' edge or a flank). `planThematicRoad` now prefers a flank join near the
  foes' end, and a straight-on join near the middle of the foes' edge, so the road runs on rather than doubling back.
- `roadMask` lays the road: a Catmull-Rom curve from where it comes in, through two seeded bends, across the foes' rows (always: they deploy
  there), and out where the next section joins. Every tile within the road's half-width of the curve is road; the half-width swells and narrows
  along it between `ROAD_MIN` 3.0 and `ROAD_MAX` 4.3 (a road 6 to 9 tiles across; wider where it turns a flank), and is at least 3.4 where the
  heroes come in. Both sections' roads are centred on the same join, so they meet.
- Every other tile gets `Tile.scene` (new, optional): `wood`, `rocks`, `ruin`, `water`, `lava`, `bones`, `fence`, `stones`, `grave` or `crystal`.
  To the rules a scenery tile is `solid` (nobody stands on it, not even a flier) and blocks low shots like a boulder (`water`/`lava` none). That is
  the one rules change; pathing, deploying, `boardOk` and the AI already honour `solid`. The kind comes from a patchy world-space noise per theme
  (`besideAt`), so the land runs on from one section into the next. The river still crosses each section: on the road it is a bridge or shallows,
  beside it a strip of water (lava for the infernal host and the forge). The lake themes' lake (height 1) is deep water beside the road, as before.
- The road keeps its own cover, thinner than the old open field's (rocks, walls, tall grass, barrels, shrines), and the archer bastion is placed on
  the road only. A bastion's long ramp could leave a pocket beside it that a walker drops into and cannot climb out of (the old open field always
  had a way round); a new check, `walksBack`, refuses such a bastion, so every survivor can still walk on to the next section.
- Heights are unchanged on ordinary sections (the world height field). Deterministic: the road and scenery use their own side streams
  (`mixSeed(seed, 0x20ad, n)`, `0x5ce7`, `0xa7e0`, `0x91ece`).

## Scenery by theme (`BESIDE` in `armyRoad.ts`)

| Army | Beside the road |
| --- | --- |
| Orcs | pine woods and crags, a stray palisade, bone piles |
| Undead | ruined walls, graves, dead trees, rocks |
| Beasts | woods, crags, bone piles |
| Wildwood | dense wood, swamp pools, a few rocks |
| Labyrinth | ruins, pools, rocks |
| Ogres | crags and snowy pines, standing stones |
| Infernal | lava, black crags, burnt trees |
| Yokai | woods, pools, lanterns, rocks |
| Golems | crystal clusters, crags, lava |

The trees and props are the land's own: snowy pines in snow, dead trees on volcano and graveyard lands, crystal on crystal (`roadArt.ts`).

## The arenas (`ARENAS`, `arenaMask`, `levelArena`)

Each boss section is a floor about 11 tiles across (a circle or a square), a ring of the army's kind round it, a neck of road five tiles wide in from
the heroes' edge (and on out for a mid-boss), what stands inside, and set pieces on the land round it. The floor is levelled: each height is drawn
towards the floor's middle the nearer it lies, but kept within a step of every neighbour and equal to the land where the road meets the sections
either side (`levelArena`: the middle of three bounds that each move at most a step a tile). The foes deploy on the floor's back rows.

| Army | Arena | Ring | Inside | Set pieces |
| --- | --- | --- | --- | --- |
| Orcs | The war camp (round) | palisade | two powder barrels | bone gate, war drum, tent, banner, campfire |
| Undead | The mausoleum court (square, paved) | ruined walls | four graves (cover) | mausoleum, lamp, skulls |
| Infernal | The ring of fire (round, paved) | a moat of lava two wide, bridged where the road crosses | lava runnels (walkable, burn) | gate, braziers |
| Wildwood | The grove circle (round) | trees | a healing shrine at the heart | flower arch, standing-stone circle |
| Golems | The foundry floor (square, paved) | crystal | lava runnels | foundry engine, lamp |
| Yokai | The shrine court (square, paved) | trees | four lanterns, a shrine at the heart | shrine, lamps |
| Beasts | The bone ring (round) | bone piles | two bone piles | cave den, skulls |
| Ogres | The stone ring (round) | standing stones with gaps | a centre stone | stone circle, campfire |
| Labyrinth | The maze heart (square, paved) | ruined walls | an inner wall broken in four places | gate, lamp |

The final arena is the destination itself, so its distant gate-and-tower compound is no longer drawn on it (it still appears on the approach,
wave 14). The old boss look (every tile flagstone with a gilded lip on a deeper plinth) is replaced: only paved arenas have flagstones.

## Renderer changes (`src/render/boardView.ts`, new `src/render/roadArt.ts`, `columnTextures.ts`)

- **No more slab.** A road board's columns have a short skirt (`ROAD_SKIRT`, five steps) that fades out below its first two steps, instead of a
  rock face down to height 0 (the army map stands 10 to 60 steps high, so the old faces were hundreds of pixels of cliff). The land far from the
  road sinks a step or two, and its outer edge is trimmed raggedly (`sceneDepth`), so the section's outline follows the land, not a rectangle.
- **No more bleaching.** The old "higher is paler" wash (`0.03 + h * 0.035`) saturated at the army map's heights (every tile was cream, and every
  tile from height 3 had the stony top). A road board uses the land's own tops at every height, and a soft band of light that rises and falls with
  the height.
- **Scenery art**: trees, crags, bones, palisades, crystals and the arenas' set pieces are cut from the Calamity map's atlas
  (`src/art/calmap/atlas.png`, pack art already in the game and credited); ruins and graves use the boards' ruined walls and the graveyard's
  stones. No new files are loaded by URL (the atlas is already bundled), so the offline list is unchanged.
- Column textures for road boards have their own cache key (the skirt), so other modes' columns are untouched.

## Gameplay effects

- **Narrower field.** About 59% of a section is road (it was all walkable). Flanking is harder; melee meet sooner and in a front; shooters on the
  bastion and the arenas' cover matter more. Fliers can no longer cross the land beside the road (scenery is solid to them too); deep water and
  lava beside the road would let them, if the owner prefers.
- **Arenas.** The infernal ring and golem runnels add walkable lava (it burns), the wildwood and yokai shrines heal whoever holds the heart, the orc
  barrels blow up, the graves, stones and maze walls give cover. These are deliberate but need tuning with the owner.
- **Measured** (quick and noisy, 12 attempts a cell): orcs unchanged at levels 11 and 17 and through waves 1 to 14 at level 5, but the final
  arena stopped every level-5 attempt (33% won it on main). See the table at the end of this note.

## Open questions for the owner (phase A; the owner's answers in brackets)

1. Road width: is 6 to 9 tiles (about 59% of the section) right? [Yes, keep.]
2. Should fliers fly over the scenery? [Yes: scenery blocks walkers only, as deep water does.]
3. The arenas' inner features (healing shrines, burning runnels, barrels, cover)? [Keep them: "I love the idea of a living environment - expand on
   this."]
4. Arena about 11 tiles across? [Keep.]
5. Keep the distant compound behind the final arena too? [Yes, for now.]
6. Cut proper ring and set-piece sprites? [Yes; and more flair, only where it fits and matches the tiles' angle.]
7. A run in progress rebuilt in the new shape on its next load? [Acceptable.]


## Checks run for phase A

- `npm run typecheck`: passes.
- `npm test -- army-road world scenario armies run long-map chain battle-flow`: 109 tests, all pass. Two assertions in
  `test/world-001-scenario.test.ts` changed with the owner's new requirement: boss sections are no longer held to the raw height field or the
  12-step relief (their floors are levelled), and the walk-on check aims at the middle of the new section's road rather than its fixed middle
  column (which can now be scenery). New tests in `test/army-road.test.ts`: road share and deploy room, every survivor walks on through each join,
  each arena's ring, set pieces, levelled steps and foe placement, `levelArena`'s bounds, determinism.
- `npm run web`: builds.
- Browser: the mock-ups above at 393x852, no page errors. Not yet checked at 360x780 or 412x915 (phase B).

## Measured: a quick army comparison

`npm run balance -- --armies-only --only orcs,infernal --attempts 12 --levels 5,11,17 --party recruits` (Knight, Paladin, Archer, Warlock, Cleric,
every hero at the level shown; % of 12 attempts clearing the whole army; table 5a only, the climb table was stopped):

| Army | Level | main 0.185.0 | this branch |
| --- | --- | --- | --- |
| Orcs | 5 | 33.3% (all fall at wave 15 or win) | 0.0% (all reach wave 15, none win the final arena) |
| Orcs | 11 | 91.7% | 91.7% |
| Orcs | 17 | 100% | 100% |
| Infernal | 5 / 11 / 17 | 0% (wave 1 won 0 / 8 / 8%) | 0% (wave 1 won 0 / 8 / 17%) |

Waves 1 to 14 are unchanged for orcs at every level; the final arena is harder at the lowest level (the levelled, fenced floor and the barrels;
12 attempts, so this is a hint, not a result). The infernal host is far above these levels on both. Phase B would re-measure every army at its
tier levels (`npm run balance -- --no-tables --deep`) before and after.
