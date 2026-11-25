"""Every frame of a sheet, each row on its own line, at 2x on a mid grey: the view for checking that gear, weapon, colours and size hold
frame to frame (PIXELLAB-ART's audit). Frames are cropped to the sheet's drawn band so the rows sit close.

  python3 tools/pixellab/rows.py <sheet> <out.png>
"""
import json, os, sys
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
SHEETS = json.load(open(os.path.join(ROOT, 'src/art/units/sheets.json')))
name, out = sys.argv[1], sys.argv[2]
L = SHEETS[name]; sh = Image.open(os.path.join(ROOT, 'src/art/units', name + '.png')).convert('RGBA')
w, h, per = L['w'], L['h'], L['perRow']
rows = []
for r, row in enumerate(L['rows']):
    fr = [sh.crop(((i % per) * w, (r + i // per) * h, (i % per + 1) * w, (r + i // per + 1) * h)) for i in range(L['counts'][row])]
    if fr: rows.append(fr)
n = max(len(x) for x in rows)
c = Image.new('RGBA', (n * w * 2, len(rows) * h * 2), (92, 96, 108, 255))
for y, fr in enumerate(rows):
    for x, f in enumerate(fr):
        f2 = f.resize((w * 2, h * 2), Image.NEAREST); c.paste(f2, (x * w * 2, y * h * 2), f2)
if c.width > 2400: c = c.resize((2400, round(c.height * 2400 / c.width)), Image.NEAREST)
c.save(out)
