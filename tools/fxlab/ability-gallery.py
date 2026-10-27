"""Contact sheets of the materials captured from real renderer emissions, plus a live battle comparison."""
import json
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path('out/ability-fx')
rows = json.load(open('src/art/fx/abilities/catalogue.json'))
heroes = json.load(open('tools/fxlab/heroes.json'))
owner = {h[k]: h['name'] + (' — ultimate' if k == 'ult' else ' — skill') for h in heroes.values() for k in ('skill','ult')}
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 14)
small = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 11)
heading = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 19)
for start in range(0,len(rows),16):
    subset = rows[start:start+16]
    image = Image.new('RGB',(832,916),'#141c20')
    d = ImageDraw.Draw(image)
    d.text((16,14),f'INDIVIDUAL ABILITY ART — {start+1} to {start+len(subset)} of {len(rows)}',fill='#ecd7a5',font=heading)
    d.text((16,42),'Actual textures captured from live ability releases; battle layouts shown separately.',fill='#b0c2c6',font=small)
    for index,row in enumerate(subset):
        x,y=(index%4)*208,72+(index//4)*210
        d.rounded_rectangle((x+4,y+2,x+203,y+205),radius=9,fill='#1e2930',outline='#48504b')
        art = Image.open(root/'materials'/f'{start+index:03}.png').convert('RGBA')
        image.paste(art,(x+40,y+10),art)
        name = row['name'] if row['id'].startswith('skill:') else 'King: '+row['name']
        # Wrap long names; keep the owner beneath them so skill/ultimate relationships are visible.
        words=name.split(); lines=['']
        for word in words:
            if len(lines[-1])+len(word)>23: lines.append(word)
            else: lines[-1]+= (' ' if lines[-1] else '')+word
        for line_no,line in enumerate(lines[:2]):d.text((x+12,y+140+line_no*17),line,fill='#f0dfb8',font=font)
        caption=owner.get(row['name'],'Enemy ability') if row['id'].startswith('skill:') else 'Royal spell — separate artwork'
        d.text((x+12,y+181),caption[:31],fill='#a6bec1',font=small)
    image.save(f'docs/samples/individual-abilities-{start//16+1:02}.png',optimize=True)

shots=[('shield-wall','Shield Wall'),('last-bastion','Last Bastion'),('hero-meteor','Hero Meteor'),('king-meteor',"King's Meteor")]
image=Image.new('RGB',(393*4,900),'#141c20');d=ImageDraw.Draw(image)
for i,(key,label) in enumerate(shots):
    d.text((i*393+14,15),label,fill='#ecd7a5',font=heading)
    image.paste(Image.open(root/f'{key}-393x852.png').convert('RGB'),(i*393,48))
image.save('docs/samples/individual-ability-battles.png',optimize=True)

# Ignore colour when finding the closest silhouettes for manual comparison.
vectors = []
for index in range(len(rows)):
    art = Image.open(root/'materials'/f'{index:03}.png').convert('RGBA')
    grey = Image.new('RGB', art.size)
    grey.paste(art, mask=art.getchannel('A'))
    values = list(grey.convert('L').resize((24,24)).get_flattened_data())
    norm = math.sqrt(sum(value*value for value in values)) or 1
    vectors.append([value/norm for value in values])
pairs = sorted([(sum(a*b for a,b in zip(vectors[i],vectors[j])),i,j) for i in range(len(rows)) for j in range(i)], reverse=True)[:12]
review = Image.new('RGB',(960,904),'#172129')
draw = ImageDraw.Draw(review)
draw.text((14,12),'Closest greyscale silhouettes — side-by-side review; colour is ignored',font=font,fill='#eed4a0')
report = []
for index,(score,i,j) in enumerate(pairs):
    x,y=(index%3)*320,44+(index//3)*215
    for col,k in enumerate([i,j]):
        art=Image.open(root/'materials'/f'{k:03}.png').convert('RGBA')
        review.paste(art,(x+col*158+12,y+8),art)
        draw.text((x+col*158+8,y+142),rows[k]['name'][:21],font=font,fill='#dedede')
    draw.text((x+10,y+174),f'Shape similarity {score:.3f}',font=font,fill='#9db3bd')
    report.append({'a':rows[i]['id'],'b':rows[j]['id'],'greyscaleCosine':score})
review.save(root/'closest-materials.png',optimize=True)
(root/'closest-materials.json').write_text(json.dumps(report,indent=2)+'\n')
