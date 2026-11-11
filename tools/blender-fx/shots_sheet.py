"""Join the pictures `shots.mjs` took into one sheet: each spell's moments side by side, cut to the board.

    python3 tools/blender-fx/shots_sheet.py <shots dir> <out.png> <size> [<cols>]

`size` is the screen the pictures were taken at (393x852). With STRIP pictures (`<id>-<size>-<n>.png`) each spell is
a row of its moments; otherwise each spell is one picture and the sheet is a grid.
"""
import os
import re
import sys

from PIL import Image, ImageDraw

ORDER = ['heal', 'meteor', 'haste', 'shield', 'smite', 'chain', 'poison', 'frost', 'rally', 'quake', 'resurrect', 'cleanse', 'blink', 'hex', 'lance', 'renewal',
         'deepfreeze', 'warcry', 'bulwark', 'wolves', 'starfall', 'firewall', 'icewall', 'shatter', 'gale', 'thunderclap', 'snare', 'charm', 'foresight', 'sunbeam',
         'venom', 'mirage', 'drain', 'bonewall', 'raisedead']


def main(src, out, size, cols=5):
    w, h = (int(v) for v in size.split('x'))
    # (the middle of the board's part of the screen, where the camera put the spell's tile)
    top, bottom = round(h * 0.35), round(h * 0.35) + 250
    crop = ((w - 300) // 2, top, (w + 300) // 2, bottom)
    cw, ch = 300, bottom - top
    strips = sorted(f for f in os.listdir(src) if re.fullmatch(rf'\w+-{size}-\d+\.png', f))
    cells = []
    if strips:
        n = 1 + max(int(f.rsplit('-', 1)[1][:-4]) for f in strips)
        for sid in ORDER:
            fs = [os.path.join(src, f'{sid}-{size}-{i}.png') for i in range(n)]
            if not all(os.path.exists(f) for f in fs):
                continue
            row = Image.new('RGB', (cw * n, ch))
            for i, f in enumerate(fs):
                row.paste(Image.open(f).convert('RGB').crop(crop), (i * cw, 0))
            cells.append((sid, row))
        cols = int(cols) if len(sys.argv) > 4 else 2
    else:
        for sid in ORDER:
            f = os.path.join(src, f'{sid}-{size}.png')
            if os.path.exists(f):
                cells.append((sid, Image.open(f).convert('RGB').crop(crop)))
        cols = int(cols)
    if not cells:
        raise SystemExit('no pictures')
    cellw, cellh = cells[0][1].size
    rows = -(-len(cells) // cols)
    sheet = Image.new('RGB', (cols * cellw + (cols - 1) * 4, rows * (cellh + 18)), (16, 18, 22))
    d = ImageDraw.Draw(sheet)
    for i, (sid, im) in enumerate(cells):
        x, y = (i % cols) * (cellw + 4), (i // cols) * (cellh + 18)
        d.text((x + 4, y + 3), sid, fill=(255, 235, 170))
        sheet.paste(im, (x, y + 18))
    # (a JPEG for a sheet of photographs of the game: a PNG of this is several megabytes)
    sheet.save(out, quality=70, optimize=True) if out.endswith('.jpg') else sheet.save(out)
    print(out, sheet.size, len(cells), 'spells')


if __name__ == '__main__':
    main(*sys.argv[1:5])
