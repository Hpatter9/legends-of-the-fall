"""Cut the Calamity map's art: the land tiles, props and landmarks, one atlas (src/art/calmap/atlas.png) and its table
(src/render/calArt.ts), and the portal's frames (src/art/calmap/portal.png).

Sources: the isometric kits in hpatter9/little-town (src/renderer/art/iso/kits), each piece shrunk to half size by a 2x2 box average
(as tools/castle/prep.py and tools/camp/prep.py do), and the rift portal of the PVFX Foundry pack in hpatter9/chronos-assets
(pvfx-foundry-thirteen-spritesheets/effects/rift-portal, CC0). The "spent" pictures (a landmark once its spot is cleared) are made here from the
live ones: the colours drained and darkened for the stall, tents, chest and shrine; the flame taken out of the campfire and the logs left to ash.
Run: python3 tools/calmap/prep.py"""
import json, os
import numpy as np
from PIL import Image

ISO = '/home/user/hpatter9/little-town/src/renderer/art/iso/kits/'
RIFT = '/home/user/chronos-assets/pvfx-foundry-thirteen-spritesheets/effects/rift-portal/grid/'
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')

# The six realms of the void (the owner: "more like an interdimensional space"): each spot an island of one realm's ground, with props by role. `hue` turns the
# realm's pictures (degrees) where the kits have no piece of that colour. The first ground tile sets the lattice.
LANDS = [
    dict(id='meadow', ground=['knights/grass_tile'], tree=['knights/oak_tree', 'knights/pine_tree'], bush=['knights/bush', 'knights/hay_bales'], rock=['knights/rocks'], lair='orcs/skull_gate'),
    dict(id='crystal', ground=['fae/mushroom_patch_tile', 'fae/meadow_tile'], tree=['fae/crystal_rocks', 'dwarves/crystals'], bush=['fae/glow_bush'], rock=['dwarves/crystals', 'fae/crystal_rocks'], lair='fae/flower_arch_gate'),
    dict(id='infernal', ground=['orcs/scorched_tile', 'orcs/bone_tile'], tree=['orcs/burnt_tree', 'orcs/gnarled_tree'], bush=['orcs/thorn_bush', 'bloodcourt/brazier'], rock=['orcs/dark_rocks', 'orcs/dark_rocks_b'], lair='bloodcourt/crypt'),
    dict(id='frozen', ground=['moonpack/snow_tile'], tree=['moonpack/snowy_pine', 'moonpack/small_pine'], bush=['moonpack/snowy_bush'], rock=['moonpack/boulders', 'moonpack/rocks_a', 'moonpack/rocks_b'], lair='moonpack/cave_den'),
    dict(id='clockwork', ground=['machines/iron_plate_tile', 'machines/grate_tile'], tree=['machines/iron_tree', 'machines/coil_stack'], bush=['machines/oil_drums', 'machines/arc_lamp'], rock=['machines/oil_drums'], lair='machines/generator'),
    dict(id='rift', ground=['liches/cracked_earth_tile'], tree=['liches/dead_oak', 'dwarves/crystals'], bush=['liches/witch_fire', 'liches/skull_pile'], rock=['dwarves/crystals', 'liches/rocks'], lair='liches/gatehouse', hue=250),
]
# The landmarks every land shares: one for each kind of spot.
MARKS = {
    'fight_spent': 'orcs/hide_roof', 'elite': 'orcs/war_drum', 'elite_spent': 'liches/skull_pile',
    'shop': 'knights/market_stall', 'recruit': 'nomads/canvas_roof', 'recruit_b': 'nomads/felt_roof', 'recruit_flag': 'nomads/standard', 'treasure': 'nomads/chests',
    'side_treasure': 'dwarves/ore_cart', 'campfire': 'knights/campfire', 'mystery': 'fae/shrine', 'start': 'druids/stone_circle',
}
SPENT = ['shop', 'recruit', 'recruit_b', 'recruit_c', 'recruit_flag', 'treasure', 'side_treasure', 'mystery']


def hue_shift(im, deg, sat=1.0):
    """Turn every colour of a picture round the wheel by `deg` degrees (the alpha is kept)."""
    import colorsys
    a = np.array(im.convert('RGBA'))
    hsv = np.array(Image.fromarray(a[..., :3]).convert('HSV')).astype(float)
    hsv[..., 0] = (hsv[..., 0] + deg / 360 * 255) % 255
    hsv[..., 1] = np.clip(hsv[..., 1] * sat, 0, 255)
    rgb = np.array(Image.fromarray(hsv.astype(np.uint8), 'HSV').convert('RGB'))
    return Image.fromarray(np.dstack([rgb, a[..., 3]]))


