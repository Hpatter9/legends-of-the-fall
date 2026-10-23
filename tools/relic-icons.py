#!/usr/bin/env python3
"""Cuts the Calamity relic sets' icons (src/art/items/<id>.png, 16x16) from the DawnLike sheets, one tile each.
Usage: python3 tools/relic-icons.py [path to chronos-assets/DawnLike]  (default ../chronos-assets/DawnLike)"""
import os, sys
from PIL import Image
src = sys.argv[1] if len(sys.argv) > 1 else '../chronos-assets/DawnLike'
ICONS = {
  # storm
  'thunder_horn': ('Items/Music', 1, 3), 'cloud_treads': ('Items/Boot', 1, 1), 'thunder_pendant': ('Items/Amulet', 1, 1), 'tempest_ring': ('Items/Ring', 3, 6),
  # earth
  'granite_heart': ('Items/Amulet', 1, 2), 'moss_amulet': ('Items/Ring', 4, 2), 'stone_gauntlet': ('Items/Glove', 0, 2), 'earthen_bell': ('Items/Music', 4, 0),
  # blood
  'blood_vial': ('Items/Potion', 1, 2), 'bloodstone_ring': ('Items/Ring', 2, 5), 'reaver_helm': ('Items/Hat', 0, 4), 'ruby_locket': ('Items/Amulet', 1, 6),
  # star
  'star_chart': ('Items/Book', 4, 3), 'comet_shard': ('Items/Money', 2, 1), 'moon_lantern': ('Items/Music', 4, 1), 'astral_circlet': ('Items/Hat', 3, 0),
  # fortune
  'coin_hoard': ('Items/Money', 1, 0), 'gilded_ingot': ('Items/Money', 3, 3), 'jewel_crown': ('Items/Hat', 3, 2), 'gold_band': ('Items/Ring', 3, 1),
  # rift
  'rift_shard': ('Items/Money', 4, 2), 'void_sigil': ('Items/Book', 6, 2), 'doom_helm': ('Items/Hat', 1, 2), 'last_light': ('Items/Potion', 3, 3),
}
out = os.path.join(os.path.dirname(__file__), '..', 'src', 'art', 'items')
for name, (sheet, r, c) in ICONS.items():
    Image.open(os.path.join(src, sheet + '.png')).convert('RGBA').crop((c * 16, r * 16, c * 16 + 16, r * 16 + 16)).save(os.path.join(out, name + '.png'))
print(len(ICONS), 'icons')
