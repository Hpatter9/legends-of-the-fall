# Installs a cut foe sheet (tools/w/out_<id>.png from cut.py) over a game sheet and adds the lying last death frame (lie.py).
# Run from the repo root: finish.py <id> <sheet name>. Safe to run twice.
import sys,json,subprocess
from PIL import Image
D='src/art/units/'
i,name=sys.argv[1:3]
Image.open('tools/w/out_%s.png'%i).save(D+name+'.png')
d=json.load(open(D+'sheets.json'));d[name]=json.load(open('tools/w/out_%s.json'%i));json.dump(d,open(D+'sheets.json','w'),indent=1)
subprocess.check_call([sys.executable,'tools/pixellab/lie.py',name])
