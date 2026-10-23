# Lineup of idle figures at in-game scale (the unit's `scale`), feet on one line, on the board green, with names.
#   lineup.py <out.png> <zoom> <per row> item ...     item = a hero id from src/sim/units.ts, or sheet:scale (e.g. hero_wolf_bard:0.7)
# The in-game camera draws at about `zoom` x the unit's scale (nearest-neighbour here, so it is a close picture of the game, not exact).
import sys,re,json
from PIL import Image,ImageDraw
D='src/art/units/';L=json.load(open(D+'sheets.json'))
U={m.group(1):(m.group(2),float(m.group(3))) for m in re.finditer(r"\n  (\w+): \{ id: '\w+', name: '[^']*', side: 'hero', sheet: '(\w+)', scale: ([\d.]+)",open('src/sim/units.ts').read())}
out,zoom,per=sys.argv[1],float(sys.argv[2]),int(sys.argv[3]);items=sys.argv[4:] or [k for k in U if k not in('wolf','treant','decoy')]
figs=[]
for it in items:
    sh,sc=(it.split(':')[0],float(it.split(':')[1])) if ':' in it else U[it]
    e=L[sh];im=Image.open(D+sh+'.png').convert('RGBA');w,h=e['w'],e['h'];r=e['rows'].index('idle')
    f=im.crop((0,r*h,w,(r+1)*h));f=f.crop(f.getbbox());k=sc*zoom
    f=f.resize((max(1,round(f.width*k)),max(1,round(f.height*k))),Image.NEAREST);figs.append((it.split(':')[0] if ':' in it else it,f))
cw=max(f.width for _,f in figs)+16;rh=max(f.height for _,f in figs)+22
rows=(len(figs)+per-1)//per;img=Image.new('RGBA',(per*cw,rows*rh),(86,108,84,255));d=ImageDraw.Draw(img)
for n,(name,f) in enumerate(figs):
    x=(n%per)*cw;y=(n//per)*rh;img.alpha_composite(f,(x+(cw-f.width)//2,y+rh-18-f.height));d.text((x+4,y+rh-12),name[:16],fill=(255,255,255,255))
img.save(out);print(out,img.size)
