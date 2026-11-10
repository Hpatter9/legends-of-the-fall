#!/usr/bin/env python3
"""UNUSED-ART (docs/notes/unused-art.md): Hester's merchant table (PR #464, art-source/expansion/hester-table.png) for the counter of her
stall's scene (stallView.ts, `.hsTable` in stall.css).

    python3 tools/unused-art/hester-table.py && npm run web

The painting is already at its own pixels (a 192 x 128 grid doubled to 384 x 256), so it is only trimmed to its paint and written as a
lossless WebP to src/art/shop/hester-table.webp: build.mjs copies every src/art/shop/*.webp and the service worker caches it for offline play.
"""
from PIL import Image

SRC = 'art-source/expansion/hester-table.png'
OUT = 'src/art/shop/hester-table.webp'

im = Image.open(SRC).convert('RGBA')
box = im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
im = im.crop(box)
im.save(OUT, 'WEBP', lossless=True, method=6)
print(f'{SRC} -> {OUT}: {im.size[0]} x {im.size[1]}')
