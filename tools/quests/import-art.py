# The owner's painted quest art into the game (run by hand from the repo's root: python3 -I tools/quests/import-art.py).
#   art-source/eidolons/givers/<id>.png  (512 x 512 busts)  ->  src/art/quests/<giver>-face.webp
#       cropped to the head and shoulders (a 320 px square, `CROP`), 192 px (the card's 64 px face at three times), WebP 85.
#   art-source/eidolons/board/notice.png, notice-sealed.png (384 x 512)  ->  src/art/quests/notice.webp, notice-sealed.webp
#       trimmed, 96 px across (drawn about 13 px across on the tavern's board, and larger in the menus later).
# Both are bundled as data URLs (build.mjs's loader), so nothing is added to the offline list.
import os
from PIL import Image

here = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(here, '..', '..', 'art-source', 'eidolons')
out = os.path.join(here, '..', '..', 'src', 'art', 'quests')

# giver key in the game <- the painting's name; and the crop's top-left corner (a 320 px square round the head)
GIVERS = {
    'gwen': ('gwen-tallow', (106, 40)),
    'pedlar': ('pedlar', (96, 20)),
    'pilgrim': ('pilgrim', (96, 40)),
    'messenger': ('messenger', (96, 50)),
    'hunter': ('hunter', (96, 40)),
}
CROP, FACE = 320, 192
for key, (name, (x, y)) in GIVERS.items():
    im = Image.open(os.path.join(src, 'givers', f'{name}.png')).convert('RGBA')
    face = im.crop((x, y, x + CROP, y + CROP)).resize((FACE, FACE), Image.LANCZOS)
    face.save(os.path.join(out, f'{key}-face.webp'), 'WEBP', quality=85, alpha_quality=100, method=6)
    print(key, face.size)
for name in ('notice', 'notice-sealed'):
    im = Image.open(os.path.join(src, 'board', f'{name}.png')).convert('RGBA')
    im = im.crop(im.getbbox())
    w = 96
    im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    im.save(os.path.join(out, f'{name}.webp'), 'WEBP', quality=85, alpha_quality=100, method=6)
    print(name, im.size)
