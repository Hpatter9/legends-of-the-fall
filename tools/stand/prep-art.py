# STAND-003: the Last Stand castle's art, cut from the packs in chronos-assets (never changed) and from the castle's own throne room, into
# src/art/stand/. Run by hand: python3 tools/stand/prep-art.py [assets dir]. See CREDITS.md ("The Last Stand's castle").
import os, sys
from PIL import Image

A = sys.argv[1] if len(sys.argv) > 1 else '../chronos-assets'
OUT = 'src/art/stand'
os.makedirs(OUT, exist_ok=True)
DUN = f'{A}/assets/craftpix-net-169442-free-2d-top-down-pixel-dungeon-asset-pack/PNG'
wf = Image.open(f'{DUN}/walls_floor.png').convert('RGBA')
decor = Image.open(f'{A}/DawnLike/Objects/Decor0.png').convert('RGBA')

def tile4(src, size=64):
    out = Image.new('RGBA', (size, size))
    s = src.resize((size // 2, size // 2), Image.NEAREST)
    for y in (0, size // 2):
        for x in (0, size // 2):
            out.paste(s, (x, y))
    return out

# the floor: the dungeon pack's two flagstones, laid 2x2 into a tile's top
tile4(wf.crop((0, 336, 32, 368))).save(f'{OUT}/floor1.png')
tile4(wf.crop((176, 336, 208, 368))).save(f'{OUT}/floor2.png')
# the carpets and the dais: DawnLike's red rug
decor.crop((8, 232, 40, 264)).resize((64, 64), Image.NEAREST).save(f'{OUT}/rug.png')
# the walls', pillars' and steps' faces: the dungeon pack's dressed stone as an 80x20 strip; the walls' tops
brick = wf.crop((16, 248, 64, 268))
side = Image.new('RGBA', (96, 20))
for x in range(0, 96, 48):
    side.paste(brick, (x, 0))
side.crop((0, 0, 80, 20)).save(f'{OUT}/wallface.png')
wf.crop((16, 244, 48, 276)).resize((64, 64), Image.NEAREST).save(f'{OUT}/walltop.png')
# rubble at the breaches: the Undead tileset's fallen stones and a broken wall stub
R = f'{A}/assets/craftpix-net-695666-free-undead-tileset-top-down-pixel-art/PNG/Objects_separately'
Image.open(f'{R}/Ruin_shadow1_3.png').convert('RGBA').save(f'{OUT}/rubble1.png')
Image.open(f'{R}/Ruin_shadow1_4.png').convert('RGBA').save(f'{OUT}/rubble2.png')
# the library's shelves: DawnLike's bookcases, four times up
for i, x in ((1, 32), (2, 64)):
    decor.crop((x, 64, x + 16, 80)).resize((64, 64), Image.NEAREST).save(f'{OUT}/shelf{i}.png')
# the castle's throne room (src/art/throne/throne_room.png): a stained-glass window, a gilt pilaster with its banner, the back wall
room = Image.open('src/art/throne/throne_room.png').convert('RGBA')
room.crop((55, 12, 110, 108)).save(f'{OUT}/window.png')
room.crop((4, 8, 36, 120)).save(f'{OUT}/pilaster.png')
room.crop((0, 0, 400, 112)).save(f'{OUT}/backwall.png')
# smoke and dust: Super Pixel Effects (Free) smoke bursts (the brown ring's ten frames in a strip; one white puff), pvfx landing dust (its grid)
SPE = f'{A}/Super Pixel Effects Gigapack (Free Version) v2.9.0/Super Pixel Effects Gigapack (Free Version)/PNG/Smoke Bursts'
Image.open(f'{SPE}/directional_smoke_burst_001/directional_smoke_burst_001_large_white/frame0012.png').convert('RGBA').save(f'{OUT}/smoke.png')
strip = Image.new('RGBA', (640, 64))
for i in range(10):
    strip.paste(Image.open(f'{SPE}/symmetrical_smoke_burst_001/symmetrical_smoke_burst_001_large_brown/frame{i:04d}.png').convert('RGBA'), (i * 64, 0))
strip.save(f'{OUT}/dust.png')
Image.open(f'{A}/pvfx-foundry-thirteen-spritesheets/effects/landing-dust/grid/sprite-sheet.png').convert('RGBA').save(f'{OUT}/landdust.png')
print(sorted(os.listdir(OUT)))
