#!/usr/bin/env python3
"""PAINTED-BUTTONS: cut the owner's nine button sheets (art-source/ui/buttons/, PR #468) into the small files the game draws.

    python3 tools/painted-buttons/cut.py

Medallion sheets (1024 x 1024, 4 x 4 cells of 256): each cell is trimmed to its paint, squared and shrunk to 96 px (glyphs to 48 px).
Plate sheets (1536 x 1024, 3 x 4 cells of 512 x 256): each row is cropped to the union of its three cells' paint (so a button's normal,
pressed and disabled plates share their slice lines), then halved; the nine-slice margins from the prompts are halved with it and written,
less the crop, to src/paintedButtonsSlices.css as border-image rules. The switch (row 4 of plates-frames) is a whole piece, not sliced.

Everything is WebP (alpha kept) in src/art/ui/buttons/, which build.mjs serves as ui/buttons/<name>.webp and the service worker caches.
Prints the total bytes written.
"""
import os
import sys
from PIL import Image
import numpy as np

SRC = 'art-source/ui/buttons'
OUT = 'src/art/ui/buttons'
CSS = 'src/paintedButtonsSlices.css'

# The cells of each medallion sheet, left to right, top to bottom (PR #468's body; camp and fight read off the sheets themselves).
SHEETS = {
    'top-bar': ['settings', 'achievements', 'spring', 'summer', 'autumn', 'winter', 'crowns', 'stones', 'gold', 'sound-on', 'sound-off',
                'speed-1', 'speed-2', 'speed-3', 'lives', 'clock'],
    'tabs': ['tab-recruit', 'tab-heroes', 'tab-battle', 'tab-castle', 'tab-spells', 'tab-recruit-lit', 'tab-heroes-lit', 'tab-battle-lit',
             'tab-castle-lit', 'tab-spells-lit', 'badge-new', 'badge-quest', 'badge-shop', 'lock', 'badge-count', 'ready-ring'],
    'camp': ['daily', 'assault', 'council', 'march-orders', 'tavern', 'spells', 'march', 'trophies', 'continue', 'choose-battle', 'quest',
             'armies', 'coin', 'sword', 'heart', 'home'],
    'fight': ['autocast', 'autocast-lit', 'form-wall', 'form-wedge', 'form-square', 'form-spread', 'horn', 'horn-lit', 'orb-gold', 'orb-bronze',
              'orb-lit', 'orb-silver', 'ultimate', 'mana', 'formations', 'stop'],
    'actions': ['hire', 'satchel', 'auto-place', 'fight', 'auto-merge', 'auto-pick', 'march-battle', 'next-stage', 'leave', 'reveal-all',
                'return', 'retain', 'recycle', 'pull-1', 'pull-10', 'skip'],
    'tavern': ['all-heroes', 'gwen', 'upgrades', 'quests', 'hester', 'elders', 'quest-board', 'tav-trophies', 'stall-books', 'stall-gear',
               'stall-tomes', 'stall-chests', 'stall-sell', 'stall-repair', 'stall-enchant', 'stall-caravan'],
    'glyphs': ['g-back', 'g-close', 'g-right', 'g-plus', 'g-minus', 'g-lock', 'g-star', 'g-star-empty', 'g-tick', 'g-cross', 'g-info',
               'g-search', 'g-up', 'g-down', 'g-alert', 'g-help'],
}
# The plates: (sheet, row, names, (left, top, right, bottom) slice margins in the 512 x 256 cell, or None for a whole piece).
PLATES = [
    ('plates-buttons', 0, ['plate-primary', 'plate-primary-down', 'plate-primary-off'], (72, 64, 72, 64)),
    ('plates-buttons', 1, ['plate-secondary', 'plate-secondary-down', 'plate-secondary-off'], (72, 64, 72, 64)),
    ('plates-buttons', 2, ['plate-danger', 'plate-danger-down', 'plate-danger-off'], (72, 64, 72, 64)),
    ('plates-buttons', 3, ['plate-choice', 'plate-choice-on', 'plate-choice-locked'], (72, 64, 72, 64)),
    ('plates-frames', 0, ['chip', 'chip-lit', 'chip-warn'], (64, 56, 64, 56)),
    ('plates-frames', 1, ['tabplate', 'tabplate-lit', 'tabplate-down'], (56, 64, 56, 40)),
    ('plates-frames', 2, ['plaque', 'plaque-ready', 'plaque-locked'], (72, 64, 72, 64)),
    ('plates-frames', 3, ['switch-off', 'switch-on', 'switch-off-dim'], None),
]
MEDAL = 96
GLYPH = 48
SWITCH_W = 120


