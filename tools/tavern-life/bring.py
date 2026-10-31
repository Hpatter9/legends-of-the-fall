#!/usr/bin/env python3
"""Brings the painted tavern life art into the game: art-source/tavern-life/<folder>/<key>.png (docs/notes/tavern-art-prompt.md)
to src/art/tavern/life/<key>.png, where the tavern finds it by name when the game is built (no code change).

- heroes/<kind>.png: two rows (the loop, then the beat) of 256 px square cells -> 128 px cells.
- keeper/gwen.png: three rows (idle, wipe, talk) of 256 px cells -> 128 px cells.
- props/<name>.png: one 64 px picture -> 16 px.
Each is shrunk (Lanczos) and its alpha made hard (in or out, no half-clear pixels), so it sits with the pixel art. It checks the
sizes and that the cells' corners are clear, and names each fault; a sheet with a fault is not brought in.
Usage: python3 tools/tavern-life/bring.py [--check]"""
import os, sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', '..', 'art-source', 'tavern-life')
OUT = os.path.join(HERE, '..', '..', 'src', 'art', 'tavern', 'life')
PROPS = ['tankard', 'cup', 'dart', 'cards', 'dice', 'coin']
check = '--check' in sys.argv
os.makedirs(OUT, exist_ok=True)

def hard(im):
    r, g, b, a = im.split()
    return Image.merge('RGBA', (r, g, b, a.point(lambda v: 255 if v >= 128 else 0)))

def sheet(path, rows, cell, to):
    im = Image.open(path).convert('RGBA')
    w, h = im.size
    faults = []
    if h != rows * cell:
        faults.append(f'{h} px high: should be {rows} rows of {cell} px')
    if w % cell or w // cell < 2 or w // cell > 8:
        faults.append(f'{w} px wide: should be 2 to 8 cells of {cell} px')
    if not faults:
        for r in range(rows):
            for c in range(w // cell):
                for (x, y) in [(0, 0), (cell - 1, 0), (0, cell - 1), (cell - 1, cell - 1)]:
                    if im.getpixel((c * cell + x, r * cell + y))[3] > 8:
                        faults.append(f'row {r + 1}, cell {c + 1}: a corner is not clear')
                        break
    if faults:
        return None, faults
    return hard(im.resize((w * to // cell, h * to // cell), Image.LANCZOS)), []

done = 0
for folder, rows in [('heroes', 2), ('keeper', 3), ('props', 0)]:
    d = os.path.join(SRC, folder)
    if not os.path.isdir(d):
        print(f'{folder}: nothing yet')
        continue
    for f in sorted(os.listdir(d)):
        if not f.endswith('.png'):
            continue
        key = f[:-4]
        path = os.path.join(d, f)
        if rows:
            out, faults = sheet(path, rows, 256, 128)
            name = key
        else:
            if key not in PROPS:
                print(f'props/{f}: not a prop the tavern draws ({", ".join(PROPS)})')
                continue
            im = Image.open(path).convert('RGBA')
            faults = [] if im.size == (64, 64) else [f'{im.size[0]}x{im.size[1]}: should be 64x64']
            out = None if faults else hard(im.resize((16, 16), Image.LANCZOS))
            name = f'prop-{key}'
        if faults:
            print(f'{folder}/{f}: ' + '; '.join(faults))
            continue
        if not check:
            out.save(os.path.join(OUT, f'{name}.png'))
        done += 1
print(done, 'pictures', 'checked' if check else 'brought in')
