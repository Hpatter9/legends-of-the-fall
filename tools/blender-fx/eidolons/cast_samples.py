"""The samples of the staged call in the real game (docs/notes/eidolon-blender.md), from shots.mjs's pictures.

Run: python3 tools/blender-fx/eidolons/cast_samples.py <new shots dir> <main's shots dir> <out dir>

  askel-game-<size>.webp        the whole cast, animated (393 at 12 frames a second, 360 and 412 at 6)
  askel-game-<size>-strip.webp   twelve stills across it
  askel-game-short-strip.webp, askel-game-reduced-strip.webp   the short call and reduced motion (393 x 852)
  askel-game-before-after.webp  main's call above, the staged one below, at the same moments
"""
import glob, os, re, sys
from PIL import Image, ImageDraw, ImageFont

NEW, MAIN, OUT = sys.argv[-3:]
os.makedirs(OUT, exist_ok=True)
try:
    font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 14)
except OSError:
    font = ImageFont.load_default()


def shots(d, tag):
    """The pictures of one run, by their time in ms."""
    out = {}
    for f in glob.glob(os.path.join(d, 'today-askel-*.png')):
        m = re.fullmatch(r'today-askel-(\d{4})(.*)\.png', os.path.basename(f))
        if m and m.group(2) == tag:
            out[int(m.group(1))] = f
    return dict(sorted(out.items()))


def strip(run, times, path, label=''):
    ims = [Image.open(run[min(run, key=lambda k: abs(k - t))]).convert('RGB') for t in times]
    w, h = ims[0].size
    sheet = Image.new('RGB', (w * len(ims), h + 20), (16, 12, 10))
    d = ImageDraw.Draw(sheet)
    for i, (im, t) in enumerate(zip(ims, times)):
        sheet.paste(im, (i * w, 20))
        d.text((i * w + 5, 2), f'{label}{t / 1000:.1f} s', fill=(255, 226, 170), font=font)
    sheet.save(path, quality=82, method=5)
    return sheet


TIMES = [200, 450, 700, 1100, 1700, 2300, 2900, 3350, 3600, 4000, 4700, 5700]
for size, tag, every in (('393', '', 1), ('360', '-360', 2), ('412', '-412', 2)):
    run = shots(NEW, tag)
    frames = [Image.open(f).convert('RGB') for f in list(run.values())[::every]]
    step = (list(run)[1] - list(run)[0]) * every
    frames[0].save(os.path.join(OUT, f'askel-game-{size}.webp'), save_all=True, append_images=frames[1:], duration=step, loop=0, quality=68, method=4)
    strip(run, TIMES, os.path.join(OUT, f'askel-game-{size}-strip.webp'))
strip(shots(NEW, '-short'), [100, 300, 500, 800, 1100, 1400, 1600, 1800, 2100, 2500, 3000], os.path.join(OUT, 'askel-game-short-strip.webp'))
strip(shots(NEW, '-reduced'), TIMES, os.path.join(OUT, 'askel-game-reduced-strip.webp'))
a = strip(shots(MAIN, ''), TIMES, os.path.join(OUT, '_main.webp'), 'main ')
b = strip(shots(NEW, ''), TIMES, os.path.join(OUT, '_new.webp'), 'staged ')
both = Image.new('RGB', (a.width, a.height + b.height), (16, 12, 10))
both.paste(a, (0, 0))
both.paste(b, (0, a.height))
both.save(os.path.join(OUT, 'askel-game-before-after.webp'), quality=82, method=5)
os.remove(os.path.join(OUT, '_main.webp'))
os.remove(os.path.join(OUT, '_new.webp'))
for f in sorted(glob.glob(os.path.join(OUT, 'askel-game-*'))):
    print(os.path.basename(f), os.path.getsize(f), 'bytes')
