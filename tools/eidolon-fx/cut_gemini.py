# EIDOLON-FX: the owner's Gemini sprite sheets for Nivra, Aurelan, Voltara, Gorm and Vaelkhar (art-source/eidolons/gemini/<id>-sheet.jpg:
# made by the owner in the Gemini app, JPEGs on magenta, rows idle, move, special, attack) cut into the game's sprite format, as Askel's was
# (tools/eidolon-call-2/cut_askel.py):
#
# - Each sheet is cut on its own even grid (the rows and frames a row it has); the magenta and the JPEG's pink fringe are keyed out (a
#   tolerance on `min(R, B) - G`, only where red and blue are near equal, so Vaelkhar's violet fire and Aurelan's rose mane stay; the faint
#   grid lines on Aurelan's go too).
# - Each cell is brought down by a whole factor a block at a time (a block is solid if most of it is, its colour the mean of its solid
#   pixels; the last pink tint on an edge taken out): hard alpha, crisp edges. Bits not joined to the creature (Voltara's dust puffs, a
#   stray rock) are dropped.
# - Every frame is centred on the creature's body (the median of its solid columns left of the mouth) and stands on one baseline a row.
# - The breath, beam or bolt is cut off at the mouth or hands as its own strip (`<id>-breath.png`, its root at the left middle), so the page
#   can draw it reaching across the foes; the frames keep only the start of it.
#
# Writes src/art/eidolons/sprites/<id>.png (rows walk, attack; frames of one size) and <id>-breath.png, and prints each sheet's numbers for
# `SPRITES` in src/eidolonPass.ts.
#   python3 tools/eidolon-fx/cut_gemini.py [<id>...]
import json
import sys
from collections import deque
import numpy as np
from PIL import Image

SRC = 'art-source/eidolons/gemini'
OUT = 'src/art/eidolons/sprites'

# Each sheet: its rows, the whole factor it is brought down by, the row its walk is cut from (each frame found by the empty columns
# between them), and its attack frames: each a row, its columns in the sheet (full size) and, for a breathing frame, the column its breath
# leaves the mouth or hands (`cut`), and `base` when its body was cropped by the frame before (it is made whole on that attack frame, matched
# at the mouth and the feet). `flame`: the attack frames whose breath makes the breath strip (the longest ones, so it never pulses short).
F = lambda row, x0, x1, cut=None, base=None: {'row': row, 'x': (x0, x1), 'cut': cut, 'base': base}
SHEETS = {
    'nivra': {'rows': 4, 'k': 4, 'walk': 1, 'attack': [F(3, 18, 388), F(3, 437, 812), F(3, 851, 1258), F(3, 1264, 1690, 1488, base=2), F(3, 1690, 2112, 1812, base=2)], 'flame': [3, 4]},
    'aurelan': {'rows': 5, 'bands': [(30, 400), (440, 800), (810, 1440), (1612, 1985), (2016, 2390)], 'k': 3, 'walk': 1, 'attack': [F(3, 29, 375), F(3, 899, 1218), F(3, 438, 895, 752), F(3, 1230, 1792, 1532)], 'flame': [2, 3]},
    'voltara': {'rows': 4, 'k': 4, 'walk': 1, 'attack': [F(2, 0, 426), F(2, 434, 840), F(3, 24, 419, 252), F(3, 486, 839, 684), F(3, 908, 1739, 1124)], 'flame': [4]},
    'gorm': {'rows': 4, 'k': 3, 'walk': 1, 'attack': [F(3, 37, 333), F(3, 425, 697), F(3, 767, 1060), F(3, 1111, 1413), F(3, 1807, 2094)], 'flame': []},
    'vaelkhar': {'rows': 4, 'k': 3, 'walk': 1, 'attack': [F(2, 1507, 1845), F(2, 2002, 2328), F(3, 26, 484, 404), F(3, 998, 1453, 1372), F(3, 1968, 2880, 2342)], 'flame': [4]},
}


