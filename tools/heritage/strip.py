#!/usr/bin/env python3
"""Before/after strips of the re-toned heroes (docs/samples/heritage-*.png): for each hero, its idle, attack and
hurt frames as drawn and as re-toned, front and back, at twice size.

  python3 tools/heritage/strip.py docs/samples
"""
import json, os, sys
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(__file__))
from recolour import LAYOUT, UNITS, CONFIG, read_table, frame_origin

def first(l, row):
    k = 0
    for r in l['rows']:
        if r == row:
            return k
        k += l['counts'].get(r, 0)
    return 0

def cell(sheet, k, path):
    l = LAYOUT[sheet]
    fx, fy = frame_origin(l, k)
    return Image.open(path).convert('RGBA').crop((fx, fy, fx + l['w'], fy + l['h']))

def main():
    out = sys.argv[1] if len(sys.argv) > 1 else 'docs/samples'
    _, _, looks = read_table()
    tiles = []
    for hero, cfg in CONFIG.items():
        tone = looks[hero][0]
        row = []
        for sheet in cfg['sheets']:
            l = LAYOUT[sheet]
            for anim in (['idle', 'attack', 'hurt'] if not sheet.endswith('_back') else ['idle']):
                k = first(l, anim)
                a = cell(sheet, k, os.path.join(UNITS, sheet + '.png'))
                b = cell(sheet, k, os.path.join(UNITS, f'{sheet}_{tone}.png'))
                for im in (a, b):
                    bb = a.getbbox() or (0, 0, l['w'], l['h'])
                    c = im.crop(bb)
                    row.append(c.resize((c.width * 2, c.height * 2), Image.NEAREST))
        tiles.append((hero, tone, looks[hero][1], row))
    # (one strip per hero, then all the heroes' idle pairs in one picture)
    os.makedirs(out, exist_ok=True)
    for hero, tone, hair, row in tiles:
        w = sum(t.width + 8 for t in row) + 8
        h = max(t.height for t in row) + 30
        im = Image.new('RGBA', (w, h), (40, 42, 54, 255))
        d = ImageDraw.Draw(im)
        d.text((8, 6), f'{hero}: as drawn / {tone}' + (f', {hair} hair' if hair else '') + ' (front idle, attack, hurt; back)', fill=(240, 230, 200, 255))
        x = 8
        for t in row:
            im.alpha_composite(t, (x, h - t.height - 4))
            x += t.width + 8
        im.save(os.path.join(out, f'heritage-{hero}.png'))
    pairs = [(hero, row[0], row[1]) for hero, _, _, row in tiles]
    cw = max(a.width + b.width for _, a, b in pairs) + 24
    ch = max(max(a.height, b.height) for _, a, b in pairs) + 22
    cols = 4
    im = Image.new('RGBA', (cw * cols, ch * ((len(pairs) + cols - 1) // cols)), (40, 42, 54, 255))
    d = ImageDraw.Draw(im)
    for i, (hero, a, b) in enumerate(pairs):
        x, y = (i % cols) * cw, (i // cols) * ch
        d.text((x + 6, y + 4), hero, fill=(240, 230, 200, 255))
        im.alpha_composite(a, (x + 6, y + ch - a.height - 2))
        im.alpha_composite(b, (x + 12 + a.width, y + ch - b.height - 2))
    im.save(os.path.join(out, 'heritage-before-after.png'))

if __name__ == '__main__':
    main()
