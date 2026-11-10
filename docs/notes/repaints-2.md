# REPAINTS-2: the borderless ground fills and the seamless duel fills

Branch `claude/repaints-2-wire` (from main 0.473.0, with `art/repaints-2` merged in). It wires two repaints the owner asked for. It's a renderer
and art change only, and the version is unchanged.

## 1. The borderless ground fills (`art-source/fx-alive/ground-fill-loops.png`)

The sheet is 1024 x 512: eight rows (fire, ice, light, dark, poison, wind, earth, forest), each of eight 128 x 64 frames. It is cut by
`python3 tools/fx-alive/cut.py art-source/fx-alive/ground-fill-loops.png fill` into `src/art/fx/alive/fill.png` and `fill.json`, beside the edge's
atlas, and loaded by `aliveArt.ts` (`aliveFill`). It is bundled, so nothing new is fetched.

**The checks on the art:**
- **No grid.** A 4 x 4 isometric patch of each row, each tile a few frames from its neighbours, shows no box or grid lines. The pattern runs on
  over the joins.
- **The loops.** Each frame is the one before shifted by about 2 px (a steady drift: the best shift's difference is 2 to 8 on 0 to 255, against
  48 to 71 unshifted). The step from the last frame back to the first is no bigger than any other step in its row.
- **What it covers.** Each row covers about a third of its diamond, in small opaque motes and flecks, with nothing outside the diamond.

**How it's drawn** (`alivePatch` in `fx.ts`):
- The fill lies on every tile of the patch, on the tile's ground, under the fighters. Over it go the drawn rim and the painted edge (FX-ALIVE-ART)
  on the patch's outer sides.
- It is drawn at the strip's strength (`ALIVE.PAINTED_FILL`, 1.3 of it): about 0.55 to 0.65 on an open tile and about 0.25 under a fighter.
- Each tile runs its loop a few frames from its neighbours (`stripFrame`).
- With reduced motion it holds its first frame. On the battery saver no paint is drawn, only the faint fill and the rim.
- An element with neither sheet falls back to the pack's rune, as before.

| Row | No grid | Loops | Hero readable | On grass | Verdict |
| --- | --- | --- | --- | --- | --- |
| fire | yes | yes | yes, thinned under | orange embers, clear | Use |
| ice | yes | yes | yes | blue frost, clear | Use |
| light | yes | yes | yes | pale gold flecks: now reads on grass | Use |
| dark | yes | yes | yes | violet, the clearest | Use |
| poison | yes | yes | yes | lime bubbles, clear | Use |
| wind | yes | yes | yes | teal swirls, clear | Use |
| earth | yes | yes | yes | amber cracks, clear | Use |
| forest | yes | yes | yes | yellow-green flowers and leaves: now reads, the quietest of the eight | Use |

No row failed, so no element keeps the old look.

## 2. The seamless duel fills (`art-source/duel-show/duel-bar-fill-{green,red}.png`)

The repaints are 64 x 26 and fully opaque. Every column is the same, a stepped gradient from top to bottom, so four laid side by side show no
seam. The 60 x 24 crop that UI-ART-WIRE added is dropped: `tools/duel-show/import-art.py` keeps the whole tile, and checks that its first and
last columns match. `.dsArt .dsGreen` and `.dsRed` tile it at 32 px, half its painted width, as before. The cost is that the old tiles' mottled
texture is gone: the bars are now clean bands.

## Shots and checks

In `docs/samples/repaints-2/`:
- `<mode>-<width>.jpg`: each element over the deployed party (`node tools/fx-alive/showcase.mjs --mode normal|calm|saver --out
  docs/samples/repaints-2`) at 393, 360 and 412.
- `duel-bar-after.png`: the bar 4 s into the duel and at a big swing, at the three sizes, from `tools/duel-show/shots.mjs` (all its checks
  pass).

`test/fx-alive.test.ts` checks that the fill's atlas holds all eight rows of eight 2:1 frames and that it thins under a fighter.
