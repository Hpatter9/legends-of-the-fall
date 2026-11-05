"""Pack the twenty new heroes' painted battle frames into the game's sheet grid (docs/notes/twenty-heroes-art-prompts.md).

ChatGPT paints every animation frame as its own transparent PNG on a fixed canvas, because it cannot keep an exact pixel grid. This
script does the grid: it crops, scales, aligns and packs those frames into sheets laid out like main's `hero_res_*` and `awakened_*`
sheets (four cells a row; rows idle 4, walk 8 over two rows, attack 4, hurt 4, dead 4, attack2 4; the idle figure 96 px tall, the
feet on the cell's bottom row, facing right, hard alpha), and writes their entries in `sheets.json` and the awakened manifest.

The frames, for each hero and form (`front`, `back`, `awakened-front`, `awakened-back`):

    art-source/heroes-20/sprites/<id>/<form>/<row>-<n>.png      e.g. sprites/vampireLord/front/walk-3.png

on a CANVAS x CANVAS transparent canvas, the ground line at y = BASELINE, the figure's standing centre at x = CANVAS / 2.

    python3 tools/heroes-20/pack-sheets.py vampireLord [hemomancer ...]     pack those heroes (all forms that are complete)
    python3 tools/heroes-20/pack-sheets.py --check vampireLord              only check the frames; write nothing
    python3 tools/heroes-20/pack-sheets.py --all                            every hero that has frames

Since the owner's image budget (about 100 a day) does not stretch to one image a frame, a view can also come as a whole reference
sheet, or as three strips (docs/notes/twenty-heroes-art-prompts.md, "Sheet prompts"):

    art-source/heroes-20/sheets/<id>/<view>.png                 one image a view (`front`, `back`): every pose of the view, in rows,
                                                                in order: idle 4, walk 8, attack 4, hurt 4, dead 4, attack2 4
    art-source/heroes-20/sheets/<id>/<view>-<strip>.png         the fallback, three images a view: `idle-walk` (idle 4, walk 8),
                                                                `attacks` (a standing figure for size, attack 4, attack2 4) and
                                                                `hurt-dead` (a standing figure for size, hurt 4, dead 4)

The spacing is loose: each figure is found as a connected shape (a sword or a cape tip a little apart joins its body), the figures are
put in rows by where their feet stand and read left to right, and the n-th figure is the n-th pose. A view's figures share one scale
(its idle figures' middle height becomes 96 px, so front and back come out the same size whatever size each image was painted at),
and each figure stands with the middle of its feet on the cell's centre and its lowest point on the cell's bottom row. A sheet painted
on a plain or checked backdrop instead of transparency has the backdrop keyed out from its edges. Single frames under sprites/ (above)
fill or override a sheet's frames one by one, so frames already painted are kept. The awakened forms come only as single frames
(the awakened sheets are deferred, docs/notes/twenty-heroes.md).

    python3 tools/heroes-20/pack-sheets.py --check vampireLord               also prints what was found in each sheet, row by row
    python3 tools/heroes-20/pack-sheets.py --found <dir> vampireLord         also writes each sheet with its figures boxed and numbered

The six code-drawn frame sets on the branches art/heroes-20-sprites-{hemomancer,bloodGargoyle,dhampir,banneret,geomancer,bellWarden}
are not used (the director's call): those heroes' single frames are ignored, and their sprites come from sheets.

The painted frames are never changed. Each packed sheet also gets a contact image in docs/samples/heroes-20/ (the sheet at 3x on a
grey ground, with its grid) for checking by eye. New sheets still need importing in `src/render/sheets.ts` (and the awakened art's
loader), crediting in CREDITS.md and listing wherever main lists the other heroes' sheets.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'art-source' / 'heroes-20' / 'sprites'
UNITS = ROOT / 'src' / 'art' / 'units'
AWAKENED = ROOT / 'src' / 'art' / 'awakened'
SAMPLES = ROOT / 'docs' / 'samples' / 'heroes-20'

CANVAS = 1024
BASELINE = 900
CENTRE = CANVAS // 2
FIGURE = 96  # the idle figure's height in the sheet, as main's
PER_ROW = 4
# the rows in the sheet's order and the frames each needs (walk takes two sheet rows: the second is `_walk`)
ROWS = [('idle', 4), ('walk', 8), ('attack', 4), ('hurt', 4), ('dead', 4), ('attack2', 4)]
FORMS = ['front', 'back', 'awakened-front', 'awakened-back']
HEROES = ['vampireLord', 'hemomancer', 'nightstalker', 'bloodGargoyle', 'dhampir', 'warDrummer', 'banneret', 'geomancer',
          'bellWarden', 'falconer', 'astralSphinx', 'mirageDancer', 'plagueDoctor', 'bombardier', 'astrologer', 'inquisitor',
          'seraph', 'corsairSurgeon', 'harpooner', 'seaReaver']
SHEETS = ROOT / 'art-source' / 'heroes-20' / 'sheets'
VIEWS = ['front', 'back']  # the views a sheet or strips can give (the plain hero's; the awakened forms are deferred)
# (the two strips with no idle begin with one plain standing figure, `ref`, painted at the strip's scale: measured for the scale, then dropped)
STRIPS = [('idle-walk', [('idle', 4), ('walk', 8)]), ('attacks', [('ref', 1), ('attack', 4), ('attack2', 4)]), ('hurt-dead', [('ref', 1), ('hurt', 4), ('dead', 4)])]
CODE_DRAWN = {'hemomancer', 'bloodGargoyle', 'dhampir', 'banneret', 'geomancer', 'bellWarden'}  # their single frames are not used
NOMINAL = 600  # a single frame's standing figure, soles to head, as the frame prompts ask (when the view has no idle-1 of its own)
ALPHA_CUT = 128  # alpha at or above this is solid; below it is clear (main's sheets are 0 or 255)
SPECK = 6  # a solid island this many pixels or fewer, away from the figure, is dropped


def snake(s: str) -> str:
    return re.sub(r'([A-Z])', lambda m: '_' + m.group(1).lower(), s)


def sheet_name(hero: str, form: str) -> str:
    back = form.endswith('back')
    base = f'awakened_{hero}' if form.startswith('awakened') else f'hero_res_{snake(hero)}'
    return base + ('_back' if back else '')


FRAMES = [(row, n) for row, count in ROWS for n in range(1, count + 1)]


def frame_paths(hero: str, form: str) -> list[tuple[str, int, Path]]:
    return [(row, n, SRC / hero / form / f'{row}-{n}.png') for row, n in FRAMES]


def check_frame(path: Path) -> list[str]:
    """The faults of one painted frame: size, transparency, the figure on the canvas."""
    faults = []
    im = Image.open(path)
    if im.size != (CANVAS, CANVAS):
        faults.append(f'{path.name}: {im.size[0]}x{im.size[1]}, not {CANVAS}x{CANVAS}')
    a = np.array(im.convert('RGBA'))[..., 3]
    if max(a[0, 0], a[0, -1], a[-1, 0], a[-1, -1]) >= 8:
        faults.append(f'{path.name}: the corners are not transparent (a backdrop?)')
    if (a >= ALPHA_CUT).sum() == 0:
        faults.append(f'{path.name}: empty')
        return faults
    ys = np.nonzero((a >= ALPHA_CUT).any(axis=1))[0]
    if ys.max() > BASELINE + 24:
        faults.append(f'{path.name}: the figure reaches y={ys.max()}, below the ground line ({BASELINE})')
    edge = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    if (edge >= ALPHA_CUT).any():
        faults.append(f'{path.name}: the figure touches the canvas edge (cut off?)')
    return faults


def check(hero: str, form: str) -> tuple[list[str], list[str]]:
    """(missing frames, faults) for one hero's form."""
    missing, faults = [], []
    for row, n, p in frame_paths(hero, form):
        if not p.exists():
            missing.append(f'{row}-{n}')
        else:
            faults += check_frame(p)
    return missing, faults


