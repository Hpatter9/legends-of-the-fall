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
from PIL import Image, ImageDraw

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
ALPHA_CUT = 128  # alpha at or above this is solid; below it is clear (main's sheets are 0 or 255)
SPECK = 6  # a solid island this many pixels or fewer, away from the figure, is dropped


def snake(s: str) -> str:
    return re.sub(r'([A-Z])', lambda m: '_' + m.group(1).lower(), s)


def sheet_name(hero: str, form: str) -> str:
    back = form.endswith('back')
    base = f'awakened_{hero}' if form.startswith('awakened') else f'hero_res_{snake(hero)}'
    return base + ('_back' if back else '')


def frame_paths(hero: str, form: str) -> list[tuple[str, int, Path]]:
    return [(row, n, SRC / hero / form / f'{row}-{n}.png') for row, count in ROWS for n in range(1, count + 1)]


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


def idle_height(path: Path) -> int:
    """The standing figure's height on the canvas: from its top to the ground line."""
    a = np.array(Image.open(path).convert('RGBA'))[..., 3]
    ys = np.nonzero((a >= ALPHA_CUT).any(axis=1))[0]
    return BASELINE - int(ys.min())


def scaled(path: Path, k: float) -> Image.Image:
    """One frame scaled by `k` about the canvas, its alpha made hard and its specks dropped."""
    im = Image.open(path).convert('RGBA')
    size = round(CANVAS * k)
    small = im.resize((size, size), Image.Resampling.LANCZOS)  # Pillow scales RGBA premultiplied, so edges keep their colour
    px = np.array(small)
    solid = drop_specks(px[..., 3] >= ALPHA_CUT)
    px[..., 3] = np.where(solid, 255, 0)
    px[~solid, :3] = 0
    return Image.fromarray(px)


def pack(hero: str, form: str, k: float) -> tuple[Image.Image, dict]:
    """Pack one form's frames at scale `k`. The canvas's centre and ground line land on the cell's centre and bottom row, so a
    frame's own shifts (a lunge, a fall) are kept, as main's sheets keep them."""
    frames = [(row, n, scaled(p, k)) for row, n, p in frame_paths(hero, form)]
    cx, gy = CENTRE * k, BASELINE * k
    left = right = up = 0.0
    for _, _, im in frames:
        a = np.array(im)[..., 3]
        ys, xs = np.nonzero(a)
        left, right = max(left, cx - xs.min()), max(right, xs.max() + 1 - cx)
        up = max(up, gy - ys.min())
    half = int(np.ceil(max(left, right))) + 2
    w, h = 2 * half, int(np.ceil(up)) + 3
    rows_out = ['idle', 'walk', '_walk', 'attack', 'hurt', 'dead', 'attack2']
    sheet = Image.new('RGBA', (w * PER_ROW, h * len(rows_out)), (0, 0, 0, 0))
    for row, n, im in frames:
        r = rows_out.index(row) + (1 if row == 'walk' and n > PER_ROW else 0)
        c = (n - 1) % PER_ROW
        # the canvas's (cx, gy) goes to the cell's (half, h - 1): its ground line on the cell's bottom row
        ox, oy = c * w + half - round(cx), r * h + (h - 1) - round(gy)
        cell = Image.new('RGBA', sheet.size, (0, 0, 0, 0))
        cell.paste(im, (ox, oy))
        box = (c * w, r * h, (c + 1) * w, (r + 1) * h)
        sheet.paste(cell.crop(box), box[:2])
    entry = {'w': w, 'h': h, 'perRow': PER_ROW, 'rows': rows_out,
             'counts': {'idle': 4, 'walk': 8, '_walk': 0, 'attack': 4, 'hurt': 4, 'dead': 4, 'attack2': 4},
             'figure': FIGURE, 'facesRight': True, 'lies': True}
    return sheet, entry


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


def main(argv: list[str]) -> int:
    only_check = '--check' in argv
    names = [a for a in argv if not a.startswith('--')]
    if '--all' in argv:
        names = [h for h in HEROES if (SRC / h).exists()]
    bad = [n for n in names if n not in HEROES]
    if bad or not names:
        print(f'Name heroes from: {" ".join(HEROES)}' + (f' (not one: {" ".join(bad)})' if bad else ''))
        return 2
    sheets = json.loads((UNITS / 'sheets.json').read_text())
    manifest = json.loads((AWAKENED / 'manifest.json').read_text())
    failed = False
    for hero in names:
        ready = {}
        for form in FORMS:
            missing, faults = check(hero, form)
            if missing:
                print(f'{hero} {form}: {len(missing)} of 28 frames missing ({", ".join(missing[:6])}{" ..." if len(missing) > 6 else ""})')
            for f in faults:
                print(f'{hero} {form}: {f}')
            failed |= bool(faults)
            ready[form] = not missing and not faults
        if only_check:
            continue
        for plain in ('front', 'awakened-front'):
            back = plain.replace('front', 'back')
            if not (ready[plain] and ready[back]):
                print(f'{hero}: {plain} and {back} not both ready; not packed')
                continue
            # one scale for the pair, from the front's first idle frame, so front and back match in size
            hf, hb = idle_height(SRC / hero / plain / 'idle-1.png'), idle_height(SRC / hero / back / 'idle-1.png')
            if abs(hf - hb) > 0.08 * hf:
                print(f'{hero}: the {back} figure is {hb} px tall against the front\'s {hf}; the frames should match in size')
            k = FIGURE / hf
            names_out = {f: sheet_name(hero, f) for f in (plain, back)}
            packed = {f: pack(hero, f, k) for f in (plain, back)}
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
                print(f'{hero} {f}: {names_out[f]}.png {im.width}x{im.height}, cells {e["w"]}x{e["h"]}, scale {k:.4f}')
            if plain == 'awakened-front':
                manifest['forms'][sheet_name(hero, 'front')] = names_out[plain]
    if not only_check:
        write_json(UNITS / 'sheets.json', sheets)
        write_json(AWAKENED / 'manifest.json', manifest)
    return 1 if failed else 0


def repad(im: Image.Image, e: dict, w: int, h: int) -> tuple[Image.Image, dict]:
    """Re-lay a packed sheet into larger cells, the figure kept centred and on the bottom row."""
    rows = len(e['rows'])
    out = Image.new('RGBA', (w * PER_ROW, h * rows), (0, 0, 0, 0))
    for r in range(rows):
        for c in range(PER_ROW):
            cell = im.crop((c * e['w'], r * e['h'], (c + 1) * e['w'], (r + 1) * e['h']))
            out.paste(cell, (c * w + (w - e['w']) // 2, r * h + (h - e['h'])))
    return out, {**e, 'w': w, 'h': h}


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
