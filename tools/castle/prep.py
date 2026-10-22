"""Copy the courtyard's pictures into src/art/castle/ under short names, each shrunk to half size by a 2x2 box average (then solid or clear),
so the isometric kits' big pieces (a cottage is about 200 px wide) fit a phone-sized yard and stay crisp pixel art.
Source: the isometric kits and castle pieces in hpatter9/little-town (src/renderer/art/iso/; drawn in one 2:1 view, lit from the upper left).
Prints the SPRITE_SIZE table for src/render/castleSpots.ts and the imports for src/castle.ts."""
import os
import numpy as np
from PIL import Image
ISO = '/home/user/hpatter9/little-town/src/renderer/art/iso/'
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'src', 'art', 'castle')
K, S, D, B, F, N, L, DR, O = 'kits/knights/', 'kits/settlers/', 'kits/dwarves/', 'kits/bloodcourt/', 'kits/fae/', 'kits/nomads/', 'kits/liches/', 'kits/druids/', 'kits/orcs/'
PICKS = {
    # buildings
    'shrine': F + 'shrine', 'spiral': F + 'spiral_watchtower', 'watchtower': K + 'watchtower', 'chapel': L + 'chapel',
    'stockpile': K + 'stockpile', 'longhouse': K + 'longhouse', 'great_hall': D + 'great_hall',
    'cottage': K + 'cottage', 'thatch': S + 'longhouse', 'barracks': K + 'barracks',
    'anvil_stall': D + 'anvil_stall', 'workshop': K + 'workshop', 'forge': D + 'forge',
    # the tavern and the chapel (places, not upgrades), the stable and the library, the market and the garden
    'tavern': K + 'tavern', 'church': K + 'chapel', 'stable': K + 'stable', 'cart': K + 'cart', 'shed': S + 'stockpile', 'granary': K + 'granary',
    'atelier': F + 'workshop', 'manor': L + 'tavern', 'baskets': DR + 'baskets', 'stall': K + 'market_stall', 'stall2': S + 'market_stall', 'stall3': N + 'carpet_stall',
    'field': K + 'field_tile', 'field2': S + 'field_tile', 'herb': DR + 'herb_garden_tile', 'signpost': K + 'signpost',
    # trees to peek over the wall, a signpost for the Armies road, and the courtyard's well, patterned paving, pots and hedge
    'birch': DR + 'birch_tree', 'great': DR + 'great_oak', 'sign': S + 'signpost', 'well': K + 'well', 'flagstone': D + 'flagstone_tile',
    'pots': DR + 'clay_pots', 'hedge': DR + 'hedge_wall_run',
    # walls
    'wall': K + 'stone_wall_run',
    # props
    'chests': N + 'chests', 'campfire': K + 'campfire', 'hay': K + 'hay_bales', 'crates': K + 'crates', 'barrels': K + 'barrels', 'woodpile': K + 'woodpile',
        'brazier': D + 'brazier', 'banner': B + 'banner', 'oak': K + 'oak_tree', 'pine': K + 'pine_tree', 'bush': K + 'bush',
    'rocks': K + 'rocks', 'flowers': DR + 'flower_patch', 'berries': DR + 'berry_bush', 'roses': B + 'rose_bush', 'crystals': D + 'crystals', 'rack': O + 'weapon_stall', 'lamp': K + 'lamp_post',
    # ground
    'grass_tile': K + 'grass_tile', 'cobble_tile': K + 'cobble_tile',
}
def half(im):
    w, h = im.width // 2, im.height // 2
    src = im.convert('RGBA').load()
    o = Image.new('RGBA', (w, h))
    px = o.load()
    for y in range(h):
        for x in range(w):
            a = r = g = b = 0
            for dy in (0, 1):
                for dx in (0, 1):
                    p = src[2 * x + dx, 2 * y + dy]
                    a += p[3]; r += p[0] * p[3]; g += p[1] * p[3]; b += p[2] * p[3]
            if a >= 510:
                px[x, y] = (round(r / a), round(g / a), round(b / a), 255)
    return o
