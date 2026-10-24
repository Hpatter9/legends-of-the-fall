# The contact sheets of the unique spells: the peak frame of every hero's skill (contact-skills.png) and ultimate (contact-ults.png),
# nine across and labelled, so no two can hide as alike. Run after unique.mjs:  python3 -I tools/fxlab/contact.py
import json, os
from PIL import Image, ImageDraw, ImageFont
here = os.path.dirname(__file__)
dirp = os.path.join(here, '..', '..', 'docs', 'samples', 'unique-spells')
heroes = json.load(open(os.path.join(here, 'heroes.json')))
try:
    font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 12)
except OSError:
    font = ImageFont.load_default()
for kind, title in (('skill', 'skills'), ('ult', 'ults')):
    cells = [(h['name'], h['skill'] if kind == 'skill' else h['ult'], os.path.join(here, '..', '..', 'out', 'uniquepeaks', f'{i}-{kind}.peak.png')) for i, h in heroes.items() if kind == 'skill' or h.get('ult')]
    cells = [c for c in cells if os.path.exists(c[2])]
    cw, ch, cols, lab = 200, 285, 9, 30
    rows = (len(cells) + cols - 1) // cols
    sheet = Image.new('RGB', (cw * cols, (ch + lab) * rows), (20, 16, 26))
    d = ImageDraw.Draw(sheet)
    for n, (hero, name, f) in enumerate(cells):
        x, y = (n % cols) * cw, (n // cols) * (ch + lab)
        sheet.paste(Image.open(f).convert('RGB').resize((cw - 4, ch - 4), Image.LANCZOS), (x + 2, y + lab + 2))
        d.text((x + 4, y + 2), hero, fill=(255, 226, 122), font=font)
        d.text((x + 4, y + 15), name, fill=(220, 220, 230), font=font)
    sheet.quantize(160, method=Image.Quantize.MEDIANCUT).save(os.path.join(dirp, f'contact-{title}.png'), optimize=True)
    print(title, len(cells), sheet.size)
