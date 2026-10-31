# EIDOLON-CALL-2: joins the frames tools/eidolon-call-2/shots.mjs takes into one strip per Eidolon (each frame at half size, labelled).
#   python3 tools/eidolon-call-2/strip.py <dir> <out-dir> <pick>[,<pick>...] [<tag>]
import sys
from PIL import Image, ImageDraw

src, out, picks = sys.argv[1], sys.argv[2], sys.argv[3].split(',')
tag = sys.argv[4] if len(sys.argv) > 4 else ''
FRAMES = ['horn', 'pass1', 'pass2', 'pass3', 'build', 'impact', 'after', 'resumed']
for pick in picks:
    ims = [Image.open(f'{src}/eidolon-call2-{pick}-{f}{tag}.png').convert('RGB') for f in FRAMES]
    w, h = ims[0].size
    w2, h2 = w // 2, h // 2
    strip = Image.new('RGB', (w2 * len(ims), h2 + 22), (16, 12, 8))
    d = ImageDraw.Draw(strip)
    for i, (f, im) in enumerate(zip(FRAMES, ims)):
        strip.paste(im.resize((w2, h2), Image.LANCZOS), (i * w2, 22))
        d.text((i * w2 + 6, 5), f, fill=(255, 226, 150))
    strip.save(f'{out}/eidolon-call2-{pick}-strip{tag}.png', optimize=True)
