#!/usr/bin/env python3
"""The Paladin's plain battle sheets, made from his awakened ones (docs/notes/fixes3.md), as the Knight's were
(tools/knight/plain.py, docs/notes/knight-sprite.md).

The old plain sheets were another man: a pale, blond, blue-eyed youth, re-toned to olive skin and brown hair by the
heritage tool, which left him a greyish, muddy face beside the bearded, brown-haired, olive-skinned man he awakens into
(and who is in his painted portrait). So the plain sheets are the awakened sheets (`src/art/awakened/awakened_paladin.png`
and `_back`), frame for frame, in plainer gear:

- the gold plate, trim, belt and the mace become plain steel (each pixel keeps its own lightness, so the shading, the
  outlines and the highlights are exactly as painted), and the mace's glowing orange gem goes with them;
- the gold sun on the shield stays gold: his blue shield with its gold sign is the Paladin's mark, before and after;
- the blue and white cloth is kept as it is.

The face is kept: the largest solid patch of skin colour on each frame (the face, or the neck from behind) and the dark
hair and beard round it are left exactly as they are. Alpha is untouched and nothing is blurred.

The awakened sheets already carry his olive skin and dark brown hair (heroLooks.ts), so the result is written both as the
source sheet (`hero_res_paladin.png`, `_back`) and as its re-toned copy (`_olive`), which is the one the game bundles;
the heritage tool skips the Paladin (`DRAWN_IN_TONE`).

  python3 tools/paladin/plain.py
  python3 tools/paladin/plain.py --preview DIR   # also write a before/after strip for review
"""
import importlib.util, os, sys
import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location('knight_plain', os.path.join(HERE, '..', 'knight', 'plain.py'))
K = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(K)

ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
AWAKENED = os.path.join(ROOT, 'src', 'art', 'awakened')
UNITS = os.path.join(ROOT, 'src', 'art', 'units')
# (each sheet, what it is written as, and which side of the figure the shield is carried on)
SHEETS = [('awakened_paladin', ['hero_res_paladin', 'hero_res_paladin_olive'], 1),
          ('awakened_paladin_back', ['hero_res_paladin_back', 'hero_res_paladin_back_olive'], -1)]
CELL = (138, 127)
K.CELL = CELL
# (how far below and round the hair the face and beard reach, in pixels)
GROW = 16


def sun(alpha, blue, gold, shield_side):
    """The gold sign on the shield, each frame: the largest solid gold inside the convex outline of a large blue field,
    on the shield's side of the figure (the Knight's lion finder, kept rather than painted over)."""
    out = np.zeros_like(alpha)
    cw, ch = CELL
    H, W = alpha.shape
    for y0 in range(0, H, ch):
        for x0 in range(0, W, cw):
            comps = K.components(blue[y0:y0 + ch, x0:x0 + cw])
            xs = np.nonzero(alpha[y0:y0 + ch, x0:x0 + cw].any(0))[0]
            if not len(xs):
                continue
            mid = (xs.min() + xs.max()) / 2
            g = gold[y0:y0 + ch, x0:x0 + cw]
            best = None
            for seed in comps:
                if len(seed) < 40:
                    continue
                near = K.dilate(K.mask_of(seed, (ch, cw)), 5)
                field = list(seed)
                for c in comps:
                    if c is not seed and len(c) >= 12 and any(near[y, x] for y, x in c):
                        field += c
                hull = Image.new('L', (cw, ch), 0)
                ImageDraw.Draw(hull).polygon([(x, y) for y, x in K.convex_hull(field)], fill=255)
                inside = K.erode(np.asarray(hull) > 0, 2)
                parts = [c for c in K.components(g & inside) if len(c) >= 12
                         and (np.mean([x for _, x in c]) - mid) * shield_side >= 4]
                if parts:
                    m = np.zeros((ch, cw), bool)
                    for c in parts:
                        m |= K.mask_of(c, (ch, cw))
                    if best is None or m.sum() > best.sum():
                        best = m
            if best is not None:
                out[y0:y0 + ch, x0:x0 + cw] |= best
    return out


