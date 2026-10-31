#!/usr/bin/env python3
"""RELICS-2: placeholder icons (src/art/items/<name>.png, 16x16) for the relics that had none of their own, cut one tile each from the
DawnLike sheets, until the painted relic icons come (docs/notes/relic-art-prompts.md). The Founder's Ledger used to share the Dragon Heart's tile.
Usage: python3 tools/relics/relic-icons-2.py [path to chronos-assets/DawnLike]  (default ../chronos-assets/DawnLike)"""
import os, sys
from PIL import Image
src = sys.argv[1] if len(sys.argv) > 1 else '../chronos-assets/DawnLike'
ICONS = {
  'founders_ledger': ('Items/Book', 0, 0),
  'book_of_names': ('Items/Book', 5, 1),
  'unfinished_chronicle': ('Items/Book', 6, 1),
}
out = os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'art', 'items')
for name, (sheet, r, c) in ICONS.items():
    Image.open(os.path.join(src, sheet + '.png')).convert('RGBA').crop((c * 16, r * 16, c * 16 + 16, r * 16 + 16)).save(os.path.join(out, name + '.png'))
print(len(ICONS), 'icons')
