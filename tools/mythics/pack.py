#!/usr/bin/env python3
"""Pack generated pixel-art atlases using the existing hero extraction workflow.
No painting or recolouring: shared nearest-neighbour scale and hard alpha only.
"""
from pathlib import Path
import importlib.util
import json, hashlib
from PIL import Image
ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('hero_pack', ROOT / 'tools/hero-remakes/pack.py')
pack = importlib.util.module_from_spec(spec); spec.loader.exec_module(pack)
DATA = {
 'vael': ('exec-64d5767c-42c8-4ca3-bb4b-636e4698f7c1.png','exec-3a06b216-85a3-4217-b2a7-eddbd235f224.png',96),
 'astrax': ('exec-88f538a5-2796-4f44-80fb-e6cc85aab419.png','exec-36ae4f34-f461-4257-aa51-d5613e516702.png',112),
 'ilyra': ('exec-ce8131cc-6b8f-4ffe-be1b-039ea6af2dd3.png','exec-51408dc9-b238-4082-bc30-76aa59270876.png',96),
 'orrun': ('exec-a09949dd-bf57-42e7-ac87-f67c7f3d7661.png','exec-c0e67485-2938-41f7-8a3c-4b76790d8fd4.png',112),
 'nyxara': ('exec-94e6ad34-3c8e-4fbc-9363-3120007a2d96.png','exec-0fe82707-5323-4721-9aa5-c5b1b0c62dcf.png',96),
}
ROWS = ['idle','walk','_walk','attack','hurt','dead','attack2']
layout_path = ROOT/'src/art/units/sheets.json'
layout = json.loads(layout_path.read_text())
report = {}
lineup = Image.new('RGBA',(1000, 650),(38,40,53,255))
from PIL import ImageDraw
pen = ImageDraw.Draw(lineup)
for index,(hero,(atlas,portrait,figure)) in enumerate(DATA.items()):
 source = ROOT/'art-source/mythics'/f'{hero}-atlas.png'
 if not source.exists(): source.write_bytes((Path('/workspace/generated_images')/atlas).read_bytes())
 original = ROOT/'art-source/mythics'/f'{hero}-portrait.png'
 if not original.exists(): original.write_bytes((Path('/workspace/generated_images')/portrait).read_bytes())
 art = Image.open(original).convert('RGB')
 for suffix in ['', '-portrait']:
  out = art.copy(); out.thumbnail((768,1152) if not suffix else (512,768), Image.Resampling.LANCZOS)
  out.save(ROOT/'src/art/heroes'/f'{hero}{suffix}.webp',quality=87)
 frames = pack.extract(source)
 scale = figure / frames[0]['image'].height
 for frame in frames:
  im = frame['image']; frame['image'] = im.resize((max(1,round(im.width*scale)),max(1,round(im.height*scale))),Image.Resampling.NEAREST)
  frame['offset'] = round(frame['offset']*scale)
 extent = max(max(-f['offset'],f['offset']+f['image'].width) for f in frames)
 w = max(180,2*(extent+10)); h = max(124,max(f['image'].height for f in frames)+14)
 for view in range(2):
  sheet = f'mythic_{hero}'+('_back' if view else '')
  out = Image.new('RGBA',(w*4,h*7))
  for row in range(7):
   for col in range(4):
    f=frames[row*8+view*4+col]; im=f['image']
    out.alpha_composite(im,(col*w+w//2+f['offset'],(row+1)*h-im.height-4))
  out.save(ROOT/'src/art/units'/f'{sheet}.png')
  layout[sheet]={'w':w,'h':h,'figure':figure,'perRow':4,'rows':ROWS,'counts':{'idle':4,'walk':8,'_walk':0,'attack':4,'hurt':4,'dead':4,'attack2':4},'facesRight':True,'lies':True}
  if view==0: layout[sheet]['rear']=sheet+'_back'
  for row,y in [(0,30),(3,190),(5,350),(6,500)]:
   f=frames[row*8+view*4+(3 if row==5 else 0)]['image']
   lineup.alpha_composite(f,(index*200+view*95+45-f.width//2,y+112-f.height))
 pen.text((index*200+10,8),hero,fill='white')
 report[hero]={'source':str(source.relative_to(ROOT)),'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'scale':scale,'cell':[w,h],'figure':figure,'frames':56}
 print(hero,w,h,'56 poses')
layout_path.write_text(json.dumps(layout,indent=1)+'\n')
lineup.convert('RGB').save(ROOT/'docs/samples/mythics/lineup.png')
(ROOT/'docs/samples/mythics/packing.json').write_text(json.dumps(report,indent=2)+'\n')

# Tavern variants use the same component extraction at a firmer alpha threshold
# to exclude the generated export's diffuse shadows between otherwise separate figures.
tavern_source = ROOT/'art-source/mythics/tavern-pairs-clean.png'
if tavern_source.exists():
 frames = pack.extract(tavern_source, 5, 2, alpha_threshold=192)
 for row,kind in enumerate(DATA):
  for col,direction in enumerate(['right','left']):
   im = frames[row*2+col]['image']
   im.thumbnail((360,416), Image.Resampling.LANCZOS)
   canvas = Image.new('RGBA',(384,440))
   canvas.alpha_composite(im,((384-im.width)//2,428-im.height))
   canvas.save(ROOT/f'src/art/tavern/guests/{kind}-{direction}.webp',quality=92)
