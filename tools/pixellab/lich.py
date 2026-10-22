# The Lich King's art, step by step (the steps that made src/art/units/lich_king.png; see docs/notes/armies.md).
# Run from the repo root with a scratch folder tools/w/ (w/anim/ for the frames); each job id is saved before it is polled.
#   python3 tools/pixellab/lich.py base 11          4 candidates at 128 px (pick one by eye: copy it to tools/w/pick_lich.png)
#   python3 tools/pixellab/lich.py anim idle walk attack attack2 dead     submit the animation jobs (a job file per row)
#   python3 tools/pixellab/lich.py collect idle walk attack attack2 dead  poll them and save the frames to w/anim/lich_<row>_<n>.png
#   python3 tools/pixellab/cut.py lich walk,attack,idle,dead,attack2      cut the sheet (tools/w/out_lich.png), then lie.py
import sys,os,json,io,base64;sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from api import *
from PIL import Image
W=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))+'/w/'
os.makedirs(W+'anim',exist_ok=True)
SD='side-view pixel art, crisp single pixels, dark outlines, muted dark-fantasy palette, adult proportions'
DESC='BOSS skeletal Lich King, a tall undead skeleton in a jagged iron crown and tattered dark purple-black robes with a high collar, gripping a tall bone staff topped with a glowing cold blue soul flame, blue fire in the eye sockets, menacing, side view facing right, standing idle, full body, fills the canvas'
ANIMS={'idle':'standing idle, skeletal robes and tattered cloak swaying gently, blue soul flame flickering, staying in place, facing right',
 'walk':'striding forward to the right with long clear steps, one leg then the other, body swaying, cloak and robes billowing behind, staff swinging with each step',
 'attack':'attacking with a strong swing of the bone staff to the right, then recovering',
 'attack2':'casting a spell: lifting the staff high overhead in both hands, cold blue soul fire swirling up around the staff and the skeletal hands, then bringing the staff forward',
 'dead':'dying: struck and knocked backwards, body toppling over backwards, crown tumbling off, falling flat onto the back and lying still on the ground'}
cmd=sys.argv[1]
if cmd=='base':
    refs=[ref('minotaur_1','idle',128),ref('samurai_commander','idle',128),ref('skeleton_warrior','idle',128)]
    body={'style_images':[{'image':{'type':'base64','base64':b64(r),'format':'png'},'width':128,'height':128} for r in refs],'description':DESC,'style_description':SD,'no_background':True,'seed':int(sys.argv[2])}
    print(post('/generate-with-style-v2',body,W+'base_job.json'))
elif cmd=='anim':
    img=Image.open(W+'pick_lich.png').convert('RGBA')
    for k in sys.argv[2:]:
        body={'first_frame':{'type':'base64','base64':b64(img),'format':'png'},'action':ANIMS[k],'frame_count':4,'no_background':True,'seed':7}
        print(k,post('/animate-with-text-v3',body,W+'job_%s.json'%k)['background_job_id'])
elif cmd=='collect':
    for k in sys.argv[2:]:
        r=poll(json.load(open(W+'job_%s.json'%k))['background_job_id']);ims=(r.get('last_response') or {}).get('images',[])
        print(k,r['status'],len(ims))
        for i,m in enumerate(ims):Image.open(io.BytesIO(base64.b64decode(m['base64']))).convert('RGBA').save(W+'anim/lich_%s_%d.png'%(k,i))
