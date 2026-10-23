# Hero walk and hurt polish (docs/notes/art-cleanup.md). Run from the repo root.
#   polish.py gen <id>          two takes (seeds 3 and 5) of walk (8 frames) and hurt (6) from the hero's current idle frame -> tools/w/pol/
#   polish.py patch <id> <walk seed> <hurt seed>   swaps the two rows into src/art/units/hero_<id>.png (moved, never resampled, hard alpha)
# The base figure is never changed: the first frame given to the animator is the sheet's own idle frame.
import sys,os,json,io,base64,glob
sys.path.insert(0,os.path.dirname(os.path.dirname(os.path.abspath(__file__))));sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
os.chdir(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
from api import *
from spec import HEROES
from cut import clean
from PIL import Image
P='tools/w/pol/';os.makedirs(P,exist_ok=True);D='src/art/units/'
WALK='walk cycle: exaggerated stride walking to the right, the front leg stepping far forward and the back leg pushed far behind, knees bending, torso bobbing up and down, arms swinging, clear alternating steps in every frame'
HURT='hit hard: the whole body jolts backwards, head snapping back, knees buckling, arms flung out, staggering a step back, then straightening up'
WALKS={'lancer':'the armoured warhorse trotting to the right with big clear alternating steps of its four legs, the rider bobbing in the saddle, lance carried upright',
 'mummy':'walk cycle: shambling to the right with stiff exaggerated alternating steps, arms hanging, trailing bandages swaying, body bobbing',
 'shambler':'walk cycle: lurching to the right with exaggerated dragging alternating steps, arms hanging forward, body swaying side to side and bobbing',
 'dragoon':'walk cycle: marching to the right in exaggerated alternating strides, lance upright, wings fluttering, body bobbing',
 'kraken_mate':'walk cycle: striding to the right with exaggerated alternating steps, tentacle beard swaying, harpoon carried, body bobbing'}
i=sys.argv[2];h=HEROES[i];sheet='hero_'+i
if sys.argv[1]=='gen':
    img=ref(sheet,'idle',h['canvas']);img.save(P+'pick_%s.png'%i)
    for seed in(3,5):
        for row,act,n in(('walk',WALKS.get(i,WALK),8),('hurt',HURT,6)):
            jf=P+'job_%s_%s_s%d.json'%(i,row,seed)
            if not os.path.exists(jf):post('/animate-with-text-v3',{'first_frame':{'type':'base64','base64':b64(img),'format':'png'},'action':act,'frame_count':n,'no_background':True,'seed':seed},jf)
    for seed in(3,5):
        for row in('walk','hurt'):
            r=poll(json.load(open(P+'job_%s_%s_s%d.json'%(i,row,seed)))['background_job_id'])
            for n,m in enumerate((r.get('last_response') or {}).get('images',[])):Image.open(io.BytesIO(base64.b64decode(m['base64']))).convert('RGBA').save(P+'%s_%s_s%d_%d.png'%(i,row,seed,n))
            print(i,row,seed,r['status'])
elif sys.argv[1]=='patch':
    ws,hs=sys.argv[3:5]
    d=json.load(open(D+'sheets.json'));e=d[sheet];im=Image.open(D+sheet+'.png').convert('RGBA');w,hh=e['w'],e['h'];rows=e['rows'];per=e['perRow']
    cell=lambda r,k:im.crop((k*w,rows.index(r)*hh,(k+1)*w,(rows.index(r)+1)*hh))
    b1=cell('idle',0).getbbox();b2=Image.open(P+'pick_%s.png'%i).getbbox();dx,dy=b1[0]-b2[0],b1[3]-b2[3]   # where the old idle figure stands
    def load(row,seed,idx):return [clean(Image.open(P+'%s_%s_s%s_%d.png'%(i,row,seed,k)))[0] for k in idx]
    new={'walk':load('walk',ws,range(8)),'hurt':load('hurt',hs,[1,3,5])}
    # room: the cell grows (padded evenly, parity kept) if a stride or recoil leaves it; never below the old size
    need_l=need_r=need_t=0
    for fs in new.values():
        for f in fs:
            bb=f.getbbox()
            if bb:need_l=max(need_l,-(bb[0]+dx));need_r=max(need_r,bb[2]+dx-w);need_t=max(need_t,-(bb[1]+dy))
    pad=max(need_l,need_r,0)+(2 if max(need_l,need_r)>0 else 0);nw=w+2*pad;nh=hh+max(need_t,0)+(2 if need_t>0 else 0);oy=nh-hh
    out=Image.new('RGBA',(nw*8,nh*len(rows)));counts=dict(e['counts'])
    for ri,r in enumerate(rows):
        fs=new.get(r)
        if fs is not None:
            cells=[]
            for f in fs:
                c=Image.new('RGBA',(nw,nh));big=Image.new('RGBA',(f.width+2*(abs(dx)+nw),f.height+2*(abs(dy)+nh)));big.paste(f,(abs(dx)+nw,abs(dy)+nh))
                c=big.crop((abs(dx)+nw-dx-pad,abs(dy)+nh-dy-oy,abs(dx)+nw-dx-pad+nw,abs(dy)+nh-dy-oy+nh));cells.append(c)
            counts[r]=len(cells)
        else:
            cells=[]
            for k in range(e['counts'][r]):
                c=Image.new('RGBA',(nw,nh));c.paste(cell(r,k),(pad,oy));cells.append(c)
        for k,c in enumerate(cells):out.paste(c,(k*nw,ri*nh))
    e.update(w=nw,h=nh,perRow=8,counts=counts);out.save(D+sheet+'.png');json.dump(d,open(D+'sheets.json','w'),indent=1);print(i,w,hh,'->',nw,nh,counts)
