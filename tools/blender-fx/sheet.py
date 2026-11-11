"""A contact sheet of effects, for looking at: each effect a row of its frames on a dark board-like ground.

    python3 sheet.py <raw dir> <out.png> <id> [<id> ...]      (COLS=8 picks how many frames a row shows)
"""
import os
import sys

from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from effects import EFFECTS
from pixelate import GLOW_SHRINK, pixelate


def sheet(raw, out, ids, cols=8, zoom=2):
    rows = []
    for key in ids:
        spec = EFFECTS[key]
        frames, glows, n = pixelate(raw, spec)
        pick = [round(i * (len(frames) - 1) / (cols - 1)) for i in range(cols)]
        h, w = frames[0].shape[:2]
        row = Image.new('RGBA', (w * cols, h + 12), (38, 44, 52, 255))
        d = ImageDraw.Draw(row)
        for j, i in enumerate(pick):
            # (a tile under it, where the effect stands)
            cx, cy = j * w + w // 2, 12 + round(spec['oy'] * h)
            d.polygon([(cx - 22, cy), (cx, cy - 11), (cx + 22, cy), (cx, cy + 11)], fill=(70, 80, 70, 255))
            if glows:
                g = glows[i].resize((w, h), Image.Resampling.BILINEAR)
                row.alpha_composite(g, (j * w, 12))
            row.alpha_composite(Image.fromarray(frames[i], 'RGBA'), (j * w, 12))
        d.text((2, 0), f'{key}  {spec.get("scene", "staged")} / {spec["element"]}  {w}x{h}  {n} colours', fill=(255, 255, 255, 255))
        rows.append(row)
    W = max(r.width for r in rows)
    im = Image.new('RGBA', (W, sum(r.height for r in rows)), (20, 22, 26, 255))
    y = 0
    for r in rows:
        im.paste(r, (0, y))
        y += r.height
    im = im.resize((im.width * zoom, im.height * zoom), Image.Resampling.NEAREST)
    # (cut to a palette: a sheet is for looking at, and this keeps it small in the repo)
    im.convert('RGB').quantize(160, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(out, optimize=True)


if __name__ == '__main__':
    sheet(sys.argv[1], sys.argv[2], sys.argv[3:], int(os.environ.get('COLS', 8)), int(os.environ.get('ZOOM', 2)))
