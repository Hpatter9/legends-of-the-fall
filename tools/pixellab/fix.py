"""A correction pass on frames reskin.py made (PIXELLAB-ART): edit-animation-v2 over the chosen generated frames together, with a text
of what to fix (a colour that slipped back to the source's, say), so they keep their poses and stay alike. The frames before the pass
are kept beside them as <frame>.pre.png. Then rerun reskin.py to write the sheet.

  python3 tools/pixellab/fix.py <piece> "<what to fix>" <row_00> <row_01> ...
"""
import os, shutil, sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
from pl import call, b64, images_of  # noqa: E402
from reskin import clean, per_call  # noqa: E402


def fix(piece, desc, names, seed=900):
    d = os.path.join(ROOT, 'art-source/pixellab', piece)
    ims = [Image.open(os.path.join(d, n + '.png')).convert('RGBA') for n in names]
    w, h = ims[0].size
    n = 16 if max(w, h) <= 64 else 9 if max(w, h) <= 80 else 4
    for s in range(0, len(names), n):
        part, nm = ims[s:s + n], names[s:s + n]
        if len(part) == 1: part = part + part
        res = call('/edit-animation-v2', {'description': desc, 'frames': [{'image': b64(f), 'size': {'width': w, 'height': h}} for f in part],
                                          'image_size': {'width': w, 'height': h}, 'no_background': True, 'seed': seed + s},
                   piece, 'fix ' + ' '.join(nm), refs=[f'art-source/pixellab/{piece}/{x}.png' for x in nm])
        for name, im in zip(nm, images_of(res)):
            pre = os.path.join(d, name + '.pre.png')
            if not os.path.exists(pre): shutil.copy(os.path.join(d, name + '.png'), pre)
            clean(im).save(os.path.join(d, name + '.png'))


if __name__ == '__main__':
    fix(sys.argv[1], sys.argv[2], sys.argv[3:])
