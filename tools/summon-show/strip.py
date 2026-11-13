"""SUMMON-SHOW: a filmstrip (each frame carries the page's own clock in its corner; the label over it is the screencast's time, which runs
behind under load) of a filmed take (film.mjs): frames picked every `--every` ms (or at the times given), in rows, each with its
time. python3 tools/summon-show/strip.py <take dir> <out.webp> [--every 500 | --at 0,400,... | --count 24] [--cols 6] [--scale 0.5]"""
import glob, os, sys
from PIL import Image, ImageDraw

args = sys.argv[1:]
src, out = args[0], args[1]
opt = dict(zip(args[2::2], args[3::2]))
every = int(opt.get('--every', 500))
cols = int(opt.get('--cols', 6))
scale = float(opt.get('--scale', 0.5))
frames = sorted((int(os.path.basename(f).split('-')[1].split('.')[0]), f) for f in glob.glob(os.path.join(src, '*.jpg')))
if '--count' in opt:
    # (frames picked evenly through the whole take by their order: the screencast's times run behind under load, the order never does)
    k = int(opt['--count'])
    picks = [frames[round(i * (len(frames) - 1) / (k - 1))] for i in range(k)]
else:
    times = [int(x) for x in opt['--at'].split(',')] if '--at' in opt else list(range(0, frames[-1][0] + 1, every))
    picks = []
    for t in times:
        best = min(frames, key=lambda f: abs(f[0] - t) if f[0] <= t + 60 else 1e9)
        picks.append((t, best[1]))
ims = [Image.open(f).convert('RGB') for _, f in picks]
w, h = round(ims[0].width * scale), round(ims[0].height * scale)
rows = -(-len(ims) // cols)
sheet = Image.new('RGB', (cols * (w + 4) + 4, rows * (h + 18) + 4), (12, 20, 16))
d = ImageDraw.Draw(sheet)
for i, ((t, _), im) in enumerate(zip(picks, ims)):
    x, y = 4 + (i % cols) * (w + 4), 4 + (i // cols) * (h + 18)
    sheet.paste(im.resize((w, h), Image.LANCZOS), (x, y + 14))
    d.text((x + 2, y + 1), f'{t / 1000:.2f} s', fill=(240, 220, 150))
sheet.save(out, quality=82)
print(out, len(ims), 'frames', sheet.size)
