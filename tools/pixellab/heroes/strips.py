# Review strips for polish.py takes: per hero, rows = old walk, walk take 3, walk take 5, old hurt, hurt take 3, hurt take 5 (hurt takes show the 3 frames kept).
#   strips.py <out.png> <id> [<id>...]
import sys,os,json,glob
from PIL import Image,ImageDraw
os.chdir(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
P='tools/w/pol/';D='src/art/units/';K=1.5
out,ids=sys.argv[1],sys.argv[2:];blocks=[]
for i in ids:
    e=json.load(open(D+'sheets.json'))['hero_'+i];im=Image.open(D+'hero_%s.png'%i).convert('RGBA');w,h=e['w'],e['h']
    rows=[]
    def old(r):return [im.crop((k*w,e['rows'].index(r)*h,(k+1)*w,(e['rows'].index(r)+1)*h)) for k in range(e['counts'][r])]
    def new(r,s,idx):return [Image.open(P+'%s_%s_s%d_%d.png'%(i,r,s,k)).convert('RGBA') for k in idx]
    pick=Image.open(P+'pick_%s.png'%i)
    rows=[('old walk',old('walk')),('walk s3',new('walk',3,range(8))),('walk s5',new('walk',5,range(8))),('old hurt',old('hurt')),('hurt s3',new('hurt',3,[1,3,5])),('hurt s5',new('hurt',5,[1,3,5]))]
    # one crop for everything of this hero: the union box of the new frames (old cells are cropped to their own figure, bottom-aligned)
    bb=None
    for n,fs in rows:
        if n.startswith('old'):continue
        for f in fs:
            b=f.getbbox();bb=b if bb is None else (min(bb[0],b[0]),min(bb[1],b[1]),max(bb[2],b[2]),max(bb[3],b[3]))
    cw,ch=bb[2]-bb[0],bb[3]-bb[1];blk=Image.new('RGBA',(8*int(cw*K),6*int(ch*K)),(86,108,84,255));d=ImageDraw.Draw(blk)
    for y,(n,fs) in enumerate(rows):
        for x,f in enumerate(fs):
            if n.startswith('old'):
                b=f.getbbox();c=Image.new('RGBA',(cw,ch));fb=f.crop(b) if b else f;c.paste(fb,((cw-fb.width)//2,ch-fb.height))
            else:c=f.crop(bb)
            blk.alpha_composite(c.resize((int(cw*K),int(ch*K)),Image.NEAREST),(x*int(cw*K),y*int(ch*K)))
        d.text((2,y*int(ch*K)+2),n,fill=(255,255,255,255))
    d.text((blk.width-80,2),i,fill=(255,255,0,255));blocks.append(blk)
W=max(b.width for b in blocks);H=sum(b.height for b in blocks);o=Image.new('RGBA',(W,H),(86,108,84,255));y=0
for b in blocks:o.alpha_composite(b,(0,y));y+=b.height
o.save(out);print(out,o.size)
