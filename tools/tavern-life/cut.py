#!/usr/bin/env python3
"""Copies the tavern life's pack props into src/art/tavern/life/ (the placeholders until the painted activity art lands):
ten 16px effect strips (six frames each) from the 5000 Pixel Effects pack, unchanged, and three 16x16 tiles from DawnLike's Items.
Usage: python3 tools/tavern-life/cut.py [path to chronos-assets]  (default ../chronos-assets)"""
import os, shutil, sys
from PIL import Image
src = sys.argv[1] if len(sys.argv) > 1 else '../chronos-assets'
out = os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'art', 'tavern', 'life')
os.makedirs(out, exist_ok=True)
# (our name: the pack's effect; each is pixel-effects/sprites/<effect>/sheet-16.png, six 16px frames in a row)
FX = {
    'pack-note-gold': 'gold-note', 'pack-note-pink': 'pink-note', 'pack-zzz': 'white-zzz', 'pack-steam': 'white-smoke-x',
    'pack-ember': 'fire-sparkle-x', 'pack-spark': 'gold-sparkle-x', 'pack-zap': 'lightning-sparkle-x', 'pack-star': 'star-sparkle-x',
    'pack-bang': 'white-exclaim', 'pack-sweat': 'white-sweat',
}
for name, fx in FX.items():
    shutil.copyfile(os.path.join(src, 'pixel-effects', 'sprites', fx, 'sheet-16.png'), os.path.join(out, f'{name}.png'))
# (our name: DawnLike Items sheet, row, column)
TILES = {'pack-book': ('Book', 0, 0), 'pack-pipes': ('Music', 0, 2), 'pack-meat': ('Flesh', 0, 0)}
for name, (sheet, r, c) in TILES.items():
    im = Image.open(os.path.join(src, 'DawnLike', 'Items', f'{sheet}.png')).convert('RGBA')
    im.crop((c * 16, r * 16, c * 16 + 16, r * 16 + 16)).save(os.path.join(out, f'{name}.png'))
print(len(FX) + len(TILES), 'props')
