#!/usr/bin/env python3
"""Skin tones (and, for a few, hair) for the human heroes' battle sheets (docs/notes/heritage-looks.md).

The Resonance hero sheets are generated pixel art with many thousands of colours, and their skin shares exact colours
with cream cloth, so no colour window alone finds the skin. Each hero is given a few boxes round its skin (the face,
bare hands) on one or two frames (`tools/heritage/heroes.json`). Those pixels teach a nearest-colour test: every
skin-like pixel of every frame is skin when its colour is nearer (in Lab) to a taught skin colour than to any skin-like
colour outside the boxes on the same frames. Stray single pixels are dropped and the faces' gaps filled, then each skin
pixel is recoloured by its own lightness along the hero's tone ramp (`src/sim/heroLooks.ts`): the shading, the outlines
and every other pixel stay exactly as they were. Alpha is untouched and nothing is blurred.

The source sheets stay; each re-toned sheet is written next to it as `<sheet>_<tone>.png` and listed in
`tools/heritage/sheets.json`; `node tools/resonance/apply.cjs --art-only` then bundles it under the source sheet's key in
`src/render/resonanceArt.ts`, in the source's place (so the layout, the rear view and the portraits all follow, and the
source is no longer bundled). A sheet where no skin shows is left as it is.

  python3 tools/heritage/recolour.py                 # every hero in the table
  python3 tools/heritage/recolour.py knight cleric   # only these
  python3 tools/heritage/recolour.py --preview DIR   # also write before/after strips and the skin mask for review
"""
import json, os, re, sys
import numpy as np
from PIL import Image

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..'))
UNITS = os.path.join(ROOT, 'src', 'art', 'units')
LAYOUT = json.load(open(os.path.join(UNITS, 'sheets.json')))
CONFIG = json.load(open(os.path.join(os.path.dirname(__file__), 'heroes.json')))
# Heroes whose sheets are made already in their tone, by another tool, and must not be re-toned here.
DRAWN_IN_TONE = {'knight': 'tools/knight/plain.py', 'paladin': 'tools/paladin/plain.py'}


def read_table():
    """The tone ramps and the hero -> tone/hair choices, read from the game's own table (one entry a line)."""
    src = open(os.path.join(ROOT, 'src', 'sim', 'heroLooks.ts'), encoding='utf-8').read()
    tones = {m.group(1): re.findall(r"'#([0-9a-f]{6})'", m.group(2)) for m in re.finditer(r"^  (\w+): \{ ramp: \[([^\]]*)\]", src, re.M)}
    hairs = {m.group(1): re.findall(r"'#([0-9a-f]{6})'", m.group(2)) for m in re.finditer(r"^  (\w+): \{ hairRamp: \[([^\]]*)\]", src, re.M)}
    looks = {}
    for m in re.finditer(r"^  (\w+): \{ tone: '(\w+)'(?:, hair: '(\w+)')?", src, re.M):
        looks[m.group(1)] = (m.group(2), m.group(3))
    rgb = lambda h: [int(h[i:i + 2], 16) for i in (0, 2, 4)]
    return ({k: np.array([rgb(h) for h in v], float) for k, v in tones.items()},
            {k: np.array([rgb(h) for h in v], float) for k, v in hairs.items()}, looks)


def hsv(a):
    r, g, b = [a[..., i].astype(float) / 255 for i in range(3)]
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    d = mx - mn
    h = np.zeros_like(mx)
    m = d > 0
    rr = (mx == r) & m
    gg = (mx == g) & m & ~rr
    bb = m & ~rr & ~gg
    h[rr] = ((g - b)[rr] / d[rr]) % 6
    h[gg] = ((b - r)[gg] / d[gg]) + 2
    h[bb] = ((r - g)[bb] / d[bb]) + 4
    return h * 60, np.where(mx > 0, d / np.maximum(mx, 1e-6), 0), mx


def window(a, w):
    """The pixels whose colour could be the part at all (a loose hue, saturation and value window)."""
    h, s, v = hsv(a)
    # (a window that starts below 0 wraps round: pink shades sit just under red's 360)
    hue = ((h >= w[0]) | (h >= 360 + w[0])) & (h <= w[1]) if w[0] < 0 else (h >= w[0]) & (h <= w[1])
    return (a[..., 3] > 0) & hue & (s >= w[2]) & (s <= w[3]) & (v >= w[4]) & (v <= w[5])


