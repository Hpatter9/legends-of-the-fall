# Cuts the area art (backdrops, ground tops and sides, rocks, tall grass, water, ice, lava) out of the asset packs into
# src/art/areas/. Run once (python3 -I tools/areas-prep.py <path to chronos-assets>/assets); the results are committed.
# The ground tops are the highlands textures (cut from the Fantasy 2D Battlegrounds pack) recoloured per area.
import glob, os, shutil, sys
from PIL import Image, ImageOps

A = sys.argv[1]
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'art')
OUT = os.path.join(ROOT, 'areas')
G = os.path.join(ROOT, 'ground')
# (the packs sit in assets/, a few in the repository's top folder)
pk = lambda pat: sorted(glob.glob(os.path.join(A, pat)) or glob.glob(os.path.join(A, '..', pat)))
one = lambda pat: pk(pat)[0]

# layers back to front, per area
BACKDROPS = {
    'forest': ('craftpix-net-154389*/1/[1-9].png', None),
    'snow': ('craftpix-net-882062*/winter 8/%d.png', [1, 3, 2]),
    'desert': ('craftpix-net-546708*/PNG/background 3/Plan %d.png', [5, 4, 3, 2, 1]),
    'volcano': ('craftpix-net-882062*/winter 6/%d.png', [1, 3, 2]),
    'dungeon': ('craftpix-net-433169*/PNG/background 3/Plan %d.png', [4, 3, 2, 1]),
}
ROCKS = {
    'forest': ('craftpix-net-675652*/PNG/middle_lane_rocks1/*.png', [2, 3]),
    'snow': ('craftpix-net-675652*/PNG/snowy_rocks1/*.png', [1, 2]),
    'desert': ('craftpix-net-675652*/PNG/desert_rocks/*.png', [1, 2]),
    'volcano': ('craftpix-net-675652*/PNG/stalagmites/*.png', [1, 2]),
    'dungeon': ('craftpix-net-675652*/PNG/cave_rocks/*.png', [1, 2]),
}
# (dark, mid, light) for the grass top, the stone top (high ground) and the column side
TINTS = {
    'forest': ((14, 40, 20), (46, 110, 52), (132, 190, 100)), 
    'snow': ((120, 150, 190), (212, 228, 244), (255, 255, 255)),
    'desert': ((120, 82, 40), (206, 164, 96), (246, 220, 150)),
    'volcano': ((18, 12, 14), (58, 40, 40), (120, 80, 70)),
    'dungeon': ((20, 20, 30), (70, 70, 92), (132, 132, 156)),
}
STONE = {
    'forest': ((30, 34, 30), (96, 104, 90), (168, 176, 150)),
    'snow': ((110, 140, 180), (190, 214, 236), (250, 252, 255)),
    'desert': ((140, 96, 56), (222, 184, 124), (250, 232, 176)),
    'volcano': ((10, 6, 8), (90, 34, 26), (210, 90, 36)),
    'dungeon': ((26, 26, 36), (96, 96, 118), (170, 170, 190)),
}
SIDE = {
    'forest': ((14, 10, 6), (84, 64, 40), (150, 120, 80)),
    'snow': ((60, 80, 110), (130, 156, 190), (210, 226, 244)),
    'desert': ((80, 50, 24), (176, 124, 70), (226, 180, 112)),
    'volcano': ((6, 4, 6), (52, 28, 28), (110, 50, 36)),
    'dungeon': ((8, 8, 14), (52, 52, 70), (104, 104, 126)),
}

def colorize(im, tint):
    a = im.getchannel('A') if im.mode == 'RGBA' else None
    g = ImageOps.autocontrast(im.convert('L'), cutoff=1)
    c = ImageOps.colorize(g, tint[0], tint[2], mid=tint[1]).convert('RGBA')
    if a: c.putalpha(a)
    return c

def save(im, *p):
    path = os.path.join(OUT, *p)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path, optimize=True)

grass = [Image.open(os.path.join(G, f)).convert('RGBA') for f in ('grass1.png', 'grass2.png')]
stone = Image.open(os.path.join(G, 'stone.png')).convert('RGBA')
side = Image.open(os.path.join(G, 'rock.png')).convert('RGBA')

for area in TINTS:
    for i, g in enumerate(grass):
        save(colorize(g, TINTS[area]), area, 'top%d.png' % (i + 1))
    save(colorize(stone, STONE[area]), area, 'high.png')
    save(colorize(side, SIDE[area]), area, 'side.png')

# what lies on the ground: shallows, ice, lava (shared by the areas)
save(colorize(grass[1], ((10, 40, 90), (40, 110, 170), (150, 210, 235))), 'common', 'water.png')
save(colorize(stone, ((90, 150, 200), (190, 228, 248), (255, 255, 255))), 'common', 'ice.png')
save(colorize(stone, ((60, 6, 0), (200, 50, 8), (255, 214, 80))), 'common', 'lava.png')

# backdrops
for area, (pat, order) in BACKDROPS.items():
    files = pk(pat) if order is None else [one(pat % n) for n in order]
    for i, f in enumerate(files):
        im = Image.open(f).convert('RGBA')
        if area == 'volcano' and i == 0:
            im = colorize(im, ((10, 4, 6), (110, 24, 14), (255, 150, 60)))
        if area == 'volcano' and i == 1:
            im = colorize(im, ((10, 4, 6), (70, 22, 20), (150, 60, 40)))
        save(im, area, 'bg%d.png' % (i + 1))

# rocks and tall growth
for area, (pat, pick) in ROCKS.items():
    fs = pk(pat)
    for n, k in enumerate(pick):
        shutil.copy(fs[k], os.path.join(OUT, area, 'boulder%d.png' % (n + 1)))
tall = pk('craftpix-net-665131*/2 Objects/5 Grass/*.png')
print('tall grass sprites', [(os.path.basename(t), Image.open(t).size) for t in tall])
for area in TINTS:
    for n in range(2):
        t = Image.open(tall[4 + n]).convert('RGBA')
        if area == 'snow': t = colorize(t, ((100, 130, 170), (200, 222, 244), (255, 255, 255)))
        elif area == 'desert': t = colorize(t, ((110, 80, 40), (190, 150, 80), (240, 210, 130)))
        elif area == 'volcano': t = colorize(t, ((10, 6, 6), (70, 30, 24), (190, 80, 30)))
        if area == 'dungeon':
            t = Image.open(one('craftpix-net-266622*/PNG/Objects_separately/64/mushroom%d_light_shadow%d.png' % ((1, 1), (3, 3))[n])).convert('RGBA')
        save(t, area, 'tall%d.png' % (n + 1))

# the highlands keep today's ground (src/art/ground and the m1 backdrop); only its tall grass is new
for n in range(2):
    shutil.copy(os.path.join(OUT, 'forest', 'tall%d.png' % (n + 1)), os.path.join(OUT, 'highlands_tall%d.png' % (n + 1)))