def clean(a: np.ndarray) -> np.ndarray:
    """Clear the colour under fully clear pixels (keeps WebP small and stops fringes on scaling)."""
    a = a.copy()
    a[a[..., 3] == 0, :3] = 0
    return a


def bbox(alpha: np.ndarray, floor: int = 8):
    ys, xs = np.where(alpha > floor)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def save(im: Image.Image, name: str) -> int:
    p = f'{OUT}/{name}.webp'
    im.save(p, 'WEBP', quality=86, method=6)
    return os.path.getsize(p)


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    total = 0
    count = 0
    for sheet, names in SHEETS.items():
        a = clean(np.array(Image.open(f'{SRC}/{sheet}.png').convert('RGBA')))
        size = GLYPH if sheet == 'glyphs' else MEDAL
        for i, name in enumerate(names):
            y, x = divmod(i, 4)
            cell = a[y * 256:(y + 1) * 256, x * 256:(x + 1) * 256]
            x0, y0, x1, y1 = bbox(cell[..., 3])
            # (square about the paint's centre, so every medallion sits in the same place in its box)
            side = max(x1 - x0, y1 - y0) + 4
            cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
            box = (round(cx - side / 2), round(cy - side / 2), round(cx - side / 2) + side, round(cy - side / 2) + side)
            im = Image.fromarray(cell).crop(box).resize((size, size), Image.LANCZOS)
            total += save(im, name)
            count += 1
    rules = ['/* PAINTED-BUTTONS: written by tools/painted-buttons/cut.py; do not edit by hand. The nine-slice lines of each plate, in the',
             '   halved files\' own pixels (border-image-slice), and the --pb-* widths the plates are drawn with (half the slice again). */',
             ':root {']
    for sheet, row, names, margins in PLATES:
        a = clean(np.array(Image.open(f'{SRC}/{sheet}.png').convert('RGBA')))
        cells = [a[row * 256:(row + 1) * 256, c * 512:(c + 1) * 512] for c in range(3)]
        boxes = [bbox(c[..., 3]) for c in cells]
        x0, y0 = min(b[0] for b in boxes), min(b[1] for b in boxes)
        x1, y1 = max(b[2] for b in boxes), max(b[3] for b in boxes)
        for cell, name in zip(cells, names):
            im = Image.fromarray(cell).crop((x0, y0, x1, y1))
            if margins is None:
                h = round(SWITCH_W * im.height / im.width)
                im = im.resize((SWITCH_W, h), Image.LANCZOS)
            else:
                im = im.resize(((x1 - x0) // 2, (y1 - y0) // 2), Image.LANCZOS)
            total += save(im, name)
            count += 1
        if margins is not None:
            l, t, r, b = margins
            sl = (max(1, (l - x0) // 2), max(1, (t - y0) // 2), max(1, (r - (512 - x1)) // 2), max(1, (b - (256 - y1)) // 2))
            key = names[0]
            rules.append(f'  --{key}-slice: {sl[1]} {sl[2]} {sl[3]} {sl[0]} fill;')
            rules.append(f'  --{key}-width: {sl[1] // 2}px {sl[2] // 2}px {sl[3] // 2}px {sl[0] // 2}px;')
    rules.append('}')
    with open(CSS, 'w') as f:
        f.write('\n'.join(rules) + '\n')
    print(f'{count} files, {total} bytes in {OUT}; slices in {CSS}')


if __name__ == '__main__':
    sys.exit(main())
