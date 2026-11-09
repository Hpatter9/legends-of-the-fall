"""The three room buildings' pictures and the room icons (docs/notes/depth-art-todo.md, docs/notes/int-330.md): the paintings in art-source/castle/
are twice the castle pictures' size, so each is halved by a 2x2 box average as `prep.py` does the kit pieces (smithy 95x110, grand watchtower 79x134,
Hall of Legends 119x112: the stand-ins' own sizes, so `SPRITE_SIZE` in src/render/castleSpots.ts holds them). The room icons are cut to 48 px WebP
(a 24 px slot at two device pixels) in src/art/rooms/, bundled into game.js.

    python3 tools/castle/import-room-art.py

The Drill Yard (the Assault's phase 3; prompts in docs/notes/assault-3-art-prompts.md) is painted in art-source/drill-yard/: the building on
a 1024 canvas, trimmed and brought down to 120 px wide (the Hall of Legends is 119), and its two room icons, each trimmed, squared with a
margin and cut to 48 px like the rest. A file not painted yet is skipped, and its stand-in stays.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'art-source/castle'
BUILDINGS = [('smithy.png', 'smithy'), ('watchtower-grand.png', 'watchtower_grand'), ('hall-of-legends.png', 'hall_of_legends')]
# (the icons the rooms in src/sim/rooms.ts use; forge, shield and star are spares and stay in art-source)
ICONS = ['anvil', 'thread', 'mark', 'books', 'scroll', 'quill', 'candle', 'cross', 'eye', 'moon', 'compass', 'crossed-swords', 'plinth', 'lectern']

for f, name in BUILDINGS:
    im = Image.open(SRC / f).convert('RGBA')
    assert im.width % 2 == 0 and im.height % 2 == 0, f
    im = im.resize((im.width // 2, im.height // 2), Image.BOX)
    im.save(ROOT / 'src/art/castle' / f'{name}.png', optimize=True)
    print(name, im.size)

out = ROOT / 'src/art/rooms'
out.mkdir(parents=True, exist_ok=True)
for n in ICONS:
    im = Image.open(SRC / 'icons' / f'{n}.png').convert('RGBA').resize((48, 48), Image.LANCZOS)
    im.save(out / f'{n}.webp', 'WEBP', quality=88, method=6)
    print(n, (out / f'{n}.webp').stat().st_size)

# The Drill Yard's building and its rooms' icons (re-runnable: a missing painting is skipped)
DRILL = ROOT / 'art-source/drill-yard'


def trim(im):
    box = im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
    return im.crop(box) if box else im


if (DRILL / 'drill-yard.png').exists():
    im = trim(Image.open(DRILL / 'drill-yard.png').convert('RGBA'))
    # (halved by box averages while it is more than twice the size, then the last step by Lanczos)
    while im.width >= 240:
        im = im.resize((im.width // 2, im.height // 2), Image.BOX)
    im = im.resize((120, round(im.height * 120 / im.width)), Image.LANCZOS)
    im.save(ROOT / 'src/art/castle/drill_yard.png', optimize=True)
    print('drill_yard', im.size)
for n in ('drill-blooded', 'drill-veteran'):
    if not (DRILL / f'{n}.png').exists():
        continue
    im = trim(Image.open(DRILL / f'{n}.png').convert('RGBA'))
    side = round(max(im.size) * 1.08)
    sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    sq.paste(im, ((side - im.width) // 2, (side - im.height) // 2))
    sq.resize((48, 48), Image.LANCZOS).save(out / f'{n}.webp', 'WEBP', quality=88, method=6)
    print(n, (out / f'{n}.webp').stat().st_size)
