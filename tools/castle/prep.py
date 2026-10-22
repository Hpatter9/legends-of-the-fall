"""Copy the courtyard's pictures into src/art/castle/ under short names (one sprite at a time, as CLAUDE.md asks).
Usage: prep.py <dir with the generated towers t1_3.png t2_2.png t3_2.png>
Sources: Chronos (hpatter9/little-town, src/renderer/art/, cut from the Craftpix village, Fields, Path and Road, Tiny RPG Town and Dungeon packs,
and DawnLike-free pieces) and the Tiny RPG Town vegetation props in hpatter9/chronos-assets. The towers are generated (PixelLab)."""
import os, sys
from PIL import Image
LT = '/home/user/hpatter9/little-town/src/renderer/art/'
TT = '/home/user/chronos-assets/tiny-rpg-town-files/tiny-rpg-town-files/Assets/Environments/Vegetation props/'
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'src', 'art', 'castle')
os.makedirs(out, exist_ok=True)
FROM_LT = {
    'house1': 'village/house1', 'house2': 'village/house2', 'house4': 'village/house4',
    'gb_house': 'shops/gb_house', 'gb_shop': 'shops/gb_shop', 'gb_canopy': 'shops/gb_canopy',
    'tt_long': 'packs/tt_long', 'tt_gable': 'packs/tt_gable',
    'yurt1': 'packs/rocky_yurt1', 'yurt2': 'packs/rocky_yurt2', 'camp3': 'village/camp3',
    'anvil': 'packs/v_anvil', 'rack': 'packs/v_rack', 'well': 'packs/v_well', 'sign_sword': 'packs/v_sign_sword', 'planks': 'packs/v_planks',
    'log': 'village/log1', 'lantern': 'village/lantern', 'barrel': 'village/barrel', 'crate': 'village/crate', 'box1': 'village/box1', 'box2': 'village/box2',
    'cart': 'village/cart', 'gb_barrels': 'shops/gb_barrels', 'gb_sacks': 'shops/gb_sacks', 'gb_crates': 'shops/gb_crates', 'gb_signpost': 'shops/gb_signpost',
    'gold1': 'clutter/gold1', 'gold2': 'clutter/gold2', 'chest_gold': 'clutter/chest_gold', 'crates_tall': 'clutter/crates_tall', 'crate_stack': 'clutter/crate_stack',
    'palisade': 'village/palisade01', 'palisade2': 'village/palisade02', 'gate': 'village/palisade05',
    'tuft1': 'fields/tuft1', 'tuft2': 'fields/tuft2', 'tuft3': 'fields/tuft3', 'flower1': 'fields/flower1', 'flower3': 'fields/flower3', 'flower5': 'fields/flower5',
    'pebble1': 'fields/pebble1', 'pebble3': 'fields/pebble3', 'pebble5': 'fields/pebble5', 'fence': 'fields/fence1',
}
for name, src in FROM_LT.items():
    Image.open(LT + src + '.png').convert('RGBA').save(f'{out}/{name}.png')
for name, src in {'tree1': 'tree-1', 'tree2': 'tree-2', 'bush1': 'bush-1', 'bush2': 'bush-3'}.items():
    Image.open(TT + src + '.png').convert('RGBA').save(f'{out}/{name}.png')
# the road's cobbles: one inner tile of Path and Road's cobble sheet; the grass is a flat colour read from the village ground sheet
Image.open(LT + 'roads/road1_grass.png').convert('RGBA').crop((32, 16, 48, 32)).save(f'{out}/cobble.png')
for name, src in {'tower1': 't1_3', 'tower2': 't2_2', 'tower3': 't3_2'}.items():
    im = Image.open(f'{sys.argv[1]}/{src}.png').convert('RGBA')
    im.crop(im.getchannel('A').getbbox()).save(f'{out}/{name}.png')
for f in sorted(os.listdir(out)):
    print(f, Image.open(f'{out}/{f}').size)
