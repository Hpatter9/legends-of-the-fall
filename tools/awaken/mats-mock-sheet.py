# Lays the AWAKEN-MATS mock-ups (393x852) side by side with the ore icons under them: docs/samples/awaken-mats-mock-sheet.png.
#   python3 tools/awaken/mats-mock-sheet.py   (after node tools/awaken/mats-mock.mjs)
from PIL import Image, ImageDraw
NAMES = ['panel-short', 'panel-ready', 'recap', 'victory', 'pouch']
shots = [Image.open(f'docs/samples/awaken-mats-mock-{n}.png').convert('RGB') for n in NAMES]
w, h = 393, 852
sheet = Image.new('RGB', (len(shots) * (w + 12) + 12, h + 150), (24, 20, 30))
d = ImageDraw.Draw(sheet)
for i, (n, im) in enumerate(zip(NAMES, shots)):
    sheet.paste(im.resize((w, h), Image.LANCZOS), (12 + i * (w + 12), 34))
    d.text((12 + i * (w + 12), 10), f'MOCK-UP: {n}', fill=(240, 200, 110))
icons = Image.open('out/ore-icons-preview.png').convert('RGBA')
sheet.paste(icons, (12, h + 50), icons)
d.text((12, h + 128), 'The thirteen rift ores (Free Mining Pixel 32x32 Icons, Craftpix), tinted to each class aura', fill=(200, 190, 210))
sheet.save('docs/samples/awaken-mats-mock-sheet.png')
print('sheet', sheet.size)
