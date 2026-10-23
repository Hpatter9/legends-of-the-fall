# Cuts PixelLab animation frames into the game's sheet layout. Only crops and pads (no resampling); alpha is
# made hard (0 or 255) and lone stray pixels are dropped.
import sys,os,json,re;sys.path.insert(0,os.path.dirname(__file__))
from PIL import Image
from collections import deque
W=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))+'/w/'
# frames taken from each row's images (image 0 is the first frame given to the animator, the rest are generated)
def pick(r,n):
    if r=='idle':return list(range(min(n,4)))
    if r=='walk':return list(range(min(n,8)))
    if r in('attack','attack2'):return list(range(min(n,6)))
    if r=='hurt':return list(range(min(n,4)))
    if r=='dead':return list(range(1,min(n,7)))
ORDER=['walk','attack','idle','hurt','dead','attack2']
def clean(im):
    im=im.convert('RGBA');px=im.load();w,h=im.size
    for y in range(h):
        for x in range(w):
            r,g,b,a=px[x,y];px[x,y]=(r,g,b,255) if a>=128 else (0,0,0,0)
    seen=set();removed=0
    for y in range(h):
        for x in range(w):
            if px[x,y][3] and (x,y) not in seen:
                comp=[];q=deque([(x,y)]);seen.add((x,y))
                while q:
                    cx,cy=q.popleft();comp.append((cx,cy))
                    for dx in(-1,0,1):
                        for dy in(-1,0,1):
                            nx,ny=cx+dx,cy+dy
                            if 0<=nx<w and 0<=ny<h and (nx,ny) not in seen and px[nx,ny][3]:seen.add((nx,ny));q.append((nx,ny))
                if len(comp)<=2:
                    for c in comp:px[c]=(0,0,0,0)
                    removed+=len(comp)
    return im,removed
def cut(i,rows):
    frames={};rem=0
    rows=list(rows)
    if not os.path.exists(W+'anim/%s_idle_0.png'%i):
        os.makedirs(W+'anim',exist_ok=True);Image.open(W+'pick_%s.png'%i).save(W+'anim/%s_idle_0.png'%i)
    for r in rows:
        fs=[]
        have=len([f for f in os.listdir(W+'anim') if re.fullmatch('%s_%s_[0-9]+\\.png'%(i,r),f)])
        for k in pick(r,have):
            im,n=clean(Image.open(W+'anim/%s_%s_%d.png'%(i,r,k)));rem+=n;fs.append(im)
        frames[r]=fs
    idle0=frames['idle'][0];b=idle0.getbbox();cx=(b[0]+b[2])/2
    ext=0;top=10**6;bot=0
    for fs in frames.values():
        for f in fs:
            bb=f.getbbox()
            if not bb:continue
            ext=max(ext,abs(bb[0]-cx),abs(bb[2]-cx));top=min(top,bb[1]);bot=max(bot,bb[3])
    half=int(ext)+2;x0=int(round(cx))-half;w=half*2;h=bot-top;
    order=[r for r in ORDER if r in rows];per=max(len(frames[r]) for r in order)
    sheet=Image.new('RGBA',(w*per,h*len(order)))
    for ri,r in enumerate(order):
        for k,f in enumerate(frames[r]):
            c=Image.new('RGBA',(w,h));c.paste(f.crop((x0,top,x0+w,bot)) if x0>=0 and x0+w<=f.width else Image.new('RGBA',(w,h)),(0,0))
            if not (x0>=0 and x0+w<=f.width):
                big=Image.new('RGBA',(f.width+400,f.height),(0,0,0,0));big.paste(f,(200,0));c=big.crop((x0+200,top,x0+200+w,bot))
            sheet.paste(c,(k*w,ri*h))
    fig=b[3]-b[1]
    entry={'w':w,'h':h,'perRow':per,'rows':order,'counts':{r:len(frames[r]) for r in order},'figure':fig,'facesRight':True}
    return sheet,entry,rem
if __name__=='__main__':
    i=sys.argv[1];rows=sys.argv[2].split(',')
    s,e,rem=cut(i,rows);s.save(W+'out_%s.png'%i);json.dump(e,open(W+'out_%s.json'%i,'w'));print(json.dumps(e),rem)
