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
