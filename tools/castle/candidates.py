"""Make docs/samples/castle-candidates.png: the best castle-courtyard candidates at native size, grouped by building role.
Reads the isometric kits in hpatter9/little-town (src/renderer/art/iso/) and one side-view sample from the Craftpix tropical city pack."""
import os
from PIL import Image, ImageDraw, ImageFont
ISO = '/home/user/hpatter9/little-town/src/renderer/art/iso/'
TROP = '/home/user/chronos-assets/assets/craftpix-988114-free-tropical-medieval-city-2d-tileset/PNG/buildings/building_1/'
K, S, D, B, F, N, O, L, DR = 'kits/knights/', 'kits/settlers/', 'kits/dwarves/', 'kits/bloodcourt/', 'kits/fae/', 'kits/nomads/', 'kits/orcs/', 'kits/liches/', 'kits/druids/'
CB, CD = 'castles/bloodcourt/', 'castles/dwarves/'
GROUPS = [
    ('MAGE TOWER (portal, spires, towers)', [F + 'shrine', F + 'spiral_watchtower', K + 'watchtower', CD + 'hold_tower', CB + 'castle_tower', CB + 'castle_keep', L + 'chapel']),
    ('TREASURY (vaults, halls, chests)', [K + 'stockpile', K + 'granary', K + 'longhouse', K + 'tavern', D + 'great_hall', CD + 'hold_hall', CB + 'castle_hall', N + 'chests', O + 'loot_chests']),
    ('BARRACKS', [K + 'campfire', K + 'cottage', K + 'workshop', K + 'stable', K + 'barracks', S + 'longhouse']),
    ('ARMOURY (forges, smithies)', [D + 'anvil_stall', D + 'forge_fire', K + 'workshop', D + 'forge', CD + 'hold_forge']),
    ('WALLS AND GATES', [K + 'stone_wall_run', K + 'stone_wall_corner', K + 'gatehouse', S + 'stone_gate', S + 'stone_wall_run', CB + 'castle_gate', CD + 'hold_gate', CD + 'hold_wall']),
    ('PLAZA AND GARDEN PROPS (wells, shrines, braziers, banners, stalls, trees)', [K + 'well', S + 'well', D + 'shrine', D + 'brazier', B + 'brazier', B + 'banner', K + 'lamp_post', K + 'market_stall', K + 'iron_fence', K + 'oak_tree', K + 'pine_tree', K + 'bush', DR + 'flower_patch', DR + 'berry_bush', B + 'rose_bush', K + 'crates', K + 'barrels', K + 'hay_bales', K + 'woodpile', K + 'cart', K + 'signpost', K + 'rocks']),
    ('GROUND TILES', [K + 'grass_tile', K + 'cobble_tile', K + 'dirt_tile', K + 'field_tile', S + 'cobble_tile', DR + 'herb_garden_tile']),
]
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', 12)
big = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', 16)
W = 1700
sections = []
for title, ids in GROUPS:
    ims = [(i, Image.open(ISO + i + '.png').convert('RGBA')) for i in ids]
    x, y, rowh, rows = 10, 0, 0, []
    cur = []
    for i, im in ims:
        cw = max(im.width, 180) + 16
        if x + cw > W:
            rows.append((cur, rowh)); cur, x, rowh = [], 10, 0
        cur.append((x, i, im)); x += cw; rowh = max(rowh, im.height)
    rows.append((cur, rowh))
    sections.append((title, rows))
H = sum(30 + sum(r + 24 for _, r in rows) + 10 for _, rows in sections)
sheet = Image.new('RGBA', (W, H), (44, 44, 54, 255))
d = ImageDraw.Draw(sheet)
y = 0
for title, rows in sections:
    d.text((10, y + 6), title, fill=(255, 220, 120, 255), font=big)
    y += 30
    for cur, rh in rows:
        for x, i, im in cur:
            sheet.alpha_composite(im, (x, y + 18 + rh - im.height))
            d.text((x, y + 2), f'{i.split("/")[-1]} {im.width}x{im.height}', fill=(230, 230, 230, 255), font=font)
        y += rh + 24
    y += 10
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'docs', 'samples', 'castle-candidates.png')
sheet.convert('RGB').save(out)
print(sheet.size)
