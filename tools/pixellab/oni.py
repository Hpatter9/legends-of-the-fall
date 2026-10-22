# The Oni King's art (the Yokai Night Parade's last boss), step by step; same flow as lich.py (see docs/notes/armies.md).
# Run from the repo root with a scratch folder tools/w/. Each job id is saved before it is polled.
#   python3 tools/pixellab/oni.py base 11          4 candidates at 128 px (pick one by eye: copy it to tools/w/pick_oni.png)
#   python3 tools/pixellab/oni.py anim idle walk attack attack2 dead
#   python3 tools/pixellab/oni.py collect idle walk attack attack2 dead   (frames to w/anim/oni_<row>_<n>.png)
#   python3 tools/pixellab/cut.py oni walk,attack,idle,dead,attack2
import sys,os,json,io,base64;sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from api import *
from PIL import Image
W=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))+'/w/'
os.makedirs(W+'anim',exist_ok=True)
SD='side-view pixel art, crisp single pixels, dark outlines, muted dark-fantasy palette, adult proportions'
DESC='BOSS Oni King, a huge red-skinned Japanese oni demon with two big ivory horns, wild black hair, tusks and glaring yellow eyes, bare muscular torso with a tiger-skin loincloth and iron bracers, gripping a massive spiked iron kanabo club, menacing, side view facing right, standing idle, full body, fills the canvas'
ANIMS={'idle':'standing idle, chest heaving, spiked club resting on the shoulder, staying in place, facing right',
 'walk':'stomping forward to the right with heavy long steps, one leg then the other, body swaying, club dragging at the side',
 'attack':'attacking with a huge overhead smash of the spiked iron club to the right, then recovering',
 'attack2':'roaring and slamming the club into the ground with both hands, shockwave of dust, then lifting it',
 'dead':'dying: struck and knocked backwards, dropping the club, body toppling over backwards, falling flat onto the back and lying still on the ground'}
cmd=sys.argv[1]
if cmd=='base':
    refs=[ref('minotaur_1','idle',128),ref('samurai_commander','idle',128),ref('hk_ogre_horned','idle',128)]
    body={'style_images':[{'image':{'type':'base64','base64':b64(r),'format':'png'},'width':128,'height':128} for r in refs],'description':DESC,'style_description':SD,'no_background':True,'seed':int(sys.argv[2])}
    print(post('/generate-with-style-v2',body,W+'base_job.json'))
elif cmd=='anim':
    img=Image.open(W+'pick_oni.png').convert('RGBA')
    for k in sys.argv[2:]:
        body={'first_frame':{'type':'base64','base64':b64(img),'format':'png'},'action':ANIMS[k],'frame_count':4,'no_background':True,'seed':7}
        print(k,post('/animate-with-text-v3',body,W+'job_%s.json'%k)['background_job_id'])
elif cmd=='collect':
    for k in sys.argv[2:]:
        r=poll(json.load(open(W+'job_%s.json'%k))['background_job_id']);ims=(r.get('last_response') or {}).get('images',[])
        print(k,r['status'],len(ims))
        for i,m in enumerate(ims):Image.open(io.BytesIO(base64.b64decode(m['base64']))).convert('RGBA').save(W+'anim/oni_%s_%d.png'%(k,i))
