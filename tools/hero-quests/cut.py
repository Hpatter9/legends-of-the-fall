# The hero quests' givers' card portraits (SECRET-HEROES), composed from LPC layers as Gwen's is (tools/quests/cut.py), run by hand:
#   python3 -I tools/hero-quests/cut.py <chronos-assets> [name ...]   (names: only those faces)
#   shepherd-face.png  Old Maud: light body, white shirt, grey ponytail under a cloth hood.
#   gaoler-face.png    Brannock the turnkey: tanned body, leather chest, a chain hood and a big moustache.
#   smith-face.png     Edda Coalbrook: dark body, leather chest and shoulders, brown bunches.
#   (HERO-TALES-2, the seven tales after the first three)
#   sexton-face.png     Sexton Pell: light body, brown long sleeves, a grey moustache under a feathered leather cap.
#   pawnbroker-face.png Ottilie Marsh: tanned body, maroon shirt, raven hair to one shoulder, a bronze tiara (paste, she says).
#   lantern-face.png    Kiku: light body, teal tunic, black hair in a long knot.
#   herald-face.png     Master Fenwick: dark body, a chain tabard, parted white hair and a French moustache.
#   clock-face.png      Hesper Tock: tanned body, white long sleeves and leather shoulders, a grey beard and bed-head.
#   falconer-face.png   Wren Halloway: dark body, leather chest, leather shoulders for the bird, a red ponytail.
#   archivist-face.png  Ivy Penhallow: light body, white tunic, long brown fringe, a silver tiara for a reading band.
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
    'sexton': ['body/male/light.png', 'torso/shirts/longsleeve/male/brown_longsleeve.png', 'hair/male/plain/gray.png', 'facial/male/mustache/gray.png', 'head/caps/male/leather_cap_male.png'],
    'pawnbroker': ['body/female/tanned.png', 'torso/shirts/sleeveless/female/maroon_sleeveless.png', 'hair/female/shoulderl/raven.png', 'head/tiaras_female/bronze.png'],
    'lantern': ['body/female/light.png', 'torso/tunics/female/teal_tunic.png', 'hair/female/longknot/black.png'],
    'herald': ['body/male/dark2.png', 'torso/chain/tabard/jacket_male.png', 'hair/male/parted/white.png', 'facial/male/frenchstache/white.png'],
    'clock': ['body/male/tanned.png', 'torso/shirts/longsleeve/male/white_longsleeve.png', 'torso/leather/shoulders_male.png', 'facial/male/beard/gray.png', 'hair/male/bedhead/white.png'],
    'falconer': ['body/female/dark2.png', 'torso/leather/chest_female.png', 'torso/leather/shoulders_female.png', 'hair/female/ponytail2/redhead.png'],
    'archivist': ['body/female/light.png', 'torso/tunics/female/white_tunic.png', 'hair/female/bangslong/brown.png', 'head/tiaras_female/silver.png'],
}
only = sys.argv[2:]
for name, layers in FACES.items():
    if only and name not in only:
        continue
    base = None
    for p in layers:
        im = Image.open(os.path.join(lpc, p)).convert('RGBA')
        base = im if base is None else Image.alpha_composite(base, im)
    cell = base.crop((0, 10 * 64, 64, 11 * 64))
    cell.crop((16, 8, 48, 40)).resize((64, 64), Image.NEAREST).save(os.path.join(out, f'{name}-face.png'))
    print(name)
