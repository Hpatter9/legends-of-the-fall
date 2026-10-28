# STAND-003 phase A: the pieces the visual proposal's mock-ups are built from, cut from the packs in chronos-assets (never changed).
# Run by hand: python3 tools/stand/mock/prep.py [assets dir]. Writes out/stand-mock/art/*.png (not committed): the mock build swaps the
# dungeon land's tile art for these (`mock.mjs`), so the screenshots are the real renderer with the proposed art.
import os, sys
from PIL import Image

A = sys.argv[1] if len(sys.argv) > 1 else '../chronos-assets'
OUT = 'out/stand-mock/art'
os.makedirs(OUT, exist_ok=True)
DUN = f'{A}/assets/craftpix-net-169442-free-2d-top-down-pixel-dungeon-asset-pack/PNG'
wf = Image.open(f'{DUN}/walls_floor.png').convert('RGBA')
decor = Image.open(f'{A}/DawnLike/Objects/Decor0.png').convert('RGBA')

def tile4(src, size=64):
    """A 32px flagstone laid 2x2 into a tile top."""
    out = Image.new('RGBA', (size, size))
    s = src.resize((size // 2, size // 2), Image.NEAREST)
    for y in (0, size // 2):
        for x in (0, size // 2):
            out.paste(s, (x, y))
    return out

# the floor: the dungeon pack's two flagstones (blue-grey and pale)
tile4(wf.crop((0, 336, 32, 368))).save(f'{OUT}/top1.png')
tile4(wf.crop((176, 336, 208, 368))).save(f'{OUT}/top2.png')
# the dais: DawnLike's red rug, the tile's whole top
decor.crop((8, 232, 40, 264)).resize((64, 64), Image.NEAREST).save(f'{OUT}/high.png')
# the walls' and steps' faces: the dungeon pack's dressed stone, as the 80x20 strip the columns tile down
brick = wf.crop((16, 248, 64, 268))
side = Image.new('RGBA', (80, 20))
for x in range(0, 80, 48):
    side.paste(brick, (x, 0))
side.save(f'{OUT}/side.png')
# the walls' tops (laid where the mock marks a wall as 'ice'): the pack's dark coping
wf.crop((16, 244, 48, 276)).resize((64, 64), Image.NEAREST).save(f'{OUT}/walltop.png')
# rubble: the Undead tileset's fallen stones and a broken wall stub
R = f'{A}/assets/craftpix-net-695666-free-undead-tileset-top-down-pixel-art/PNG/Objects_separately'
for i, n in ((1, '1_3'), (2, '1_4')):
    Image.open(f'{R}/Ruin_shadow{n}.png').convert('RGBA').save(f'{OUT}/rubble{i}.png')
# the library's shelves: DawnLike's tall bookcases (two), four times up
for i, x in ((1, 32), (2, 64)):
    decor.crop((x, 64, x + 16, 80)).resize((64, 64), Image.NEAREST).save(f'{OUT}/shelf{i}.png')
# the throne: DawnLike's, four times up
decor.crop((96, 112, 112, 128)).resize((64, 64), Image.NEAREST).save(f'{OUT}/throne.png')
# the king: the Himeko Sutori paper doll in its regal robe, crown, white beard and orb sceptre (the front idle frame, and the side one)
H = A
layers = ['Template_Male.png', 'Mage_05_ArcaneRegalia_Male.png', 'Facial Hair/BeardWhite.png', 'Helm/Helm_Crown_Male.png', 'Staff_05_Radiant_Male.png']
doll = Image.new('RGBA', (1024, 1024))
for f in layers:
    doll.alpha_composite(Image.open(f'{H}/{f}').convert('RGBA'))
doll.crop((0, 0, 128, 128)).save(f'{OUT}/king_front.png')
doll.crop((0, 256, 128, 384)).save(f'{OUT}/king_side.png')
print('ok', sorted(os.listdir(OUT)))

# the king, side by side at four times: today's, the proposal (robe, crown, beard, orb sceptre) on the DawnLike throne, and a second choice
# (the Lordly plate kept, the sword traded for the sceptre, a beard)
from PIL import ImageDraw
old = Image.open('src/art/units/stand_king.png').convert('RGBA').crop((0, 0, 92, 103))
alt = Image.new('RGBA', (1024, 1024))
for f in ['Template_Male.png', 'Plate_06_Lordly_Male.png', 'Plate_06_Lordly_Male_Top.png', 'Facial Hair/BeardBrown.png', 'Helm/Helm_Crown_Male.png', 'Staff_05_Radiant_Male.png']:
    alt.alpha_composite(Image.open(f'{H}/{f}').convert('RGBA'))
alt = alt.crop((0, 0, 128, 128))
king = Image.open(f'{OUT}/king_front.png')
throne = Image.open(f'{OUT}/throne.png')
seat = Image.new('RGBA', (128, 128))
seat.alpha_composite(throne.resize((80, 80), Image.NEAREST), (24, 30))
seat.alpha_composite(king, (0, 6))
sheet = Image.new('RGBA', (4 * 128 * 3 + 40, 4 * 128 + 70), (30, 26, 38, 255))
for i, (im, name) in enumerate([(old, 'Today'), (seat, 'Proposed: robe, crown, beard, orb sceptre, on the throne'), (alt, 'Or: the plate armour kept, with a sceptre and beard')]):
    big = im.resize((im.width * 4, im.height * 4), Image.NEAREST)
    sheet.alpha_composite(big, (10 + i * (512 + 10) + (512 - big.width) // 2, 40 + (512 - big.height)))
    ImageDraw.Draw(sheet).text((14 + i * 522, 14), name, fill=(240, 220, 160, 255))
d = ImageDraw.Draw(sheet)
d.rectangle((0, sheet.height - 26, sheet.width, sheet.height), fill=(160, 20, 20, 255))
d.text((10, sheet.height - 20), 'MOCK-UP  The king: Himeko Sutori paper doll (chronos-assets) and DawnLike throne, 4x', fill=(255, 255, 255, 255))
sheet.save('docs/samples/stand-overhaul-mock-king.png')
print('king sheet')
