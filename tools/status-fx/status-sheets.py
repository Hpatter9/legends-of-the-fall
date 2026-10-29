# STATUS-FX: builds the ailments' atlas from the 5000 Pixel Effects pack (placeholder art until the painted sheets come).
# Each part key of src/render/statusStyles.ts (`<ailment>.<part>`) names a pack strip in tools/status-fx/status-pack.json;
# each strip (32px frames, copied unchanged from pixel-effects/sprites/<strip>/sheet-32.png in the assets repository) takes
# one row of src/art/fx/status/atlas.png, and atlas.json gives the cell size and each key's [column, row, frames] in cells.
# Painted art made to docs/notes/status-fx-art-brief.md writes the same two files with the same keys
# (tools/status-fx/import-status-art.py). Run by hand:
#   python3 tools/status-fx/status-sheets.py [../chronos-assets]
import json, sys, os
from PIL import Image
assets = sys.argv[1] if len(sys.argv) > 1 else '../chronos-assets'
keys = json.load(open('tools/status-fx/status-pack.json'))
strips = sorted(set(keys.values()))
pics = [Image.open(f'{assets}/pixel-effects/sprites/{n}/sheet-32.png').convert('RGBA') for n in strips]
atlas = Image.new('RGBA', (max(p.width for p in pics), 32 * len(pics)), (0, 0, 0, 0))
rows = {}
for row, (n, p) in enumerate(zip(strips, pics)):
    atlas.paste(p, (0, row * 32))
    rows[n] = [0, row, p.width // 32]
os.makedirs('src/art/fx/status', exist_ok=True)
atlas.save('src/art/fx/status/atlas.png', optimize=True)
json.dump({'cell': 32, 'parts': {k: rows[v] for k, v in sorted(keys.items())}}, open('src/art/fx/status/atlas.json', 'w'), separators=(',', ':'))
print(len(keys), 'parts from', len(strips), 'strips', atlas.size)
