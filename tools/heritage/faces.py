#!/usr/bin/env python3
"""Before/after face sheets for the re-toned heroes (docs/notes/heritage-faces.md).

  python3 tools/heritage/faces.py buccaneer [more heroes]     # writes docs/samples/heritage-faces-<hero>.png

Each row is a frame (idle, walk, attack of the front sheet); the columns are the ORIGINAL sheet, the 0.227.0 re-tone
(read from git history) and the current re-tone, the face cropped round the skin the original sheet's mask finds and
enlarged x6 with nearest-neighbour. The first column is the source of truth the tool re-tones from.
"""
import io, json, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(__file__))
import recolour as R

OLD_COMMIT = 'HEAD'  # (the sheets as committed before this repaint: the 0.227.0 re-tone)
Z = 6
CROP = (44, 40)
ROWS = [('idle', 0), ('idle', 2), ('walk', 0), ('walk', 3), ('attack', 0), ('attack', 2)]


def frame_index(l, row, j):
    i = 0
    for r in l['rows']:
        if r == row:
            return i + j
        i += l['counts'].get(r, 0)
    raise ValueError(row)


def git_png(path):
    blob = subprocess.run(['git', 'show', f'{OLD_COMMIT}:{path}'], cwd=R.ROOT, capture_output=True)
    return np.array(Image.open(io.BytesIO(blob.stdout)).convert('RGBA')) if blob.returncode == 0 else None


def main():
    tones, hairs, looks = R.read_table()
    heroes = sys.argv[1:] or [h for h in R.CONFIG if looks.get(h, ('source',))[0] != 'source']
    out_dir = os.path.join(R.ROOT, 'docs', 'samples')
    for hero in heroes:
        cfg = R.CONFIG[hero]
        sheet = cfg['sheets'][0]
        tone = looks[hero][0]
        l = R.LAYOUT[sheet]
        orig = np.array(Image.open(os.path.join(R.UNITS, sheet + '.png')).convert('RGBA'))
        new = np.array(Image.open(os.path.join(R.UNITS, f'{sheet}_{tone}.png')).convert('RGBA'))
        old = git_png(f'src/art/units/{sheet}_{tone}.png')
        cols = [('original', orig), ('0.227.0', old), ('repainted', new)]
        cols = [(n, a) for n, a in cols if a is not None]
        pad = 6
        img = Image.new('RGBA', (len(cols) * (CROP[0] * Z + pad) + pad, len(ROWS) * (CROP[1] * Z + pad) + pad + 14), (52, 54, 66, 255))
        d = ImageDraw.Draw(img)
        for ci, (name, _) in enumerate(cols):
            d.text((pad + ci * (CROP[0] * Z + pad), 2), f'{hero}: {name}', fill=(255, 255, 255, 255))
        for ri, (row, j) in enumerate(ROWS):
            k = frame_index(l, row, j)
            fx, fy = R.frame_origin(l, k)
            diff = (orig[fy:fy + l['h'], fx:fx + l['w']] != new[fy:fy + l['h'], fx:fx + l['w']]).any(-1)
            ys, xs = np.nonzero(diff)
            if len(ys) == 0:
                cy, cx = 40, l['w'] // 2
            else:
                top = ys < ys.min() + 20
                cy, cx = int(ys[top].mean()), int(xs[top].mean())
            x0 = int(np.clip(fx + cx - CROP[0] // 2, fx, fx + l['w'] - CROP[0]))
            y0 = int(np.clip(fy + cy - CROP[1] // 2, fy, fy + l['h'] - CROP[1]))
            for ci, (_, a) in enumerate(cols):
                c = Image.fromarray(a[y0:y0 + CROP[1], x0:x0 + CROP[0]]).resize((CROP[0] * Z, CROP[1] * Z), Image.NEAREST)
                img.alpha_composite(c, (pad + ci * (CROP[0] * Z + pad), 14 + pad + ri * (CROP[1] * Z + pad)))
        os.makedirs(out_dir, exist_ok=True)
        path = os.path.join(out_dir, f'heritage-faces-{hero}.png')
        img.convert('RGB').save(path)
        print(path)


if __name__ == '__main__':
    main()
