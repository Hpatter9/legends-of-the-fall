"""One comparison sheet per screen: today and the four styles side by side, labelled. python3 -I tools/ui/compare.py"""
from PIL import Image, ImageDraw, ImageFont
import glob
FONT = None
for f in glob.glob('/usr/share/fonts/**/DejaVuSans-Bold.ttf', recursive=True): FONT = ImageFont.truetype(f, 22)
cols = [('today', 'Today'), ('a', 'A  Wood and gold'), ('b', 'B  Stone and iron'), ('c', 'C  Parchment and ink'), ('d', 'D  Royal arcane')]
for scr in ['battle', 'heroes', 'sheet', 'armies', 'castle', 'recruit', 'fight', 'recap']:
    ims = [Image.open(f'docs/samples/ui-style-{k}-{scr}.png').convert('RGB') for k, _ in cols]
    w, h = ims[0].size; gap = 12; top = 40
    sh = Image.new('RGB', (len(cols) * w + (len(cols) + 1) * gap, h + top + gap), (24, 24, 28))
    d = ImageDraw.Draw(sh)
    for i, ((k, lab), im) in enumerate(zip(cols, ims)):
        x = gap + i * (w + gap); sh.paste(im, (x, top)); d.text((x + 4, 8), lab, fill=(240, 240, 240), font=FONT)
    sh.save(f'docs/samples/ui-style-compare-{scr}.png', optimize=True)
print('ok')
