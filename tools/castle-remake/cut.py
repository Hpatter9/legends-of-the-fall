#!/usr/bin/env python3
"""CASTLE-REMAKE: bring the owner's castle paintings into the game (docs/notes/castle-remake.md, prompts in
docs/notes/castle-remake-art-prompts.md). Run from the repository root, with Pillow:

    python3 tools/castle-remake/cut.py

Reads art-source/castle-remake/ (the four files the prompt asks for; any may be missing) and writes src/art/castle-remake/:
- courtyard.webp (1024 x 1536) and throne-hall.webp (1536 x 1024), quality 86;
- one trimmed cut-out per building from the two 3 x 2 sheets (treasury.webp ... site.webp), lossless-alpha WebP;
- manifest.json: {"painted": [...names cut from the owner's art...]}. src/castleArt.ts reads it: a painted name is used by its file,
  anything else keeps its stand-in.
A painting that is not there yet gets a plain stand-in file of the same name and size (the courtyard and the hall only: the page must
have a picture for the ambient layer and the tests), never listed as painted. Re-running after the art lands replaces the stand-ins.
build.mjs copies the folder to out/web/ui/castle/ and lists every file in the service worker's FILES.
"""
import json
import os
import random
import sys

from PIL import Image, ImageDraw, ImageFilter

# (a second and third argument point it elsewhere, for a dry run: cut.py <source dir> <out dir>)
SRC = sys.argv[1] if len(sys.argv) > 1 else 'art-source/castle-remake'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'src/art/castle-remake'

# The sheets' cells, left to right, top row then bottom row (the prompt's order).
SHEETS = {
    'buildings-a.png': ['treasury', 'armoury', 'barracks', 'mageTower', 'stable', 'library'],
    'buildings-b.png': ['chapel', 'smithy', 'watchtower', 'hall', 'drillYard', 'site'],
}
CELL = 512

# The plots, in shares of the courtyard (the same as src/castleArt.ts's PLOTS and the prompt).
PLOTS = [(0.15, 0.20), (0.85, 0.20), (0.18, 0.37), (0.50, 0.37), (0.82, 0.37), (0.18, 0.54), (0.50, 0.54), (0.82, 0.54),
         (0.18, 0.71), (0.50, 0.71), (0.82, 0.71)]


