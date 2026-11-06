# The touch of the years, side by side (docs/notes/dynasty-5.md): crops the deploy shot of tools/dynasty/shots5.mjs (Kwame an Elder,
# Kenji a Veteran) beside the same deploy with every bearer a Youth, and writes docs/samples/dynasty-5/looks-<w>.png.
# python3 tools/dynasty/looks.py 393 [x y w h]  (the crop box in the shot's pixels; the default holds the squad on the 393 board)
import sys
from PIL import Image
w = sys.argv[1] if len(sys.argv) > 1 else '393'
box = tuple(int(v) for v in sys.argv[2:6]) if len(sys.argv) >= 6 else (370, 530, 330, 270)
x, y, bw, bh = box
aged = Image.open(f'docs/samples/dynasty-5/deploy-{w}.png').crop((x, y, x + bw, y + bh))
young = Image.open(f'out/shots/deploy-young-{w}.png').crop((x, y, x + bw, y + bh))
s = 2
out = Image.new('RGB', (bw * 2 * s + 12, bh * s), (20, 16, 10))
out.paste(young.resize((bw * s, bh * s), Image.NEAREST), (0, 0))
out.paste(aged.resize((bw * s, bh * s), Image.NEAREST), (bw * s + 12, 0))
out.save(f'docs/samples/dynasty-5/looks-{w}.png')
