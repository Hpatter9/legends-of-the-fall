# Lays tools/map-lands/shots.mjs's screenshots out into contact sheets (python3 -I tools/map-lands/sheet.py <shots dir> <out dir>):
# docs/samples/map-lands-lands-<w>x<h>.png (every land's deploy view) and map-lands-weather-<w>x<h>.png (some weathers).
import glob, os, sys
from PIL import Image, ImageDraw
src, out = sys.argv[1], sys.argv[2]
LANDS = ['highlands', 'forest', 'snow', 'desert', 'volcano', 'dungeon', 'plains', 'autumn', 'swamp', 'graveyard', 'ruins', 'temple', 'crystal', 'forge', 'shrine', 'warcamp', 'oasis']
WEATHER = ['rain-plains', 'snow-snow', 'fog-swamp', 'leaves-autumn', 'embers-forge', 'ash-volcano', 'night-shrine', 'night-warcamp']
def sheet(names, prefix, size, cols, name):
    w, h = size
    k = 0.5
    tw, th = int(w * k), int(h * k)
    rows = (len(names) + cols - 1) // cols
    im = Image.new('RGB', (cols * tw, rows * (th + 12)), '#111')
    d = ImageDraw.Draw(im)
    for i, n in enumerate(names):
        p = f'{src}/{prefix}-{n}-{w}x{h}.png'
        t = Image.open(p).convert('RGB').resize((tw, th), Image.LANCZOS)
        x, y = (i % cols) * tw, (i // cols) * (th + 12)
        im.paste(t, (x, y + 12))
        d.text((x + 3, y + 1), n, fill='white')
    im.save(f'{out}/{name}-{w}x{h}.png', optimize=True)
for size in [(393, 852), (360, 780), (412, 915)]:
    sheet(LANDS, 'land', size, 6, 'map-lands-lands')
    sheet(WEATHER, 'weather', size, 4, 'map-lands-weather')