def fit(im: Image.Image, w: int, h: int) -> Image.Image:
    """Crop evenly to the aspect, then resize (never repaint)."""
    sw, sh = im.size
    if (sw, sh) == (w, h):
        return im
    want = w / h
    if sw / sh > want:
        cw = round(sh * want)
        im = im.crop(((sw - cw) // 2, 0, (sw - cw) // 2 + cw, sh))
    elif sw / sh < want:
        ch = round(sw / want)
        im = im.crop((0, (sh - ch) // 2, sw, (sh - ch) // 2 + ch))
    return im.resize((w, h), Image.LANCZOS)


def stand_in_courtyard() -> Image.Image:
    """A plain stand-in: dusk sky, stone ground, the keep's shape, the road and eleven kerbed plots. Not art: it holds the place."""
    w, h = 1024, 1536
    rnd = random.Random(7)
    im = Image.new('RGB', (w, h), (38, 44, 40))
    d = ImageDraw.Draw(im)
    for y in range(h):
        t = y / h
        c = (int(30 + 18 * t), int(36 + 16 * t), int(40 + 6 * t))
        d.line([(0, y), (w, y)], fill=c)
    for y in range(0, int(h * 0.05)):
        t = y / (h * 0.05)
        d.line([(0, y), (w, y)], fill=(int(28 + 40 * t), int(30 + 26 * t), int(58 + 10 * t)))
    for _ in range(9000):
        x, y = rnd.randrange(w), rnd.randrange(int(h * 0.05), h)
        v = rnd.randrange(-10, 10)
        r, g, b = im.getpixel((x, y))
        d.point((x, y), fill=(r + v, g + v, b + v))
    # the walls, the keep, the gate
    d.rectangle([0, int(h * 0.22), 34, int(h * 0.86)], fill=(58, 60, 58))
    d.rectangle([w - 34, int(h * 0.22), w, int(h * 0.86)], fill=(58, 60, 58))
    d.rectangle([0, int(h * 0.84), w, int(h * 0.88)], fill=(60, 62, 60))
    d.rectangle([int(w * 0.30), int(h * 0.04), int(w * 0.70), int(h * 0.235)], fill=(52, 54, 56))
    d.rectangle([int(w * 0.32), int(h * 0.02), int(w * 0.40), int(h * 0.10)], fill=(56, 58, 60))
    d.rectangle([int(w * 0.60), int(h * 0.02), int(w * 0.68), int(h * 0.10)], fill=(56, 58, 60))
    for x in (0.42, 0.50, 0.58):
        d.rectangle([int(w * (x - 0.02)), int(h * 0.12), int(w * (x + 0.02)), int(h * 0.19)], fill=(150, 112, 58))
    d.rectangle([int(w * 0.42), int(h * 0.86), int(w * 0.58), int(h * 0.94)], fill=(28, 26, 24))
    # the road and the plots
    d.rectangle([int(w * 0.46), int(h * 0.24), int(w * 0.54), h], fill=(70, 66, 58))
    for y in (0.37, 0.54, 0.71):
        d.rectangle([int(w * 0.18), int(h * y) - 10, int(w * 0.82), int(h * y) + 10], fill=(66, 62, 54))
    for (x, y) in PLOTS:
        pw, ph = (0.30 if (x, y) == (0.50, 0.71) else 0.24) * w, 0.10 * h
        box = [x * w - pw / 2, y * h - ph / 2, x * w + pw / 2, y * h + ph / 2]
        d.rounded_rectangle(box, radius=26, fill=(84, 76, 62), outline=(118, 110, 94), width=6)
    for (x, y) in ((0.40, 0.88), (0.60, 0.88), (0.02, 0.30), (0.98, 0.30), (0.02, 0.60), (0.98, 0.60)):
        d.ellipse([x * w - 9, y * h - 9, x * w + 9, y * h + 9], fill=(255, 190, 90))
    return im.filter(ImageFilter.GaussianBlur(1.2))


def stand_in_hall() -> Image.Image:
    """A plain stand-in for the hall (only so the ambient scene has its file; the page keeps the old throne room until it lands)."""
    w, h = 1536, 1024
    im = Image.new('RGB', (w, h), (30, 26, 28))
    d = ImageDraw.Draw(im)
    d.rectangle([int(w * 0.32), int(h * 0.59), int(w * 0.68), int(h * 0.66)], fill=(70, 66, 62))
    d.polygon([(w * 0.44, h * 0.66), (w * 0.56, h * 0.66), (w * 0.62, h), (w * 0.38, h)], fill=(110, 24, 28))
    return im


def trim(im: Image.Image) -> Image.Image:
    box = im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
    return im.crop(box) if box else im


def main() -> int:
    os.makedirs(OUT, exist_ok=True)
    painted = []
    prior = read_painted()
    for name, (w, h), stand in (('courtyard', (1024, 1536), stand_in_courtyard), ('throne-hall', (1536, 1024), stand_in_hall)):
        src = f'{SRC}/{name}.png'
        if os.path.exists(src):
            fit(Image.open(src).convert('RGB'), w, h).save(f'{OUT}/{name}.webp', quality=86, method=6)
            painted.append(name)
        elif name in prior and os.path.exists(f'{OUT}/{name}.webp'):
            painted.append(name)
        else:
            stand().save(f'{OUT}/{name}.webp', quality=80, method=6)
    for sheet, names in SHEETS.items():
        src = f'{SRC}/{sheet}'
        if not os.path.exists(src):
            painted += [n for n in names if n in prior and os.path.exists(f'{OUT}/{n}.webp')]
            continue
        im = fit(Image.open(src).convert('RGBA'), CELL * 3, CELL * 2)
        for i, name in enumerate(names):
            x, y = (i % 3) * CELL, (i // 3) * CELL
            cut = trim(im.crop((x, y, x + CELL, y + CELL)))
            # (the buildings stand about 110 css px wide on a phone: 360 px is sharp at a device ratio of 3)
            if cut.width > 360:
                cut = cut.resize((360, round(cut.height * 360 / cut.width)), Image.LANCZOS)
            cut.save(f'{OUT}/{name}.webp', quality=88, method=6)
            painted.append(name)
    with open(f'{OUT}/manifest.json', 'w') as f:
        json.dump({'painted': sorted(painted)}, f, indent=1)
        f.write('\n')
    print('painted:', ', '.join(sorted(painted)) or 'none yet (stand-ins only)')
    if painted:
        print('Add to CREDITS.md: "Castle remake paintings (art-source/castle-remake/: ' + ', '.join(sorted(painted)) +
              '): painted for this game by the owner with ChatGPT; cut by tools/castle-remake/cut.py."')
    return 0


def read_painted() -> list:
    try:
        with open(f'{OUT}/manifest.json') as f:
            return json.load(f).get('painted', [])
    except (OSError, ValueError):
        return []


if __name__ == '__main__':
    sys.exit(main())
