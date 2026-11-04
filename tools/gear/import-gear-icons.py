"""Bring the painted equipment icons into the game (the note: docs/notes/gear-icons.md; the briefs asked for 256 x 256 paintings
in art-source/gear/: weapons/, armour/ and trinkets/ hold `<id>.png`, the standard painting used for Common to Legendary, and
`<id>-mythic.png`, the Mythic relic; grade/ holds the five grade frames and four grade glows).

Usage (from anywhere; paths are the repo's):
    python3 tools/gear/import-gear-icons.py [--contact <png>]

For every equipment base in src/sim/equipBases.ts it looks for both paintings and reports any that is missing (the game then
keeps the old pixel icon for that id). Then it cleans each painting:
  - the paintings were cut from larger sheets, and some carry stray bits of the neighbouring painting at an edge (under the
    mail shirts, the breastplates, the headsman's axe, the staffs...). The visible pixels (alpha over 8) are split into
    8-connected islands; an island that is not the largest, is under 30% of its size and reaches the outer edge of all the
    painting's pixels is dropped (sparks and motes inside a Mythic's glow do not reach that edge, so they stay);
    A second pass does the same with only the solid pixels (alpha over 64), for a bit joined to the painting by faint glow;
  - the standard and the Mythic of an id are then scaled and centred together (one box round both, so the two still swap in
    place), filling the square inside a 6% margin.
It packs every cell into one atlas a size, src/art/gear/gear-<cell>.webp (12 cells a row), at the CELLS sizes: the larger for
slots on the hero sheet (up to 96 px on screen, sharp on a phone's dense screen), the smaller for lists and chips. The grade
pieces go into src/art/gear/grade-<cell>.webp: the five frames as they are, and the four glows (painted wide and low in a 3:2
strip) cropped to their light, their edges feathered to nothing and stretched to the square. src/art/gear/index.json, which the
game bundles, says where each cell is. build.mjs copies the atlases into out/web and lists them for offline play.

--contact <png> also draws every cleaned painting with what was dropped shown in red, labelled, for review. The painted sources
are never changed. Re-run it whenever the paintings change.
"""
import io
import json
import re
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'art-source' / 'gear'
OUT = ROOT / 'src' / 'art' / 'gear'
CELLS = (128, 64)
COLS = 12
MARGIN = 0.06
ALPHA = 8  # a pixel at or under this alpha counts as clear
SOLID = 64  # over this, a pixel is solid paint rather than glow
STRAY = 0.3  # an island at the edge under this share of the largest is a stray bit
QUALITY = 80
FOLDERS = {'weapon': 'weapons', 'armour': 'armour', 'trinket': 'trinkets'}


def base_ids():
    """The equipment bases in their own order, as (id, slot)."""
    text = (ROOT / 'src' / 'sim' / 'equipBases.ts').read_text()
    slots = {'W': 'weapon', 'A': 'armour', 'T': 'trinket'}
    consts = dict(re.findall(r"const (\w) = '(\w+)'", text))
    out = []
    for m in re.finditer(r"\{ id: '(\w+)',[^\n]*?slot: (\w+)", text):
        slot = consts.get(m.group(2), slots.get(m.group(2), m.group(2)))
        out.append((m.group(1), slot))
    return out


def islands(mask):
    """The 8-connected islands of a mask: a label image and a list of {id, area, box}."""
    h, w = mask.shape
    lab = np.zeros((h, w), np.int32)
    found = []
    for y0, x0 in zip(*np.nonzero(mask)):
        if lab[y0, x0]:
            continue
        n = len(found) + 1
        q = deque([(y0, x0)])
        lab[y0, x0] = n
        ys, xs = [], []
        while q:
            y, x = q.popleft()
            ys.append(y)
            xs.append(x)
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < h and 0 <= xx < w and mask[yy, xx] and not lab[yy, xx]:
                        lab[yy, xx] = n
                        q.append((yy, xx))
        found.append({'id': n, 'area': len(ys), 'box': (min(xs), min(ys), max(xs), max(ys))})
    return lab, found


def dilate(mask, r):
    out = mask.copy()
    for _ in range(r):
        m = out.copy()
        m[1:, :] |= out[:-1, :]
        m[:-1, :] |= out[1:, :]
        m[:, 1:] |= out[:, :-1]
        m[:, :-1] |= out[:, 1:]
        out = m
    return out


