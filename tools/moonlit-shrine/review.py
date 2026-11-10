#!/usr/bin/env python3
"""Assemble browser screenshots into review-only contact sheets."""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs/samples/moonlit-shrine-detail'
r = json.loads((OUT/'browser-results.json').read_text())
views = [v for v in r['results'] if 'width' in v]
assert len(views) == 24 and len({(v['width'], v['spot']) for v in views}) == 24
assert not r['errors'] and not r['failed']
assert all(v['chunks'] >= v['wanted'] > 0 for v in views)
overview = next(v for v in r['results'] if v.get('overview'))
assert overview['stats']['chunks'] == overview['stats']['wanted'] == 100
assert overview['canvasSize'] == [1200,1600]
font = ImageFont.truetype('DejaVuSans.ttf', 20)
regions = [('bambooWood','Eastern bamboo woods'),('westWood','Western blossom woods'),('ruins','Old shrine ruins'),('sakeStores','Sake stores'),('reserve','Reserve camp'),('shore','Wet banks and ford'),('bailey','Outer bailey'),('perimeter','Perimeter walls')]
page = Image.new('RGB',(1600,1800),(23,27,36))
for n,(spot,label) in enumerate(regions):
    x,y=n%4*400,n//4*900
    im=Image.open(OUT/f'{spot}-393.jpg')
    page.paste(im,(x+3,y+40))
    ImageDraw.Draw(page).text((x+8,y+8),label,fill='white',font=font)
page.save(OUT/'region-review.jpg',quality=92)
phones=Image.new('RGB',(1600,1380),(23,27,36))
for row,w in enumerate([393,360,412]):
    for col,(spot,label) in enumerate(regions):
        im=Image.open(OUT/f'{spot}-{w}.jpg');im.thumbnail((196,425))
        phones.paste(im,(col*200+(200-im.width)//2,row*460+25))
        ImageDraw.Draw(phones).text((col*200+4,row*460+7),f'{spot} {w}px',fill='white')
phones.save(OUT/'phone-review.jpg',quality=90)
comparison=Image.new('RGB',(786,892),(23,27,36))
for x,label,path in [(0,'Before map-detail pass',ROOT/'docs/samples/moonlit-shrine-rich/camp-393.jpg'),(393,'After',OUT/'reserve-393.jpg')]:
    comparison.paste(Image.open(path),(x,40));ImageDraw.Draw(comparison).text((x+8,8),label,fill='white',font=font)
comparison.save(OUT/'reserve-comparison.jpg',quality=92)
print('PASS: 24 complete phone views and a complete map overview; review sheets written.')
