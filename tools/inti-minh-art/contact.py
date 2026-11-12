#!/usr/bin/env python3
"""INTI-MINH-ART: every hero's battle sprite on one neutral background, to compare their looks.

  python3 tools/inti-minh-art/contact.py [out dir]          # the sheets the game bundles now
  python3 tools/inti-minh-art/contact.py out --only ranger peasant samurai gunslinger

Writes three pictures: `front.png` and `back.png` (each hero's first idle frame at the game's own scale, the unit's
`scale`, drawn 3x so the pixels can be read) and `native.png` (the same front frames at their own pixels, where the
drawing itself shows). The sheet read is the one the game bundles (a hero's toned copy, `tools/heritage/sheets.json`).
Looks only: nothing here changes a sheet.
"""
import json, re, sys
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
UNITS = ROOT / 'src/art/units'
LAYOUT = json.loads((UNITS / 'sheets.json').read_text())
TONED = json.loads((ROOT / 'tools/heritage/sheets.json').read_text())
BG = (104, 108, 112, 255)   # a neutral mid grey: neither the board's green nor a menu's dark
ZOOM = 3


def heroes():
    src = (ROOT / 'src/sim/units.ts').read_text()
    defs = {m.group(1): (m.group(2), float(m.group(3))) for m in re.finditer(
        r"\n  (\w+): \{ id: '\w+', name: '[^']*', side: 'hero', sheet: '(\w+)', scale: ([\d.]+)", src)}
    order = re.search(r"export const ALL_HEROES[^=]*= \[\.\.\.HEROES, ([^\]]*)\]", src).group(1)
    ids = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard'] + re.findall(r"'(\w+)'", order)
    names = dict(re.findall(r"^  (\w+): \{ name: '([^']*)'", (ROOT / 'src/sim/heroNames.ts').read_text(), re.M))
    return [(i, names.get(i, i), *defs[i]) for i in ids if i in defs]


def idle(sheet):
    e = LAYOUT[sheet]
    im = Image.open(UNITS / f'{TONED.get(sheet, sheet)}.png').convert('RGBA')
    r = e['rows'].index('idle')
    f = im.crop((0, r * e['h'], e['w'], (r + 1) * e['h']))
    return f.crop(f.getbbox())


def lay(figs, per, out):
    cw = max(f.width for _, f in figs) + 14
    rh = max(f.height for _, f in figs) + 30
    rows = (len(figs) + per - 1) // per
    img = Image.new('RGBA', (per * cw, rows * rh), BG)
    d = ImageDraw.Draw(img)
    for n, (label, f) in enumerate(figs):
        x, y = (n % per) * cw, (n // per) * rh
        img.alpha_composite(f, (x + (cw - f.width) // 2, y + rh - 26 - f.height))
        d.text((x + 4, y + rh - 24), label[0][:18], fill=(255, 255, 255, 255))
        d.text((x + 4, y + rh - 12), label[1][:18], fill=(200, 205, 210, 255))
    img.convert('RGB').save(out)
    print(out, img.size)


def main():
    args = sys.argv[1:]
    only = args[args.index('--only') + 1:] if '--only' in args else None
    out = Path(args[0]) if args and args[0] != '--only' else ROOT / 'docs/samples/inti-minh-art'
    out.mkdir(parents=True, exist_ok=True)
    front, back, native = [], [], []
    for hid, name, sheet, scale in heroes():
        if only and hid not in only:
            continue
        f = idle(sheet)
        k = scale * ZOOM
        size = lambda im: im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.Resampling.NEAREST)
        front.append(((name, hid), size(f)))
        native.append(((name, hid), f))
        rear = LAYOUT[sheet].get('rear')
        if rear:
            back.append(((name, hid), size(idle(rear))))
    per = 10 if not only else len(front)
    lay(front, per, out / 'front.png')
    lay(native, per, out / 'native.png')
    if back:
        lay(back, per, out / 'back.png')


if __name__ == '__main__':
    main()