def wall_cell(im):
    """The kit's wall run is one block with end caps, a banner at each end and a slope of about 0.44; a row of those shows a notch at every joint and
    drifts off the ground lattice (2:1 tiles have a slope of 26/45). This makes one repeating cell of it: the end caps and the dark end columns left
    out (the columns past the last merlon rebuilt from one merlon back), the first banner painted over with stone from along the wall (the cell starts
    in its middle), the columns cut at merlon starts one merlon period (about 18.6 px) apart so a cell is five merlons, 93 px wide, and every column
    shifted up a whole number of pixels so the top and the foot of the wall run at the lattice slope. Cells then butt exactly at an offset of
    (93, 54) along a run (castleSpots.ts WALL_STEP) with no seam."""
    a = np.array(im.convert('RGBA')).astype(int)
    H, W = a.shape[:2]
    r, g, b, al = a[:, :, 0], a[:, :, 1], a[:, :, 2], a[:, :, 3]
    blue = (b > r + 30) & (b > g + 10) & (al > 0)
    m = np.zeros_like(blue)
    m[:, 18:40] = blue[:, 18:40]
    d = m.copy()
    for _ in range(3):
        d2 = d.copy(); d2[1:] |= d[:-1]; d2[:-1] |= d[1:]; d2[:, 1:] |= d[:, :-1]; d2[:, :-1] |= d[:, 1:]; d = d2
    out = a.copy()
    for y, x in zip(*np.where(d)):
        sx, sy = x + 47, y - 20
        if 0 <= sy < H and 0 <= sx < W and al[sy, sx] > 0 and not blue[sy, sx]:
            out[y, x] = a[sy, sx]
    ext = np.zeros((H, W + 2, 4), dtype=int)
    ext[:, :W] = out
    for c in (118, 119, 120, 121):
        for y in range(H):
            sy = y + 8
            if 0 <= sy < H:
                ext[y, c] = out[sy, c - 19]
    cell = ext[:, 29:122]
    Wc = cell.shape[1]
    k = 26 / 45 - 0.436
    Hn = H + int(round(k * (Wc - 1))) + 1
    res = np.zeros((Hn, Wc, 4), dtype=np.uint8)
    for x in range(Wc):
        sh = int(round(k * x))
        for y in range(H):
            ny = y + (Hn - H) - sh
            if 0 <= ny < Hn:
                res[ny, x] = cell[y, x]
    R = Image.fromarray(res, 'RGBA')
    return R.crop(R.getchannel('A').getbbox())

def soften_rim(im):
    """The ground tile's dark outline along its two back edges would show as a grid between tiles laid edge to edge; paint it over with the grass just inside."""
    w, h = im.size
    px = im.load()
    cx, cy = (w - 1) / 2, 26
    out = im.copy()
    op = out.load()
    for y in range(0, 28):
        for x in range(w):
            if px[x, y][3] == 0:
                continue
            near = any(0 <= x + dx < w and 0 <= y + dy < h and px[x + dx, y + dy][3] == 0 for dx in (-2, -1, 0, 1, 2) for dy in (-2, -1, 0, 1, 2))
            if near:
                d = max(1.0, ((cx - x) ** 2 + (cy - y) ** 2) ** 0.5)
                sx, sy = round(x + 3 * (cx - x) / d), round(y + 3 * (cy - y) / d)
                op[x, y] = px[sx, sy]
    return out
os.makedirs(out, exist_ok=True)
for f in os.listdir(out):
    os.remove(os.path.join(out, f))
sizes = {}
for name, src in sorted(PICKS.items()):
    im = half(Image.open(ISO + src + '.png'))
    bb = im.getchannel('A').getbbox()
    im = im.crop(bb)
    if name == 'grass_tile':
        im = soften_rim(im)
    if name == 'wall':
        im = wall_cell(im)
    im.save(f'{out}/{name}.png', optimize=True)
    sizes[name] = im.size
# the pieces made with PixelLab (tools/castle/gen.py): the picked candidate at its full size, halved like the kit pieces
GEN = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'generated')
for f in sorted(os.listdir(GEN)):
    if not f.endswith('.png'): continue
    name = f[:-4]
    im = half(Image.open(os.path.join(GEN, f)))
    if name == 'bench':
        # (a bench is a small thing: a quarter of the size it was made at)
        im = half(im.crop(im.getchannel('A').getbbox()))
    im = im.crop(im.getchannel('A').getbbox())
    im.save(f'{out}/{name}.png', optimize=True)
    sizes[name] = im.size
print('SPRITE_SIZE:')
for k, (w, h) in sizes.items(): print(f'  {k}: [{w}, {h}],')
