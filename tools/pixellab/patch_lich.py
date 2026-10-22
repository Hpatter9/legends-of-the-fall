# Gives the Lich King a new walk row and a hurt row from the clips in tools/w/anim (see docs/notes/hero-art.md). Run from the repo root
# after rows.py: python3 tools/pixellab/patch_lich.py <walk-prefix> <hurt-prefix>   (e.g. lich_walk_s3 lich_hurt_s7).
# The frames are moved (never resampled) so the figure stands where the old idle figure does; alpha is made hard like cut.py.
import sys,os,json;sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from PIL import Image
from cut import clean
A='tools/w/anim/';D='src/art/units/'
walk,hurt=sys.argv[1:3]
d=json.load(open(D+'sheets.json'));e=d['lich_king'];im=Image.open(D+'lich_king.png').convert('RGBA');w,h=e['w'],e['h'];rows=e['rows']
cell=lambda r,i:im.crop((i*w,rows.index(r)*h,(i+1)*w,(rows.index(r)+1)*h))
b1=cell('idle',0).getbbox();b2=Image.open('tools/w/pick_lich_king.png').getbbox()
dx,dy=b1[0]-b2[0],b1[3]-b2[3]
def frames(prefix,idx):
    out=[]
    for k in idx:
        f,_=clean(Image.open('%s%s_%d.png'%(A,prefix,k)));c=Image.new('RGBA',(w,h));c.paste(f,(dx,dy));out.append(c)
    return out
new={'walk':frames(walk,range(5)),'hurt':frames(hurt,range(1,5))}
order=['walk','attack','idle','hurt','dead','attack2'];per=e['perRow']
out=Image.new('RGBA',(w*per,h*len(order)))
for ri,r in enumerate(order):
    fs=new[r] if r in new else [cell(r,i) for i in range(e['counts'][r])]
    for i,f in enumerate(fs):out.paste(f,(i*w,ri*h))
    e['counts'][r]=len(fs)
e['rows']=order;out.save(D+'lich_king.png');json.dump(d,open(D+'sheets.json','w'),indent=1);print(e)
