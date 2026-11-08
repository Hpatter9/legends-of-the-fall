# EIDOLON-FX: joins the frames tools/eidolon-fx/shots.mjs takes into one strip per Eidolon (each frame at half size, labelled).
#   python3 tools/eidolon-fx/strip.py <dir> <out-dir> <pick>[,<pick>...] <suffix> [<tag>]
# writes <out-dir>/eidolon-fx-<pick>-<suffix>.png (suffix: before, after, ...)
import sys
from PIL import Image, ImageDraw

src, out, picks, suffix = sys.argv[1], sys.argv[2], sys.argv[3].split(','), sys.argv[4]
tag = sys.argv[5] if len(sys.argv) > 5 else ''
FRAMES = ['sprite', 'build1', 'build2', 'hit', 'impact1', 'impact2', 'impact3', 'shock', 'after1', 'after2']
for pick in picks:
    ims = [Image.open(f'{src}/eidolon-fx-{pick}-{f}{tag}.png').convert('RGB') for f in FRAMES]
    w, h = ims[0].size
    # (the top and the bottom are the bars and the HUD: the board's middle is what matters)
    top, bot = int(h * 0.08), int(h * 0.80)
    ims = [im.crop((0, top, w, bot)) for im in ims]
    w2, h2 = w // 2, (bot - top) // 2
    strip = Image.new('RGB', (w2 * len(ims), h2 + 22), (16, 12, 8))
    d = ImageDraw.Draw(strip)
    for i, (f, im) in enumerate(zip(FRAMES, ims)):
        strip.paste(im.resize((w2, h2), Image.LANCZOS), (i * w2, 22))
        d.text((i * w2 + 6, 5), f, fill=(255, 226, 150))
    strip.save(f'{out}/eidolon-fx-{pick}-{suffix}{tag}.png', optimize=True)
