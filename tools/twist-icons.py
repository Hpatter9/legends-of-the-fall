#!/usr/bin/env python3
"""Cuts the floor twists' badge icons (src/art/twists/<id>.png, 16x16) from the DawnLike sheets, one tile each.
Also the four legendary relics' icons (src/art/items/).
Usage: python3 tools/twist-icons.py [path to chronos-assets/DawnLike]  (default ../chronos-assets/DawnLike)"""
import os, sys
from PIL import Image
src = sys.argv[1] if len(sys.argv) > 1 else '../chronos-assets/DawnLike'
ICONS = {
  'fog': ('Objects/Effect0', 21, 2), 'holy': ('Items/Potion', 3, 3), 'lava': ('Items/Rock', 0, 1), 'gale': ('Objects/Effect0', 22, 4),
  'bloodmoon': ('Objects/Effect0', 24, 6), 'narrow': ('Items/Rock', 1, 2), 'treasure': ('Items/Money', 0, 0), 'haste': ('Items/Boot', 0, 2),
  'frost': ('Objects/Effect0', 21, 5), 'mana': ('Items/Potion', 0, 7), 'cursed': ('Objects/Effect0', 23, 0), 'ambush': ('Items/ShortWep', 0, 0),
  'glory': ('Items/Hat', 3, 2), 'fortified': ('Items/Shield', 0, 2),
}
ITEMS = {'sun_crown': ('Items/Hat', 3, 1), 'dragon_heart': ('Items/Amulet', 0, 2), 'storm_ring': ('Items/Ring', 1, 3), 'void_lens': ('Items/Amulet', 0, 6)}
out = os.path.join(os.path.dirname(__file__), '..', 'src', 'art', 'twists')
os.makedirs(out, exist_ok=True)
for name, (sheet, r, c) in ICONS.items():
    Image.open(os.path.join(src, sheet + '.png')).convert('RGBA').crop((c * 16, r * 16, c * 16 + 16, r * 16 + 16)).save(os.path.join(out, name + '.png'))
items = os.path.join(os.path.dirname(__file__), '..', 'src', 'art', 'items')
for name, (sheet, r, c) in ITEMS.items():
    Image.open(os.path.join(src, sheet + '.png')).convert('RGBA').crop((c * 16, r * 16, c * 16 + 16, r * 16 + 16)).save(os.path.join(items, name + '.png'))
print(len(ICONS) + len(ITEMS), 'icons')
