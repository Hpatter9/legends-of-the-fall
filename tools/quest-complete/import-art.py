#!/usr/bin/env python3
"""UI-ART-WIRE (docs/notes/ui-art-wire.md): the Quest complete card's paintings (art/quest-complete, art-source/quest-complete/) for
`questComplete.ts`.

    python3 tools/quest-complete/import-art.py && npm run web

Each is trimmed to its paint and brought down with Lanczos (never repainted) to twice the size the card draws it, as WebP (alpha kept) in
src/art/ui/quest-complete/. `questComplete.ts` imports them, so they are bundled into game.js and play offline with nothing for the
service worker's list.

- seal.webp: the wax seal on its ribbon, over the card's head in place of the battle crest: 288 px across (drawn 144).
- keepsake.webp, hero-joins.webp: a keepsake's and a hero joining's reward rows: square about the paint's centre, 96 px (drawn 32 to 36).
"""
import os
from PIL import Image

SRC = 'art-source/quest-complete'
OUT = 'src/art/ui/quest-complete'


def paint(im: Image.Image) -> tuple[int, int, int, int]:
    return im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()


def save(im: Image.Image, name: str) -> None:
    p = f'{OUT}/{name}.webp'
    im.save(p, 'WEBP', quality=88, method=6)
    print(f'{name}: {im.size[0]} x {im.size[1]}, {os.path.getsize(p)} bytes')


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    seal = Image.open(f'{SRC}/seal.png').convert('RGBA')
    seal = seal.crop(paint(seal))
    w = 288
    save(seal.resize((w, round(seal.height * w / seal.width)), Image.LANCZOS), 'seal')
    for name in ('keepsake', 'hero-joins'):
        im = Image.open(f'{SRC}/{name}.png').convert('RGBA')
        x0, y0, x1, y1 = paint(im)
        side = max(x1 - x0, y1 - y0) + 8
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        box = (round(cx - side / 2), round(cy - side / 2), round(cx - side / 2) + side, round(cy - side / 2) + side)
        save(im.crop(box).resize((96, 96), Image.LANCZOS), name)


if __name__ == '__main__':
    main()
