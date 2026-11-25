"""A board of icons.py's candidates, one row per icon, each candidate numbered by its place (PIXELLAB-ART's pick).

  python3 tools/pixellab/candidates.py <out.png> <id> [<id> ...]
"""
import glob, os, sys
from PIL import Image, ImageDraw

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
out, ids = sys.argv[1], sys.argv[2:]
rows = []
for i in ids:
    fs = sorted(glob.glob(os.path.join(ROOT, 'art-source/pixellab/icons', i, 'cand*.png')))
    rows.append((i, [Image.open(f).convert('RGBA').resize((128, 128), Image.NEAREST) for f in fs]))
c = Image.new('RGBA', (140 + 4 * 136, 136 * len(rows)), (74, 78, 90, 255))
d = ImageDraw.Draw(c)
for r, (i, ims) in enumerate(rows):
    d.text((4, r * 136 + 60), i, fill=(255, 255, 255, 255))
    for k, im in enumerate(ims[:4]):
        c.paste(im, (140 + k * 136, r * 136 + 4), im)
c.save(out)
