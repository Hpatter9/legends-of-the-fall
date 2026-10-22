"""Copy the war camp's new pictures into src/art/camp/, each shrunk to half size (2x2 box average, then solid or clear) like the castle's
(tools/castle/prep.py), so the kits' big pieces sit in a phone-sized scene. The camp also reuses pieces already in src/art/castle/.
Sources: the isometric kits in hpatter9/little-town (src/renderer/art/iso/kits) and the cloud and sky pack in hpatter9/chronos-assets
(craftpix-net-995711-free-pixel-art-cloud-and-sky-backgrounds). Prints the SIZES table for src/render/campSpots.ts."""
import os
from PIL import Image
ISO = '/home/user/hpatter9/little-town/src/renderer/art/iso/kits/'
SKY = '/home/user/chronos-assets/craftpix-net-995711-free-pixel-art-cloud-and-sky-backgrounds/'
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'src', 'art', 'camp')
os.makedirs(out, exist_ok=True)
KITS = {
    'gate': 'knights/gatehouse', 'tent1': 'nomads/felt_roof', 'tent2': 'nomads/canvas_roof',
    'standard': 'nomads/standard', 'skins': 'nomads/water_skins',
    'torch': 'orcs/skull_torch', 'dirt_tile': 'knights/dirt_tile',
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
sizes = {}
for name, path in KITS.items():
    im = half(Image.open(ISO + path + '.png'))
    im = im.crop(im.getchannel('A').getbbox())
    im.save(f'{out}/{name}.png', optimize=True)
    sizes[name] = im.size
for name, path in {'sky': '1. NEW CLOUDS/1', 'cloud1': '1. NEW CLOUDS/3', 'cloud2': '1. NEW CLOUDS/2', 'night': '2. NEW CLOUDS/1'}.items():
    # (the sky pictures keep their own size: a scene pixel is about a css pixel, so they are drawn one to one)
    im = Image.open(SKY + path + '.png').convert('RGBA')
    im.save(f'{out}/{name}.png', optimize=True)
    sizes[name] = im.size
for k, (w, h) in sizes.items(): print(f'  {k}: [{w}, {h}],')
