#!/usr/bin/env python3
"""Side-by-side review sheets of the Knight (docs/notes/knight-sprite.md): the old plain sheet, the new plain sheet and the
awakened sheet, every row, front and back, at twice size -> docs/samples/knight-sprite-front.png and -back.png.

  python3 tools/knight/contact.py [old-ref]   # old-ref: the commit holding the old sheets (5adfdaa, main before this change)
"""
import io, os, subprocess, sys
from PIL import Image, ImageDraw

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..'))
REF = sys.argv[1] if len(sys.argv) > 1 else '5adfdaa'
ROWS = ['idle', 'walk 1-4', 'walk 5-8', 'attack', 'hurt', 'dead', 'defend / ability']
CW, CH, S = 152, 116, 2


def old_sheet(path):
    return Image.open(io.BytesIO(subprocess.check_output(['git', 'show', f'{REF}:{path}'], cwd=ROOT))).convert('RGBA')


for side, base, awake in [('front', 'hero_soldier_deep', 'awakened_knight'), ('back', 'hero_soldier_back_deep', 'awakened_knight_back')]:
    old = old_sheet(f'src/art/units/{base}.png')
    new = Image.open(os.path.join(ROOT, 'src/art/units', base + '.png')).convert('RGBA')
    up = Image.open(os.path.join(ROOT, 'src/art/awakened', awake + '.png')).convert('RGBA')
    colw = 4 * CW * S
    out = Image.new('RGBA', (3 * colw + 80, 7 * CH * S + 60), (74, 92, 74, 255))
    d = ImageDraw.Draw(out)
    for i, t in enumerate(['before (the old plain sheet)', 'now (the plain sheet)', 'awakened']):
        d.text((20 + i * (colw + 20) + 4, 10), t, fill=(255, 255, 255, 255))
    for r in range(7):
        d.text((2, 50 + r * CH * S), ROWS[r][:6], fill=(230, 230, 230, 255))
        for c in range(4):
            # (the old cells are 184 x 113, the figure the same 96 tall with its feet on the bottom: set in a 152 x 116 slot)
            slot = Image.new('RGBA', (CW, CH))
            slot.paste(old.crop((c * 184 + 16, r * 113, c * 184 + 168, r * 113 + 113)), (0, 3))
            for i, img in enumerate([slot, new.crop((c * CW, r * CH, c * CW + CW, r * CH + CH)), up.crop((c * CW, r * CH, c * CW + CW, r * CH + CH))]):
                out.alpha_composite(img.resize((CW * S, CH * S), Image.NEAREST), (20 + i * (colw + 20) + c * CW * S, 40 + r * CH * S))
    out.convert('RGB').save(os.path.join(ROOT, f'docs/samples/knight-sprite-{side}.png'))
    print('wrote', f'docs/samples/knight-sprite-{side}.png')
