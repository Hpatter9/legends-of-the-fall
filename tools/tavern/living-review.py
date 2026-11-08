"""Validate activity exports and make a labelled contact sheet for review."""
from pathlib import Path
import json
from PIL import Image, ImageDraw
ROOT = Path(__file__).resolve().parents[2]
activities = json.loads((ROOT/'src/render/tavernActivities.json').read_text())
canvas = Image.new('RGB', (1200, 9*230), '#253e2b')
draw = ImageDraw.Draw(canvas)
for i, (kind, activity) in enumerate(activities.items()):
    image = Image.open(ROOT/f'src/art/tavern/guests/{kind}-activity.webp').convert('RGBA')
    assert image.size == (384, 440), kind
    alpha = image.getchannel('A')
    bound = alpha.point(lambda value: 255 if value >= 32 else 0).getbbox()
    assert bound and bound[0] >= 8 and bound[1] >= 8 and bound[2] <= 376 and bound[3] <= 432, (kind,bound)
    assert alpha.getextrema() == (0,255) or alpha.getextrema()[0] == 0, kind
    image.thumbnail((175,190), Image.Resampling.LANCZOS)
    x=(i%6)*200; y=(i//6)*230
    canvas.paste(image,(x+(200-image.width)//2,y+30),image)
    draw.text((x+5,y+3),kind,fill='#ffe7ad')
    draw.text((x+5,y+17),activity['label'],fill='#d0dbd0')
path=ROOT/'docs/samples/living-tavern-activities.jpg'
canvas.save(path,quality=92)
print(f'{len(activities)} individual paintings validated; {path}')
