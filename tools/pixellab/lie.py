# Gives every generated sheet (cls_* heroes, hk_* foes) a death that ends fully fallen. The last dead frame is the idle
# figure turned exactly 90 degrees (head to the left, so it falls backwards): a lossless pixel move, so the art stays crisp.
# It sits on the ground line, centred on the idle figure. Sheets are only padded wider (never resampled) if it does not fit.
# Run from the repo root; safe to run twice (sheets.json gets "lies": true).
import json,sys
from PIL import Image
D='src/art/units/'
d=json.load(open(D+'sheets.json'))
for k,e in d.items():
    if not(k.startswith('cls_') or k.startswith('hk_') or k in('lich_king','oni_king')) or e.get('lies'):continue
    im=Image.open(D+k+'.png').convert('RGBA');w,h=e['w'],e['h'];rows=e['rows'];per=e['perRow']
    cell=lambda r,i:im.crop((i*w,rows.index(r)*h,(i+1)*w,(rows.index(r)+1)*h))
    idle=cell('idle',0);b=idle.getbbox();cx=(b[0]+b[2])/2
    lie=idle.crop(b).rotate(90,expand=True)
    n=e['counts']['dead'];assert n<per,k
    nw=max(w,lie.width+4+(w%2)) ;nw+=nw%2-w%2   # keep the width parity so the centre stays a pixel
    pad=(nw-w)//2
    out=Image.new('RGBA',(nw*per,h*len(rows)))
    for ri,r in enumerate(rows):
        for i in range(e['counts'][r]):out.paste(cell(r,i),(i*nw+pad,ri*h))
    ground=max(cell('dead',i).getbbox()[3] for i in range(n))
    x=int(round(cx))-lie.width//2+pad;x=min(max(x,2),nw-lie.width-2)+n*nw
    out.paste(lie,(x,rows.index('dead')*h+ground-lie.height))
    e['counts']['dead']=n+1;e['w']=nw;e['lies']=True
    out.save(D+k+'.png');print(k,w,'->',nw,'lie',lie.size)
json.dump(d,open(D+'sheets.json','w'),indent=1)
