# Cuts the summons' sheets (docs/notes/summon-art.md) into the game's layout: rows walk, attack, idle, hurt, dead, the figure
# centred with its feet on the frame's bottom, facing right. Nothing is resampled except the wolves' whole-pixel doubling, so
# every frame stays crisp.
#
#  - The wolves and the dire wolf: whtdragons' RPG Maker MV animals (`animals/wilddogs.png`, 48x48 cells, three walking frames
#    a facing). The right-facing row is doubled by whole pixels; the walk is its own trot, the bite a crouch and a lunge with the
#    head raised, the fall the body sunk to the ground with its legs folded away.
#  - The wraith and the decoy: still figures from "Golems and elementals" (batareya, 64x96), moved by whole pixels as
#    tools/golems/cut.py does (a sway, a lean into the blow, a flinch); at the end they come apart. (The treant needs no cut: it
#    is the Druid's old treant sheets, `cls_treant*.png`, already in the game.)
#  - The standard: the war standard already in the camp (src/art/camp/standard.png, Chronos's isometric kits) without its sand
#    plot, the pennants stirring in the wind.
#
# Run from the repo root: python3 tools/summon-art/cut.py ../chronos-assets   (rewrites src/art/units/summon_*.png and their
# sheets.json entries)
import json, sys
from PIL import Image

ASSETS = sys.argv[1] if len(sys.argv) > 1 else '../chronos-assets'
GOLEMS = ASSETS + '/Golems and elementals (pack by batareya)/'
DOGS = ASSETS + '/whtdragons_MVanimals_ALL_4-1-2025/animals/wilddogs.png'
D = 'src/art/units/'
ROWS = ['walk', 'attack', 'idle', 'hurt', 'dead']


def hard(im):
    """Alpha made all or nothing, so no soft edge is left to blur."""
    im = im.convert('RGBA')
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            px[x, y] = (r, g, b, 255) if a >= 128 else (0, 0, 0, 0)
    return im


def trim(im):
    return im.crop(im.getbbox())


def save(name, rows, w, h, figure, extra=None):
    per = max(len(r) for r in rows)
    out = Image.new('RGBA', (w * per, h * len(rows)))
    for r, row in enumerate(rows):
        for i, fr in enumerate(row):
            out.alpha_composite(fr, (i * w, r * h))
    out.save(D + name + '.png')
    entry = {'w': w, 'h': h, 'perRow': per, 'rows': ROWS, 'counts': {k: len(v) for k, v in zip(ROWS, rows)}, 'figure': figure, 'facesRight': True, 'lies': True}
    entry.update(extra or {})
    return entry


# ---- the wolves ----

def dog_frames(col, row):
    """The three right-facing frames of the MV wild dog in block (col, row), each doubled by whole pixels and trimmed."""
    sheet = hard(Image.open(DOGS))
    x0, y0 = col * 144, row * 192 + 2 * 48
    return [trim(sheet.crop((x0 + i * 48, y0, x0 + i * 48 + 48, y0 + 48)).resize((96, 96), Image.NEAREST)) for i in range(3)]


def beast(fig, W, H, dx=0, dy=0, front=0, legs=0):
    """A four-footed figure on a cell, feet on the ground line: moved by dx, dy; its front 45% raised by `front`;
    with `legs` its bottom rows folded away (lying down)."""
    cell = Image.new('RGBA', (W, H))
    if legs:
        fig = fig.crop((0, 0, fig.width, fig.height - legs))
    cut = int(fig.width * 0.55)
    x = (W - fig.width) // 2 + dx
    y = H - 4 - fig.height + dy
    cell.alpha_composite(fig.crop((0, 0, cut, fig.height)), (x, y))
    cell.alpha_composite(fig.crop((cut, 0, fig.width, fig.height)), (x + cut, y - front))
    return cell


