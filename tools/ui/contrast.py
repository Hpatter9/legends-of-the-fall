"""WCAG contrast of the page's text in the style screenshots (see docs/notes/ui-styles.md).
Run after: AUDIT=1 node tools/ui/stone-shots.mjs out/web ui-stone-after   then: python3 -I tools/ui/contrast.py <audit dir> [name prefix ...] [--list]
For each text box the background is the most common colour inside the box in the screenshot (the text's own pixels are the minority),
the text colour is its computed colour; a box over scene art or a gradient is only approximate. Prints per style and screen the
body-text median, the worst box and how many are below 4.5."""
import sys, glob, json, re, os, statistics
from collections import Counter
from PIL import Image
d = sys.argv[1]; args = [a for a in sys.argv[2:] if not a.startswith('--')]; lst = '--list' in sys.argv
def lin(c): c /= 255; return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
def L(rgb): return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2])
def ratio(a, b): la, lb = sorted((L(a), L(b)), reverse=True); return (la + 0.05) / (lb + 0.05)
res = {}
for f in sorted(glob.glob(f'{d}/*.json')):
    name = os.path.basename(f)[:-5]
    if args and not any(name.startswith(a) for a in args): continue
    img = Image.open(f'docs/samples/{name}.png').convert('RGB')
    rows = []
    for b in json.load(open(f)):
        m = re.match(r'rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)', b['color'])
        if not m or (m.group(4) and float(m.group(4)) < 0.5): continue
        fg = tuple(int(m.group(i)) for i in (1, 2, 3))
        x0, y0 = max(0, int(b['x'])), max(0, int(b['y'])); x1, y1 = min(img.width, int(b['x'] + b['w'])), min(img.height, int(b['y'] + b['h']))
        if x1 - x0 < 4 or y1 - y0 < 4: continue
        cnt = Counter(img.crop((x0, y0, x1, y1)).getdata()); bg = cnt.most_common(1)[0][0]
        rows.append((ratio(fg, bg), b['cls'], b['text'], float(b['size'][:-2])))
    res[name] = rows
for name, rows in res.items():
    if not rows: continue
    rs = [r[0] for r in rows]; bad = [r for r in rows if r[0] < 4.5]
    print(f'{name:18} boxes {len(rows):3} median {statistics.median(rs):5.1f} worst {min(rs):4.1f} below4.5: {len(bad)}')
    if lst:
        for r in sorted(bad)[:25]: print(f'     {r[0]:4.1f}  {r[1][:60]:60}  "{r[2]}"')
