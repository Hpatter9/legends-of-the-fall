"""NEW-ICON: the game's icon, everywhere, from the owner's three layers (art-source/icon/, PR #706).

The painted emblem (icon-foreground.png: the cracked gold crown over the keep on its crag) fills only about 42% of its canvas, so it is
scaled up before it is laid on the sky (icon-background.png); icon-full.png, the painter's own composite at the small size, is not used.

- The full icon: the emblem's width scaled to FULL_WIDTH of the icon's, centred, lifted by LIFT (the keep's base is heavy).
- The adaptive icon's foreground (Android 8+): the emblem scaled so that every drawn pixel lies inside the safe circle (66% of the
  layer's width, less SAFE_PAD), centred, lifted the same; its background is the sky alone. Both layers are 108 dp at every density.

Writes:
  android/app/src/main/res/mipmap-<density>/ic_launcher.png, ic_launcher_round.png (legacy: the full icon, square and in a circle),
      ic_launcher_foreground.png, ic_launcher_background.png (the adaptive layers);
  android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml, ic_launcher_round.xml;
  src/art/icon-192.png, icon-512.png, icon-maskable-512.png (the web; the maskable one keeps the emblem in its safe circle);
  docs/store/icon-512.png (Google Play: opaque, 32-bit);
  docs/samples/new-icon/preview.png (the sizes and masks beside the old icon).

  python3 tools/icon/build.py
"""
import math, os
import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
SRC = os.path.join(ROOT, 'art-source/icon')
RES = os.path.join(ROOT, 'android/app/src/main/res')
FULL_WIDTH = 0.64   # the emblem's share of the full icon's width (the director's 62 to 66%)
LIFT = 0.02         # how far above centre the emblem sits, as a share of the icon
SAFE_PAD = 0.01     # a margin inside the adaptive safe circle
DENSITIES = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}
W = 1024


def emblem():
    fg = Image.open(os.path.join(SRC, 'icon-foreground.png')).convert('RGBA')
    return fg.crop(fg.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox())


