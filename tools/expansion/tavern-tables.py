#!/usr/bin/env python3
"""Cuts the Elders' table of PR #464 (art-source/expansion/elders-table.png) for the head of the Elders' table's card (housesView.ts,
`.hsEldersArt`): trimmed to its picture, taken back to its own pixels if it was painted doubled, and its alpha made hard (in or out).
Written to src/art/tavern/elders-table.png and bundled into game.js, so it plays offline with no change to the service worker's list.
(Hester's table, hester-table.png, is not used: it was painted for the pixel tavern, which the Heroes tab no longer shows, and her
stall's page already opens on her painted portrait; docs/notes/tavern-25.md.)
Usage: python3 tools/expansion/tavern-tables.py"""
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', '..', 'art-source', 'expansion')
OUT = os.path.join(HERE, '..', '..', 'src', 'art', 'tavern')

def doubled(im):
    w, h = im.size
    if w % 2 or h % 2:
        return False
    px = im.load()
    return all(px[x, y] == px[x + 1, y] == px[x, y + 1] == px[x + 1, y + 1] for y in range(0, h, 2) for x in range(0, w, 2))

for name in ['elders-table']:
    im = Image.open(os.path.join(SRC, f'{name}.png')).convert('RGBA')
    r, g, b, a = im.split()
    im = Image.merge('RGBA', (r, g, b, a.point(lambda v: 255 if v >= 128 else 0)))
    if doubled(im):
        im = im.resize((im.width // 2, im.height // 2), Image.NEAREST)
    box = im.getbbox()
    im = im.crop(box)
    im.save(os.path.join(OUT, f'{name}.png'))
    print(name, f'{im.width}x{im.height}')
