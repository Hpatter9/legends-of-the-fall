# Installs a cut hero sheet (tools/w/out_<id>.png from cut.py) as src/art/units/hero_<id>.png with its sheets.json entry, then
# adds the lying last death frame (lie.py). Run from the repo root: finish.py <id> [<id> ...]. Safe to run twice.
import sys,os,json,subprocess
from PIL import Image
D='src/art/units/'
for i in sys.argv[1:]:
    s=Image.open('tools/w/out_%s.png'%i);s.save(D+'hero_%s.png'%i)
    j=json.load(open('tools/w/out_%s.json'%i));d=json.load(open(D+'sheets.json'));d['hero_'+i]=j;json.dump(d,open(D+'sheets.json','w'),indent=1)
subprocess.check_call([sys.executable,'tools/pixellab/lie.py'])
