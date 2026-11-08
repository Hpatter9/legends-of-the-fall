"""Crop generated trophy sheets; retain full plaques and downsample for the game."""
from pathlib import Path
from PIL import Image, ImageDraw
ROOT = Path(__file__).resolve().parents[2]
BATCHES = {
    'calamity': (2, ['calBoss1', 'calBoss2', 'calBoss3', 'calBoss4', 'calBoss5', 'calBoss6']),
    'champions-1': (2, ['lichKing', 'oniKing', 'demonLord', 'sapphireColossus', 'forgeTitan', 'gorgonQueen']),
    'champions-2': (3, ['orcWarlord', 'minotaurChampion', 'nineTails', 'boneCaptain', 'hornedOgre', 'shamanKing', 'locked']),
}
preview = Image.new('RGB', (900, 680), '#121212')
draw = ImageDraw.Draw(preview)
index = 0
for batch, (rows, names) in BATCHES.items():
    sheet = Image.open(ROOT / f'art-source/trophies/{batch}.png').convert('RGB')
    for i, name in enumerate(names):
        col, row = i % 3, i // 3
        cell = sheet.crop((round(col * sheet.width / 3), round(row * sheet.height / rows),
                           round((col + 1) * sheet.width / 3), round((row + 1) * sheet.height / rows)))
        assert abs(cell.width - cell.height) <= 1
        cell.resize((256, 256), Image.Resampling.LANCZOS).save(
            ROOT / f'src/art/trophies/{name}.webp', quality=90, method=6)
        x, y = index % 6 * 150, index // 6 * 170
        preview.paste(cell.resize((128, 128), Image.Resampling.LANCZOS), (x + 11, y))
        draw.text((x + 4, y + 132), name, fill='#ecd4a5')
        index += 1
preview.save(ROOT / 'docs/samples/trophies/contact.png')
print('Imported 18 trophies and one empty mount.')
