#!/usr/bin/env python3
"""Contact sheet of the actual shipped remake cells, front and rear."""
import json
from PIL import Image, ImageDraw
from pack import HEROES, ROOT, UNITS, REVIEW

layout = json.loads((UNITS / 'sheets.json').read_text())
config = json.loads((ROOT / 'tools/heritage/heroes.json').read_text())
names = ['Selam / Cleric', 'Tiago / Buccaneer', 'Ravi / Fire Wizard',
         'Luana / Illusionist', 'Adaeze / Time Witch', 'Minh / Peasant',
         'Inti / Ranger', 'Tiziri / Queen Dragoon', 'Malia / Lightning Mage',
         'Seydou / Great Sage']
out = Image.new('RGB', (1400, 1160), (40, 42, 54))
d = ImageDraw.Draw(out)
for i, hero in enumerate(HEROES):
    x, y = (i % 5) * 280, (i // 5) * 580
    d.text((x + 8, y + 5), names[i], fill='white')
    for view, sheet in enumerate(config[hero]['sheets']):
        a = Image.open(UNITS / f'{sheet}.png').convert('RGBA')
        l = layout[sheet]
        for r, (row, frame) in enumerate([('idle', 0), ('walk', 3), ('attack', 2), ('dead', 3)]):
            yy = l['rows'].index(row) * l['h']
            im = a.crop((frame * l['w'], yy, (frame + 1) * l['w'], yy + l['h']))
            im = im.crop(im.getbbox())
            # Uniformly preserve the packed native pixels in this overview.
            out.paste(im, (x + view * 140 + (140 - im.width) // 2,
                           y + 28 + r * 135 + 125 - im.height), im)
            if view == 0:
                d.text((x + 2, y + 28 + r * 135), row, fill=(150, 160, 175))
REVIEW.mkdir(parents=True, exist_ok=True)
out.save(REVIEW / 'lineup.png')
