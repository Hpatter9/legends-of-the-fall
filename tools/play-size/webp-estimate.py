# PLAY-SIZE (docs/notes/play-size.md), part C: what re-encoding the shipped PNGs as WebP would save, measured, not done (re-encoding
# the art is the owner's job, picture by picture). Every PNG in the built page (out/web, the files the app and the bundle carry) is
# encoded in memory as lossy WebP at quality 90 and as lossless WebP, and the totals printed, split by a rough guess at what each
# picture is: a "painting" (many colours, soft edges: lossy is fine) or "pixel art" (few colours, hard edges: lossless only).
#
#   npm run web && python3 tools/play-size/webp-estimate.py [out/web]
import io
import os
import sys
from concurrent.futures import ProcessPoolExecutor

from PIL import Image

ROOT = sys.argv[1] if len(sys.argv) > 1 else 'out/web'
# (more distinct colours than this in a sample of the picture reads as a painting)
PAINTING_COLOURS = 4096


def measure(path):
    raw = os.path.getsize(path)
    im = Image.open(path)
    im.load()
    im = im.convert('RGBA')
    sample = im if im.width * im.height <= 1 << 20 else im.resize((im.width // 2, im.height // 2), Image.NEAREST)
    colours = sample.getcolors(maxcolors=PAINTING_COLOURS + 1)
    painting = colours is None
    out = {}
    for name, kw in (('lossy90', {'quality': 90, 'method': 4}), ('lossless', {'lossless': True, 'quality': 100, 'method': 4})):
        buf = io.BytesIO()
        im.save(buf, 'WEBP', **kw)
        out[name] = buf.tell()
    return path, raw, painting, out


def main():
    pngs = [os.path.join(d, f) for d, _, fs in os.walk(ROOT) for f in fs if f.endswith('.png')]
    totals = {}
    with ProcessPoolExecutor() as pool:
        for path, raw, painting, out in pool.map(measure, pngs, chunksize=4):
            kind = 'painting' if painting else 'pixel art'
            t = totals.setdefault(kind, {'n': 0, 'raw': 0, 'lossy90': 0, 'lossless': 0})
            t['n'] += 1
            t['raw'] += raw
            for k, v in out.items():
                t[k] += v
    mb = lambda n: f'{n / 1e6:.1f} MB'
    for kind, t in totals.items():
        print(f"{kind:10} {t['n']:5} PNGs  {mb(t['raw']):>9}  lossy WebP q90 {mb(t['lossy90']):>9} ({100 * (t['lossy90'] / t['raw'] - 1):+.0f}%)"
              f"  lossless WebP {mb(t['lossless']):>9} ({100 * (t['lossless'] / t['raw'] - 1):+.0f}%)")
    p, a = totals.get('painting'), totals.get('pixel art')
    if p and a:
        best = p['lossy90'] + a['lossless']
        raw = p['raw'] + a['raw']
        print(f"paintings lossy, pixel art lossless: {mb(raw)} -> {mb(best)} ({100 * (best / raw - 1):+.0f}%), saving {mb(raw - best)}")


if __name__ == '__main__':
    main()
