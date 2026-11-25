"""AURAS-BLENDER: the before and after strips, from the photographs shots.sh leaves.

    python3 tools/blender-fx/auras/strips.py <before dir> <after dir> <out dir>

For each class (one hero of it) and each step (combat grade 2, the light aura; grade 3, the strong one): the old aura, then the
new one at two moments of its loop. One strip a class in <out>/aura-<class>.jpg, and two sheets of them all (`aura-all-g2.jpg`,
`aura-all-g3.jpg`).
"""
import os, sys
from PIL import Image, ImageDraw

HEROES = dict(guardian='knight', bulwark='kraken', blade='samurai', marksman='archer', gunner='rifleBot', caster='wizard', arcanist='astrax',
              support='priestess', beast='werewolf', assassin='mercenary', trickster='kitsune', warden='cleric', vanguard='lancer')
before, after, out = sys.argv[1:4]
os.makedirs(out, exist_ok=True)


def cell(d, hero, g, n, label):
    im = Image.open(os.path.join(d, f'aura-{hero}-g{g}-{n}.png')).convert('RGB')
    ImageDraw.Draw(im).text((6, 6), label, fill=(255, 255, 120))
    return im


rows = {2: [], 3: []}
for k, hero in HEROES.items():
    strip = None
    for j, g in enumerate((2, 3)):
        cells = [cell(before, hero, g, 1, f'{k} step {g - 1} before'), cell(after, hero, g, 1, f'{k} step {g - 1} after'), cell(after, hero, g, 3, 'after, later')]
        w, h = cells[0].size
        row = Image.new('RGB', (w * 3, h))
        for i, c in enumerate(cells):
            row.paste(c, (i * w, 0))
        rows[g].append(row)
        strip = strip or Image.new('RGB', (w * 3, h * 2))
        strip.paste(row, (0, j * h))
    strip.save(os.path.join(out, f'aura-{k}.jpg'), quality=88)
for g, rs in rows.items():
    w, h = rs[0].size
    cols = 2
    sheet = Image.new('RGB', (w * cols, h * -(-len(rs) // cols)))
    for i, r in enumerate(rs):
        sheet.paste(r, ((i % cols) * w, (i // cols) * h))
    sheet.save(os.path.join(out, f'aura-all-g{g}.jpg'), quality=85)
    print(sheet.size)
