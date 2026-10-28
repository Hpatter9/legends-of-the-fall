# Lays the mock-up cut-outs of tools/awaken/aura-mock.mjs into the AWAKEN-002 contact sheet and motion strips:
#   docs/samples/awaken-auras-mock-sheet.png, docs/samples/awaken-auras-mock-motion-<hero>.png
import json
from PIL import Image, ImageDraw, ImageFont
OUT = 'out/aura-mock'
meta = json.load(open(f'{OUT}/rows.json'))
K = 1.5
CW, CH = int(128 * K), int(160 * K)
LW, TOP = 230, 70
BG = (24, 26, 32)
def font(size):
    for p in ['/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', '/usr/share/fonts/dejavu/DejaVuSans.ttf']:
        try: return ImageFont.truetype(p, size)
        except OSError: pass
    return ImageFont.load_default()
F, FS, FB = font(24), font(18), font(30)
NAMES = {}
for line in open('src/render/auraStyles.ts'):
    if "{ trait: '" in line:
        t = line.split("trait: '")[1].split("'")[0]; NAMES[t] = line.split("name: '")[1].split("'")[0]
rows = meta['rows']
img = Image.new('RGB', (LW + CW * 3, TOP + CH * len(rows) + 64), BG)
d = ImageDraw.Draw(img)
d.text((12, 14), 'MOCK-UP · AWAKEN-002 class auras', fill=(255, 210, 74), font=FB)
for j, lab in enumerate(['Step 0 · rank 4', 'Step 1 · rank 5', 'Step 2 · rank 6']):
    d.text((LW + j * CW + 10, TOP - 10 - 18), lab, fill=(220, 220, 230), font=FS)
for i, (kind, trait) in enumerate(rows):
    y = TOP + i * CH
    d.text((12, y + CH // 2 - 40), trait.capitalize(), fill=(255, 255, 255), font=F)
    d.text((12, y + CH // 2 - 8), kind, fill=(170, 175, 190), font=FS)
    d.text((12, y + CH // 2 + 18), NAMES.get(trait, ''), fill=(150, 200, 255), font=FS)
    for j in range(3):
        im = Image.open(f'{OUT}/{kind}-{j}.png').convert('RGB').resize((CW, CH), Image.NEAREST)
        img.paste(im, (LW + j * CW, y))
    d.line((0, y, img.width, y), fill=(60, 64, 76))
d.text((12, img.height - 56), 'Heroes keep their own colours; the class trait picks the aura.', fill=(170, 175, 190), font=FS)
d.text((12, img.height - 30), 'Browser captures of the prototype on the fight board (step 0 is the top form, rank 4).', fill=(170, 175, 190), font=FS)
img.save('docs/samples/awaken-auras-mock-sheet.png', optimize=True)
for kind in meta['motion']:
    s = Image.new('RGB', (CW * 8, CH + 60), BG)
    dd = ImageDraw.Draw(s)
    dd.text((10, 14), f'MOCK-UP · {kind}, step 2, 8 frames 120 ms apart', fill=(255, 210, 74), font=F)
    for f in range(8):
        s.paste(Image.open(f'{OUT}/motion-{kind}-{f}.png').convert('RGB').resize((CW, CH), Image.NEAREST), (f * CW, 60))
    s.save(f'docs/samples/awaken-auras-mock-motion-{kind}.png', optimize=True)
print('sheet and', len(meta['motion']), 'motion strips written')
