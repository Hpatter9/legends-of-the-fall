"""Draws the pixel UI kit natively at its final size (no resizing) into src/art/ui/. Run: python3 -I tools/ui/frames.py
Each frame is a 9-slice: the page shows it with CSS border-image at a whole-number scale (image-rendering: pixelated)."""
import os
from PIL import Image
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'art', 'ui')
def rgb(h): return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) + (255,)
DEEP, WOOD1, WOOD2, WOOD3 = rgb('#1a0d07'), rgb('#3b2316'), rgb('#26150d'), rgb('#4a2c1c')
EDGE, GOLDLO, GOLD, GOLDHI = rgb('#8c5a32'), rgb('#b8761e'), rgb('#f0b44a'), rgb('#ffe48a')
T = (0, 0, 0, 0)

def box(w, h, rings, fill, corner_cut=True):
    """Concentric one-pixel rings, outermost first; the outermost ring's corner pixel is left clear."""
    im = Image.new('RGBA', (w, h), fill)
    px = im.load()
    for i, c in enumerate(rings):
        for x in range(i, w - i):
            top, bot = (c[0], c[1]) if isinstance(c, tuple) and isinstance(c[0], tuple) else (c, c)
            px[x, i] = top; px[x, h - 1 - i] = bot
        for y in range(i, h - i):
            px[i, y] = c[0] if isinstance(c[0], tuple) else c; px[w - 1 - i, y] = c[1] if isinstance(c[0], tuple) else c
    if corner_cut:
        for x, y in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)): px[x, y] = T
    return im, px

def panel():
    # 24x24, slice 8: dark outline, gold rim (lit on top), dark gap, wood bevel, wood, gold corner studs
    im, px = box(24, 24, [DEEP, (GOLDHI, GOLDLO), DEEP, EDGE], WOOD1)
    for ox, oy in ((4, 4), (19, 4), (4, 19), (19, 19)):
        for dx in (0, 1):
            for dy in (0, 1): px[ox + dx, oy + dy] = GOLD
        px[ox, oy] = GOLDHI; px[ox + 1, oy + 1] = GOLDLO
    # (a soft lighter band under the rim so the wood reads as lit from above)
    for x in range(5, 19): px[x, 5] = WOOD3
    return im

def button(rim_hi, rim_lo, fill, fill_hi, lip, lip_hi=None, rim_edge=None):
    # 16x16, slice 5 (bottom 6): outline, bevel rim, lit top band, flat fill, thick lower lip for the 3D press
    im = Image.new('RGBA', (16, 16), fill); px = im.load()
    for x in range(16):
        for y in range(16): px[x, y] = fill
    for y in (2, 3):
        for x in range(2, 14): px[x, y] = fill_hi
    for y in range(11, 14):
        for x in range(2, 14): px[x, y] = lip
    for x in range(2, 14): px[x, 13] = lip_hi or lip
    for x in range(1, 15): px[x, 1] = rim_hi; px[x, 14] = rim_lo
    for y in range(1, 15): px[1, y] = rim_hi; px[14, y] = rim_lo
    for x in range(16): px[x, 0] = DEEP; px[x, 15] = DEEP
    for y in range(16): px[0, y] = DEEP; px[15, y] = DEEP
    for x, y in ((0, 0), (15, 0), (0, 15), (15, 15)): px[x, y] = T
    for x, y in ((1, 1), (14, 1), (1, 14), (14, 14)): px[x, y] = DEEP
    return im

def card(rim, rim_lo, fill='#2a1a10'):
    # 10x10, slice 3: dark outline, rarity rim, darker inner rim, wood
    im, px = box(10, 10, [DEEP, rim, rim_lo], rgb(fill))
    return im

def trim():
    # 8x4 strip: a gold line between dark lines (the edge of a bar), tiled along it
    im = Image.new('RGBA', (8, 4)); px = im.load()
    cols = [DEEP, GOLDHI, GOLDLO, DEEP]
    for y in range(4):
        for x in range(8): px[x, y] = cols[y]
    return im

def wood():
    # 16x16 plank tile: dark wood with a few grain lines, tiles both ways
    im = Image.new('RGBA', (16, 16), WOOD1); px = im.load()
    for y in (7, 15):
        for x in range(16): px[x, y] = WOOD2
    for (x, y) in ((2, 1), (3, 1), (9, 3), (10, 3), (11, 3), (5, 5), (13, 6), (1, 9), (2, 9), (8, 11), (9, 11), (4, 13), (12, 14), (13, 14)):
        px[x, y] = WOOD3
    return im

