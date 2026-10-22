"""Make the Mage Tower's three towers with PixelLab (create-image-pixflux, final pixel size, flat shading, low detail, low top-down view),
in the village houses' own palette so they sit beside them: the palette is 21 colours quantised from house4, house2, gb_shop, tt_long and
su_roundcastle (Chronos's art). Usage: towers.py <outdir>  -> t1_<seed>.png, t2_<seed>.png, t3_<seed>.png (3 seeds each); prep.py takes t1_3, t2_2, t3_2."""
import base64, io, json, os, sys, time, urllib.request, concurrent.futures as cf
from PIL import Image
LT = '/home/user/hpatter9/little-town/src/renderer/art/'
out = sys.argv[1]
os.makedirs(out, exist_ok=True)
ims = [Image.open(LT + p).convert('RGBA') for p in ('village/house4.png', 'village/house2.png', 'shops/gb_shop.png', 'packs/tt_long.png', 'packs/su_roundcastle.png')]
big = Image.new('RGB', (sum(i.width for i in ims), max(i.height for i in ims)), (0, 0, 0))
x = 0
for i in ims:
    bg = Image.new('RGB', i.size, (0, 0, 0))
    bg.paste(i, (0, 0), i)
    big.paste(bg, (x, 0))
    x += i.width
q = big.quantize(22, method=Image.MEDIANCUT, dither=Image.NONE).convert('RGB')
cols = [c for c in sorted(set(q.get_flattened_data() if hasattr(q, 'get_flattened_data') else q.getdata())) if c != (0, 0, 0)][:24]
pal = Image.new('RGB', (len(cols), 1))
for i, c in enumerate(cols):
    pal.putpixel((i, 0), c)
buf = io.BytesIO()
pal.save(buf, 'PNG')
pb = {'type': 'base64', 'base64': base64.b64encode(buf.getvalue()).decode()}
TAIL = ', village building seen from the front slightly above'
SPECS = {
    't1': ((48, 72), 'a tiny squat round stone tower with a short pointed blue slate roof and a small wooden door' + TAIL),
    't2': ((64, 104), 'a small stone wizard tower with a pointed blue slate roof, arched windows and a wooden door' + TAIL),
    't3': ((72, 136), 'a tall grand stone wizard tower with a pointed blue slate roof topped with a glowing blue crystal, glowing blue runes and arched windows, a balcony' + TAIL),
}
log = open(f'{out}/jobs.log', 'a')


def go(job):
    name, seed = job
    (w, h), desc = SPECS[name]
    body = {'description': desc, 'image_size': {'width': w, 'height': h}, 'no_background': True, 'view': 'low top-down', 'direction': 'south', 'outline': 'single color black outline', 'shading': 'flat shading', 'detail': 'low detail', 'seed': seed, 'color_image': pb}
    log.write(f'{time.time():.0f} start {name} {seed}\n')
    log.flush()
    req = urllib.request.Request('https://api.pixellab.ai/v2/create-image-pixflux', json.dumps(body).encode(), {'Content-Type': 'application/json'})
    for _ in range(4):
        try:
            r = json.load(urllib.request.urlopen(req, timeout=180))
            break
        except Exception:
            time.sleep(4)
    else:
        return name, seed, 'failed'
    d = r.get('image') or r
    Image.open(io.BytesIO(base64.b64decode((d['base64'] if isinstance(d, dict) else d).split(',')[-1]))).save(f'{out}/{name}_{seed}.png')
    return name, seed, 'ok'


with cf.ThreadPoolExecutor(4) as ex:
    for res in ex.map(go, [(n, s) for n in SPECS for s in (1, 2, 3)]):
        print(res, flush=True)
