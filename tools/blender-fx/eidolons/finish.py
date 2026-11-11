"""The pixelated finish for a Blender-staged summoning, and the samples that show it over a real battle (docs/notes/eidolon-blender.md).

Run: python3 tools/blender-fx/eidolons/finish.py <frames dir> <today's shots dir> <out dir>

  <frames dir>          askel.py's frames (see-through, 1.5 times the final pixel size)
  <today's shots dir>   shots.mjs's pictures: plate.png (the fight as the horn is blown), plate.json and today-askel-<ms>.png

The finish the owner chose (tools/blender-fx/README.md): each frame is shrunk to the heroes' pixels, cut to a small palette shared by the
whole show, its alpha hardened (the dark smoke and scorch keep a few flat steps of see-through, so the ground shows through them), and the
brightest parts keep a soft glow underneath. It writes into <out dir>:

  askel-cast.webp              the whole cast over the battle at 393 x 852 (animated, 12 frames a second)
  askel-stages.png             a strip of the stages
  askel-today-vs-blender.png   today's fire Eidolon against this one
  askel-sheet.webp             the pixel frames as one sheet, and askel-glow-sheet.webp the glow's (what would ship; sizes printed)
"""
import glob, json, math, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

SRC, TODAY, OUT = sys.argv[-3:]
FPS = 12
FW, FH = 300, 420               # the frame in the heroes' pixels (askel.py)
COLOURS = 24
# Where the frame lies on the 393 x 852 screen: a hero's pixel is 1.313 screen pixels in this fight (the board is drawn at 0.9287, and a
# hero's pixel is about 1.414 of the board's), and the frame's top is at y = 70 (askel.py's AIM is worked out from the same numbers, on ground 58 steps high; the heroes' ground is a
# step or two lower, so the frame is laid 10 pixels down).
ZOOM = 1.313
TOP = 70
SW, SH = 393, 852
os.makedirs(OUT, exist_ok=True)


def premul(im):
    a = np.asarray(im.convert('RGBA'), dtype=np.float32) / 255
    a[..., :3] *= a[..., 3:]
    return a


def shrink(a, w, h):
    """Shrink a premultiplied picture by averaging."""
    im = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8), 'RGBA')
    return np.asarray(im.resize((w, h), Image.BOX), dtype=np.float32) / 255


files = sorted(glob.glob(os.path.join(SRC, '[0-9][0-9][0-9].png')))
smooth = [shrink(premul(Image.open(f)), FW, FH) for f in files]
print('frames', len(smooth))

# ---- the pixel layer ---------------------------------------------------------------------------------------------------------------------

def straight(p):
    a = p[..., 3:]
    rgb = np.where(a > 0.001, p[..., :3] / np.maximum(a, 0.001), 0)
    return np.clip(rgb, 0, 1), a[..., 0]


def harden(rgb, a):
    """Bright pixels are there or not; dark ones (smoke, scorch) keep three flat steps of see-through."""
    lum = rgb @ np.array([0.3, 0.59, 0.11], dtype=np.float32)
    bright = lum > 0.22
    hard = np.where(a >= 0.4, 1.0, 0.0)
    steps = np.select([a < 0.14, a < 0.34, a < 0.6], [0.0, 0.3, 0.55], 0.8)
    # (a 3 x 3 median over the dark steps, so render grain does not pepper the smoke)
    im = Image.fromarray((steps * 255).astype(np.uint8), 'L').filter(ImageFilter.MedianFilter(3))
    steps = np.asarray(im, dtype=np.float32) / 255
    return np.where(bright, hard, steps)


# (the palette: from every frame's solid pixels, so the fire is the same fire from the sigil to the last ember)
pool = []
for p in smooth:
    rgb, a = straight(p)
    keep = harden(rgb, a) > 0
    pool.append(rgb[keep][::7])