def ribbon():
    # 32x16, slice 0 12 (left and right 12 px): a crimson band with gold edges and swallow-tailed ends
    w, h = 32, 16
    im = Image.new('RGBA', (w, h)); px = im.load()
    body = [rgb('#2a0a06'), GOLD, rgb('#c4232b'), rgb('#c4232b'), rgb('#d9573f'), rgb('#c4232b'), rgb('#c4232b'), rgb('#c4232b'), rgb('#c4232b'), rgb('#9c1a20'), rgb('#9c1a20'), rgb('#7a0f14'), GOLDLO, rgb('#2a0a06')]
    for x in range(w):
        for y in range(1, 15): px[x, y] = body[y - 1]
    for y in range(1, 15):  # swallow tails: a notch cut into each end
        n = 5 - abs(y - 7.5) * 0.8
        for x in range(0, max(0, int(n))): px[x, y] = T; px[w - 1 - x, y] = T
    for y in range(1, 15):  # a dark edge pixel on the outline of the notch
        n = int(5 - abs(y - 7.5) * 0.8)
        if n > 0: px[n, y] = rgb('#2a0a06'); px[w - 1 - n, y] = rgb('#2a0a06')
    return im

def save(name, im): im.save(os.path.join(OUT, name + '.png'))
os.makedirs(OUT, exist_ok=True)
save('panel', panel())
save('btn', button(EDGE, rgb('#4a2c1c'), rgb('#5a3520'), rgb('#6b4128'), rgb('#3b2316')))
save('btn-gold', button(rgb('#fff2c0'), GOLDLO, rgb('#e8962a'), rgb('#f0b44a'), rgb('#b8761e'), rgb('#8a4f12')))
save('btn-down', button(rgb('#4a2c1c'), EDGE, rgb('#3b2316'), rgb('#3b2316'), rgb('#3b2316')))
save('btn-gold-down', button(GOLDLO, rgb('#fff2c0'), rgb('#c4761e'), rgb('#c4761e'), rgb('#c4761e')))
save('btn-off', button(rgb('#5a5048'), rgb('#2e2824'), rgb('#3e3732'), rgb('#4a423c'), rgb('#2e2824')))
RAR = {'': ('#6b4128', '#3b2316'), 'r1': ('#9a9a9a', '#555555'), 'r2': ('#4a9cff', '#2c5aa0'), 'r3': ('#b06aff', '#6a3aa8'), 'r4': ('#f0b44a', '#b8761e'), 'r5': ('#ff3a4a', '#a01828'), 'chosen': ('#ffe48a', '#f0b44a')}
for k, (a, b) in RAR.items(): save('card' + ('-' + k if k else ''), card(rgb(a), rgb(b)))
save('card-on', card(GOLDHI, GOLDLO, '#e0912a'))
def flag():
    # 8x11 war banner for a placed card: gold bar on top, crimson cloth with gold crossed blades, a swallow tail
    im = Image.new('RGBA', (8, 11)); px = im.load()
    for x in range(8): px[x, 0] = DEEP; px[x, 1] = GOLD
    for y in range(2, 11):
        for x in range(1, 7): px[x, y] = rgb('#c4232b') if x < 5 else rgb('#8e1218')
        px[0, y] = DEEP; px[7, y] = DEEP
    for x, y in ((2, 3), (5, 3), (3, 4), (4, 4), (3, 5), (4, 5), (2, 6), (5, 6)): px[x, y] = GOLDHI
    for x, y in ((3, 8), (4, 8), (3, 9), (4, 9), (3, 10), (4, 10)): px[x, y] = T
    px[2, 9] = DEEP; px[5, 9] = DEEP; px[2, 10] = DEEP; px[5, 10] = DEEP
    return im
save('flag', flag())
t = trim()
save('trim-t', t)                                   # on the top edge of a bar
save('trim-b', t.transpose(Image.FLIP_TOP_BOTTOM))  # on the bottom edge
save('trim-l', t.transpose(Image.ROTATE_90))        # on the left edge
save('trim-r', t.transpose(Image.ROTATE_270))       # on the right edge
save('wood', wood())
save('ribbon', ribbon())
