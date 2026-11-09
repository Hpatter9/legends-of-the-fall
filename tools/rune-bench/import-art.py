#!/usr/bin/env python3
"""RUNE-BENCH-LOOK: drop the owner's rune bench paintings (art-source/rune-bench/, the art/rune-bench branch, PR "Rune bench art") into the
game. Each piece is found by its file name; a piece not painted yet is skipped, and the bench keeps the painted plates it has today
(paintedButtons.css, section 12).

    python3 tools/rune-bench/import-art.py && npm run web

For each piece that is there: trimmed to its paint, resized with Pillow (LANCZOS, never repainted) to the size below, written as WebP
(alpha kept) to src/art/ui/rune-bench/<name>.webp, which build.mjs serves as ui/rune-bench/<name>.webp and the service worker caches for
offline play. Then src/runeBenchArt.css is written again with the rules for the pieces present (`html body ...`, so they win over section
12 of paintedButtons.css). Prints what it wrote. Credit the paintings in CREDITS.md when they land.

The names are those of the newer prompt (docs/notes/rune-bench-art-prompts.md, ten pieces). The seven pieces painted from the earlier
prompt (PR #474) stand in for them while those are not there (`FALLBACKS`, each with its own size and slice, since their shapes differ:
square tiles, a wide backing); a piece under the newer name always wins.
"""
import os
from PIL import Image

SRC = 'art-source/rune-bench'
OUT = 'src/art/ui/rune-bench'
CSS = 'src/runeBenchArt.css'

# name: (width, height, nine-slice margins in the written file's pixels (top, right, bottom, left), or None for a whole picture, and how
# many times smaller the frame is drawn on the page than the file (so its corners fit a 28 px bar, a 52 px tile))
PIECES = {
    'grip': (64, 208, (40, 18, 40, 18), 2),
    'grip-lit': (64, 208, (40, 18, 40, 18), 2),
    'tray': (384, 160, (40, 44, 40, 44), 4),
    'tile': (128, 96, (28, 30, 28, 30), 3),
    'tile-lit': (128, 96, (28, 30, 28, 30), 3),
    'tile-empty': (128, 96, (28, 30, 28, 30), 3),
    'socket': (96, 96, None, 1),
    'socket-twin': (96, 96, None, 1),
    'rune-auto': (96, 96, None, 1),
    'rune-auto-locked': (96, 96, None, 1),
}

# The earlier prompt's pieces (PR #474), each used for a newer piece that is not painted: its file, and its own (width, height, slice, k)
# (the shapes kept: a square tile is not squashed to the newer tile's 4:3).
FALLBACKS = {
    'grip': ('grip', 64, 262, (46, 14, 46, 14), 2),
    'grip-lit': ('grip-held', 64, 262, (46, 14, 46, 14), 2),
    'tray': ('rune-bench-backing', 384, 151, (38, 44, 38, 44), 4),
    'tile': ('rune-tile', 120, 120, (26, 26, 26, 26), 4),
    'tile-lit': ('rune-tile-lit', 120, 120, (26, 26, 26, 26), 4),
    'tile-empty': ('rune-tile-empty', 120, 120, (26, 26, 26, 26), 4),
    'rune-auto-locked': ('rune-auto-lock', 96, 96, None, 1),
}

# The rules each piece brings (the slice and the drawn widths are filled in from PIECES).
RULES = {
    'grip': "html body #benchGrip, html body #benchGrip:active:not(:disabled) {{ border-image: url(ui/rune-bench/grip.webp) {s} fill / {w} / 0 stretch; }}",
    'grip-lit': "html body #benchView.pulling #benchGrip {{ border-image: url(ui/rune-bench/grip-lit.webp) {s} fill / {w} / 0 stretch; }}",
    'tray': "html body #runeBench .rbGrid {{ border-image: url(ui/rune-bench/tray.webp) {s} fill / {w} / 0 stretch; }}",
    'tile': "html body #runeBench .rbTile {{ border-image: url(ui/rune-bench/tile.webp) {s} fill / {w} / 0 stretch; }}",
    'tile-lit': "html body #runeBench .rbTile:is(.sel, .mergeCan, .mergeHot) {{ border-image: url(ui/rune-bench/tile-lit.webp) {s} fill / {w} / 0 stretch; }}",
    'tile-empty': "html body #runeBench .rbTile.empty {{ border-image: url(ui/rune-bench/tile-empty.webp) {s} fill / {w} / 0 stretch; }}",
    'socket': "html body #runeBench .rbTile .rnStone.rn-big::before, html body #runeBench .rbTile.empty .rnStone.rn-big {{ background-image: url(ui/rune-bench/socket.webp); }}",
    'socket-twin': "html body #runeBench .rbTile.ready .rnStone.rn-big::before {{ background-image: url(ui/rune-bench/socket-twin.webp); }}",
    'rune-auto': "html body #runeBench .rbAuto::before {{ background-image: url(ui/rune-bench/rune-auto.webp); }}",
    'rune-auto-locked': "html body #runeBench .rbAuto.locked::before {{ content: ''; background-image: url(ui/rune-bench/rune-auto-locked.webp); }}\nhtml body #runeBench .rbAuto .rbLock {{ display: none; }}",
}


# The earlier grip shares the newer one's file name; the two are told apart by the canvas (the earlier is 64 x 224, the newer 64 x 208).
EARLIER_CANVAS = {'grip': (64, 224)}


def newer(name: str) -> bool:
    """Whether the newer prompt's piece of this name is there."""
    src = f'{SRC}/{name}.png'
    if not os.path.exists(src):
        return False
    return Image.open(src).size != EARLIER_CANVAS.get(name)


def trim(im: Image.Image) -> Image.Image:
    box = im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
    return im.crop(box) if box else im


def main() -> None:
    rules = []
    total = 0
    for name, (w, h, slice_, k) in PIECES.items():
        src = f'{SRC}/{name}.png'
        # (the newer piece first; else the earlier prompt's, at its own size; else none)
        if not newer(name) and name in FALLBACKS:
            fb, w, h, slice_, k = FALLBACKS[name]
            src = f'{SRC}/{fb}.png'
        if not os.path.exists(src):
            continue
        os.makedirs(OUT, exist_ok=True)
        im = trim(Image.open(src).convert('RGBA')).resize((w, h), Image.LANCZOS)
        dst = f'{OUT}/{name}.webp'
        im.save(dst, 'WEBP', quality=90, method=6)
        total += os.path.getsize(dst)
        s = ' '.join(str(v) for v in slice_) if slice_ else ''
        wd = ' '.join(f'{round(v / k)}px' for v in slice_) if slice_ else ''
        rules.append(RULES[name].format(s=s, w=wd))
        print(f'{name}: {os.path.basename(src)} {w} x {h} -> {dst}')
    with open(CSS, 'w') as f:
        f.write('/* RUNE-BENCH-LOOK: written by tools/rune-bench/import-art.py; do not edit by hand. The owner\'s rune bench paintings, one rule\n'
                '   a piece painted (a piece not painted keeps the painted plates of paintedButtons.css, section 12). */\n')
        for r in rules:
            f.write(r + '\n')
    print(f'{len(rules)} piece(s), {total} bytes; wrote {CSS}')


if __name__ == '__main__':
    main()
