"""Redo chosen frames of a reskinned sheet against one of its own finished frames (PIXELLAB-ART's consistency fix): each frame is
carried over again from the kin's frame by /transfer-outfit-v2, with the chosen good frame as the reference instead of the first key,
so its gear, weapon and colours come out the same as the rest. The frame it replaces is kept as <frame>.pre.png (unless one is
already there). Then rerun reskin.py to write the sheet.

  python3 tools/pixellab/redo.py <piece> <reference frame, e.g. idle_00> <frame> [<frame> ...]
"""
import os, shutil, sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
from pl import call, b64, images_of  # noqa: E402
from reskin import PIECES, SHEETS, clean, frames_of, per_call  # noqa: E402


def redo(piece, ref, names, seed=950):
    p = PIECES[piece]; lay = SHEETS[p['source']]; w, h = lay['w'], lay['h']
    d = os.path.join(ROOT, 'art-source/pixellab', piece)
    _, frames = frames_of(p['source'], lay)
    src = {f'{r}_{i:02d}': f for (r, i, f) in frames}
    key = Image.open(os.path.join(d, ref + '.png')).convert('RGBA')
    n = per_call(w, h)
    for s in range(0, len(names), n):
        part = names[s:s + n]
        fr = [src[x] for x in part]
        if len(fr) == 1: fr = fr + fr
        body = {'reference_image': {'image': b64(key), 'size': {'width': w, 'height': h}},
                'frames': [{'image': b64(f), 'size': {'width': w, 'height': h}} for f in fr],
                'image_size': {'width': w, 'height': h}, 'no_background': True, 'seed': seed + s,
                'additional_instructions': p.get('extra', "keep each frame's pose, size and position exactly; side view facing right") +
                '; copy the reference exactly: the same gear, the same weapon and the same colours'}
        res = call('/transfer-outfit-v2', body, piece, 'redo ' + ' '.join(part) + ' against ' + ref,
                   refs=[f'src/art/units/{p["source"]}.png'] + [f'art-source/pixellab/{piece}/{ref}.png'])
        for name, im in zip(part, images_of(res)):
            out = os.path.join(d, name + '.png'); pre = os.path.join(d, name + '.pre.png')
            if not os.path.exists(pre): shutil.copy(out, pre)
            clean(im).save(out)


if __name__ == '__main__':
    redo(sys.argv[1], sys.argv[2], sys.argv[3:])
