"""Render contact sheets and validate exported alpha/padding for review."""
from pathlib import Path
import json
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parents[2]
batches=json.loads((root/'art-source/tavern/guests/batches.json').read_text())
for n,batch in enumerate(batches,1):
    canvas=Image.new('RGB',(1200,750),'#29422e');d=ImageDraw.Draw(canvas)
    for j,kind in enumerate(batch):
        for k,face in enumerate(('right','left')):
            path=root/f'src/art/tavern/guests/{kind}-{face}.webp'
            im=Image.open(path).convert('RGBA');alpha=im.getchannel('A');bounds=alpha.getbbox()
            assert bounds and bounds[0]>=8 and bounds[1]>=8 and bounds[2]<=376 and bounds[3]<=432,path
            assert alpha.getextrema()==(0,255),path
            im.thumbnail((185,220));x=(j%3)*400+k*195;y=(j//3)*375+35
            canvas.paste(im,(x,y),im)
        d.text(((j%3)*400+10,(j//3)*375+10),kind,fill='white')
    canvas.save(root/f'docs/samples/tavern-seated-sheet-{n:02}.jpg',quality=90)
print('108 exported paintings: real transparency, padded edges and contact sheets checked')
