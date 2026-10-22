#!/usr/bin/env python3
"""Cuts the two attack strips the loading screen (#loading in src/index.html) fights with from the unit sheets:
the Knight (knight_1) and the Demon Lord (hk_demon_lord). build.mjs inlines them into the page as data URLs, so the
screen shows at once, before game.js has downloaded. Run from the repo root: python3 tools/loading-art.py"""
from PIL import Image

def strip(sheet, w, h, row, n, out):
    im = Image.open(f'src/art/units/{sheet}.png').convert('RGBA')
    im.crop((0, row * h, w * n, (row + 1) * h)).save(f'src/art/loading/{out}.png', optimize=True)

strip('knight_1', 180, 76, 1, 5, 'knight-attack')
strip('hk_demon_lord', 128, 125, 1, 5, 'demon-attack')