def key(px):
    """Solid where the pixel is not magenta, a JPEG blend of magenta into the art, or a faint grid line."""
    r, g, b = px[..., 0], px[..., 1], px[..., 2]
    m = np.minimum(r, b) - g
    pink = (m >= 50) & (np.abs(r - b) < 70) & (np.maximum(r, b) > 100)
    line = (m >= 40) & (np.abs(r - b) < 45) & (g < 50)
    return ~(pink | line)


def down(px, solid, K):
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
    fix = (tint > 25) & (np.abs(r - b) < 70)
    col[..., 2] = np.where(fix, np.minimum(b, g + 10), b)
    col[..., 0] = np.where(fix & (r < 200), np.minimum(r, g + 40), r)
    out[..., :3] = np.clip(col, 0, 255)
    out[..., 3] = np.where(ok, 255, 0)
    return out


def label(mask):
    """Connected parts of a mask (8-neighbours): a list of their pixel lists, the largest first."""
    h, w = mask.shape
    seen = np.zeros_like(mask, bool)
    parts = []
    for y0, x0 in zip(*np.nonzero(mask)):
        if seen[y0, x0]:
            continue
        q = deque([(y0, x0)])
        seen[y0, x0] = True
        pts = []
        while q:
            y, x = q.popleft()
            pts.append((y, x))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        q.append((ny, nx))
        parts.append(pts)
    parts.sort(key=len, reverse=True)
    return parts


def clean(sp):
    """Only the creature: its largest part and the parts near it of some size (a halo, a horn); the rest dropped."""
    parts = label(sp[..., 3] > 0)
    if not parts:
        return sp
    big = parts[0]
    ys = [p[0] for p in big]
    xs = [p[1] for p in big]
    y0, y1, x0, x1 = min(ys), max(ys), min(xs), max(xs)
    my, mx = (y1 - y0) * 0.25 + 2, (x1 - x0) * 0.15 + 2
    keep = np.zeros(sp.shape[:2], bool)
    for pts in parts:
        py = [p[0] for p in pts]
        px = [p[1] for p in pts]
        near = min(py) >= y0 - my and max(py) <= y1 + my and min(px) >= x0 - mx and max(px) <= x1 + mx
        if pts is big or (near and len(pts) >= 3):
            for y, x in pts:
                keep[y, x] = True
    out = sp.copy()
    out[..., 3] = np.where(keep, out[..., 3], 0)
    return out


def paste(dst, src, dx, dy):
    h, w = src.shape[:2]
    ys, xs = np.nonzero(src[..., 3])
    for y, x in zip(ys, xs):
        ty, tx = y + dy, x + dx
        if 0 <= ty < dst.shape[0] and 0 <= tx < dst.shape[1]:
            dst[ty, tx] = src[y, x]


def runs(occ, min_w=150):
    out, x, n = [], 0, len(occ)
    while x < n:
        if occ[x]:
            x0 = x
            while x < n and occ[x]:
                x += 1
            if x - x0 >= min_w:
                out.append((x0, x))
        else:
            x += 1
    return out


def solid_rows(sp):
    return np.nonzero(sp[..., 3].any(axis=1))[0]


