"""Generate the talent glyph icons with PixelLab (32x32, transparent, the game's warm palette), as tools/ui/genicons.py does.
Usage: gen.py <outdir> [seeds] [names...]   (writes <outdir>/<name>_<seed>.png; skips ones already there)"""
import base64, io, json, os, sys, time, urllib.request, concurrent.futures as cf
from PIL import Image
out = sys.argv[1]; seeds = [int(s) for s in (sys.argv[2] if len(sys.argv) > 2 else '1,2,3').split(',')]
only = sys.argv[3:]
os.makedirs(out, exist_ok=True)
PAL = ['#1a0d07','#3b2316','#6b4128','#b8761e','#f0b44a','#ffe48a','#f6ead6','#c8b394','#d9573f','#7a2a1c','#4a9cff','#2c5aa0','#8c8c8c','#555555','#3a8a3a']
pal = Image.new('RGB', (len(PAL), 1))
for i, c in enumerate(PAL): pal.putpixel((i, 0), tuple(int(c[j:j+2], 16) for j in (1, 3, 5)))
buf = io.BytesIO(); pal.save(buf, 'PNG')
palb = {'type': 'base64', 'base64': base64.b64encode(buf.getvalue()).decode()}
G = {
 'heart': 'a red heart',
 'sword': 'a steel sword pointing up with a golden hilt',
 'armour': 'a steel breastplate chest armour',
 'shield': 'a round steel shield with a gold rim',
 'eye': 'a single open eye with a golden iris',
 'boot': 'a leather boot',
 'feather': 'a white feather with a swirl of wind',
 'target': 'an arrow hitting the centre of a round target',
 'bolt': 'a golden lightning bolt',
 'cross': 'a green healing cross',
 'potion': 'a red potion flask with a cork',
 'ward': 'a steel shield with a small flame emblem',
 'burst': 'a golden four pointed starburst with sparks',
 'hourglass': 'a golden hourglass with sand',
 'reach': 'four arrows pointing outwards from a centre dot',
 'extra': 'a golden plus sign over two stacked orbs',
 'bubble': 'a glowing blue magic bubble barrier',
 'wingboot': 'a leather boot with small white wings',
 'snow': 'a pale blue snowflake',
 'stun': 'three small yellow stars circling in a ring',
 'nova': 'a large golden star with a red gem in the centre, ultimate power',
 'thorns': 'a green thorny bramble vine with sharp spikes',
 'rings': 'two linked steel rings',
 'rage': 'a red angry clenched fist wreathed in flame',
 'fang': 'a white vampire fang with a drop of blood',
 'drop': 'a single red blood drop',
 'ankh': 'a golden ankh cross glowing, revival',
 'banner': 'a red war banner on a pole',
 'parry': 'two crossed steel swords clashing with a spark',
 'hammer': 'a steel warhammer, a heavy smite',
 'mask': 'a dark hooded mask with glowing eyes, stealth',
 'chain': 'three steel chain links',
 'blast': 'a red and orange explosion burst',
 'crystal': 'a blue mana crystal gem',
 'skull': 'a white skull with a purple glow, a curse',
 'halo': 'a glowing golden angel halo ring above a small golden cross',
 'pickaxe': 'a steel pickaxe with a wooden handle',
 'mirror': 'a round silver hand mirror with a gold handle showing a bright reflection',
}
def gen(job):
    name, seed = job
    body = {'description': 'pixel art game icon, ' + G[name], 'image_size': {'width': 32, 'height': 32}, 'no_background': True, 'outline': 'single color black outline', 'shading': 'medium shading', 'detail': 'medium detail', 'seed': seed, 'color_image': palb}
    req = urllib.request.Request('https://api.pixellab.ai/v2/create-image-pixflux', json.dumps(body).encode(), {'Content-Type': 'application/json'})
    for attempt in range(3):
        try: r = json.load(urllib.request.urlopen(req, timeout=180)); break
        except Exception as e: print('retry', name, seed, e); time.sleep(5)
    else: return name, seed, 'failed'
    d = r.get('image') or r.get('data', {}).get('image') or r
    b64 = d['base64'] if isinstance(d, dict) else d
    Image.open(io.BytesIO(base64.b64decode(b64.split(',')[-1]))).save(f'{out}/{name}_{seed}.png')
    return name, seed, 'ok'
names = only or list(G)
with cf.ThreadPoolExecutor(4) as ex:
    for res in ex.map(gen, [(n, s) for n in names for s in seeds if not os.path.exists(f'{out}/{n}_{s}.png')]): print(res, flush=True)
