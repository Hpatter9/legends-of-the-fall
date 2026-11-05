"""The three room buildings' pictures and the room icons (docs/notes/depth-art-todo.md, docs/notes/int-330.md): the paintings in art-source/castle/
are twice the castle pictures' size, so each is halved by a 2x2 box average as `prep.py` does the kit pieces (smithy 95x110, grand watchtower 79x134,
Hall of Legends 119x112: the stand-ins' own sizes, so `SPRITE_SIZE` in src/render/castleSpots.ts holds them). The room icons are cut to 48 px WebP
(a 24 px slot at two device pixels) in src/art/rooms/, bundled into game.js.

    python3 tools/castle/import-room-art.py
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
