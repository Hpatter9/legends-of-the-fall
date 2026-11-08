"""Import approved Council symbols without repainting the existing source sheet."""
from pathlib import Path
from PIL import Image, ImageDraw
ROOT = Path(__file__).resolve().parents[2]
CELLS = {'slain': 0, 'recruit': 12, 'promotion': 13, 'feud': 14, 'betrayal': 15,
         'feast': 16, 'trial': 17, 'oath': 18, 'desertion': 19, 'fled': 20,
         'cheated': 21, 'humiliated': 24, 'vengeance': 25, 'reclaimed': 26,
         'duel': 28, 'token': 29}
out = ROOT / 'src/art/council'
out.mkdir(exist_ok=True)
sheet = Image.open(ROOT / 'art-source/expansion/nemesis-icons.png').convert('RGBA')
assert sheet.size == (1536, 640)
preview = Image.new('RGB', (640, 280), '#211c24')
draw = ImageDraw.Draw(preview)
for i, (name, cell) in enumerate(CELLS.items()):
    x, y = cell % 12 * 128, cell // 12 * 128
    tile = sheet.crop((x, y, x+128, y+128))
    assert tile.getbbox() is not None
    tile.save(out / f'{name}.png', optimize=True)
    x, y = i % 8 * 80, i // 8 * 140
    preview.paste(tile.resize((64,64), Image.Resampling.NEAREST), (x+8,y), tile.resize((64,64), Image.Resampling.NEAREST))
    tiny = tile.resize((24,24), Image.Resampling.NEAREST)
    preview.paste(tiny,(x+28,y+68),tiny)
    draw.text((x+2,y+100),name,fill='#efdbb6')
preview.save(ROOT / 'docs/samples/council-art/icons.png')
manuscript = Image.open(ROOT / 'art-source/council-manuscript/manuscript.png').convert('RGB')
manuscript.resize((256,256), Image.Resampling.LANCZOS).save(ROOT / 'src/art/quests/lost-face.png', optimize=True)
print('Imported 16 Council symbols and the painted manuscript.')
