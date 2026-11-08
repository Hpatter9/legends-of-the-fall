"""Bring the 48 relic paintings into the game (docs/notes/int-341.md): art-source/relics/raw/<painting>.png (512 x 512, clear background)
-> src/art/relics/<relic id>.webp, 128 x 128. `relic-ids.json` maps each painting to the relic's id in src/sim/relics.ts (the paintings are named
for the relic's name; `relics.json`'s own id column is the OLD relic each one replaced, so it is not used here). Each painting is trimmed to its
visible pixels and fitted into the square inside a 4% margin, so every relic fills its frame alike. Loaded by URL (`relics/<id>.webp`) and
cached for offline play (`build.mjs`); src/render/items.ts keeps the old tiles as the fallback.

    python3 tools/relics/import-relic-icons.py
"""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / 'art-source/relics/raw'
OUT = ROOT / 'src/art/relics'
SIZE, MARGIN = 128, 0.04

ids = json.loads((ROOT / 'tools/relics/relic-ids.json').read_text())
OUT.mkdir(parents=True, exist_ok=True)
total = 0
for painting, rid in ids.items():
    im = Image.open(RAW / f'{painting}.png').convert('RGBA')
    box = im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    im = im.crop(box)
    inner = round(SIZE * (1 - 2 * MARGIN))
    k = inner / max(im.size)
    im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
    cell = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    cell.alpha_composite(im, ((SIZE - im.width) // 2, (SIZE - im.height) // 2))
    cell.save(OUT / f'{rid}.webp', 'WEBP', quality=85, method=6)
    total += (OUT / f'{rid}.webp').stat().st_size
print(len(ids), 'icons,', total // 1024, 'KB')
