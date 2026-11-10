# FX-ALIVE: cut the painted living-ground sheet (docs/notes/fx-alive-art-prompts.md, prompt 1) into the game's atlas.
#
#   python3 tools/fx-alive/cut.py art-source/fx-alive/ground-loops.png
#   python3 tools/fx-alive/cut.py art-source/fx-alive/ground-fill-loops.png fill
#
# The second (REPAINTS-2, docs/notes/repaints-2.md) is the borderless fill, laid on every tile of a patch; it is written as fill.png and
# fill.json beside the edge's atlas.
#
# The sheet is 8 frames across and 8 rows down, each frame 128 x 64 px (an isometric tile's 2:1 diamond, centred), rows in the order of ROWS.
# It writes src/art/fx/alive/atlas.png (the sheet, its fully clear rows dropped) and atlas.json ({"cell": [128, 64], "rows": {element: [row,
# frames]}}); `src/render/aliveArt.ts` reads them, and `alivePatch` lays them in place of the pack's runes with no code change.
import json
import sys
from PIL import Image

ROWS = ['fire', 'ice', 'light', 'dark', 'poison', 'wind', 'earth', 'forest']
CELL = (128, 64)
FRAMES = 8

src = Image.open(sys.argv[1]).convert('RGBA')
NAME = sys.argv[2] if len(sys.argv) > 2 else 'atlas'
w, h = CELL
if src.size != (w * FRAMES, h * len(ROWS)):
    sys.exit(f'expected {w * FRAMES} x {h * len(ROWS)} px, got {src.size[0]} x {src.size[1]}')
kept = []
for r, el in enumerate(ROWS):
    row = src.crop((0, r * h, w * FRAMES, (r + 1) * h))
    if row.getbbox() is None:
        print(f'{el}: empty, left out')
        continue
    kept.append((el, row))
out = Image.new('RGBA', (w * FRAMES, h * max(1, len(kept))), (0, 0, 0, 0))
rows = {}
for i, (el, row) in enumerate(kept):
    out.paste(row, (0, i * h))
    rows[el] = [i, FRAMES]
out.save(f'src/art/fx/alive/{NAME}.png', optimize=True)
json.dump({'cell': [w, h], 'rows': rows}, open(f'src/art/fx/alive/{NAME}.json', 'w'), indent=1)
print(f'wrote src/art/fx/alive/{NAME}.png and {NAME}.json:', ', '.join(rows))
