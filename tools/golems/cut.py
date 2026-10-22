# Cuts the Golems pack (hpatter9/chronos-assets, "Golems and elementals (pack by batareya)": 64x96 still figures) into the
# game's sheet layout. The pack has no animation, so each row is the still figure moved by whole pixels (a sway, a stomp, a lean
# into the blow, a slump) and the last dead frame is the figure turned exactly 90 degrees: nothing is resampled, so it stays crisp.
# Run from the repo root: python3 tools/golems/cut.py ../chronos-assets   (rewrites the golem_* sheets and their sheets.json entries)
import json,sys
from PIL import Image
SRC=(sys.argv[1] if len(sys.argv)>1 else '../chronos-assets')+'/Golems and elementals (pack by batareya)/'
D='src/art/units/'
PICK={'golem_stone':6,'golem_crystal':20,'golem_iron':18,'golem_magma':27,'golem_sapphire':32,'golem_forge':15}
W,H,PER=96,120,6
ROWS=['walk','attack','idle','hurt','dead']
COUNTS={'walk':6,'attack':5,'idle':4,'hurt':2,'dead':5}
def hard(im):
    im=im.convert('RGBA');px=im.load()
    for y in range(im.height):
        for x in range(im.width):
            r,g,b,a=px[x,y];px[x,y]=(r,g,b,255) if a>=128 else (0,0,0,0)
    return im
def pose(fig,top_dx=0,dx=0,dy=0,sag=0):
    """The figure on a cell, feet on the ground line: the upper 40% moved sideways by top_dx (and down by sag), all of it by dx, dy."""
    cell=Image.new('RGBA',(W,H));bb=fig.getbbox();fig=fig.crop(bb);cut=int(fig.height*0.4)
    x=(W-fig.width)//2+dx;y=H-6-fig.height+dy
    cell.alpha_composite(fig.crop((0,cut,fig.width,fig.height)),(x,y+cut))
    cell.alpha_composite(fig.crop((0,0,fig.width,cut)),(x+top_dx,y+sag))
    return cell
def sheet(fig):
    f=[]
    walk=[(-1,0,0,0),(-1,0,-2,0),(0,0,-3,0),(1,0,0,0),(1,0,-2,0),(0,0,-3,0)]
    f.append([pose(fig,t,d,y) for t,d,y,_ in walk])
    atk=[(-4,-2,-1,0),(-6,-3,-2,0),(10,6,1,0),(8,6,0,0),(3,2,0,0)]
    f.append([pose(fig,t,d,y) for t,d,y,_ in atk])
    f.append([pose(fig,t,0,0) for t in (0,1,0,-1)])
    f.append([pose(fig,-5,-3,0),pose(fig,-2,-2,0)])
    dead=[pose(fig,-6,-2,0),pose(fig,-12,-4,1,1),pose(fig,-18,-6,3,4),pose(fig,-22,-8,6,9)]
    lie=fig.crop(fig.getbbox()).rotate(90,expand=True);c=Image.new('RGBA',(W,H))
    c.alpha_composite(lie,((W-lie.width)//2,H-6-lie.height));dead.append(c)
    f.append(dead)
    out=Image.new('RGBA',(W*PER,H*len(ROWS)))
    for r,row in enumerate(f):
        for i,fr in enumerate(row):out.alpha_composite(fr,(i*W,r*H))
    return out,max(fig.getbbox()[3]-fig.getbbox()[1],1)
d=json.load(open(D+'sheets.json'))
for name,n in PICK.items():
    im,figh=sheet(hard(Image.open(SRC+'%d.png'%n)))
    im.save(D+name+'.png')
    d[name]={'w':W,'h':H,'perRow':PER,'rows':ROWS,'counts':COUNTS,'figure':figh,'facesRight':True,'lies':True}
    print(name,n,figh)
json.dump(d,open(D+'sheets.json','w'),indent=1)
