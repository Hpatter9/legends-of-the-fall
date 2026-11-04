"""Pack the retained image-tool paintings; requires Pillow. No procedural art.

Run this file to reproduce the 256 px sheets, icons and structural checks.
"""
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw

ROOT = Path(__file__).resolve().parent
CELL, MARGIN = 256, 21
KEYS = ['wallOfFire', 'iceWall', 'shatter', 'gale', 'thunderclap',
        'thornSnare', 'charm', 'foresight', 'sunbeam', 'venomFang',
        'mirage', 'drainLife', 'boneWall', 'raiseDead']
WALLS = {'wallOfFire', 'iceWall', 'boneWall'}


def frame_alpha(frame):
    # Generated low-alpha white matte is removed without changing painted RGB.
    alpha = frame.getchannel('A').point(lambda a: round(max(0, a - 100) * 255 / 155))
    w, h = frame.size
    # Feather the crop's edges so glow cannot leave a rectangular seam.
    xs = [min(1, x / (w * .09), (w - 1 - x) / (w * .09)) for x in range(w)]
    ys = [min(1, y / (h * .09), (h - 1 - y) / (h * .09)) for y in range(h)]
    mask = Image.new('L', (w, h))
    mask.putdata([round(255 * max(0, min(x, y))) for y in ys for x in xs])
    alpha = ImageChops.multiply(alpha, mask)
    if alpha.getbbox() is None:
        alpha = ImageChops.multiply(frame.getchannel('A'), mask)
    frame.putalpha(alpha)
    return frame


def pack():
    layout = {}
    for key in KEYS:
        wall = key in WALLS
        source = Image.open(ROOT / 'originals' / f'{key}.png').convert('RGBA')
        rows = [('cast', 8, 'once'), ('impact', 8, 'once')]
        if wall:
            rows.append(('stand', 6, 'loop'))
        result = Image.new('RGBA', (8 * CELL, len(rows) * CELL))
        layout[key] = []
        for r, (part, count, kind) in enumerate(rows):
            cuts = [[round(c * source.width / 8), round(r * source.height / len(rows)),
                     round((c + 1) * source.width / 8), round((r + 1) * source.height / len(rows))]
                    for c in range(count)]
            frames = [frame_alpha(source.crop(box)) for box in cuts]
            scale = min((CELL - 2 * MARGIN) / max(f.width for f in frames),
                        (CELL - 2 * MARGIN) / max(f.height for f in frames))
            for c, frame in enumerate(frames):
                # Shared row scale keeps the painted growth and decay intact.
                frame = frame.resize((round(frame.width * scale), round(frame.height * scale)),
                                     Image.Resampling.LANCZOS)
                if kind == 'once':
                    # Complete the painted dissolution with a smooth opacity tail.
                    opacity = [1, 1, 1, 1, .85, .55, .25, .06][c]
                    frame.putalpha(frame.getchannel('A').point(lambda a: round(a * opacity)))
                x = c * CELL + (CELL - frame.width) // 2
                y = r * CELL + ((CELL - MARGIN - frame.height) if wall else (CELL - frame.height) // 2)
                result.paste(frame, (x, y))
            layout[key].append({'part': part, 'kind': kind, 'frames': count, 'cuts': cuts})
        result.save(ROOT / f'{key}.png', optimize=True)

    icons = Image.open(ROOT / 'originals/icons.png').convert('RGBA')
    for i, key in enumerate(KEYS):
        c, r = i % 4, i // 4
        frame = icons.crop((round(c * icons.width / 4), round(r * icons.height / 4),
                            round((c + 1) * icons.width / 4), round((r + 1) * icons.height / 4)))
        frame = frame.resize((214, 214), Image.Resampling.LANCZOS)
        result = Image.new('RGBA', (CELL, CELL))
        result.paste(frame, (MARGIN, MARGIN))
        result.save(ROOT / 'icons' / f'{key}.png', optimize=True)
    (ROOT / 'layout.json').write_text(json.dumps(layout, indent=2) + '\n')
    validate(layout)
    preview()


def validate(layout):
    checks = {}
    for key, rows in layout.items():
        im = Image.open(ROOT / f'{key}.png').convert('RGBA')
        assert im.size == (2048, CELL * len(rows)), key
        details = []
        for r, row in enumerate(rows):
            masses = []
            for c in range(8):
                a = im.crop((c * CELL, r * CELL, (c + 1) * CELL, (r + 1) * CELL)).getchannel('A')
                if c >= row['frames']:
                    assert a.getbbox() is None, (key, r, c)
                    continue
                box = a.getbbox()
                assert box and min(box[:2]) >= MARGIN and max(box[2:]) <= CELL - MARGIN, (key, r, c, box)
                assert all(a.getpixel(p) == 0 for p in [(0, 0), (255, 0), (0, 255), (255, 255)])
                masses.append(sum(a.tobytes()))
            if row['kind'] == 'once':
                assert 0 < masses[-1] < max(masses) * .1, (key, row['part'])
            else:
                assert min(masses) > max(masses) * .45, (key, row['part'])
            details.append({'part': row['part'], 'kind': row['kind'], 'frames': len(masses),
                            'alpha_mass': masses, 'clear_margin_px': MARGIN})
        icon = Image.open(ROOT / 'icons' / f'{key}.png')
        assert icon.size == (256, 256) and icon.mode == 'RGBA'
        assert all(icon.getpixel(p)[3] == 0 for p in [(0, 0), (255, 0), (0, 255), (255, 255)])
        checks[key] = {'size': list(im.size), 'rows': details, 'icon': '256x256 RGBA; transparent corners',
                       'sha256': hashlib.sha256((ROOT / f'{key}.png').read_bytes()).hexdigest()}
    (ROOT / 'checks.json').write_text(json.dumps(checks, indent=2) + '\n')
    print('PASS: 14 sheets, 14 icons, 242 frames; geometry, margins, corners, row counts and faint tails')


def preview():
    out = Image.new('RGB', (1120, 4 * 240), '#252936')
    draw = ImageDraw.Draw(out)
    for i, key in enumerate(KEYS):
        x, y = (i % 4) * 280, (i // 4) * 240
        icon = Image.open(ROOT / 'icons' / f'{key}.png').resize((96, 96))
        sheet = Image.open(ROOT / f'{key}.png')
        peak = sheet.crop((768, 0, 1024, 256)).resize((144, 144))
        out.paste(icon, (x + 8, y + 55), icon)
        out.paste(peak, (x + 120, y + 30), peak)
        draw.text((x + 12, y + 196), key, fill='white')
    out.save(ROOT / 'preview.jpg', quality=90)


if __name__ == '__main__':
    pack()
