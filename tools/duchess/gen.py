# Duchess's fighting rows from PixelLab (docs/notes/duchess-fights.md): her own standing frame (the white goat of `src/art/duchess/goat.png`,
# facing right) on a 64-pixel canvas, animated with `/animate-with-text-v3`. Each clip is one generation; the job id is saved first, so a rerun
# resumes instead of paying again.
#   python3 tools/duchess/gen.py submit <row> [seed]    then    python3 tools/duchess/gen.py collect <row> [seed]
# Frames land in tools/duchess/generated/<row>_s<seed>_<n>.png; compose-duchess.py builds the sheet from them.
import sys, os, json, io, base64
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), 'pixellab'))
os.chdir(os.path.dirname(os.path.dirname(HERE)))
from api import b64, post, poll
from PIL import Image

OUT = 'tools/duchess/generated/'
os.makedirs(OUT, exist_ok=True)
CANVAS = 64
ANIMS = {
    'attack': 'a small white goat headbutting to the right: rearing back, lowering its horned head and charging forward a step to butt with its head, then recovering, no effects',
    # (the first take, seed 7, only lifted a foreleg: the second asks for the head down and the whole body thrown forward)
    'attack2': 'a small white goat ramming to the right: it ducks its head down low with horns forward, then lunges its whole body forward to butt hard, then steps back, no effects',
    'hurt': 'a small white goat flinching back sharply as if struck, head jerking up and body recoiling to the left, then steadying, no effects',
    'dead': 'a small white goat collapsing: legs buckling and the goat toppling over onto its side and lying still, no effects',
}

def first_frame():
    im = Image.open('src/art/duchess/goat.png').convert('RGBA').crop((4 * 48, 0, 5 * 48, 48))
    f = im.crop(im.getbbox())
    c = Image.new('RGBA', (CANVAS, CANVAS))
    # (her feet at the bottom, a little left of centre, so a lunge to the right stays on the canvas)
    c.paste(f, ((CANVAS - f.width) // 2 - 6, CANVAS - f.height - 2))
    return c

cmd, row = sys.argv[1:3]
seed = int(sys.argv[3]) if len(sys.argv) > 3 else 7
job = OUT + 'job_%s_s%d.json' % (row, seed)
if cmd == 'submit':
    if os.path.exists(job):
        print('already submitted', job)
    else:
        img = first_frame()
        img.save(OUT + 'first.png')
        body = {'first_frame': {'type': 'base64', 'base64': b64(img), 'format': 'png'}, 'action': ANIMS[row], 'frame_count': 4, 'no_background': True, 'seed': seed}
        print(row, post('/animate-with-text-v3', body, job).get('background_job_id'))
elif cmd == 'collect':
    r = poll(json.load(open(job))['background_job_id'])
    ims = (r.get('last_response') or {}).get('images', [])
    for n, m in enumerate(ims):
        Image.open(io.BytesIO(base64.b64decode(m['base64']))).convert('RGBA').save(OUT + '%s_s%d_%d.png' % (row, seed, n))
    print(row, r.get('status'), len(ims))
