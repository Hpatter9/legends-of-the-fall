"""ROUND5-WIRE: lay round 5's awakened sheets (art-source/round5/awakened_<kind>.png and _back.png, each on its hero's own 4 x 7 grid)
side by side into the packer's source layout, tools/ascended/source/<kind>.png (8 cells across, the front's four then the back's, 7 rows),
and add each hero to roster.json (`keepArt`: its painted awakened portrait, src/art/heroes/awakened-<kind>.webp, is kept, not replaced by
an enlarged sprite). Then: node tools/ascended/pack.cjs <kinds>.

  python3 tools/ascended/round5.py
"""
import json, os
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
KINDS = {'vampireLord': 'vampire_lord', 'hemomancer': 'hemomancer', 'nightstalker': 'nightstalker', 'bloodGargoyle': 'blood_gargoyle', 'dhampir': 'dhampir',
         'warDrummer': 'war_drummer', 'banneret': 'banneret', 'geomancer': 'geomancer', 'bellWarden': 'bell_warden', 'falconer': 'falconer',
         'astralSphinx': 'astral_sphinx', 'mirageDancer': 'mirage_dancer', 'plagueDoctor': 'plague_doctor', 'bombardier': 'bombardier', 'astrologer': 'astrologer',
         'inquisitor': 'inquisitor', 'seraph': 'seraph', 'corsairSurgeon': 'corsair_surgeon', 'harpooner': 'harpooner', 'seaReaver': 'sea_reaver'}

os.makedirs(os.path.join(ROOT, 'tools/ascended/source'), exist_ok=True)
roster_p = os.path.join(ROOT, 'tools/ascended/roster.json')
roster = json.load(open(roster_p))
have = {r['id'] for r in roster}
for kind, base in KINDS.items():
    f = Image.open(os.path.join(ROOT, f'art-source/round5/awakened_{kind}.png')).convert('RGBA')
    b = Image.open(os.path.join(ROOT, f'art-source/round5/awakened_{kind}_back.png')).convert('RGBA')
    src = Image.new('RGBA', (f.width + b.width, f.height))
    src.paste(f, (0, 0)); src.paste(b, (f.width, 0))
    src.save(os.path.join(ROOT, f'tools/ascended/source/{kind}.png'))
    if kind not in have:
        roster.append({'id': kind, 'name': kind, 'base': f'hero_res_{base}', 'rear': f'hero_res_{base}_back', 'figure': 96, 'keepArt': True,
                       'note': 'ROUND5-WIRE: art-source/round5 (the round-5 prompt in docs/notes/art-remaining-prompt.md)'})
open(roster_p, 'w').write(json.dumps(roster, indent=2) + '\n')
print(' '.join(KINDS))
