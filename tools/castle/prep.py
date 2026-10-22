"""Copy the courtyard's pictures into src/art/castle/ under short names, each shrunk to half size by a 2x2 box average (then solid or clear),
so the isometric kits' big pieces (a cottage is about 200 px wide) fit a phone-sized yard and stay crisp pixel art.
Source: the isometric kits and castle pieces in hpatter9/little-town (src/renderer/art/iso/; drawn in one 2:1 view, lit from the upper left).
Prints the SPRITE_SIZE table for src/render/castleSpots.ts and the imports for src/castle.ts."""
import os
from PIL import Image
ISO = '/home/user/hpatter9/little-town/src/renderer/art/iso/'
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'src', 'art', 'castle')
K, S, D, B, F, N, L, DR = 'kits/knights/', 'kits/settlers/', 'kits/dwarves/', 'kits/bloodcourt/', 'kits/fae/', 'kits/nomads/', 'kits/liches/', 'kits/druids/'
PICKS = {
    # buildings
    'shrine': F + 'shrine', 'spiral': F + 'spiral_watchtower', 'watchtower': K + 'watchtower', 'chapel': L + 'chapel',
    'stockpile': K + 'stockpile', 'longhouse': K + 'longhouse', 'great_hall': D + 'great_hall',
    'cottage': K + 'cottage', 'thatch': S + 'longhouse', 'barracks': K + 'barracks',
    'anvil_stall': D + 'anvil_stall', 'workshop': K + 'workshop', 'forge': D + 'forge',
    # walls and gates
    'gate': S + 'stone_gate', 'wall': S + 'stone_wall_run',
    # props
    'chests': N + 'chests', 'campfire': K + 'campfire', 'hay': K + 'hay_bales', 'crates': K + 'crates', 'barrels': K + 'barrels', 'woodpile': K + 'woodpile',
        'brazier': D + 'brazier', 'banner': B + 'banner', 'statue': D + 'shrine', 'oak': K + 'oak_tree', 'pine': K + 'pine_tree', 'bush': K + 'bush',
    'rocks': K + 'rocks', 'flowers': DR + 'flower_patch', 'berries': DR + 'berry_bush', 'roses': B + 'rose_bush', 'crystals': D + 'crystals',
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
    im.save(f'{out}/{name}.png', optimize=True)
    sizes[name] = im.size
print('SPRITE_SIZE:')
for k, (w, h) in sizes.items(): print(f'  {k}: [{w}, {h}],')
