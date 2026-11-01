# EIDOLON-CALL-2: Askel's on-board sprite from the owner's generated sheet (art-source/eidolons/gemini/askel-sheet-gemini.jpg: 4 rows x 6
# frames, side view facing right, on magenta; row 1 idle, row 2 run, row 3 leap, row 4 the fire breath, its last three frames with the
# hound's rear cropped and the flame running to the cell's edge).
#
# - The magenta is keyed out with a tolerance (it is a JPEG: the pink halo round the edges goes too), hard alpha, crisp edges.
# - Each cell is brought down by a whole factor (4) a block at a time: a block is solid if most of it is, its colour the mean of its solid
#   pixels; what is left of the pink tint on the edges is taken out.
# - Every frame stands on one baseline: a row keeps its own heights (a leap stays in the air), its standing frames' feet on the line; and
#   every frame is centred on the hound's body (its dark pixels), not on its flaming tail.
# - The breath: the hound is kept whole (frame 3's body under the breathing frames' head and shoulders, matched at the snout and the feet),
#   and the flame is cut out as its own strip (src/art/eidolons/sprites/askel-breath.png, its root at the left middle) so the page can draw
#   it reaching across the foes.
#
# Writes src/art/eidolons/sprites/askel.png: rows walk (the run), attack (the breath), idle, leap; six frames each.
#   python3 tools/eidolon-call-2/cut_askel.py
import json
import numpy as np
from PIL import Image

SRC = 'art-source/eidolons/gemini/askel-sheet-gemini.jpg'
OUT = 'src/art/eidolons/sprites'
K = 4
a = np.asarray(Image.open(SRC).convert('RGB')).astype(np.int32)
H, W = a.shape[:2]
CW, CH = W / 6, H / 4


def key(px):
    """Solid where the pixel is not magenta (or a JPEG blend of magenta into the art)."""
    r, g, b = px[..., 0], px[..., 1], px[..., 2]
    m = np.minimum(r, b) - g
    return m < 55


def down(px, solid):
    """Down by K a block at a time: solid if most of the block is; the colour the mean of its solid pixels."""
    h, w = solid.shape[0] // K, solid.shape[1] // K
    px = px[: h * K, : w * K].reshape(h, K, w, K, 3)
    s = solid[: h * K, : w * K].reshape(h, K, w, K)
    n = s.sum(axis=(1, 3))
    out = np.zeros((h, w, 4), np.uint8)
    tot = (px * s[..., None]).sum(axis=(1, 3))
    ok = n >= (K * K) // 2 + 1
    col = (tot / np.maximum(n, 1)[..., None]).astype(np.int32)
    # (what is left of the pink tint on an edge: the red and blue brought down to the green's level plus a little)
    r, g, b = col[..., 0], col[..., 1], col[..., 2]
    tint = np.minimum(r, b) - g
    fix = tint > 25
    col[..., 2] = np.where(fix, np.minimum(b, g + 10), b)
    col[..., 0] = np.where(fix & (r < 200), np.minimum(r, g + 40), r)
    out[..., :3] = np.clip(col, 0, 255)
    out[..., 3] = np.where(ok, 255, 0)
    return out


def cell(row, col):
    x0, x1 = round(col * CW), round((col + 1) * CW)
    y0, y1 = round(row * CH), round((row + 1) * CH)
    px = a[y0:y1, x0:x1]
    sp = down(px, key(px))
    # (the thin line some cells carry at their very edge is dropped)
    sp[:, :1, 3] = 0
    sp[:, -1:, 3] = 0
    return sp


def body(sp):
    """The hound's dark pixels (not its fire): their mask."""
    rgb = sp[..., :3].astype(int)
    lum = rgb.mean(axis=2)
    return (sp[..., 3] > 0) & (lum < 70) & (rgb.max(axis=2) - rgb.min(axis=2) < 60)


def feet(sp):
    ys = np.nonzero(sp[..., 3].any(axis=1))[0]
    return ys.max()


def body_cx(sp):
    ys, xs = np.nonzero(body(sp))
    return xs.mean()


def snout(sp):
    ys, xs = np.nonzero(body(sp))
    return xs.max()