def strays(alpha, thr):
    """The islands over `thr` to keep, and those to drop: not the largest, under STRAY of its size, reaching the outer edge."""
    lab, found = islands(alpha > thr)
    keep = np.zeros(lab.shape, bool)
    drop = np.zeros(lab.shape, bool)
    if not found:
        return keep, drop
    main = max(found, key=lambda c: c['area'])
    x0 = min(c['box'][0] for c in found)
    y0 = min(c['box'][1] for c in found)
    x1 = max(c['box'][2] for c in found)
    y1 = max(c['box'][3] for c in found)
    for c in found:
        bx0, by0, bx1, by1 = c['box']
        at_edge = bx0 <= x0 + 1 or by0 <= y0 + 1 or bx1 >= x1 - 1 or by1 >= y1 - 1
        if c is main or c['area'] >= STRAY * main['area'] or not at_edge:
            keep |= lab == c['id']
        else:
            drop |= lab == c['id']
    return keep, drop


def clean(im):
    """The painting with stray edge bits cleared, and the mask of what was dropped. Two passes: every visible pixel (the bits
    standing apart), then only the solid ones (a bit joined to the painting by a faint haze of glow)."""
    a = np.array(im)
    keep, drop = strays(a[:, :, 3], ALPHA)
    # the soft edges (alpha under the threshold) of what is kept stay; everything else goes
    a[~dilate(keep, 3), 3] = 0
    keep2, drop2 = strays(a[:, :, 3], SOLID)
    if drop2.any():
        # the solid bit and the haze right round it, but nothing close to the solid painting
        a[dilate(drop2, 4) & ~dilate(keep2, 3), 3] = 0
    return Image.fromarray(a), drop | drop2


def box_of(im):
    a = np.array(im)[:, :, 3]
    ys, xs = np.nonzero(a > ALPHA)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def fit(im, box, cell):
    """`im`'s `box` scaled to fill a `cell` square inside the margin, centred."""
    x0, y0, x1, y1 = box
    inner = cell * (1 - 2 * MARGIN)
    s = min(inner / (x1 - x0), inner / (y1 - y0))
    # resample from the full painting so the scale is exact, then place the box's centre at the cell's
    w, h = max(1, round(im.width * s)), max(1, round(im.height * s))
    big = im.resize((w, h), Image.LANCZOS)
    out = Image.new('RGBA', (cell, cell))
    cx, cy = (x0 + x1) / 2 * s, (y0 + y1) / 2 * s
    out.paste(big, (round(cell / 2 - cx), round(cell / 2 - cy)))  # a plain copy onto the clear square (a masked paste would square the alpha)
    return out


