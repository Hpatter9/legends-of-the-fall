# Art wire 7: four holds painted in full, and the Moonlit Shrine's walls

**Superseded in part by `docs/notes/art-wire-8.md`:** sheets 08 to 12 were cut here by the Orc slots, which mislabelled several pieces;
the ladder fix below was a symptom of that, and is gone.

The owner's Assault sheets from five art branches are merged into this branch and cut into the game:

| Hold | Branch (PR) | Sheets |
| --- | --- | --- |
| Barrow Necropolis | `art/assault-undead` (#476) | und-01 to und-13 |
| Elder Root | `art/assault-wildwood` (#475) | wld-01 to wld-13 |
| Heart of the Maze | `art/assault-labyrinth` (#485) | lab-01 to lab-14, the maze walls among them |
| Howling Den | `art/assault-beasts` (#487) | bst-01 to bst-13 |
| Moonlit Shrine | `art/assault-yokai` (#488) | yok-01 to yok-03 |

The pictures are in `docs/samples/art-wire-7/`. Each one shows the hold at 393 x 852: its South Gate, its keep and the Warpath camp's ground and
props. The maze has its own picture.

## The cut

`tools/assault/cut-sheets.py <hold>` for each of the five. The cutter already used a hold's own sheet wherever it was painted, and the
recoloured Orc stand-in only for a slot still missing. So:

- the four full holds now draw nothing from the Orc sheets;
- the Moonlit Shrine draws its tiled wall, gates and Moon Gate from its own sheets, and keeps its stand-ins for the rest.

The cut stays re-runnable: merge more sheets on the same branches and run it again.

## Two fixes

- **The maze walls (lab-14).** Before, every maze tile was drawn as one plain run. Now `mazePiece` (`src/render/fieldLooks.ts`) picks each
  tile's piece from lab-14 by the walls beside it:
  - a run, plain or dressed (cracked, ivy, fresco, grille, torch, banner, spears, amphora, niche; a hash of the tile picks one, plain half
    the time);
  - the near corner (either of the two painted);
  - the T-junction;
  - the end on its brazier pier, the pier at the open end.

  Shapes the sheet has no piece for (the far and side corners, a branch downwards) take a plain run. The broken stump and the open gap are
  not used, since every maze tile blocks. `mazeRun` left the list of Chronos kit pieces (it was there from its old kit stand-in), so the
  walls are drawn at the hold sheets' scale. Tested in `test/assault-maze.test.ts`.
- **Elder Root's keep.** The Elder Root was drawn as the Druids kit's great oak, scaled up until its painting landed. It now uses wld-07's
  painted tree-keep, like every other hold's keep.

## Foot points

The cutter's report raised the same two pieces in each of the four full holds:

- **`ladder`**: painted with its base at the tile's tip, about 30 px below the Orc ladder's. The cutter stood it on its picture a footprint
  lower, so it would have hung half a tile below the wall. The cutter now stands a ladder on its own base, as the Orc sheet paints it (`BASE_FOOT`).
- **`pavilion`** (3 x 3): its base sits about 33 px inside its footprint, centred. The field never places a pavilion, so it is left as
  painted.

The Moonlit Shrine's gate post is 33 px off, inside the tolerance. Its other warnings are the Orc stand-ins' own, as before.

## What looks off (for the owner)

- **The ruined walls' scatter in every camp** is the Chronos kits' dark ruin arches (`ruin1`, `ruin2`), black against the painted ground.
  Each hold's painted ruins (`burntShell`, `burntHeap`) could take their place; that is a small change to `fieldLooks.ts` if wanted.
- **The grey boulders** (the kits' `boulders`, flat grey with a hard outline) stand out on the Heart of the Maze's sand and the Den's moor.
- The Heart of the Maze's ash and scorched ground reads as a dark, blocky patch beside the sand.
- The Moonlit Shrine still has the recoloured Orc keep (horned skulls and red banners) until yok-07 lands.

## Checks

- `npm run typecheck`: clean.
- `npm test -- assault`: 167 pass.
- `npm run web`: builds.
- Each of the five holds' fields looked at on the Assault bench (`?bench=assault&army=<hold>`) at 393 x 852.
