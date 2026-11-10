#!/usr/bin/env python3
"""SWEEP-1110: brings a hold's borrowed kit pieces into its own palette in the atlas already cut (src/art/assault/<army>/sprites.webp), by
the profile's `kit_tint` in cut-sheets.py, for when the Chronos kits are not to hand to cut the hold afresh. A fresh cut applies the same
tint itself, so this is run once, after a cut made before the tint was added, never after a fresh cut.

Run by hand: python3 tools/assault/tint-kit.py labyrinth
"""
import importlib.util
import os
import re
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..', '..')
spec = importlib.util.spec_from_file_location('cut_sheets', os.path.join(HERE, 'cut-sheets.py'))
cs = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cs)

army = sys.argv[1]
prof = cs.SHEETS[army]
kit_tint = prof.get('kit_tint')
if not kit_tint:
    sys.exit(f'{army}: no kit_tint in its profile')
Army = army[0].upper() + army[1:]
ts = open(os.path.join(ROOT, 'src', 'render', f'assault{Army}Atlas.ts')).read()
rects = {m[1]: [int(x) for x in m[2].split(',')] for m in re.finditer(r'^  (\w+): \{ r: \[([\d, ]+)\]', ts, re.M)}
path = os.path.join(ROOT, 'src', 'art', 'assault', army, 'sprites.webp')
atlas = np.array(Image.open(path).convert('RGBA'))
done = []
for name, kit in prof['kits'].items():
    fn = kit_tint(kit)
    if not fn or name not in rects:
        continue
    x, y, w, h = rects[name]
    atlas[y:y + h, x:x + w] = fn(atlas[y:y + h, x:x + w])
    done.append(name)
Image.fromarray(atlas).save(path, lossless=False, quality=90, method=6)
print(f'{army}: tinted {len(done)} pieces: {", ".join(sorted(done))}')