def head_mask(rgb, alpha):
    """The head of each frame, kept as painted: his dark brown hair (the largest solid patch of it in the cell) and what
    of the face and beard joins it. The skin's hues are the gold plate's too, so the face is found by where it lies, grown
    from the hair through skin and beard colours, never through the plate's pale or bright gold highlights."""
    h, s, v = K.hsv(rgb)
    hair = alpha & ((h < 28) | (h >= 345)) & (s > 0.55) & (v < 0.3)
    headish = alpha & ((h < 30) | (h >= 340)) & (s > 0.4) & ~((h >= 24) & (v > 0.8) & (s > 0.45))
    keep = np.zeros_like(alpha)
    cw, ch = CELL
    H, W = alpha.shape
    for y0 in range(0, H, ch):
        for x0 in range(0, W, cw):
            cell = hair[y0:y0 + ch, x0:x0 + cw]
            solid = K.dilate(K.erode(cell, 1), 1) & cell
            comps = [c for c in K.components(solid) if len(c) >= 20]
            if not comps:
                continue
            m = K.mask_of(max(comps, key=len), (ch, cw))
            # (the hair's own dark pixels about it, then the face and beard grown from it, a pixel a step)
            m |= K.dilate(m, 2) & cell
            # (within the hair's width and a face's height below it: never out along a pauldron or an arm)
            ys, xs = np.nonzero(m)
            box = np.zeros_like(m)
            box[max(ys.min() - 2, 0):ys.max() + GROW, max(xs.min() - 3, 0):xs.max() + 4] = True
            grow = headish[y0:y0 + ch, x0:x0 + cw] & box
            for _ in range(GROW):
                m = m | (K.dilate(m, 1) & grow)
            # (and the face's own bright highlights inside it: a gap closed round)
            m |= K.erode(K.dilate(m, 2), 2) & alpha[y0:y0 + ch, x0:x0 + cw] & box
            keep[y0:y0 + ch, x0:x0 + cw] = m
    return keep


def plain(src, shield_side):
    a = np.asarray(Image.open(src).convert('RGBA')).astype(float)
    rgb = a[..., :3] / 255
    alpha = a[..., 3] > 0
    h, s, v = K.hsv(rgb)
    y = rgb @ np.array([0.299, 0.587, 0.114])

    # (the head as painted, but for any plate's yellow gold that the face's outline took in at a shoulder)
    kept = head_mask(rgb, alpha) & ~((h >= 33) & (h < 72) & (s > 0.4) & (v > 0.5))

    gold = alpha & ~kept & (h >= 8) & (h < 72) & (s > 0.28)
    # (the mace's glow runs to orange and red)
    ember = alpha & ~kept & ((h >= 345) | (h < 8)) & (s > 0.5) & (v > 0.35)
    blue = alpha & (h >= 185) & (h < 255) & (s > 0.28)
    sign = sun(alpha, blue, gold, shield_side)

    out = rgb.copy()
    steel = np.clip(np.minimum(y * 1.04, 1)[..., None] * K.STEEL, 0, 1)
    out = np.where(((gold | ember) & ~sign)[..., None], steel, out)
    res = a.copy()
    res[..., :3] = np.round(out * 255)
    return res.astype(np.uint8)


def main():
    preview = sys.argv[sys.argv.index('--preview') + 1] if '--preview' in sys.argv else None
    for src, outs, side in SHEETS:
        img = plain(os.path.join(AWAKENED, src + '.png'), side)
        if preview:
            before = Image.open(os.path.join(UNITS, outs[1] + '.png')).convert('RGBA')
            awake = Image.open(os.path.join(AWAKENED, src + '.png')).convert('RGBA')
            after = Image.fromarray(img)
            strip = Image.new('RGBA', (before.width + awake.width * 2 + 16, max(before.height, awake.height)), (90, 110, 90, 255))
            strip.alpha_composite(before, (0, 0))
            strip.alpha_composite(after, (before.width + 8, 0))
            strip.alpha_composite(awake, (before.width + awake.width + 16, 0))
            strip.save(os.path.join(preview, src + '-plain.png'))
        for o in outs:
            Image.fromarray(img).save(os.path.join(UNITS, o + '.png'), optimize=True)
            print('wrote', o)


if __name__ == '__main__':
    main()
