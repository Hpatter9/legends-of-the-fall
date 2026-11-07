"""Animate the shipping treant idle/hurt rows for the handoff contact preview."""
import json
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
layout = json.loads((ROOT / 'src/art/units/sheets.json').read_text())
keys = ['cls_treant', 'cls_treant_2', 'cls_treant_3']
sheets = [Image.open(ROOT / 'src/art/units' / (key + '.png')).convert('RGBA') for key in keys]
frames = []
for tick in range(30):
    time = tick * 80
    out = Image.new('RGB', (720, 260), '#282c34')
    draw = ImageDraw.Draw(out)
    for i, key in enumerate(keys):
        entry = layout[key]
        hurt = 1200 <= time < 1440
        row = entry['rows'].index('hurt' if hurt else 'idle')
        cell = (time - 1200) // 80 if hurt else (time // 110) % entry['counts']['idle']
        image = sheets[i].crop((cell * entry['w'], row * entry['h'], (cell + 1) * entry['w'], (row + 1) * entry['h']))
        image = image.resize((round(image.width * 1.5), round(image.height * 1.5)), Image.Resampling.NEAREST)
        out.paste(image, (i * 240 + (240 - image.width) // 2, 230 - image.height), image)
        draw.text((i * 240 + 20, 240), f'Treant {i + 1}' + (' - recoil' if hurt else ''), fill='white')
    frames.append(out)
frames[0].save(ROOT / 'docs/samples/art-finish/treant-motion.gif', save_all=True, append_images=frames[1:], duration=80, loop=0)
