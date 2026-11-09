#!/usr/bin/env python3
"""Append the approved Bloodtusk finishing art to the existing atlas.

Keeps the PR #495 atlas above its finishing strip, so reruns never accumulate copies. Source sheets
have unequal painted rows; these measured cuts preserve complete tools and feet.
This only trims and scales supplied artwork; it does not paint replacements.
"""
from pathlib import Path
import re
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
atlas_path = 'src/art/assault/orc/sprites.webp'
meta_path = 'src/render/assaultOrcAtlas.ts'
original = Image.open(ROOT / atlas_path).convert('RGBA')
base = original.crop((0, 0, original.width, 928))
meta = (ROOT / meta_path).read_text()
pieces = []


def cut(sheet, name, box, width=None, factor=None, foot=None, fp=(1, 1)):
    image = sheet.crop(box)
    a = np.array(image)
    a[a[:, :, 3] < 24] = 0
    image = Image.fromarray(a)
    bounds = image.getchannel('A').point(lambda n: 255 if n > 80 else 0).getbbox()
    if not bounds:
        raise ValueError(name)
    image = image.crop(bounds)
    factor = factor or width / image.width
    size = (round(image.width * factor), round(image.height * factor))
    image = image.resize(size, Image.Resampling.BOX)
    if foot:
        anchor = ((foot[0] - bounds[0]) * factor, (foot[1] - bounds[1]) * factor)
    else:
        anchor = (size[0] / 2, size[1] * .75)
    pieces.append((name, image, anchor, fp))


source = ROOT / 'art-source/assault/orc'
workers = Image.open(source / 'orc-camp-workers.png').convert('RGBA')
for row, (job, y0, y1, foot_y) in enumerate([
    ('smith', 0, 333, 319), ('woodcutter', 333, 681, 663), ('butcher', 681, 1024, 1009)
]):
    for col in range(4):
        cut(workers, f'worker{job.title()}{col}', (col * 384, y0, (col + 1) * 384, y1),
            factor=.155, foot=(200, foot_y - y0))

details = Image.open(source / 'orc-warcamp-details.png').convert('RGBA')
for col in range(4):
    cut(details, f'palisadeWeathered{col}', (col * 384, 0, (col + 1) * 384, 475), width=38, foot=(192, 367))
for col, (name, width) in enumerate([('ridgeScree', 58), ('ridgeRoots', 55), ('foundationFoot', 46), ('wornDoorstep', 66)]):
    cut(details, name, (col * 384, 475, (col + 1) * 384, 697), width=width)
for col, (name, width, fp) in enumerate([
    ('siegeAssembly', 118, (2, 2)), ('ridgeRockfall', 54, (1, 1)),
    ('rootApron', 48, (1, 1)), ('foundationPosts', 44, (1, 1))
]):
    cut(details, name, (col * 384, 697, (col + 1) * 384, 1024), width=width, fp=fp)

height = max(image.height for _, image, _, _ in pieces) + 4
names = {name for name, *_ in pieces}
for name, y in re.findall(r'  (\w+): \{ r: \[\d+, (\d+),', meta):
    if int(y) >= base.height and name not in names:
        raise ValueError(f'Another atlas extension follows the original art: {name}; repack together rather than overwrite it')
meta = '\n'.join(line for line in meta.split('\n') if not any(line.startswith(f'  {name}:') for name in names))
result = Image.new('RGBA', (base.width, base.height + height))
result.paste(base, (0, 0))
x, y = 2, base.height + 2
lines = []
for name, image, foot, fp in pieces:
    result.paste(image, (x, y))
    lines.append(f'  {name}: {{ r: [{x}, {y}, {image.width}, {image.height}], foot: [{foot[0]:.2f}, {foot[1]:.2f}], fp: [{fp[0]}, {fp[1]}] }},')
    x += image.width + 3
assert x < base.width, 'Finishing strip needs another shelf'
result.save(ROOT / atlas_path, lossless=True)
notice = '// Bloodtusk finishing strip appended by tools/assault/pack-warcamp.py.'
if notice not in meta:
    meta = meta.replace('do not edit by hand.', 'do not edit by hand.\n' + notice)
meta = re.sub(r'(export const SPRITES_SIZE: \[number, number\] = )\[\d+, \d+\];',
              rf'\g<1>[{result.width}, {result.height}];', meta)
start = meta.index('\n', meta.index('export const SPRITES:'))
meta = meta[:start + 1] + '\n'.join(lines) + '\n' + meta[start + 1:]
(ROOT / meta_path).write_text(meta)
print(f'Packed {len(pieces)} pieces into {result.size}; finishing strip width {x}')
