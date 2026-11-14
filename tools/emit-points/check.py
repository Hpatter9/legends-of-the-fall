"""EMIT-POINTS (docs/notes/emit-points.md): check each anchor in anchors.json against the sheet it was read from, and draw them.

For each sheet's frame, front and rear: the nearest drawn pixel to the anchor, and how far it is. A `shot` point is read on the
release frame (the third of the attack row, the one on show as the shot leaves); a `cast` point on the second frame of the
skill's row (`attack2`, or the attack row where the sheet has none), the middle of the cast; a `foe` point on the frame the table
names (its sheet's release frame: the share of its attack row gone by as the shot leaves). An anchor more than FAR px from anything drawn was misread. With an output path, a
sheet of every frame at three times its size with the anchor marked is written there.

  python3 tools/emit-points/check.py [out.png]
"""
import json, sys
from PIL import Image, ImageDraw

FAR = 4
d = json.load(open('src/art/units/sheets.json'))
A = json.load(open('tools/emit-points/anchors.json'))


def frame(k, i=2, row='attack'):
    L = d[k]
    im = Image.open(f'src/art/units/{k}.png').convert('RGBA')
    if row not in L['rows'] or not L['counts'].get(row):
        row = 'attack'
    r = L['rows'].index(row)
    start = sum(-(-L['counts'][x] // L['perRow']) for x in L['rows'][:r])
    i = min(i, L['counts'][row] - 1)
    return im.crop(((i % L['perRow']) * L['w'], (start + i // L['perRow']) * L['h'], (i % L['perRow'] + 1) * L['w'], (start + i // L['perRow'] + 1) * L['h'])), L


bad, cells = 0, []
for sec, sheet, a in [(sec, sheet, a) for sec in ('shot', 'cast', 'foe') for sheet, a in A[sec].items()]:
    # (a foe's sheet has one view, and its release frame is its own: `frame` in the table)
    if sec == 'foe':
        a = {**a, 'front': a['at']}
    for view, k in ((('front', sheet), ('back', d[sheet]['rear'])) if sec != 'foe' else (('front', sheet),)):
        fr, L = frame(k) if sec == 'shot' else frame(k, 1, 'attack2') if sec == 'cast' else frame(k, a['frame'])
        px = fr.load()
        x, y = L['w'] // 2 + a[view][0], L['h'] - 1 - a[view][1]
        best = None
        for dy in range(-12, 13):
            for dx in range(-12, 13):
                u, v = x + dx, y + dy
                if 0 <= u < L['w'] and 0 <= v < L['h'] and px[u, v][3] > 128:
                    q = (dx * dx + dy * dy) ** 0.5
                    if best is None or q < best[0]:
                        best = (q, dx, -dy)
        far = best is None or best[0] > FAR
        bad += far
        print(f"{'FAR ' if far else 'ok  '}{sec} {sheet:28s} {view:5s} {a['kind']:9s} {a[view]}  nearest drawn {('%.1f px, by %+d, %+d' % best) if best else 'none within 12 px'}")
        cells.append((fr, L, x, y, f'{sec} {sheet} {view}'))
if len(sys.argv) > 1:
    Z, per = 3, 6
    W = max(c[1]['w'] for c in cells) * Z
    H = max(c[1]['h'] for c in cells) * Z
    sh = Image.new('RGB', (W * per, H * -(-len(cells) // per)), (40, 46, 56))
    dr = ImageDraw.Draw(sh)
    for i, (fr, L, x, y, name) in enumerate(cells):
        ox, oy = (i % per) * W, (i // per) * H
        big = fr.resize((L['w'] * Z, L['h'] * Z), Image.NEAREST)
        sh.paste(big, (ox, oy), big)
        cx, cy = ox + x * Z + 1, oy + y * Z + 1
        dr.line([(cx - 9, cy), (cx + 9, cy)], fill=(0, 255, 255))
        dr.line([(cx, cy - 9), (cx, cy + 9)], fill=(0, 255, 255))
        dr.text((ox + 3, oy + 3), name, fill=(255, 230, 120))
    sh.save(sys.argv[1])
print('anchors far from anything drawn:', bad)
sys.exit(1 if bad else 0)
