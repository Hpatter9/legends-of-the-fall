"""Reskin one of the game's battle sheets with PixelLab, frame by frame (PIXELLAB-ART).

A piece in pieces.json names a source sheet (its layout in src/art/units/sheets.json), a key frame and what changes. The key frame is
made first (edit-images-v2 on one source frame), then every frame of every row is carried over with transfer-outfit-v2, the key as
its reference, so each frame keeps the source's pose, motion, size in the cell and facing. Each batch's frames are kept under
art-source/pixellab/<piece>/ so a rerun only asks for what is missing. The sheet is written with the source's own layout.

  python3 tools/pixellab/reskin.py <piece> [<piece> ...]      (python3 tools/pixellab/reskin.py --list)
"""
import json, os, sys
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
from pl import call, b64, images_of  # noqa: E402

PIECES = json.load(open(os.path.join(HERE, 'pieces.json')))
SHEETS = json.load(open(os.path.join(ROOT, 'src/art/units/sheets.json')))


def per_call(w, h):
    m = max(w, h)
    return 15 if m <= 64 else 8 if m <= 80 else 3


def clean(img):
    """Hard pixel edges: alpha to 0 or 255."""
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            px[x, y] = (r, g, b, 255) if a >= 128 else (0, 0, 0, 0)
    return img


def hue(img, deg):
    """A kept source frame turned round the colour wheel (a wisp of blue foxfire made green, say); grey and alpha kept."""
    import colorsys
    out = img.copy(); px = out.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            if not a: continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            r2, g2, b2 = colorsys.hsv_to_rgb((h + deg / 360) % 1, s, v)
            px[x, y] = (round(r2 * 255), round(g2 * 255), round(b2 * 255), a)
    return out


def frames_of(name, lay):
    sh = Image.open(os.path.join(ROOT, 'src/art/units', name + '.png')).convert('RGBA')
    w, h, per = lay['w'], lay['h'], lay['perRow']
    out = []  # (row, i, image)
    if 'rows' in lay:
        for r, row in enumerate(lay['rows']):
            for i in range(lay['counts'][row]):
                k = i % per; rr = r + i // per
                out.append((row, i, sh.crop((k * w, rr * h, k * w + w, rr * h + h))))
    return sh, out


def run(piece):
    p = PIECES[piece]
    src = p['source']; lay = SHEETS[src]
    w, h = lay['w'], lay['h']
    d = os.path.join(ROOT, 'art-source/pixellab', piece); os.makedirs(d, exist_ok=True)
    sh, frames = frames_of(src, lay)
    keyp = os.path.join(d, 'key.png')
    if not os.path.exists(keyp):
        row, i = p.get('keyFrame', [lay['rows'][2] if len(lay['rows']) > 2 else lay['rows'][0], 0])
        f = next(fr for (r, j, fr) in frames if r == row and j == i)
        res = call('/edit-images-v2', {'method': 'edit_with_text', 'edit_images': [{'image': b64(f), 'width': w, 'height': h}],
                                       'image_size': {'width': w, 'height': h}, 'description': p['key'], 'no_background': True,
                                       'seed': p.get('seed', 1)}, piece, 'key frame', refs=[f'src/art/units/{src}.png {row} {i}'])
        clean(images_of(res)[0]).save(keyp)
    key = Image.open(keyp).convert('RGBA')
    n = per_call(w, h)
    batches = []
    for row in lay['rows']:
        if not lay['counts'][row]: continue
        fr = [(r, i, f) for (r, i, f) in frames if r == row and f'{r}_{i:02d}' not in p.get('keepSource', [])]
        for s in range(0, len(fr), n):
            batches.append((row, s, fr[s:s + n]))

    # (a frame the source draws as no figure, only its effect, e.g. the last of a fade, is kept as the source drew it)
    for (row, i, f) in frames:
        if f'{row}_{i:02d}' in p.get('keepSource', []):
            if 'keepHue' in p: f = hue(f, p['keepHue'])
            f.save(os.path.join(d, f'{row}_{i:02d}.png'))

    def do(b):
        row, s, fr = b
        outs = [os.path.join(d, f'{row}_{i:02d}.png') for (_, i, _) in fr]
        if all(os.path.exists(o) for o in outs): return
        if len(fr) == 1:  # the API takes two frames at least: pair it with itself
            fr = fr + fr
        body = {'reference_image': {'image': b64(key), 'size': {'width': w, 'height': h}},
                'frames': [{'image': b64(f), 'size': {'width': w, 'height': h}} for (_, _, f) in fr],
                'image_size': {'width': w, 'height': h}, 'no_background': True, 'seed': p.get('seed', 1) + s,
                'additional_instructions': p.get('extra', 'keep each frame\'s pose, size and position exactly; side view facing right')}
        res = call('/transfer-outfit-v2', body, piece, f'{row} {s}', refs=[f'src/art/units/{src}.png {row}', keyp])
        ims = images_of(res)
        for o, im in zip(outs, ims):
            clean(im).save(o)
    with ThreadPoolExecutor(4) as ex:
        list(ex.map(do, batches))
    out = Image.new('RGBA', sh.size, (0, 0, 0, 0))
    for r, row in enumerate(lay['rows']):
        for i in range(lay['counts'][row]):
            k = i % lay['perRow']; rr = r + i // lay['perRow']
            out.paste(Image.open(os.path.join(d, f'{row}_{i:02d}.png')), (k * w, rr * h))
    dest = os.path.join(ROOT, 'src/art/units', p['out'] + '.png')
    out.save(dest, optimize=True)
    print(piece, '->', os.path.relpath(dest, ROOT), out.size)


if __name__ == '__main__':
    if sys.argv[1:] == ['--list']:
        print('\n'.join(PIECES)); sys.exit()
    for a in sys.argv[1:]:
        run(a)
