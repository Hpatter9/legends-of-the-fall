# The long map (army runs)

The 15 waves of an army are 15 sections of one winding road. Each wave is still fought on one section of its own, 7 across
by 9 deep, so the sim's fights, pathing and balance are the same as before; the road is the renderer's picture of the waves
so far. Only armies have it: the daily, the tower and Calamity keep a fresh board for each fight.

## The sim (`src/sim/chain.ts`, pure)

- `buildChain(seed, waves, area, boardSeed, boss)` makes one `Section` per wave: a `Board` (the same `makeBoard` of the wave's
  own seed as ever, `boardSeedOf` in `run.ts`), where it lies (`origin`, in tiles against the first section) and how it joins
  the one before (`join`). `chainOf(run)` in `run.ts` memoises it by the run's seed, so a saved run rebuilds it with nothing
  extra saved. `startStage` fights on a copy of the section's board (`Stage.board`), so a retry replays the same section.
- **Joins**: the new section goes on the **northeast** edge (its back row, where the heroes deploy, against the old foes' row,
  `{u: 0, v: -9}`) or the **northwest** edge (its `u = 6` column against the old `u = 0` column, `{u: -7, v: 0}`). `joinsOf`
  picks by a stream of the seed, but steers back once the road has drifted two steps to one side, so it winds like a zigzag
  and never runs off the screen.
- **No overlap**: every step goes up the screen and moves one way on the lattice (a northeast or a northwest step), so each
  section has its own rectangle and the road can never cross itself (checked for 200 seeds in `test/long-map.test.ts`).
- **Edge heights**: `joinBoard` clears the new section's joined edge of boulders and special ground, pins each of its tiles
  to within one step of the tile it meets (and within a climb of its neighbour on the edge), and eases the land inside
  round the pinned edge. Only the new board is edited. Wave 1 is exactly the board it always was; later waves differ from
  the old boards by that edge only.
- **Formation**: `transferFormation(board, spots)` puts each hero on the same tile of the new deploy rows when it is free
  there, else the nearest free one; `walkAcross` finds the walk (the cheapest, by `walkFrom`) over the two sections joined into
  one `seam` board. The game writes the formation into `placed`, so the next fight puts the heroes where the walk ended.

## The renderer

- `boardView.ts`: the host section (the wave being fought) is live tiles as before; finished sections are each **one baked
  texture** (`generateTexture` once per section, a section per frame, kept up to 20) drawn in `scenery`, in front of the
  host (the old road lies nearer the screen). Off-screen ones are culled by their bounds each frame. Nothing is rebuilt per
  frame.
- `dropRules.ts` (pure) and `chainView.ts`: when a wave is won the next section's columns fall (a row every 70 ms from the
  joined edge, each 420 ms, a 3 px settle, a fade-in over the first fifth of the fall: no flashing), each with a dust puff
  (sand on desert, ice on snow) and a soft `deathThud` (one every 110 ms at most). The finished section stays as live tiles
  while the heroes still standing walk across it on copies of their units (the finished battle is not touched; the
  originals are hidden). A walker waits for the tile ahead to land. The camera follows the party; when everyone has
  arrived the old section is baked into the scenery.
- The recap is up all the while (`#result`): during the move it shows only its banner and summary over a clear background
  (`body[data-move]`), and the rest fades in when the party has arrived. Tapping Next during the move ends it at once.
- A run resumed from a save, a retry, or the auto-replay rebuilds the road behind the wave in `syncChain` with no animation.
- The camera's limits cover the whole road, so the player can drag back along it. `__game.overview(true)` stands the camera
  back over all of it (used for the screenshots; there is no button for it yet).
- **Boss waves** keep their section's shape (so the fight is unchanged) but are drawn as an arena: every tile is flagstone, the
  lip and rim are gilded, and the plinth stands one step deeper. Renderer only.

## Frame times

Software GL in headless Chromium (swiftshader, 393x852, ×3 fights), so a phone's GPU should do better; the shape is what
matters (`node tools/long-map/shots.mjs out/web perf`):

| | mean | p95 | worst |
|---|---|---|---|
| wave 1, no road, deploy | 18 ms | 33 ms | 33 ms |
| walk 7 -> 8 | 25 ms | 50 ms | 67 ms |
| walk 14 -> 15 | 33 ms | 50 ms | 67 ms |
| wave 15, 14 sections behind, deploy | 32 ms | 50 ms | 50 ms |
| wave 15, stood back over the whole road | 17 ms | 17 ms | 83 ms |
| wave 15 fight at ×3 | 37 ms | 50 ms | 83 ms |

With the road hidden, wave 14 costs the same as wave 1 (17 ms): the extra is fill (the three baked sprites that reach the
view, each 512x300, mostly in software). The count of live display objects does not grow with the road: 14 baked sprites,
at most three drawn.

## Screenshots (`docs/samples/long-map-*.png`, from `tools/long-map/shots.mjs`)

`flow-04` (tiles falling), `flow-06`/`08`/`10` (heroes walking over, northeast join), `nw-flow-*` (a northwest join),
`flow-15-wave2-deploy` (placing on the new section), `flow-16-look-back`, `road-5`, `road-15` (zoomed out), `wave-8-deploy`
(a boss arena). Each at 393x852 and 360x780.
