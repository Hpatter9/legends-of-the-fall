"""PIXELLAB-ART's trial on the pause medallion: the painted speed medallion (speed-1.webp) edited by PixelLab, its chevron replaced by two
gold pause bars. Candidates go to art-source/pixellab/pause/; the one used is copied to src/art/ui/buttons/pause.webp by hand.

  python3 tools/pixellab/pause.py
"""
import os, sys
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
from pl import call, b64, images_of  # noqa: E402

src = Image.open(os.path.join(ROOT, 'src/art/ui/buttons/speed-1.webp')).convert('RGBA')
d = os.path.join(ROOT, 'art-source/pixellab/pause'); os.makedirs(d, exist_ok=True)
res = call('/edit-images-v2', {'method': 'edit_with_text', 'edit_images': [{'image': b64(src), 'width': 96, 'height': 96}],
                               'image_size': {'width': 96, 'height': 96}, 'no_background': True, 'seed': 601,
                               'description': 'replace the gold chevron in the middle with the pause symbol: two upright rounded embossed gold bars side by side; keep the brass rim, rivets and slate-green face exactly'},
           'pause_medallion', 'trial: speed medallion edited', refs=['src/art/ui/buttons/speed-1.webp'])
for i, im in enumerate(images_of(res)): im.save(os.path.join(d, f'cand{i:02d}.png'))
print('ok')
# (the pick, cand00, was cut to its drawn box and fitted to the speed medallion's 94 px box at (1, 1); see docs/notes/pixellab-art.md)