pool = np.concatenate(pool)
pool_im = Image.fromarray((pool[: (len(pool) // 256) * 256].reshape(-1, 256, 3) * 255).astype(np.uint8), 'RGB')
palette = pool_im.quantize(colors=COLOURS, method=Image.MEDIANCUT, kmeans=3)

pixel = []     # straight RGBA, uint8, FW x FH
glows = []     # premultiplied RGB float, FW x FH: the light under the brightest parts
for p in smooth:
    rgb, a = straight(p)
    aa = harden(rgb, a)
    q = Image.fromarray((rgb * 255).astype(np.uint8), 'RGB').quantize(palette=palette, dither=Image.NONE).convert('RGB')
    out = np.dstack([np.asarray(q), (aa * 255).astype(np.uint8)])
    out[aa == 0] = 0
    pixel.append(out)
    lum = p[..., :3] @ np.array([0.3, 0.59, 0.11], dtype=np.float32)
    hot = p[..., :3] * np.clip((lum - 0.42) * 3.0, 0, 1)[..., None]
    g = Image.fromarray((np.clip(hot, 0, 1) * 255).astype(np.uint8), 'RGB').filter(ImageFilter.GaussianBlur(7))
    glows.append(np.asarray(g, dtype=np.float32) / 255 * 0.75)

# ---- over the battle ------------------------------------------------------------------------------------------------------------------------

plate = np.asarray(Image.open(os.path.join(TODAY, 'plate.png')).convert('RGB'), dtype=np.float32) / 255
BW, BH = round(FW * ZOOM), round(FH * ZOOM)


def seg(t, a, b):
    return max(0.0, min(1.0, (t - a) / (b - a)))


def over_battle(i, scale=1):
    """Frame `i` laid over the fight: the screen dimmed as today's call dims it, the glow added, the pixels on top."""
    t = i / FPS
    dim = 0.45 * seg(t, 0.0, 0.5) * (1 - seg(t, 6.9, 7.9))
    base = plate * (1 - dim)
    w, h = SW * scale, SH * scale
    base = np.asarray(Image.fromarray((base * 255).astype(np.uint8)).resize((w, h), Image.NEAREST), dtype=np.float32) / 255
    box = (0, TOP * scale, BW * scale, (TOP + BH) * scale)
    g = Image.fromarray((np.clip(glows[i], 0, 1) * 255).astype(np.uint8), 'RGB').resize((BW * scale, BH * scale), Image.BILINEAR)
    gl = np.zeros_like(base)
    x1, y1 = min(w, box[2]), min(h, box[3])
    gl[box[1]:y1, 0:x1] = (np.asarray(g, dtype=np.float32) / 255)[: y1 - box[1], : x1]
    base = 1 - (1 - base) * (1 - gl)                                         # the glow, as light
    px = Image.fromarray(pixel[i], 'RGBA').resize((BW * scale, BH * scale), Image.NEAREST)
    im = Image.fromarray((np.clip(base, 0, 1) * 255).astype(np.uint8), 'RGB')
    im.paste(px, (0, box[1]), px)
    return im


frames = [over_battle(i) for i in range(len(pixel))]
frames[0].save(os.path.join(OUT, 'askel-cast.webp'), save_all=True, append_images=frames[1:], duration=round(1000 / FPS), loop=0, quality=82, method=4)
try:
    font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 15)
except OSError:
    font = ImageFont.load_default()


def label(im, text):
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, im.width, 22), fill=(16, 12, 10))
    d.text((6, 3), text, fill=(255, 226, 170), font=font)
    return im


# The stages, in two rows of four (the board's part of the screen, at twice the size so the pixels show).
STAGES = [(0.9, 'The sigil burns on'), (2.0, 'The heat gathers'), (2.5, 'The pillar'), (3.1, 'It rises'), (3.55, 'The slam'), (4.1, 'The howl'), (5.3, 'The breath'), (7.0, 'The aftermath')]
cw, ch = SW * 2, 600 * 2
strip = Image.new('RGB', (cw * 4, (ch + 22) * 2), (16, 12, 10))
for k, (t, name) in enumerate(STAGES):
    i = min(len(pixel) - 1, round(t * FPS))
    cell = over_battle(i, 2).crop((0, 40 * 2, cw, 40 * 2 + ch))
    tile = Image.new('RGB', (cw, ch + 22), (16, 12, 10))
    tile.paste(cell, (0, 22))
    strip.paste(label(tile, f'{t:.1f} s  {name}'), ((k % 4) * cw, (k // 4) * (ch + 22)))
strip = strip.resize((strip.width // 2, strip.height // 2), Image.LANCZOS) if os.environ.get('SMALL') else strip
strip.save(os.path.join(OUT, 'askel-stages.png'), optimize=True)

# Today's against the Blender one: the figure, and the strike.
def today(ms):
    return Image.open(os.path.join(TODAY, f'today-askel-{ms:04d}.png')).convert('RGB')


pairs = [(today(1050), "Today: the painted figure's pass (1.0 s of 4)"), (frames[round(4.1 * FPS)], 'Blender: the hound, howling (4.1 s of 8)'),
         (today(3000), 'Today: the breath and the fire walls (3.0 s)'), (frames[round(5.3 * FPS)], 'Blender: the breath (5.3 s)')]
side = Image.new('RGB', (SW * 4 + 18, SH + 22), (16, 12, 10))
for k, (im, name) in enumerate(pairs):
    tile = Image.new('RGB', (SW, SH + 22), (16, 12, 10))
    tile.paste(im, (0, 22))
    side.paste(label(tile, name), (k * (SW + 6), 0))
side.save(os.path.join(OUT, 'askel-today-vs-blender.png'), optimize=True)

# What would ship: the pixel frames as one sheet (lossless), and the glow's at a quarter of the size (it is a blur).
cols = 12
rows = math.ceil(len(pixel) / cols)
sheet = Image.new('RGBA', (FW * cols, FH * rows), (0, 0, 0, 0))
gsheet = Image.new('RGB', (FW // 4 * cols, FH // 4 * rows), (0, 0, 0))
for i, p in enumerate(pixel):
    sheet.paste(Image.fromarray(p, 'RGBA'), ((i % cols) * FW, (i // cols) * FH))
    g = Image.fromarray((np.clip(glows[i], 0, 1) * 255).astype(np.uint8), 'RGB').resize((FW // 4, FH // 4), Image.BILINEAR)
    gsheet.paste(g, ((i % cols) * (FW // 4), (i // cols) * (FH // 4)))
sheet.save(os.path.join(OUT, 'askel-sheet.webp'), lossless=True, method=6)
gsheet.save(os.path.join(OUT, 'askel-glow-sheet.webp'), quality=80, method=6)
for n in ('askel-cast.webp', 'askel-stages.png', 'askel-today-vs-blender.png', 'askel-sheet.webp', 'askel-glow-sheet.webp'):
    print(n, os.path.getsize(os.path.join(OUT, n)), 'bytes')
print('sheet', sheet.size, 'frames', len(pixel))
