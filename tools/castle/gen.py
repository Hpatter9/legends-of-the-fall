# The town square's fountain and benches, made with PixelLab (/generate-with-style-v2) from kit pieces as style references (see docs/notes/castle-scene.md).
# Run from the repo root; each job id is saved to the scratch folder before it is polled (at most 4 jobs are submitted at once):
#   python3 tools/castle/gen.py submit fountain 11 12 13 14     submit a job per seed
#   python3 tools/castle/gen.py collect fountain 11 12 13 14    poll them and save the candidates to <scratch>/fountain_<seed>.png
# The candidate picked by eye is copied to tools/castle/generated/<name>.png at its full (2x) size; tools/castle/prep.py halves it like the kit pieces.
import sys, os, json, io, base64
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'pixellab'))
from api import post, poll, b64
from PIL import Image
ISO = '/home/user/hpatter9/little-town/src/renderer/art/iso/kits/'
W = os.environ.get('GEN_DIR', '/tmp/castlegen') + '/'
os.makedirs(W, exist_ok=True)
CANVAS = int(os.environ.get('GEN_CANVAS', '192'))
SD = 'isometric 2:1 pixel art in the style of a city-builder game, crisp single pixels, dark outlines, soft shading lit from the upper left, muted natural palette'
SPECS = {
    'fountain': dict(refs=['knights/well', 'dwarves/shrine', 'dwarves/brazier', 'knights/chapel'],
                     desc='a round stone town-square fountain in isometric 2:1 view: a wide low circular stone basin full of clear blue water, a carved stone pedestal rising from its middle with a smaller stone bowl on top, water streaming from the top bowl down into the basin, grey weathered stone blocks with moss in the cracks, no background, centred, fills the canvas'),
    'bench': dict(refs=['knights/cart', 'knights/woodpile', 'knights/crates', 'knights/signpost'],
                  desc='a small wooden park bench with a plank seat and back and two grey stone end blocks, in isometric 2:1 view, its long side running from upper left to lower right, seen from the front, weathered brown wood, no background, centred'),
}
def piece(path):
    im = Image.open(ISO + path + '.png').convert('RGBA')
    im = im.crop(im.getchannel('A').getbbox())
    c = Image.new('RGBA', (CANVAS, CANVAS))
    c.paste(im, ((CANVAS - im.width) // 2, CANVAS - 8 - im.height), im)
    return c
cmd, name, seeds = sys.argv[1], sys.argv[2], [int(x) for x in sys.argv[3:]]
spec = SPECS[name]
for seed in seeds:
    f = W + f'{name}_{seed}.json'
    if cmd == 'submit':
        body = {'style_images': [{'image': {'type': 'base64', 'base64': b64(piece(r)), 'format': 'png'}, 'width': CANVAS, 'height': CANVAS} for r in spec['refs']],
                'description': spec['desc'], 'style_description': SD, 'no_background': True, 'seed': seed}
        print(seed, post('/generate-with-style-v2', body, f))
    else:
        r = poll(json.load(open(f))['background_job_id'])
        ims = (r.get('last_response') or {}).get('images', [])
        print(seed, r['status'], len(ims))
        for i, m in enumerate(ims):
            Image.open(io.BytesIO(base64.b64decode(m['base64']))).convert('RGBA').save(W + f'{name}_{seed}_{i}.png')
