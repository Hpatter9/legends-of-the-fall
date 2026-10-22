"""The war camp's places (tools/camp/places.py): the Tower and the Daily board as things standing in the scene, in src/art/camp/.
  tower.png          the Knights watchtower (as the castle uses it: src/art/castle/watchtower.png), copied
  tower_locked.png   the same drained of colour and darkened, a chain across its door and a padlock (the Tower before the Orc Warband is beaten)
  board.png          the Fae ribbon signpost of Chronos's isometric kits (hpatter9/little-town), halved like the camp's other pieces: a board with papers and ribbons pinned to it
Run: python3 tools/camp/places.py"""
import os, shutil
import numpy as np
from PIL import Image, ImageDraw
ISO = '/home/user/hpatter9/little-town/src/renderer/art/iso/kits/'
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
out = os.path.join(ROOT, 'src', 'art', 'camp')

def half(im):
    a = np.array(im.convert('RGBA')).astype(float)
    h, w = a.shape[0] // 2, a.shape[1] // 2
    a = a[:h * 2, :w * 2].reshape(h, 2, w, 2, 4)
    al = a[..., 3].sum(axis=(1, 3))
    rgb = (a[..., :3] * a[..., 3:4]).sum(axis=(1, 3)) / np.maximum(al, 1)[..., None]
    o = np.zeros((h, w, 4), np.uint8)
    o[..., :3] = rgb.clip(0, 255)
    o[..., 3] = np.where(al >= 510, 255, 0)
    return Image.fromarray(o)

tower = Image.open(os.path.join(ROOT, 'src', 'art', 'castle', 'watchtower.png')).convert('RGBA')
shutil.copy(os.path.join(ROOT, 'src', 'art', 'castle', 'watchtower.png'), os.path.join(out, 'tower.png'))
a = np.array(tower).astype(float)
lum = (a[..., 0] * 0.3 + a[..., 1] * 0.59 + a[..., 2] * 0.11)[..., None]
a[..., :3] = (lum + (a[..., :3] - lum) * 0.2) * 0.6
locked = Image.fromarray(a.clip(0, 255).astype(np.uint8))
d = ImageDraw.Draw(locked)
w, h = locked.size
ink, iron, hi = (20, 18, 24, 255), (120, 124, 134, 255), (190, 194, 204, 255)
# (two chains across the door, links drawn as short dashes, and a padlock at the crossing)
for x0, y0, x1, y1 in [(w // 2 - 16, h - 44, w // 2 + 16, h - 22), (w // 2 + 16, h - 44, w // 2 - 16, h - 22)]:
    n = 9
    for i in range(n):
        x = x0 + (x1 - x0) * i / (n - 1)
        y = y0 + (y1 - y0) * i / (n - 1)
        d.rectangle([x - 2, y - 1, x + 2, y + 1], fill=iron if i % 2 else hi, outline=ink)
cx, cy = w // 2, h - 33
d.arc([cx - 4, cy - 12, cx + 4, cy - 2], 180, 360, fill=hi, width=2)
d.rectangle([cx - 6, cy - 6, cx + 6, cy + 5], fill=(214, 168, 70, 255), outline=ink)
d.rectangle([cx - 1, cy - 2, cx + 1, cy + 2], fill=ink)
locked.save(os.path.join(out, 'tower_locked.png'), optimize=True)

b = half(Image.open(ISO + 'fae/ribbon_signpost.png'))
b = b.crop(b.getchannel('A').getbbox())
b.save(os.path.join(out, 'board.png'), optimize=True)
print('tower', tower.size, 'board', b.size)
