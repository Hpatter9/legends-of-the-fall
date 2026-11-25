"""Register a reskinned battle sheet beside its source (PIXELLAB-ART): its layout in src/art/units/sheets.json (the source's own
grid; `figure` measured), and its import and URLS entry in src/render/sheets.ts. The foe's or summon's `sheet:` and KIN_SHEET are
changed by hand; then run python3 tools/emit-points/reach.py.

  python3 tools/pixellab/wire.py <new> <source> [<new> <source> ...]
"""
import json, os, re, sys
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
SJ = os.path.join(ROOT, 'src/art/units/sheets.json')
TS = os.path.join(ROOT, 'src/render/sheets.ts')


def figure(name, lay):
    """The tallest drawn figure in the idle row (as `figure` is measured for the other sheets)."""
    im = Image.open(os.path.join(ROOT, 'src/art/units', name + '.png')).convert('RGBA')
    r = lay['rows'].index('idle') if 'idle' in lay['rows'] else 0
    best = 0
    for i in range(lay['counts'][lay['rows'][r]]):
        k = i % lay['perRow']; rr = r + i // lay['perRow']
        bb = im.crop((k * lay['w'], rr * lay['h'], (k + 1) * lay['w'], (rr + 1) * lay['h'])).getbbox()
        if bb: best = max(best, bb[3] - bb[1])
    return best


def camel(s):
    return 'pl' + ''.join(p.capitalize() for p in s.split('_'))


def wire(new, src):
    d = json.load(open(SJ))
    lay = {k: v for k, v in d[src].items() if k not in ('rear', 'front')}
    lay = json.loads(json.dumps(lay))
    lay['figure'] = figure(new, lay)
    d[new] = lay
    open(SJ, 'w').write(json.dumps(d, indent=1) + '\n')
    s = open(TS).read()
    v = camel(new)
    if f"/{new}.png'" not in s:
        last = list(re.finditer(r"^import .* from '\.\./art/units/.*\.png';\n", s, re.M))[-1]
        s = s[:last.end()] + f"import {v} from '../art/units/{new}.png';\n" + s[last.end():]
        s = s.replace('const URLS: Record<string, string> = {\n', f'const URLS: Record<string, string> = {{\n  {new}: {v},\n', 1)
        open(TS, 'w').write(s)
    print(new, 'figure', lay['figure'], 'source figure', d[src].get('figure'))


if __name__ == '__main__':
    a = sys.argv[1:]
    for i in range(0, len(a), 2): wire(a[i], a[i + 1])
