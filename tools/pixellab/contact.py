"""A contact sheet of a reskinned battle sheet beside its source, row by row (PIXELLAB-ART's check).

  python3 tools/pixellab/contact.py <new sheet> <match sheet> <out.png> [scale]
"""
import json, os, sys
from PIL import Image, ImageDraw

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
SHEETS = json.load(open(os.path.join(ROOT, 'src/art/units/sheets.json')))


def strip(name, lay, sc):
    sh = Image.open(os.path.join(ROOT, 'src/art/units', name + '.png')).convert('RGBA')
    w, h, per = lay['w'], lay['h'], lay['perRow']
    rows = []
    for r, row in enumerate(lay['rows']):
        n = lay['counts'][row]
        if not n: continue
        s = Image.new('RGBA', (w * n, h), (0, 0, 0, 0))
        for i in range(n):
            k = i % per; rr = r + i // per
            s.paste(sh.crop((k * w, rr * h, k * w + w, rr * h + h)), (i * w, 0))
        rows.append(s.resize((s.width * sc, s.height * sc), Image.NEAREST))
    return rows


def main(new, match, out, sc=2):
    a = strip(new, SHEETS.get(new) or SHEETS[match], sc); b = strip(match, SHEETS[match], sc)
    W = max(max(x.width for x in a), max(x.width for x in b)); H = sum(x.height for x in a) + sum(x.height for x in b)
    c = Image.new('RGBA', (W, H + 8 * len(a)), (74, 78, 90, 255))
    y = 0
    for x, z in zip(b, a):
        c.paste(x, (0, y), x); y += x.height
        c.paste(z, (0, y), z); y += z.height
        ImageDraw.Draw(c).line((0, y + 3, W, y + 3), fill=(30, 30, 30, 255), width=2); y += 8
    c.save(out)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]) if len(sys.argv) > 4 else 2)
