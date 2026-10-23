# Cuts the art of the eleven newer lands (plains, autumn, swamp, graveyard, ruins, temple, crystal, forge, shrine, warcamp,
# oasis) out of the asset packs into src/art/areas/<land>/: the ground tops and sides (the highlands textures in each land's
# own colours, as areas-prep.py does for the first six), the boulders and tall growth, and the parallax backdrop layers.
# Run once (python3 -I tools/lands-prep.py <path to chronos-assets>/assets); the results are committed. The first six lands'
# files are not touched.
import glob, os, shutil, sys, colorsys
from PIL import Image, ImageOps

A = sys.argv[1]
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'art')
OUT = os.path.join(ROOT, 'areas')
G = os.path.join(ROOT, 'ground')
pk = lambda pat: sorted(glob.glob(os.path.join(A, pat)) or glob.glob(os.path.join(A, '..', pat)))
one = lambda pat: pk(pat)[0]

# the packs' folders, by their numbers
UNDEAD = 'craftpix-net-695666*/PNG/Objects_separately/'
ROCKY = 'craftpix-net-639143*/PNG/Objects_separately/'
VILLAGE = 'craftpix-net-504452*/2 Objects/'
CAVE = 'craftpix-net-266622*/PNG/Objects_separately/64/'
CRYSTAL_ENV = 'craftpix-net-376431*/PNG/Environment/'
FIELD_ENV = 'craftpix-net-867123*/PNG/Environment/'

# (dark, mid, light) for the grass tops, the stone top (the high ground) and the column side
TOP = {
    'plains': ((30, 70, 20), (110, 170, 60), (210, 230, 120)),
    'autumn': ((60, 28, 10), (170, 92, 30), (240, 190, 80)),
    'swamp': ((10, 30, 24), (40, 84, 60), (120, 150, 90)),
    'graveyard': ((16, 24, 22), (60, 74, 66), (130, 150, 130)),
    'ruins': ((60, 50, 38), (130, 118, 92), (200, 188, 150)),
    'temple': ((14, 50, 30), (50, 120, 70), (150, 200, 110)),
    'crystal': ((14, 16, 50), (60, 60, 150), (170, 160, 240)),
    'forge': ((20, 14, 12), (70, 50, 44), (150, 110, 80)),
    'shrine': ((20, 14, 40), (70, 50, 110), (180, 150, 210)),
    'warcamp': ((40, 36, 12), (110, 98, 44), (190, 170, 90)),
    'oasis': ((30, 80, 40), (100, 170, 80), (220, 240, 140)),
}
STONE = {
    'plains': ((70, 76, 60), (150, 160, 120), (220, 225, 180)),
    'autumn': ((60, 44, 36), (140, 110, 86), (210, 180, 150)),
    'swamp': ((24, 36, 30), (70, 90, 74), (130, 150, 120)),
    'graveyard': ((22, 22, 30), (80, 80, 100), (150, 150, 170)),
    'ruins': ((50, 46, 42), (140, 132, 120), (220, 214, 196)),
    'temple': ((130, 116, 80), (212, 196, 150), (250, 244, 214)),
    'crystal': ((24, 24, 70), (90, 100, 190), (200, 220, 255)),
    'forge': ((20, 16, 16), (96, 86, 84), (190, 170, 160)),
    'shrine': ((30, 26, 44), (110, 100, 130), (210, 200, 225)),
    'warcamp': ((44, 36, 30), (110, 90, 70), (190, 160, 126)),
    'oasis': ((170, 130, 80), (236, 206, 150), (255, 240, 190)),
}
SIDE = {
    'plains': ((50, 36, 20), (120, 90, 50), (190, 150, 90)),
    'autumn': ((40, 24, 14), (100, 64, 40), (170, 120, 80)),
    'swamp': ((10, 16, 14), (44, 56, 40), (90, 100, 70)),
    'graveyard': ((8, 8, 12), (44, 50, 52), (96, 108, 108)),
    'ruins': ((40, 34, 30), (110, 98, 84), (180, 168, 148)),
    'temple': ((96, 76, 44), (190, 160, 100), (236, 214, 160)),
    'crystal': ((10, 10, 30), (46, 50, 100), (110, 120, 190)),
    'forge': ((10, 8, 8), (56, 40, 36), (130, 80, 50)),
    'shrine': ((14, 10, 24), (60, 44, 70), (130, 100, 140)),
    'warcamp': ((40, 24, 12), (110, 70, 36), (180, 120, 64)),
    'oasis': ((130, 90, 50), (206, 160, 100), (244, 214, 150)),
}


def colorize(im, tint):
    a = im.getchannel('A') if im.mode == 'RGBA' else None
    g = ImageOps.autocontrast(im.convert('L'), cutoff=1)
    c = ImageOps.colorize(g, tint[0], tint[2], mid=tint[1]).convert('RGBA')
    if a:
        c.putalpha(a)
    return c


