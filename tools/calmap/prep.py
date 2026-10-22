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

# The six lands: ground tiles (the first sets the lattice), the road tile, then props by role.
LANDS = [
    dict(id='fields', ground=['knights/grass_tile'], road='knights/dirt_tile', tree=['knights/oak_tree', 'knights/pine_tree'], bush=['knights/bush', 'knights/hay_bales'], rock=['knights/rocks'], lair='orcs/skull_gate'),
    dict(id='forest', ground=['druids/moss_grass_tile', 'druids/forest_floor_tile'], road='druids/stone_path_tile', tree=['druids/great_oak', 'druids/birch_tree'], bush=['druids/berry_bush', 'druids/mushroom_lantern'], rock=['druids/mossy_rocks'], lair='druids/tree_gate'),
    dict(id='desert', ground=['nomads/dry_grass_tile', 'nomads/dust_tile'], road='dwarves/flagstone_tile', tree=['nomads/acacia_tree'], bush=['nomads/dead_shrub', 'nomads/tumbleweed'], rock=['nomads/red_rocks', 'nomads/red_rocks_small'], lair='bloodcourt/crypt'),
    dict(id='snow', ground=['moonpack/snow_tile', 'moonpack/pine_floor_tile'], road='dwarves/stone_floor_tile', tree=['moonpack/snowy_pine', 'moonpack/small_pine'], bush=['moonpack/snowy_bush', 'moonpack/bare_tree'], rock=['moonpack/boulders', 'moonpack/rocks_a', 'moonpack/rocks_b'], lair='moonpack/cave_den'),
    dict(id='ash', ground=['orcs/scorched_tile', 'orcs/bone_tile'], road='dwarves/rocky_tile', tree=['orcs/burnt_tree', 'orcs/gnarled_tree'], bush=['orcs/thorn_bush'], rock=['orcs/dark_rocks', 'orcs/dark_rocks_b'], lair='bloodcourt/gatehouse'),
    dict(id='ruins', ground=['liches/cracked_earth_tile', 'liches/dead_grass_tile'], road='liches/cobble_tile', tree=['liches/dead_oak', 'liches/dead_pine'], bush=['liches/thorn_bush', 'bloodcourt/gravestones'], rock=['liches/rocks', 'liches/skull_pile'], lair='liches/gatehouse'),
]
# The landmarks every land shares: one for each kind of spot.
MARKS = {
    'fight': 'orcs/weapon_stall', 'fight_spent': 'orcs/hide_roof', 'elite': 'orcs/war_drum', 'elite_spent': 'liches/skull_pile',
    'shop': 'knights/market_stall', 'recruit': 'nomads/canvas_roof', 'recruit_flag': 'nomads/standard', 'treasure': 'nomads/chests',
    'side_treasure': 'orcs/loot_chests', 'campfire': 'knights/campfire', 'mystery': 'fae/shrine', 'start': 'druids/stone_circle',
}
SPENT = ['shop', 'recruit', 'recruit_flag', 'treasure', 'side_treasure', 'mystery']


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
    entry = {'id': land['id'], 'ground': [], 'road': None, 'tree': [], 'bush': [], 'rock': [], 'lair': None}
    for k, p in enumerate(land['ground']):
        name = f'g{n}_{k}'
        sprites[name] = load(p, trim=False)
        entry['ground'].append(name)
    sprites[f'r{n}'] = load(land['road'], trim=False)
    entry['road'] = f'r{n}'
    for role in ('tree', 'bush', 'rock'):
        for k, p in enumerate(land[role]):
            name = f'{role[0]}{n}_{k}'
            sprites[name] = load(p)
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
# (the hidden mini-boss's camp: a skull banner over a meat pile, narrower than the elite's war drum)
_b, _m = load('orcs/spear_signpost'), load('orcs/meat_pile')
_c = Image.new('RGBA', (_m.width + _b.width - 14, max(_b.height, _m.height)), (0, 0, 0, 0))
_c.alpha_composite(_m, (_b.width - 14, _c.height - _m.height))
_c.alpha_composite(_b, (0, _c.height - _b.height))
sprites['side_elite'] = _c
for k in SPENT:
    sprites[k + '_spent'] = drain(sprites[k])
sprites['campfire_spent'] = burnt_out(sprites['campfire'])
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

ts = ['// The Calamity map\'s art: where each picture sits in src/art/calmap/atlas.png ([x, y, w, h]), and each land\'s pieces.',
      '// GENERATED by tools/calmap/prep.py: do not edit by hand.', '',
      f'export const ATLAS_SIZE: [number, number] = [{W}, {H}];',
      'export const RECTS: Record<string, [number, number, number, number]> = {']
for k in sorted(rects):
    ts.append(f"  {k}: [{', '.join(map(str, rects[k]))}],")
ts.append('};')
ts.append('')
ts.append('/** A land\'s pieces by role (names in `RECTS`), and its lattice: a ground tile `tw` across, its top face `th` down. */')
ts.append('export interface LandArt { id: string; tw: number; th: number; ground: string[]; road: string; tree: string[]; bush: string[]; rock: string[]; lair: string }')
ts.append('export const LAND_ART: LandArt[] = ' + json.dumps(meta['lands'], indent=2) + ';')
ts.append('')
ts.append('export const PORTAL_FRAMES = 16;')
with open(os.path.join(ROOT, 'src', 'render', 'calArt.ts'), 'w') as f:
    f.write('\n'.join(ts) + '\n')
print('atlas', W, H, 'sprites', len(sprites), 'bytes', os.path.getsize(os.path.join(out, 'atlas.png')), 'portal', os.path.getsize(os.path.join(out, 'portal.png')))
for e in meta['lands']:
    print(e['id'], e['tw'], e['th'], {k: sprites[k].size for k in e['ground'] + [e['road'], e['lair']]})
for k in MARKS:
    print(k, sprites[k].size)
