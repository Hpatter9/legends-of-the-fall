#!/usr/bin/env python3
"""The Knight's plain battle sheets, made from his awakened ones (docs/notes/knight-sprite.md).

The owner wants Kwame before awakening to be the same man as after it: the same face, hair, body, poses, sword and
shield, in plainer gear. So the base sheets are not painted afresh; they are the awakened sheets
(`src/art/awakened/awakened_knight.png` and `_back`), frame for frame, with the finery taken off by colour:

- the gold trim, pauldron work, belt and hilt become plain steel (each pixel keeps its own lightness, so the shading,
  the outlines and the highlights are exactly as painted);
- the red cape and the green inlays become the dark blue cloth of the old Knight's surcoat;
- the blade's glowing blue core becomes plain steel (thin blue only: the shield's field and the cloth keep their blue);
- the gold lion on the shield is painted over in the field's blue, and a plain steel cross put in its place.

The face is kept: the largest solid patch of skin-coloured pixels on each frame (the face, or the neck from behind) and
everything near it that is not bright gold is left exactly as it is, so the skin, the eyes and the hair never change.
Alpha is untouched and nothing is blurred.

The awakened sheets already carry Kwame's deep skin (heritage-looks.md), so the result is written both as the source
sheet (`hero_soldier.png`, `hero_soldier_back.png`) and as its re-toned copy (`hero_soldier_deep.png`,
`hero_soldier_back_deep.png`), which is the one the game bundles; the heritage tool must not be run over the Knight again.

  python3 tools/knight/plain.py
  python3 tools/knight/plain.py --preview DIR   # also write a before/after strip for review
"""
import os, sys
from collections import deque
import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..'))
AWAKENED = os.path.join(ROOT, 'src', 'art', 'awakened')
UNITS = os.path.join(ROOT, 'src', 'art', 'units')
# (each sheet, what it is written as, and which side of the figure the shield is carried on: his left arm, so to the
#  right from the front and to the left from behind)
SHEETS = [('awakened_knight', ['hero_soldier', 'hero_soldier_deep'], 1),
          ('awakened_knight_back', ['hero_soldier_back', 'hero_soldier_back_deep'], -1)]
CELL = (152, 116)

CLOTH_HUE = 222  # the dark blue of the surcoat
STEEL = np.array([0.93, 0.97, 1.06])  # a cool tint on grey, so the steel matches the painted plate