def wolf_sheet(frames, W=112, H=96):
    a, b, c = frames
    walk = [beast(f, W, H, dy=-(i % 2) * 2) for i, f in enumerate([a, b, c, b])]
    attack = [beast(b, W, H, dx=-4, dy=2), beast(b, W, H, dx=-6, dy=2, front=-2), beast(a, W, H, dx=8, front=8), beast(c, W, H, dx=10, front=4), beast(b, W, H, dx=4)]
    idle = [beast(b, W, H), beast(b, W, H, front=2), beast(b, W, H, front=2), beast(b, W, H)]
    hurt = [beast(b, W, H, dx=-6, front=-2), beast(b, W, H, dx=-3)]
    leg = b.height // 3
    dead = [beast(b, W, H, dx=-4, front=-2), beast(b, W, H, dx=-6, legs=leg // 3, front=-4), beast(b, W, H, dx=-6, legs=2 * leg // 3, front=-6), beast(b, W, H, dx=-6, legs=leg, front=-6)]
    return [walk, attack, idle, hurt, dead], b.height


# ---- the still figures (the treant, the wraith, the decoy) ----

def pose(fig, W, H, top_dx=0, dx=0, dy=0, sag=0):
    """The figure on a cell, feet on the ground line: the upper 40% moved sideways by top_dx (and down by sag), all of it by dx, dy."""
    cell = Image.new('RGBA', (W, H))
    cut = int(fig.height * 0.4)
    x = (W - fig.width) // 2 + dx
    y = H - 4 - fig.height + dy
    cell.alpha_composite(fig.crop((0, cut, fig.width, fig.height)), (x, y + cut))
    cell.alpha_composite(fig.crop((0, 0, fig.width, cut)), (x + top_dx, y + sag))
    return cell


def fallen(fig, W, H):
    """The figure turned exactly 90 degrees, lying on the ground line."""
    lie = fig.rotate(90, expand=True)
    cell = Image.new('RGBA', (W, H))
    cell.alpha_composite(lie, ((W - lie.width) // 2, H - 4 - lie.height))
    return cell


def dissolve(cell, share, seed):
    """Every pixel of the frame gone at `share` of a fixed scatter (a figure coming apart, without any blending)."""
    out = cell.copy()
    px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            if ((x * 73856093) ^ (y * 19349663) ^ seed) % 1000 < share * 1000:
                px[x, y] = (0, 0, 0, 0)
    return out


def still_sheet(fig, W, H, death):
    walk = [pose(fig, W, H, t, d, y) for t, d, y in [(-1, 0, 0), (-1, 0, -2), (0, 0, -3), (1, 0, 0), (1, 0, -2), (0, 0, -3)]]
    attack = [pose(fig, W, H, t, d, y) for t, d, y in [(-4, -2, -1), (-6, -3, -2), (10, 6, 1), (8, 6, 0), (3, 2, 0)]]
    idle = [pose(fig, W, H, t) for t in (0, 1, 0, -1)]
    hurt = [pose(fig, W, H, -5, -3), pose(fig, W, H, -2, -2)]
    if death == 'fall':
        dead = [pose(fig, W, H, -6, -2), pose(fig, W, H, -12, -4, 1, 1), pose(fig, W, H, -18, -6, 3, 4), pose(fig, W, H, -22, -8, 6, 9), fallen(fig, W, H)]
    else:
        base = pose(fig, W, H, -4, -2)
        dead = [base] + [dissolve(pose(fig, W, H, -4, -2, k), s, 977) for k, s in [(1, 0.25), (2, 0.5), (3, 0.75), (4, 0.95)]]
    return [walk, attack, idle, hurt, dead]


# ---- the standard ----

def standard_sheet():
    im = hard(Image.open('src/art/camp/standard.png'))
    px = im.load()
    # (its plot of sand goes; the pole and the grey stones at its foot stay, each kept stone pixel given back its dark edge)
    keep = set()
    for y in range(92, im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            grey = max(r, g, b) - min(r, g, b) < 34 and max(r, g, b) > 85
            if a and (grey or (26 <= x <= 32 and y < 104)):
                keep.add((x, y))
    edge = {(x + dx, y + dy) for x, y in keep for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))} - keep
    for y in range(92, im.height):
        for x in range(im.width):
            if (x, y) in keep:
                continue
            px[x, y] = (40, 34, 30, 255) if (x, y) in edge and px[x, y][3] else (0, 0, 0, 0)
    fig = trim(im)
    W, H = 80, 128
    # (the pennants stir: the top half moved a pixel at a time)
    idle = [pose(fig, W, H, t) for t in (0, 1, 2, 1, 0, -1)]
    hurt = [pose(fig, W, H, -3), pose(fig, W, H, -1)]
    dead = [pose(fig, W, H, -6, 0, 0, 1), pose(fig, W, H, -14, 0, 0, 4), pose(fig, W, H, -22, 0, 2, 9), fallen(fig, W, H)]
    return [idle, idle, idle, hurt, dead], fig.height, W, H


def main():
    d = json.load(open(D + 'sheets.json'))
    # (wild dog blocks in wilddogs.png: top row black, brown, grey, white)
    for name, (col, row) in {'summon_wolf': (2, 0), 'summon_wolf_white': (3, 0), 'summon_direwolf': (0, 0)}.items():
        rows, fig = wolf_sheet(dog_frames(col, row))
        d[name] = save(name, rows, 112, 96, fig)
        print(name, fig)
    for name, n, death in [('summon_wraith', 13, 'dissolve'), ('summon_decoy', 33, 'dissolve')]:
        fig = trim(hard(Image.open(GOLEMS + '%d.png' % n)))
        d[name] = save(name, still_sheet(fig, 96, 116, death), 96, 116, fig.height)
        print(name, n, fig.height)
    rows, fig, W, H = standard_sheet()
    d['summon_standard'] = save('summon_standard', rows, W, H, fig)
    print('summon_standard', fig)
    json.dump(d, open(D + 'sheets.json', 'w'), indent=1)


main()
