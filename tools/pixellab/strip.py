# Sample sheet: the last dead frame of every generated sheet, 1:1 above 2x, on the grass-green board colour.
import json
from PIL import Image
D='src/art/units/'
d=json.load(open(D+'sheets.json'))
fr=[]
for k,e in d.items():
    if not((k.startswith('cls_') and k!='cls_treant') or k.startswith('hk_')):continue
    im=Image.open(D+k+'.png');w,h=e['w'],e['h'];ri=e['rows'].index('dead');n=e['counts']['dead']
    fr.append(im.crop(((n-1)*w,ri*h,n*w,(ri+1)*h)))
def strip(s,perrow):
    rows=[fr[i:i+perrow] for i in range(0,len(fr),perrow)];W=max(sum(f.width*s for f in r) for r in rows);H=sum(max(f.height for f in r)*s for r in rows)
    out=Image.new('RGBA',(W,H),(86,108,84,255));y=0
    for r in rows:
        x=0;rh=max(f.height for f in r)*s
        for f in r:
            g=f.resize((f.width*s,f.height*s),Image.NEAREST);out.alpha_composite(g,(x,y+rh-g.height));x+=g.width
        y+=rh
    return out
if __name__=='__main__':
    strip(1,9).save('docs/samples/death-frames.png')
