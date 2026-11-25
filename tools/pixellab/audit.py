"""PIXELLAB-ART's consistency audit: for every frame of a reskinned sheet, how far its colours are from the sheet's own (the distance
of its colour histogram from the median of all its frames) and how its drawn height compares with its kin's frame (the size kept).
A frame far out on either is printed for a look by eye; a frame the kin draws with an effect only (no figure) is not scored.

  python3 tools/pixellab/audit.py [<piece> ...]       (every piece when none is named)
"""
import json, os, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
from reskin import PIECES, SHEETS, frames_of  # noqa: E402


def hist(im):
    a = np.asarray(im.convert('RGBA')).reshape(-1, 4)
    a = a[a[:, 3] > 0][:, :3] // 32
    if not len(a): return None
    h = np.bincount(a[:, 0] * 64 + a[:, 1] * 8 + a[:, 2], minlength=512).astype(float)
    return h / h.sum()


def height(im):
    bb = im.getbbox()
    return (bb[3] - bb[1]) if bb else 0


def audit(piece, pal=0.32, size=0.12):
    p = PIECES[piece]
    _, src = frames_of(p['source'], SHEETS[p['source']])
    _, new = frames_of(p['out'], SHEETS.get(p['out']) or SHEETS[p['source']])
    keep = set(p.get('keepSource', []))
    rows = []
    for (r, i, s), (_, _, n) in zip(src, new):
        name = f'{r}_{i:02d}'
        if name in keep or height(s) < 0.5 * max(1, SHEETS[p['source']]['figure']): continue
        rows.append((name, hist(n), height(n) / max(1, height(s))))
    med = np.median(np.array([h for _, h, _ in rows if h is not None]), axis=0)
    out = []
    for name, h, k in rows:
        d = 0.5 * np.abs(h - med).sum() if h is not None else 1
        if d > pal or abs(k - 1) > size: out.append(f'{name} colours {d:.2f} height {k:.2f}')
    print(f'{piece}: {len(rows)} frames scored; {len(out)} to look at' + ''.join('\n  ' + o for o in out))


if __name__ == '__main__':
    for piece in sys.argv[1:] or [k for k in PIECES]:
        if os.path.exists(os.path.join(ROOT, 'src/art/units', PIECES[piece]['out'] + '.png')): audit(piece)
