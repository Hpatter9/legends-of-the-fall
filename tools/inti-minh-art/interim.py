#!/usr/bin/env python3
"""INTI-MINH-ART: an interim pass on Inti's and Minh's packed battle sheets, until their new art lands.

  python3 tools/inti-minh-art/interim.py            # rewrite the four sheets (and their toned copies) in place
  python3 tools/inti-minh-art/interim.py --preview  # only write docs/samples/inti-minh-art/interim.png

A filter, not a repaint: no pixel is added, moved or removed (alpha is untouched). Three steps, each the roster's
own measure (`measure.py`): the silhouette's rim pixels are darkened towards the dark outline the other heroes
carry, lightness is stretched a little round its middle so the shading reads deeper, and colours are made a little
more vivid. It cannot change proportions, pose or the amount of drawn detail: those wait for the new sheets.
Run once only, on freshly packed sheets (`python3 tools/hero-remakes/pack.py peasant ranger` restores them).
"""
import colorsys, json, sys
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
UNITS = ROOT / 'src/art/units'
TONED = json.loads((ROOT / 'tools/heritage/sheets.json').read_text())
# rim: what the rim's colour is multiplied by; contrast: the stretch round mid lightness; vivid: the saturation gain.
PASS = {'hero_res_ranger': dict(rim=0.45, contrast=1.22, vivid=1.3),
        'hero_res_peasant': dict(rim=0.5, contrast=1.18, vivid=1.2)}


def filtered(im, rim, contrast, vivid):
    a = np.array(im.convert('RGBA')).astype(float)
    on = a[..., 3] > 0
    rgb = a[..., :3] / 255
    grey = (rgb @ np.array([0.299, 0.587, 0.114]))[..., None]
    rgb = grey + (rgb - grey) * vivid                 # more vivid
    rgb = 0.42 + (rgb - 0.42) * contrast              # deeper shading
    pad = np.pad(on, 1)
    edge = on & ~(pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:])
    rgb[edge] *= rim                                  # the dark outline
    a[..., :3] = np.clip(rgb, 0, 1) * 255
    a[~on] = 0
    return Image.fromarray(a.round().astype(np.uint8))


def main():
    preview = '--preview' in sys.argv
    strips = []
    for base, p in PASS.items():
        for sheet in (base, base + '_back'):
            path = UNITS / f'{sheet}.png'
            before = Image.open(path).convert('RGBA')
            after = filtered(before, **p)
            layout = json.loads((UNITS / 'sheets.json').read_text())[sheet]
            w, h = layout['w'], layout['h']
            strip = Image.new('RGBA', (w * 4, h), (104, 108, 112, 255))
            for i, (im, row, col) in enumerate([(before, 0, 0), (after, 0, 0), (before, 3, 1), (after, 3, 1)]):
                strip.alpha_composite(im.crop((col * w, row * h, (col + 1) * w, (row + 1) * h)), (i * w, 0))
            strips.append(strip)
            if not preview:
                after.save(path, optimize=True)
                (UNITS / f'{TONED[sheet]}.png').write_bytes(path.read_bytes())
    out = Image.new('RGBA', (strips[0].width, sum(s.height for s in strips)), (104, 108, 112, 255))
    y = 0
    for s in strips:
        out.alpha_composite(s, (0, y)); y += s.height
    dest = ROOT / 'docs/samples/inti-minh-art/interim.png'
    out.convert('RGB').resize((out.width * 2, out.height * 2), Image.Resampling.NEAREST).save(dest)
    print(dest, 'idle before, idle after, attack before, attack after; front then back, Inti then Minh')


if __name__ == '__main__':
    main()
