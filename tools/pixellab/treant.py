# Base candidates for the treant's evolved forms (docs/notes/hero-art.md). Run from the repo root.
#   python3 tools/pixellab/treant.py base <form 2|3> <seed>     4 candidates at 128 px; job id saved to tools/w/base_treant<form>.json
#   python3 tools/pixellab/treant.py get <form 2|3>              poll it and save tools/w/cand_treant<form>_<n>.png
import sys,os,json,io,base64;sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from api import *
from PIL import Image
W=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))+'/w/'
SD='side-view pixel art, crisp single pixels, dark outlines, muted dark-fantasy palette, adult proportions'
D={'2':'BOSS-sized big treant, a tall gnarled tree-folk with thick mossy bark skin, green moss and small pink and white flowers growing on its shoulders and arms, glowing green eyes, a long staff-like living branch held in one hand, roots for feet, menacing, side view facing right, standing idle, full body, fills the canvas',
 '3':'ancient great treant, a towering primeval tree-folk with deep dark bark, glowing green runes carved into its chest and arms, golden autumn leaves and pink blossoms, a crown of branches and antlers on its head, glowing eyes, huge root feet, majestic, side view facing right, standing idle, full body, fills the canvas'}
cmd=sys.argv[1];f=sys.argv[2]
if cmd=='base':
    refs=[Image.open(W+'pick_cls_treant_128.png'),ref('minotaur_1','idle',128),ref('samurai_commander','idle',128)]
    if f=='3' and os.path.exists(W+'pick_treant2.png'):refs.insert(0,Image.open(W+'pick_treant2.png'))
    body={'style_images':[{'image':{'type':'base64','base64':b64(r),'format':'png'},'width':128,'height':128} for r in refs],'description':D[f],'style_description':SD,'no_background':True,'seed':int(sys.argv[3])}
    r=post('/generate-with-style-v2',body,W+'base_treant%s.json'%f);print(r)
elif cmd=='get':
    r=poll(json.load(open(W+'base_treant%s.json'%f))['background_job_id']);print(r['status']);ims=(r.get('last_response') or {}).get('images',[])
    for i,m in enumerate(ims):Image.open(io.BytesIO(base64.b64decode(m['base64']))).convert('RGBA').save(W+'cand_treant%s_%d.png'%(f,i))
    print(len(ims))
