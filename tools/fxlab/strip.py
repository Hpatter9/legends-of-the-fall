# Lays a run of frames in one row at 45% size and keeps the peak frame in out/uniquepeaks/<name>.peak.png (for contact.py):
#   python3 -I strip.py out.png frame0.png frame1.png ...
import sys
from PIL import Image, ImageChops
out, files = sys.argv[1], sys.argv[2:]
ims = [Image.open(f).convert('RGB') for f in files]
w, h = ims[0].size
tw, th = int(w * 0.45), int(h * 0.45)
sheet = Image.new('RGB', (tw * len(ims), th))
for i, im in enumerate(ims):
    sheet.paste(im.resize((tw, th), Image.LANCZOS), (i * tw, 0))
sheet.quantize(96, method=Image.Quantize.MEDIANCUT).save(out, optimize=True)
# the peak: the frame with the most bright, saturated pixels after the first two (a burst at its biggest), leaving out a frame the
# one-shot screen flash has washed (its average brightness is well above the rest) and the dim of an ultimate hardly matters
from statistics import median
def lum(im):
    return sum(im.convert('L').resize((40, 56)).getdata()) / (40 * 56)
def glow(im):
    h, s, v = im.convert('HSV').split()
    return sum(1 for a, b in zip(s.getdata(), v.getdata()) if a > 110 and b > 190)
mid = median(lum(im) for im in ims)
cands = [i for i in range(2, len(ims)) if lum(ims[i]) < mid * 1.3] or list(range(2, len(ims)))
peak = max(cands, key=lambda i: glow(ims[i]))
import os
os.makedirs('out/uniquepeaks', exist_ok=True)
ims[peak].save(os.path.join('out/uniquepeaks', os.path.basename(out).replace('.png', '.peak.png')), optimize=True)
