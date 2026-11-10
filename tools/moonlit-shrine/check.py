#!/usr/bin/env python3
"""Validate all ten source sheets against the actual cutter's layouts."""
import importlib.util
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
sp = importlib.util.spec_from_file_location('pack_yokai', Path(__file__).with_name('pack.py'))
p = importlib.util.module_from_spec(sp)
sp.loader.exec_module(p)
report = []
previews = []
for raw in sorted((p.SRC / 'raw').glob('yok-*.png')):
    name = raw.name
    im = Image.open(p.SRC / name)
    layout = p.profile.get('layouts', {}).get(name, p.profile['sprites'].get(name))
    size = (1536, 1024) if name in [p.profile['faces'][0], 'yok-07-keep.png', 'yok-09-landmarks.png', 'yok-11-ruins.png'] else (1024, 1024)
    assert im.size == size, (name, im.size)
    a = np.array(im.convert('RGBA'))
    item = {'file': name, 'size': list(im.size), 'cells': []}
    if layout:
        used = set()
        for slot, (x,y,w,h,fx,fy,fu,fv) in layout.items():
            if (x,y) in used:
                continue
            used.add((x,y))
            ys, xs = np.nonzero(a[y:y+h,x:x+w,3] >= 128)
            assert len(xs), (name,slot,'empty')
            bounds = (int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1))
            tip = fy+(fu+fv)*16
            # The cutter places a 3x3 landmark's front tip at the cell's bottom
            # (416 + 96 = 512); that exact boundary is intentional.
            bottom_limit = h if tip == h else h-8
            assert bounds[0] >= 8 and bounds[1] >= 8 and bounds[2] <= w-8 and bounds[3] <= bottom_limit, (name,slot,bounds,'padding')
            assert abs(bounds[3]-tip) <= 2, (name,slot,'anchor',bounds,tip)
            assert abs((bounds[0]+bounds[2])/2-fx) <= 1, (name,slot,'centre')
            item['cells'].append({'slot':slot,'bounds':list(bounds),'foot':[fx,fy],'footprint':[fu,fv]})
            # A review-only diagram overlays the actual cell with its footprint.
            cell = Image.new('RGBA',(w,h),(24,29,38,255))
            cell.alpha_composite(im.convert('RGBA').crop((x,y,x+w,y+h)))
            d=ImageDraw.Draw(cell)
            diamond=[(fx+(-fu+fv)*32,fy-(fu+fv)*16),(fx+(fu+fv)*32,fy+(fu-fv)*16),(fx+(fu-fv)*32,tip),(fx-(fu+fv)*32,fy+(-fu+fv)*16)]
            d.line(diamond+[diamond[0]],fill='#69e6bc',width=2)
            d.line((fx-6,fy,fx+6,fy),fill='white',width=2)
            d.line((fx,fy-6,fx,fy+6),fill='white',width=2)
            cell.thumbnail((240,240))
            tile=Image.new('RGB',(260,280),(24,29,38)); tile.paste(cell,((260-cell.width)//2,26))
            ImageDraw.Draw(tile).text((8,8),f'{name[4:6]} {slot} {fu}x{fv}',fill='white')
            previews.append(tile)
    elif name == p.profile['faces'][0]:
        assert not a[480:512,:,3].any() and not a[992:1024,:,3].any(), (name,'unused bands')
        item['cells'] = list(p.profile['faces'][1])
    else:
        for i in range(16):
            x,y=i%4*256,i//4*256
            assert np.any(a[y:y+256,x:x+256,3]>=128), (name,i,'empty')
        item['cells'] = 16
    report.append(item)
assert len(report)==10, len(report)
out=ROOT/'docs/samples/moonlit-shrine';out.mkdir(parents=True,exist_ok=True)
(out/'grid-checks.json').write_text(json.dumps(report,indent=2)+'\n')
for n in range(0,len(previews),12):
    page=Image.new('RGB',(1040,840),(24,29,38))
    for i,tile in enumerate(previews[n:n+12]):page.paste(tile,(i%4*260,i//4*280))
    page.save(out/f'footprints-{n//12+1}.jpg',quality=90)
print(f'PASS: {len(report)} sheets; {len(previews)} unique standing sprites; exact source canvases, non-empty cells, transparent margins and anchors; face bands clear.')
