"""Duchess's walking strip in a costume (PIXELLAB-ART, the costumes): her strip (src/art/duchess/goat.png, six 48 px frames, 1 to 3
walking left and 4 to 6 walking right) dressed frame by frame. A key frame is made from her standing right-facing frame (4) by
/edit-images-v2, and the six frames are carried over together by /transfer-outfit-v2 with it as the reference, so each keeps her pose.
Writes art-source/duchess-costumes/<costume>/ (the key and each frame) and src/art/duchess/duchess_<costume>_walk.png.

  python3 tools/pixellab/duchess_strip.py <costume> "<what she wears>" [seed]
"""
import os, sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
from pl import call, b64, images_of  # noqa: E402
from reskin import clean  # noqa: E402

costume, wears = sys.argv[1], sys.argv[2]
seed = int(sys.argv[3]) if len(sys.argv) > 3 else 1201
d = os.path.join(ROOT, 'art-source/duchess-costumes', costume); os.makedirs(d, exist_ok=True)
strip = Image.open(os.path.join(ROOT, 'src/art/duchess/goat.png')).convert('RGBA')
frames = [strip.crop((i * 48, 0, i * 48 + 48, 48)) for i in range(6)]
keyp = os.path.join(d, 'walk_key.png')
if not os.path.exists(keyp):
    res = call('/edit-images-v2', {'method': 'edit_with_text', 'edit_images': [{'image': b64(frames[3]), 'width': 48, 'height': 48}],
                                   'image_size': {'width': 48, 'height': 48}, 'no_background': True, 'seed': seed,
                                   'description': 'the same small white goat ' + wears + '; bold simple shapes readable at this tiny size; same pose, same facing, same size'},
               'duchess_' + costume + '_walk', 'key frame', refs=['src/art/duchess/goat.png frame 4'])
    clean(images_of(res)[0]).save(keyp)
key = Image.open(keyp).convert('RGBA')
outs = [os.path.join(d, f'walk_{i}.png') for i in range(6)]
if not all(os.path.exists(o) for o in outs):
    res = call('/transfer-outfit-v2', {'reference_image': {'image': b64(key), 'size': {'width': 48, 'height': 48}},
                                       'frames': [{'image': b64(f), 'size': {'width': 48, 'height': 48}} for f in frames],
                                       'image_size': {'width': 48, 'height': 48}, 'no_background': True, 'seed': seed + 1,
                                       'additional_instructions': "keep each frame's pose, facing, size and position exactly (frames 1 to 3 face left, 4 to 6 face right); the same costume in every frame"},
               'duchess_' + costume + '_walk', 'six frames', refs=['src/art/duchess/goat.png', keyp])
    for o, im in zip(outs, images_of(res)): clean(im).save(o)
out = Image.new('RGBA', (288, 48))
for i, o in enumerate(outs): out.paste(Image.open(o), (i * 48, 0))
dest = os.path.join(ROOT, 'src/art/duchess', f'duchess_{costume}_walk.png')
out.save(dest, optimize=True)
print('->', os.path.relpath(dest, ROOT))
