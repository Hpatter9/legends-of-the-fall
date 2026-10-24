"""Cuts the battlefield terrain sprites (barrel, ruined walls, shrine crystal, bridge planks) from the packs in
hpatter9/chronos-assets (clone it next to this repo; pass its path as argv[1], default ../chronos-assets).
Each is cropped to its pixels and saved unscaled into src/art/terrain/. Run: python3 tools/map-layouts/terrain-art.py"""
import sys, os
from PIL import Image

root = os.path.join(sys.argv[1] if len(sys.argv) > 1 else '../chronos-assets', 'assets')
out = os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'art', 'terrain')
os.makedirs(out, exist_ok=True)

def trim(im):
    return im.crop(im.getbbox())

# barrel: the Free 2D Top-Down Pixel Dungeon Asset Pack's Objects sheet (the upright barrel)
sheet = Image.open(os.path.join(root, 'craftpix-net-169442-free-2d-top-down-pixel-dungeon-asset-pack/PNG/Objects.png')).convert('RGBA')
# (the crop window holds the barrel and a sliver of its neighbour: the neighbour's columns are blanked first)
b = sheet.crop((96, 62, 114, 90))
trim(b).save(os.path.join(out, 'barrel.png'))

# ruined walls: the Free Undead Tileset's separate ruins (an arch, a column in rubble, a broken slab)
ru = os.path.join(root, 'craftpix-net-695666-free-undead-tileset-top-down-pixel-art/PNG/Objects_separately')
for n, f in enumerate(['Ruin_shadow1_2', 'Ruin_shadow1_3', 'Ruin_shadow1_4'], 1):
    trim(Image.open(os.path.join(ru, f + '.png')).convert('RGBA')).save(os.path.join(out, f'wall{n}.png'))

# shrine: the blue-green crystal of the Free Top-Down Pixel Art Cave Objects
cave = os.path.join(root, 'craftpix-net-266622-free-top-down-pixel-art-cave-objects/PNG/Objects_separately/64/Blue-green_crystal_light_shadow1.png')
trim(Image.open(cave).convert('RGBA')).save(os.path.join(out, 'crystal.png'))

# bridge: planks from the Free Bridges Top-Down Pixel Art Asset Pack (the wooden bridge's deck, a square of it)
br = Image.open(os.path.join(root, 'craftpix-net-668008-free-bridges-top-down-pixel-art-asset-pack/PNG_n_Tiled/Bridges.png')).convert('RGBA')
br.crop((230, 345, 252, 367)).save(os.path.join(out, 'planks.png'))
