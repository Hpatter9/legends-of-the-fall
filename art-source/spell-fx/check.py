"""Check Session A source geometry against the attached art brief. Requires Pillow."""
import json
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parent
rows={
'dash':['trail','impact'],'blink':['cast','impact'],'teleport-slash':['trail','impact'],
'pull':['beam','impact'],'shove':['impact','trail'],'launch':['cast','motes','impact'],
'slam':['impact'],'burrow':['cast','ground','impact'],'swap':['cast','beam'],
'wall-stone':['rise','stand','break'],'wall-ice':['rise','stand','break'],
'wall-thorns':['rise','stand','break'],'wall-light':['rise','stand','break'],
'wall-fire':['rise','stand','break'],'wall-wind':['stand','impact']}
report={}
for key,parts in rows.items():
 p=root/'a-toolkit'/f'{key}.png'
 if not p.exists():
  report[key]={'status':'missing'};continue
 im=Image.open(p).convert('RGBA');w,h=im.size;side=h//len(parts)
 faults=[];out=[]
 if not side or h%len(parts) or w%side:
  faults.append('Dimensions do not divide into the required square-cell grid')
 else:
  for r,part in enumerate(parts):
   frames=[];ended=False
   for c in range(w//side):
    f=im.crop((c*side,r*side,(c+1)*side,(r+1)*side));a=f.getchannel('A')
    if a.getbbox() is None: ended=True;continue
    if ended: faults.append(f'{part}: nonempty cell after empty cell')
    corners=[a.getpixel(xy) for xy in [(0,0),(side-1,0),(0,side-1),(side-1,side-1)]]
    if max(corners)>=8: faults.append(f'{part} frame {c+1}: opaque corner ({max(corners)})')
    frames.append(c+1)
   low,high=(4,6) if part=='beam' else ((6,6) if part in ['trail','ground','rise','stand','break','motes'] else (6,8))
   if not low<=len(frames)<=high: faults.append(f'{part}: {len(frames)} frames, expected {low}–{high}')
   out.append({'part':part,'frames':len(frames)})
 report[key]={'size':[w,h],'cell':side,'rows':out,'faults':faults,'status':'pass' if not faults else 'needs repair'}
print(json.dumps(report,indent=2))
(root/'a-toolkit'/'checks.json').write_text(json.dumps(report,indent=2)+'\n')

raise SystemExit(1 if any(v["status"] != "pass" for v in report.values()) else 0)
