"""Cut the other eleven heroes' skill 1 and ultimate paintings out of the move sheets (art-source/heroes-20/icons/sheet-N.png, a 4 x 4 grid
of 384 px cells) into the ability atlases (docs/notes/heroes-join-2.md): six fill the free cells 10 to 15 of atlas-11 (the Mythics') and
sixteen fill atlas-12; the catalogue (src/art/fx/abilities/catalogue.json) gets a row for each. Run once; it is safe to run again."""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
ICONS = ROOT / 'art-source' / 'heroes-20' / 'icons'
OUT = ROOT / 'src' / 'art' / 'fx' / 'abilities'
# (skill name, sheet, cell, motif): skill 1 and the ultimate of each hero, in the moves' order
MOVES = [
    ('Standard Charge', 2, 8, 'a blue fleur-de-lis guidon streaming from a gold lance point'),
    ('Oriflamme of the Keep', 2, 11, 'a great flame-red banner with a gold castle on a gilded pole'),
    ('Rift Pounce', 3, 8, 'a golden lion paw with long claws tearing through a violet star rift'),
    ('The Last Riddle', 3, 11, 'a violet constellation of glyph-lines bursting from one bright core'),
    ('Whirling Veils', 3, 12, 'teal silk veils spinning round two crescent blades'),
    ('Dance of Seven Mirages', 3, 15, 'a ring of seven pale shimmering dancer silhouettes in violet haze'),
    ('Censer Swing', 4, 0, 'a swinging bronze censer on a chain trailing green smoke'),
    ('Black Miasma', 4, 3, 'a towering black and green plague cloud flowering from one core'),
    ('Concussion Mortar', 4, 4, 'a mortar shell rising from a fiery blast and shock ring'),
    ('Shell Storm', 4, 7, 'a rain of burning shells falling over a row of fiery bursts'),
    ('Gravity Well', 4, 8, 'a collapsing violet star whirlpool pulling inward'),
    ('Supernova Alignment', 4, 11, 'planets aligned on a rod flaring into a golden supernova'),
    ('Chains of Judgement', 4, 12, 'two crossed solar chains glowing gold-white'),
    ('Solar Tribunal', 4, 15, 'a ring of sun discs round a shaft of golden light'),
    ('Halo Dive', 5, 0, 'a golden halo diving in a streak of light'),
    ('Descent of the Host', 5, 3, 'three tiers of golden wings falling from the sky'),
    ('Boarding Swing', 5, 4, 'a flintlock pistol flashing over a coil of rigging rope'),
    ('Rum Ration', 5, 7, 'a ring of red healing flasks round a bright core, splashing'),
    ('Barbed Harpoon', 5, 8, 'a barbed harpoon on a trailing teal line'),
    ('Leviathan Line', 5, 11, 'a sea serpent as a taut teal line with a harpoon barb'),
    ('Breaker Rush', 5, 12, 'a cresting teal wave breaking in white foam'),
    ('Wrath of the Reef', 5, 15, 'an iron anchor framed by red coral in surf'),
]
CELL = 192  # an atlas cell, in a 768 px atlas


def cell_of(sheet: int, n: int) -> Image.Image:
    im = Image.open(ICONS / f'sheet-{sheet}.png').convert('RGBA')
    c = im.size[0] // 4
    return im.crop(((n % 4) * c, (n // 4) * c, (n % 4 + 1) * c, (n // 4 + 1) * c)).resize((CELL, CELL), Image.Resampling.LANCZOS)


a11 = Image.open(OUT / 'atlas-11.png').convert('RGBA')
a12 = Image.new('RGBA', (768, 768), (0, 0, 0, 0))
rows = []
for i, (name, sheet, n, motif) in enumerate(MOVES):
    c = cell_of(sheet, n)
    if i < 6:
        k, atlas, target = 10 + i, 11, a11
    else:
        k, atlas, target = i - 6, 12, a12
    box = ((k % 4) * CELL, (k // 4) * CELL)
    target.paste(Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0)), box)
    target.alpha_composite(c, box)
    rows.append({'id': f'skill:{name}', 'name': name, 'motif': motif, 'atlas': atlas, 'cell': k})
a11.save(OUT / 'atlas-11.png', optimize=True)
a12.save(OUT / 'atlas-12.png', optimize=True)
cat = json.loads((OUT / 'catalogue.json').read_text())
have = {r['id'] for r in cat}
cat += [r for r in rows if r['id'] not in have]
(OUT / 'catalogue.json').write_text(json.dumps(cat, indent=2) + '\n')
print(len(cat), 'rows')
