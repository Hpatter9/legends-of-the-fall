"""Join the pictures `ult-shots.mjs` took into sheets: each hero a row of its moments (the stage named over each), cut to
the board, several heroes to a sheet.

    python3 tools/blender-fx/ult_sheet.py <frames folder> <out prefix> <width> [<heroes a sheet> = 14] [<scale> = 0.6]

Reads <pick>-<width>-<n>-<stage>.png and writes <out prefix>-<k>.jpg.
"""
import sys
from collections import defaultdict
from pathlib import Path

from PIL import Image, ImageDraw

src, prefix, width = Path(sys.argv[1]), sys.argv[2], sys.argv[3]
per = int(sys.argv[4]) if len(sys.argv) > 4 else 14
k = float(sys.argv[5]) if len(sys.argv) > 5 else 0.6
sets = defaultdict(list)
for f in sorted(src.glob(f'*-{width}-*.png')):
    pick, w, n, stage = f.stem.split('-')
    sets[pick].append((int(n), stage, f))
picks = list(sets)
for page in range(0, len(picks), per):
    rows = []
    for pick in picks[page:page + per]:
        frames = sorted(sets[pick])
        first = Image.open(frames[0][2])
        # (the board's part of the screen: under the top bar, over the heroes' cards)
        top, bottom = round(first.height * 0.2), round(first.height * 0.7)
        w, h = int(first.width * k), int((bottom - top) * k)
        row = Image.new('RGB', (len(frames) * (w + 3) + 3, h + 16), (18, 18, 24))
        d = ImageDraw.Draw(row)
        for c, (n, stage, f) in enumerate(frames):
            im = Image.open(f).convert('RGB').crop((0, top, first.width, bottom)).resize((w, h), Image.Resampling.LANCZOS)
            row.paste(im, (3 + c * (w + 3), 16))
            d.text((6 + c * (w + 3), 2), f'{pick}: {stage}' if c == 0 else stage, fill=(255, 235, 170))
        rows.append(row)
    sheet = Image.new('RGB', (max(r.width for r in rows), sum(r.height for r in rows)), (18, 18, 24))
    y = 0
    for r in rows:
        sheet.paste(r, (0, y))
        y += r.height
    out = f'{prefix}-{page // per + 1}.jpg'
    sheet.save(out, quality=72, optimize=True)
    print(out, sheet.size, len(rows), 'heroes')
