# Contact sheet of base candidates at 3x: contact.py <id> <seed> -> tools/w/contact_<id>_s<seed>.png
import sys,glob
from PIL import Image,ImageDraw
i,s=sys.argv[1:3];fs=sorted(glob.glob('tools/w/base/%s_s%s_*.png'%(i,s)))
ims=[Image.open(f).convert('RGBA') for f in fs];w=max(m.width for m in ims);k=3
cols=5;rows=(len(ims)+cols-1)//cols;out=Image.new('RGBA',(cols*(w*k+6),rows*(w*k+6)),(86,108,84,255));d=ImageDraw.Draw(out)
for n,m in enumerate(ims):
    x=(n%cols)*(w*k+6);y=(n//cols)*(w*k+6);out.alpha_composite(m.resize((m.width*k,m.height*k),Image.NEAREST),(x,y));d.text((x+3,y+3),str(n),fill=(255,255,0,255))
out.save('tools/w/contact_%s_s%s.png'%(i,s))
