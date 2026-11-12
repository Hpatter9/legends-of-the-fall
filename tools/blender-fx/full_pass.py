"""ULT-AUDIT (docs/notes/ult-audit.md): a few heroes' ultimates at full size, to judge whether each reads as its ability.

    python3 tools/blender-fx/full_pass.py <frames> <out.jpg> <pick,pick,...>

Four moments of each (the wind-up at its height, the strike late, the aftermath early and in its middle), cut to the board, unscaled.
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw

src, out, picks = Path(sys.argv[1]), sys.argv[2], sys.argv[3].split(',')
WANT = (2, 4, 5, 6)
rows = []
for pick in picks:
    fs = {int(f.stem.split('-')[2]): f for f in src.glob(f'{pick}-393-*.png')}
    if not all(n in fs for n in WANT):
        continue
    row = Image.new('RGB', (393 * len(WANT), 384), (18, 18, 24))
    d = ImageDraw.Draw(row)
    for i, n in enumerate(WANT):
        row.paste(Image.open(fs[n]).convert('RGB').crop((0, 230, 393, 600)), (i * 393, 14))
        d.text((i * 393 + 4, 1), f'{pick}: {fs[n].stem.split("-")[3]}' if i == 0 else fs[n].stem.split('-')[3], fill=(255, 235, 170))
    rows.append(row)
sheet = Image.new('RGB', (393 * len(WANT), sum(r.height for r in rows)), (18, 18, 24))
y = 0
for r in rows:
    sheet.paste(r, (0, y))
    y += r.height
sheet.save(out, quality=78)
print(out, sheet.size, len(rows), 'heroes')
