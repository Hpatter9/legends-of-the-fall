"""Lay a scene's frames side by side in one strip: python3 tools/cinematics/strip.py <frames dir> <scene> <out.png> [suffix] [scale]"""
import glob, re, sys
from PIL import Image

d, scene, out = sys.argv[1:4]
suffix = sys.argv[4] if len(sys.argv) > 4 else ''
scale = float(sys.argv[5]) if len(sys.argv) > 5 else 0.5
pat = re.compile(rf'{scene}-(\d+){re.escape(suffix)}\.png$')
files = sorted((int(m.group(1)), f) for f in glob.glob(f'{d}/{scene}-*.png') if (m := pat.search(f)))
ims = [Image.open(f).convert('RGB') for _, f in files]
w, h = ims[0].size
tw, th = round(w * scale), round(h * scale)
strip = Image.new('RGB', (tw * len(ims) + 4 * (len(ims) - 1), th), (20, 20, 20))
for i, im in enumerate(ims):
    strip.paste(im.resize((tw, th), Image.LANCZOS), (i * (tw + 4), 0))
strip.save(out)
print(out, strip.size)
