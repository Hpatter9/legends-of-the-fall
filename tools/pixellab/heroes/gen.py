# Remakes a hero's art with PixelLab (docs/notes/hero-art.md). Run from the repo root; scratch frames go in tools/w/ (ignored).
#   gen.py base <id> <seed>          submit a base figure (4 candidates), poll, save tools/w/base/<id>_s<seed>_<n>.png (job id saved first)
#   gen.py anim <id> <row,row,..>    submit the clips from tools/w/pick_<id>.png (the picked candidate)
#   gen.py collect <id> <row,row,..> poll them and save the frames to tools/w/anim/<id>_<row>_<n>.png
# then: python3 tools/pixellab/cut.py <id> walk,attack,idle,hurt,dead[,attack2]  and  python3 tools/pixellab/heroes/finish.py <id>
import sys,os,json,io,base64
sys.path.insert(0,os.path.dirname(os.path.dirname(os.path.abspath(__file__))));sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
os.chdir(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
from api import *
from spec import *
from PIL import Image
W='tools/w/';os.makedirs(W+'anim',exist_ok=True);os.makedirs(W+'base',exist_ok=True)
cmd,i=sys.argv[1:3];h=HEROES[i]
def save(r,path):
    ims=(r.get('last_response') or {}).get('images',[])
    for n,m in enumerate(ims):Image.open(io.BytesIO(base64.b64decode(m['base64']))).convert('RGBA').save(path(n))
    return len(ims)
if cmd=='base':
    seed=int(sys.argv[3]);c=h['canvas']
    refs=[ref(r,'idle',c) for r in h['refs']]
    body={'style_images':[{'image':{'type':'base64','base64':b64(r),'format':'png'},'width':c,'height':c} for r in refs],'description':h['desc'],'style_description':SD,'no_background':True,'seed':seed}
    r=post('/generate-with-style-v2',body,W+'base_%s_s%d.json'%(i,seed));print(list(r.keys()))
    job=r.get('background_job_id')
    if job:r=poll(job)
    print(r.get('status'),save(r,lambda n:W+'base/%s_s%d_%d.png'%(i,seed,n)))
elif cmd=='anim':
    # gen.py anim <id> <rows> [seed] [frames]: a hero's own prompt (spec 'anims') beats the shared one
    seed=int(sys.argv[4]) if len(sys.argv)>4 else 7;n=int(sys.argv[5]) if len(sys.argv)>5 else 4
    img=Image.open(W+'pick_%s.png'%i).convert('RGBA')
    for k in sys.argv[3].split(','):
        body={'first_frame':{'type':'base64','base64':b64(img),'format':'png'},'action':h.get('anims',{}).get(k,ANIMS[k]),'frame_count':n,'no_background':True,'seed':seed}
        print(k,post('/animate-with-text-v3',body,W+'job_%s_%s_s%d.json'%(i,k,seed))['background_job_id'])
elif cmd=='collect':
    # gen.py collect <id> <rows> [seed]: frames go to anim/<id>_<row>_s<seed>_<n>.png (use `use` to pick a take)
    seed=int(sys.argv[4]) if len(sys.argv)>4 else 7
    for k in sys.argv[3].split(','):
        r=poll(json.load(open(W+'job_%s_%s_s%d.json'%(i,k,seed)))['background_job_id'])
        print(k,r['status'],save(r,lambda n:W+'anim/%s_%s_s%d_%d.png'%(i,k,seed,n)))
elif cmd=='use':
    # gen.py use <id> <row>=<seed> ...: copy a take to the names cut.py reads
    import shutil,glob
    for a in sys.argv[3:]:
        k,seed=a.split('=');src=k
        if ':' in seed:src,seed=seed.split(':')    # row=otherrow:seed uses another row's take (e.g. attack=attack2:5)
        for f in glob.glob(W+'anim/%s_%s_[0-9]*.png'%(i,k)):os.remove(f)
        for f in glob.glob(W+'anim/%s_%s_s%s_*.png'%(i,src,seed)):shutil.copy(f,W+'anim/%s_%s_%s'%(i,k,f.rsplit('_',1)[1]))
elif cmd=='strip':
    # gen.py strip <id> <row>=<seed> ...: a 3x preview of takes, one row each -> tools/w/strip_<id>.png
    rows=[]
    for a in sys.argv[3:]:
        k,seed=a.split('=');import glob
        rows.append([Image.open(f).convert('RGBA') for f in sorted(glob.glob(W+'anim/%s_%s_s%s_*.png'%(i,k,seed)))])
    w=max(m.width for r in rows for m in r);hh=max(m.height for r in rows for m in r);K=3
    out=Image.new('RGBA',(max(len(r) for r in rows)*w*K,len(rows)*hh*K),(86,108,84,255))
    for y,r in enumerate(rows):
        for x,m in enumerate(r):out.alpha_composite(m.resize((m.width*K,m.height*K),Image.NEAREST),(x*w*K,y*hh*K))
    out.save(W+'strip_%s.png'%i)
