"""Generate the castle scene's pieces with PixelLab (create-image-pixflux, final pixel size, side view).
Usage: gen.py <outdir> <seeds e.g. 1,2,3> [name ...]   (every request is logged to <outdir>/jobs.log before it is sent)"""
import base64, io, json, os, sys, time, urllib.request, concurrent.futures as cf
from PIL import Image
out = sys.argv[1]; seeds = [int(s) for s in sys.argv[2].split(',')]; only = sys.argv[3:]
os.makedirs(out, exist_ok=True)
STYLE = ', side view, 16-bit pixel art, warm earthy palette, clean black outline, game sprite'
# name: (w, h, description, transparent)
SPECS = {}
def stages(key, parts):
    for i, (w, h, d) in enumerate(parts): SPECS[f'{key}{i}'] = (w, h, d + STYLE, True)
stages('treasury', [
 (64, 40, 'an empty building plot on dirt: a few wooden stakes, a rope square, a pile of stones and one wooden plank, nothing built yet'),
 (80, 72, 'a tiny stone storehouse with a wooden door and thatched roof, one small gold coin pile by the door'),
 (96, 96, 'a stone treasury house with a slate roof, an iron-banded door, two open chests spilling gold coins out front, gold pile'),
 (112, 128, 'a grand golden-roofed treasury hall with stone pillars, a vault door, huge piles of gold coins and gems, gold treasure chests, banners'),
])
stages('barracks', [
 (64, 40, 'an empty building plot on dirt: a few wooden stakes, a rope square, and a stack of planks, nothing built yet'),
 (80, 72, 'a small wooden soldiers hut with a plank roof, a wooden training dummy with a straw head stands next to it'),
 (96, 96, 'a timber and stone barracks hall with a red tiled roof, a training dummy and a target stand, a small red flag'),
 (112, 128, 'a grand stone barracks fortress with two crenellated towers, red banners, a training dummy, an archery target, a sword rack'),
])
stages('armoury', [
 (64, 40, 'an empty building plot on dirt: a few wooden stakes, an anvil stump, and a pile of stones, nothing built yet'),
 (80, 72, 'a tiny blacksmith shed with a stone chimney, an iron anvil and a small weapon rack with two swords'),
 (96, 96, 'a stone armoury workshop with grey slate roof, chimney with smoke, a weapon rack with swords and spears, a shield on the wall'),
 (112, 128, 'the outside of a grand stone armoury hall with a slate roof and a big smoking chimney, glowing forge glimpsed in the doorway, weapon racks with swords and spears and shields stood in front, steel banners, exterior view of a building, not a cutaway'),
])
stages('mageTower', [
 (48, 40, 'an empty round stone base with scattered fallen stone blocks and a faint purple magic circle on the ground, ruins'),
 (56, 88, 'a short crooked round stone wizard tower with a purple pointed cone roof and a small glowing blue window'),
 (64, 120, 'a tall stone wizard tower with a purple pointed roof, glowing blue runes on the walls, arched windows glowing blue, a balcony'),
 (80, 152, 'a very tall grand arcane wizard tower with a star-topped spire, glowing cyan runes, floating blue crystals around the top, glowing windows, purple banners'),
])
SPECS['sky'] = (384, 120, 'a calm evening sky with soft clouds and far blue mountains on the horizon, no ground, no buildings, 16-bit pixel art', False)
SPECS['hills'] = (384, 56, 'a row of distant green rolling hills with tiny pine trees, side view, 16-bit pixel art, no sky', True)
SPECS['wall'] = (192, 72, 'a long medieval castle outer stone wall with crenellations and a round tower at each end, seen from the side, grey stone, 16-bit pixel art', True)
SPECS['gate'] = (64, 72, 'a medieval castle stone gatehouse with a wooden portcullis gate, two towers and a red flag, side view, 16-bit pixel art', True)
SPECS['well'] = (32, 36, 'a small stone water well with a wooden roof and bucket, side view, 16-bit pixel art', True)
SPECS['tree'] = (40, 56, 'a leafy green oak tree, side view, 16-bit pixel art', True)
SPECS['cart'] = (40, 28, 'a small wooden hand cart with hay, side view, 16-bit pixel art', True)
SPECS['crates'] = (32, 32, 'two stacked wooden crates and a barrel, side view, 16-bit pixel art', True)
SPECS['ground'] = (64, 48, 'seamless top-down packed dirt and cobblestone courtyard ground texture, warm tan and brown, 16-bit pixel art', False)
log = open(f'{out}/jobs.log', 'a')
def gen(job):
    name, seed = job
    w, h, desc, bg = SPECS[name]
    body = {'description': desc, 'image_size': {'width': w, 'height': h}, 'no_background': bg, 'outline': 'single color black outline', 'shading': 'medium shading', 'detail': 'medium detail', 'seed': seed}
    log.write(f'{time.time():.0f} start {name} {seed}\n'); log.flush()
    req = urllib.request.Request('https://api.pixellab.ai/v2/create-image-pixflux', json.dumps(body).encode(), {'Content-Type': 'application/json'})
    for attempt in range(4):
        try: r = json.load(urllib.request.urlopen(req, timeout=180)); break
        except Exception as e:
            log.write(f'{time.time():.0f} retry {name} {seed} {e}\n'); log.flush(); time.sleep(5)
    else: return name, seed, 'failed'
    d = r.get('image') or r.get('data', {}).get('image') or r
    b64 = d['base64'] if isinstance(d, dict) else d
    Image.open(io.BytesIO(base64.b64decode(b64.split(',')[-1]))).save(f'{out}/{name}_{seed}.png')
    log.write(f'{time.time():.0f} done {name} {seed} {r.get("usage")}\n'); log.flush()
    return name, seed, 'ok'
names = only or list(SPECS)
jobs = [(n, s) for n in names for s in seeds if not os.path.exists(f'{out}/{n}_{s}.png')]
with cf.ThreadPoolExecutor(6) as ex:
    for res in ex.map(gen, jobs): print(res, flush=True)
