#!/usr/bin/env python3
"""Packs the combat effects' 32px strips from the Pixel Effects pack (chronos-assets/pixel-effects) into one atlas:
src/art/fx/pack/atlas.png (four strips to a row, each at most eight 32px frames) and atlas.json (name -> x, y, frames).
Names are '<element>-<family>', e.g. 'fire-orb'. Run: python3 tools/fx-atlas.py [path to chronos-assets]"""
import json, os, sys
from PIL import Image

root = os.path.join(sys.argv[1] if len(sys.argv) > 1 else '../chronos-assets', 'pixel-effects', 'sprites')
out = os.path.join(os.path.dirname(__file__), '..', 'src', 'art', 'fx', 'pack')
FULL = ['fire', 'ice', 'lightning', 'light', 'dark', 'forest', 'poison', 'earth', 'wind', 'blood']
FAMILIES = ['orb', 'hit', 'explosion', 'slash', 'circle', 'rune', 'shield', 'status', 'gather', 'nova', 'cross', 'puff', 'smoke',
            'sparkle', 'aura', 'vortex', 'pillar', 'strike', 'spikes', 'wave', 'flame']
EXTRA = [f'{e}-{f}' for e in ['star', 'water', 'moon'] for f in ['orb', 'hit', 'explosion', 'slash', 'sparkle']]
names = [f'{e}-{f}' for e in FULL for f in FAMILIES] + EXTRA
names = [n for n in names if os.path.exists(os.path.join(root, n, 'sheet-32.png'))]
COLS, CELL_W, CELL_H = 4, 256, 32
rows = (len(names) + COLS - 1) // COLS
atlas = Image.new('RGBA', (COLS * CELL_W, rows * CELL_H), (0, 0, 0, 0))
meta = {}
for i, n in enumerate(names):
    s = Image.open(os.path.join(root, n, 'sheet-32.png')).convert('RGBA')
    x, y = (i % COLS) * CELL_W, (i // COLS) * CELL_H
    atlas.alpha_composite(s.crop((0, 0, min(s.width, CELL_W), 32)), (x, y))
    meta[n] = [x, y, min(s.width, CELL_W) // 32]
os.makedirs(out, exist_ok=True)
atlas.save(os.path.join(out, 'atlas.png'), optimize=True)
json.dump(meta, open(os.path.join(out, 'atlas.json'), 'w'), separators=(',', ':'))
print(len(names), 'strips,', atlas.size, os.path.getsize(os.path.join(out, 'atlas.png')) // 1024, 'KB')
