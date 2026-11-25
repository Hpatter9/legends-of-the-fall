"""IAP (docs/notes/iap.md): cuts the round-2 shop art (art-source/round2/, PR #666) into the Shop's pictures in src/art/treasury/.

    python3 tools/iap/art.py

The piles and chests at 192 px, the starter's and the bundles' banners at 576 x 240, the costumes doubled with nearest-neighbour (pixel
art), each new ruler's first idle frame (its atlas's top-left 224 px cell) at 160 px, and the Starfall card back at 128 x 192.
"""
import os
from PIL import Image

SRC = 'art-source/round2/'
OUT = 'src/art/treasury/'
os.makedirs(OUT, exist_ok=True)


def webp(im, name, size, q=88):
    im.resize(size, Image.LANCZOS).save(OUT + name + '.webp', 'WEBP', quality=q, method=6)


def load(name):
    return Image.open(SRC + name + '.png').convert('RGBA')


for n in ['shop_stones_1', 'shop_stones_2', 'shop_stones_3', 'shop_stones_4', 'shop_crowns_1', 'shop_crowns_2', 'shop_crowns_3']:
    webp(load(n), n, (192, 192))
for n in ['shop_starter', 'shop_bundle_recruit', 'shop_bundle_warlord']:
    webp(load(n), n, (576, 240))
for n in ['costume_regalia', 'costume_knight', 'costume_lantern']:
    load(n).resize((128, 128), Image.NEAREST).save(OUT + n + '.png')
for n in ['ruler_ember', 'ruler_starlit']:
    webp(load(n).crop((0, 0, 224, 224)), n, (160, 160))
webp(load('starfall_cardback'), 'starfall_cardback', (128, 192), 90)