def cut(eid):
    cfg = SHEETS[eid]
    a = np.asarray(Image.open(f'{SRC}/{eid}-sheet.jpg').convert('RGB')).astype(np.int32)
    H, W = a.shape[:2]
    K = cfg['k']
    RH = H / cfg['rows']

    def band_of(row):
        # (a sheet whose rows are not even gives them: Aurelan's leap row is taller)
        if 'bands' in cfg:
            return cfg['bands'][row]
        return round(row * RH) + 3, round((row + 1) * RH) - 3

    def grab(row, x0, x1):
        y0, y1 = band_of(row)
        px = a[y0:y1, x0:x1]
        sp = down(px, key(px), K)
        for e in (sp[:, :1], sp[:, -1:], sp[:1, :], sp[-1:, :]):
            e[..., 3] = 0
        return sp

    # (the walk: each frame between the empty columns of its row)
    r = cfg['walk']
    y0, y1 = band_of(r)
    band = a[y0:y1]
    walk = [clean(grab(r, x0, x1)) for x0, x1 in runs(key(band).sum(axis=0) > 2)]
    attack, flames, mouth = [], [], None
    for i, f in enumerate(cfg['attack']):
        x0, x1 = f['x']
        sp = grab(f['row'], x0, x1)
        if f['cut'] is not None:
            c = (f['cut'] - x0) // K
            body = sp.copy()
            body[:, c:, 3] = 0
            flame = sp.copy()
            flame[:, :c, 3] = 0
            near = flame[:, c : c + 3, 3].any(axis=1)
            fy = int(np.median(np.nonzero(near)[0])) if near.any() else int(np.median(solid_rows(flame)))
            if i in cfg['flame']:
                flames.append((flame[:, c:], fy))
            body = clean(body)
            if f['base'] is not None:
                # (made whole on the base frame: its rear under the breathing head, matched at the mouth and the feet)
                base = attack[f['base']]
                bx = np.nonzero(base[..., 3].any(axis=0))[0].max()
                hx = np.nonzero(body[..., 3].any(axis=0))
                dx = bx - hx[0].max()
                dy = solid_rows(base).max() - solid_rows(body).max()
                whole = np.zeros((max(base.shape[0], body.shape[0] + abs(dy)), max(base.shape[1], body.shape[1] + abs(dx)), 4), np.uint8)
                paste(whole, base, 0, 0)
                whole[:, dx + hx[0].min() + 2 :, 3] = 0
                paste(whole, body, dx, dy)
                body = whole
                c += dx
                fy += dy
            if mouth is None:
                mouth = (i, c, fy)
            sp = body
        else:
            sp = clean(sp)
        attack.append(sp)

    def feet(sp):
        return solid_rows(sp).max()

    def cx(sp):
        return float(np.median(np.nonzero(sp[..., 3])[1]))

    rows = [walk, attack]
    ground = [max(feet(sp) for sp in r) for r in rows]
    boxes = []
    for g, r in zip(ground, rows):
        for sp in r:
            ys, xs = np.nonzero(sp[..., 3])
            boxes.append((xs.min() - cx(sp), xs.max() - cx(sp), ys.min() - g))
    left = int(np.floor(min(b[0] for b in boxes))) - 1
    right = int(np.ceil(max(b[1] for b in boxes))) + 1
    top = int(np.floor(min(b[2] for b in boxes))) - 1
    fw, fh = right - left + 1, -top + 2
    per = max(len(r) for r in rows)
    sheet = np.zeros((fh * 2, fw * per, 4), np.uint8)
    for ri, (g, r) in enumerate(zip(ground, rows)):
        for c, sp in enumerate(r):
            frame = np.zeros((fh, fw, 4), np.uint8)
            paste(frame, sp, int(round(-cx(sp))) - left, -g - top)
            sheet[ri * fh : (ri + 1) * fh, c * fw : (c + 1) * fw] = frame
    Image.fromarray(sheet).save(f'{OUT}/{eid}.png', optimize=True)
    info = {'fw': fw, 'fh': fh, 'perRow': per, 'walk': len(walk), 'attack': len(attack)}
    if flames:
        bw = max(f.shape[1] for f, _ in flames)
        half = max(max(fy, f.shape[0] - fy) for f, fy in flames)
        strip = np.zeros((half * 2, bw * len(flames), 4), np.uint8)
        for i, (f, fy) in enumerate(flames):
            one = np.zeros((half * 2, bw, 4), np.uint8)
            paste(one, f, 0, half - fy)
            strip[:, i * bw : (i + 1) * bw] = one
        Image.fromarray(strip).save(f'{OUT}/{eid}-breath.png', optimize=True)
    if mouth:
        i, c, fy = mouth
        sp = attack[i]
        mx = (int(round(-cx(sp))) - left + c) / fw
        my = (-ground[1] - top + fy) / fh
        info.update({'breath': [bw, half * 2, len(flames)], 'mouth': [round(mx, 3), round(my, 3)]})
    print(eid, json.dumps(info))


for eid in sys.argv[1:] or list(SHEETS):
    cut(eid)
