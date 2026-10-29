# Builds The King's ruler atlas (src/art/rulers/the_king.png) from art the game already had before the eight rulers:
# - standing rows (idle, walk, strike, cast, hurt, dead): the Last Stand's old king from the Himeko Sutori pack in ../chronos-assets
#   (plain male body, Plate 06 Lordly armour and its top, the Crown helm), given the pack's blond beard and its Radiant staff as a
#   sceptre (gold rod, blue orb: the enthroned king's), cut from the pack's 128px grid (right-facing row) and drawn twice up;
# - seated rows (seated, command): the castle's old enthroned king (src/art/throne/king_throne.png: idle, idle, a decree), as it is.
# The pack has one idle pose and one kneel, so idle repeats its frame and the fall ends on the kneel turned 90 degrees (as
# tools/pixellab/lie.py does). Lossless pixel moves only. Run from the repo root: python3 tools/rulers/the-king.py
import os
from PIL import Image

ASSETS = os.environ.get('ASSETS', '../chronos-assets')
CELL = 224
LAYERS = ['Template_Male.png', 'Plate_06_Lordly_Male.png', 'Plate_06_Lordly_Male_Top.png', 'Facial Hair/BeardBlond.png', 'Helm/Helm_Crown_Male.png', 'Staff_05_Radiant_Male.png']
ims = [Image.open(os.path.join(ASSETS, f)).convert('RGBA') for f in LAYERS]

def pose(col):
    """A pose of the pack (its columns: stand, two steps, arm raised, lunge, two casting poses, kneel), right-facing, twice up."""
    c = Image.new('RGBA', (128, 128))
    for im in ims:
        c.alpha_composite(im.crop((col * 128, 256, col * 128 + 128, 384)))
    return c.resize((256, 256), Image.NEAREST)

# (every standing frame is cropped by the same box, so the figure stays put; feet on the cell's bottom edge)
cols = range(8)
frames = {c: pose(c) for c in cols}
box = [min(frames[c].getbbox()[0] for c in cols), min(frames[c].getbbox()[1] for c in cols), max(frames[c].getbbox()[2] for c in cols), max(frames[c].getbbox()[3] for c in cols)]
idle_box = frames[0].getbbox()
cx = (idle_box[0] + idle_box[2]) // 2

def standing(img):
    cell = Image.new('RGBA', (CELL, CELL))
    cut = img.crop((cx - CELL // 2, box[3] - CELL, cx + CELL // 2, box[3]))
    cell.alpha_composite(cut)
    return cell

kneel = frames[7]
lie = kneel.crop(kneel.getbbox()).rotate(90, expand=True)
lying = Image.new('RGBA', (CELL, CELL))
lying.alpha_composite(lie, (CELL // 2 - lie.width // 2, CELL - lie.height))

throne = Image.open('src/art/throne/king_throne.png').convert('RGBA')
def seated(i):
    cell = Image.new('RGBA', (CELL, CELL))
    cell.alpha_composite(throne.crop((i * 160, 0, i * 160 + 160, 210)), ((CELL - 160) // 2, CELL - 210))
    return cell

S = lambda c: standing(frames[c])
rows = [
    [S(0), S(0), S(0), S(0)],          # idle (the pack has one standing pose)
    [S(1), S(0), S(2), S(0)],          # walk
    [S(0), S(3), S(4), S(4)],          # strike: the sceptre raised, then the lunge
    [S(0), S(5), S(6), S(6)],          # cast: the pack's two casting poses
    [S(7), S(7), S(7), S(0)],          # hurt: the kneel, then up again
    [S(7), S(7), lying, lying],        # dead: down on one knee, then fallen
    [seated(0), seated(0), seated(1), seated(1)],  # seated: the throne's two idle frames
    [seated(0), seated(2), seated(2), seated(2)],  # command: the decree
]
atlas = Image.new('RGBA', (CELL * 4, CELL * 8))
for r, row in enumerate(rows):
    for c, cell in enumerate(row):
        atlas.alpha_composite(cell, (c * CELL, r * CELL))
atlas.save('src/art/rulers/the_king.png', optimize=True)
print('the_king', atlas.size)