def half(im):
    a = np.array(im.convert('RGBA')).astype(float)
    h, w = a.shape[0] // 2, a.shape[1] // 2
    a = a[:h * 2, :w * 2].reshape(h, 2, w, 2, 4)
    al = a[..., 3].sum(axis=(1, 3))
    rgb = (a[..., :3] * a[..., 3:4]).sum(axis=(1, 3)) / np.maximum(al, 1)[..., None]
    out = np.zeros((h, w, 4), np.uint8)
    out[..., :3] = rgb.clip(0, 255)
    out[..., 3] = np.where(al >= 510, 255, 0)
    return Image.fromarray(out)


def load(path, trim=True):
    im = half(Image.open(ISO + path + '.png'))
    if trim:
        bb = im.getchannel('A').getbbox()
        im = im.crop(bb)
    return im


def drain(im, dark=0.62, keep=0.25):
    """The colours drained towards grey and darkened: a spot that is done."""
    a = np.array(im).astype(float)
    lum = (a[..., 0] * 0.3 + a[..., 1] * 0.59 + a[..., 2] * 0.11)[..., None]
    a[..., :3] = (lum + (a[..., :3] - lum) * keep) * dark
    return Image.fromarray(a.clip(0, 255).astype(np.uint8))


def burnt_out(im):
    """The campfire with its flame taken out and the logs left grey ash and ember."""
    a = np.array(im).astype(float)
    r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    hot = (al > 0) & (r > 185) & (r - b > 110) & (g > 70)
    h = a.shape[0]
    out = a.copy()
    for y in range(h):
        for x in range(a.shape[1]):
            if hot[y, x]:
                if y > h * 0.5:
                    out[y, x] = (70, 62, 58, 255)
                else:
                    out[y, x, 3] = 0
    # (a faint grey over the rest: cold stones and charred wood)
    im2 = Image.fromarray(out.clip(0, 255).astype(np.uint8))
    return drain(im2, 0.8, 0.3)


sprites = {}   # name -> image
meta = {'lands': [], 'marks': {}}
for n, land in enumerate(LANDS):
    entry = {'id': land['id'], 'ground': [], 'tree': [], 'bush': [], 'rock': [], 'lair': None}
    deg = land.get('hue', 0)
    tint = (lambda im: hue_shift(im, deg)) if deg else (lambda im: im)
    for k, p in enumerate(land['ground']):
        name = f'g{n}_{k}'
        sprites[name] = tint(load(p, trim=False))
        entry['ground'].append(name)
    for role in ('tree', 'bush', 'rock'):
        for k, p in enumerate(land[role]):
            name = f'{role[0]}{n}_{k}'
            sprites[name] = tint(load(p)) if role == 'rock' else load(p)
            entry[role].append(name)
    sprites[f'l{n}'] = load(land['lair'])
    entry['lair'] = f'l{n}'
    w, h = sprites[f'g{n}_0'].size
    # (the lattice: the first ground tile's width across, and its top face 0.578 of that down: true isometric)
    entry['tw'] = w
    entry['th'] = round(w * 0.578)
    meta['lands'].append(entry)
for k, p in MARKS.items():
    sprites[k] = load(p)
def stack(parts, w=None):
    """Pictures side by side on one ground line: [(image, dx, dy)] with dx from the left; dy lifts a piece."""
    W = max(dx + im.width for im, dx, dy in parts)
    H = max(im.height + dy for im, dx, dy in parts)
    c = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for im, dx, dy in parts:
        c.alpha_composite(im, (dx, H - im.height - dy))
    return c

# (a foe camp for a plain fight: a palisade corner with a skull-and-spear banner at its foot)
_w, _b = load('orcs/spiked_wall_corner'), load('orcs/spear_signpost')
sprites['fight'] = stack([(_w, 20, 0), (_b, 0, 0)])
# (the hidden mini-boss's camp: an antler-and-skull banner over a bone fence)
_f, _s = load('moonpack/bone_fence'), load('moonpack/skull_signpost')
sprites['side_elite'] = stack([(_f, 28, 0), (_s, 0, 0)])
# (a third tent for the recruit camps, the striped one turned to greens)
_t = np.array(load('nomads/canvas_roof')).astype(float)
_t[..., [0, 1, 2]] = _t[..., [1, 2, 0]]
sprites['recruit_c'] = Image.fromarray(_t.clip(0, 255).astype(np.uint8))
for k in SPENT:
    sprites[k + '_spent'] = drain(sprites[k])
sprites['campfire_spent'] = burnt_out(sprites['campfire'])
sprites['fight_spent'] = drain(sprites['fight_spent'], 0.75, 0.5)
meta['marks'] = {k: k for k in list(MARKS) + [s + '_spent' for s in SPENT] + ['campfire_spent']}

# shelf-pack, tallest first, a clear pixel between pieces
order = sorted(sprites, key=lambda k: (-sprites[k].height, k))
W = 1024
x = y = rowh = 0
rects = {}
for k in order:
    im = sprites[k]
    if x + im.width + 1 > W:
        x, y, rowh = 0, y + rowh + 1, 0
    rects[k] = [x, y, im.width, im.height]
    x += im.width + 1
    rowh = max(rowh, im.height)
