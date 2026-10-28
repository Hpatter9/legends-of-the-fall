"""Swap the awakened auras' pack strips for painted art (docs/notes/awaken-auras-art-brief.md), the way
tools/fxlab/import-ability-art.py brought in the painted ability effects.

Usage: python3 tools/awaken/import-aura-art.py <folder of painted sheets> [cell=96]

The folder holds one PNG a class, named after the class trait (guardian.png, blade.png, ...). Each sheet is a grid of
square cells on a transparent background: one row a part, in the order the brief lists the class's parts (its step 1
parts, then its step 2 parts: the order of tools/awaken/aura-pack.json), and the part's frames along the row (an empty
cell ends the row). The cells may be any size (256px is the brief's); they are scaled to `cell` px and packed into
src/art/fx/aura/atlas.png with atlas.json, under the same part keys, so the game takes the painted art with no code
change. The painted sources stay untouched.
"""
import json
import sys
from pathlib import Path
from PIL import Image

if len(sys.argv) < 2:
    raise SystemExit(__doc__)
src = Path(sys.argv[1])
cell = int(sys.argv[2]) if len(sys.argv) > 2 else 96
COLS = 16
keys = list(json.load(open('tools/awaken/aura-pack.json')).keys())
by_class: dict[str, list[str]] = {}
for k in keys:
    by_class.setdefault(k.split('.')[0], []).append(k)

strips: list[tuple[str, list[Image.Image]]] = []
for trait, parts in by_class.items():
    sheet = Image.open(src / f'{trait}.png').convert('RGBA')
    side = sheet.height // len(parts)
    if side <= 0 or sheet.height % len(parts):
        raise SystemExit(f'{trait}.png: {sheet.height}px tall does not split into {len(parts)} rows of square cells')
    for r, key in enumerate(parts):
        frames = []
        for c in range(sheet.width // side):
            f = sheet.crop((c * side, r * side, (c + 1) * side, (r + 1) * side))
            if f.getbbox() is None:
                break
            frames.append(f.resize((cell, cell), Image.Resampling.LANCZOS))
        if not frames:
            raise SystemExit(f'{trait}.png: row {r + 1} ({key}) is empty')
        strips.append((key, frames))

# pack the strips row by row, COLS cells wide, a strip never split across rows
place: dict[str, list[int]] = {}
col = row = 0
for key, frames in strips:
    if col + len(frames) > COLS:
        col, row = 0, row + 1
    place[key] = [col, row, len(frames)]
    col += len(frames)
atlas = Image.new('RGBA', (COLS * cell, (row + 1) * cell), (0, 0, 0, 0))
for key, frames in strips:
    c, r, _ = place[key]
    for i, f in enumerate(frames):
        atlas.paste(f, ((c + i) * cell, r * cell))
out = Path('src/art/fx/aura')
atlas.save(out / 'atlas.png', optimize=True)
json.dump({'cell': cell, 'parts': dict(sorted(place.items()))}, open(out / 'atlas.json', 'w'), separators=(',', ':'))
print(len(place), 'parts packed', atlas.size)
