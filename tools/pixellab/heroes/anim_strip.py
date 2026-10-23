# Before/after strip of walk and hurt frames for heroes: rows per hero = old walk, new walk, old hurt, new hurt (feet aligned, one crop per hero).
#   anim_strip.py <out.png> <old sheets dir> <old sheets.json> <id> [<id>...]     (old sheets dir holds hero_<id>.png as they were before; git show HEAD:... for the json)
import sys,os,json
from PIL import Image,ImageDraw
os.chdir(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
out,od,oj=sys.argv[1:4];ids=sys.argv[4:];D='src/art/units/';K=2
old=json.load(open(oj));new=json.load(open(D+'sheets.json'));blocks=[]
def frames(img,e,r):
    w,h=e['w'],e['h'];ri=e['rows'].index(r);return [img.crop((k*w,ri*h,(k+1)*w,(ri+1)*h)) for k in range(e['counts'][r])]
for i in ids:
    s='hero_'+i;oi=Image.open('%s/%s.png'%(od,s)).convert('RGBA');ni=Image.open(D+s+'.png').convert('RGBA')
    rows=[('before walk',frames(oi,old[s],'walk')),('after walk',frames(ni,new[s],'walk')),('before hurt',frames(oi,old[s],'hurt')),('after hurt',frames(ni,new[s],'hurt'))]
    bb=None;cells=[]
    for n,fs in rows:
        for f in fs:
            b=f.getbbox()
            if b:bb=b if bb is None else (min(bb[0],b[0]),min(bb[1],b[1]),max(bb[2],b[2]),max(bb[3],b[3]))
    cw=max(f.width for _,fs in rows for f in fs);ch=max(f.height for _,fs in rows for f in fs)
    # (every frame cropped to its own figure, feet on one line, centred on the cell: the cells differ in size before and after)
    fw=max((f.getbbox()[2]-f.getbbox()[0]) for _,fs in rows for f in fs if f.getbbox());fh=max((f.getbbox()[3]-f.getbbox()[1]) for _,fs in rows for f in fs if f.getbbox())
    blk=Image.new('RGBA',(8*fw*K,4*fh*K),(86,108,84,255));d=ImageDraw.Draw(blk)
    for y,(n,fs) in enumerate(rows):
        d.text((2,y*fh*K+2),n,fill=(255,255,255,255))
        for x,f in enumerate(fs):
            b=f.getbbox()
            if not b:continue
            c=f.crop((0,b[1],f.width,b[3]));c=Image.new('RGBA',(fw,fh)); 
            # keep the cell's own horizontal centring so a stride shows as movement: paste the whole cell, feet on the line
            full=f.crop((0,b[1],f.width,b[3]));ox=(fw-f.width)//2;c.paste(full,(ox,fh-full.height))
            blk.alpha_composite(c.resize((fw*K,fh*K),Image.NEAREST),(x*fw*K,y*fh*K))
    d.text((blk.width-90,2),i,fill=(255,255,0,255));blocks.append(blk)
W=max(b.width for b in blocks);H=sum(b.height for b in blocks);o=Image.new('RGBA',(W,H),(86,108,84,255));y=0
for b in blocks:o.alpha_composite(b,(0,y));y+=b.height
o.save(out);print(out,o.size)
