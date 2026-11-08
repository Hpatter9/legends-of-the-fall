"""Pack approved trait symbols with hard alpha, native 128px cells and a 28px review."""
from pathlib import Path
from PIL import Image, ImageDraw
import json
ROOT=Path(__file__).resolve().parents[2]
BATCHES={
    'proposal': (3,1,['fireproof','bane-arcane','elusive']),
    'remaining-clean': (3,3,['rime','venom','thick','grounded','fearless','bane-martial','bane-devout','bane-wild','legendSlayer']),
}
preview=Image.new('RGB',(800,510),'#201b22');draw=ImageDraw.Draw(preview)
report=[];index=0
for batch,(cols,rows,names) in BATCHES.items():
    sheet=Image.open(ROOT/f'art-source/nemesis-traits/{batch}.png').convert('RGBA')
    for i,name in enumerate(names):
        col,row=i%cols,i//cols
        # Generated row baselines drift slightly; boundaries sit in the actual transparent gaps.
        cuts=[0,400,800,sheet.height] if batch=='remaining-clean' else [0,sheet.height]
        tile=sheet.crop((round(col*sheet.width/cols),cuts[row],round((col+1)*sheet.width/cols),cuts[row+1]))
        mask=tile.getchannel('A').point(lambda a:255 if a>=128 else 0)
        bounds=mask.getbbox();assert bounds
        tile.putalpha(mask);tile=tile.crop(bounds)
        # Nearest-neighbour preserves hard clusters; limited colours keep the same gothic pixel vocabulary.
        tile.thumbnail((104,104),Image.Resampling.NEAREST)
        alpha=tile.getchannel('A')
        tile=tile.convert('RGB').quantize(colors=48,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.NONE).convert('RGBA')
        tile.putalpha(alpha)
        icon=Image.new('RGBA',(128,128))
        icon.alpha_composite(tile,((128-tile.width)//2,(128-tile.height)//2))
        assert all(count==0 for value,count in enumerate(icon.getchannel('A').histogram()) if value not in (0,255))
        assert min(icon.getbbox())>=12 and max(icon.getbbox())<=116
        icon.save(ROOT/f'src/art/nemesis-traits/{name}.png',optimize=True)
        x,y=index%4*200,index//4*170
        preview.paste(icon,(x+4,y),icon)
        tiny=icon.resize((28,28),Image.Resampling.NEAREST);preview.paste(tiny,(x+148,y+98),tiny)
        draw.text((x+4,y+134),name,fill='#e8d8bb')
        report.append({'id':name,'size':[128,128],'bounds':icon.getbbox(),'binaryAlpha':True})
        index+=1
preview.save(ROOT/'docs/samples/nemesis-traits/contact.png')
(ROOT/'art-source/nemesis-traits/import-report.json').write_text(json.dumps(report,indent=2)+'\n')
print('Packed twelve 128px symbols with hard alpha, 12px minimum padding and 28px samples.')
