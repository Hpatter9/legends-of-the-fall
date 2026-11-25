"""The missing mounted trophies (PIXELLAB-ART): the empty mount (locked.webp) edited by PixelLab so each keepsake hangs on the very
same shield, fittings and blank nameplate as the painted trophies. Writes src/art/trophies/<id>.webp, 256 x 256.

  python3 tools/pixellab/trophies.py [<id> ...]
"""
import os, sys
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
from pl import call, b64, images_of  # noqa: E402

KEEP = '; replace the two brass hooks; keep the shield, brass fittings, blank nameplate and dark background exactly; painterly, no text'
TROPHIES = {
    'boarKing': (401, 'mount a huge tusked boar head helm on the carved wooden shield, bristling grey-brown hair, two curved ivory tusks, a small iron crown between the ears'),
    'forestBoss3': (413, 'mount a large, thick crown of thorny dark branches with small antlers and green leaves in the middle of the carved wooden shield, a short broken spear stub with a glowing amber bronze spearhead hung upright beneath the crown, everything small enough to stay inside the shield'),
    'orcChieftain': (403, 'mount an orc war banner top on the carved wooden shield: a horned skull on a short pole with tattered red cloth, crossed behind a fur-trimmed iron orc helm'),
    'alphaWolf': (404, 'mount the head and pelt of a huge black werewolf on the carved wooden shield, a grizzled silver ruff, bared fangs, amber glass eyes, a broken iron chain collar hanging below'),
    'forestBoss1': (405, 'mount a mossy green troll mask overgrown with bramble on the carved wooden shield, two glowing violet and blue mushrooms sprouting from its brow'),
    'forestBoss2': (406, 'mount a carved wooden tribal mask with two antlers and violet war paint on the carved wooden shield, two hand axes crossed behind it'),
    'devilLeader': (407, 'mount a black and teal plate helm with two curved red horns on the carved wooden shield, a small iron brazier cup hung beside it with a flame still burning'),
}


def make(tid):
    seed, desc = TROPHIES[tid]
    out = os.path.join(ROOT, 'src/art/trophies', tid + '.webp')
    raw = os.path.join(ROOT, 'art-source/pixellab/trophies', tid + '.png')
    if os.path.exists(raw): return
    lk = Image.open(os.path.join(ROOT, 'src/art/trophies/locked.webp')).convert('RGBA')
    res = call('/edit-images-v2', {'method': 'edit_with_text', 'edit_images': [{'image': b64(lk), 'width': 256, 'height': 256}],
                                   'image_size': {'width': 256, 'height': 256}, 'description': desc + KEEP, 'seed': seed},
               'trophy_' + tid, 'the empty mount edited', refs=['src/art/trophies/locked.webp'])
    im = images_of(res)[0]
    os.makedirs(os.path.dirname(raw), exist_ok=True); im.save(raw)


def write(tid):
    im = Image.open(os.path.join(ROOT, 'art-source/pixellab/trophies', tid + '.png')).convert('RGB')
    im.save(os.path.join(ROOT, 'src/art/trophies', tid + '.webp'), quality=86, method=6)


if __name__ == '__main__':
    ids = sys.argv[1:] or list(TROPHIES)
    with ThreadPoolExecutor(4) as ex: list(ex.map(make, ids))
    for t in ids: write(t)
    print('done', ids)
