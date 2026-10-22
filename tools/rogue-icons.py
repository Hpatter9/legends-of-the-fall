#!/usr/bin/env python3
"""Cuts the endless tower's map icons (src/art/rogue/<name>.png, 16x16) from the DawnLike sheets, one tile each; crossed swords is the sword tile and its mirror.
Usage: python3 tools/rogue-icons.py [path to chronos-assets/DawnLike]  (default ../chronos-assets/DawnLike)"""
import os, sys
from PIL import Image, ImageOps
src = sys.argv[1] if len(sys.argv) > 1 else '../chronos-assets/DawnLike'
ICONS = {
  'fire': ('Objects/Effect0', 21, 1), 'skull': ('Objects/Effect0', 23, 2), 'coin': ('Items/Money', 1, 0), 'question': ('GUI/GUI1', 0, 1),
  'heart': ('GUI/GUI1', 1, 0), 'potion': ('Items/Potion', 0, 0), 'elixir': ('Items/Potion', 0, 6),
}
out = os.path.join(os.path.dirname(__file__), '..', 'src', 'art', 'rogue')
os.makedirs(out, exist_ok=True)
def tile(sheet, r, c):
    return Image.open(os.path.join(src, sheet + '.png')).convert('RGBA').crop((c * 16, r * 16, c * 16 + 16, r * 16 + 16))
for name, (sheet, r, c) in ICONS.items():
    tile(sheet, r, c).save(os.path.join(out, name + '.png'))
sword = tile('Items/LongWep', 1, 0)
both = Image.new('RGBA', (16, 16))
both.alpha_composite(sword)
both.alpha_composite(ImageOps.mirror(sword))
both.save(os.path.join(out, 'swords.png'))
print(len(ICONS) + 1, 'icons')
