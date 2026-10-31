#!/usr/bin/env python3
"""Cut the relic paintings out of their magenta background and draw the contact sheet.

  python3 tools/relics/cutout.py [ids...]        # raw/<id>.png (or the try named in raw/picks.json) -> <id>.png
  python3 tools/relics/cutout.py --sheet         # also art-source/relics/contact-sheet.png

The background is the colour of the painting's border (near #FF00FF). Pixels close to it that join the border are
background; pixels near the edge of the object get a soft alpha from how far they are from the background and have
the magenta unmixed out of them (so glows and soft edges stay, without a pink fringe). Then a light despill on the
edge band, a trim to the visible pixels and a fit into 256 x 256 with a small margin.
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA = json.load(open(os.path.join(ROOT, 'tools/relics/relics.json')))
OUT = os.path.join(ROOT, 'art-source/relics')
RAW = os.path.join(OUT, 'raw')
HARD, SOFT, BAND, SIZE, MARGIN = 70.0, 150.0, 4, 256, 0.06
GLOW_K, GLOW_BAND = 90.0, 40

def cut(src):
    im = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
    h, w, _ = im.shape
    border = np.concatenate([im[0], im[-1], im[:, 0], im[:, -1]])
    bg = np.median(border, axis=0)
    d = np.sqrt(((im - bg) ** 2).sum(-1))
    # background: near-bg pixels that join the border, plus any almost exact bg (holes inside rings)
    lab, _ = ndimage.label(d < HARD)
    edge_labels = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    back = np.isin(lab, list(edge_labels)) | (d < 28)
    # soft band: within BAND px of the background
    band = ndimage.binary_dilation(back, iterations=BAND) & ~back
    a = np.ones((h, w), np.float32); a[back] = 0
    soft = band & (d < SOFT)
    a[soft] = np.clip((d[soft] - HARD * 0.6) / (SOFT - HARD * 0.6), 0, 1)
    # glows over the background: a pixel that is part magenta (red and blue both well above green) near the edge
    # is taken as that much see-through. GLOW_K is above most violets' own red-blue-over-green, so violet stays solid.
    kbg = max(1.0, min(bg[0], bg[2]) - bg[1])
    k = np.minimum(im[..., 0], im[..., 2]) - im[..., 1]
    near = ndimage.binary_dilation(back, iterations=GLOW_BAND) & ~back
    ak = np.clip(1 - (k - GLOW_K) / (kbg - GLOW_K), 0, 1)
    g = near & (k > GLOW_K)
    a[g] = np.minimum(a[g], ak[g])
    soft = soft | g
    # unmix the background out of the partly transparent pixels
    out = im.copy()
    am = np.maximum(a, 1e-3)[..., None]
    un = (im - (1 - am) * bg) / am
    m = soft & (a > 0)
    out[m] = np.clip(un[m], 0, 255)
    # despill the edge band: magenta shows as red and blue both above green
    e = band | ndimage.binary_dilation(band, iterations=1)
    r, g, b = out[..., 0], out[..., 1], out[..., 2]
    spill = np.clip(np.minimum(r, b) - g, 0, None) * e
    out[..., 0] -= spill * 0.85; out[..., 2] -= spill * 0.85
    # erode the outermost pixel of the cut by half and smooth the alpha a touch
    alpha = Image.fromarray((a * 255).astype(np.uint8))
    alpha = Image.fromarray(np.minimum(np.asarray(alpha), np.asarray(alpha.filter(ImageFilter.MinFilter(3))) * 0.5 + np.asarray(alpha) * 0.5).astype(np.uint8))
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.6))
    rgba = Image.fromarray(np.dstack([np.clip(out, 0, 255).astype(np.uint8), np.asarray(alpha)]), 'RGBA')
    # drop stray specks: keep islands at least 2% of the largest
    sol = np.asarray(alpha) > 16
    lab, n = ndimage.label(sol)
    if n > 1:
        sizes = ndimage.sum(sol, lab, range(1, n + 1)); keep = sizes >= sizes.max() * 0.02
        kill = ~np.isin(lab, np.nonzero(keep)[0] + 1) & sol
        arr = np.asarray(rgba).copy(); arr[ndimage.binary_dilation(kill, iterations=2) & ~np.isin(lab, np.nonzero(keep)[0] + 1), 3] = 0
        rgba = Image.fromarray(arr, 'RGBA')
    box = Image.fromarray((np.asarray(rgba)[..., 3] > 8).astype(np.uint8) * 255).getbbox()
    rgba = rgba.crop(box)
    inner = int(SIZE * (1 - 2 * MARGIN)); s = inner / max(rgba.size)
    rgba = rgba.resize((max(1, round(rgba.width * s)), max(1, round(rgba.height * s))), Image.LANCZOS)
    canvas = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    canvas.alpha_composite(rgba, ((SIZE - rgba.width) // 2, (SIZE - rgba.height) // 2))
    return canvas

def sheet(path):
    rel = DATA['relics']; cols = 8; cw, ch = 200, 240
    rows = (len(rel) + cols - 1) // cols
    s = Image.new('RGBA', (cols * cw, rows * ch), (46, 42, 40, 255)); dr = ImageDraw.Draw(s)
    try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 13)
    except OSError: font = ImageFont.load_default()
    for i, r in enumerate(rel):
        x, y = (i % cols) * cw, (i // cols) * ch
        dr.rectangle([x + 8, y + 8, x + cw - 8, y + 192], fill=(62, 57, 54, 255))
        f = os.path.join(OUT, r[0] + '.png')
        if os.path.exists(f):
            s.alpha_composite(Image.open(f).convert('RGBA').resize((180, 180), Image.LANCZOS), (x + 10, y + 10))
        else:
            dr.text((x + cw // 2, y + 100), 'missing', fill=(220, 90, 90, 255), font=font, anchor='mm')
        dr.text((x + cw // 2, y + 205), r[1], fill=(240, 232, 214, 255), font=font, anchor='mm')
        dr.text((x + cw // 2, y + 224), f"{DATA['groups'][r[2]]['label'].split(':')[0]} · {r[3]}", fill=(170, 160, 146, 255), font=font, anchor='mm')
    s.save(path)

def main():
    args = sys.argv[1:]; do_sheet = '--sheet' in args; args = [a for a in args if a != '--sheet']
    picks = json.load(open(os.path.join(RAW, 'picks.json'))) if os.path.exists(os.path.join(RAW, 'picks.json')) else {}
    for r in DATA['relics']:
        if args and r[0] not in args: continue
        src = os.path.join(RAW, picks.get(r[0], r[0] + '.png'))
        if not os.path.exists(src): print('no raw for', r[0]); continue
        cut(src).save(os.path.join(OUT, r[0] + '.png')); print('cut', r[0])
    if do_sheet: sheet(os.path.join(OUT, 'contact-sheet.png')); print('sheet')

if __name__ == '__main__':
    main()
