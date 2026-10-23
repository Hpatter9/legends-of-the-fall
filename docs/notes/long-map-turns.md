# The long map turns

Each section of an army's road now has its own **orientation**. The road may go on in any of the four grid directions
(NE, NW, SE, SW), and each new section's heroes' edge is the edge it joins, so the heroes deploy facing along the road and the
fight turns with the track (up-right, down-right, down-left or up-left on the screen). Wave 1 is as it always was: the heroes
in the southwest, facing up-right.

## How: the fight stays in board coordinates

The sim is untouched: a fight is on a `makeBoard` board (`u` across, `v` from the foes' edge at 0 to the heroes' at 8), foes
in the rows from 0, heroes deploying on the rows from 6. A section is only *laid in the world* turned `rot` quarter turns
(`src/sim/turn.ts`: `turnTile`, `unturnTile`, `turnDir`; a 7x9 board turned a quarter takes a 9x7 footprint).

- `src/render/iso.ts` holds a current **frame** (`rot`, and the footprint's corner `ou`, `ov` in world tiles). `at(u, v, h)` and
  `depth(u, v)` read board tiles through it, so unit sprites, shots, sparks, damage numbers, labels, the camera's box and the
  panning of sounds all land where the turned section is drawn without knowing it. `project`/`depthIn` take a frame
  explicitly (baking, the section being left, the walkers). `facesRight(dir)` says which way a step looks on the screen, in the
  frame, so a hero (facing -v) and a foe (+v) face each other in every orientation, deploy idles included.
- `main.ts` sets the frame for the section being fought (`newBattle`) and, while the party walks off a finished wave, for that
  section as it lies against the next one (so the fallen finishing their fade stay put). The camera is moved by the same
  offset when the walk begins so it stays on the same ground.
- **Input**: tapping uses `at` and `depth`, so a tap is mapped through the frame; the nearest column (highest world depth)
  under the finger wins in any turn. The blue deploy highlight is the deploy rows' marks, which sit on the joined edge because
  that is where the rows are.
- **Drawing**: tile columns are drawn by the screen (left face lit, right in shade), so height shading, the gilded boss arena,
  the plinth and the side faces need no turning; the tile's top texture is not turned (it is a random patch of grass anyway).
  A baked finished section is drawn in its own frame and placed by its footprint corner.

## The road (`src/sim/chain.ts`, pure)

- `layRoad(seed, n)` places the sections: after each, the next may go on any side except the one the road came in by (no
  doubling back), either straight on (its foes' side) or a flank, sliding along the side so that at least five of its seven
  heroes'-edge tiles meet the old section. It never overlaps an earlier footprint. Among those that fit, the pick leans to the
  compact (the road's bounding box, the larger side counted twice) softened by the seed (a straight run of three is a little
  dearer), and a depth-first step back is there for a pick that paints the road into a corner (never needed in 1000 seeds).
  Deterministic from the seed. A 15-section road fits in about 36 tiles across (never more than 46 in 1000 seeds), usually a
  loose ring or an S.
- `joinBoard` matches the joined edge in world space: each tile of the new heroes' edge stands within one step of the tile it
  meets (and within a climb of its neighbour), is cleared of boulders and special ground, and the land inside is eased round it.
  Only the new board is edited, and only its deploy edge, so the fights are the fights they were (this differs from the first
  version only where a northwest join pinned a side column).
- `walkAcross` finds the walk over the two sections joined as one board of world tiles (`seam`), `frameOf` gives a section's frame
  against a host, `transferFormation` is unchanged (board coordinates).

## Saves

Nothing about the road is saved; it is rebuilt from the run's seed. A run in progress comes back on the new road (its waves'
boards differ from before only on the deploy edge's heights), without animation.

## Frame times

Software GL in headless Chromium at 393x852 (a phone GPU should do better), `node tools/long-map/turns.mjs out/web perf`:

| | mean | p95 | worst |
|---|---|---|---|
| wave 1, no road, deploy | 17 ms | 17 ms | 33 ms |
| walk 1 -> 2 | 24 ms | 33 ms | 67 ms |
| walk 7 -> 8 | 31 ms | 50 ms | 50 ms |
| walk 14 -> 15 | 33 ms | 50 ms | 50 ms |
| wave 15, 14 sections behind, deploy | 32 ms | 33 ms | 50 ms |
| wave 15, whole road in view | 17 ms | 17 ms | 17 ms |
| wave 15 fight at x3 | 36 ms | 50 ms | 83 ms |

The same as before the turns: the extra over wave 1 is fill from the two or three baked sections that reach the view (with
the road hidden, wave 14 costs what wave 1 does). The turns cost nothing of their own: the frame is one more add and a
lookup on the projection. The walks are the ones played (1, 7 and 14); the road is baked a section a frame.

## Screenshots (`docs/samples/long-map-turns-*.png`, 393x852 and 360x780; `node tools/long-map/turns.mjs out/web shots`)

`deploy-up-right`, `deploy-down-right`, `deploy-down-left` (a boss arena), `deploy-up-left`; `walk-2`, `4`, `6`, `8` (the party walking
on to a section turned a quarter); `road-seed7`, `road-seed3` (the whole road, `__game.overview(true)`).
