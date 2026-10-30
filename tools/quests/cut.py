# The quests' placeholder art, cut from the asset packs (run by hand: python3 -I tools/quests/cut.py <chronos-assets>).
#   gwen.png        Gwen Tallow behind the bar: LPC layers composed (body, shoes, underdress, white shirt, cloth belt, grey
#                   ponytail), facing left; row 0 the stand (1 frame), row 1 a talking gesture (the spellcast-left frames 1-5).
#   gwen-face.png   her card's portrait: the facing-down stand, head and shoulders, 2x nearest.
#   pedlar-face.png, pilgrim-face.png  the passersby's card portraits: Tiny RPG Town's npc sheet (16 px, facing down), the bearded
#                   man and the brown-haired youth, 4x nearest.
#   board.png       the quest board: Craftpix's medieval field-work set "Quest Board", trimmed and scaled to 64 px across.
# The owner's painted givers and board papers will replace these under the same keys (`src/questArt.ts`).
import os, sys
from PIL import Image

root = sys.argv[1]
out = os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'art', 'quests')
lpc = os.path.join(root, 'Universal-LPC-spritesheet-master', 'Universal-LPC-spritesheet-master')
layers = ['body/female/light.png', 'feet/shoes/female/brown_shoes_female.png', 'torso/dress_female/underdress.png',
          'torso/shirts/sleeveless/female/white_pirate.png', 'belt/cloth/female/brown_female_no_th-sh.png', 'hair/female/ponytail/gray.png']
base = None
for p in layers:
    im = Image.open(os.path.join(lpc, p)).convert('RGBA')
    base = im if base is None else Image.alpha_composite(base, im)
cell = lambda r, c: base.crop((c * 64, r * 64, c * 64 + 64, r * 64 + 64))
sheet = Image.new('RGBA', (64 * 5, 128))
sheet.paste(cell(9, 0), (0, 0))
for i, c in enumerate(range(1, 6)):
    sheet.paste(cell(1, c), (i * 64, 64))
sheet.save(os.path.join(out, 'gwen.png'))
face = cell(10, 0).crop((16, 8, 48, 40)).resize((64, 64), Image.NEAREST)
face.save(os.path.join(out, 'gwen-face.png'))
npc = Image.open(os.path.join(root, 'tiny-rpg-town-files', 'tiny-rpg-town-files', 'Assets', 'Environments', 'Town', 'spritesheets', 'npc.png')).convert('RGBA')
for name, row in (('pedlar', 0), ('pilgrim', 3)):
    npc.crop((0, row * 16, 16, row * 16 + 16)).resize((64, 64), Image.NEAREST).save(os.path.join(out, f'{name}-face.png'))
board = Image.open(os.path.join(root, 'assets', 'craftpix-net-867123-free-medieval-field-work-2d-tileset-for-platformer', 'PNG', 'Environment',
                                'Cartoon_Medieval_Field_Work_Level_Set_Environment - Quest Board.png')).convert('RGBA')
board = board.crop(board.getbbox())
w = 64
board = board.resize((w, round(board.height * w / board.width)), Image.LANCZOS)
# (hard alpha, so it sits in the pixel scene without a soft halo)
px = board.load()
for y in range(board.height):
    for x in range(board.width):
        r, g, b, a = px[x, y]
        px[x, y] = (r, g, b, 255 if a >= 128 else 0)
board.save(os.path.join(out, 'board.png'))
print('gwen', sheet.size, 'face', face.size, 'board', board.size)
