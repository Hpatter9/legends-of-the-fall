#!/usr/bin/env python3
"""Cuts the 60 equipment icons (src/art/equip/<name>.png, 16x16) from the DawnLike item sheets, one tile each.
Usage: python3 tools/equip-icons.py [path to chronos-assets/DawnLike/Items]  (default ../chronos-assets/DawnLike/Items)"""
import os, sys
from PIL import Image
src = sys.argv[1] if len(sys.argv) > 1 else '../chronos-assets/DawnLike/Items'
ICONS = {
  # weapons
  'sword': ('LongWep', 1, 0), 'blade': ('LongWep', 1, 3), 'claymore': ('LongWep', 1, 1), 'frostbrand': ('LongWep', 1, 2), 'katana': ('LongWep', 1, 4),
  'axe': ('LongWep', 3, 4), 'battleaxe': ('LongWep', 3, 3), 'mace': ('ShortWep', 4, 0), 'maul': ('LongWep', 6, 0), 'spear': ('LongWep', 4, 2),
  'dagger': ('ShortWep', 0, 1), 'scythe': ('ShortWep', 3, 2), 'fist': ('Glove', 0, 0), 'bow': ('Ammo', 1, 2), 'longbow': ('Ammo', 1, 1),
  'crossbow': ('Ammo', 1, 5), 'blunderbuss': ('Music', 5, 0), 'stormstaff': ('Wand', 3, 2), 'wand': ('Wand', 4, 1), 'tome': ('Book', 6, 3),
  # armour
  'jerkin': ('Armor', 7, 0), 'hide': ('Armor', 0, 0), 'cloak': ('Armor', 7, 2), 'shadowcloak': ('Armor', 1, 0), 'mail': ('Armor', 8, 1),
  'scale': ('Armor', 0, 4), 'plate': ('Armor', 6, 5), 'thornplate': ('Armor', 6, 2), 'bastion': ('Armor', 6, 3), 'robe': ('Armor', 7, 3),
  'vestments': ('Armor', 7, 4), 'silk': ('Armor', 7, 5), 'dragonscale': ('Armor', 0, 2), 'gi': ('Armor', 7, 1), 'lamellar': ('Armor', 6, 0),
  'mithril': ('Armor', 6, 6), 'aegis': ('Armor', 1, 3), 'bone': ('Armor', 8, 4), 'harness': ('Armor', 8, 0), 'emberrobe': ('Armor', 7, 7),
  # trinkets
  'charm': ('Amulet', 0, 5), 'ring': ('Ring', 3, 0), 'boots': ('Boot', 0, 2), 'feather': ('Ammo', 4, 1), 'drum': ('Music', 2, 1),
  'lyre': ('Music', 3, 0), 'bell': ('Music', 4, 0), 'amulet': ('Amulet', 0, 4), 'pendant': ('Amulet', 1, 0), 'sapphire': ('Ring', 1, 1),
  'ruby': ('Ring', 2, 0), 'emerald': ('Ring', 1, 3), 'orb': ('Tool', 2, 0), 'scroll': ('Scroll', 5, 1), 'vial': ('Potion', 0, 0),
  'elixir': ('Potion', 0, 6), 'shard': ('Rock', 0, 2), 'idol': ('Rock', 1, 2), 'spectacles': ('Tool', 0, 2), 'circlet': ('Hat', 3, 0),
}
out = os.path.join(os.path.dirname(__file__), '..', 'src', 'art', 'equip')
os.makedirs(out, exist_ok=True)
for f in os.listdir(out):
    if f.endswith('.png'): os.remove(os.path.join(out, f))
for name, (sheet, r, c) in ICONS.items():
    Image.open(os.path.join(src, sheet + '.png')).convert('RGBA').crop((c * 16, r * 16, c * 16 + 16, r * 16 + 16)).save(os.path.join(out, name + '.png'))
print(len(ICONS), 'icons')
