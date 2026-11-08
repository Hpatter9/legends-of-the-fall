# The drawing half of masks.mjs: each painting with its regions (outlined by kind), lights (circles) and drifts (dashed boxes).
import json, sys
from PIL import Image, ImageDraw
data = json.load(open(sys.argv[1])); out = sys.argv[2]
COL = {'water': (60, 200, 255), 'fall': (200, 240, 255), 'foliage': (80, 255, 80), 'cloth': (255, 80, 200), 'flame': (255, 140, 0), 'cloud': (255, 255, 255), 'float': (190, 120, 255), 'heat': (255, 60, 60)}
for name, life in data['life'].items():
    src = data['art'].get(name)
    if not src: continue
    im = Image.open(src).convert('RGB')
    W, H = im.size
    s = min(1, 900 / max(W, H)); im = im.resize((int(W * s), int(H * s))); W, H = im.size
    d = ImageDraw.Draw(im)
    for r in life['regions']:
        pts = [(x * W, y * H) for x, y in r['poly']]
        d.polygon(pts, outline=COL[r['kind']])
    for l in life['lights']:
        x, y, rr = l['at'][0] * W, l['at'][1] * H, l['r'] * W * 0.3
        d.ellipse((x - rr, y - rr, x + rr, y + rr), outline=(255, 230, 0))
        d.point((x, y), fill=(255, 0, 0))
    for p in life['spouts']:
        x, y = p['at'][0] * W, p['at'][1] * H
        d.rectangle((x - 3, y - 3, x + 3, y + 3), outline=(255, 0, 0))
    for b in life['drifts']:
        x0, y0, x1, y1 = b['box']
        d.rectangle((x0 * W, y0 * H, x1 * W, y1 * H), outline=(255, 255, 0))
    im.save(f'{out}/{name}.png')
