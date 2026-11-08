"""Import approved dynasty assets and original Nemesis trait cels."""
from pathlib import Path
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'src/art/dynasty'
NAMES=['spring','summer','autumn','winter','mentor','regular','shade','fallen','legend']
sheet=Image.open(ROOT/'art-source/expansion/seasons-fates.png').convert('RGBA')
assert sheet.size==(1152,256)
for i,name in enumerate(NAMES):
    tile=sheet.crop((i*128,0,(i+1)*128,128))
    assert tile.getbbox()
    tile.save(OUT/f'{name}.png',optimize=True)
traits=['ironSkull','arrowCatcher','scarred','sureFooted','spellScorned','hornDeaf','survivor','healerHunter','executioner','ambusher','hillKing','loneWolf']
sheet=Image.open(ROOT/'art-source/expansion/nemesis-icons.png').convert('RGBA')
for i,name in enumerate(traits):
    tile=sheet.crop((i*128,0,(i+1)*128,128))
    assert tile.getbbox()
    tile.save(OUT/f'trait-{name}.png',optimize=True)
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
print('Imported 9 season/fate symbols, 12 trait icons, 2 backdrops and 2 new paintings.')
