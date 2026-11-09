#!/usr/bin/env python3
"""Cuts a hold's painted sheets (art-source/assault/<army>/) and the Chronos kit pieces it borrows into the field's art.

The formats are the art plan's (docs/notes/assault-art-plan.md, 2.1):

- STANDING SPRITES (structures and props) are painted at 2x the game's scale on fixed grids, each standing on a stated FOOT POINT (the
  centre of its footprint diamond). Each cell is cut, its faint alpha cleared, trimmed and halved by a 2 x 2 box average (as
  tools/army-road/prep.py halves the kits), and its foot point carried through. The Chronos kit pieces (hpatter9/little-town,
  src/renderer/art/iso/kits/) are halved the same way and stand on the middle of their bottom edge, lifted by a share of their width
  (a kit piece's own footprint diamond is about half as tall as it is wide). All of them are shelf-packed into one atlas.
- GROUND TEXTURES are 256 px squares, each covering 4 x 4 tiles. ChatGPT rarely paints one truly seamless, so each is offset by half
  and a 16 px band blended across the seam it brings into the middle. They stay at full size (64 px a tile, as the land's own tops).
- TRANSITIONS (one tile, the material along the top edge) are reduced to 64 px; DECALS (2 x 2 tiles) to 128 px.
- FACES are columns 256 px wide: a lip (one step, 80 px), a body (four steps, 320 px) and a foot (one step), reduced to 64 px wide.

Out: src/art/assault/<army>/{sprites,ground,edges,decals,faces}.webp and src/render/assault<Army>Atlas.ts (the rects and foot points).
The report lists any cell whose picture strays from its footprint (its bottom too far above or below the diamond's bottom tip, or its
middle off the foot point), for the art's notes.

Run by hand: KITS=<path to the kits folder> python3 tools/assault/cut-sheets.py [orc|undead] [--report]
"""
import json
import os
import sys

import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
KITS = os.environ.get('KITS', os.path.join(ROOT, '..', 'hpatter9', 'little-town', 'src', 'renderer', 'art', 'iso', 'kits'))

# ----- the sheets' grids (the templates in docs/samples/assault-art/) -----

