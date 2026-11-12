"""ULT-AUDIT (docs/notes/ult-audit.md): each hero's ultimate at an older version over the same ultimate now, moment for moment.

    python3 tools/blender-fx/ult_compare.py <old frames> <new frames> <out prefix> <old's name> <heroes a sheet> <pick,pick,...>

Reads the pictures `ult-shots.mjs` took of each build (<pick>-393-<n>-<stage>.png) and writes <out prefix>-<k>.jpg: for each hero a row
of the older version's eight moments and under it the same eight now.
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw

old, new, prefix, name, per = Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3], sys.argv[4], int(sys.argv[5])
picks = sys.argv[6].split(',')
K = 0.5


def row(src, pick, label):
    frames = sorted(src.glob(f'{pick}-393-*.png'), key=lambda f: int(f.stem.split('-')[2]))
    if not frames:
        return None
    first = Image.open(frames[0])
    top, bottom = round(first.height * 0.2), round(first.height * 0.7)
    w, h = int(first.width * K), int((bottom - top) * K)
    out = Image.new('RGB', (8 * (w + 3) + 3, h + 15), (18, 18, 24))
    d = ImageDraw.Draw(out)
    for c, f in enumerate(frames[:8]):
        out.paste(Image.open(f).convert('RGB').crop((0, top, first.width, bottom)).resize((w, h), Image.Resampling.LANCZOS), (3 + c * (w + 3), 15))
        d.text((6 + c * (w + 3), 2), f'{pick}, {label}: {f.stem.split("-")[3]}' if c == 0 else f.stem.split('-')[3], fill=(255, 235, 170))
    return out


for page in range(0, len(picks), per):
    rows = [r for pick in picks[page:page + per] for r in (row(old, pick, name), row(new, pick, 'now')) if r]
    if not rows:
        continue
    sheet = Image.new('RGB', (max(r.width for r in rows), sum(r.height for r in rows)), (18, 18, 24))
    y = 0
    for r in rows:
        sheet.paste(r, (0, y))
        y += r.height
    out = f'{prefix}-{page // per + 1}.jpg'
    sheet.save(out, quality=72, optimize=True)
    print(out, sheet.size)
