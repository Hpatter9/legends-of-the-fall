"""The two over-head marks (PIXELLAB-ART): the picked PixelLab candidate (icons.py) as frame 1, and frame 2 the same picture with its
reds (the ring and the seal; the crown's gem) or its golds lifted brighter, for a slow glint. Writes src/art/fx/marks/<mark>.png,
128 x 64.

  python3 tools/pixellab/marks.py
"""
import colorsys, os
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
PICKS = {'wanted': ('wanted_mark', 'cand04', 'red'), 'crown': ('crown_mark', 'cand06', 'gold')}


def glint(im, which):
    out = im.copy(); px = out.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if not a: continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            hit = (h < 0.04 or h > 0.95) and s > 0.45 if which == 'red' else 0.09 < h < 0.17 and s > 0.35
            if hit:
                v = min(1, v * 1.35 + 0.08); s = max(0, s * 0.92)
                r2, g2, b2 = colorsys.hsv_to_rgb(h, s, v)
                px[x, y] = (round(r2 * 255), round(g2 * 255), round(b2 * 255), a)
    return out


if __name__ == '__main__':
    os.makedirs(os.path.join(ROOT, 'src/art/fx/marks'), exist_ok=True)
    for mark, (folder, cand, which) in PICKS.items():
        src = os.path.join(ROOT, 'art-source/pixellab/icons', folder, cand + '.png')
        if not os.path.exists(src): print('skip', mark); continue
        a = Image.open(src).convert('RGBA')
        sheet = Image.new('RGBA', (128, 64)); sheet.paste(a, (0, 0)); sheet.paste(glint(a, which), (64, 0))
        sheet.save(os.path.join(ROOT, 'src/art/fx/marks', mark + '.png'), optimize=True)
        print(mark, 'from', cand)
