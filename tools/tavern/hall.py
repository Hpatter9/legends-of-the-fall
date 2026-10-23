# Cuts the extra tavern rooms' pieces (hearth wall, games-room wall, doorway, bench, stage) out of the PixelLab results into
# src/art/tavern/. Usage: python3 tools/tavern/hall.py <dir with hearth.png back.png arch.png bench.png stage.png>. Crops only:
# nothing is resized or repainted.
import sys
from PIL import Image
src, out = sys.argv[1], 'src/art/tavern/'
op = lambda n: Image.open(f'{src}/{n}.png').convert('RGBA')
# (the three walls are all 128 tall: the new two lose the black border above and the floor strip below)
op('hearth').crop((0, 16, 384, 144)).save(out + 'wall_hearth.png')
op('back').crop((0, 16, 384, 144)).save(out + 'wall_back.png')
op('arch').save(out + 'arch.png')
b = op('bench')
# (the bench came with a grey shadow strip under it: dropped)
px = b.load()
for y in range(b.height):
    for x in range(b.width):
        r, g, bl, a = px[x, y]
        if a and abs(r - g) < 6 and abs(g - bl) < 6 and r > 120: px[x, y] = (0, 0, 0, 0)
b.crop(b.getbbox()).save(out + 'bench.png')
s = op('stage'); s.crop(s.getbbox()).save(out + 'stage.png')
