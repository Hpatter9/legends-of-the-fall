#!/usr/bin/env python3
"""Cuts the three XP tome icons (src/art/ui/tome-<size>.png, 16x16) from the DawnLike Book sheet, one tile each.
Usage: python3 tools/tome-icons.py [path to chronos-assets/DawnLike/Items]  (default ../chronos-assets/DawnLike/Items)"""
import os, sys
from PIL import Image
src = sys.argv[1] if len(sys.argv) > 1 else '../chronos-assets/DawnLike/Items'
# (row, column) on Book.png: a plain brown book, a blue-bound tome, and the gold book with its sparkle
ICONS = {'small': (0, 0), 'medium': (2, 3), 'large': (3, 6)}
out = os.path.join(os.path.dirname(__file__), '..', 'src', 'art', 'ui')
sheet = Image.open(os.path.join(src, 'Book.png')).convert('RGBA')
for name, (r, c) in ICONS.items():
    sheet.crop((c * 16, r * 16, c * 16 + 16, r * 16 + 16)).save(os.path.join(out, f'tome-{name}.png'))
print(len(ICONS), 'icons')