def lab(rgb):
    c = rgb / 255.0
    c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
    xyz = c @ np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]]).T / np.array([0.9505, 1, 1.089])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)


def nearest(x, ref):
    out = np.empty(len(x))
    for i in range(0, len(x), 4096):
        out[i:i + 4096] = ((x[i:i + 4096, None] - ref[None]) ** 2).sum(-1).min(1)
    return out


def frame_origin(l, k):
    """The top-left of a sheet's k-th cell, counting along the rows as they are packed."""
    i = 0
    for r, row in enumerate(l['rows']):
        for j in range(l['counts'].get(row, 0)):
            if i == k:
                return (j % l['perRow']) * l['w'], (r + j // l['perRow']) * l['h']
            i += 1
    raise ValueError(f'no frame {k}')


def cells(l):
    for r, row in enumerate(l['rows']):
        for j in range(l['counts'].get(row, 0)):
            yield (j % l['perRow']) * l['w'], (r + j // l['perRow']) * l['h']


def neighbours(m):
    """How many of each pixel's eight neighbours are set."""
    p = np.pad(m.astype(np.int8), 1)
    return sum(p[1 + dy:p.shape[0] - 1 + dy, 1 + dx:p.shape[1] - 1 + dx] for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dy or dx)


def components(m):
    """Label the 8-connected parts of a mask (a small flood fill: the sheets are a few hundred pixels across)."""
    lab_ = np.zeros(m.shape, np.int32)
    n = 0
    for y, x in zip(*np.nonzero(m)):
        if lab_[y, x]:
            continue
        n += 1
        stack = [(y, x)]
        lab_[y, x] = n
        while stack:
            cy, cx = stack.pop()
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < m.shape[0] and 0 <= nx < m.shape[1] and m[ny, nx] and not lab_[ny, nx]:
                        lab_[ny, nx] = n
                        stack.append((ny, nx))
    return lab_, n


def grow(m, r):
    """A mask widened by `r` pixels each way."""
    out = m.copy()
    for _ in range(r):
        out |= neighbours(out) > 0
    return out


def classify(images, part, win, skip=None):
    """The part's pixels on every sheet of a hero: taught by its boxes, then tidied (see the file's head). Pixels near
    a box teach nothing either way (the box is drawn tight inside the part, whose edge it does not know), and `skip`
    (the skin, when the hair is taught) is left out of both."""
    pos, neg = [], []
    taught = {}
    for sheet, k, x0, y0, x1, y1 in part['boxes']:
        taught.setdefault((sheet, k), []).append((x0, y0, x1, y1))
    for sheet, k in part.get('negatives', []):
        taught.setdefault((sheet, k), [])
    for (sheet, k), boxes in taught.items():
        l = LAYOUT[sheet]
        fx, fy = frame_origin(l, k)
        f = images[sheet][fy:fy + l['h'], fx:fx + l['w']]
        m = window(f, win)
        inside = np.zeros_like(m)
        for x0, y0, x1, y1 in boxes:
            inside[y0:y1, x0:x1] = True
        if skip is not None:
            m &= ~skip[sheet][fy:fy + l['h'], fx:fx + l['w']]
        pos.append(f[m & inside][:, :3])
        neg.append(f[m & ~grow(inside, part.get('margin', 6))][:, :3])
    P = lab(np.concatenate(pos).astype(float))
    N = lab(np.concatenate(neg).astype(float)) if sum(len(n) for n in neg) else np.zeros((1, 3)) + 1e6
    bias = part.get('bias', 1.0)
    masks = {}
    for sheet in part['sheets']:
        a = images[sheet]
        loose = window(a, win)
        cols, inv = np.unique(a[loose][:, :3], axis=0, return_inverse=True)
        L = lab(cols.astype(float))
        dp, dn = nearest(L, P), nearest(L, N)
        yes = (dp * bias < dn) & (dp < part.get('reach', 60) ** 2)
        m = np.zeros(loose.shape, bool)
        m[loose] = yes[inv.ravel()]
        if skip is not None:
            m &= ~skip[sheet]
            loose &= ~skip[sheet]
        # (stray single pixels go; a loose pixel ringed by the part joins it)
        for _ in range(2):
            n = neighbours(m)
            m = (m & (n >= 2)) | (loose & ~m & (n >= 5))
        lab_, count = components(m)
        sizes = np.bincount(lab_.ravel(), minlength=count + 1)
        m &= sizes[lab_] >= part.get('minArea', 6)
        for sheet_, k, x0, y0, x1, y1 in part.get('never', []):
            if sheet_ == sheet:
                fx, fy = frame_origin(LAYOUT[sheet], k)
                m[fy + y0:fy + y1, fx + x0:fx + x1] = False
        masks[sheet] = m
    return masks


def ramp_colour(t, ramp):
    """A colour along a dark-to-light ramp, `t` from 0 to 1 (the stops spaced evenly)."""
    x = np.clip(t, 0, 1) * (len(ramp) - 1)
    i = np.minimum(np.floor(x).astype(int), len(ramp) - 2)
    f = (x - i)[:, None]
    return ramp[i] * (1 - f) + ramp[i + 1] * f


def luma(rgb):
    return rgb[:, 0] * 0.299 + rgb[:, 1] * 0.587 + rgb[:, 2] * 0.114


def recolour(a, m, ramp, lo, hi):
    out = a.copy()
    px = a[m][:, :3].astype(float)
    t = (luma(px) - lo) / max(1.0, hi - lo)
    out[m, :3] = np.round(ramp_colour(t, ramp)).astype(np.uint8)
    return out


SKIN_WINDOW = [-15, 36, 0.04, 0.7, 0.35, 1.0]
# The wider window the skin may spread into once it is found: it takes in the shades the teaching window leaves out (the
# deepest shadow under the chin and hairline, the palest highlight and the warm cheek rim). The outline (value under
# 0.2) and the lips and blush (hot, saturated reds and oranges) are never skin, so they keep their own colours.
GROW_WINDOW = [-15, 36, 0.04, 0.98, 0.2, 1.0]
# The palest highlights run cream-yellow (hue to 56) and white: they join only when the skin all but surrounds them.
PALE_WINDOW = [-15, 56, 0.0, 0.32, 0.86, 1.0]
LIP = {'sat': 0.78, 'val': 0.7, 'hue': 22}


def run(hero, tones, hairs, looks, preview=None):
    cfg = CONFIG[hero]
    tone, hair = looks[hero]
    sheets = cfg['sheets']
    images = {s: np.array(Image.open(os.path.join(UNITS, s + '.png')).convert('RGBA')) for s in sheets}
    out = {s: images[s].copy() for s in sheets}
    skin_part = dict(cfg['skin'], sheets=sheets)
    win = cfg['skin'].get('window', SKIN_WINDOW)
    core = classify(images, skin_part, win)
    hairm = None
    if hair and 'hair' in cfg:
        hairm = classify(images, dict(cfg['hair'], sheets=sheets), cfg['hair']['window'], core)
    # (the skin's shaded rim is nearer in colour to hair and leather than to the lit face, so the skin then spreads a
    #  pixel or two into skin-like pixels that are not hair: the cheek's edge, the nostril, the neck's shadow)
    skin = {}
    gwin = cfg['skin'].get('grow', GROW_WINDOW)
    lip = dict(LIP, **cfg['skin'].get('lip', {}))
    for s in sheets:
        a = images[s]
        strict = window(a, win)
        room = strict | window(a, gwin)
        h_, s_, v_ = hsv(a)
        # (lips, blush and other hot, saturated reds are features, not skin: they keep their colours)
        room &= ~((s_ >= lip['sat']) & (v_ >= lip['val']) & ((h_ <= lip['hue']) | (h_ >= 340)))
        # (and the deeper rose of a lip or a blush: red, not the orange of shaded skin)
        room &= ~((s_ >= 0.45) & (v_ >= 0.55) & ((h_ <= 9) | (h_ >= 340)))
        if hairm is not None:
            room &= ~hairm[s]
        m = core[s]
        # (a pixel the teaching window already counts as skin-like may be cream cloth or a pale cuff: the skin spreads only
        #  `spreadLit` pixels into those, and `spread` into the deeper and warmer shades the teaching window left out)
        for i in range(cfg['skin'].get('spread', 3)):
            lit_ok = i < cfg['skin'].get('spreadLit', 1)
            m = m | ((room if lit_ok else room & ~strict) & (neighbours(m) > 0))
        # (pale highlights ringed by skin on four sides or more are the face's own; a cuff's straight edge touches only three)
        for _ in range(3):
            m = m | (room & (neighbours(m) >= cfg['skin'].get('ring', 4)))
        # (the face's palest sparkles are near white and have no hue; they join only when the skin all but surrounds them,
        #  so an eye's white, which the dark iris and lid keep apart from the skin, never does)
        white = window(a, cfg['skin'].get('pale', PALE_WINDOW)) | ((a[..., 3] > 0) & (s_ < 0.04) & (v_ >= 0.8))
        if hairm is not None:
            white &= ~hairm[s]
        for _ in range(2):
            m = m | (white & (neighbours(m) >= cfg['skin'].get('sparkle', 4)))
        skin[s] = m
    # (the lightness range of the taught skin sets where the ramp starts and ends, the same for every sheet of the hero)
    allpx = np.concatenate([images[s][skin[s]][:, :3] for s in sheets]).astype(float)
    lo, hi = np.percentile(luma(allpx), [1, 99.5])
    for s in sheets:
        out[s] = recolour(out[s], skin[s], tones[tone], lo, hi)
    if hairm is not None:
        # (the hair's dark rim spreads the same way, into hair-like pixels that are not skin)
        for s in sheets:
            room = window(images[s], cfg['hair']['window']) & ~skin[s]
            for _ in range(cfg['hair'].get('spread', 1)):
                hairm[s] = hairm[s] | (room & (neighbours(hairm[s]) > 0))
        hpx = np.concatenate([images[s][hairm[s]][:, :3] for s in sheets]).astype(float)
        hlo, hhi = np.percentile(luma(hpx), [2, 99])
        for s in sheets:
            out[s] = recolour(out[s], hairm[s], hairs[hair], hlo, hhi)
    for s in sheets:
        name = os.path.join(UNITS, f'{s}_{tone}.png')
        # (a sheet where no skin shows, the Cleric's back, is left as it is: the source is drawn, not a copy)
        if (out[s] == images[s]).all():
            if os.path.exists(name):
                os.remove(name)
            print(f'{hero}: {s} unchanged, no skin shows; the source is used')
            continue
        Image.fromarray(out[s]).save(name, optimize=True)
        print(f'{hero}: {os.path.relpath(name, ROOT)} ({int(skin[s].sum())} skin px'
              + (f', {int((hairm[s]).sum())} hair px' if hairm is not None else '') + ')')
    if preview:
        os.makedirs(preview, exist_ok=True)
        for s in sheets:
            l = LAYOUT[s]
            show = images[s].copy()
            show[skin[s]] = [255, 0, 255, 255]
            if hairm is not None:
                show[hairm[s]] = [0, 255, 255, 255]
            strip = np.concatenate([images[s], show, out[s]], 1)
            bg = np.zeros_like(strip)
            bg[...] = [52, 54, 66, 255]
            im = Image.alpha_composite(Image.fromarray(bg), Image.fromarray(strip))
            im.save(os.path.join(preview, f'{hero}-{s}.png'))


def main():
    args = sys.argv[1:]
    preview = None
    if '--preview' in args:
        i = args.index('--preview')
        preview = args[i + 1]
        del args[i:i + 2]
    tones, hairs, looks = read_table()
    for hero in args or [h for h in CONFIG if looks.get(h) and looks[h][0] != 'source']:
        if hero in DRAWN_IN_TONE:
            # (his sheets are made from his awakened ones, already drawn in his tone: re-toning them again would darken
            #  his skin twice. tools/knight/plain.py writes both the source and the re-toned copy; docs/notes/knight-sprite.md)
            print(f'{hero}: drawn in its tone already ({DRAWN_IN_TONE[hero]}); skipped')
            continue
        run(hero, tones, hairs, looks, preview)
    write_map(looks)


def write_map(looks):
    """`tools/heritage/sheets.json`: each re-toned sheet's file, read by `tools/resonance/apply.cjs`, which bundles that file
    under the sheet's key in `src/render/resonanceArt.ts` in place of the source (so the source is not bundled at all)."""
    out = {}
    for hero, cfg in CONFIG.items():
        tone = looks.get(hero, ('source', None))[0]
        for s in cfg['sheets']:
            if tone != 'source' and os.path.exists(os.path.join(UNITS, f'{s}_{tone}.png')):
                out[s] = f'{s}_{tone}'
    with open(os.path.join(os.path.dirname(__file__), 'sheets.json'), 'w') as f:
        json.dump(dict(sorted(out.items())), f, indent=1)
        f.write('\n')
    print(f'tools/heritage/sheets.json: {len(out)} re-toned sheets; now run node tools/resonance/apply.cjs --art-only')


if __name__ == '__main__':
    main()
