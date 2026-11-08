"""Crop approved scene sheets into landscape encounter vignettes."""
from pathlib import Path
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parents[2]
BATCHES={
 'approved-proposal': ['pact','temper','refugees'],
 'road-people': ['scout','deserters','cardsharp'],
 'healer-crown': ['healer','crown'],
}
preview=Image.new('RGB',(800,520),'#182019');draw=ImageDraw.Draw(preview)
index=0
for batch,names in BATCHES.items():
 sheet=Image.open(ROOT/f'art-source/road-encounters/{batch}.png').convert('RGB')
 for row,name in enumerate(names):
  panel=sheet.crop((0,round(row*sheet.height/len(names)),sheet.width,round((row+1)*sheet.height/len(names))))
  # Crop the wide panels centrally to 16:9 without trimming the top of a figure.
  w=round(panel.height*16/9)
  assert w<=panel.width
  panel=panel.crop(((panel.width-w)//2,0,(panel.width+w)//2,panel.height))
  panel=panel.resize((768,432),Image.Resampling.LANCZOS)
  panel.save(ROOT/f'src/art/road-encounters/{name}.webp',quality=88,method=6)
  x,y=index%3*266,index//3*173
  preview.paste(panel.resize((256,144),Image.Resampling.LANCZOS),(x,y))
  draw.text((x+4,y+148),name,fill='#ecd8b3')
  index+=1
preview.save(ROOT/'docs/samples/road-art/contact.png')
print('Packed eight 768×432 painted road scenes.')