def paste(dst, src, dx, dy):
    """src over dst at an offset (solid pixels only)."""
    h, w = src.shape[:2]
    for y in range(h):
        ty = y + dy
        if not 0 <= ty < dst.shape[0]:
            continue
        for x in range(w):
            tx = x + dx
            if 0 <= tx < dst.shape[1] and src[y, x, 3]:
                dst[ty, tx] = src[y, x]


rows = {name: [cell(r, c) for c in range(6)] for r, name in enumerate(['idle', 'walk', 'leap', 'attack'])}

# (the breath: the hound kept whole, the flame its own layer)
att = rows['attack']
base = att[2]
flames = []
for k in (3, 4, 5):
    f = att[k]
    tip = snout(f)
    # (the flame: what lies beyond the snout; the hound: the rest)
    flame = f.copy()
    flame[:, : tip + 1, 3] = 0
    hound = f.copy()
    hound[:, tip + 1 :, 3] = 0
    # (frame 3's body under it: the breathing head and shoulders moved onto it so the snouts and feet meet)
    # (frame 3 keeps only the rear the breathing frame cropped away, so no legs are doubled)
    whole = base.copy()
    dx = snout(base) - tip
    xs = np.nonzero(hound[..., 3].any(axis=0))[0]
    whole[:, dx + xs.min() + 2 :, 3] = 0
    paste(whole, hound, dx, feet(base) - feet(f))
    att[k] = whole
    # (the flame's strip: its root (the snout's height) at the left middle)
    ys, xs = np.nonzero(flame[..., 3])
    if len(xs):
        fy = int(np.median(np.nonzero(body(f)[:, max(0, tip - 3) : tip + 1].any(axis=1))[0]))
        flames.append((flame[:, tip + 1 :], fy))

# (one frame size for all: every frame centred on the body, standing on one baseline)
CX = 0
frames = {name: [] for name in rows}
ground = {name: max(feet(sp) for sp in fr if fr) for name, fr in rows.items()}
boxes = []
for name, fr in rows.items():
    for sp in fr:
        dx = -body_cx(sp)
        dy = -ground[name]
        ys, xs = np.nonzero(sp[..., 3])
        boxes.append((xs.min() + dx, xs.max() + dx, ys.min() + dy, ys.max() + dy))
left = int(np.floor(min(b[0] for b in boxes))) - 1
right = int(np.ceil(max(b[1] for b in boxes))) + 1
top = int(np.floor(min(b[2] for b in boxes))) - 1
fw, fh = right - left + 1, -top + 2
sheet = np.zeros((fh * 4, fw * 6, 4), np.uint8)
for r, name in enumerate(['walk', 'attack', 'idle', 'leap']):
    for c, sp in enumerate(rows[name]):
        dx = int(round(-body_cx(sp))) - left
        dy = -ground[name] - top
        frame = np.zeros((fh, fw, 4), np.uint8)
        paste(frame, sp, dx, dy)
        sheet[r * fh : (r + 1) * fh, c * fw : (c + 1) * fw] = frame
Image.fromarray(sheet).save(f'{OUT}/askel.png', optimize=True)

# (the flame strip: three frames, each its root at the left middle)
fl_w = max(f.shape[1] for f, _ in flames)
half = max(max(fy, f.shape[0] - fy) for f, fy in flames)
strip = np.zeros((half * 2, fl_w * len(flames), 4), np.uint8)
for i, (f, fy) in enumerate(flames):
    one = np.zeros((half * 2, fl_w, 4), np.uint8)
    paste(one, f, 0, half - fy)
    strip[:, i * fl_w : (i + 1) * fl_w] = one
Image.fromarray(strip).save(f'{OUT}/askel-breath.png', optimize=True)

# (where the mouth is in the breathing frames: a share of the frame, for the page's flame and runs)
f = rows['attack'][4]
tip = snout(f)
my = np.nonzero(body(f)[:, max(0, tip - 3) : tip + 1].any(axis=1))[0]
mouth_x = (int(round(-body_cx(f))) - left + tip) / fw
mouth_y = (-ground['attack'] - top + float(np.median(my))) / fh
print(json.dumps({'fw': fw, 'fh': fh, 'flame': [fl_w, half * 2, len(flames)], 'mouth': [round(mouth_x, 3), round(mouth_y, 3)]}))