def hsv(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx = rgb.max(-1)
    mn = rgb.min(-1)
    d = mx - mn
    dd = np.where(d == 0, 1, d)
    h = np.where(mx == r, ((g - b) / dd) % 6, np.where(mx == g, (b - r) / dd + 2, (r - g) / dd + 4)) * 60
    h = np.where(d == 0, 0, h)
    s = np.where(mx > 0, d / np.where(mx == 0, 1, mx), 0)
    return h, s, mx


def from_hsv(h, s, v):
    h = (h % 360) / 60
    i = np.floor(h).astype(int) % 6
    f = h - np.floor(h)
    p, q, t = v * (1 - s), v * (1 - s * f), v * (1 - s * (1 - f))
    out = np.stack([np.choose(i, [v, q, p, p, t, v]), np.choose(i, [t, v, v, q, p, p]), np.choose(i, [p, p, t, v, v, q])], -1)
    return out


def shift(m, dy, dx):
    out = np.zeros_like(m)
    h, w = m.shape
    out[max(dy, 0):h + min(dy, 0), max(dx, 0):w + min(dx, 0)] = m[max(-dy, 0):h + min(-dy, 0), max(-dx, 0):w + min(-dx, 0)]
    return out


def dilate(m, r):
    out = m.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dy * dy + dx * dx <= r * r + r:
                out |= shift(m, dy, dx)
    return out


def erode(m, r):
    return ~dilate(~m, r)


def components(m):
    """8-connected patches of a mask, as lists of (y, x)."""
    seen = np.zeros_like(m)
    out = []
    for y, x in zip(*np.nonzero(m)):
        if seen[y, x]:
            continue
        q = deque([(y, x)])
        seen[y, x] = True
        comp = []
        while q:
            cy, cx = q.popleft()
            comp.append((cy, cx))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < m.shape[0] and 0 <= nx < m.shape[1] and m[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        q.append((ny, nx))
        out.append(comp)
    return out


def face_mask(skin, alpha):
    """The face (or neck) of each frame: the largest solid patch of skin colour in the cell, grown a little."""
    keep = np.zeros_like(skin)
    H, W = skin.shape
    cw, ch = CELL
    for y0 in range(0, H, ch):
        for x0 in range(0, W, cw):
            cell = skin[y0:y0 + ch, x0:x0 + cw]
            solid = dilate(erode(cell, 1), 1) & cell
            comps = [c for c in components(solid) if len(c) >= 6]
            if not comps:
                continue
            best = max(comps, key=len)
            m = np.zeros_like(cell)
            for y, x in best:
                m[y, x] = True
            # (and the other solid skin patches near it: an ear, the neck under the chin)
            near = dilate(m, 6)
            for c in comps:
                if any(near[y, x] for y, x in c):
                    for y, x in c:
                        m[y, x] = True
            keep[y0:y0 + ch, x0:x0 + cw] = m
    return keep


def plain(src, shield_side):
    a = np.asarray(Image.open(src).convert('RGBA')).astype(float)
    rgb = a[..., :3] / 255
    alpha = a[..., 3] > 0
    h, s, v = hsv(rgb)
    y = rgb @ np.array([0.299, 0.587, 0.114])

    skin = alpha & (h >= 10) & (h < 26) & (s > 0.45) & (s < 0.97) & (v > 0.28) & (v < 0.8)
    face = face_mask(skin, alpha)
    bright_gold = (h >= 26) & (h < 70) & (s > 0.3) & (v > 0.45)
    # (the face, its outline and the hair round it are kept as painted)
    kept = alpha & ((dilate(face, 2) & ~bright_gold) | (dilate(face, 7) & (v < 0.32) & ~bright_gold))

    gold = alpha & ~kept & (h >= 8) & (h < 72) & (s > 0.28)
    red = alpha & ~kept & ((h >= 300) | (h < 8)) & (s > 0.3) & (v > 0.1)
    green = alpha & ~kept & (h >= 72) & (h < 185) & (s > 0.2)
    blue = alpha & (h >= 185) & (h < 255) & (s > 0.28)
    pale = alpha & (s < 0.22) & (v > 0.5)

    # the blade's glowing core: a patch of blue ringed mostly by the blade's pale steel
    blade = np.zeros_like(alpha)
    for comp in components(blue & ~kept):
        m = mask_of(comp, alpha.shape)
        ring = dilate(m, 1) & ~m
        # (a patch bigger than a blade's core must be long, as a blade is: the shield's field is broad)
        if not ring.sum() or (len(comp) > 170 and elongation(comp) < 4.5):
            continue
        paleness = (ring & pale).sum() / ring.sum()
        # (or a long, bright line of blue edged partly in pale steel: the core where it runs into the hilt's gem; the
        #  shield's field and the cloth are broader, or darker, or edged in gold)
        bright = v[m].mean() >= 0.68 and h[m].mean() <= 222
        long_line = (elongation(comp) >= 4.5 and bright) or (erode(m, 1) & m).sum() / len(comp) < 0.25
        if (paleness >= 0.5 and (ring & gold).sum() / ring.sum() < 0.4 and elongation(comp) >= 2) or (long_line and paleness >= 0.2):
            blade |= m

    # the lion on the shield: the gold inside the shield's blue field. Each large patch of blue in a frame (with the
    # patches hard by it, as the lion can split the field) is taken as a convex shape, pulled in two pixels so the gold
    # rim stays out; the field is the one holding the largest solid patch of gold, and that gold is the lion
    lion = np.zeros_like(alpha)
    cores = []
    cw, ch = CELL
    H, W = alpha.shape
    for y0 in range(0, H, ch):
        for x0 in range(0, W, cw):
            comps = components((blue & ~blade)[y0:y0 + ch, x0:x0 + cw])
            xs = np.nonzero(alpha[y0:y0 + ch, x0:x0 + cw].any(0))[0]
            if not len(xs):
                continue
            mid = (xs.min() + xs.max()) / 2
            g = gold[y0:y0 + ch, x0:x0 + cw]
            best = None
            for seed in comps:
                if len(seed) < 40:
                    continue
                near = dilate(mask_of(seed, (ch, cw)), 5)
                field = list(seed)
                for c in comps:
                    if c is not seed and len(c) >= 12 and any(near[y, x] for y, x in c):
                        field += c
                hull = Image.new('L', (cw, ch), 0)
                ImageDraw.Draw(hull).polygon([(x, y) for y, x in convex_hull(field)], fill=255)
                inside = erode(np.asarray(hull) > 0, 2)
                parts = [c for c in components(g & inside) if len(c) >= 18
                         and (np.mean([x for _, x in c]) - mid) * shield_side >= 6]
                if parts:
                    top = max(parts, key=len)
                    if best is None or len(top) > len(best):
                        best, best_hull = top, np.asarray(hull) > 0
            if best:
                # (a shield turned away shows the lion hard against its rim: the rest of the lion is the gold joined to
                #  the part found, short of the rim, which runs along the shield's outer edge)
                m = mask_of(best, (ch, cw))
                rim = dilate(~alpha[y0:y0 + ch, x0:x0 + cw], 3)
                # (nor the rim's side against the body: gold within two pixels of plate, cloth or skin outside the field)
                body = alpha[y0:y0 + ch, x0:x0 + cw] & ~g & ~dilate(best_hull, 1) & ~(blue[y0:y0 + ch, x0:x0 + cw])
                edge_of_body = dilate(body, 2)
                grow = g & ~rim & dilate(m, 12) & dilate(best_hull, 8) & ~edge_of_body
                for _ in range(12):
                    m = m | (dilate(m, 1) & grow)
                full = np.zeros_like(alpha)
                full[y0:y0 + ch, x0:x0 + cw] = m
                lion |= full
                core = np.zeros_like(alpha)
                core[y0:y0 + ch, x0:x0 + cw] = mask_of(best, (ch, cw))
                cores.append([tuple(p) for p in zip(*np.nonzero(core))])
    # (the dark outline of the lion's mane goes with it)
    lion |= dilate(lion, 1) & alpha & ~blue & ~kept & (v < 0.45) & ~dilate(~alpha, 1)

    out = rgb.copy()
    out = inpaint(out, lion, blue & ~lion)

    steel = np.clip(np.minimum(y * 1.04, 1)[..., None] * STEEL, 0, 1)
    out = np.where((gold & ~lion)[..., None], steel, out)
    out = np.where(blade[..., None], np.clip((y * 1.1)[..., None] * STEEL, 0, 1), out)
    navy = from_hsv(np.full(h.shape, CLOTH_HUE), np.minimum(s, 0.72), np.clip(v * 0.95, 0, 1))
    out = np.where((red & ~lion)[..., None], navy, out)
    navy2 = from_hsv(np.full(h.shape, CLOTH_HUE), np.minimum(s + 0.1, 0.75), np.clip(v * 0.8, 0, 1))
    out = np.where((green & ~lion)[..., None], navy2, out)

    # (the cross is sized to the part of the lion inside the field, so it stays on the shield's face)
    for comp in cores:
        cross(out, comp, lion)

    res = a.copy()
    res[..., :3] = np.round(out * 255)
    return res.astype(np.uint8)


def elongation(points):
    """How many times longer than wide a patch is, along its own main axis."""
    p = np.array(points, float)
    if len(p) < 3:
        return 1.0
    ev = np.linalg.eigvalsh(np.cov((p - p.mean(0)).T))
    return float(np.sqrt(max(ev[1], 1e-6) / max(ev[0], 0.25)))


def convex_hull(points):
    """The convex outline of a patch of (y, x) points, in order."""
    pts = sorted(set(points))
    if len(pts) < 3:
        return pts
    cross = lambda o, a, b: (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lower, upper = [], []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    return lower[:-1] + upper[:-1]


def mask_of(comp, shape):
    m = np.zeros(shape, bool)
    for y, x in comp:
        m[y, x] = True
    return m


def inpaint(out, hole, source):
    """Fill `hole` from the `source` pixels round it, a ring at a time, each pixel the mean of its filled neighbours."""
    out = out.copy()
    known = source.copy()
    todo = hole.copy()
    while todo.any():
        acc = np.zeros(out.shape)
        n = np.zeros(hole.shape)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dy or dx:
                    k = shift(known, dy, dx)
                    acc += np.where(k[..., None], shift_rgb(out, dy, dx), 0)
                    n += k
        step = todo & (n > 0)
        if not step.any():
            break
        out = np.where(step[..., None], acc / np.maximum(n, 1)[..., None], out)
        known |= step
        todo &= ~step
    return out


def shift_rgb(rgb, dy, dx):
    out = np.zeros_like(rgb)
    h, w = rgb.shape[:2]
    out[max(dy, 0):h + min(dy, 0), max(dx, 0):w + min(dx, 0)] = rgb[max(-dy, 0):h + min(-dy, 0), max(-dx, 0):w + min(-dx, 0)]
    return out


def cross(out, comp, painted):
    """A plain steel cross over the lion's place (`comp`), its arms the lion's height and width, with a dark edge, kept
    to the pixels painted over (`painted`), so it never runs off the shield."""
    ys = [p[0] for p in comp]
    xs = [p[1] for p in comp]
    cy, cx = int(round(np.mean(ys))), int(round(np.mean(xs)))
    hh = max(3, (max(ys) - min(ys)) // 2)
    hw = max(2, (max(xs) - min(xs)) // 2)
    inside = lambda p: 0 <= p[0] < painted.shape[0] and 0 <= p[1] < painted.shape[1] and painted[p]
    arm = set()
    for yy in range(cy - hh, cy + hh + 1):
        for xx in (cx, cx + 1):
            arm.add((yy, xx))
    bar = cy - max(1, hh // 3)
    for xx in range(cx - hw, cx + hw + 2):
        for yy in (bar, bar + 1):
            arm.add((yy, xx))
    arm = {p for p in arm if inside(p)}
    edge = {(yy + dy, xx + dx) for yy, xx in arm for dy in (-1, 0, 1) for dx in (-1, 0, 1)} - arm
    for p in edge:
        if inside(p):
            out[p] = out[p] * 0.45
    for yy, xx in arm:
        # (lit from the top left, as the rest of the plate is)
        light = 0.84 if (xx == cx or yy == bar) else 0.66
        out[yy, xx] = np.clip(light * STEEL, 0, 1)


def main():
    preview = sys.argv[sys.argv.index('--preview') + 1] if '--preview' in sys.argv else None
    for src, outs, side in SHEETS:
        img = plain(os.path.join(AWAKENED, src + '.png'), side)
        for o in outs:
            Image.fromarray(img).save(os.path.join(UNITS, o + '.png'), optimize=True)
            print('wrote', o)
        if preview:
            before = Image.open(os.path.join(AWAKENED, src + '.png')).convert('RGBA')
            after = Image.fromarray(img)
            strip = Image.new('RGBA', (before.width * 2 + 8, before.height), (90, 110, 90, 255))
            strip.alpha_composite(before, (0, 0))
            strip.alpha_composite(after, (before.width + 8, 0))
            strip.save(os.path.join(preview, src + '-plain.png'))


if __name__ == '__main__':
    main()
