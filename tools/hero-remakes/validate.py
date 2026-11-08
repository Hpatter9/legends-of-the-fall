#!/usr/bin/env python3
"""Check the actual shipped remake pixels, including both views and all rows."""
import hashlib
import json
from pathlib import Path
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from pack import HEROES, ROOT, ROWS, UNITS


def main():
    sys.path.insert(0, str(ROOT / 'tools/heritage'))
    import recolour
    _, _, looks = recolour.read_table()
    layout = json.loads((UNITS / 'sheets.json').read_text())
    total = 0
    for hero in HEROES:
        assert hero in recolour.DRAWN_IN_TONE, (hero, 'must bypass skin filter')
        fronts = []
        for sheet in recolour.CONFIG[hero]['sheets']:
            path = UNITS / f'{sheet}.png'
            assert path.read_bytes() == (UNITS / f'{sheet}_{looks[hero][0]}.png').read_bytes(), (sheet, 'double tint')
            a = np.array(Image.open(path).convert('RGBA'))
            l = layout[sheet]
            assert a.shape == (l['h'] * 7, l['w'] * 4, 4), (sheet, 'layout dimensions')
            assert set(np.unique(a[:, :, 3])) == {0, 255}, (sheet, 'soft alpha')
            assert l['counts']['walk'] == 8 and l['rows'] == ROWS, sheet
            fronts.append(hashlib.sha256(path.read_bytes()).hexdigest())
            walk = []
            for ri, row in enumerate(ROWS):
                for col in range(4):
                    f = a[ri*l['h']:(ri+1)*l['h'], col*l['w']:(col+1)*l['w']]
                    ys, xs = np.nonzero(f[:, :, 3])
                    assert len(xs) > 150, (sheet, row, col, 'empty')
                    assert xs.min() >= 4 and xs.max() < l['w'] - 4 and ys.min() >= 2 and ys.max() < l['h'] - 1, (sheet, row, col, 'clipped')
                    if row in ['walk', '_walk']:
                        walk.append(hashlib.sha256(f.tobytes()).hexdigest())
                    if row == 'dead' and col == 3:
                        assert xs.max() - xs.min() > (ys.max() - ys.min()) * 1.2, (sheet, 'final death must lie down')
                    total += 1
            assert len(set(walk)) == 8, (sheet, 'repeated walk poses')
        assert fronts[0] != fronts[1], (hero, 'rear view is a front copy')
    print(f'{len(HEROES)} heroes, 20 sheets, {total} frames: alpha, bounds, stride, death poses, distinct rear views and no second skin filter passed')


if __name__ == '__main__':
    main()
