"""SUMMON-SHOW: the pixelated finish for the summoning's pieces (show.py), packed as the sheets the summoning screen loads.

Run: python3 tools/blender-fx/summon/finish.py <rendered dir> [<sheets dir>]        (default src/art/fx/summon)

Each frame is shrunk to the game's pixels (a box filter from twice the size), its colours cut to one palette of 32 shared by every
piece, and its alpha made hard: a bright pixel is there or not, a dim one keeps one of three flat steps of see-through (the pool of light
on the floor, the soft edges of the column). Each piece is cut to the smallest box that holds all its frames and laid out as a sheet of
frames in rows (lossless WebP); the column's and the burst's pieces also keep a glow sheet (a quarter of the size, the light under their
brightest parts, lossy), drawn smoothed under the pixels. The manifest, src/render/summonFxData.ts, is written here (generated), with each
sheet's cell, its place in the full frame, its frame count and time; a test checks it against the files. A contact sheet goes beside
the frames.
"""
import glob, json, os, sys
import numpy as np
from PIL import Image, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
args = sys.argv[1:]
SRC = args[0]
OUT = args[1] if len(args) > 1 else 'src/art/fx/summon'
DATA = 'src/render/summonFxData.ts'
COLOURS = 32
LUM = np.array([0.3, 0.59, 0.11], dtype=np.float32)

# Each piece: its full frame (px, as show.py's PARTS), ms a frame, whether it loops, and whether it keeps a glow sheet.
PIECES = {
    'charge': (176, 240, 100, False, True),
    'rift': (176, 240, 84, False, True),
    'burst': (176, 240, 90, False, True),
    'after': (176, 240, 100, True, False),
    'flourish': (112, 144, 75, False, True),
}


def shrink(path, w, h):
    a = np.asarray(Image.open(path).convert('RGBA'), dtype=np.float32) / 255
    a[..., :3] *= a[..., 3:]
    im = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8), 'RGBA').resize((w, h), Image.BOX)
    p = np.asarray(im, dtype=np.float32) / 255
    al = p[..., 3]
    rgb = np.where(al[..., None] > 0.001, p[..., :3] / np.maximum(al[..., None], 0.001), 0)
    return np.clip(rgb, 0, 1), al


def harden(rgb, a):
    bright = (rgb @ LUM) * a > 0.3
    hard = np.where(a >= 0.35, 1.0, 0.0)
    steps = np.select([a < 0.1, a < 0.3, a < 0.55], [0.0, 0.3, 0.55], 0.8)
    return np.where(bright, hard, steps)


frames = {}
for name, (w, h, *_rest) in PIECES.items():
    files = sorted(glob.glob(os.path.join(SRC, name, '[0-9][0-9][0-9].png')))
    if not files:
        sys.exit(f'no frames for {name} in {SRC}')
    frames[name] = [shrink(f, w, h) for f in files]
