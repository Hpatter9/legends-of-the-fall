# The hero quests' givers' card portraits (SECRET-HEROES), composed from LPC layers as Gwen's is (tools/quests/cut.py), run by hand:
#   python3 -I tools/hero-quests/cut.py <chronos-assets>
#   shepherd-face.png  Old Maud: light body, white shirt, grey ponytail under a cloth hood.
#   gaoler-face.png    Brannock the turnkey: tanned body, leather chest, a chain hood and a big moustache.
#   smith-face.png     Edda Coalbrook: dark body, leather chest and shoulders, brown bunches.
# Each is the facing-down stand's head and shoulders, 2x nearest, 64 px square (as gwen-face.png).
import os, sys
from PIL import Image

root = sys.argv[1]
lpc = os.path.join(root, 'Universal-LPC-spritesheet-master', 'Universal-LPC-spritesheet-master')
out = os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'art', 'quests')
FACES = {
    'shepherd': ['body/female/light.png', 'torso/shirts/sleeveless/female/white_pirate.png', 'hair/female/ponytail/gray.png', 'head/hoods/female/cloth_hood_female.png'],
    'gaoler': ['body/male/tanned.png', 'torso/leather/chest_male.png', 'facial/male/bigstache.png', 'head/hoods/male/chain_hood_male.png'],
    'smith': ['body/female/dark.png', 'torso/leather/chest_female.png', 'torso/leather/shoulders_female.png', 'hair/female/bunches/brown.png'],
}
for name, layers in FACES.items():
    base = None
    for p in layers:
        im = Image.open(os.path.join(lpc, p)).convert('RGBA')
        base = im if base is None else Image.alpha_composite(base, im)
    cell = base.crop((0, 10 * 64, 64, 11 * 64))
    cell.crop((16, 8, 48, 40)).resize((64, 64), Image.NEAREST).save(os.path.join(out, f'{name}-face.png'))
    print(name)
