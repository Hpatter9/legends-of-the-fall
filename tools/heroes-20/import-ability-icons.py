"""Cut the nine joined heroes' skill 1 and ultimate paintings out of the move sheets (art-source/heroes-20/icons/sheet-N.png, a 4 x 4 grid
of 384 px cells) into the ability atlases (docs/notes/heroes-join.md): sixteen cells fill atlas-10 and two take the free cells 14 and 15 of
atlas-9; the catalogue (src/art/fx/abilities/catalogue.json) gets a row for each. Run once; it is safe to run again."""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
ICONS = ROOT / 'art-source' / 'heroes-20' / 'icons'
OUT = ROOT / 'src' / 'art' / 'fx' / 'abilities'
# (skill name, sheet, cell, motif): skill 1 and the ultimate of each hero, in the moves' order
MOVES = [
    ('Crimson Lunge', 1, 0, 'a long curved crimson blade-arc of blood trailing red droplets'),
    ('Banquet of Blood', 1, 3, 'a black eclipse disc ringed by blood-red corona flames and four small arrows'),
    ('Sanguine Lash', 1, 4, 'an S-shaped blood whip tether dripping dark red drops at both ends'),
    ('Blood Tithe', 1, 7, 'a bright red star of branching blood-vessel lines bursting from one core'),
    ('Dusk Dive', 1, 8, 'a purple-veined bat wing as a swooping spear, violet streaks trailing'),
    ('Belfry Swoop', 1, 11, 'a pale crescent moon wrapped in a ring of dark bats in violet mist'),
    ('Gargoyle Crash', 1, 12, 'a grey stone block slamming down in a red-lit rubble burst'),
    ('Cathedral Perch', 1, 15, 'a gothic cathedral spire with a perched stone gargoyle in rose mist'),
    ('Silver Stake', 2, 0, 'a silver arrow bolt pinned into cracked grey stone with a white glint'),
    ('Silver Requiem', 2, 3, 'a fan of five long silver stakes with violet twilight streaks'),
    ('Thunder Beat', 2, 4, 'a red lacquered gold-trimmed taiko drum struck by a stick in a golden ring'),
    ('Ten Thousand Drums', 2, 7, 'five red drums in a blue storm cloud split by white lightning'),
    ('Tectonic Shove', 2, 12, 'a tall cracked stone pillar erupting from glowing amber fissures'),
    ("Mountain's Embrace", 2, 15, 'a ring of amber-lit jagged crags rising round a glowing core'),
    ('Bronze Peal', 3, 0, 'a bronze temple bell ringing on cracked ground, gold sparks flaring'),
    ('Midnight Knell', 3, 3, 'a huge dark chained bell over a violet rune ring'),
    ('Falcon Stoop', 3, 4, 'a diving falcon in a cyan streak, wings swept back'),
    ('Sky Hunt', 3, 7, 'a flock of falcons spiralling down two blue ribbons of wind'),
]
CELL = 192  # an atlas cell, in a 768 px atlas


def cell_of(sheet: int, n: int) -> Image.Image:
    im = Image.open(ICONS / f'sheet-{sheet}.png').convert('RGBA')
    c = im.size[0] // 4
    return im.crop(((n % 4) * c, (n // 4) * c, (n % 4 + 1) * c, (n // 4 + 1) * c)).resize((CELL, CELL), Image.Resampling.LANCZOS)


a10 = Image.new('RGBA', (768, 768), (0, 0, 0, 0))
a9 = Image.open(OUT / 'atlas-9.png').convert('RGBA')
rows = []
for i, (name, sheet, n, motif) in enumerate(MOVES):
    c = cell_of(sheet, n)
    if i < 16:
        a10.alpha_composite(c, ((i % 4) * CELL, (i // 4) * CELL))
        rows.append({'id': f'skill:{name}', 'name': name, 'motif': motif, 'atlas': 10, 'cell': i})
    else:
        k = 14 + i - 16
        box = ((k % 4) * CELL, (k // 4) * CELL)
        a9.paste(Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0)), box)
        a9.alpha_composite(c, box)
        rows.append({'id': f'skill:{name}', 'name': name, 'motif': motif, 'atlas': 9, 'cell': k})
a10.save(OUT / 'atlas-10.png', optimize=True)
a9.save(OUT / 'atlas-9.png', optimize=True)
cat = json.loads((OUT / 'catalogue.json').read_text())
have = {r['id'] for r in cat}
cat += [r for r in rows if r['id'] not in have]
(OUT / 'catalogue.json').write_text(json.dumps(cat, indent=2) + '\n')
print(len(cat), 'rows')