def drop_specks(solid: np.ndarray) -> np.ndarray:
    """Clear the small solid islands (4-connected) of `SPECK` pixels or fewer: stray flecks left by the scaling."""
    h, w = solid.shape
    seen = np.zeros_like(solid, dtype=bool)
    out = solid.copy()
    for y0, x0 in zip(*np.nonzero(solid)):
        if seen[y0, x0]:
            continue
        stack, island = [(y0, x0)], []
        seen[y0, x0] = True
        while stack:
            y, x = stack.pop()
            island.append((y, x))
            for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= yy < h and 0 <= xx < w and solid[yy, xx] and not seen[yy, xx]:
                    seen[yy, xx] = True
                    stack.append((yy, xx))
        if len(island) <= SPECK:
            for y, x in island:
                out[y, x] = False
    return out


def contact(sheet: Image.Image, entry: dict, out: Path) -> None:
    big = sheet.resize((sheet.width * 3, sheet.height * 3), Image.Resampling.NEAREST)
    ground = Image.new('RGBA', big.size, (74, 74, 86, 255))
    ground.alpha_composite(big)
    d = ImageDraw.Draw(ground)
    for x in range(0, big.width + 1, entry['w'] * 3):
        d.line([(x, 0), (x, big.height)], fill=(220, 70, 70, 255))
    for y in range(0, big.height + 1, entry['h'] * 3):
        d.line([(0, y), (big.width, y)], fill=(220, 70, 70, 255))
    out.parent.mkdir(parents=True, exist_ok=True)
    ground.convert('RGB').save(out, optimize=True)


