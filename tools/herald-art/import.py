"""Pack the approved six sprite-matched herald busts and square face crops."""
from pathlib import Path
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parents[2]
preview=Image.new('RGB',(900,660),'#211c23');draw=ImageDraw.Draw(preview)
for batch,first in [('proposal',1),('final-three',4)]:
 sheet=Image.open(ROOT/f'art-source/herald-portraits/{batch}.png').convert('RGB')
 for col in range(3):
  n=first+col
  panel=sheet.crop((round(col*sheet.width/3),0,round((col+1)*sheet.width/3),sheet.height))
  panel.resize((512,512),Image.Resampling.LANCZOS).save(ROOT/f'src/art/heralds/calBoss{n}.webp',quality=90,method=6)
  # Upper head-and-shoulder square retains helmet horns and distinguishing mushroom caps.
  side=round(min(panel.size)*.78)
  face=panel.crop(((panel.width-side)//2,0,(panel.width+side)//2,side))
  face.resize((256,256),Image.Resampling.LANCZOS).save(ROOT/f'src/art/heralds/calBoss{n}-face.webp',quality=90,method=6)
  x=(n-1)%3*300;y=(n-1)//3*330
  preview.paste(panel.resize((280,280),Image.Resampling.LANCZOS),(x,y))
  draw.text((x+6,y+287),f'calBoss{n}',fill='#ead4aa')
preview.save(ROOT/'docs/samples/herald-art/contact.png')
print('Packed six 512px busts and six 256px face crops.')
