# MENU-GLITCH frame strips (docs/notes/menu-glitch.md): a row of a change's kept frames (scan.mjs --keep), each captioned with its
# number and time, marked red where the scan flagged it.
#   python3 tools/menu-glitch/strip.py <frames dir of one change> <first> <last> <out.png> [flagged,frames] [scale]
import json, os, sys
from PIL import Image, ImageDraw

d, first, last, out = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
flagged = {int(x) for x in sys.argv[5].split(',') if x} if len(sys.argv) > 5 else set()
scale = float(sys.argv[6]) if len(sys.argv) > 6 else 0.5
times = json.load(open(os.path.join(d, 'times.json')))
idx = [i for i in range(first, last + 1) if os.path.exists(os.path.join(d, f'{i:03d}.png'))]
ims = [Image.open(os.path.join(d, f'{i:03d}.png')).convert('RGB') for i in idx]
w, h = ims[0].size
tw, th = int(w * scale), int(h * scale)
gap, cap = 6, 22
sheet = Image.new('RGB', (len(ims) * (tw + gap) + gap, th + cap + gap), (24, 24, 28))
g = ImageDraw.Draw(sheet)
for k, (i, im) in enumerate(zip(idx, ims)):
    x = gap + k * (tw + gap)
    bad = i in flagged
    if bad:
        g.rectangle([x - 3, cap - 3, x + tw + 2, cap + th + 2], outline=(230, 40, 40), width=3)
    sheet.paste(im.resize((tw, th)), (x, cap))
    g.text((x + 2, 4), f'#{i}  {times[i] if i < len(times) else "?"} ms{"  GLITCH" if bad else ""}', fill=(255, 90, 90) if bad else (220, 220, 220))
sheet.save(out)
print(out, len(ims), 'frames')
