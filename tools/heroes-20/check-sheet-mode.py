"""Check pack-sheets.py's sheet and strip modes on a sheet of main's (docs/notes/twenty-heroes.md): explode it into a loose, hand-painted
looking reference sheet (each pose 6x, uneven gaps, a little jitter), feed that to the packer as if it were a coming hero's, and compare
the packed figures with the original's. Nothing in the repository is written; the files go to a temporary folder.

    python3 tools/heroes-20/check-sheet-mode.py [hero_res_tyrant] [sheet|white|checker|strips]
"""
import importlib.util, json, random, sys, tempfile
from pathlib import Path
import numpy as np
from PIL import Image
ROOT = Path(__file__).resolve().parents[2]
T = Path(tempfile.mkdtemp(prefix='sheet-mode-'))
spec = importlib.util.spec_from_file_location('ps', ROOT / 'tools/heroes-20/pack-sheets.py'); ps = importlib.util.module_from_spec(spec); spec.loader.exec_module(ps)
sheets = json.loads((ROOT / 'src/art/units/sheets.json').read_text())
def explode(name):
    e = sheets[name]; im = Image.open(ROOT / f'src/art/units/{name}.png').convert('RGBA')
    out = {}
    for r, row in enumerate(e['rows']):
        for c in range(e['perRow']):
            cell = im.crop((c * e['w'], r * e['h'], (c + 1) * e['w'], (r + 1) * e['h']))
            if np.array(cell)[..., 3].max() == 0: continue
            key = ('walk', c + 5) if row == '_walk' else (row, c + 1)
            out[key] = cell
    return out, e
def compose(cells, keys_rows, scale, bg=None, seed=1):
    rnd = random.Random(seed)
    any_ = next(iter(cells.values())); cw, ch = any_.width * scale, any_.height * scale
    W = max(len(r) for r in keys_rows) * int(cw * 1.35) + 200
    H = len(keys_rows) * int(ch * 1.3) + 200
    canvas = Image.new('RGBA', (W, H), bg or (0, 0, 0, 0))
    y = 80
    for row in keys_rows:
        x = 60
        for k in row:
            big = cells[k].resize((cw, ch), Image.Resampling.NEAREST)
            canvas.alpha_composite(big, (x + rnd.randint(-10, 10), y + rnd.randint(-8, 8)))
            x += int(cw * rnd.uniform(1.15, 1.45))
        y += int(ch * 1.3)
    return canvas
name = sys.argv[1] if len(sys.argv) > 1 else 'hero_res_tyrant'
cells, e = explode(name)
order = [[('idle', n) for n in range(1, 5)], [('walk', n) for n in range(1, 9)], [('attack', n) for n in range(1, 5)], [('hurt', n) for n in range(1, 5)], [('dead', n) for n in range(1, 5)], [('attack2', n) for n in range(1, 5)]]
ps.SHEETS = T / 'sheets'
hero = 'astralSphinx'
(T / 'sheets' / hero).mkdir(parents=True, exist_ok=True)
for f in (T / 'sheets' / hero).glob('*.png'): f.unlink()
mode = sys.argv[2] if len(sys.argv) > 2 else 'sheet'
if mode == 'sheet':
    compose(cells, order, 6).save(T / 'sheets' / hero / 'front.png')
elif mode == 'white':
    compose(cells, order, 6, bg=(255, 255, 255, 255)).save(T / 'sheets' / hero / 'front.png')
elif mode == 'checker':
    c = compose(cells, order, 6)
    px = np.array(c); yy, xx = np.mgrid[0:px.shape[0], 0:px.shape[1]]
    chk = np.where(((yy // 24 + xx // 24) % 2)[..., None] == 0, [238, 238, 238], [204, 204, 204]).astype(np.uint8)
    a = px[..., 3:4] / 255.0
    rgb = (px[..., :3] * a + chk * (1 - a)).astype(np.uint8)
    Image.fromarray(np.dstack([rgb, np.full(rgb.shape[:2], 255, np.uint8)])).save(T / 'sheets' / hero / 'front.png')
elif mode == 'strips':
    compose(cells, order[0:2], 5).save(T / 'sheets' / hero / 'front-idle-walk.png')
    compose(cells, [[('idle', 1)] + order[2], order[5]], 7).save(T / 'sheets' / hero / 'front-attacks.png')
    compose(cells, [[('idle', 1)] + order[3], order[4]], 4).save(T / 'sheets' / hero / 'front-hurt-dead.png')
frames, notes, faults = ps.gather(hero, 'front', T / 'found')
print('notes', notes); print('faults', faults); print('frames', len(frames))
if len(frames) == 28:
    im, ent = ps.pack(frames)
    ps.contact(im, ent, T / f'{name}-{mode}-packed.png')
    # compare: each cell's figure vs the original's: the figure's height and its bottom row
    worst = 0
    for k, f in frames.items():
        a0 = np.array(cells[k])[..., 3] > 0; ys0 = np.nonzero(a0.any(axis=1))[0]
        a1 = np.array(f.im)[..., 3] > 0; ys1 = np.nonzero(a1.any(axis=1))[0]
        worst = max(worst, abs((ys0.max() - ys0.min()) - (ys1.max() - ys1.min())))
    print(f'{name} {mode}: cells {ent["w"]}x{ent["h"]} (the original {e["w"]}x{e["h"]}), the worst figure height difference {worst} px; files in {T}')
    sys.exit(0 if worst <= 4 else 1)
sys.exit(1)