def glow_square(im, cell):
    """A glow painted in a wide, low strip: cropped to its light, feathered to nothing at every edge, stretched to the square."""
    a = np.array(im).astype(np.float32)
    ys, xs = np.nonzero(a[:, :, 3] > 4)
    a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    h, w = a.shape[:2]
    fy = np.minimum(np.arange(h), np.arange(h)[::-1]) / (0.18 * h)
    fx = np.minimum(np.arange(w), np.arange(w)[::-1]) / (0.12 * w)
    a[:, :, 3] *= np.clip(fy, 0, 1)[:, None] * np.clip(fx, 0, 1)[None, :]
    g = Image.fromarray(a.astype(np.uint8))
    # the light fills the frame's inside (the frame's band is about 8% of the square)
    side = round(cell * 0.9)
    g = g.resize((side, side), Image.LANCZOS)
    out = Image.new('RGBA', (cell, cell))
    out.paste(g, ((cell - side) // 2, (cell - side) // 2))
    return out


def webp(im):
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=QUALITY, method=6)
    return buf.getvalue()


def main():
    args = sys.argv[1:]
    contact = args[args.index('--contact') + 1] if '--contact' in args else None
    bases = base_ids()
    keys, pairs, missing, report = [], [], [], []
    for bid, slot in bases:
        std = SRC / FOLDERS[slot] / f'{bid}.png'
        myth = SRC / FOLDERS[slot] / f'{bid}-mythic.png'
        have = [p for p in (std, myth) if p.exists()]
        missing += [str(p.relative_to(ROOT)) for p in (std, myth) if not p.exists()]
        if not have:
            continue
        cleaned = []
        for p in have:
            im = Image.open(p).convert('RGBA')
            if im.size != (256, 256):
                print(f'note: {p.relative_to(ROOT)} is {im.size[0]}x{im.size[1]}, not 256x256')
            c, dropped = clean(im)
            n = int(dropped.sum())
            if n:
                report.append(f'{p.stem}: {n} px of stray bits dropped')
            cleaned.append((p.stem, im, c, dropped))
        boxes = [box_of(c) for _, _, c, _ in cleaned]
        box = (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))
        for stem, src, c, dropped in cleaned:
            keys.append(stem)
            pairs.append((stem, src, c, dropped, box))
    known = {f'{b}{m}' for b, _ in bases for m in ('', '-mythic')}
    for f in FOLDERS.values():
        for p in sorted((SRC / f).glob('*.png')):
            if p.stem not in known:
                print(f'note: {p.relative_to(ROOT)} is not an equipment base, left out')

    OUT.mkdir(parents=True, exist_ok=True)
    rows = (len(keys) + COLS - 1) // COLS
    index = {'cols': COLS, 'rows': rows, 'cells': list(CELLS), 'items': {k: i for i, k in enumerate(keys)}, 'grade': {}}
    total = 0
    for cell in CELLS:
        atlas = Image.new('RGBA', (COLS * cell, rows * cell))
        for i, (stem, src, c, dropped, box) in enumerate(pairs):
            atlas.paste(fit(c, box, cell), ((i % COLS) * cell, (i // COLS) * cell))
        data = webp(atlas)
        (OUT / f'gear-{cell}.webp').write_bytes(data)
        total += len(data)
        print(f'gear-{cell}.webp: {len(keys)} icons, {atlas.width}x{atlas.height}, {len(data) // 1024} KB')

    grade_keys = [f'frame-{g}' for g in ('common', 'rare', 'epic', 'legendary', 'mythic')] + [f'glow-{g}' for g in ('rare', 'epic', 'legendary', 'mythic')]
    have_grade = [k for k in grade_keys if (SRC / 'grade' / f'{k}.png').exists()]
    missing += [f'art-source/gear/grade/{k}.png' for k in grade_keys if k not in have_grade]
    index['grade'] = {k: i for i, k in enumerate(have_grade)}
    for cell in CELLS:
        sheet = Image.new('RGBA', (len(have_grade) * cell, cell))
        for i, k in enumerate(have_grade):
            im = Image.open(SRC / 'grade' / f'{k}.png').convert('RGBA')
            piece = glow_square(im, cell) if k.startswith('glow') else im.resize((cell, cell), Image.LANCZOS)
            sheet.paste(piece, (i * cell, 0))
        data = webp(sheet)
        (OUT / f'grade-{cell}.webp').write_bytes(data)
        total += len(data)
        print(f'grade-{cell}.webp: {len(have_grade)} pieces, {len(data) // 1024} KB')
    (OUT / 'index.json').write_text(json.dumps(index, indent=None, separators=(',', ':')) + '\n')
    print(f'total {total // 1024} KB')
    for r in report:
        print(r)
    for m in missing:
        print(f'missing: {m} (the game keeps the pixel icon)')

    if contact:
        cell = 128
        cols = 10
        crow = cell + 14
        sheet = Image.new('RGBA', (cols * cell, ((len(pairs) + cols - 1) // cols) * crow), (40, 44, 52, 255))
        d = ImageDraw.Draw(sheet)
        for i, (stem, src, c, dropped, box) in enumerate(pairs):
            x, y = (i % cols) * cell, (i // cols) * crow
            show = np.array(src).copy()
            show[dropped] = (255, 40, 40, 255)
            view = Image.fromarray(show).resize((cell, cell), Image.LANCZOS)
            bg = Image.new('RGBA', (cell, cell), (58, 64, 74, 255))
            bg.alpha_composite(view)
            sheet.paste(bg, (x, y))
            d.text((x + 2, y + cell + 1), stem[:21], fill=(255, 255, 255, 255))
        sheet.save(contact)
        print(f'contact sheet: {contact}')


if __name__ == '__main__':
    main()
