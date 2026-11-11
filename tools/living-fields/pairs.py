# LIVING-FIELDS: every land's board before | after, side by side on its backdrop, six lands a sheet:
#   python3 tools/living-fields/pairs.py <before dir> <before tag> <after dir> <after tag> <out prefix>
import sys, glob, os
from PIL import Image, ImageDraw
bd, bt, ad, at, out = sys.argv[1:6]
LANDS = ['highlands', 'forest', 'snow', 'desert', 'volcano', 'dungeon', 'plains', 'autumn', 'swamp', 'graveyard', 'ruins', 'temple', 'crystal', 'forge', 'shrine', 'warcamp', 'oasis']
def board(path):
    im = Image.open(path).convert('RGB')
    return im.crop((0, round(im.height * 0.12), im.width, round(im.height * 0.62)))
cells = []
for land in LANDS:
    after = sorted(p for p in glob.glob(f'{ad}/{at}-{land}-*.png') if not p[:-4].split('-')[-1].isdigit())
    if not after:
        continue
    layout = os.path.basename(after[0])[len(at) + len(land) + 2:-4]
    before = f'{bd}/{bt}-{land}-{layout}.png'
    a, b = board(before), board(after[0])
    cell = Image.new('RGB', (a.width + b.width + 6, a.height + 18), (20, 20, 24))
    cell.paste(a, (0, 18))
    cell.paste(b, (a.width + 6, 18))
    ImageDraw.Draw(cell).text((4, 3), f'{land} ({layout}): before | after', fill=(255, 230, 120))
    cells.append(cell)
for n in range(0, len(cells), 6):
    group = cells[n:n + 6]
    w, h = group[0].size
    sheet = Image.new('RGB', (w * 2 + 8, (h + 8) * ((len(group) + 1) // 2)), (0, 0, 0))
    for i, c in enumerate(group):
        sheet.paste(c, ((i % 2) * (w + 8), (i // 2) * (h + 8)))
    sheet.save(f'{out}-{n // 6 + 1}.jpg', quality=86)
    print(f'{out}-{n // 6 + 1}.jpg', sheet.size)
