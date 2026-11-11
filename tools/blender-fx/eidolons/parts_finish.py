"""The pixelated finish for Askel's pieces (parts.py), packed as the sheets the game loads (docs/notes/eidolon-blender.md).

Run: python3 tools/blender-fx/eidolons/parts_finish.py <parts dir> [<sheets dir>]      (default src/art/eidolons/fx)

Each frame is shrunk to the heroes' pixels, cut to 32 colours shared by all the pieces, and its alpha hardened (bright pixels are there or
not; the dark smoke and scorch keep three flat steps of see-through). The sheets are lossless WebP: a single row of frames for the pieces
the page plays as strips, rows of them for the explosion and for the ground's sheets (sigil, cracks); the explosion and the pillar
also get a glow sheet (`-glow`: the light under their brightest parts, a quarter of the size, lossy). `src/eidolonStage.ts` holds each sheet's
frame size and count, and a test checks them against the files. A contact sheet of every frame is written beside the parts.
"""
import glob, os, sys
import numpy as np
from PIL import Image, ImageFilter

args = sys.argv[1:]
SRC = args[0]
OUT = args[1] if len(args) > 1 else 'src/art/eidolons/fx'
COLOURS = 32
# (name: frame width, height, frames to a row)
PARTS = {'sigil': (160, 96, 6), 'pillar': (144, 352, 16), 'explosion': (320, 300, 8), 'cracks': (256, 136, 6), 'fire': (64, 112, 14), 'scorch': (88, 48, 8), 'smoke': (128, 176, 16), 'embers': (160, 200, 12)}
# (the big pieces keep a soft glow under their brightest parts: its own sheet, a quarter of the size, the same frames in the same places)
GLOW = ('pillar', 'explosion')
# (the explosion is rendered as 20 frames and shipped as 16: every frame of the blast itself, two in three of the long burn and the
# smoke after it, where one frame is much like the next; it takes a fifth off the largest sheet)
KEEP = {'explosion': [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 13, 14, 16, 17, 19]}
LUM = np.array([0.3, 0.59, 0.11], dtype=np.float32)


def shrink(path, w, h):
    a = np.asarray(Image.open(path).convert('RGBA'), dtype=np.float32) / 255
    a[..., :3] *= a[..., 3:]                                               # (averaged with the colour weighted by its alpha)
    im = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8), 'RGBA').resize((w, h), Image.BOX)
    p = np.asarray(im, dtype=np.float32) / 255
    al = p[..., 3]
    rgb = np.where(al[..., None] > 0.001, p[..., :3] / np.maximum(al[..., None], 0.001), 0)
    return np.clip(rgb, 0, 1), al


def harden(rgb, a):
    bright = rgb @ LUM > 0.22
    hard = np.where(a >= 0.4, 1.0, 0.0)
    steps = np.select([a < 0.14, a < 0.34, a < 0.6], [0.0, 0.3, 0.55], 0.8)
    steps = np.asarray(Image.fromarray((steps * 255).astype(np.uint8), 'L').filter(ImageFilter.MedianFilter(3)), dtype=np.float32) / 255
    return np.where(bright, hard, steps)


frames = {}
for name, (w, h, _) in PARTS.items():
    files = sorted(glob.glob(os.path.join(SRC, name, '[0-9][0-9][0-9].png')))
    frames[name] = [shrink(f, w, h) for f in files]
pool = np.concatenate([rgb[harden(rgb, a) > 0] for fs in frames.values() for rgb, a in fs])
pool_im = Image.fromarray((pool[: (len(pool) // 256) * 256].reshape(-1, 256, 3) * 255).astype(np.uint8), 'RGB')
palette = pool_im.quantize(colors=COLOURS, method=Image.MEDIANCUT, kmeans=3)

os.makedirs(OUT, exist_ok=True)
total = 0
contact = []
for name, (w, h, cols) in PARTS.items():
    # (the palette above is from every rendered frame, so dropping frames here changes no other sheet)
    fs = [f for i, f in enumerate(frames[name]) if name not in KEEP or i in KEEP[name]]
    rows = -(-len(fs) // cols)
    sheet = Image.new('RGBA', (w * cols, h * rows), (0, 0, 0, 0))
    for i, (rgb, a) in enumerate(fs):
        aa = harden(rgb, a)
        q = Image.fromarray((rgb * 255).astype(np.uint8), 'RGB').quantize(palette=palette, dither=Image.NONE).convert('RGB')
        px = np.dstack([np.asarray(q), (aa * 255).astype(np.uint8)])
        px[aa == 0] = 0
        sheet.paste(Image.fromarray(px, 'RGBA'), ((i % cols) * w, (i // cols) * h))
    path = os.path.join(OUT, f'askel-stage-{name}.webp')
    sheet.save(path, lossless=True, method=6)
    size = os.path.getsize(path)
    total += size
    if name in GLOW:
        gw, gh = w // 4, h // 4
        gsheet = Image.new('RGBA', (gw * cols, gh * rows), (0, 0, 0, 0))
        for i, (rgb, a) in enumerate(fs):
            lit = rgb * a[..., None]
            hot = lit * np.clip((lit @ LUM - 0.35) * 2.5, 0, 1)[..., None]
            g = np.asarray(Image.fromarray((np.clip(hot, 0, 1) * 255).astype(np.uint8), 'RGB').filter(ImageFilter.GaussianBlur(9)).resize((gw, gh), Image.BILINEAR), dtype=np.float32) / 255
            # (light, not paint: as see-through as it is dim, so it lays over the board without a dark box round it)
            ga = g.max(axis=2)
            grgb = np.where(ga[..., None] > 0.004, g / np.maximum(ga[..., None], 0.004), 0)
            gsheet.paste(Image.fromarray((np.dstack([np.clip(grgb, 0, 1), np.clip(ga * 1.25, 0, 1)]) * 255).astype(np.uint8), 'RGBA'), ((i % cols) * gw, (i // cols) * gh))
        gpath = os.path.join(OUT, f'askel-stage-{name}-glow.webp')
        gsheet.save(gpath, quality=78, alpha_quality=80, method=6)
        total += os.path.getsize(gpath)
        print(f'{name}-glow: {gsheet.width} x {gsheet.height}, {os.path.getsize(gpath)} bytes')
    contact.append(sheet)
    print(f'{name}: {len(fs)} frames of {w} x {h}, sheet {sheet.width} x {sheet.height}, {size} bytes')
print('total', total, 'bytes')
cw = max(c.width for c in contact)
sheet = Image.new('RGB', (cw, sum(c.height + 4 for c in contact)), (58, 92, 52))
y = 0
for c in contact:
    sheet.paste(c, (0, y), c)
    y += c.height + 4
sheet.save(os.path.join(SRC, 'contact.png'))
