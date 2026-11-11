# FX-ALIVE-ART: the owner's living ground loops

> **Superseded in part by BLENDER-FX** (`docs/notes/blender-fx.md`): the painted ground sheets (`src/art/fx/alive/`) and the pack's rune strip
> are no longer drawn. Each tile of a patch carries the element's Blender-rendered loop instead. The living patch's rules below (the faint
> fill, the rim, each tile's own beat, thinning under a fighter, reduced motion, the battery saver) all still hold.

Branch `claude/fx-alive-art` (from main 0.469.0, with `art/fx-alive` merged in). The sheet is `art-source/fx-alive/ground-loops.png`: 1024 x 512,
eight rows of eight 128 x 64 frames. It is cut by `python3 tools/fx-alive/cut.py art-source/fx-alive/ground-loops.png` into
`src/art/fx/alive/` (all eight rows kept). Renderer only. The version is unchanged.

## What the art is

- **The loops loop.** The change from the last frame back to the first (5 to 6 on a 0 to 255 scale, mean) is no bigger than the change between
  any two frames in a row, in every row. There is no jump.
- **The middle is clear.** The centre half of every diamond is fully transparent. Nothing is painted outside the diamond.
- **Every frame is framed.** Each row paints its effect as a border round its own diamond: a soft band about 10 px wide, at alpha 0.1 to 0.26.
  Laid tile against tile, as the prompt meant, the borders meet and make a lattice of separate blocks over the whole patch.

## How the game uses it

The lattice is the one thing the prompt asked to avoid. Rather than drop the art, the patch now uses the painted loop as its **edge**. Each side of
the diamond lies in its own quarter of the frame (`edgeQuarter` in `fxAlive.ts`), so a tile lays only the quarters on the patch's outer sides
(`rimEdges`, the same as the drawn rim). Inside, the frames never meet, so the patch has a moving painted ring and a clear middle.

- The painted edge breathes with the rim, at 1.6 of the rim's strength (`ALIVE.PAINTED`), drawn normally (it is too soft to add). Beside it the
  drawn rim steps back to 0.6 (`ALIVE.PAINTED_RIM`): a crisp line under the paint, so the warning's colour still reads.
- Like the rim, the painted edge stays under a fighter. The faint fill still thins.
- Each tile runs its loop a few frames apart from its neighbours (`stripFrame`). With reduced motion it holds the first frame, fainter, and the drawn rim keeps its full strength, since still paint alone is too faint to carry the warning.
- On the battery saver the paint is left out, as the rune strips were, and only the drawn fill and rim remain.
- Elements with no row (none now) keep the pack's rune strip on each tile, as before.
- Tells with no element (the land's hazards) draw no paint, as before.

## Row by row (`docs/samples/fx-alive-art/`)

| Row | Loops | Clear middle | Under heroes at 64 px | Verdict |
| --- | --- | --- | --- | --- |
| fire | yes | yes | Warm band with ember flecks; reads well on grass and stone | Use |
| ice | yes | yes | Frosted band with crystal points; quieter on water tiles | Use |
| light | yes | yes | Pale gold, the faintest on grass; the sparkles are lost at half size | Use (weakest; a brighter repaint would help) |
| dark | yes | yes | Violet band, the clearest against the green | Use |
| poison | yes | yes | Green bubbles; reads, though green on grass | Use |
| wind | yes | yes | Pale swirls; reads | Use |
| earth | yes | yes | Amber cracks; reads | Use |
| forest | yes | yes | Green on green, faint; the rim does most of the work | Use (weak on grass; a brighter or yellower repaint would help) |

No row is broken, so none fell back to the pack strip. For a repaint, the useful ask is a **borderless** version: the effect spread over the
whole diamond with no frame round it, so it could lie on every tile again. A brighter band would also help, since at the board's 64 px tile
(half the art's size) the fine detail is lost.

Shots: `tools/fx-alive/showcase.mjs [--mode normal|calm|saver]` stands the party deployed, lays each element's patch (a 3 x 3 on the middle of
the party and a cross by the first hero) and takes three frames. It writes `<mode>-<width>.jpg` at 393, 360 and 412, one row per element.

## Tests

`test/fx-alive.test.ts`:
- the quarter each edge lies in;
- the atlas holds all eight rows.

The earlier FX-ALIVE tests are unchanged.
