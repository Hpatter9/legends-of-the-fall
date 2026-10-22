# Builds the sprite sheets of the twenty "more heroes" into src/art/units/ and adds them to sheets.json.
# Run from the repo root (python3 -I tools/more-heroes/build_sheets.py); safe to run twice. Reads the asset packs
# (hpatter9/chronos-assets next to this repo, and Little-Town's cut sheets) and never writes to them.
#
# - Pixel Champions (8 heroes, three colour looks each): the 1x battler sheets are 9x6 cells of 32 px in the RPG Maker
#   motion order. Rows are rebuilt as the game's rows (walk, attack, idle, hurt, dead, attack2, defend), every frame is
#   cropped to one common window (feet on the bottom, figure centred) and doubled with nearest neighbour (a lossless
#   whole-number zoom, so the figures stand about as tall as the Craftpix ones and are drawn at scale 1). They face left.
# - The Craftpix robots, pirates, mummy, zombies, ghost, tyrant, juggernaut and the cavalry rider are Little-Town's cut
#   sheets, copied as they are; a lying last death frame is added where the pack's death ends kneeling or standing
#   (the same lossless 90 degree turn as tools/pixellab/lie.py).
import json, os, shutil, sys
from PIL import Image

ROOT = os.getcwd()
UNITS = os.path.join(ROOT, 'src/art/units/')
ASSETS = os.environ.get('CHRONOS_ASSETS', os.path.join(ROOT, '..', 'chronos-assets'))
TOWN = os.environ.get('LITTLE_TOWN', os.path.join(ROOT, '..', 'hpatter9', 'little-town'))
PC = os.path.join(ASSETS, 'Pixel_Champions_v3/Pixel_Champions_v3/1x-NormalSize/Battlers')
PACKS = os.path.join(TOWN, 'src/renderer/art/creatures/packs/')

layout = json.load(open(UNITS + 'sheets.json'))

# ---- Pixel Champions ----
# (name in the pack, attack row of the middle column group, second skill row)
PC_HEROES = {
    'ouzo': ('ouzo', 1, 4),
    'ley': ('ley', 1, 3),
    'linail': ('linail', 1, 4),
    'hex': ('hex', 4, 3),
    'oratio': ('oratio', 1, 3),
    'wyvera': ('wyvera', 0, 3),
    'prime': ('prime', 4, 3),
    'glenys': ('glenys', 1, 3),
}
CELL = 32
ZOOM = 2


def pc_cells(img, rows_cols):
    return [img.crop((c * CELL, r * CELL, (c + 1) * CELL, (r + 1) * CELL)) for r, c in rows_cols]


def pc_rows(img, attack_row, skill_row):
    g = lambda r, cs: [(r, c) for c in cs]
    return {
        'walk': pc_cells(img, g(1, [0, 1, 2, 1])),
        'attack': pc_cells(img, g(attack_row, [3, 4, 5])),
        'idle': pc_cells(img, g(0, [0, 1, 2, 1])),
        'hurt': pc_cells(img, g(4, [0, 1, 2])),
        'dead': pc_cells(img, [(4, 1), (2, 6), (5, 6), (5, 7), (5, 8)]),
        'attack2': pc_cells(img, g(skill_row, [3, 4, 5])),
        'defend': pc_cells(img, g(3, [0, 1, 2])),
    }


