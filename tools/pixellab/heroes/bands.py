# Points the 16 remade heroes at their new sheets (one look for every grade) and sets every hero's `scale` from a height band
# (docs/notes/hero-art.md): small 42, medium 50, large 60 world px (the figure's body height x scale). Only `sheet`, `forms` and
# `scale` in src/sim/units.ts change; stats, hitboxes and the sim are untouched. Run from the repo root; safe to run twice.
import re,json
from PIL import Image
D='src/art/units/';L=json.load(open(D+'sheets.json'))
NEW={'mercenary':'mercenary','wolfBard':'wolf_bard','beastmaster':'beastmaster','timeWitch':'time_witch','priestess':'priestess','dragoon':'dragoon','sage':'sage','demonSwordsman':'demon_swordsman','buccaneer':'buccaneer','dreadPirate':'dread_pirate','kraken':'kraken_mate','lancer':'lancer','mummy':'mummy','juggernaut':'juggernaut','tyrant':'tyrant','shambler':'shambler'}
BAND={'small':42,'medium':50,'large':60}
SMALL='kunoichi ninjaMonk wanderer kitsune peasant lightningMage karasu'.split()
LARGE='barbarian minotaur werewolf samuraiCommander yamabushi tyrant juggernaut lancer dragoon siegeBot kraken'.split()
def body(sheet):
    """Height of the idle figure without thin weapon tips (rows with fewer than 4 pixels at the top are not counted)."""
    e=L[sheet];im=Image.open(D+sheet+'.png').convert('RGBA');w,h=e['w'],e['h'];r=e['rows'].index('idle')
    f=im.crop((0,r*h,w,(r+1)*h));f=f.crop(f.getbbox());a=f.split()[3].load()
    top=next(y for y in range(f.height) if sum(1 for x in range(f.width) if a[x,y]>0)>=4)
    return f.height-top
out=[]
for line in open('src/sim/units.ts').read().split('\n'):
    m=re.match(r"  (\w+): \{ id: '\w+'.*side: 'hero'",line)
    if m and 'summon: true' not in line:
        k=m.group(1)
        if k in NEW:
            line=re.sub(r"sheet: '\w+'","sheet: 'hero_%s'"%NEW[k],line,count=1);line=re.sub(r", forms: \[[^\]]*\]","",line)
        sh=re.search(r"sheet: '(\w+)'",line).group(1)
        band='small' if k in SMALL else 'large' if k in LARGE else 'medium'
        line=re.sub(r"scale: [\d.]+","scale: %s"%round(BAND[band]/body(sh),2),line,count=1)
    out.append(line)
open('src/sim/units.ts','w').write('\n'.join(out))
