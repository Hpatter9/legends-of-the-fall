"""KING-SPELLS batch 5 (docs/notes/king-spells-b5.md): the schools' fourteen spells' round painted emblems
(art-source/spell-fx/h-kings/icons/<key>.png, 256 px, made for this game) into the two places the game reads them:

  - src/art/fx/abilities/atlas-9.png: a 4 x 4 grid of 192 px cells, the authored art each king's spell's release and hit are drawn from
    (`abilityArt.ts`, the same as atlases 0 to 7), with a row for each in src/art/fx/abilities/catalogue.json;
  - src/art/fx/kings/icons.webp: one strip of 64 px emblems, the spell's icon on its orb and in the spellbook (`spellIcons.ts`).

Usage: python3 -I tools/king-spells/icons.py   (re-run whenever the emblems change; the sources are never changed)
"""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'art-source/spell-fx/h-kings/icons'
# The spell each emblem is for, in the order the strip and the atlas hold them, and the painting's words (the art's README).
KINGS = [
    ('firewall', 'wallOfFire', 'a roaring line of flame rising, burning and dispersing'),
    ('icewall', 'iceWall', 'a jagged blue crystal wall with frost glints and shattering shards'),
    ('shatter', 'shatter', 'an empty frozen shell bursting into blue shards'),
    ('gale', 'gale', 'sweeping teal wind with leaves and curved streaks'),
    ('thunderclap', 'thunderclap', 'an overhead thunder burst and a flattened shockwave ring'),
    ('snare', 'thornSnare', 'dark thorny vines erupting and wrapping an empty space'),
    ('charm', 'charm', 'pink-violet hearts and swirling glamour'),
    ('foresight', 'foresight', 'a golden third eye under a soft violet veil'),
    ('sunbeam', 'sunbeam', 'a golden shaft of sunlight and spreading radiance'),
    ('venom', 'venomFang', 'spectral green serpent fangs striking'),
    ('mirage', 'mirage', 'wavering coloured heat-haze after-images'),
    ('drain', 'drainLife', 'a crimson ribbon of life drawn away'),
    ('bonewall', 'boneWall', 'ivory bones and skulls rising through violet mist'),
    ('raisedead', 'raiseDead', 'a flattened necromantic sigil and a rising skeletal hand'),
]
CELL, COLS = 192, 4
ICON = 64

atlas = Image.new('RGBA', (CELL * COLS, CELL * COLS), (0, 0, 0, 0))
strip = Image.new('RGBA', (ICON * len(KINGS), ICON), (0, 0, 0, 0))
for i, (_id, key, _words) in enumerate(KINGS):
    img = Image.open(SRC / f'{key}.png').convert('RGBA')
    atlas.alpha_composite(img.resize((CELL, CELL), Image.LANCZOS), ((i % COLS) * CELL, (i // COLS) * CELL))
    strip.alpha_composite(img.resize((ICON, ICON), Image.LANCZOS), (i * ICON, 0))
atlas.save(ROOT / 'src/art/fx/abilities/atlas-9.png', optimize=True)
(ROOT / 'src/art/fx/kings').mkdir(parents=True, exist_ok=True)
strip.save(ROOT / 'src/art/fx/kings/icons.webp', quality=90, method=6)

cat_path = ROOT / 'src/art/fx/abilities/catalogue.json'
catalogue = [row for row in json.loads(cat_path.read_text()) if row.get('atlas') != 9]
for i, (sid, _key, words) in enumerate(KINGS):
    catalogue.append({'id': f'spell:{sid}', 'name': sid, 'motif': words, 'atlas': 9, 'cell': i})
cat_path.write_text(json.dumps(catalogue, indent=2) + '\n')
(ROOT / 'src/art/fx/kings/icons.json').write_text(json.dumps([sid for sid, _k, _w in KINGS]) + '\n')
print('atlas-9.png', (ROOT / 'src/art/fx/abilities/atlas-9.png').stat().st_size // 1024, 'KB; icons.webp', (ROOT / 'src/art/fx/kings/icons.webp').stat().st_size // 1024, 'KB')
