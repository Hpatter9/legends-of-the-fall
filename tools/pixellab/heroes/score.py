# Scores the two takes of each hero's walk and hurt (polish.py): motion = mean change of the figure between frames, drift = how far the
# figure's colours stray from the base. Prints both; the pick is made by eye from the strips (strips.py).
import glob,sys,os
import numpy as np
from PIL import Image
os.chdir(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
P='tools/w/pol/'
def arr(f):return np.array(Image.open(f).convert('RGBA')).astype(float)
for pk in sorted(glob.glob(P+'pick_*.png')):
    i=os.path.basename(pk)[5:-4];base=arr(pk);m=base[...,3]>0;mean=base[m][:,:3].mean(0);line=[i]
    for row in('walk','hurt'):
        for seed in(3,5):
            fs=[arr(f) for f in sorted(glob.glob(P+'%s_%s_s%d_[0-9].png'%(i,row,seed)))]
            if not fs:continue
            mot=np.mean([np.abs((a[...,3]>0).astype(float)-(b[...,3]>0).astype(float)).mean()*1000 for a,b in zip(fs,fs[1:])])
            dr=np.mean([np.abs(f[f[...,3]>0][:,:3].mean(0)-mean).mean() for f in fs[1:]])
            line.append('%s%d m%.1f d%.0f'%(row[0],seed,mot,dr))
    print(' | '.join(line))
