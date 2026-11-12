"""ULT-AUDIT (docs/notes/ult-audit.md): every hero's wind-up and strike with the colour taken out, side by side, to see that no two
could be taken for each other by shape alone.

    python3 tools/blender-fx/grey_sheet.py <out.jpg> [windup|strike|aftermath ...]

Reads the game's manifest and atlases; draws each clip's held frame (the one reduced motion shows) in grey, a row of ten heroes at a time.
"""
import json
import re
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps

ROOT = Path(__file__).resolve().parents[2]
src = (ROOT / 'src/render/blenderFxData.ts').read_text()
clips = {m[1]: json.loads(m[2]) for m in re.finditer(r"^  '([\w-]+)': (\{.*\}),$", src, re.M)}
out, stages = sys.argv[1], sys.argv[2:] or ['windup', 'strike']
kinds = [k[4:-7] for k in clips if k.startswith('ult-') and k.endswith('-strike')]
CELL, PER = 150, 10
pages = {}
rows = -(-len(kinds) // PER)
sheet = Image.new('RGB', (PER * CELL, rows * len(stages) * (CELL + 12)), (24, 26, 32))
d = ImageDraw.Draw(sheet)
for i, kind in enumerate(kinds):
    for j, stage in enumerate(stages):
        c = clips[f'ult-{kind}-{stage}']
        page = pages.setdefault(c['a'], Image.open(ROOT / f"src/art/fx/blender/px-{c['a']}.webp").convert('RGBA'))
        f = c['hold']
        x, y = c['x'] + (f % c['cols']) * c['w'], c['y'] + (f // c['cols']) * c['h']
        im = page.crop((x, y, x + c['w'], y + c['h']))
        grey = ImageOps.grayscale(im.convert('RGB')).convert('RGBA')
        grey.putalpha(im.getchannel('A'))
        grey.thumbnail((CELL - 6, CELL - 6), Image.Resampling.NEAREST)
        cx, cy = (i % PER) * CELL, ((i // PER) * len(stages) + j) * (CELL + 12)
        sheet.paste(grey, (cx + (CELL - grey.width) // 2, cy + 12 + (CELL - grey.height) // 2), grey)
        d.text((cx + 3, cy + 1), f'{kind} {stage}'[:24], fill=(255, 235, 170))
sheet.save(out, quality=80)
print(out, sheet.size, len(kinds), 'heroes')