# (each cell: x, y, w, h of the cell; the foot point in the cell; the footprint along u and v, in tiles)
def props(names):
    """A 1024 x 1024 sheet of 4 x 4 cells of 256, every piece one tile, standing on (128, 208)."""
    return {n: (i % 4 * 256, i // 4 * 256, 256, 256, 128, 208, 1, 1) for i, n in enumerate(names) if n}


def buildings(names):
    """A 1536 x 1024 sheet of 3 x 2 cells of 512, each standing on (256, 416); `names` are (name, fu, fv)."""
    return {n: (i % 3 * 512, i // 3 * 512, 512, 512, 256, 416, fu, fv) for i, (n, fu, fv) in enumerate(names) if n}


SHEETS = {
    'orc': {
        'sprites': {
            'orc-01-palisade.png': props([
                'palisadeRun', 'palisadeBattered', 'palisadeBroken', 'palisadeBreach',
                'palisadeInner', 'palisadeCornerS', 'palisadeCornerN', 'palisadeCornerE',
                'gatePost', 'sallyPort', 'sallyPortBattered', 'sallyPortBroken',
                'barricade', 'barricadeBroken', 'ditchStakes', 'stakeLine']),
            'orc-02-gates.png': buildings([
                ('southGate', 2, 2), ('southGateBattered', 2, 2), ('southGateBroken', 2, 2),
                ('northGate', 2, 2), ('northGateBroken', 2, 2), ('gateTower', 2, 2)]),
            'orc-03-iron-gate.png': buildings([
                ('ironGate', 2, 2), ('ironGateBattered', 2, 2), ('ironGateBroken', 2, 2),
                ('postern', 1, 2), ('posternBroken', 1, 2), ('cornerTower', 3, 3)]),
            'orc-07-keep.png': {
                'keep': (0, 0, 1024, 1024, 512, 840, 6, 4),
                'throne': (1024, 0, 512, 512, 256, 440, 1, 1),
                'greatBanner': (1024, 512, 512, 512, 256, 440, 1, 1),
            },
            'orc-08-wall-dressing.png': props([
                'crenel', 'crenelOuter', 'crenelInner', 'crenelBroken',
                'slitParapet', 'hoarding', 'hangingBanner', 'skullChains',
                'stairUp', 'wallBrazier', 'cauldron', 'wallSpikes',
                'banister', 'stairDown', 'fallenStones', 'winch']),
            'orc-09-camp.png': buildings([
                ('warTent', 2, 1), ('yurt', 2, 2), ('pavilion', 3, 3),
                ('bonefire', 2, 2), ('drumStruck', 2, 2), ('drumSilenced', 2, 2)]),
            'orc-10-camp-props.png': props([
                'conicalTent', 'leanTo', 'tuskTotem', 'wolfTotem',
                'smallBanner', 'pennantPole', 'gibbet', 'cage',
                'dummy', 'trophyRack', 'anvil', 'firepit',
                'shieldStack', 'hideFrame', 'alarmHorn', 'boltThrower']),
            'orc-11-siege-ruins.png': buildings([
                ('catapult', 2, 2), ('burntShell', 2, 2), ('burntHeap', 2, 2),
                ('ladder', 1, 1), ('ram', 2, 1), ('trebuchet', 2, 2)]),
            'orc-12-river.png': props([
                'deck', 'deckEnd', 'pier', 'deckBroken',
                'fordStones', 'wetBoulders', 'sunkenLog', 'mooringPost',
                'fallLip', 'driftShield', 'driftArrows', 'driftBanner',
                'deckBarricade', 'brokenRail', 'raft', 'weir']),
        },
        'ground': ('orc-05-ground.png', [
            'grass1', 'grass2', 'heath', 'trampled',
            'mud1', 'mud2', 'wetMud', 'scorched',
            'ash', 'campDirt', 'cobbles', 'flagstones',
            'wallWalk', 'planks', 'shingle', 'shallows']),
        'edges': ('orc-06-transitions.png', [
            'mud', 'mudCorner', 'scorch', 'scorchCorner',
            'road', 'roadCorner', 'path', 'pathCorner',
            'shingle', 'shingleCorner', 'flags', 'flagsCorner',
            'grass', 'grassCorner', 'water', 'waterCorner']),
        'decals': ('orc-13-decals.png', [
            'bloodSpatter', 'bloodSmear', 'bloodPool', 'scorch',
            'ashPatch', 'rubble', 'timber', 'ruts',
            'bootTracks', 'wolfTracks', 'puddle', 'mudSplash',
            'embers', 'bones', 'straw', 'cracks']),
        'faces': ('orc-04-faces.png', [
            'cliff', 'earth', 'mudBank', 'rampart', 'palisade', 'stoneWall',
            'stoneWallDamaged', 'tower', 'terrace', 'moundEarth', 'riverBank', 'basalt']),
        # the Chronos kit pieces the hold borrows (the art plan's 2.2): name in the game -> kit picture
        'kits': {
            'kitSpikedWall': 'orcs/spiked_wall_run', 'kitSpikedCorner': 'orcs/spiked_wall_corner', 'kitSkullGate': 'orcs/skull_gate',
            'kitStakeFence': 'orcs/stake_fence', 'longhouse': 'orcs/longhouse', 'boneHut': 'orcs/cottage', 'hideHut': 'orcs/tavern',
            'forge': 'orcs/workshop', 'forgeFire': 'dwarves/forge_fire', 'wargPen': 'orcs/warg_pen', 'pigPen': 'orcs/pig_pen_tile',
            'watchtower': 'orcs/siege_tower', 'lookout': 'moonpack/lookout_tower', 'warDrum': 'orcs/war_drum', 'skullTotem': 'orcs/shrine',
            'skullTorch': 'orcs/skull_torch', 'spearSign': 'orcs/spear_signpost', 'bonfire': 'orcs/bonfire', 'weaponStall': 'orcs/weapon_stall',
            'skullPile': 'liches/skull_pile', 'warCart': 'orcs/war_cart', 'granary': 'orcs/granary', 'meatRacks': 'moonpack/meat_racks',
            'meatPile': 'orcs/meat_pile', 'barrels': 'orcs/barrels', 'chests': 'orcs/loot_chests', 'stockpile': 'orcs/stockpile',
            'woodpile': 'orcs/woodpile', 'well': 'orcs/well', 'hides': 'moonpack/hide_bundles', 'logBridge': 'orcs/log_bridge',
            'ruin1': 'wild/ruin_1', 'ruin2': 'wild/ruin_2', 'rubblePile': 'dwarves/rubble', 'brazier': 'dwarves/brazier',
            'pine1': 'knights/pine_tree', 'pine2': 'moonpack/pine_tree', 'pineSmall': 'moonpack/small_pine', 'burntTree': 'orcs/burnt_tree',
            'gnarledTree': 'orcs/gnarled_tree', 'bareTree': 'moonpack/bare_tree', 'thornBush': 'orcs/thorn_bush', 'shrub1': 'wild/shrub_1',
            'shrub2': 'wild/shrub_2', 'fern': 'wild/fern', 'stump1': 'wild/stump_1', 'stump2': 'wild/stump_2', 'fallenLog': 'moonpack/fallen_log',
            'boulders': 'moonpack/boulders', 'rocks': 'moonpack/rocks_a', 'darkRocks': 'orcs/dark_rocks', 'darkRocksB': 'orcs/dark_rocks_b',
            'standingStone': 'moonpack/howling_stone', 'reeds1': 'wild/reeds_1', 'reeds2': 'wild/reeds_2', 'bones1': 'wild/bones_1',
            'bones2': 'wild/bones_2', 'bones3': 'wild/bones_3', 'flowers1': 'wild/flowers_1', 'flowers2': 'wild/flowers_2',
            'pebbles': 'wild/pebbles_1', 'tallGrass': 'wild/tall_grass',
        },
    },
}

# ----- the Barrow Necropolis (phase 4): the Orc profile's slots and names, its own sheets, its own kit pieces -----
#
# Every slot keeps the Orc profile's piece name, so the field's renderer draws the Necropolis with the same rules; only the pictures differ.
# A sheet not painted yet (docs/notes/assault-4-barrow-necropolis-art-prompts.md) falls back to the Orc sheet in the same slot, recoloured
# cold (`cold`), so the hold is drawn on stand-ins until its art lands; run this again when it does.
UNDEAD_FILES = {
    'orc-01-palisade.png': 'und-01-railings.png', 'orc-02-gates.png': 'und-02-gates.png', 'orc-03-iron-gate.png': 'und-03-bone-gate.png',
    'orc-04-faces.png': 'und-04-faces.png', 'orc-05-ground.png': 'und-05-ground.png', 'orc-06-transitions.png': 'und-06-transitions.png',
    'orc-07-keep.png': 'und-07-keep.png', 'orc-08-wall-dressing.png': 'und-08-wall-dressing.png', 'orc-09-camp.png': 'und-09-landmarks.png',
    'orc-10-camp-props.png': 'und-10-props.png', 'orc-11-siege-ruins.png': 'und-11-ruins.png', 'orc-12-river.png': 'und-12-lake.png',
    'orc-13-decals.png': 'und-13-decals.png',
}
_orc = SHEETS['orc']
SHEETS['undead'] = {
    'sprites': {UNDEAD_FILES[k]: v for k, v in _orc['sprites'].items()},
    'ground': (UNDEAD_FILES[_orc['ground'][0]], _orc['ground'][1]),
    'edges': (UNDEAD_FILES[_orc['edges'][0]], _orc['edges'][1]),
    'decals': (UNDEAD_FILES[_orc['decals'][0]], _orc['decals'][1]),
    'faces': (UNDEAD_FILES[_orc['faces'][0]], _orc['faces'][1]),
    'fallback': ('orc', {v: k for k, v in UNDEAD_FILES.items()}),
    # (our own siege works serve every hold: always the Orc sheet's, never recoloured)
    'shared': {'ladder', 'ram', 'trebuchet'},
    'kits': {
        **_orc['kits'],
        'kitSpikedWall': 'liches/bone_wall_run', 'kitSpikedCorner': 'liches/bone_wall_corner', 'kitSkullGate': 'liches/gatehouse',
        'kitStakeFence': 'liches/iron_fence', 'longhouse': 'liches/longhouse', 'boneHut': 'liches/cottage', 'hideHut': 'liches/tavern',
        'forge': 'liches/workshop', 'forgeFire': 'liches/witch_fire', 'wargPen': 'liches/bone_pit', 'pigPen': 'liches/grave_plot_tile',
        'watchtower': 'liches/watchtower', 'lookout': 'bloodcourt/watchtower', 'warDrum': 'liches/witch_fire', 'skullTotem': 'liches/signpost',
        'skullTorch': 'liches/lantern_post', 'spearSign': 'liches/signpost', 'bonfire': 'liches/witch_fire', 'weaponStall': 'liches/market_stall',
        'skullPile': 'liches/skull_pile', 'warCart': 'liches/hearse', 'granary': 'liches/granary', 'meatRacks': 'liches/bone_crates',
        'meatPile': 'liches/coffin_stack', 'barrels': 'liches/barrels', 'chests': 'bloodcourt/coffins', 'stockpile': 'liches/stockpile',
        'woodpile': 'bloodcourt/dead_woodpile', 'well': 'liches/well', 'hides': 'bloodcourt/coffin', 'logBridge': 'liches/stone_bridge',
        'brazier': 'bloodcourt/brazier', 'pine1': 'liches/dead_pine', 'pine2': 'liches/dead_pine', 'pineSmall': 'liches/dead_pine',
        'burntTree': 'liches/dead_oak', 'gnarledTree': 'bloodcourt/dead_oak', 'bareTree': 'liches/dead_oak', 'thornBush': 'liches/thorn_bush',
        'shrub1': 'bloodcourt/thorn_bush', 'boulders': 'liches/rocks', 'rocks': 'bloodcourt/rocks', 'darkRocks': 'liches/rocks',
        'darkRocksB': 'bloodcourt/rocks',
        # (the Necropolis's own dressing, which the Orc hold has no slot for)
        'mausoleum': 'liches/mausoleum', 'gravestones': 'bloodcourt/gravestones', 'crypt': 'bloodcourt/crypt', 'chapel': 'liches/chapel',
        'coffinStack': 'liches/coffin_stack', 'gatehouse': 'liches/gatehouse',
    },
}


def cold(a):
    """Recolour an Orc sheet's RGBA array for the Necropolis's stand-in: most of its colour drained to a cold slate, its fire turned to
    the Liches' teal witch fire and its blood-red cloth to ash grey, so a borrowed picture reads as the dead's, not the orcs'."""
    rgb = a[..., :3].astype(float) / 255
    mx = rgb.max(-1)
    mn = rgb.min(-1)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    hot = (r >= g) & (r >= b) & (sat > 0.45) & (mx > 0.35)
    # (fire: bright, orange to yellow; the rest of the hot hues are the orcs' red cloth)
    fire = hot & (mx > 0.72) & (g > b * 1.3)
    grey = rgb.mean(-1, keepdims=True)
    slate = np.array([0.82, 0.9, 1.08])
    out = grey * slate * 0.92 + (rgb - grey) * 0.25
    # (the fire turned to teal witch fire, its brightness kept; the red cloth to an ash grey with a little violet)
    teal = np.stack([mx * 0.35, mx * 0.95, mx * 0.85], -1)
    ash = grey * np.array([0.78, 0.74, 0.86])
    out = np.where(fire[..., None], teal * 0.85 + out * 0.15, np.where(hot[..., None], ash, out))
    res = a.copy()
    res[..., :3] = (out.clip(0, 1) * 255).astype(np.uint8)
    return res


# (how far above a kit piece's bottom edge it stands, as a share of its width: a one-tile piece's diamond is half as tall as wide, and
#  its foot point is the diamond's middle; flat pieces and the small flair stand on their bottom)
KIT_LIFT = 0.2


def clean(im):
    """The sheets' alpha is painted soft (about 251 for opaque, a haze of 1 and 2 around): opaque from 128, clear below."""
    a = np.array(im.convert('RGBA'))
    a[..., 3] = np.where(a[..., 3] >= 128, 255, 0)
    return a


def half(a):
    """Halve by a 2 x 2 box average of the opaque pixels; a pixel is opaque if two of its four were."""
    a = a.astype(float)
    h, w = a.shape[0] // 2, a.shape[1] // 2
    a = a[:h * 2, :w * 2].reshape(h, 2, w, 2, 4)
    al = a[..., 3].sum(axis=(1, 3))
    rgb = (a[..., :3] * a[..., 3:4]).sum(axis=(1, 3)) / np.maximum(al, 1)[..., None]
    out = np.zeros((h, w, 4), np.uint8)
    out[..., :3] = rgb.clip(0, 255)
    out[..., 3] = np.where(al >= 510, 255, 0)
    return out


def bbox(a):
    ys, xs = np.nonzero(a[..., 3])
    if not len(xs):
        return None
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def seamless(img):
    """Offset a texture by half, then blend a 16 px band across the seams that now cross its middle with the unshifted picture."""
    a = np.array(img.convert('RGB')).astype(float)
    n = a.shape[0]
    s = np.roll(np.roll(a, n // 2, 0), n // 2, 1)
    band = 16
    w = np.ones(n)
    for i in range(n):
        d = abs(i - n // 2)
        if d < band:
            w[i] = d / band
    # (the shifted picture is seamless at its edges; across its middle, its old edges meet: there the original, unshifted, shows)
    wy = w[:, None, None]
    wx = w[None, :, None]
    k = np.minimum(wy, wx)
    out = s * k + a * (1 - k)
    return Image.fromarray(out.clip(0, 255).astype(np.uint8))


def shrink(img, size):
    return img.resize(size, Image.Resampling.LANCZOS)


def pack(sprites, width=2048):
    order = sorted(sprites, key=lambda k: (-sprites[k].shape[0], k))
    x = y = rowh = 0
    rects = {}
    for k in order:
        h, w = sprites[k].shape[:2]
        if x + w + 2 > width:
            x, y, rowh = 0, y + rowh + 2, 0
        rects[k] = [x, y, w, h]
        x += w + 2
        rowh = max(rowh, h)
    atlas = np.zeros((y + rowh, width, 4), np.uint8)
    for k, (rx, ry, rw, rh) in rects.items():
        atlas[ry:ry + rh, rx:rx + rw] = sprites[k]
    return Image.fromarray(atlas), rects


def cut(army, report_only=False):
    spec = SHEETS[army]
    src = os.path.join(ROOT, 'art-source', 'assault', army)
    out = os.path.join(ROOT, 'src', 'art', 'assault', army)
    os.makedirs(out, exist_ok=True)
    sprites = {}
    feet = {}
    feet_of = {}
    report = []
    # (a hold's sheet not painted yet borrows another hold's in the same slot, recoloured: `fallback` names the hold and the files)
    fb_army, fb_files = spec.get('fallback', (None, {}))

    def sheet_path(sheet):
        path = os.path.join(src, sheet)
        if os.path.exists(path) or not fb_army:
            return path, False
        report.append(f'{sheet}: not painted yet; the stand-in is {fb_files[sheet]}, recoloured')
        return os.path.join(ROOT, 'art-source', 'assault', fb_army, fb_files[sheet]), True

    def load(sheet, mode):
        path, borrowed = sheet_path(sheet)
        im = Image.open(path)
        if not borrowed:
            return im.convert(mode)
        return Image.fromarray(cold(np.array(im.convert('RGBA')))).convert(mode)

    for sheet, cells in spec['sprites'].items():
        path, borrowed = sheet_path(sheet)
        if not os.path.exists(path):
            report.append(f'{sheet}: not painted yet (the field falls back to existing art)')
            continue
        a = clean(Image.open(path))
        if borrowed:
            plain = a
            a = cold(a)
        for name, (cx, cy, cw, ch, fx, fy, fu, fv) in cells.items():
            # (the shared pieces, our own siege works, keep their own colours)
            src_a = plain if borrowed and name in spec.get('shared', ()) else a
            cell = src_a[cy:cy + ch, cx:cx + cw]
            bb = bbox(cell)
            if bb is None:
                report.append(f'{sheet} {name}: empty cell')
                continue
            x0, y0, x1, y1 = bb
            # the footprint's bottom tip, and its left and right corners (u runs down to the right, v down to the left)
            tip = fy + (fu + fv) * 16
            mid = (x0 + x1) / 2
            off_y = y1 - tip
            off_x = mid - fx
            # (a piece painted away from its foot point is stood on its own picture instead: its middle, and its bottom less the
            #  footprint's half-height; a thin wall's base on the foot point itself, 27 px above the tip, is as painted and kept)
            stray = abs(off_x) > 24 or off_y < -40 or off_y > 20
            if stray:
                fx, fy = (x0 + x1) // 2, y1 - (fu + fv) * 16
            if abs(off_y) > 24 or abs(off_x) > 40:
                report.append(f'{sheet} {name} ({fu}x{fv}): bottom {off_y:+d} px from the footprint tip, middle {off_x:+.0f} px from the foot'
                              + (' (stood on its picture)' if stray else ''))
            # (cut on even bounds so the halving keeps the foot exact)
            x0 -= x0 % 2
            y0 -= y0 % 2
            x1 += x1 % 2
            y1 += y1 % 2
            h = half(cell[y0:y1, x0:x1])
            hb = bbox(h)
            if hb is None:
                continue
            hx0, hy0, hx1, hy1 = hb
            sprites[name] = h[hy0:hy1, hx0:hx1]
            feet[name] = [round((fx - x0) / 2 - hx0, 1), round((fy - y0) / 2 - hy0, 1)]
            feet_of[name] = [fu, fv]
    for name, path in spec['kits'].items():
        p = os.path.join(KITS, path + '.png')
        if not os.path.exists(p):
            report.append(f'kit {path}: missing')
            continue
        im = Image.open(p).convert('RGBA')
        a = np.array(im)
        a[..., 3] = np.where(a[..., 3] >= 128, 255, 0)
        # (the small flair is kept at its own size: halved, a flower is a pixel)
        h = a if min(im.size) < 70 else half(a)
        bb = bbox(h)
        x0, y0, x1, y1 = bb
        h = h[y0:y1, x0:x1]
        sprites[name] = h
        lift = 0 if min(im.size) < 70 else round(h.shape[1] * KIT_LIFT / 2, 1)
        feet[name] = [round(h.shape[1] / 2, 1), round(h.shape[0] - lift, 1)]
        feet_of[name] = [1, 1]
    for line in report:
        print(line)
    if report_only:
        return
    atlas, rects = pack(sprites)
    atlas.save(os.path.join(out, 'sprites.webp'), lossless=False, quality=90, method=6)
    # the flat art
    sheet, names = spec['ground']
    g = load(sheet, 'RGB')
    ground = Image.new('RGB', (1024, 1024))
    for i, n in enumerate(names):
        tile = g.crop((i % 4 * 256, i // 4 * 256, i % 4 * 256 + 256, i // 4 * 256 + 256))
        ground.paste(seamless(tile), (i % 4 * 256, i // 4 * 256))
    ground.save(os.path.join(out, 'ground.webp'), quality=88, method=6)
    sheet, names = spec['edges']
    e = Image.fromarray(soft(load(sheet, 'RGBA')))
    edges = Image.new('RGBA', (256, 256))
    for i, n in enumerate(names):
        tile = e.crop((i % 4 * 256, i // 4 * 256, i % 4 * 256 + 256, i // 4 * 256 + 256))
        edges.paste(shrink(tile, (64, 64)), (i % 4 * 64, i // 4 * 64))
    edges.save(os.path.join(out, 'edges.webp'), quality=90, method=6)
    sheet, names = spec['decals']
    d = Image.fromarray(soft(load(sheet, 'RGBA')))
    decals = Image.new('RGBA', (512, 512))
    for i, n in enumerate(names):
        tile = d.crop((i % 4 * 256, i // 4 * 256, i % 4 * 256 + 256, i // 4 * 256 + 256))
        decals.paste(shrink(tile, (128, 128)), (i % 4 * 128, i // 4 * 128))
    decals.save(os.path.join(out, 'decals.webp'), quality=90, method=6)
    sheet, names = spec['faces']
    f = load(sheet, 'RGBA')
    faces = Image.new('RGBA', (384, 240))
    for i, n in enumerate(names):
        col = f.crop((i % 6 * 256, i // 6 * 512, i % 6 * 256 + 256, i // 6 * 512 + 480))
        faces.paste(shrink(col, (64, 120)), (i % 6 * 64, i // 6 * 120))
    faces.save(os.path.join(out, 'faces.webp'), quality=90, method=6)
    Army = army[0].upper() + army[1:]
    ts = os.path.join(ROOT, 'src', 'render', f'assault{Army}Atlas.ts')
    with open(ts, 'w') as fh:
        fh.write(f"// Where each of the {army} hold's pieces sits in src/art/assault/{army}/ (the art plan's 2.1).\n")
        fh.write('// GENERATED by tools/assault/cut-sheets.py: do not edit by hand.\n\n')
        fh.write(f'export const SPRITES_SIZE: [number, number] = [{atlas.width}, {atlas.height}];\n')
        fh.write('/** Each standing sprite: [x, y, w, h] in sprites.webp, its foot point [x, y] in its rect (at the game\'s scale), and its footprint\n *  [along u, along v] in tiles. */\n')
        fh.write('export const SPRITES: Record<string, { r: [number, number, number, number]; foot: [number, number]; fp: [number, number] }> = {\n')
        for k in sorted(rects):
            fh.write(f"  {k}: {{ r: {json.dumps(rects[k])}, foot: {json.dumps(feet[k])}, fp: {json.dumps(feet_of[k])} }},\n")
        fh.write('};\n')
        fh.write('/** The ground textures, 4 x 4 in ground.webp (256 px each, 4 x 4 tiles). */\n')
        fh.write(f"export const GROUND = {json.dumps(spec['ground'][1])} as const;\n")
        fh.write('/** The transitions, 4 x 4 in edges.webp (64 px each, one tile, the material along the top edge; a corner in the top left). */\n')
        fh.write(f"export const EDGES = {json.dumps(spec['edges'][1])} as const;\n")
        fh.write('/** The decals, 4 x 4 in decals.webp (128 px each, 2 x 2 tiles). */\n')
        fh.write(f"export const DECALS = {json.dumps(spec['decals'][1])} as const;\n")
        fh.write('/** The faces, 6 x 2 in faces.webp (64 x 120 each: a lip of 20, a body of 80 (four steps), a foot of 20). */\n')
        fh.write(f"export const FACES = {json.dumps(spec['faces'][1])} as const;\n")
    print('sprites', atlas.size, len(sprites), os.path.getsize(os.path.join(out, 'sprites.webp')))
    for n in ['ground', 'edges', 'decals', 'faces']:
        print(n, os.path.getsize(os.path.join(out, n + '.webp')))


def soft(im):
    """Decals and transitions keep their soft alpha (rescaled so the painted 251 reads as opaque); the haze below 8 is cleared."""
    a = np.array(im.convert('RGBA')).astype(float)
    al = a[..., 3]
    al = np.where(al < 8, 0, np.minimum(255, al * 255 / 250))
    a[..., 3] = al
    return a.astype(np.uint8)


if __name__ == '__main__':
    args = [x for x in sys.argv[1:] if not x.startswith('--')]
    cut(args[0] if args else 'orc', '--report' in sys.argv)
