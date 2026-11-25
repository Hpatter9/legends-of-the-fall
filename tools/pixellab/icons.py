"""Single pictures from PixelLab (PIXELLAB-ART): icons, marks and tiles, each from a text prompt with the game's own art as its style
image. Every candidate PixelLab returns is kept under art-source/pixellab/icons/<id>/ so the one picked (`pick`) can be changed
without asking again.

  python3 tools/pixellab/icons.py <id> [<id> ...]      (python3 tools/pixellab/icons.py --list)
"""
import json, os, sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
from pl import call, b64, images_of  # noqa: E402

ICONS = json.load(open(os.path.join(HERE, 'icons.json')))


def run(iid):
    p = ICONS[iid]
    d = os.path.join(ROOT, 'art-source/pixellab/icons', iid); os.makedirs(d, exist_ok=True)
    if not any(f.startswith('cand') for f in os.listdir(d)):
        w, h = p['size']
        body = {'description': p['prompt'], 'image_size': {'width': w, 'height': h}, 'no_background': p.get('transparent', True),
                'seed': p.get('seed', 1)}
        if p.get('style'):
            st = Image.open(os.path.join(ROOT, p['style'])).convert('RGBA')
            if 'styleCrop' in p: st = st.crop(tuple(p['styleCrop']))
            body['style_image'] = {'image': b64(st), 'size': {'width': st.width, 'height': st.height}}
            body['style_options'] = p.get('styleOptions', {'color_palette': False, 'outline': True, 'detail': True, 'shading': True})
        res = call('/generate-image-v2', body, 'icon_' + iid, p.get('note', ''), refs=[p.get('style', '')])
        for i, im in enumerate(images_of(res)):
            im.save(os.path.join(d, f'cand{i:02d}.png'))
    print(iid, len([f for f in os.listdir(d) if f.startswith('cand')]), 'candidates in', os.path.relpath(d, ROOT))


if __name__ == '__main__':
    if sys.argv[1:] == ['--list']: print('\n'.join(ICONS)); sys.exit()
    for a in sys.argv[1:]: run(a)
