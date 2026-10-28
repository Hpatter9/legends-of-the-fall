# Lays out the AWAKEN-MATS screens (after `node tools/awaken/mats-shots.mjs`): docs/samples/awaken-mats-sheet.png at 393x852,
# and docs/samples/awaken-mats-sizes.png with the 360x780 and 412x915 shots.
#   python3 tools/awaken/mats-sheet.py
from PIL import Image, ImageDraw
NAMES = ['panel-short', 'panel-ready', 'panel-pouch', 'pouch', 'recap', 'victory', 'army-card', 'army-result', 'chest']

def sheet(sfx, w, h, out, cols=5):
    rows = (len(NAMES) + cols - 1) // cols
    s = Image.new('RGB', (cols * (w + 12) + 12, rows * (h + 34) + 12), (24, 20, 30))
    d = ImageDraw.Draw(s)
    for i, n in enumerate(NAMES):
        im = Image.open(f'docs/samples/awaken-mats-{n}{sfx}.png').convert('RGB').resize((w, h), Image.LANCZOS)
        x, y = 12 + (i % cols) * (w + 12), 12 + (i // cols) * (h + 34)
        d.text((x, y), f'{n} ({sfx or "393"})', fill=(240, 200, 110))
        s.paste(im, (x, y + 20))
    s.save(out)
    print(out, s.size)

sheet('', 393, 852, 'docs/samples/awaken-mats-sheet.png')
sheet('-360', 300, 650, 'docs/samples/awaken-mats-360-sheet.png')
sheet('-412', 300, 666, 'docs/samples/awaken-mats-412-sheet.png')
