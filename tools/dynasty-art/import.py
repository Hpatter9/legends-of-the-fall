"""Import the Houses' and Council's backdrops and the House and heirloom paintings (the symbols: tools/art-wire-5/import-expansion.py)."""
from pathlib import Path
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'src/art/dynasty'
# (the season, fate and trait symbols are cut by tools/art-wire-5/import-expansion.py since the repainted sheets, at the sizes drawn)
NAMES=['spring','summer','autumn','winter','mentor','regular','shade','fallen','legend']
for name in ['houses','council']:
    im=Image.open(ROOT/f'art-source/expansion/{name}-backdrop.png').convert('RGB')
    im.thumbnail((768,1152),Image.Resampling.LANCZOS)
    im.save(OUT/f'{name}-backdrop.webp',quality=86,method=6)
sheet=Image.open(ROOT/'art-source/dynasty-finish/house-heirloom.png').convert('RGB')
assert sheet.width==sheet.height*2
for i,name in enumerate(['house','heirloom']):
    size=sheet.height
    tile=sheet.crop((i*size+8,8,(i+1)*size-8,size-8))
    tile.resize((256,256),Image.Resampling.LANCZOS).save(OUT/f'{name}.webp',quality=90,method=6)
preview=Image.new('RGB',(880,300),'#201b22');draw=ImageDraw.Draw(preview)
for i,name in enumerate(NAMES+['house','heirloom']):
    im=Image.open(OUT/f'{name}.{"webp" if name in ["house","heirloom"] else "png"}').convert('RGBA')
    x=i%6*145;y=i//6*150
    im=im.resize((96,96),Image.Resampling.LANCZOS)
    preview.paste(im,(x,y),im);draw.text((x,y+100),name,fill='#e4d1ad')
preview.save(ROOT/'docs/samples/dynasty-art/contact.png')
print('Imported 2 backdrops and 2 paintings (and previewed the season and fate symbols).')
