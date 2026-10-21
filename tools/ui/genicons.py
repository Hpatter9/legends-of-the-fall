"""Generate the five tab icons with PixelLab (32x32, transparent, forced warm palette). Usage: genicons.py <outdir> [seeds]"""
import base64, io, json, os, sys, urllib.request, concurrent.futures as cf
from PIL import Image
out = sys.argv[1]; seeds = [int(s) for s in (sys.argv[2] if len(sys.argv) > 2 else '1,2').split(',')]
os.makedirs(out, exist_ok=True)
PAL = ['#1a0d07','#3b2316','#6b4128','#b8761e','#f0b44a','#ffe48a','#f6ead6','#c8b394','#d9573f','#7a2a1c','#4a9cff','#2c5aa0','#8c8c8c','#555555','#3a8a3a']
pal = Image.new('RGB', (len(PAL), 1))
for i, c in enumerate(PAL): pal.putpixel((i, 0), tuple(int(c[j:j+2], 16) for j in (1, 3, 5)))
buf = io.BytesIO(); pal.save(buf, 'PNG')
palb = {'type': 'base64', 'base64': base64.b64encode(buf.getvalue()).decode()}
ICONS = {
 'recruit': 'pixel art game icon, a rolled magic summoning scroll with a red wax seal and gold sparkles',
 'heroes': 'pixel art game icon, a knight helmet with a red plume, front view',
 'battle': 'pixel art game icon, two crossed steel swords with golden hilts',
 'castle': 'pixel art game icon, a small stone castle with two towers and a red flag',
 'spells': 'pixel art game icon, an open spellbook with a glowing blue star',
}
def gen(job):
    name, seed = job
    body = {'description': ICONS[name], 'image_size': {'width': 32, 'height': 32}, 'no_background': True, 'outline': 'single color black outline', 'shading': 'medium shading', 'detail': 'medium detail', 'seed': seed, 'color_image': palb}
    req = urllib.request.Request('https://api.pixellab.ai/v2/create-image-pixflux', json.dumps(body).encode(), {'Content-Type': 'application/json'})
    import time
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
    for res in ex.map(gen, [(n, s) for n in ICONS for s in seeds if not os.path.exists(f'{out}/{n}_{s}.png')]): print('ok', res)
