# Builds Duchess's fighting sheet (`src/art/units/duchess_goat.png`) for the rare fight she joins (docs/notes/duchess-fights.md).
# Her walk and idle are the white goat of whtdragon's MV animals pack (`animals/goats.png`: 8 goats of 3 frames by 4 facings, 48px a
# cell; the right-facing row, the same goat as `src/art/duchess/goat.png`). Her headbutt and her fall were generated with PixelLab from
# her own standing frame (`tools/duchess/gen.py`, frames in `tools/duchess/generated/`): the attack row is the second take (`attack2`,
# seed 11: head down, the lunge, the butt), the dead row the last three frames of the fall. PixelLab's hurt take drew a lightning flash
# over her head, so her hurt is the pack's standing frame brightened and knocked back, as the wolves' is.
# Every frame sits on a 64-pixel canvas the way gen.py placed her first frame, so the pack's and PixelLab's frames line up; the sheet
# is then scaled up 2x (whole pixels).
# Usage: python3 tools/duchess/compose-duchess.py ../chronos-assets/whtdragons_MVanimals_ALL_4-1-2025/animals/goats.png src/art/units
import json, sys, glob
from PIL import Image, ImageEnhance

src, out = sys.argv[1], sys.argv[2]
sheet = Image.open(src).convert('RGBA')
GEN = 'tools/duchess/generated/'
CELL, CANVAS, UP = 48, 64, 2
W = H = CANVAS * UP
PER_ROW = 4
ROWS = ['walk', 'attack', 'idle', 'hurt', 'dead']

def cell(i):
    return sheet.crop((i * CELL, 2 * CELL, (i + 1) * CELL, 3 * CELL))  # the white goat, row 2 faces right

# (where gen.py put her standing frame on its canvas: every pack frame is placed by the same offset)
stand = cell(1)
bb = stand.getbbox()
f = stand.crop(bb)
OX, OY = (CANVAS - f.width) // 2 - 6 - bb[0], CANVAS - f.height - 2 - bb[1]

def placed(i):
    c = Image.new('RGBA', (CANVAS, CANVAS))
    c.paste(cell(i), (OX, OY), cell(i))
    return c

def shifted(im, dx, dy=0):
    r = Image.new('RGBA', im.size)
    r.paste(im, (dx, dy), im)
    return r

def hard(im):
    # (hard alpha, as the other PixelLab art: a pixel is there or it is not)
    a = im.getchannel('A').point(lambda v: 255 if v >= 128 else 0)
    im = im.copy()
    im.putalpha(a)
    return im

def gen(row, seed, picks):
    fs = sorted(glob.glob(GEN + '%s_s%d_*.png' % (row, seed)), key=lambda p: int(p.rsplit('_', 1)[1].split('.')[0]))
    return [hard(Image.open(fs[i]).convert('RGBA')) for i in picks]

p = [placed(i) for i in range(3)]
walk = [p[0], p[1], p[2], p[1]]
attack = gen('attack2', 11, [1, 2, 3, 4])
idle = [p[1], shifted(p[1], 0, 1)]
hurt = [ImageEnhance.Brightness(shifted(p[1], -4)).enhance(1.5)]
dead = gen('dead', 7, [2, 3, 4])
rows = [walk, attack, idle, hurt, dead]
im = Image.new('RGBA', (CANVAS * PER_ROW, CANVAS * len(rows)))
for r, fr in enumerate(rows):
    for c, q in enumerate(fr):
        im.paste(q, (c * CANVAS, r * CANVAS), q)
im = im.resize((im.width * UP, im.height * UP), Image.NEAREST)
im.save(f'{out}/duchess_goat.png')
layout = json.load(open(f'{out}/sheets.json'))
layout['duchess_goat'] = {'w': W, 'h': H, 'perRow': PER_ROW, 'rows': ROWS, 'counts': {n: len(r) for n, r in zip(ROWS, rows)}, 'figure': f.height * UP, 'facesRight': True, 'lies': True}
json.dump(layout, open(f'{out}/sheets.json', 'w'), indent=1)
print(layout['duchess_goat'])
