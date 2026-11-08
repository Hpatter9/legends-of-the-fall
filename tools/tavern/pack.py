"""Pack reviewed generated sheets into padded transparent runtime cutouts. No repainting."""
from pathlib import Path
import json
from PIL import Image
import numpy as np
from scipy import ndimage
ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'art-source/tavern'
DEST = ROOT / 'src/art/tavern/guests'
DEST.mkdir(parents=True, exist_ok=True)
manifest = {}
def cut(image, box, name):
    cell = image.crop(box).convert('RGBA')
    # Discard near-invisible alpha noise from source export, retaining painted edges.
    cell.putalpha(cell.getchannel('A').point(lambda a: 0 if a < 16 else a))
    alpha = np.array(cell.getchannel('A'))
    labels, count = ndimage.label(alpha >= 32)
    sizes = np.bincount(labels.ravel()); sizes[0] = 0
    # Keep the painted subject and substantial separate props, discarding sheet specks.
    keep = sizes >= max(64, sizes.max() * .015)
    support = ndimage.binary_dilation(keep[labels], iterations=2)
    alpha[~support] = 0
    cell.putalpha(Image.fromarray(alpha))
    bound = cell.getchannel('A').point(lambda a: 255 if a >= 32 else 0).getbbox()
    if not bound: raise ValueError(f'Empty cutout: {name}')
    cell = cell.crop(bound)
    scale = min(360 / cell.width, 416 / cell.height)
    cell = cell.resize((round(cell.width * scale), round(cell.height * scale)), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (384, 440))
    canvas.alpha_composite(cell, ((384-cell.width)//2, 428-cell.height))
    canvas.save(DEST / f'{name}.webp', quality=92, method=4)
    manifest[name] = {'size': [384, 440], 'sourceBox': list(box), 'opaqueBounds': list(bound)}
for n, heroes in enumerate(json.loads((SOURCE/'guests/batches.json').read_text()), 1):
    filename = f'sheet-{n:02}-clean.png' if n in (3,8) else f'sheet-{n:02}.png'
    image = Image.open(SOURCE/'guests'/filename)
    for i, hero in enumerate(heroes):
        for variant, direction in enumerate(('right','left')):
            col = (i%2)*2+variant; row=i//2
            cut(image, (round(col*image.width/4),round(row*image.height/3),round((col+1)*image.width/4),round((row+1)*image.height/3)), f'{hero}-{direction}')
# Corrected identity: Harrow must remain a skeleton, not a living pirate.
image=Image.open(SOURCE/'guests/dreadPirate-pair.png')
for i, direction in enumerate(('right','left')):
    cut(image,(round(i*image.width/2),0,round((i+1)*image.width/2),image.height),f'dreadPirate-{direction}')
image=Image.open(SOURCE/'tables-source.png')
for i,name in enumerate(('table-rear','table-front')):
    cut(image,(0 if i == 0 else round(image.width*.58),0,round(image.width*.58) if i == 0 else image.width,image.height),name)
Image.open(SOURCE/'cozy-room-source.png').save(ROOT/'src/art/ui/tavern-hearth.png', optimize=True)
(SOURCE/'guests/packed.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(f'Packed {len(manifest)-2} hero variants, two tables and room background')
