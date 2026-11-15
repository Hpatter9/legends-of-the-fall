"""ROUND2-WIRE (docs/notes/round2-wire.md): the round-2 licence replacements (art-source/round2/, the owner's PR #666) laid into the
game's sheets in place of batareya's and whtdragon's.

Each new sheet is cut on its own grid (the golems all on 132 x 128), its figure scaled so it stands as tall on the board as the one it
replaces (the wolves' four legs by the mean of their height and width), and set down on the old sheet's feet line, centred, in the old
cell (made larger only where a frame would be cut). So no unit's scale changes, and `sheets.json` changes only where a cell grew.
Run from the repo root: python3 -I tools/round2-wire/wire.py
"""
import json
from PIL import Image

SRC = 'art-source/round2/'
UNITS = 'src/art/units/'
layout = json.load(open(UNITS + 'sheets.json'))

# (sheet: the size the new figure is brought to against the old: its height for an upright figure, the mean for a four-legged one)
FACTOR = {
    'golem_stone': 1.01, 'golem_iron': 1.07, 'golem_crystal': 1.00, 'golem_magma': 1.07, 'golem_sapphire': 1.15, 'golem_forge': 1.12,
    'cls_treant': 1.13, 'summon_wraith': 1.04, 'summon_decoy': 0.96,
    'wolf_grey': 1.55, 'wolf_black': 1.48, 'summon_wolf': 1.41, 'summon_wolf_white': 1.45, 'summon_direwolf': 1.22,
    'duchess_goat': 1.0,
}
NEW_CELL = {k: (132, 128) for k in FACTOR if k.startswith('golem_')}


def alpha_box(im):
    return im.split()[3].point(lambda v: 255 if v > 30 else 0).getbbox()


# (the Sapphire Colossus's sheet has a thin ground-shadow line under each figure, spilling into the cell below: it is taken out)
CLEAN = {'golem_sapphire'}


def drop_lines(im):
    """Take out every thin flat stroke (3 px tall or less, 8 px wide or more) that is a piece of its own, not part of the figure."""
    al = im.split()[3]
    px = al.load()
    w, h = im.size
    seen = set()
    for y in range(h):
        for x in range(w):
            if px[x, y] <= 30 or (x, y) in seen:
                continue
            st, pts = [(x, y)], []
            seen.add((x, y))
            while st:
                p = st.pop()
                pts.append(p)
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    q = (p[0] + dx, p[1] + dy)
                    if 0 <= q[0] < w and 0 <= q[1] < h and q not in seen and px[q] > 30:
                        seen.add(q)
                        st.append(q)
            xs = [p[0] for p in pts]
            ys = [p[1] for p in pts]
            if max(ys) - min(ys) <= 3 and max(xs) - min(xs) >= 8:
                for p in pts:
                    im.putpixel(p, (0, 0, 0, 0))
    return im


def frames(name, lay, w, h):
    a = Image.open(SRC + name + '.png').convert('RGBA')
    out = {}
    for ri, row in enumerate(lay['rows']):
        for c in range(lay['counts'].get(row, 0)):
            cell = a.crop((c * w, ri * h, (c + 1) * w, (ri + 1) * h))
            out[(ri, c)] = drop_lines(cell) if name in CLEAN else cell
    return out


def feet(fr, h, lay):
    """The sheet's feet line: the lowest drawn row of its idle frames, from the cell's bottom."""
    ri = lay['rows'].index('idle')
    return min(h - alpha_box(f)[3] for (r, _), f in fr.items() if r == ri and alpha_box(f))


def old_feet(name, lay):
    a = Image.open(UNITS + name + '.png').convert('RGBA')
    ri = lay['rows'].index('idle')
    return min(lay['h'] - alpha_box(a.crop((c * lay['w'], ri * lay['h'], (c + 1) * lay['w'], (ri + 1) * lay['h'])))[3]
               for c in range(lay['counts']['idle']) if alpha_box(a.crop((c * lay['w'], ri * lay['h'], (c + 1) * lay['w'], (ri + 1) * lay['h']))))


report = {}
for name, f in FACTOR.items():
    lay = layout[name]
    w, h = NEW_CELL.get(name, (lay['w'], lay['h']))
    fr = frames(name, lay, w, h)
    nb = feet(fr, h, lay)
    ob = old_feet(name, lay)
    # (each frame scaled about the new cell's bottom-centre feet point; where it lands in the old cell, and how big that cell must be)
    scaled = {}
    need_w, need_h = lay['w'], lay['h']
    for k, im in fr.items():
        if f != 1.0:
            s = im.resize((round(w * f), round(h * f)), Image.LANCZOS)
            al = s.split()[3].point(lambda v: 255 if v >= 128 else 0)
            s.putalpha(al)
        else:
            s = im
        scaled[k] = s
        bb = alpha_box(s)
        if not bb:
            continue
        cx = s.width / 2
        base = s.height - nb * f
        half = max(cx - bb[0], bb[2] - cx)
        need_w = max(need_w, int(2 * half + 2 + 0.999))
        need_h = max(need_h, int(base - bb[1] + ob + 1 + 0.999))
    tw, th = need_w + (need_w - lay['w']) % 2, need_h
    sheet = Image.new('RGBA', (tw * lay['perRow'], th * len(lay['rows'])), (0, 0, 0, 0))
    for (ri, c), s in scaled.items():
        x = round(c * tw + tw / 2 - s.width / 2)
        y = round(ri * th + (th - ob) - (s.height - nb * f))
        cell = Image.new('RGBA', (tw, th), (0, 0, 0, 0))
        cell.paste(s, (x - c * tw, y - ri * th), s)
        sheet.alpha_composite(cell, (c * tw, ri * th))
    q = sheet.quantize(256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
    q.save(UNITS + name + '.png', optimize=True)
    # (the figure's height on the new sheet, for the bars and labels over it)
    ri = lay['rows'].index('idle')
    fig = max((alpha_box(sheet.crop((c * tw, ri * th, (c + 1) * tw, (ri + 1) * th))) or (0, 0, 0, 0))[3]
              - (alpha_box(sheet.crop((c * tw, ri * th, (c + 1) * tw, (ri + 1) * th))) or (0, 0, 0, 0))[1] for c in range(lay['counts']['idle']))
    report[name] = {'cell': [tw, th], 'was': [lay['w'], lay['h']], 'figure': fig, 'was_figure': lay['figure']}
    lay['w'], lay['h'] = tw, th
    lay['figure'] = fig

# Duchess's walking strip: 1 to 3 face left, 4 to 6 right, her hooves on the canvas's bottom edge as the old strip's
strip = Image.open(SRC + 'duchess_walk_strip.png').convert('RGBA')
bot = max(alpha_box(strip.crop((i * 48, 0, i * 48 + 48, 48)))[3] for i in range(6))
goat = Image.new('RGBA', (288, 48), (0, 0, 0, 0))
goat.alpha_composite(strip.crop((0, 0, 288, bot)), (0, 48 - bot))
goat.save('src/art/duchess/goat.png', optimize=True)
goat.resize((144, 24), Image.NEAREST).save('src/art/duchess/goat-half.png', optimize=True)

open(UNITS + 'sheets.json', 'w').write(json.dumps(layout, indent=1) + '\n')
print(json.dumps(report, indent=1))
