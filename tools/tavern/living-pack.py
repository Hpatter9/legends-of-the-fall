"""Cut generated living-tavern sheets into padded runtime layers; retain originals."""
from pathlib import Path
import json
import sys
from shutil import copyfile
from PIL import Image
import numpy as np
from scipy import ndimage
ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'art-source/tavern/living'
DEST = ROOT / 'src/art/tavern/guests'
DEST.mkdir(parents=True, exist_ok=True)
manifest = {}
def cut(image, box, name):
    cell = image.crop(box).convert('RGBA')
    alpha = np.array(cell.getchannel('A'))
    alpha[alpha < 16] = 0
    labels, _ = ndimage.label(alpha >= 32)
    sizes = np.bincount(labels.ravel()); sizes[0] = 0
    # Small detached dice, coins and pebbles are part of these activities.
    keep = sizes >= 48
    support = ndimage.binary_dilation(keep[labels], iterations=2)
    alpha[~support] = 0
    cell.putalpha(Image.fromarray(alpha))
    bound = cell.getchannel('A').getbbox()
    if not bound: raise ValueError(name)
    cell = cell.crop(bound)
    scale = min(360 / cell.width, 416 / cell.height)
    cell = cell.resize((round(cell.width * scale), round(cell.height * scale)), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (384, 440))
    canvas.alpha_composite(cell, ((384-cell.width)//2, 428-cell.height))
    canvas.save(DEST / f'{name}.webp', quality=92, method=4)
    manifest[name] = {'size': [384, 440], 'sourceBox': list(box), 'opaqueBounds': list(bound)}
for n, heroes in enumerate(json.loads((ROOT/'art-source/tavern/guests/batches.json').read_text()), 1):
    path = SOURCE / f'sheet-{n:02}.png'
    if '--partial' in sys.argv and not path.exists(): continue
    image = Image.open(path)
    for i, hero in enumerate(heroes):
        col = i%3; row=i//3
        cut(image, (round(col*image.width/3),round(row*image.height/2),round((col+1)*image.width/3),round((row+1)*image.height/2)), f'{hero}-activity')
image = Image.open(SOURCE / 'gwen-tables.png')
cut(image, (0, 0, image.width//2, image.height), 'living-gwen')
cut(image, (image.width//2, 0, image.width, image.height//2), 'living-table-dice')
cut(image, (image.width//2, image.height//2, image.width, image.height), 'living-table-supper')
Image.open(SOURCE/'room.png').save(ROOT/'src/art/ui/tavern-hearth.png', optimize=True)
(SOURCE/'packed.json').write_text(json.dumps(manifest, indent=2)+'\n')
print(f'Packed {len(manifest)} living tavern layers')

# Reuse the existing credited painted dice rather than drawing replacement pixels.
for face in (3, 5):
    copyfile(ROOT/f'src/art/ult-show/buccaneer-die-face-{face}.webp', DEST/f'living-die-{face}.webp')