H = y + rowh
atlas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
for k, (rx, ry, rw, rh) in rects.items():
    atlas.alpha_composite(sprites[k], (rx, ry))
out = os.path.join(ROOT, 'src', 'art', 'calmap')
os.makedirs(out, exist_ok=True)
# (256 colours, like the kits' own pictures: it is a fifth of the size and looks the same)
atlas.quantize(256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(os.path.join(out, 'atlas.png'), optimize=True)

# the portal: sixteen 64x64 frames (the visible part of the 96x96 cells), one row
sheet = Image.open(RIFT + 'sprite-sheet.png').convert('RGBA')
frames = [sheet.crop((c * 96 + 16, r * 96 + 16, c * 96 + 80, r * 96 + 80)) for i in range(16) for r, c in [divmod(i, 5)]]
strip = Image.new('RGBA', (64 * 16, 64), (0, 0, 0, 0))
for i, f in enumerate(frames):
    strip.alpha_composite(f, (i * 64, 0))
strip.save(os.path.join(out, 'portal.png'), optimize=True)

# ---- the void behind the islands (the moon, cloudscape and star pictures of the packs, in src/art/calmap/) ----
MOON = '/home/user/chronos-assets/craftpix-net-942044-free-moon-pixel-game-backgrounds/'
CLOUD = '/home/user/chronos-assets/assets/craftpix-net-227064-free-seamless-pixel-art-cloudscape-for-game-projects/'
out_dir = os.path.join(ROOT, 'src', 'art', 'calmap')
# the stars: the bright pixels of the first moon set's sky, on their own (the sky's gradient is drawn by the page, a colour for each realm)
sky = np.array(Image.open(MOON + '1 background/1.png').convert('RGBA')).astype(float)
lum = sky[..., 0] * 0.3 + sky[..., 1] * 0.59 + sky[..., 2] * 0.11
mask = lum > 70
stars = np.zeros(sky.shape, np.uint8)
stars[mask] = np.clip(sky[mask] * 1.15, 0, 255).astype(np.uint8)
stars[..., 3] = np.where(mask, 255, 0)
Image.fromarray(stars).save(os.path.join(out_dir, 'stars.png'), optimize=True)
# the moons, one to a colour (white, tan, red, pale blue), cropped
for name, path in {'white': '1 background/2.png', 'tan': '2 background/2.png', 'red': '3 background/2.png', 'blue': '4 background/2.png'}.items():
    im = Image.open(MOON + path).convert('RGBA')
    im.crop(im.getchannel('A').getbbox()).save(os.path.join(out_dir, f'planet_{name}.png'), optimize=True)
# the nebulae: the cloudscape's two blue cloud layers, turned to each realm's colour (hue degrees from blue), horizontally seamless as drawn
c3 = Image.open(CLOUD + 'background 1/3.png').convert('RGBA')
c4 = Image.open(CLOUD + 'background 1/4.png').convert('RGBA')
cloud = Image.new('RGBA', c3.size, (0, 0, 0, 0))
cloud.alpha_composite(c3)
cloud.alpha_composite(c4)
for n, deg in enumerate([40, 100, 150, 0, 270, 200]):
    quant = hue_shift(cloud, deg)
    quant.save(os.path.join(out_dir, f'nebula_{n}.png'), optimize=True)

ts = ['// The Calamity map\'s art: where each picture sits in src/art/calmap/atlas.png ([x, y, w, h]), and each land\'s pieces.',
      '// GENERATED by tools/calmap/prep.py: do not edit by hand.', '',
      f'export const ATLAS_SIZE: [number, number] = [{W}, {H}];',
      'export const RECTS: Record<string, [number, number, number, number]> = {']
for k in sorted(rects):
    ts.append(f"  {k}: [{', '.join(map(str, rects[k]))}],")
ts.append('};')
ts.append('')
ts.append('/** A land\'s pieces by role (names in `RECTS`), and its lattice: a ground tile `tw` across, its top face `th` down. */')
ts.append('export interface LandArt { id: string; tw: number; th: number; ground: string[]; tree: string[]; bush: string[]; rock: string[]; lair: string }')
ts.append('export const LAND_ART: LandArt[] = ' + json.dumps(meta['lands'], indent=2) + ';')
ts.append('')
ts.append('export const PORTAL_FRAMES = 16;')
with open(os.path.join(ROOT, 'src', 'render', 'calArt.ts'), 'w') as f:
    f.write('\n'.join(ts) + '\n')
print('atlas', W, H, 'sprites', len(sprites), 'bytes', os.path.getsize(os.path.join(out, 'atlas.png')), 'portal', os.path.getsize(os.path.join(out, 'portal.png')))
for e in meta['lands']:
    print(e['id'], e['tw'], e['th'], {k: sprites[k].size for k in e['ground'] + [e['lair']]})
for k in MARKS:
    print(k, sprites[k].size)