def tone(im, mul=(1, 1, 1), add=(0, 0, 0)):
    """Scale and lift each colour band (a grade over a backdrop layer); the alpha is kept."""
    im = im.convert('RGBA')
    r, g, b, a = im.split()
    bands = [band.point(lambda v, m=m, d=d: max(0, min(255, int(v * m + d)))) for band, m, d in zip((r, g, b), mul, add)]
    return Image.merge('RGBA', (*bands, a))


def hue(im, deg, sat=1.0, val=1.0):
    """Turn every pixel's hue by `deg` degrees (the sprites' shapes and shading stay)."""
    im = im.convert('RGBA')
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if not a:
                continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            r2, g2, b2 = colorsys.hsv_to_rgb((h + deg / 360) % 1, min(1, s * sat), min(1, v * val))
            px[x, y] = (int(r2 * 255), int(g2 * 255), int(b2 * 255), a)
    return im


def save(im, *p):
    path = os.path.join(OUT, *p)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path, optimize=True)
    # (a big backdrop layer is cut down to a palette: pixel art loses nothing, and the page caches every file for offline play)
    if p[-1].startswith('bg') and os.path.getsize(path) > 90000:
        im.convert('RGBA').quantize(128, method=Image.Quantize.FASTOCTREE).save(path, optimize=True)


def trim(im):
    box = im.convert('RGBA').getchannel('A').getbbox()
    return im.crop(box) if box else im


def small(f):
    return Image.open(f).convert('RGBA')


# ---- the ground ------------------------------------------------------------------------------------------------------------
grass = [Image.open(os.path.join(G, f)).convert('RGBA') for f in ('grass1.png', 'grass2.png')]
stone = Image.open(os.path.join(G, 'stone.png')).convert('RGBA')
side = Image.open(os.path.join(G, 'rock.png')).convert('RGBA')
for land in TOP:
    for i, g in enumerate(grass):
        save(colorize(g, TOP[land]), land, 'top%d.png' % (i + 1))
    save(colorize(stone, STONE[land]), land, 'high.png')
    save(colorize(side, SIDE[land]), land, 'side.png')

# ---- backdrops: layers back to front. Each is (a glob pattern, the order of its numbers or None for every file, a grade) ----------
SKY = lambda im: im
NIGHT = lambda im: tone(im, (0.34, 0.38, 0.7), (4, 6, 26))
EMBER_SKY = lambda im: colorize(im, ((4, 2, 4), (70, 14, 10), (190, 80, 34)))
EMBER = lambda im: colorize(im, ((4, 2, 2), (34, 10, 8), (120, 50, 24)))
DUST = lambda im: tone(im, (0.78, 0.7, 0.62), (0, 0, 4))
DIM_GREEN = lambda im: tone(im, (0.62, 0.8, 0.66), (0, 6, 4))
COLD = lambda im: tone(im, (0.5, 0.62, 0.62), (4, 8, 12))
DUSK = lambda im: tone(im, (0.8, 0.74, 0.82), (6, 0, 14))


def nums(pat, order, grade=None, size=None):
    out = []
    for n in order:
        im = Image.open(one(pat % n)).convert('RGBA')
        if size:
            im = im.resize(size, Image.LANCZOS)
        out.append(grade(im) if grade else im)
    return out


BIG = (576, 324)
BACKDROPS = {
    'plains': nums('craftpix-net-256745*/PNG/summer7/%d.png', [1, 2, 3, 4]),
    'autumn': nums('craftpix-net-311636*/PNG/background 1/Plan-%d.png', [5, 4, 3, 2, 1]),
    'swamp': [
        DIM_GREEN(Image.open(one('craftpix-net-776320*/PNG/Battleground3/Pale/%s.png' % n)).convert('RGBA').resize(BIG, Image.LANCZOS))
        for n in ('sky', 'jungle_bg', 'trees&bushes', 'grasses', 'grass&road', 'lianas')],
    'graveyard': [
        COLD(Image.open(one('craftpix-net-776320*/PNG/Battleground4/Pale/%s.png' % n)).convert('RGBA').resize(BIG, Image.LANCZOS))
        for n in ('sky', 'back_trees', 'crypt', 'wall', 'graves', 'tree')],
    'ruins': nums('craftpix-net-736662*/background 4/%d.png', [1, 2, 3, 6, 5, 4], DUST),
    'temple': nums('craftpix-net-323621*/PNG/background 1/Plan %d.png', [5, 4, 3, 2, 1]),
    'crystal': nums('craftpix-net-433169*/PNG/background 4/Plan %d.png', [5, 4, 3, 2, 1]),
    'forge': [EMBER_SKY(small(one('../craftpix-net-972811*/background 1/1.png')))] + nums('../craftpix-net-972811*/background 1/%d.png', [2, 3, 4], EMBER),
    # (the shrine at night: the blue moon's sky and moon of the Moon pack under the abandoned village's shrine layers, all graded dark)
    'shrine': [small(one('../craftpix-net-942044*/4 background/1.png')), small(one('../craftpix-net-942044*/4 background/2.png'))]
    + nums('craftpix-net-597821*/background 4/%d.png', [3, 4, 6, 5], NIGHT),
    'warcamp': [
        small(one('craftpix-901125*/PNG/Postapocalypce1/Bright/%s.png' % n)).resize(BIG, Image.LANCZOS)
        for n in ('clouds1', 'clouds2', 'ground&houses_bg', 'ground&houses2', 'ground&houses')],
    'oasis': nums('craftpix-net-546708*/PNG/background 1/Plan %d.png', [5, 4, 3, 2, 1]),
}
for land, layers in BACKDROPS.items():
    for i, im in enumerate(layers):
        save(im.resize(BIG, Image.LANCZOS) if im.size != BIG else im, land, 'bg%d.png' % (i + 1))
    print(land, len(layers), 'backdrop layers')