pool = np.concatenate([rgb[harden(rgb, a) > 0] for fs in frames.values() for rgb, a in fs])
pool_im = Image.fromarray((pool[: (len(pool) // 256) * 256].reshape(-1, 256, 3) * 255).astype(np.uint8), 'RGB')
palette = pool_im.quantize(colors=COLOURS, method=Image.MEDIANCUT, kmeans=3)

os.makedirs(OUT, exist_ok=True)
for old in glob.glob(os.path.join(OUT, '*.webp')):
    os.remove(old)
total = 0
manifest = {}
contact = []
for name, (fw, fh, ms, loop, keep_glow) in PIECES.items():
    fs = frames[name]
    hard = [harden(rgb, a) for rgb, a in fs]
    # (the box that holds every frame, so the sheet carries no empty margins)
    seen = np.any(np.stack(hard) > 0, axis=0)
    ys, xs = np.nonzero(seen)
    x0, x1, y0, y1 = int(xs.min()), int(xs.max()) + 1, int(ys.min()), int(ys.max()) + 1
    w, h = x1 - x0, y1 - y0
    cols = max(1, min(len(fs), 2048 // w))
    rows = -(-len(fs) // cols)
    cols = -(-len(fs) // rows)                                             # (rows filled evenly: no empty row end)
    sheet = Image.new('RGBA', (w * cols, h * rows), (0, 0, 0, 0))
    for i, ((rgb, a), aa) in enumerate(zip(fs, hard)):
        q = Image.fromarray((rgb * 255).astype(np.uint8), 'RGB').quantize(palette=palette, dither=Image.NONE).convert('RGB')
        px = np.dstack([np.asarray(q), (aa * 255).astype(np.uint8)])
        px[aa == 0] = 0
        sheet.paste(Image.fromarray(px[y0:y1, x0:x1], 'RGBA'), ((i % cols) * w, (i // cols) * h))
    path = os.path.join(OUT, f'{name}.webp')
    sheet.save(path, lossless=True, method=6)
    size = os.path.getsize(path)
    total += size
    entry = {'file': f'{name}.webp', 'fw': fw, 'fh': fh, 'x': x0, 'y': y0, 'w': w, 'h': h, 'cols': cols, 'n': len(fs), 'ms': ms, 'loop': loop}
    if keep_glow:
        gw, gh = -(-w // 4), -(-h // 4)
        gsheet = Image.new('RGBA', (gw * cols, gh * rows), (0, 0, 0, 0))
        for i, (rgb, a) in enumerate(fs):
            lit = rgb * a[..., None]
            hot = lit * np.clip((lit @ LUM - 0.3) * 2.5, 0, 1)[..., None]
            crop = Image.fromarray((np.clip(hot, 0, 1) * 255).astype(np.uint8), 'RGB').crop((x0, y0, x1, y1))
            g = np.asarray(crop.filter(ImageFilter.GaussianBlur(7)).resize((gw, gh), Image.BILINEAR), dtype=np.float32) / 255
            ga = g.max(axis=2)
            grgb = np.where(ga[..., None] > 0.004, g / np.maximum(ga[..., None], 0.004), 0)
            gsheet.paste(Image.fromarray((np.dstack([np.clip(grgb, 0, 1), np.clip(ga * 1.3, 0, 1)]) * 255).astype(np.uint8), 'RGBA'), ((i % cols) * gw, (i // cols) * gh))
        gpath = os.path.join(OUT, f'{name}-glow.webp')
        gsheet.save(gpath, quality=78, alpha_quality=80, method=6)
        gsize = os.path.getsize(gpath)
        total += gsize
        entry['glow'] = f'{name}-glow.webp'
        print(f'{name}-glow: {gsheet.width} x {gsheet.height}, {gsize} bytes')
    manifest[name] = entry
    contact.append(sheet)
    print(f'{name}: {len(fs)} frames of {w} x {h} (in {fw} x {fh} at {x0},{y0}), sheet {sheet.width} x {sheet.height}, {size} bytes')
print('total', total, 'bytes')

with open(DATA, 'w') as f:
    f.write('// Generated by tools/blender-fx/summon/finish.py (SUMMON-SHOW, docs/notes/summon-show.md): do not edit by hand.\n')
    f.write('// Each piece of the summoning\'s show: its sheet (and glow sheet) under fx/summon/, its full frame (fw x fh), the box of it the\n')
    f.write('// sheet keeps (x, y, w, h), frames to a row, frames, ms a frame and whether it loops.\n\n')
    f.write('export interface SummonPiece { file: string; glow?: string; fw: number; fh: number; x: number; y: number; w: number; h: number; cols: number; n: number; ms: number; loop: boolean }\n\n')
    f.write('export type SummonPieceId = ' + ' | '.join(f"'{k}'" for k in manifest) + ';\n\n')
    f.write('export const SUMMON_FX: Readonly<Record<SummonPieceId, SummonPiece>> = {\n')
    for k, v in manifest.items():
        f.write(f'  {k}: {json.dumps(v, separators=(", ", ": "))},\n'.replace('"file"', 'file').replace('"glow"', 'glow').replace('"fw"', 'fw').replace('"fh"', 'fh').replace('"x"', 'x').replace('"y"', 'y').replace('"w"', 'w').replace('"h"', 'h').replace('"cols"', 'cols').replace('"n"', 'n').replace('"ms"', 'ms').replace('"loop"', 'loop').replace('"', "'"))
    f.write('};\n')

cw = max(c.width for c in contact)
sheet = Image.new('RGB', (cw, sum(c.height + 4 for c in contact)), (24, 44, 34))
y = 0
for c in contact:
    sheet.paste(c, (0, y), c)
    y += c.height + 4
sheet.save(os.path.join(SRC, 'contact.png'))
