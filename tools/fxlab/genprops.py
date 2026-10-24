"""Generate the little prop sprites the spell looks throw (a feather, a coin, a note...) with PixelLab: 32x32, transparent, the game's warm palette.
Usage: python3 -I tools/fxlab/genprops.py <outdir> [seeds]   (then pick.py packs the chosen seed of each into src/art/fx/props.png)"""
import base64, io, json, os, sys, time, urllib.request, concurrent.futures as cf
from PIL import Image
out = sys.argv[1]; seeds = [int(s) for s in (sys.argv[2] if len(sys.argv) > 2 else '1,2,3').split(',')]
os.makedirs(out, exist_ok=True)
PAL = ['#1a0d07','#3b2316','#6b4128','#b8761e','#f0b44a','#ffe48a','#f6ead6','#c8b394','#d9573f','#7a2a1c','#4a9cff','#2c5aa0','#8c8c8c','#555555','#3a8a3a','#9be07a','#b06aff','#2a2030']
pal = Image.new('RGB', (len(PAL), 1))
for i, c in enumerate(PAL): pal.putpixel((i, 0), tuple(int(c[j:j+2], 16) for j in (1, 3, 5)))
buf = io.BytesIO(); pal.save(buf, 'PNG')
palb = {'type': 'base64', 'base64': base64.b64encode(buf.getvalue()).decode()}
PROPS = {
 'feather': 'pixel art, a single black crow feather, diagonal, glossy dark purple shine',
 'coin': 'pixel art, a single shiny gold coin with a star stamped on it, front view',
 'note': 'pixel art, a single musical eighth note, golden, with a small sparkle',
 'bandage': 'pixel art, a small roll of tan linen mummy bandage unwinding',
 'fist': 'pixel art, a clenched fist punching, glowing white-gold, side view',
 'skull': 'pixel art, a small pale ghostly skull spirit with blue glow',
 'anchor': 'pixel art, a small iron ship anchor with chain',
 'cannonball': 'pixel art, a black iron cannonball with a lit fuse and a spark',
 'leaf': 'pixel art, a single green forest leaf with a bright vein',
 'paw': 'pixel art, a wolf paw print, orange glow',
 'scythe': 'pixel art, a small curved grim reaper scythe blade, steel blue glow',
 'banner': 'pixel art, a small red war banner flag on a pole with a gold emblem',
}
def gen(job):
    name, seed = job
    body = {'description': PROPS[name], 'image_size': {'width': 32, 'height': 32}, 'no_background': True, 'outline': 'single color black outline', 'shading': 'medium shading', 'detail': 'medium detail', 'seed': seed, 'color_image': palb}
    req = urllib.request.Request('https://api.pixellab.ai/v2/create-image-pixflux', json.dumps(body).encode(), {'Content-Type': 'application/json'})
    for attempt in range(3):
        try: r = json.load(urllib.request.urlopen(req, timeout=180)); break
        except Exception as e:
            print('retry', name, seed, e); time.sleep(5)
    else: return name, seed, 'failed'
    d = r.get('image') or r.get('data', {}).get('image') or r
    b64 = d['base64'] if isinstance(d, dict) else d
    Image.open(io.BytesIO(base64.b64decode(b64.split(',')[-1]))).save(f'{out}/{name}_{seed}.png')
    return name, seed, 'ok'
with cf.ThreadPoolExecutor(4) as ex:
    for res in ex.map(gen, [(n, s) for n in PROPS for s in seeds if not os.path.exists(f'{out}/{n}_{s}.png')]): print(res)