# ---- boulders (they block tiles: the land's own big props) and tall growth -----------------------------------------------------


def prop(pat):
    return trim(small(one(pat)))


GRAVE = UNDEAD + 'Grave_shadow1_%d.png'
BOULDERS = {
    'plains': [prop(ROCKY + 'Oval_rock3_grass_shadow.png'), prop(ROCKY + 'Oval_rock5_grass_shadow.png')],
    'autumn': [tone(prop(ROCKY + 'Oval_rock2_grass_shadow.png'), (1.1, 0.95, 0.8)), tone(prop(ROCKY + 'Oval_rock4_grass_shadow.png'), (1.1, 0.95, 0.8))],
    'swamp': [prop(UNDEAD + 'Broken_tree_shadow1_3.png'), prop(ROCKY + 'Orange_mushrooms1_grass_shadow.png')],
    'graveyard': [prop(GRAVE % 17), prop(GRAVE % 1), prop(UNDEAD + 'Pile_sculls_shadow1.png')],
    'ruins': [prop(UNDEAD + 'Ruin_shadow1_1.png'), prop(UNDEAD + 'Rock_shadow1_4.png')],
    'temple': [colorize(prop(ROCKY + 'Stone_pyramid1_grass_shadow.png'), ((96, 70, 40), (206, 178, 120), (250, 236, 190))), prop(ROCKY + 'Rock_statue_deer_grass_shadow.png')],
    'crystal': [prop(CRYSTAL_ENV + '*Pillar.png'), hue(prop(UNDEAD + 'Crystal_shadow2_1.png'), 120)],
    'forge': [prop(VILLAGE + '3 Decor/7.png'), prop(VILLAGE + '4 Box/1.png')],
    'shrine': [prop(ROCKY + 'Rock_statue_fox_grass_shadow.png'), prop(VILLAGE + '3 Decor/10.png')],
    # (the war camp's palisades and tents)
    'warcamp': [prop(FIELD_ENV + '*Fence 02.png'), prop(FIELD_ENV + '*Fence 01.png'), prop(ROCKY + 'Yurt2_grass_shadow.png')],
    'oasis': [trim(small(pk('craftpix-net-675652*/PNG/middle_lane_rocks1/*.png')[k])) for k in (0, 4)],
}
for land, imgs in BOULDERS.items():
    for n, im in enumerate(imgs):
        save(im, land, 'boulder%d.png' % (n + 1))

tall = pk('craftpix-net-665131*/2 Objects/5 Grass/*.png')
fern = lambda n: prop(ROCKY + 'Fern_tree%d.png' % n)
TALL = {
    'plains': [small(tall[4]), small(tall[5])],
    'autumn': [colorize(small(tall[4]), ((90, 40, 10), (200, 110, 30), (250, 200, 90))), colorize(small(tall[5]), ((90, 40, 10), (200, 110, 30), (250, 200, 90)))],
    'swamp': [prop(UNDEAD + 'Plant_shadow1_2.png'), prop(UNDEAD + 'Plant_shadow1_3.png')],
    'graveyard': [prop(UNDEAD + 'Thorn_plant_shadow1_4.png'), prop(UNDEAD + 'Thorn_plant_shadow1_1.png')],
    'ruins': [prop(UNDEAD + 'Plant_shadow1_4.png'), prop(UNDEAD + 'Plant_shadow1_3.png')],
    'temple': [fern(1), fern(2)],
    'crystal': [hue(prop(CAVE + 'mushroom1_light_shadow1.png'), 150), hue(prop(CAVE + 'mushroom3_light_shadow3.png'), 150)],
    'forge': [colorize(small(tall[4]), ((10, 6, 6), (70, 30, 24), (190, 80, 30))), colorize(small(tall[5]), ((10, 6, 6), (70, 30, 24), (190, 80, 30)))],
    'shrine': [colorize(small(tall[4]), ((40, 20, 60), (170, 90, 150), (250, 200, 230))), colorize(small(tall[5]), ((40, 20, 60), (170, 90, 150), (250, 200, 230)))],
    'warcamp': [colorize(small(tall[4]), ((60, 44, 16), (150, 120, 50), (210, 180, 100))), colorize(small(tall[5]), ((60, 44, 16), (150, 120, 50), (210, 180, 100)))],
    'oasis': [small(tall[4]), small(tall[5])],
}
for land, imgs in TALL.items():
    for n, im in enumerate(imgs):
        save(im, land, 'tall%d.png' % (n + 1))
print('done')