def place(em, scale, size=W):
    """The emblem at `scale` of its own size on a clear canvas, centred and lifted."""
    e = em.resize((round(em.width * scale), round(em.height * scale)), Image.LANCZOS)
    c = Image.new('RGBA', (size, size))
    c.alpha_composite(e, ((size - e.width) // 2, round((size - e.height) / 2 - LIFT * size)))
    return c


def safe_scale(em):
    """The largest scale at which every drawn pixel of the lifted, centred emblem lies inside the adaptive safe circle."""
    a = np.array(em.getchannel('A')) > 8
    ys, xs = np.nonzero(a)
    cx, cy = em.width / 2, em.height / 2
    r_needed = 0.0
    lo, hi = 0.1, 4.0
    for _ in range(40):
        s = (lo + hi) / 2
        dx = (xs + 0.5 - cx) * s
        dy = (ys + 0.5 - cy) * s - LIFT * W
        r_needed = math.sqrt(float((dx * dx + dy * dy).max()))
        if r_needed <= W * (0.66 / 2 - SAFE_PAD): lo = s
        else: hi = s
    return lo


def circle(size, ss=4):
    m = Image.new('L', (size * ss, size * ss))
    ImageDraw.Draw(m).ellipse((0, 0, size * ss - 1, size * ss - 1), fill=255)
    return m.resize((size, size), Image.LANCZOS)


def rounded(size, radius, ss=4):
    m = Image.new('L', (size * ss, size * ss))
    ImageDraw.Draw(m).rounded_rectangle((0, 0, size * ss - 1, size * ss - 1), radius=radius * size * ss, fill=255)
    return m.resize((size, size), Image.LANCZOS)


def squircle(size, n=4.5):
    y, x = np.mgrid[0:size, 0:size]
    u = np.abs((x + 0.5) / size * 2 - 1); v = np.abs((y + 0.5) / size * 2 - 1)
    return Image.fromarray(((u ** n + v ** n) <= 1).astype(np.uint8) * 255).filter(__import__('PIL.ImageFilter', fromlist=['x']).GaussianBlur(0.6))


def masked(im, mask):
    out = im.convert('RGBA').copy()
    out.putalpha(mask)
    return out


def main():
    bg = Image.open(os.path.join(SRC, 'icon-background.png')).convert('RGBA').resize((W, W), Image.LANCZOS)
    em = emblem()
    full = bg.copy(); full.alpha_composite(place(em, FULL_WIDTH * W / em.width))
    s_safe = safe_scale(em)
    fg_adaptive = place(em, s_safe)
    print(f'emblem {em.size}; full icon: {FULL_WIDTH:.0%} of the width; adaptive: {em.width * s_safe / W:.0%} of the layer (inside the safe circle)')

    # Android: legacy and adaptive, at every density
    for d, k in DENSITIES.items():
        folder = os.path.join(RES, f'mipmap-{d}'); os.makedirs(folder, exist_ok=True)
        legacy = round(48 * k); layer = round(108 * k)
        sq = full.resize((legacy, legacy), Image.LANCZOS)
        sq.convert('RGB').convert('RGBA').save(os.path.join(folder, 'ic_launcher.png'), optimize=True)
        masked(sq, circle(legacy)).save(os.path.join(folder, 'ic_launcher_round.png'), optimize=True)
        fg_adaptive.resize((layer, layer), Image.LANCZOS).save(os.path.join(folder, 'ic_launcher_foreground.png'), optimize=True)
        bg.resize((layer, layer), Image.LANCZOS).convert('RGB').save(os.path.join(folder, 'ic_launcher_background.png'), optimize=True)
    any_dir = os.path.join(RES, 'mipmap-anydpi-v26'); os.makedirs(any_dir, exist_ok=True)
    xml = ('<?xml version="1.0" encoding="utf-8"?>\n<!-- NEW-ICON: written by tools/icon/build.py -->\n'
           '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
           '    <background android:drawable="@mipmap/ic_launcher_background" />\n'
           '    <foreground android:drawable="@mipmap/ic_launcher_foreground" />\n'
           '    <monochrome android:drawable="@mipmap/ic_launcher_foreground" />\n'
           '</adaptive-icon>\n')
    for n in ('ic_launcher', 'ic_launcher_round'):
        open(os.path.join(any_dir, f'{n}.xml'), 'w').write(xml)

    # the web and the store
    full.resize((192, 192), Image.LANCZOS).convert('RGB').save(os.path.join(ROOT, 'src/art/icon-192.png'), optimize=True)
    full.resize((512, 512), Image.LANCZOS).convert('RGB').save(os.path.join(ROOT, 'src/art/icon-512.png'), optimize=True)
    maskable = bg.copy(); maskable.alpha_composite(fg_adaptive)
    maskable.resize((512, 512), Image.LANCZOS).convert('RGB').save(os.path.join(ROOT, 'src/art/icon-maskable-512.png'), optimize=True)
    full.resize((512, 512), Image.LANCZOS).save(os.path.join(ROOT, 'docs/store/icon-512.png'), optimize=True)  # RGBA: 32-bit, opaque

    preview(full, bg, fg_adaptive)


def preview(full, bg, fg_adaptive):
    old = Image.open(os.path.join(ROOT, 'docs/samples/new-icon/old-icon-512.png')).convert('RGBA')
    cell = 560; pad = 24
    sheet = Image.new('RGBA', (cell * 6 + pad, cell * 2 + 80), (40, 42, 50, 255))
    d = ImageDraw.Draw(sheet)
    for row, (name, icon, adaptive) in enumerate([('old', old, old), ('new', full, None)]):
        y = row * (cell + 40) + 30
        d.text((8, y - 22), name, fill=(255, 255, 255, 255))
        x = pad
        for s in (512, 192, 96, 48, 36):
            t = icon.resize((s, s), Image.LANCZOS); sheet.alpha_composite(t, (x, y)); x += s + 16
        # the masks, at 160: as a launcher crops the adaptive layers (the old icon: its square cropped)
        base = adaptive if adaptive is not None else Image.alpha_composite(bg, fg_adaptive)
        for m in (circle(160), squircle(160), rounded(160, 0.18)):
            if adaptive is None:
                t = base.resize((int(160 * 108 / 72), int(160 * 108 / 72)), Image.LANCZOS)
                o = (t.width - 160) // 2; t = t.crop((o, o, o + 160, o + 160))
            else:
                t = base.resize((160, 160), Image.LANCZOS)
            sheet.alpha_composite(masked(t, m), (x, y)); x += 176
    os.makedirs(os.path.join(ROOT, 'docs/samples/new-icon'), exist_ok=True)
    sheet = sheet.crop((0, 0, pad + 512 + 192 + 96 + 48 + 36 + 5 * 16 + 3 * 176, sheet.height))
    sheet.save(os.path.join(ROOT, 'docs/samples/new-icon/preview.png'))


if __name__ == '__main__':
    main()
