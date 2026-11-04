# EIDOLON-CHAIN-6: Vaelkhar's fighter sheet for his trial, from the owner's generated sheet (art-source/eidolons/gemini/vaelkhar-sheet.jpg:
# 2912 x 1440 on magenta, six columns by four rows: row 1 six idle frames (standing on hind legs), row 2 six flying frames, row 3 six rise
# frames (the first two are low and spread, the last three wings up) and row 4 five breath frames and the breath's end (left out: the cells
# cut the breath off, the battle's own dark fire does the striking).
# Cut as cut_voltara.py cuts hers, with a stricter key (his violet must not be keyed away with the magenta). Rows: walk (the flying frames),
# attack (the wings-up frames), idle, hurt, dead.
#   python3 tools/eidolon-trial/cut_vaelkhar.py
import json
import numpy as np
from PIL import Image

SRC = 'art-source/eidolons/gemini/vaelkhar-sheet.jpg'
OUT = 'src/art/units/eidolon_vaelkhar.png'
K = 3
a = np.asarray(Image.open(SRC).convert('RGB')).astype(np.int32)
H, W = a.shape[:2]



def key(px):
    r, g, b = px[..., 0], px[..., 1], px[..., 2]
    return (np.minimum(r, b) - g) < 120


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
    fix = tint > 130
    col[..., 0] = np.where(fix, np.minimum(r, g), r)
    col[..., 2] = np.where(fix, np.minimum(b, g + 30), b)
    out[..., :3] = np.clip(col, 0, 255)
    out[..., 3] = np.where(ok, 255, 0)
    return out


def cell(x0, x1, y0, y1):
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


def main_body(sp):
    """Keeps only the biggest connected piece (joined across 3 px gaps), so a neighbouring cell's tail or the beam's edge is dropped."""
    from collections import deque
    s = sp[..., 3] > 0
    h, w = s.shape
    p = np.pad(s, 3)
    d = np.zeros_like(s)
    for dy in range(-3, 4):
        for dx in range(-3, 4):
            d |= p[3 + dy : 3 + dy + h, 3 + dx : 3 + dx + w]
    seen = np.zeros_like(s, dtype=bool)
    best, best_n = None, 0
    for y0, x0 in zip(*np.nonzero(d)):
        if seen[y0, x0]:
            continue
        comp, q = [], deque([(y0, x0)])
        seen[y0, x0] = True
        while q:
            y, x = q.popleft()
            comp.append((y, x))
            for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= ny < h and 0 <= nx < w and d[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    q.append((ny, nx))
        n = sum(1 for y, x in comp if s[y, x])
        if n > best_n:
            best, best_n = comp, n
    keep = np.zeros_like(s)
    for y, x in best:
        keep[y, x] = True
    sp[..., 3] = np.where(s & keep, 255, 0)
    return sp


def feet(sp):
    return np.nonzero(sp[..., 3].any(axis=1))[0].max()


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




def frames(row, n):
    w = W / n
    h = H / 4
    return [main_body(drop_specks(cell(round(i * w) + 6, round((i + 1) * w) - 6, round(row * h) + 6, round((row + 1) * h) - 6))) for i in range(n)]
idle = frames(0, 6)
fly = frames(1, 6)
rise = frames(2, 6)
out_rows = {
    'walk': fly,
    'attack': [rise[2], rise[3], rise[4], rise[5], rise[4]],
    'idle': idle,
    'hurt': [rise[2], rise[3], rise[2]],
    'dead': [rise[3], rise[2], rise[1], rise[0], rise[0], rise[0]],
}
bb = lambda sp: np.nonzero(sp[..., 3].any(axis=0))[0]
cx = lambda sp: (bb(sp).min() + bb(sp).max()) / 2
ground = None
boxes = []
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
Image.fromarray(sheet).quantize(256, method=Image.Quantize.FASTOCTREE).save(OUT, optimize=True)
figure = max(feet(sp) - np.nonzero(sp[..., 3].any(axis=1))[0].min() for fr in out_rows.values() for sp in fr) + 1
print(json.dumps({'w': fw, 'h': fh, 'perRow': per, 'rows': order, 'counts': {n: len(out_rows[n]) for n in order}, 'figure': int(figure), 'facesRight': True}))
