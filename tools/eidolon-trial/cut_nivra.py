# EIDOLON-TRIAL: Nivra's fighter sheet for her trial, from the owner's generated sheet (art-source/eidolons/gemini/nivra-sheet.jpg, from the
# branch art/gemini-eidolons: 4 rows x 6 frames, side view facing right, on magenta; row 1 idle, row 2 the slither, row 3 rising, row 4 the
# frost breath, its frames 4 and 5 with the wyrm's coils cropped at the left and the breath's cone running to the cell's edge).
#
# Cut as tools/eidolon-call-2/cut_askel.py cuts Askel's (branch claude/eidolon-call-2):
# - The magenta is keyed out with a tolerance (a JPEG: the pink halo round the edges goes too), hard alpha, crisp edges.
# - Each cell is brought down by a whole factor (K) a block at a time: a block is solid if most of it is, its colour the mean of its
#   solid pixels; what is left of the pink tint on the edges is taken out.
# - The breath: the wyrm is kept whole (frame 3's coils under frame 4's head and neck, matched at the crest and the ground), the breath
#   leaving her jaws; frame 5 (its cone cut off by the cell, its pose not meeting the coils) is frame 4 held a second beat.
# - Every frame stands on one baseline and is centred on the wyrm's coils (not on the cone).
#
# Writes src/art/units/eidolon_nivra.png, rows walk, attack, idle, hurt, dead (the layout the fighters' sheets use, `sheets.json`):
#   walk the slither, attack the breath, idle, hurt the rise's first frames, dead the rise run backwards (she sinks).
#   python3 tools/eidolon-trial/cut_nivra.py
import json
import numpy as np
from PIL import Image

SRC = 'art-source/eidolons/gemini/nivra-sheet.jpg'
OUT = 'src/art/units/eidolon_nivra.png'
K = 3
a = np.asarray(Image.open(SRC).convert('RGB')).astype(np.int32)
H, W = a.shape[:2]
CW, CH = W / 6, H / 4


def key(px):
    r, g, b = px[..., 0], px[..., 1], px[..., 2]
    return (np.minimum(r, b) - g) < 55


def down(px, solid):
    h, w = solid.shape[0] // K, solid.shape[1] // K
    px = px[: h * K, : w * K].reshape(h, K, w, K, 3)
    s = solid[: h * K, : w * K].reshape(h, K, w, K)
    n = s.sum(axis=(1, 3))
    out = np.zeros((h, w, 4), np.uint8)
    tot = (px * s[..., None]).sum(axis=(1, 3))
    ok = n >= (K * K) // 2 + 1
    col = (tot / np.maximum(n, 1)[..., None]).astype(np.int32)
    r, g, b = col[..., 0], col[..., 1], col[..., 2]
    tint = np.minimum(r, b) - g
    fix = tint > 25
    col[..., 0] = np.where(fix, np.minimum(r, g), r)
    col[..., 2] = np.where(fix, np.minimum(b, g + 30), b)
    out[..., :3] = np.clip(col, 0, 255)
    out[..., 3] = np.where(ok, 255, 0)
    return out


def cell(row, col):
    x0, x1 = round(col * CW), round((col + 1) * CW)
    y0, y1 = round(row * CH), round((row + 1) * CH)
    px = a[y0:y1, x0:x1]
    sp = down(px, key(px))
    sp[:, :1, 3] = 0
    sp[:, -1:, 3] = 0
    sp[:1, :, 3] = 0
    sp[-1:, :, 3] = 0
    return sp


def drop_specks(sp, least=6):
    """Lone specks of colour (JPEG noise left by the key) are dropped: a solid pixel with fewer than `least` solid neighbours in its 5x5."""
    s = sp[..., 3] > 0
    p = np.pad(s, 2)
    n = sum(p[2 + dy : 2 + dy + s.shape[0], 2 + dx : 2 + dx + s.shape[1]] for dy in range(-2, 3) for dx in range(-2, 3))
    sp[..., 3] = np.where(s & (n >= least), 255, 0)
    return sp


def feet(sp):
    return np.nonzero(sp[..., 3].any(axis=1))[0].max()


def crest(sp, within=None):
    """The top of the crest: the x of the highest solid pixels (only those left of `within`, so the breath's cone is not taken for it)."""
    ys, xs = np.nonzero(sp[..., 3])
    if within is not None:
        keep = xs < within
        ys, xs = ys[keep], xs[keep]
    top = ys.min()
    return xs[ys <= top + 2].mean(), top


