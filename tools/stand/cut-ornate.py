"""Cut the approved production atlases into bundled Last Stand sprites and materials.

This only extracts, trims transparency and downsamples; the source artwork is retained.
Run from the repository root with Pillow installed.
"""
from pathlib import Path
from PIL import Image

out = Path('src/art/stand/ornate')
out.mkdir(parents=True, exist_ok=True)
props = Image.open('tools/stand/generated/ornate-props.png').convert('RGBA')
names = [('column',180), ('window',152), ('bookcase',132), ('brazier',104), ('fountain',138), ('arcade',156), ('desk',86), ('rubble',64), ('medallion',256)]
for i, (name, height) in enumerate(names):
    x, y = i % 3, i // 3
    box = (round(x * props.width / 3) + 3, round(y * props.height / 3) + 3,
           round((x + 1) * props.width / 3) - 3, round((y + 1) * props.height / 3) - 3)
    sprite = props.crop(box)
    bounds = sprite.getchannel('A').getbbox()
    assert bounds, name
    sprite = sprite.crop(bounds)
    sprite = sprite.resize((round(sprite.width * height / sprite.height), height), Image.Resampling.LANCZOS)
    sprite.save(out / f'{name}.png', optimize=True)
materials = Image.open('tools/stand/generated/ornate-materials.png').convert('RGB')
for i, name in enumerate(['limestone', 'velvet', 'masonry', 'paving']):
    x, y = i % 2, i // 2
    tile = materials.crop((x * materials.width // 2, y * materials.height // 2,
                           (x + 1) * materials.width // 2, (y + 1) * materials.height // 2))
    tile.resize((128, 128), Image.Resampling.LANCZOS).save(out / f'{name}.png', optimize=True)
print('Cut nine sprites and four materials.')
