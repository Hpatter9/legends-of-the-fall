# Builds the aura atlas from the 5000 Pixel Effects pack: each part key of src/render/auraStyles.ts names a pack strip in
# tools/awaken/aura-pack.json; each strip (32px frames, copied unchanged from pixel-effects/sprites/<strip>/sheet-32.png
# in the assets repository) takes one row of src/art/fx/aura/atlas.png, and atlas.json gives the cell size and each
# key's [column, row, frames] in cells. A painted atlas made to the art brief (docs/notes/awaken-auras-art-brief.md) writes the
# same two files with the same keys. Run by hand:
#   python3 tools/awaken/aura-sheets.py [../chronos-assets]
import json, sys, os
from PIL import Image
assets = sys.argv[1] if len(sys.argv) > 1 else '../chronos-assets'
keys = json.load(open('tools/awaken/aura-pack.json'))
strips = sorted(set(keys.values()))
pics = [Image.open(f'{assets}/pixel-effects/sprites/{n}/sheet-32.png').convert('RGBA') for n in strips]
atlas = Image.new('RGBA', (max(p.width for p in pics), 32 * len(pics)), (0, 0, 0, 0))
rows = {}
for row, (n, p) in enumerate(zip(strips, pics)):
    atlas.paste(p, (0, row * 32))
    rows[n] = [0, row, p.width // 32]
os.makedirs('src/art/fx/aura', exist_ok=True)
atlas.save('src/art/fx/aura/atlas.png', optimize=True)
json.dump({'cell': 32, 'parts': {k: rows[v] for k, v in sorted(keys.items())}}, open('src/art/fx/aura/atlas.json', 'w'), separators=(',', ':'))
print(len(keys), 'parts from', len(strips), 'strips', atlas.size)
