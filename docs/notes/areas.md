# Areas: a new land every five stages

- **Which land** (`areaFor` in `src/sim/run.ts`): five stages each, in turn, over `CLASSIC_AREAS`: Highlands, Forest, Snowfields, Desert,
  Volcano, Dungeon, then round again. Eleven more lands came with `docs/notes/map-lands.md`; the climb and the Calamity stay on these six. `startStage` passes it in the fight's `Stage.area`; `makeBoard(seed, area)` stores
  it on the board (`board.area`).
- **Terrain that matters** (`src/sim/board.ts`, `Tile.ground`): laid on top of the land by its own side stream of the
  seed, so the heights and boulders are the same in every area. Patches of one to three tiles, never under a boulder,
  and `boardOk` still holds. Each area's mix is in `TERRAIN`.
  - **Shallows** (`water`): a step onto them costs 1 more (the walk goes round when it can, and a step takes longer).
  - **Ice**: a step onto it costs 0.5 less, so a step is quicker.
  - **Lava**: a step onto it costs 2 more, and whoever ends the step there loses 8% of its max hp (`LAVA_BURN`; a
    `dot` hit, so the guard still counts). Never in the deploy rows. Fliers ignore all the ground.
  - **Tall growth** (`tall`): a shot cannot pass over it (it stands 1.7 high for `sightClear`, a shooter's eye is 1.6);
    higher ground looks over it, and the tile itself can be shot into.
  - Highlands: shallows and tall grass. Forest: tall grass, shallows. Snow: ice, shallows. Desert: an oasis (shallows),
    some tall growth. Volcano: lava, some tall growth. Dungeon: puddles and mushroom thickets.
- **Look**: `src/render/areaArt.ts` (the per-area ground as data URLs) and `boardView.ts` (tops, sides, boulders and
  tall growth by area; ripples, glints, a glow and a coloured rim mark the special tiles). `src/render/backdrop.ts`
  builds the parallax layers for the area (plain files in `areas/<area>/bgN.png`, copied by `build.mjs` and kept by the
  service worker) and a tint over them.
- **Art**: `tools/areas-prep.py` cuts it from the packs (see CREDITS.md). The area tops, sides, water, ice and lava are the
  highlands textures recoloured, so they tile the same way.
- Tests: `test/areas.test.ts`.
