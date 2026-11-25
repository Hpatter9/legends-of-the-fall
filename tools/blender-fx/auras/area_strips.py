"""AURAS-BLENDER: the area auras' before and after strips, from the photographs `AREA=1` on ult-shots.mjs leaves.

    python3 tools/blender-fx/auras/area_strips.py <before dir> <after dir> <out dir>

For each of the eleven auras: the old one at two moments, then the new one at the same two. One strip an aura
(`area-<aura>.jpg`), and two sheets of them all (`area-all-1.jpg`, `area-all-2.jpg`).
"""
import os, sys
from PIL import Image, ImageDraw

AURAS = ['aura-protection', 'spirit-guardians', 'aura-rot', 'storm-cloud', 'mana-font', 'healing-mist', 'cloud-of-daggers', 'slow-field', 'spike-growth', 'bardic-notes', 'circle-of-death']
before, after, out = sys.argv[1:4]
os.makedirs(out, exist_ok=True)
rows = []
for k in AURAS:
    cells = []
    for d, label in ((before, 'before'), (after, 'after')):
        for n in (0, 1):
            im = Image.open(os.path.join(d, f'area-{k}-{n}.png')).convert('RGB')
            if n == 0:
                ImageDraw.Draw(im).text((6, 6), f'{k} {label}', fill=(255, 255, 120))
            cells.append(im)
    w, h = cells[0].size
    row = Image.new('RGB', (w * 4, h))
    for i, c in enumerate(cells):
        row.paste(c, (i * w, 0))
    row.save(os.path.join(out, f'area-{k}.jpg'), quality=88)
    rows.append(row)
for n, part in enumerate((rows[:6], rows[6:])):
    w, h = part[0].size
    sheet = Image.new('RGB', (w, h * len(part)))
    for i, r in enumerate(part):
        sheet.paste(r, (0, i * h))
    sheet.save(os.path.join(out, f'area-all-{n + 1}.jpg'), quality=85)
    print(sheet.size)