def write_json(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, indent=1))  # main's files: one-space indent, no newline at the end


def repad(im: Image.Image, e: dict, w: int, h: int) -> tuple[Image.Image, dict]:
    """Re-lay a packed sheet into larger cells, the figure kept centred and on the bottom row."""
    rows = len(e['rows'])
    out = Image.new('RGBA', (w * PER_ROW, h * rows), (0, 0, 0, 0))
    for r in range(rows):
        for c in range(PER_ROW):
            cell = im.crop((c * e['w'], r * e['h'], (c + 1) * e['w'], (r + 1) * e['h']))
            out.paste(cell, (c * w + (w - e['w']) // 2, r * h + (h - e['h'])))
    return out, {**e, 'w': w, 'h': h}




# ---- a painted frame, ready to pack: the scaled figure and its anchor (the point that goes on the cell's centre and bottom row) ----

class Frame:
    def __init__(self, im: Image.Image, ax: float, ay: float, source: str):
        self.im, self.ax, self.ay, self.source = im, ax, ay, source


def harden(im: Image.Image) -> Image.Image:
    """Alpha made hard (0 or 255) and the specks dropped, as main's sheets."""
    px = np.array(im.convert('RGBA'))
    solid = drop_specks(px[..., 3] >= ALPHA_CUT)
    px[..., 3] = np.where(solid, 255, 0)
    px[~solid, :3] = 0
    return Image.fromarray(px)


def single_frame(path: Path, k: float) -> Frame:
    """A single painted frame on its 1024 canvas, scaled by `k`: the canvas's centre and ground line are its anchor, so its own shifts
    (a lunge, a fall) are kept."""
    im = Image.open(path).convert('RGBA')
    size = round(CANVAS * k)
    small = harden(im.resize((size, size), Image.Resampling.LANCZOS))  # Pillow scales RGBA premultiplied, so edges keep their colour
    return Frame(small, CENTRE * k, BASELINE * k, path.relative_to(ROOT).as_posix())


def canvas_height(path: Path) -> int:
    """A single frame's standing figure height on its canvas: from its top to the ground line."""
    a = np.array(Image.open(path).convert('RGBA'))[..., 3]
    ys = np.nonzero((a >= ALPHA_CUT).any(axis=1))[0]
    return BASELINE - int(ys.min())


# ---- the figures in a reference sheet or strip ----

COARSE = 4  # the figures are found on a grid this many times coarser than the image


def keyed(px: np.ndarray) -> tuple[np.ndarray, list[str]]:
    """The image's alpha, with a backdrop keyed out if it has one (its corners not transparent): the pixels near a colour of the image's
    edge (a plain backdrop, or the two greys of a painted checkerboard) that join the edge are made clear."""
    notes = []
    a = px[..., 3].astype(np.int32)
    if max(a[0, 0], a[0, -1], a[-1, 0], a[-1, -1]) < 8:
        return a, notes
    rgb = px[..., :3].astype(np.int32)
    edge = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
    q = (edge // 16).reshape(-1, 3)
    keys, counts = np.unique(q[:, 0] * 256 + q[:, 1] * 16 + q[:, 2], return_counts=True)
    top = keys[np.argsort(-counts)][:4]
    colours = [np.median(edge[(q[:, 0] * 256 + q[:, 1] * 16 + q[:, 2]) == t], axis=0) for t in top if counts[keys == t][0] > len(edge) * 0.05]
    near = np.zeros(a.shape, bool)
    for c in colours:
        near |= (np.abs(rgb - c).sum(axis=2) <= 48)
    # (which of those join the edge: grown from the edge on the coarse grid, then kept at full size where near)
    h, w = a.shape
    cn = near[: h - h % COARSE, : w - w % COARSE].reshape(h // COARSE, COARSE, w // COARSE, COARSE).all(axis=(1, 3))
    reach = np.zeros_like(cn)
    reach[0, :], reach[-1, :], reach[:, 0], reach[:, -1] = cn[0, :], cn[-1, :], cn[:, 0], cn[:, -1]
    while True:
        grown = reach.copy()
        grown[1:] |= reach[:-1]; grown[:-1] |= reach[1:]; grown[:, 1:] |= reach[:, :-1]; grown[:, :-1] |= reach[:, 1:]
        grown &= cn
        if (grown == reach).all():
            break
        reach = grown
    big = np.zeros(a.shape, bool)
    big[: h - h % COARSE, : w - w % COARSE] = np.repeat(np.repeat(reach, COARSE, axis=0), COARSE, axis=1)
    # (a pixel next to the cleared backdrop and near its colour goes too: the coarse grid's fringe)
    fringe = np.zeros_like(big)
    fringe[1:] |= big[:-1]; fringe[:-1] |= big[1:]; fringe[:, 1:] |= big[:, :-1]; fringe[:, :-1] |= big[:, 1:]
    for _ in range(COARSE):
        big |= fringe & near
        fringe = big.copy(); fringe[1:] |= big[:-1]; fringe[:-1] |= big[1:]; fringe[:, 1:] |= big[:, :-1]; fringe[:, :-1] |= big[:, 1:]
    a = np.where(big, 0, 255)
    notes.append(f'not transparent: a backdrop of {len(colours)} colour(s) keyed out from the edges (paint it transparent if you can)')
    return a, notes


def figures(solid: np.ndarray) -> list[np.ndarray]:
    """The figures in a sheet: its solid shapes, those a little apart joined (a dilation of about 1.2% of the sheet's height), and the
    flecks too small to be a figure (under a twentieth of the middle figure's area) given to the figure nearest them or dropped. Each
    is returned as a full-size mask."""
    h, w = solid.shape
    H, W = h // COARSE, w // COARSE
    cs = solid[: H * COARSE, : W * COARSE].reshape(H, COARSE, W, COARSE).any(axis=(1, 3))
    r = max(1, round(0.012 * h / COARSE))
    grown = cs.copy()
    for _ in range(r):
        g = grown.copy()
        g[1:] |= grown[:-1]; g[:-1] |= grown[1:]; g[:, 1:] |= grown[:, :-1]; g[:, :-1] |= grown[:, 1:]
        grown = g
    label = np.zeros((H, W), np.int32)
    n = 0
    for y0, x0 in zip(*np.nonzero(grown)):
        if label[y0, x0]:
            continue
        n += 1
        stack = [(y0, x0)]
        label[y0, x0] = n
        while stack:
            y, x = stack.pop()
            for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= yy < H and 0 <= xx < W and grown[yy, xx] and not label[yy, xx]:
                    label[yy, xx] = n
                    stack.append((yy, xx))
    full = np.zeros((h, w), np.int32)
    full[: H * COARSE, : W * COARSE] = np.repeat(np.repeat(label, COARSE, axis=0), COARSE, axis=1)
    full[~solid] = 0
    areas = np.bincount(full.ravel(), minlength=n + 1)
    ids = [i for i in range(1, n + 1) if areas[i] > 0]
    if not ids:
        return []
    mid = float(np.median([areas[i] for i in ids]))
    big = [i for i in ids if areas[i] >= mid / 20]
    boxes = {}
    for i in ids:
        ys, xs = np.nonzero(full == i)
        boxes[i] = (ys.min(), xs.min(), ys.max(), xs.max())
    for i in ids:
        if i in big:
            continue
        y0, x0, y1, x1 = boxes[i]
        cy, cx = (y0 + y1) / 2, (x0 + x1) / 2
        def gap(j):
            b = boxes[j]
            return max(b[0] - cy, cy - b[2], 0) + max(b[1] - cx, cx - b[3], 0)
        near = min(big, key=gap)
        if gap(near) <= 0.06 * h:
            full[full == i] = near
        else:
            full[full == i] = 0
    return [full == i for i in big]


def in_rows(masks: list[np.ndarray]) -> list[list[np.ndarray]]:
    """The figures in rows, top to bottom, each left to right: a figure joins a row when its lowest point is within a third of the middle
    figure's height of the row's (the poses of a row stand on one ground line, a fallen one lying on it)."""
    info = []
    for m in masks:
        ys, xs = np.nonzero(m)
        info.append((int(ys.max()), int(ys.max() - ys.min() + 1), float(xs.mean()), m))
    if not info:
        return []
    tall = float(np.median([t for _, t, _, _ in info]))
    info.sort(key=lambda x: x[0])
    rows, last = [], None
    for f in info:
        if last is None or f[0] - last > tall / 3:
            rows.append([])
        rows[-1].append(f)
        last = f[0]
    return [[m for _, _, _, m in sorted(r, key=lambda x: x[2])] for r in rows]


def sheet_frames(path: Path, wanted: list[tuple[str, int]]) -> tuple[dict, list[str], list[str]]:
    """The figures of one sheet or strip, matched to `wanted` (the poses in order), unscaled: {(row, n): (image, anchor x, anchor y,
    height)}, and the notes and faults. A count that does not match is a fault, and nothing is taken from the sheet."""
    px = np.array(Image.open(path).convert('RGBA'))
    a, notes = keyed(px)
    rows = in_rows(figures(a >= ALPHA_CUT))
    found = [m for r in rows for m in r]
    notes.append(f'{len(found)} figures in {len(rows)} rows ({", ".join(str(len(r)) for r in rows)})')
    if len(found) != len(wanted):
        return {}, notes, [f'{path.name}: {len(found)} figures found, {len(wanted)} wanted ({", ".join(f"{r} {c}" for r, c in counts_of(wanted))}): '
                           'are some figures touching, or a pose split in two? (--found draws what was found)']
    out = {}
    clean = px.copy()
    clean[..., 3] = np.where(a >= ALPHA_CUT, 255, 0)
    for (row, n), m in zip(wanted, found):
        ys, xs = np.nonzero(m)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        cut = clean[y0:y1, x0:x1].copy()
        cut[~m[y0:y1, x0:x1]] = 0
        # (the anchor: the middle of the feet, the figure's lowest eighth, and its lowest point)
        low = ys >= y1 - max(2, (y1 - y0) // 8)
        out[(row, n)] = (Image.fromarray(cut), float(xs[low].mean()) - x0, float(y1 - y0), int(y1 - y0))
    return out, notes, []


def counts_of(wanted: list[tuple[str, int]]) -> list[tuple[str, int]]:
    out: list[tuple[str, int]] = []
    for row, _ in wanted:
        if out and out[-1][0] == row:
            out[-1] = (row, out[-1][1] + 1)
        else:
            out.append((row, 1))
    return out


def draw_found(path: Path, wanted: list[tuple[str, int]], out: Path) -> None:
    """The sheet with each found figure boxed and labelled with the pose it was taken as, for checking the order by eye."""
    px = np.array(Image.open(path).convert('RGBA'))
    a, _ = keyed(px)
    rows = in_rows(figures(a >= ALPHA_CUT))
    im = Image.new('RGBA', (px.shape[1], px.shape[0]), (74, 74, 86, 255))
    shown = px.copy()
    shown[..., 3] = np.where(a >= ALPHA_CUT, 255, 0)
    im.alpha_composite(Image.fromarray(shown))
    d = ImageDraw.Draw(im)
    found = [m for r in rows for m in r]
    tall = float(np.median([np.ptp(np.nonzero(m.any(axis=1))[0]) for m in found])) if found else 100
    font = ImageFont.load_default(size=max(12, round(tall / 8)))
    for i, m in enumerate(found):
        ys, xs = np.nonzero(m)
        d.rectangle([xs.min(), ys.min(), xs.max(), ys.max()], outline=(240, 200, 40, 255), width=max(2, round(tall / 60)))
        name = ('size reference' if wanted[i][0] == 'ref' else f'{wanted[i][0]}-{wanted[i][1]}') if i < len(wanted) else f'extra {i + 1}'
        d.text((xs.min() + 4, ys.min() + 4), name, fill=(255, 255, 255, 255), font=font, stroke_width=2, stroke_fill=(0, 0, 0, 255))
    out.parent.mkdir(parents=True, exist_ok=True)
    im.convert('RGB').save(out)


def sheet_sources(hero: str, view: str) -> list[tuple[Path, list[tuple[str, int]]]]:
    """The sheet (or the strips) a view has, each with the poses it holds in order."""
    whole = SHEETS / hero / f'{view}.png'
    if whole.exists():
        return [(whole, FRAMES)]
    return [(SHEETS / hero / f'{view}-{name}.png', [(row, n) for row, count in rows for n in range(1, count + 1)])
            for name, rows in STRIPS if (SHEETS / hero / f'{view}-{name}.png').exists()]


def gather(hero: str, form: str, found_dir: Path | None = None) -> tuple[dict, list[str], list[str]]:
    """Every frame a form has, ready to pack: {(row, n): Frame}, with notes and faults. A view's sheet or strips first, then its
    single frames over them."""
    frames: dict = {}
    notes, faults = [], []
    if form in VIEWS:
        for path, wanted in sheet_sources(hero, form):
            got, n, f = sheet_frames(path, wanted)
            notes += [f'{path.name}: {x}' for x in n]
            faults += f
            if found_dir is not None:
                draw_found(path, wanted, found_dir / f'{hero}-{path.stem}.png')
            if not got:
                continue
            # (each image's own scale, as each may be painted at its own size: from its idle figures' middle height, or its standing
            # reference figure's)
            idle = [got[('idle', i)][3] for i in range(1, 5) if ('idle', i) in got]
            k = FIGURE / float(np.median(idle) if idle else got[('ref', 1)][3])
            for key, (im, ax, ay, _) in got.items():
                if key[0] == 'ref':
                    continue
                size = (max(1, round(im.width * k)), max(1, round(im.height * k)))
                frames[key] = Frame(harden(im.resize(size, Image.Resampling.LANCZOS)), ax * k, ay * k, f'{path.name} {key[0]}-{key[1]}')
    singles = [(row, n, p) for row, n, p in frame_paths(hero, form) if p.exists()]
    if singles and hero in CODE_DRAWN:
        notes.append(f'{len(singles)} single frames ignored (a code-drawn set, not used)')
        singles = []
    if singles:
        own = SRC / hero / form / 'idle-1.png'
        k = FIGURE / (canvas_height(own) if own.exists() else NOMINAL)
        for row, n, p in singles:
            f = check_frame(p)
            if f:
                faults += f
                continue
            if (row, n) in frames:
                notes.append(f'{row}-{n}: the single frame overrides the sheet')
            frames[(row, n)] = single_frame(p, k)
    return frames, notes, faults


def pack(frames: dict) -> tuple[Image.Image, dict]:
    """Pack one form's 28 frames: each frame's anchor goes on its cell's centre and bottom row."""
    left = right = up = 0.0
    for f in frames.values():
        a = np.array(f.im)[..., 3]
        ys, xs = np.nonzero(a)
        if not len(xs):
            continue
        left, right = max(left, f.ax - xs.min()), max(right, xs.max() + 1 - f.ax)
        up = max(up, f.ay - ys.min())
    half = int(np.ceil(max(left, right))) + 2
    w, h = 2 * half, int(np.ceil(up)) + 3
    rows_out = ['idle', 'walk', '_walk', 'attack', 'hurt', 'dead', 'attack2']
    sheet = Image.new('RGBA', (w * PER_ROW, h * len(rows_out)), (0, 0, 0, 0))
    for (row, n), f in frames.items():
        r = rows_out.index(row) + (1 if row == 'walk' and n > PER_ROW else 0)
        c = (n - 1) % PER_ROW
        ox, oy = c * w + half - round(f.ax), r * h + (h - 1) - round(f.ay)
        cell = Image.new('RGBA', sheet.size, (0, 0, 0, 0))
        cell.paste(f.im, (ox, oy))
        box = (c * w, r * h, (c + 1) * w, (r + 1) * h)
        sheet.paste(cell.crop(box), box[:2])
    entry = {'w': w, 'h': h, 'perRow': PER_ROW, 'rows': rows_out,
             'counts': {'idle': 4, 'walk': 8, '_walk': 0, 'attack': 4, 'hurt': 4, 'dead': 4, 'attack2': 4},
             'figure': FIGURE, 'facesRight': True, 'lies': True}
    return sheet, entry


def main(argv: list[str]) -> int:
    only_check = '--check' in argv
    found_dir = Path(argv[argv.index('--found') + 1]) if '--found' in argv else None
    names = [a for i, a in enumerate(argv) if not a.startswith('--') and (i == 0 or argv[i - 1] != '--found')]
    if '--all' in argv:
        names = [h for h in HEROES if (SRC / h).exists() or (SHEETS / h).exists()]
    bad = [n for n in names if n not in HEROES]
    if bad or not names:
        print(f'Name heroes from: {" ".join(HEROES)}' + (f' (not one: {" ".join(bad)})' if bad else ''))
        return 2
    sheets = json.loads((UNITS / 'sheets.json').read_text())
    manifest = json.loads((AWAKENED / 'manifest.json').read_text())
    failed = False
    for hero in names:
        got = {}
        for form in FORMS:
            frames, notes, faults = gather(hero, form, found_dir)
            if only_check:
                for x in notes:
                    print(f'{hero} {form}: {x}')
            missing = [f'{row}-{n}' for row, n in FRAMES if (row, n) not in frames]
            if missing and (frames or form in VIEWS):
                print(f'{hero} {form}: {len(missing)} of 28 frames missing ({", ".join(missing[:8])}{" ..." if len(missing) > 8 else ""})')
            for f in faults:
                print(f'{hero} {form}: {f}')
            failed |= bool(faults)
            got[form] = frames if not missing and not faults else None
        if only_check:
            continue
        for plain in ('front', 'awakened-front'):
            back = plain.replace('front', 'back')
            if not (got[plain] and got[back]):
                if plain == 'front' or got[plain] or got[back]:
                    print(f'{hero}: {plain} and {back} not both ready; not packed')
                continue
            names_out = {f: sheet_name(hero, f) for f in (plain, back)}
            packed = {f: pack(got[f]) for f in (plain, back)}
            # front and back share one cell size, so the renderer can swap them in place
            w = max(e['w'] for _, e in packed.values())
            h = max(e['h'] for _, e in packed.values())
            for f, (im, e) in packed.items():
                if (e['w'], e['h']) != (w, h):
                    im, e = repad(im, e, w, h)
                e = dict(e)
                e['rear' if f == plain else 'front'] = names_out[back if f == plain else plain]
                folder = AWAKENED if f.startswith('awakened') else UNITS
                im.save(folder / f'{names_out[f]}.png', optimize=True)
                (manifest['layouts'] if f.startswith('awakened') else sheets)[names_out[f]] = e
                contact(im, e, SAMPLES / f'{names_out[f]}.png')
                print(f'{hero} {f}: {names_out[f]}.png {im.width}x{im.height}, cells {e["w"]}x{e["h"]}')
            if plain == 'awakened-front':
                manifest['forms'][sheet_name(hero, 'front')] = names_out[plain]
    if not only_check:
        write_json(UNITS / 'sheets.json', sheets)
        write_json(AWAKENED / 'manifest.json', manifest)
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
