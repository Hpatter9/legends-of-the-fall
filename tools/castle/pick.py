"""Copy the chosen PixelLab pieces (from the generation folder) into src/art/castle/, trimmed to their pixels.
Usage: pick.py <genDir>"""
import os, sys
from PIL import Image
g = sys.argv[1]; out = os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'art', 'castle')
os.makedirs(out, exist_ok=True)
PICK = {
 'treasury0': 2, 'treasury1': 2, 'treasury2': 2, 'treasury3': 2,
 'barracks0': 1, 'barracks1': 1, 'barracks2': 1, 'barracks3': 1,
 'armoury0': 2, 'armoury1': 2, 'armoury2': 2, 'armoury3': 3,
 'mageTower0': 1, 'mageTower1': 2, 'mageTower2': 2, 'mageTower3': 1,
 'wall': 2, 'gate': 1, 'well': 1, 'tree': 1, 'crates': 3,
}
# (rectangles to clear after trimming: the armoury's own painted smoke wisp, which would float beside the animated smoke)
CLEAR = {'armoury2': (10, 0, 34, 9), 'armoury3': (40, 6, 59, 25)}
for n, s in PICK.items():
    im = Image.open(f'{g}/{n}_{s}.png').convert('RGBA')
    im = im.crop(im.getchannel('A').getbbox())
    if n in CLEAR: im.paste((0, 0, 0, 0), CLEAR[n])
    im.save(f'{out}/{n}.png'); print(n, im.size)
for n, s in (('sky', 1), ('hills', 1)):
    Image.open(f'{g}/{n}_{s}.png').convert('RGBA').save(f'{out}/{n}.png')
# the lawn is the battleground's own grass; the path is the inside of a generated cobble tile
Image.open(f'{g}/ground_2.png').convert('RGBA').crop((10, 10, 54, 38)).save(f'{out}/cobble.png')
