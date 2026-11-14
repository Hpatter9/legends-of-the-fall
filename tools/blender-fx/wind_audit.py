"""ON-FIGHTER, the wind-ups' audit (docs/notes/on-fighter.md): how far each hero's wind-up changes its caster's own pixels.

`WIND=<ms,...>` on ult-shots.mjs leaves three photographs of each moment: the fight as played, the same without the effects
(`-bare`), and without the effects and the caster (`-none`). The caster's pixels are where the last two differ; over those, how
far the first is from the second (0: untouched, 1: black to white) is how much of the body the wind-up took.

  python3 tools/blender-fx/wind_audit.py <dir> [sheet.jpg]      a table, worst first; the sheet is every hero's frames, worst first
"""
import glob, os, re, sys
from PIL import Image, ImageChops, ImageDraw
import numpy as np

d = sys.argv[1]


def grow(m, n):
    """The mask spread by n px each way."""
    out = m.copy()
    for dy in range(-n, n + 1):
        for dx in range(-n, n + 1):
            out |= np.roll(np.roll(m, dy, axis=0), dx, axis=1)
    return out


rows = {}
for f in sorted(glob.glob(os.path.join(d, 'wind-*-bare.png'))):
    pick, i_ = re.match(r'wind-(.+)-(\d+)-bare\.png', os.path.basename(f)).groups()
    a, b, n = (np.asarray(Image.open(f.replace('-bare', x)).convert('RGB')).astype(float) for x in ('', '-bare', '-none'))
    body = np.abs(b - n).max(axis=2) > 24
    if body.sum() < 200:
        continue
    change = np.abs(a - b).mean(axis=2)[body] / 255
    # (`took`: the mean change over the body; `lost`: the share of the body changed by more than a quarter, the part that no longer reads as itself)
    # (`edge`: how well the body's outline still stands out from what is round it. A body is read by its outline: a wall of the
    # effect right behind it, in colours near its own, loses it though not a pixel of the body is changed. In blocks of 12 px
    # along the outline, the colour just inside against the colour just outside, with the effects over without them: 1 is an
    # outline as clear as in the bare fight, 0.5 one half as clear. `wall`: the share of the outline with the effect behind it.)
    inner, outer = body & ~grow(~body, 3), grow(body, 3) & ~body
    behind = np.abs(a - b).mean(axis=2) / 255 > 0.25
    was, now, walled, n_out = [], [], 0, 0
    for y in range(0, body.shape[0], 12):
        for x in range(0, body.shape[1], 12):
            i, o = inner[y:y + 12, x:x + 12], outer[y:y + 12, x:x + 12]
            if i.sum() < 6 or o.sum() < 6:
                continue
            was.append(np.abs(b[y:y + 12, x:x + 12][i].mean(axis=0) - b[y:y + 12, x:x + 12][o].mean(axis=0)).mean())
            now.append(np.abs(a[y:y + 12, x:x + 12][i].mean(axis=0) - a[y:y + 12, x:x + 12][o].mean(axis=0)).mean())
            walled += behind[y:y + 12, x:x + 12][o].mean() > 0.5
            n_out += 1
    edge = float(np.sum(now) / max(1e-6, np.sum(was)))
    rows.setdefault(pick, []).append((int(i_), round(float(change.mean()), 3), round(float((change > 0.25).mean()), 3), round(edge, 2), round(walled / max(1, n_out), 2)))
# (worst first: the least clear outline of any moment)
table = sorted(((min(x[3] for x in v), k, v) for k, v in rows.items()))
for worst, k, v in table:
    print(f'{k:18s} edge {worst:.2f}   ' + '  '.join(f'[{i}] took {t:.2f} lost {l:.2f} edge {e:.2f} wall {w:.2f}' for i, t, l, e, w in v))
if len(sys.argv) > 2:
    cells = []
    for worst, k, v in table:
        ims = [Image.open(os.path.join(d, f'wind-{k}-{i}.png')).convert('RGB') for i, *_ in v]
        w, h = ims[0].size
        o = Image.new('RGB', (w * len(ims), h))
        for j, im in enumerate(ims):
            o.paste(im, (j * w, 0))
        ImageDraw.Draw(o).text((6, 6), f'{k} edge {worst:.2f}', fill=(255, 255, 0))
        cells.append(o)
    cols = 2
    w, h = max(c.size[0] for c in cells), cells[0].size[1]
    sheet = Image.new('RGB', (w * cols, h * -(-len(cells) // cols)))
    for j, c in enumerate(cells):
        sheet.paste(c, ((j % cols) * w, (j // cols) * h))
    sheet.save(sys.argv[2], quality=85)
    print(sheet.size)