def build_pc(name, g, attack_row, skill_row):
    suffix = '' if g == 1 else f'-{g}'
    img = Image.open(os.path.join(PC, f'{name}-battle{suffix}.png')).convert('RGBA')
    rows = pc_rows(img, attack_row, skill_row)
    order = ['walk', 'attack', 'idle', 'hurt', 'dead', 'attack2', 'defend']
    boxes = [f.getbbox() for r in order for f in rows[r] if f.getbbox()]
    x0 = min(b[0] for b in boxes); x1 = max(b[2] for b in boxes)
    y1 = max(b[3] for b in boxes); y0 = min(b[1] for b in boxes)
    half = max(CELL // 2 - x0, x1 - CELL // 2) + 1
    w = 2 * half
    top = max(0, y0 - 1)
    h = y1 - top + 1
    per = max(len(rows[r]) for r in order)
    out = Image.new('RGBA', (w * per * ZOOM, h * len(order) * ZOOM))
    counts = {}
    for ri, r in enumerate(order):
        counts[r] = len(rows[r])
        for i, f in enumerate(rows[r]):
            cell = f.crop((CELL // 2 - half, top, CELL // 2 + half, top + h)).resize((w * ZOOM, h * ZOOM), Image.NEAREST)
            out.paste(cell, (i * w * ZOOM, ri * h * ZOOM))
    idle_h = max(f.getbbox()[3] - f.getbbox()[1] for f in rows['idle']) * ZOOM
    sid = f'pc_{name}_{g}'
    out.save(UNITS + sid + '.png')
    layout[sid] = {'w': w * ZOOM, 'h': h * ZOOM, 'perRow': per, 'rows': order, 'counts': counts, 'figure': idle_h, 'facesRight': False}
    return sid


# ---- Little-Town's cut sheets ----
TOWN_SHEETS = ['robot_destroyer', 'robot_infantry', 'robot_swordsman', 'pirate_leader', 'pirate_zombie', 'squidman', 'horde_2',
               'hk_tyrant', 'hk_juggernaut', 'hk_ghost', 'hk_mummy', 'hk_zombie', 'hk_zombie_bare', 'hk_zombie_brute']
# sheets whose own death already ends lying down
LYING = {'robot_destroyer', 'robot_infantry', 'robot_swordsman', 'horde_2', 'pirate_leader', 'pirate_zombie', 'squidman'}


def lie(sid):
    """Add a last dead frame: the idle figure turned 90 degrees (head to the left), on the old ground line."""
    e = layout[sid]
    if e.get('lies') or sid in LYING:
        return
    im = Image.open(UNITS + sid + '.png').convert('RGBA')
    w, h, rows, per = e['w'], e['h'], e['rows'], e['perRow']
    cell = lambda r, i: im.crop((i * w, rows.index(r) * h, (i + 1) * w, (rows.index(r) + 1) * h))
    idle = cell('idle', 0)
    b = idle.getbbox()
    cx = (b[0] + b[2]) / 2
    li = idle.crop(b).rotate(90, expand=True)
    n = e['counts']['dead']
    nw = max(w, li.width + 4 + (w % 2))
    nw += nw % 2 - w % 2
    pad = (nw - w) // 2
    per = max(per, n + 1)
    out = Image.new('RGBA', (nw * per, h * len(rows)))
    for ri, r in enumerate(rows):
        for i in range(e['counts'][r]):
            out.paste(cell(r, i), (i * nw + pad, ri * h))
    ground = max(cell('dead', i).getbbox()[3] for i in range(n))
    x = int(round(cx)) - li.width // 2 + pad
    x = min(max(x, 2), nw - li.width - 2) + n * nw
    out.paste(li, (x, rows.index('dead') * h + ground - li.height))
    e['counts']['dead'] = n + 1
    e['w'] = nw
    e['perRow'] = per
    e['lies'] = True
    out.save(UNITS + sid + '.png')


def main():
    town = json.load(open(os.path.join(PACKS, '..', 'packs.json')))
    made = []
    for key, (name, ar, sr) in PC_HEROES.items():
        for g in (1, 2, 3):
            made.append(build_pc(name, g, ar, sr))
    for sid in TOWN_SHEETS:
        shutil.copyfile(os.path.join(PACKS, sid + '.png'), UNITS + sid + '.png')
        e = dict(town[sid])
        layout[sid] = e
        lie(sid)
        made.append(sid)
    json.dump(layout, open(UNITS + 'sheets.json', 'w'), indent=1)
    print(len(made), 'sheets:', ' '.join(made))


main()
