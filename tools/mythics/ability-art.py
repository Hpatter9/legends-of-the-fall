"""Give the five Mythics' skill 1 and ultimate their own painted lead (docs/notes/fix-main-mythics.md). Every cell of atlas-0 to
atlas-10 belongs to a skill or spell already, and the hero move sheets (art-source/heroes-20/icons) are reserved for the twenty heroes'
own moves, so each Mythic move takes one strong frame of an existing painted spell sheet (art-source/spell-fx, 256 px cells), cropped
to its painting, centred in a 10% clear margin and set into a cell of the new atlas-11; the catalogue gets a row for each. Nothing is
repainted. Run once; it is safe to run again."""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'art-source' / 'spell-fx'
OUT = ROOT / 'src' / 'art' / 'fx' / 'abilities'
# (move, sheet, row, frame, motif)
MOVES = [
    ('Eclipse Cleave', 'e-moves/cleave', 0, 1, 'a dark eclipse ring of a sword stroke edged with ember sparks'),
    ('Kneel Before Night', 'g-spells/reign-of-terror', 0, 2, 'a crimson crown of flame rising round a black hollow'),
    ('Starbreath', 'f-martial/dragon-breath', 1, 1, 'a burning orange star of breath bursting from a white core'),
    ('Heavenfall', 'f-martial/orbital-strike', 1, 2, 'a cold blue-white shaft of starlight falling to the ground'),
    ('Saint’s Spear', 'c-healers/guiding-bolt', 0, 3, 'a golden spear of light streaming a feathered trail'),
    ('Death Denied', 'c-healers/death-ward', 0, 3, 'a glass dome of holy light sheltering a golden ankh'),
    ('Rootquake', 'g-spells/conjure-treant', 1, 2, 'a knot of roots tearing outward round a green glow'),
    ('The World Stands', 'g-spells/conjure-treant', 0, 3, 'a grove of young trunks rising in a green crown'),
    ('Fate Shard', 'd-casters/magic-missile', 1, 2, 'a violet starburst of a shattered future'),
    ('Rewrite Fate', 'd-casters/time-stop', 0, 4, 'a violet dome of frozen time marked with clock hands'),
]
CELL, SRC_CELL = 192, 256


def frame(sheet: str, row: int, n: int) -> Image.Image:
    im = Image.open(SRC / f'{sheet}.png').convert('RGBA')
    cell = im.crop((n * SRC_CELL, row * SRC_CELL, (n + 1) * SRC_CELL, (row + 1) * SRC_CELL))
    alpha = cell.getchannel('A').point(lambda a: 255 if a > 24 else 0)
    box = alpha.getbbox()
    if not box:
        raise SystemExit(f'{sheet} row {row} frame {n} is empty')
    cell = cell.crop(box)
    inner = int(CELL * 0.8)
    k = inner / max(cell.size)
    cell = cell.resize((max(1, round(cell.size[0] * k)), max(1, round(cell.size[1] * k))), Image.Resampling.LANCZOS)
    out = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    out.alpha_composite(cell, ((CELL - cell.size[0]) // 2, (CELL - cell.size[1]) // 2))
    return out


atlas = Image.new('RGBA', (768, 768), (0, 0, 0, 0))
rows = []
for i, (name, sheet, row, n, motif) in enumerate(MOVES):
    atlas.alpha_composite(frame(sheet, row, n), ((i % 4) * CELL, (i // 4) * CELL))
    rows.append({'id': f'skill:{name}', 'name': name, 'motif': motif, 'atlas': 11, 'cell': i})
atlas.save(OUT / 'atlas-11.png', optimize=True)
cat = json.loads((OUT / 'catalogue.json').read_text())
have = {r['id'] for r in cat}
cat += [r for r in rows if r['id'] not in have]
(OUT / 'catalogue.json').write_text(json.dumps(cat, indent=2) + '\n')
print(len(cat), 'rows')
