# Builds the treant forms' sheets (cls_treant_2, cls_treant_3) from the clips in tools/w/anim (see docs/notes/hero-art.md).
# Run from the repo root: python3 tools/pixellab/treant_sheet.py <form> idle=<prefix> walk=<prefix> attack=<prefix> dead=<prefix>
# (a prefix like treant3_attack_s2). Then run lie.py, which adds the lying death frame.
import sys,os,json,shutil;sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import cut
from PIL import Image
f=sys.argv[1];i='treant'+f;W=cut.W
os.makedirs(W+'cutanim',exist_ok=True)
for a in sys.argv[2:]:
    row,pre=a.split('=')
    for k in range(5):shutil.copy(W+'anim/%s_%d.png'%(pre,k),W+'cutanim/%s_%s_%d.png'%(i,row,k))
cut.W=W+'cut_'
os.makedirs(W+'cut_anim',exist_ok=True)
for fn in os.listdir(W+'cutanim'):shutil.copy(W+'cutanim/'+fn,W+'cut_anim/'+fn)
shutil.copy(W+'pick_%s.png'%i,W+'cut_pick_%s.png'%i)
s,e,rem=cut.cut(i,['walk','attack','idle','dead'])
D='src/art/units/';s.save(D+'cls_treant_%s.png'%f)
d=json.load(open(D+'sheets.json'));d['cls_treant_'+f]=e;json.dump(d,open(D+'sheets.json','w'),indent=1);print(e,rem)