def mouth(sp):
    """Where the head ends and the cone begins in a breathing frame: the first column, from the left, past the head's, that is solid only
    above the coils (the cone starts at the jaw). Approximated as the column of the jaw: the right end of the solid run at the crest's
    height plus a head's length."""
    ys, xs = np.nonzero(sp[..., 3])
    return xs.min() + int((xs.max() - xs.min()) * 0.3)


def coils_cx(sp):
    """The middle of the coils: the solid pixels in the lowest third of the figure (the cone is higher, by the mouth)."""
    ys, xs = np.nonzero(sp[..., 3])
    lo = ys.max() - (ys.max() - ys.min()) / 3
    return xs[ys >= lo].mean()


def paste(dst, src, dx, dy):
    h, w = src.shape[:2]
    for y in range(h):
        ty = y + dy
        if not 0 <= ty < dst.shape[0]:
            continue
        for x in range(w):
            tx = x + dx
            if 0 <= tx < dst.shape[1] and src[y, x, 3]:
                dst[ty, tx] = src[y, x]


rows = {name: [drop_specks(cell(r, c)) for c in range(6)] for r, name in enumerate(['idle', 'walk', 'rise', 'breath'])}

# (the breath: frames 4 and 5 crop her coils at the left; frame 3 lends them, matched at the crest and the ground, so she stays whole. The
# canvas is widened to the right so the cone is not cut where the cell ends, and to the left so frame 3's coils fit)
br = rows['breath']
PAD = 200
base = br[2]
centre = {}


# (frame 4: its coils from frame 3, matched at the crest and the ground; the seam is hidden under the neck's own outline)
f = br[3]
bx, by = crest(base)
fx, fy = crest(f, mouth(f))
dx = int(round(fx - bx))
dy = feet(f) - feet(base)
h, w = f.shape[:2]
whole = np.zeros((h, w + PAD, 4), np.uint8)
paste(whole, base, PAD + dx, dy)
xs = np.nonzero(f[..., 3].any(axis=0))[0]
f = f.copy()
f[:, : xs.min() + 4, 3] = 0
whole[:, PAD + xs.min() + 4 :, 3] = 0
paste(whole, f, PAD, 0)
br[3] = whole
centre[id(whole)] = coils_cx(base) + PAD + dx
# (frame 5's cone runs out of its cell and its pose does not meet frame 3's coils: the breath is held on frame 4 for two beats instead; the
# battle's own frost runs along the struck row, `bossFx.ts`)
br[4] = whole
for k in (0, 1, 2, 5):
    f = br[k]
    h, w = f.shape[:2]
    wide = np.zeros((h, w + PAD, 4), np.uint8)
    paste(wide, f, PAD, 0)
    br[k] = wide

out_rows = {
    'walk': rows['walk'],
    'attack': br,
    'idle': rows['idle'],
    'hurt': [rows['rise'][0], rows['rise'][1], rows['rise'][0]],
    'dead': list(reversed(rows['rise'])),
}

# (one frame size for all: every frame centred on the coils, standing on one baseline; the breath's cone may run past the centre's right)
ground = {name: max(feet(sp) for sp in fr) for name, fr in out_rows.items()}
boxes = []
cx = lambda sp: centre.get(id(sp), None) or coils_cx(sp)
for name, fr in out_rows.items():
    for sp in fr:
        dx = -cx(sp)
        dy = -feet(sp)
        ys, xs = np.nonzero(sp[..., 3])
        boxes.append((xs.min() + dx, xs.max() + dx, ys.min() + dy))
half = int(np.ceil(max(max(-b[0], b[1]) for b in boxes))) + 1
top = int(np.floor(min(b[2] for b in boxes))) - 1
fw, fh = half * 2, -top + 2
order = ['walk', 'attack', 'idle', 'hurt', 'dead']
per = 6
sheet = np.zeros((fh * len(order), fw * per, 4), np.uint8)
for r, name in enumerate(order):
    for c, sp in enumerate(out_rows[name]):
        frame = np.zeros((fh, fw, 4), np.uint8)
        paste(frame, sp, int(round(half - cx(sp))), fh - 1 - feet(sp))
        sheet[r * fh : (r + 1) * fh, c * fw : (c + 1) * fw] = frame
# (a palette of 256, as pixel art wants: a third of the size, bundled into game.js as the other sheets are)
Image.fromarray(sheet).quantize(256, method=Image.Quantize.FASTOCTREE).save(OUT, optimize=True)
figure = max(feet(sp) - np.nonzero(sp[..., 3].any(axis=1))[0].min() for fr in out_rows.values() for sp in fr) + 1
print(json.dumps({'w': fw, 'h': fh, 'perRow': per, 'rows': order, 'counts': {n: len(out_rows[n]) for n in order}, 'figure': int(figure), 'facesRight': True}))
