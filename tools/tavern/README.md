# Tavern art

`gen.sh <endpoint> <out.png> '<json>'` posts one request to PixelLab (credentials come from the proxy) and saves the
image, retrying on a 502. The pieces in `src/art/tavern/` came from `/create-image-pixflux` at their final pixel size
(side view, single colour black outline, medium shading and detail, transparent background for the furniture):

| file | size | prompt (short) |
|---|---|---|
| wall.png | 384x176 | medieval tavern back wall, dark timber, stone fireplace left, bottle shelves, night windows, lanterns |
| floor.png | 64x128 | seamless wooden plank floor texture (turned a quarter, darkened, then tiled) |
| rug.png | 96x40 | red and gold rug, top-down |
| bar.png, stool.png, chair.png, table.png, longtable.png, barrels.png, crates.png | trimmed to their pixels | furniture, side view |

The furniture was trimmed to its pixels (alpha bounding box); the floor was rotated and darkened with Pillow. Nothing is
scaled on the way in: the page draws it at a whole-number scale with nearest neighbour.

## The hearth hall and the games room

Same endpoint and settings (`gen.sh /create-image-pixflux`, side view, single colour black outline, medium shading and detail). A few
tries each (a 502 now and then, retried by `gen.sh`); `tools/tavern/hall.py <dir>` cuts the picked results into `src/art/tavern/`.

| file | size | prompt (short) |
|---|---|---|
| wall_hearth.png | 384x128 (cut from 384x176) | flat straight-on tavern back wall, dark timber planks, big stone fireplace with a fire in the centre, mantel with pots, wall lanterns, plain skirting board, no floor, no ceiling, no perspective |
| wall_back.png | 384x128 (cut from 384x176) | flat straight-on games room back wall, dark timber planks, round dartboard, sword and axe weapon rack, small night window, wall lanterns, no floor, no furniture |
| arch.png | 56x128 | dark wood doorway frame, two timber posts and a flat beam above, front view, open empty middle (transparent) |
| bench.png | 54x13 | long wooden tavern bench, side view (a grey shadow strip under it dropped) |
| stage.png | 107x87 | small low wooden tavern stage platform with a red curtain behind |

`wall.png` (the bar room) is the original 384x176 wall without its top 48 rows, so all three walls are 128 tall. `node tools/tavern/shots.mjs` takes the samples.
