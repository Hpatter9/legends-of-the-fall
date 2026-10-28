# Packs the 32px strips the awakened auras use (every `sheet` named in src/render/auraStyles.ts), copied unchanged from
# the 5000 Pixel Effects pack in the assets repository, into one picture: a strip a row (src/art/fx/aura/atlas.png),
# with atlas.json giving each strip's row and frame count. Run by hand:
#   python3 tools/awaken/aura-sheets.py [../chronos-assets]
import json, re, sys, os
from PIL import Image
assets = sys.argv[1] if len(sys.argv) > 1 else '../chronos-assets'
src = open('src/render/auraStyles.ts').read()
names = sorted(set(re.findall(r"p\('([a-z0-9-]+)'", src)))
strips = [Image.open(f'{assets}/pixel-effects/sprites/{n}/sheet-32.png').convert('RGBA') for n in names]
atlas = Image.new('RGBA', (max(s.width for s in strips), 32 * len(strips)), (0, 0, 0, 0))
index = {}
for row, (n, s) in enumerate(zip(names, strips)):
    atlas.paste(s, (0, row * 32))
    index[n] = [row, s.width // 32]
os.makedirs('src/art/fx/aura', exist_ok=True)
atlas.save('src/art/fx/aura/atlas.png', optimize=True)
json.dump(index, open('src/art/fx/aura/atlas.json', 'w'), separators=(',', ':'))
print(len(names), 'strips packed', atlas.size)
