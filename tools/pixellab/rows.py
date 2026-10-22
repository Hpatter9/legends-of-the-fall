# Submit and collect extra PixelLab clips from a picked base frame (used for the Lich King's new walk and hurt rows and the
# treant forms; see docs/notes/hero-art.md). Run from the repo root; scratch frames go in tools/w/ (ignored by git).
#   python3 tools/pixellab/rows.py anim <pick.png> <name> <row> <seed> "<prompt>" [frames]    submit one job (id saved first)
#   python3 tools/pixellab/rows.py collect <name> <row> <seed>                                poll it, save tools/w/anim/<name>_<row>_s<seed>_<n>.png
import sys,os,json,io,base64;sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from api import *
from PIL import Image
W=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))+'/w/'
os.makedirs(W+'anim',exist_ok=True)
cmd=sys.argv[1]
if cmd=='anim':
    pick,name,row,seed,prompt=sys.argv[2:7];n=int(sys.argv[7]) if len(sys.argv)>7 else 4
    img=Image.open(pick).convert('RGBA')
    body={'first_frame':{'type':'base64','base64':b64(img),'format':'png'},'action':prompt,'frame_count':n,'no_background':True,'seed':int(seed)}
    r=post('/animate-with-text-v3',body,W+'job_%s_%s_s%s.json'%(name,row,seed));print(name,row,seed,r['background_job_id'])
elif cmd=='collect':
    name,row,seed=sys.argv[2:5]
    r=poll(json.load(open(W+'job_%s_%s_s%s.json'%(name,row,seed)))['background_job_id']);ims=(r.get('last_response') or {}).get('images',[])
    print(name,row,seed,r['status'],len(ims))
    for i,m in enumerate(ims):Image.open(io.BytesIO(base64.b64decode(m['base64']))).convert('RGBA').save(W+'anim/%s_%s_s%s_%d.png'%(name,row,seed,i))
