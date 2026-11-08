"""Bring the owner's painted gear pieces that are not equipment into the game (SEVEN-SLOT GEAR batch 7, docs/notes/gear-build.md):
the eight rune stones and the five rune frames (art-source/gear/runes/), the merge spark's six-frame strip (runes/merge-spark.png), the
fourteen set emblems (emblems/), the three glyph stones (glyphs/) and the five remedies (remedies/), all painted at 256 x 256.

Usage (from anywhere; paths are the repo's):
    python3 tools/gear/import-gear-ui.py

Each is scaled to SIZE px (sharp at twice the largest size the page shows it) and saved as WebP under src/art/gear/ui/, keeping its
folder and name; the merge spark keeps its six frames side by side. The page bundles them as data URLs (`src/gearUiArt.ts`), so they
play offline. The painted sources are never changed. Re-run it whenever the paintings change.
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'art-source' / 'gear'
OUT = ROOT / 'src' / 'art' / 'gear' / 'ui'
SIZE = 96
QUALITY = 82
FOLDERS = ('runes', 'emblems', 'glyphs', 'remedies')


def main():
    total = 0
    for folder in FOLDERS:
        (OUT / folder).mkdir(parents=True, exist_ok=True)
        for p in sorted((SRC / folder).glob('*.png')):
            im = Image.open(p).convert('RGBA')
            frames = max(1, round(im.width / im.height))
            out = im.resize((SIZE * frames, SIZE), Image.LANCZOS)
            dest = OUT / folder / f'{p.stem}.webp'
            out.save(dest, 'WEBP', quality=QUALITY, method=6)
            total += dest.stat().st_size
            print(f'{folder}/{p.stem}.webp {out.width}x{out.height} {dest.stat().st_size // 1024} KB')
    print(f'total {total // 1024} KB')


if __name__ == '__main__':
    main()
