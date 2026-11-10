#!/usr/bin/env python3
"""UI-ART-WIRE (docs/notes/ui-art-wire.md): the duel's painted tug-of-war bar (art/duel-show, art-source/duel-show/) for `duelShow.ts`.

    python3 tools/duel-show/import-art.py && npm run web

Each piece is painted at twice the size it is drawn, and is kept at that size (crisp on a phone's 2x and 3x screens), written as WebP
(alpha kept) to src/art/duel/. `duelShow.ts` imports them, so they are bundled into game.js and play offline with nothing for the service
worker's list.

- bar-frame.webp: the whole frame, 760 x 112, as painted. It nine-slices across: its ends (the sockets and their clasps, 130 px each) keep
  their shape and its plain rails between stretch. Its sockets' openings (56 px across, centred at x 60.5 and 698.5, y 55.5) and the
  channel's floor (y 46 to 66, x 115 to 645) are where duelShow.css puts the faces and the fills.
- bar-fill-green.webp, bar-fill-red.webp: the fills' tiles, 64 x 26, kept whole. The first painting had a clear 1 px rim and faded at each
  end, so the cut kept its 60 x 24 middle; the owner's repaint (REPAINTS-2, docs/notes/repaints-2.md) runs edge to edge, so it tiles with no
  seam (checked here: the first and last columns match).
- bar-knot.webp: the meeting point, trimmed to its paint about its centre.
- bar-flare.webp: the burst over the knot at a big swing, as painted.
"""
import os
from PIL import Image

SRC = 'art-source/duel-show'
OUT = 'src/art/duel'


def save(im: Image.Image, name: str) -> None:
    p = f'{OUT}/{name}.webp'
    im.save(p, 'WEBP', quality=90, method=6)
    print(f'{name}: {im.size[0]} x {im.size[1]}, {os.path.getsize(p)} bytes')


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    frame = Image.open(f'{SRC}/duel-bar-frame.png').convert('RGBA')
    assert frame.size == (760, 112), frame.size
    save(frame, 'bar-frame')
    for c in ('green', 'red'):
        tile = Image.open(f'{SRC}/duel-bar-fill-{c}.png').convert('RGBA')
        assert tile.size == (64, 26), tile.size
        px = tile.load()
        assert all(px[0, y] == px[63, y] for y in range(26)), f'{c}: the ends differ, so the tile would show a seam'
        save(tile, f'bar-fill-{c}')
    knot = Image.open(f'{SRC}/duel-bar-knot.png').convert('RGBA')
    save(knot, 'bar-knot')
    save(Image.open(f'{SRC}/duel-bar-flare.png').convert('RGBA'), 'bar-flare')


if __name__ == '__main__':
    main()
