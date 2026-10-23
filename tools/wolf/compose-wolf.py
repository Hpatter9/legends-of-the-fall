# Cuts the Beastmaster's wolf sheets from the MV animals pack (`whtdragons_MVanimals`, animals/wolfdog.png: 8 animals of 3 frames by
# 4 facings, 48px a cell). Uses the right-facing row of the grey and black wolves, scaled up 2x (whole pixels), and builds the game's
# rows (walk, attack, idle, hurt, dead) with the frames the pack gives: a step cycle, a lunge made of the stride shifted forward, a breathing idle,
# the hurt frame flashed and the dead one rolled onto its side.
# Usage: python3 tools/wolf/compose-wolf.py ../chronos-assets/whtdragons_MVanimals_ALL_4-1-2025/animals/wolfdog.png src/art/units
import json, sys
from PIL import Image, ImageEnhance

src, out = sys.argv[1], sys.argv[2]
sheet = Image.open(src).convert('RGBA')
CELL, UP = 48, 2
W = H = CELL * UP
PER_ROW = 4
ROWS = ['walk', 'attack', 'idle', 'hurt', 'dead']

def frame(block, i):
    x0 = block * 3 * CELL + i * CELL
    return sheet.crop((x0, 2 * CELL, x0 + CELL, 3 * CELL)).resize((W, H), Image.NEAREST)  # row 2 faces right

def shifted(im, dx, dy=0):
    r = Image.new('RGBA', im.size, (0, 0, 0, 0))
    r.paste(im, (dx, dy), im)
    return r

def build(block, name):
    f = [frame(block, i) for i in range(3)]
    walk = [f[0], f[1], f[2], f[1]]
    attack = [f[1], shifted(f[0], -4), shifted(f[2], 10), shifted(f[1], 4)]
    idle = [f[1], shifted(f[1], 0, 2)]
    hurt = [ImageEnhance.Brightness(shifted(f[1], -6)).enhance(1.5)]
    dead = [f[1].rotate(90, expand=False), shifted(f[1].rotate(90), 0, 4)]
    rows = [walk, attack, idle, hurt, dead]
    im = Image.new('RGBA', (W * PER_ROW, H * len(rows)), (0, 0, 0, 0))
    for r, fr in enumerate(rows):
        for c, p in enumerate(fr):
            im.paste(p, (c * W, r * H), p)
    im.save(f'{out}/{name}.png')
    bb = f[1].getbbox()
    return {'w': W, 'h': H, 'perRow': PER_ROW, 'rows': ROWS, 'counts': {n: len(r) for n, r in zip(ROWS, rows)}, 'figure': bb[3] - bb[1], 'facesRight': True, 'lies': True}

layout = json.load(open(f'{out}/sheets.json'))
layout['wolf_grey'] = build(1, 'wolf_grey')
layout['wolf_black'] = build(2, 'wolf_black')
json.dump(layout, open(f'{out}/sheets.json', 'w'), indent=1)
print({k: layout[k] for k in ('wolf_grey', 'wolf_black')})
