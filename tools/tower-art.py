#!/usr/bin/env python3
"""Cuts the tower map's backdrop art (src/art/tower/<name>.png) from the Craftpix packs in chronos-assets, one piece at a time:
the brick, the barred and the small arched windows and the torch frames of the Free 2D Top-Down Pixel Dungeon Asset Pack
(walls_floor.png, fire_animation.png), the cloud strips of the Free Clouds Pixel Art Asset Pack, and the far peaks of the Free
Mountain Peak Pixel Art Backgrounds (background 3). The brick is also tinted (a plain multiply, no redrawn pixels) for the
castle halls and the summit.
Usage: python3 tools/tower-art.py [path to chronos-assets/assets]  (default ../chronos-assets/assets)"""
import os, sys
from PIL import Image, ImageChops
src = sys.argv[1] if len(sys.argv) > 1 else '../chronos-assets/assets'
out = os.path.join(os.path.dirname(__file__), '..', 'src', 'art', 'tower')
os.makedirs(out, exist_ok=True)
dun = os.path.join(src, 'craftpix-net-169442-free-2d-top-down-pixel-dungeon-asset-pack', 'PNG')
clouds = os.path.join(src, 'craftpix-net-801184-free-clouds-pixel-art-asset-pack', 'PNG')
peaks = os.path.join(src, 'craftpix-net-313304-free-mountain-peak-pixel-art-backgrounds', 'PNG', 'background 3')
walls = Image.open(os.path.join(dun, 'walls_floor.png')).convert('RGBA')
fire = Image.open(os.path.join(dun, 'fire_animation.png')).convert('RGBA')

def tint(im, rgb):
    r, g, b, a = im.split()
    t = Image.merge('RGB', (im.convert('RGB').split()))
    t = ImageChops.multiply(t, Image.new('RGB', im.size, rgb))
    t.putalpha(a)
    return t

brick = walls.crop((16, 48, 32, 64))
brick.save(os.path.join(out, 'brick.png'))
tint(brick, (255, 190, 170)).save(os.path.join(out, 'brick2.png'))   # warm hall stone
tint(brick, (170, 200, 255)).save(os.path.join(out, 'brick3.png'))   # cold summit stone
walls.crop((112, 288, 144, 336)).save(os.path.join(out, 'window.png'))
walls.crop((144, 296, 176, 328)).save(os.path.join(out, 'slit.png'))
# the wall torch, six frames side by side (48x48 each); the pack's flat glow disc (the faint pixels) is left out, the page draws a soft one
strip = Image.new('RGBA', (48 * 6, 48))
for i in range(6):
    fr = fire.crop((32, i * 48, 80, i * 48 + 48))
    fr.putdata([(r, g, b, a) if a > 100 else (0, 0, 0, 0) for r, g, b, a in fr.getdata()])
    strip.paste(fr, (i * 48, 0))
strip.save(os.path.join(out, 'torch.png'))
for name, f in (('cloud_w', 'Clouds_white/Shape2/cloud_shape2_1.png'), ('cloud_g', 'Clouds_gray/Shape2/cloud_shape2_1.png'),
                ('cloud_k', 'Clouds_black/Shape2/cloud_shape2_1.png'), ('cloud_w2', 'Clouds_white/Shape2/cloud_shape2_3.png'),
                ('cloud_k2', 'Clouds_black/Shape2/cloud_shape2_3.png')):
    Image.open(os.path.join(clouds, f)).convert('RGBA').save(os.path.join(out, name + '.png'))
p = Image.open(os.path.join(peaks, 'Plan 2.png')).convert('RGBA')
p.crop((0, 96, 576, 324)).save(os.path.join(out, 'peaks.png'))
print('done')
