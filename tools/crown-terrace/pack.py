"""Pack the retained generated art; no redrawing or colour-key removal.

Run from the repository root: python3 tools/crown-terrace/pack.py.
"""
from pathlib import Path
from PIL import Image
import json

source = Path('art-source/crown-terrace')
target = Path('src/art/crown-terrace')
target.mkdir(parents=True, exist_ok=True)

def save(image, destination, **options):
    # An interrupted pack must leave the previous usable asset intact.
    temporary = destination.with_suffix('.tmp.webp')
    image.save(temporary, **options)
    temporary.replace(destination)

rulers = ['iron_stag', 'sun_viper', 'frost_witch', 'ash_empress', 'rose_duchess', 'moon_oracle', 'storm_corsair', 'gilded_necromancer']
names = ['treasury', 'barracks', 'armoury', 'mageTower', 'stable', 'library', 'chapel', 'smithy', 'watchtower', 'hall', 'drillYard', 'works']
for ruler in rulers:
    if (target / f'{ruler}.webp').exists() and (target / f'{ruler}.webp').stat().st_size > 100 and (target / f'{ruler}.webp').stat().st_mtime >= (source / f'{ruler}.png').stat().st_mtime:
        continue
    image = Image.open(source / f'{ruler}.png').convert('RGB')
    save(image.resize((800, 1200), Image.Resampling.LANCZOS), target / f'{ruler}.webp', quality=88, method=4)
for stage in range(1, 4):
    if all((target / f'{name}-{stage}.webp').exists() and (target / f'{name}-{stage}.webp').stat().st_size > 100 and (target / f'{name}-{stage}.webp').stat().st_mtime >= (source / f'landmarks-{stage}.png').stat().st_mtime for name in names):
        continue
    sheet = Image.open(source / f'landmarks-{stage}.png').convert('RGBA')
    assert sheet.getchannel('A').getextrema()[0] == 0, 'Atlas must have genuine alpha'
    for i, name in enumerate(names):
        col, row = i % 4, i // 4
        cell = sheet.crop((round(col * sheet.width / 4), round(row * sheet.height / 3), round((col + 1) * sheet.width / 4), round((row + 1) * sheet.height / 3)))
        # Remove only transparent margins; preserve the generated alpha, soft shadows and full silhouette.
        bounds = cell.getchannel('A').point(lambda a: 255 if a > 24 else 0).getbbox()
        assert bounds, f'Empty cell: {name}-{stage}'
        cell = cell.crop(bounds)
        cell.thumbnail((320, 300), Image.Resampling.LANCZOS)
        save(cell, target / f'{name}-{stage}.webp', quality=90, method=4)
print('Packed eight courts and 36 transparent landmark/construction sprites.')

def pack_character(sheet, cell, name, size):
    col, row = cell % 4, cell // 4
    image = sheet.crop((col * sheet.width // 4, row * sheet.height // 2, (col + 1) * sheet.width // 4, (row + 1) * sheet.height // 2))
    assert image.mode == 'RGBA' and image.getchannel('A').getextrema()[0] == 0, f'{name} needs alpha'
    bounds = image.getchannel('A').point(lambda a: 255 if a > 24 else 0).getbbox()
    assert bounds, f'{name} is empty'
    image = image.crop(bounds)
    image.thumbnail(size, Image.Resampling.LANCZOS)
    save(image, target / f'{name}.webp', quality=92, method=4)

roster = json.loads((source / 'hero-roster.json').read_text())
for i, hero in enumerate(roster):
    sheet = Image.open(source / f'heroes-{i // 8 + 1}.png').convert('RGBA')
    pack_character(sheet, i % 8, f'hero-{hero["kind"]}', (320, 480))
sheet = Image.open(source / 'rulers.png').convert('RGBA')
for i, ruler in enumerate(rulers):
    pack_character(sheet, i, f'ruler-{ruler}', (360, 480))
# Keep one common coordinate frame for Duchess's animation: only the common transparent gutter is removed.
sheet = Image.open(source / 'duchess.png').convert('RGBA')
for i in range(8):
    col, row = i % 4, i // 4
    image = sheet.crop((col * sheet.width // 4, row * sheet.height // 2, (col + 1) * sheet.width // 4, (row + 1) * sheet.height // 2))
    save(image.resize((192,256),Image.Resampling.LANCZOS), target / f'duchess-{i}.webp',quality=92,method=4)
print(f'Packed {len(roster)} painted court companions, eight rulers and eight Duchess poses.')
