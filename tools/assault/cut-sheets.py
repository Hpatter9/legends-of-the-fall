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

Run by hand: KITS=<path to the kits folder> python3 tools/assault/cut-sheets.py [orc|undead|beasts|wildwood|labyrinth|ogres|infernal|yokai|golems] [--report]
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

# The pieces that stand on their own base when they are painted away from their foot point (see `cut`).
BASE_FOOT = {'ladder'}

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


# ----- the Howling Den (phase 4): an autumn moor outside the ring, snow within it -----
#
# As for the Necropolis: the Orc profile's slots and names, its own sheets (docs/notes/assault-4-howling-den-art-prompts.md) and the Moonpack
# kit. A sheet not painted yet falls back to the Orc sheet in the same slot, recoloured by `den_tint`: the moor's pieces turned to autumn,
# the crag wall's and the den's frosted, and on the ground sheet `campDirt` repainted as trodden snow (the field lays it inside the ring).
BEASTS_FILES = {
    'orc-01-palisade.png': 'bst-01-log-walls.png', 'orc-02-gates.png': 'bst-02-gates.png', 'orc-03-iron-gate.png': 'bst-03-antler-gate.png',
    'orc-04-faces.png': 'bst-04-faces.png', 'orc-05-ground.png': 'bst-05-ground.png', 'orc-06-transitions.png': 'bst-06-transitions.png',
    'orc-07-keep.png': 'bst-07-keep.png', 'orc-08-wall-dressing.png': 'bst-08-wall-dressing.png', 'orc-09-camp.png': 'bst-09-landmarks.png',
    'orc-10-camp-props.png': 'bst-10-props.png', 'orc-11-siege-ruins.png': 'bst-11-ruins.png', 'orc-12-river.png': 'bst-12-gorge.png',
    'orc-13-decals.png': 'bst-13-decals.png',
}
SHEETS['beasts'] = {
    'sprites': {BEASTS_FILES[k]: v for k, v in _orc['sprites'].items()},
    'ground': (BEASTS_FILES[_orc['ground'][0]], _orc['ground'][1]),
    'edges': (BEASTS_FILES[_orc['edges'][0]], _orc['edges'][1]),
    'decals': (BEASTS_FILES[_orc['decals'][0]], _orc['decals'][1]),
    'faces': (BEASTS_FILES[_orc['faces'][0]], _orc['faces'][1]),
    'fallback': ('orc', {v: k for k, v in BEASTS_FILES.items()}),
    'shared': {'ladder', 'ram', 'trebuchet'},
    'tint': lambda a, sheet, slot=None: den_tint(a, sheet, slot),
    'kits': {
        **_orc['kits'],
        'kitSpikedWall': 'moonpack/log_wall_run', 'kitSpikedCorner': 'moonpack/log_wall_corner', 'kitSkullGate': 'moonpack/bone_gate',
        'kitStakeFence': 'moonpack/bone_fence', 'longhouse': 'moonpack/longhouse', 'boneHut': 'moonpack/cottage', 'hideHut': 'moonpack/tavern',
        'watchtower': 'moonpack/lookout_tower', 'warDrum': 'moonpack/howling_stone', 'skullTotem': 'moonpack/shrine',
        'skullTorch': 'moonpack/torch_post', 'spearSign': 'moonpack/skull_signpost', 'bonfire': 'moonpack/bonfire',
        'weaponStall': 'moonpack/pelt_stall', 'warCart': 'moonpack/sled', 'granary': 'moonpack/granary', 'meatPile': 'moonpack/hide_bundles',
        'barrels': 'moonpack/barrels', 'stockpile': 'moonpack/stockpile', 'woodpile': 'moonpack/woodpile', 'well': 'moonpack/well',
        'logBridge': 'moonpack/rope_bridge', 'pine2': 'moonpack/berry_pine', 'gnarledTree': 'moonpack/bare_tree', 'darkRocks': 'moonpack/rocks_b',
        'darkRocksB': 'moonpack/rocks_c',
        # (the Den's own dressing, which the Orc hold has no slot for)
        'caveDen': 'moonpack/cave_den', 'snowyPine': 'moonpack/snowy_pine', 'snowyBush': 'moonpack/snowy_bush', 'peltStall': 'moonpack/pelt_stall',
    },
}
# (the Orc sheets that stand in the crags, frosted; the rest stand on the moor, in autumn)
DEN_FROST = {'bst-03-antler-gate.png', 'bst-07-keep.png', 'bst-08-wall-dressing.png'}
DEN_GROUND = {'campDirt': 'snow', 'flagstones': 'frost', 'wallWalk': 'frost', 'cobbles': 'frost', 'shingle': 'cool', 'shallows': 'cool',
              'scorched': None, 'ash': None}
DEN_FACES = {'stoneWall': 'frost', 'stoneWallDamaged': 'frost', 'tower': 'frost', 'terrace': 'frost', 'moundEarth': 'snow',
             'riverBank': 'cool', 'basalt': 'cool'}


def autumn(a):
    """The moor's stand-in: greens turned to russet and gold, the rest a little warmer; fire and the dark kept."""
    rgb = a[..., :3].astype(float) / 255
    mx = rgb.max(-1)
    mn = rgb.min(-1)
    c = mx - mn
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    # (the hue in turns, 0 to 1)
    h = np.where(c == 0, 0, np.where(mx == r, ((g - b) / np.maximum(c, 1e-6)) % 6, np.where(mx == g, (b - r) / np.maximum(c, 1e-6) + 2, (r - g) / np.maximum(c, 1e-6) + 4))) / 6
    # (yellow to green, 0.1 to 0.45, is pulled to russet and gold, 0.06 to 0.11; the further green, the redder)
    sat = c / np.maximum(mx, 1e-6)
    fire = (mx > 0.72) & (h < 0.17) & (sat > 0.45)
    leafy = (h > 0.1) & (h < 0.45) & (c > 0.04) & ~fire
    # (the orcs' red cloth, to tanned hide)
    red = ((h < 0.035) | (h > 0.94)) & (sat > 0.45) & (mx > 0.25)
    h2 = np.where(leafy, 0.06 + (0.45 - h) / 0.35 * 0.05, h)
    s2 = np.where(leafy, np.minimum(1, c / np.maximum(mx, 1e-6) * 1.15), c / np.maximum(mx, 1e-6))
    v2 = mx * np.where(leafy, 0.95, 1.0)
    # (back from hue, saturation and value)
    k6 = h2 * 6
    i = np.floor(k6).astype(int) % 6
    f = k6 - np.floor(k6)
    p_, q, t = v2 * (1 - s2), v2 * (1 - s2 * f), v2 * (1 - s2 * (1 - f))
    sel = [np.stack(x, -1) for x in ((v2, t, p_), (q, v2, p_), (p_, v2, t), (p_, q, v2), (t, p_, v2), (v2, p_, q))]
    out = np.choose(i[..., None], sel)
    hide = mx[..., None] * np.array([0.78, 0.6, 0.42])
    out = np.where(red[..., None], hide, out)
    out = out * np.array([1.03, 0.99, 0.92])
    res = a.copy()
    res[..., :3] = (out.clip(0, 1) * 255).astype(np.uint8)
    return res


def snow(a):
    """Trodden snow: the picture's light and shade kept as the snow's, in a blue-white."""
    rgb = a[..., :3].astype(float) / 255
    grey = rgb.mean(-1, keepdims=True)
    lo, hi = grey.min(), grey.max()
    k = (grey - lo) / max(hi - lo, 1e-6)
    out = np.array([0.6, 0.66, 0.78]) + k * np.array([0.38, 0.33, 0.22])
    res = a.copy()
    res[..., :3] = (out.clip(0, 1) * 255).astype(np.uint8)
    return res


def frost(a):
    """Stone and timber in the crags: drained to a cold grey and lifted towards white, as if rimed."""
    rgb = a[..., :3].astype(float) / 255
    grey = rgb.mean(-1, keepdims=True)
    out = grey * np.array([0.92, 0.97, 1.06]) * 0.8 + (rgb - grey) * 0.3 + 0.16
    res = a.copy()
    res[..., :3] = (out.clip(0, 1) * 255).astype(np.uint8)
    return res


def cool(a):
    """The gorge's water and wet stone: a little colder."""
    rgb = a[..., :3].astype(float) / 255
    grey = rgb.mean(-1, keepdims=True)
    out = grey * np.array([0.82, 0.94, 1.1]) + (rgb - grey) * 0.4
    res = a.copy()
    res[..., :3] = (out.clip(0, 1) * 255).astype(np.uint8)
    return res


def den_tint(a, sheet, slot=None):
    if slot is not None:
        how = (DEN_GROUND if sheet.startswith('bst-05') else DEN_FACES).get(slot, 'autumn')
    else:
        how = 'frost' if sheet in DEN_FROST else 'autumn'
    return {'autumn': autumn, 'snow': snow, 'frost': frost, 'cool': cool, None: lambda x: x}[how](a)



# ----- Elder Root (phase 4): the Wildwood's deep forest -----
#
# As for the others: the Orc profile's slots and names, its own sheets (docs/notes/assault-4-elder-root-art-prompts.md) and the Druids and
# Fae kits. A sheet not painted yet falls back to the Orc sheet in the same slot, recoloured by `forest`: the grass deepened to forest green,
# the stone and the timber mossed, the red cloth turned to leaf green, the fire kept.
WILDWOOD_FILES = {
    'orc-01-palisade.png': 'wld-01-thorn-hedge.png', 'orc-02-gates.png': 'wld-02-gates.png', 'orc-03-iron-gate.png': 'wld-03-heartwood-gate.png',
    'orc-04-faces.png': 'wld-04-faces.png', 'orc-05-ground.png': 'wld-05-ground.png', 'orc-06-transitions.png': 'wld-06-transitions.png',
    'orc-07-keep.png': 'wld-07-keep.png', 'orc-08-wall-dressing.png': 'wld-08-wall-dressing.png', 'orc-09-camp.png': 'wld-09-landmarks.png',
    'orc-10-camp-props.png': 'wld-10-props.png', 'orc-11-siege-ruins.png': 'wld-11-ruins.png', 'orc-12-river.png': 'wld-12-mire.png',
    'orc-13-decals.png': 'wld-13-decals.png',
}
SHEETS['wildwood'] = {
    'sprites': {WILDWOOD_FILES[k]: v for k, v in _orc['sprites'].items()},
    'ground': (WILDWOOD_FILES[_orc['ground'][0]], _orc['ground'][1]),
    'edges': (WILDWOOD_FILES[_orc['edges'][0]], _orc['edges'][1]),
    'decals': (WILDWOOD_FILES[_orc['decals'][0]], _orc['decals'][1]),
    'faces': (WILDWOOD_FILES[_orc['faces'][0]], _orc['faces'][1]),
    'fallback': ('orc', {v: k for k, v in WILDWOOD_FILES.items()}),
    'shared': {'ladder', 'ram', 'trebuchet'},
    'tint': lambda a, sheet, slot=None: forest(a),
    'kits': {
        **_orc['kits'],
        'kitSpikedWall': 'druids/hedge_wall_run', 'kitSpikedCorner': 'druids/hedge_wall_corner', 'kitSkullGate': 'druids/tree_gate',
        'kitStakeFence': 'druids/wattle_fence', 'longhouse': 'druids/longhouse', 'boneHut': 'druids/cottage', 'hideHut': 'druids/tavern',
        'forge': 'druids/workshop', 'wargPen': 'druids/animal_pen', 'pigPen': 'druids/herb_garden_tile', 'watchtower': 'druids/watch_platform',
        'lookout': 'fae/spiral_watchtower', 'warDrum': 'druids/stone_circle', 'skullTotem': 'druids/shrine', 'skullTorch': 'druids/mushroom_lantern',
        'spearSign': 'druids/totem_signpost', 'bonfire': 'druids/campfire', 'weaponStall': 'druids/market_stall', 'warCart': 'druids/cart',
        'granary': 'druids/granary', 'meatRacks': 'druids/clay_pots', 'meatPile': 'druids/hay_bales', 'barrels': 'fae/honey_jars',
        'stockpile': 'druids/stockpile', 'woodpile': 'druids/log_pile', 'well': 'druids/well', 'hides': 'druids/baskets',
        'logBridge': 'fae/root_bridge', 'brazier': 'fae/light_lantern_post', 'pine2': 'druids/birch_tree', 'gnarledTree': 'druids/great_oak',
        'bareTree': 'fae/silver_birch', 'thornBush': 'druids/berry_bush', 'boulders': 'druids/mossy_rocks', 'rocks': 'druids/mossy_rocks',
        'darkRocks': 'druids/mossy_rocks', 'darkRocksB': 'fae/crystal_rocks', 'standingStone': 'druids/shrine',
        # (Elder Root's own dressing, which the Orc hold has no slot for)
        'greatOak': 'druids/great_oak', 'weepingWillow': 'fae/weeping_willow', 'glowBush': 'fae/glow_bush', 'stoneCircle': 'druids/stone_circle',
    },
}


def forest(a):
    """The deep forest's stand-in: yellow-greens deepened to forest green, the grey stone and the pale timber mossed, the red cloth to leaf
    green, the fire kept."""
    rgb = a[..., :3].astype(float) / 255
    mx = rgb.max(-1)
    mn = rgb.min(-1)
    c = mx - mn
    sat = c / np.maximum(mx, 1e-6)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    h = np.where(c == 0, 0, np.where(mx == r, ((g - b) / np.maximum(c, 1e-6)) % 6, np.where(mx == g, (b - r) / np.maximum(c, 1e-6) + 2, (r - g) / np.maximum(c, 1e-6) + 4))) / 6
    fire = (mx > 0.72) & (h < 0.17) & (sat > 0.45)
    leafy = (h > 0.12) & (h < 0.45) & (c > 0.04) & ~fire
    red = ((h < 0.035) | (h > 0.94)) & (sat > 0.45) & (mx > 0.25)
    grey = rgb.mean(-1, keepdims=True)
    # (the leaves deeper and greener; the cloth to a leaf green; the rest a touch of moss, darker under the canopy)
    deep = np.stack([r * 0.55, g * 0.92, b * 0.55 + g * 0.08], -1)
    cloth = mx[..., None] * np.array([0.36, 0.62, 0.3])
    moss = rgb * 0.82 + grey * np.array([-0.04, 0.06, -0.04])
    out = np.where(leafy[..., None], deep, np.where(red[..., None], cloth, np.where(fire[..., None], rgb, moss * 0.94)))
    res = a.copy()
    res[..., :3] = (out.clip(0, 1) * 255).astype(np.uint8)
    return res



# ----- the Heart of the Maze (phase 4): the Labyrinth's sandstone -----
#
# As for the others: the Orc profile's slots and names, its own sheets (docs/notes/assault-4-heart-of-the-maze-art-prompts.md) and the Knights
# and Nomads kits; and one sheet of its own with no Orc twin, the maze walls (lab-14), whose pieces the kit's stone wall stands in for until it
# is painted (`standins`: a kit picture used only for a piece no sheet gave). A borrowed Orc sheet is recoloured by `sandstone`.
LABYRINTH_FILES = {
    'orc-01-palisade.png': 'lab-01-ring-wall.png', 'orc-02-gates.png': 'lab-02-gates.png', 'orc-03-iron-gate.png': 'lab-03-bronze-gate.png',
    'orc-04-faces.png': 'lab-04-faces.png', 'orc-05-ground.png': 'lab-05-ground.png', 'orc-06-transitions.png': 'lab-06-transitions.png',
    'orc-07-keep.png': 'lab-07-keep.png', 'orc-08-wall-dressing.png': 'lab-08-wall-dressing.png', 'orc-09-camp.png': 'lab-09-landmarks.png',
    'orc-10-camp-props.png': 'lab-10-props.png', 'orc-11-siege-ruins.png': 'lab-11-ruins.png', 'orc-12-river.png': 'lab-12-canal.png',
    'orc-13-decals.png': 'lab-13-decals.png',
}
SHEETS['labyrinth'] = {
    'sprites': {
        **{LABYRINTH_FILES[k]: v for k, v in _orc['sprites'].items()},
        # (its own sheet: the maze walls; the game draws every maze tile as `mazeRun` for now, the rest wait for the maze's finer drawing)
        'lab-14-maze-walls.png': props([
            'mazeRun', 'mazeCracked', 'mazeBanner', 'mazeTorch', 'mazeCornerA', 'mazeCornerB', 'mazeTee', 'mazeEnd',
            'mazeBroken', 'mazeGap', 'mazeNiche', 'mazeVine', 'mazeFresco', 'mazeGrille', 'mazeSpears', 'mazeJar']),
    },
    'ground': (LABYRINTH_FILES[_orc['ground'][0]], _orc['ground'][1]),
    'edges': (LABYRINTH_FILES[_orc['edges'][0]], _orc['edges'][1]),
    'decals': (LABYRINTH_FILES[_orc['decals'][0]], _orc['decals'][1]),
    'faces': (LABYRINTH_FILES[_orc['faces'][0]], _orc['faces'][1]),
    'fallback': ('orc', {v: k for k, v in LABYRINTH_FILES.items()}),
    'shared': {'ladder', 'ram', 'trebuchet'},
    'tint': lambda a, sheet, slot=None: sandstone(a),
    # (until lab-14 is painted, each maze tile is the hold's own low barricade, recoloured: '=' names another piece of the atlas)
    'standins': {'mazeRun': '=barricade'},
    'kits': {
        **_orc['kits'],
        'kitSpikedWall': 'knights/stone_wall_run', 'kitSpikedCorner': 'knights/stone_wall_corner', 'kitSkullGate': 'knights/gatehouse',
        'kitStakeFence': 'nomads/rope_fence', 'longhouse': 'knights/barracks', 'boneHut': 'nomads/cottage', 'hideHut': 'knights/granary',
        'forge': 'knights/workshop', 'wargPen': 'nomads/horse_corral', 'watchtower': 'knights/watchtower', 'lookout': 'nomads/scaffold_tower',
        'warDrum': 'nomads/shrine', 'skullTotem': 'nomads/shrine', 'skullTorch': 'nomads/tassel_lantern', 'spearSign': 'nomads/standard',
        'bonfire': 'nomads/campfire', 'weaponStall': 'nomads/carpet_stall', 'warCart': 'knights/cart', 'granary': 'nomads/granary',
        'meatRacks': 'nomads/water_skins', 'meatPile': 'knights/hay_bales', 'barrels': 'knights/barrels', 'chests': 'nomads/chests',
        'stockpile': 'nomads/stockpile', 'woodpile': 'knights/woodpile', 'well': 'knights/well', 'hides': 'knights/crates',
        'logBridge': 'knights/stone_bridge', 'brazier': 'knights/lamp_post', 'pine1': 'nomads/acacia_tree', 'pine2': 'knights/oak_tree',
        'gnarledTree': 'nomads/acacia_tree', 'bareTree': 'nomads/dead_shrub', 'thornBush': 'nomads/tumbleweed', 'shrub1': 'knights/bush',
        'boulders': 'nomads/red_rocks', 'rocks': 'knights/rocks', 'darkRocks': 'nomads/red_rocks', 'darkRocksB': 'nomads/red_rocks_small',
    },
}


def sandstone(a):
    """The Labyrinth's stand-in: the grass dried to gold, the grey stone warmed to sandstone, the timber a little paler, the red cloth kept
    (the Labyrinth's own red), the fire kept."""
    rgb = a[..., :3].astype(float) / 255
    mx = rgb.max(-1)
    mn = rgb.min(-1)
    c = mx - mn
    sat = c / np.maximum(mx, 1e-6)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    h = np.where(c == 0, 0, np.where(mx == r, ((g - b) / np.maximum(c, 1e-6)) % 6, np.where(mx == g, (b - r) / np.maximum(c, 1e-6) + 2, (r - g) / np.maximum(c, 1e-6) + 4))) / 6
    fire = (mx > 0.72) & (h < 0.17) & (sat > 0.45)
    red = ((h < 0.035) | (h > 0.94)) & (sat > 0.45)
    leafy = (h > 0.12) & (h < 0.45) & (c > 0.04) & ~fire
    grey = rgb.mean(-1, keepdims=True)
    dry = np.stack([g * 0.98 + r * 0.1, g * 0.84, b * 0.5], -1)
    warm = grey * np.array([1.12, 0.98, 0.78]) + (rgb - grey) * 0.5 + np.array([0.03, 0.01, -0.02])
    out = np.where(leafy[..., None], dry, np.where((red | fire)[..., None], rgb, warm))
    res = a.copy()
    res[..., :3] = (out.clip(0, 1) * 255).astype(np.uint8)
    return res



# ----- Bonefire Crag (phase 4): the Ogre Clans' cold highland camp -----
#
# As for the others: the Orc profile's slots and names, its own sheets (docs/notes/assault-4-bonefire-crag-art-prompts.md), and the Orcs and
# Dwarves kits (Bloodtusk Hold has the Orcs kit too, so the Dwarves' stone carries this hold's look). A borrowed Orc sheet is recoloured by
# `highland`: the grass cooled, the timber and stone greyed towards the crags' frost, the red cloth and the fire kept.
OGRES_FILES = {
    'orc-01-palisade.png': 'ogr-01-tusk-wall.png', 'orc-02-gates.png': 'ogr-02-gates.png', 'orc-03-iron-gate.png': 'ogr-03-skull-gate.png',
    'orc-04-faces.png': 'ogr-04-faces.png', 'orc-05-ground.png': 'ogr-05-ground.png', 'orc-06-transitions.png': 'ogr-06-transitions.png',
    'orc-07-keep.png': 'ogr-07-keep.png', 'orc-08-wall-dressing.png': 'ogr-08-wall-dressing.png', 'orc-09-camp.png': 'ogr-09-landmarks.png',
    'orc-10-camp-props.png': 'ogr-10-props.png', 'orc-11-siege-ruins.png': 'ogr-11-ruins.png', 'orc-12-river.png': 'ogr-12-torrent.png',
    'orc-13-decals.png': 'ogr-13-decals.png',
}
SHEETS['ogres'] = {
    'sprites': {OGRES_FILES[k]: v for k, v in _orc['sprites'].items()},
    'ground': (OGRES_FILES[_orc['ground'][0]], _orc['ground'][1]),
    'edges': (OGRES_FILES[_orc['edges'][0]], _orc['edges'][1]),
    'decals': (OGRES_FILES[_orc['decals'][0]], _orc['decals'][1]),
    'faces': (OGRES_FILES[_orc['faces'][0]], _orc['faces'][1]),
    'fallback': ('orc', {v: k for k, v in OGRES_FILES.items()}),
    'shared': {'ladder', 'ram', 'trebuchet'},
    'tint': lambda a, sheet, slot=None: highland(a),
    'kits': {
        **_orc['kits'],
        'kitSpikedWall': 'dwarves/stone_wall_run', 'kitSpikedCorner': 'dwarves/stone_wall_corner', 'kitSkullGate': 'dwarves/cliff_gate',
        'kitStakeFence': 'dwarves/chain_fence', 'longhouse': 'dwarves/great_hall', 'boneHut': 'dwarves/cottage', 'hideHut': 'orcs/tavern',
        'forge': 'dwarves/forge', 'forgeFire': 'dwarves/forge_fire', 'watchtower': 'dwarves/watchtower', 'lookout': 'orcs/siege_tower',
        'skullTotem': 'dwarves/shrine', 'brazier': 'dwarves/brazier', 'granary': 'dwarves/granary', 'stockpile': 'dwarves/stockpile',
        'logBridge': 'dwarves/stone_bridge', 'pine1': 'dwarves/dead_pine', 'pine2': 'moonpack/snowy_pine', 'pineSmall': 'moonpack/small_pine',
        'boulders': 'dwarves/boulders', 'rocks': 'dwarves/rocks_a', 'darkRocks': 'dwarves/rocks_b', 'darkRocksB': 'orcs/dark_rocks_b',
        'rubblePile': 'dwarves/rubble', 'chests': 'dwarves/crates',
    },
}


def highland(a):
    """The Ogre Clans' stand-in: the grass cooled towards a cold green, the timber and stone greyed and lifted towards frost, the red cloth
    and the fire kept."""
    rgb = a[..., :3].astype(float) / 255
    mx = rgb.max(-1)
    mn = rgb.min(-1)
    c = mx - mn
    sat = c / np.maximum(mx, 1e-6)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    h = np.where(c == 0, 0, np.where(mx == r, ((g - b) / np.maximum(c, 1e-6)) % 6, np.where(mx == g, (b - r) / np.maximum(c, 1e-6) + 2, (r - g) / np.maximum(c, 1e-6) + 4))) / 6
    fire = (mx > 0.72) & (h < 0.17) & (sat > 0.45)
    red = ((h < 0.035) | (h > 0.94)) & (sat > 0.45)
    leafy = (h > 0.12) & (h < 0.45) & (c > 0.04) & ~fire
    grey = rgb.mean(-1, keepdims=True)
    cold = np.stack([r * 0.6 + grey[..., 0] * 0.15, g * 0.82, b * 0.7 + g * 0.12], -1)
    stone = grey * np.array([0.92, 0.96, 1.04]) + (rgb - grey) * 0.45 + 0.03
    out = np.where(leafy[..., None], cold, np.where((red | fire)[..., None], rgb, stone))
    res = a.copy()
    res[..., :3] = (out.clip(0, 1) * 255).astype(np.uint8)
    return res



# ----- Brimstone Gate (phase 4): the Infernal Host's pit -----
#
# As for the others: the Orc profile's slots and names, its own sheets (docs/notes/assault-4-brimstone-gate-art-prompts.md) and the Blood Court
# and Dwarves kits. A borrowed Orc sheet is recoloured by `pit` (by slot on the ground sheet): everything darkened to ash and black stone with
# a red cast, the fire kept; and the water slot (`shallows`, which the field also lays under deep water) painted as lava, the shingle at its
# edge as cooling crust.
INFERNAL_FILES = {
    'orc-01-palisade.png': 'inf-01-spike-wall.png', 'orc-02-gates.png': 'inf-02-gates.png', 'orc-03-iron-gate.png': 'inf-03-infernal-gate.png',
    'orc-04-faces.png': 'inf-04-faces.png', 'orc-05-ground.png': 'inf-05-ground.png', 'orc-06-transitions.png': 'inf-06-transitions.png',
    'orc-07-keep.png': 'inf-07-keep.png', 'orc-08-wall-dressing.png': 'inf-08-wall-dressing.png', 'orc-09-camp.png': 'inf-09-landmarks.png',
    'orc-10-camp-props.png': 'inf-10-props.png', 'orc-11-siege-ruins.png': 'inf-11-ruins.png', 'orc-12-river.png': 'inf-12-lava.png',
    'orc-13-decals.png': 'inf-13-decals.png',
}
SHEETS['infernal'] = {
    'sprites': {INFERNAL_FILES[k]: v for k, v in _orc['sprites'].items()},
    'ground': (INFERNAL_FILES[_orc['ground'][0]], _orc['ground'][1]),
    'edges': (INFERNAL_FILES[_orc['edges'][0]], _orc['edges'][1]),
    'decals': (INFERNAL_FILES[_orc['decals'][0]], _orc['decals'][1]),
    'faces': (INFERNAL_FILES[_orc['faces'][0]], _orc['faces'][1]),
    'fallback': ('orc', {v: k for k, v in INFERNAL_FILES.items()}),
    'shared': {'ladder', 'ram', 'trebuchet'},
    'tint': lambda a, sheet, slot=None: lava(a) if slot == 'shallows' else crust(a) if slot == 'shingle' else pit(a),
    'kits': {
        **_orc['kits'],
        'kitSpikedWall': 'bloodcourt/stone_wall_run', 'kitSpikedCorner': 'bloodcourt/stone_wall_corner', 'kitSkullGate': 'bloodcourt/gatehouse',
        'kitStakeFence': 'bloodcourt/iron_fence', 'longhouse': 'bloodcourt/longhouse', 'boneHut': 'bloodcourt/cottage', 'hideHut': 'bloodcourt/workshop',
        'forge': 'dwarves/forge', 'forgeFire': 'dwarves/forge_fire', 'wargPen': 'bloodcourt/blood_farm', 'watchtower': 'bloodcourt/watchtower',
        'lookout': 'dwarves/watchtower', 'skullTotem': 'bloodcourt/crypt', 'skullTorch': 'bloodcourt/lantern_post', 'spearSign': 'bloodcourt/banner',
        'weaponStall': 'bloodcourt/market_stall', 'warCart': 'bloodcourt/carriage', 'granary': 'bloodcourt/granary', 'barrels': 'bloodcourt/barrels',
        'chests': 'bloodcourt/coffins', 'stockpile': 'bloodcourt/stockpile', 'woodpile': 'bloodcourt/dead_woodpile', 'well': 'bloodcourt/well',
        'logBridge': 'bloodcourt/stone_bridge', 'brazier': 'bloodcourt/brazier', 'pine1': 'bloodcourt/dead_oak', 'pine2': 'dwarves/dead_pine',
        'gnarledTree': 'bloodcourt/dead_oak', 'bareTree': 'dwarves/dead_pine', 'thornBush': 'bloodcourt/thorn_bush', 'boulders': 'dwarves/boulders',
        'rocks': 'bloodcourt/rocks', 'darkRocks': 'dwarves/rocks_b', 'darkRocksB': 'dwarves/coal_heap', 'meatPile': 'dwarves/ore_pile',
    },
}


def _hue(rgb):
    mx = rgb.max(-1)
    mn = rgb.min(-1)
    c = mx - mn
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    h = np.where(c == 0, 0, np.where(mx == r, ((g - b) / np.maximum(c, 1e-6)) % 6, np.where(mx == g, (b - r) / np.maximum(c, 1e-6) + 2, (r - g) / np.maximum(c, 1e-6) + 4))) / 6
    return h, mx, c / np.maximum(mx, 1e-6)


def pit(a):
    """The pit's stand-in: everything darkened towards ash and black stone with a red cast, the red cloth and the fire kept."""
    rgb = a[..., :3].astype(float) / 255
    h, mx, sat = _hue(rgb)
    fire = (mx > 0.72) & (h < 0.17) & (sat > 0.45)
    red = ((h < 0.035) | (h > 0.94)) & (sat > 0.45)
    grey = rgb.mean(-1, keepdims=True)
    ash = grey * np.array([0.78, 0.66, 0.64]) + (rgb - grey) * 0.2
    out = np.where((red | fire)[..., None], rgb, ash)
    res = a.copy()
    res[..., :3] = (out.clip(0, 1) * 255).astype(np.uint8)
    return res


def lava(a):
    """Lava, from the water's ripples: their light and shade kept as the flow's, in molten orange to yellow, dark crust in the shade."""
    rgb = a[..., :3].astype(float) / 255
    grey = rgb.mean(-1, keepdims=True)
    lo, hi = grey.min(), grey.max()
    k = (grey - lo) / max(hi - lo, 1e-6)
    out = np.array([0.55, 0.12, 0.02]) + k * np.array([0.45, 0.62, 0.2])
    res = a.copy()
    res[..., :3] = (out.clip(0, 1) * 255).astype(np.uint8)
    return res


def crust(a):
    """Cooling crust: the stones dark, their gaps glowing."""
    rgb = a[..., :3].astype(float) / 255
    grey = rgb.mean(-1, keepdims=True)
    lo, hi = grey.min(), grey.max()
    k = (grey - lo) / max(hi - lo, 1e-6)
    glow = np.array([0.85, 0.28, 0.05]) * (1 - k) ** 8 * 0.8
    out = grey * np.array([0.5, 0.42, 0.4]) + glow
    res = a.copy()
    res[..., :3] = (out.clip(0, 1) * 255).astype(np.uint8)
    return res



# ----- the Moonlit Shrine (phase 4): the Yokai Night Parade's moonlit mountain shrine -----
#
# As for the others: the Orc profile's slots and names, its own sheets (docs/notes/assault-4-moonlit-shrine-art-prompts.md) and the Fae and
# Liches kits. A borrowed Orc sheet is recoloured by `moonlit`: the grass and timber cooled to a moonlit blue-green, the stone silvered, the
# red cloth turned vermilion and the fire kept.
YOKAI_FILES = {
    'orc-01-palisade.png': 'yok-01-tiled-wall.png', 'orc-02-gates.png': 'yok-02-gates.png', 'orc-03-iron-gate.png': 'yok-03-moon-gate.png',
    'orc-04-faces.png': 'yok-04-faces.png', 'orc-05-ground.png': 'yok-05-ground.png', 'orc-06-transitions.png': 'yok-06-transitions.png',
    'orc-07-keep.png': 'yok-07-keep.png', 'orc-08-wall-dressing.png': 'yok-08-wall-dressing.png', 'orc-09-camp.png': 'yok-09-landmarks.png',
    'orc-10-camp-props.png': 'yok-10-props.png', 'orc-11-siege-ruins.png': 'yok-11-ruins.png', 'orc-12-river.png': 'yok-12-pond.png',
    'orc-13-decals.png': 'yok-13-decals.png',
}
SHEETS['yokai'] = {
    'sprites': {YOKAI_FILES[k]: v for k, v in _orc['sprites'].items()},
    'ground': (YOKAI_FILES[_orc['ground'][0]], _orc['ground'][1]),
    'edges': (YOKAI_FILES[_orc['edges'][0]], _orc['edges'][1]),
    'decals': (YOKAI_FILES[_orc['decals'][0]], _orc['decals'][1]),
    'faces': (YOKAI_FILES[_orc['faces'][0]], _orc['faces'][1]),
    'fallback': ('orc', {v: k for k, v in YOKAI_FILES.items()}),
    'shared': {'ladder', 'ram', 'trebuchet'},
    'tint': lambda a, sheet, slot=None: moonlit(a),
    'kits': {
        **_orc['kits'],
        'kitSpikedWall': 'fae/rose_hedge_run', 'kitSpikedCorner': 'fae/rose_hedge_corner', 'kitSkullGate': 'fae/flower_arch_gate',
        'kitStakeFence': 'fae/twig_fence', 'longhouse': 'fae/longhouse', 'boneHut': 'fae/cottage', 'hideHut': 'fae/tavern',
        'forge': 'fae/workshop', 'forgeFire': 'fae/blue_campfire', 'wargPen': 'fae/firefly_pen', 'pigPen': 'fae/mushroom_patch_tile',
        'watchtower': 'fae/spiral_watchtower', 'lookout': 'liches/watchtower', 'warDrum': 'fae/fairy_ring', 'skullTotem': 'fae/shrine',
        'skullTorch': 'fae/light_lantern_post', 'spearSign': 'fae/ribbon_signpost', 'bonfire': 'fae/blue_campfire', 'weaponStall': 'fae/silk_stall',
        'warCart': 'fae/shell_cart', 'granary': 'fae/granary', 'meatRacks': 'fae/honey_jars', 'meatPile': 'fae/flower_bales', 'barrels': 'liches/barrels',
        'stockpile': 'fae/stockpile', 'woodpile': 'fae/woodpile', 'well': 'fae/well', 'hides': 'fae/baskets', 'logBridge': 'fae/root_bridge',
        'brazier': 'liches/lantern_post', 'pine1': 'liches/dead_pine', 'pine2': 'fae/silver_birch', 'gnarledTree': 'fae/weeping_willow',
        'bareTree': 'fae/silver_birch', 'thornBush': 'fae/glow_bush', 'boulders': 'liches/rocks', 'rocks': 'liches/rocks',
        'darkRocks': 'fae/crystal_rocks', 'darkRocksB': 'liches/rocks', 'chests': 'liches/coffin_stack',
    },
}


def moonlit(a):
    """The Moonlit Shrine's stand-in: grass and timber cooled to a moonlit blue-green, the stone silvered, the red cloth a brighter
    vermilion, the fire kept."""
    rgb = a[..., :3].astype(float) / 255
    h, mx, sat = _hue(rgb)
    fire = (mx > 0.72) & (h < 0.17) & (sat > 0.45)
    red = ((h < 0.035) | (h > 0.94)) & (sat > 0.45)
    leafy = (h > 0.12) & (h < 0.45) & (sat > 0.15) & ~fire
    grey = rgb.mean(-1, keepdims=True)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    night = np.stack([r * 0.45, g * 0.78, b * 0.7 + g * 0.22], -1)
    silver = grey * np.array([0.84, 0.9, 1.04]) + (rgb - grey) * 0.35
    vermilion = mx[..., None] * np.array([1.0, 0.28, 0.16])
    out = np.where(leafy[..., None], night, np.where(red[..., None], vermilion, np.where(fire[..., None], rgb, silver)))
    res = a.copy()
    res[..., :3] = (out.clip(0, 1) * 255).astype(np.uint8)
    return res



# ----- the Iron Foundry (phase 4): the Golem Forge's war foundry -----
#
# As for the others: the Orc profile's slots and names, its own sheets (docs/notes/assault-4-iron-foundry-art-prompts.md) and the Dwarves and
# Machines kits. A borrowed Orc sheet is recoloured by `foundry`: the grass sooted to a dark green-grey, the stone and timber to slate and iron,
# the red cloth to iron grey, the fire kept.
GOLEMS_FILES = {
    'orc-01-palisade.png': 'gol-01-iron-wall.png', 'orc-02-gates.png': 'gol-02-gates.png', 'orc-03-iron-gate.png': 'gol-03-furnace-gate.png',
    'orc-04-faces.png': 'gol-04-faces.png', 'orc-05-ground.png': 'gol-05-ground.png', 'orc-06-transitions.png': 'gol-06-transitions.png',
    'orc-07-keep.png': 'gol-07-keep.png', 'orc-08-wall-dressing.png': 'gol-08-wall-dressing.png', 'orc-09-camp.png': 'gol-09-landmarks.png',
    'orc-10-camp-props.png': 'gol-10-props.png', 'orc-11-siege-ruins.png': 'gol-11-ruins.png', 'orc-12-river.png': 'gol-12-sluice.png',
    'orc-13-decals.png': 'gol-13-decals.png',
}
SHEETS['golems'] = {
    'sprites': {GOLEMS_FILES[k]: v for k, v in _orc['sprites'].items()},
    'ground': (GOLEMS_FILES[_orc['ground'][0]], _orc['ground'][1]),
    'edges': (GOLEMS_FILES[_orc['edges'][0]], _orc['edges'][1]),
    'decals': (GOLEMS_FILES[_orc['decals'][0]], _orc['decals'][1]),
    'faces': (GOLEMS_FILES[_orc['faces'][0]], _orc['faces'][1]),
    'fallback': ('orc', {v: k for k, v in GOLEMS_FILES.items()}),
    'shared': {'ladder', 'ram', 'trebuchet'},
    'tint': lambda a, sheet, slot=None: foundry(a),
    'kits': {
        **_orc['kits'],
        'kitSpikedWall': 'machines/iron_wall_run', 'kitSpikedCorner': 'machines/iron_wall_corner', 'kitSkullGate': 'machines/piston_gate',
        'kitStakeFence': 'dwarves/chain_fence', 'longhouse': 'dwarves/great_hall', 'boneHut': 'dwarves/cottage', 'hideHut': 'machines/workshop',
        'forge': 'dwarves/forge', 'forgeFire': 'dwarves/forge_fire', 'wargPen': 'dwarves/quarry', 'watchtower': 'dwarves/watchtower',
        'lookout': 'dwarves/watchtower', 'warDrum': 'dwarves/forge_fire', 'skullTotem': 'dwarves/shrine', 'skullTorch': 'dwarves/brazier',
        'spearSign': 'dwarves/signpost', 'bonfire': 'dwarves/forge_fire', 'weaponStall': 'dwarves/anvil_stall', 'warCart': 'dwarves/ore_cart',
        'granary': 'dwarves/granary', 'meatRacks': 'machines/coil_stack', 'meatPile': 'dwarves/coal_heap', 'barrels': 'machines/oil_drums',
        'chests': 'machines/metal_crates', 'stockpile': 'dwarves/stockpile', 'woodpile': 'machines/scrap_pile', 'well': 'dwarves/well',
        'hides': 'dwarves/crates', 'logBridge': 'machines/girder_bridge', 'brazier': 'dwarves/brazier', 'pine1': 'dwarves/dead_pine',
        'pine2': 'machines/iron_tree', 'gnarledTree': 'machines/dead_tree', 'bareTree': 'dwarves/dead_pine', 'thornBush': 'machines/cable_bush',
        'boulders': 'dwarves/boulders', 'rocks': 'dwarves/rocks_a', 'darkRocks': 'machines/ore_rocks', 'darkRocksB': 'dwarves/crystals',
        'rubblePile': 'dwarves/rubble',
    },
}


def foundry(a):
    """The Iron Foundry's stand-in: the grass sooted to a dark green-grey, the stone and timber to slate and iron, the red cloth to iron grey,
    the fire kept."""
    rgb = a[..., :3].astype(float) / 255
    h, mx, sat = _hue(rgb)
    fire = (mx > 0.72) & (h < 0.17) & (sat > 0.45)
    red = ((h < 0.035) | (h > 0.94)) & (sat > 0.45)
    leafy = (h > 0.12) & (h < 0.45) & (sat > 0.15) & ~fire
    grey = rgb.mean(-1, keepdims=True)
    soot = grey * np.array([0.82, 0.92, 0.84]) + (rgb - grey) * 0.35
    slate = grey * np.array([0.86, 0.9, 0.96]) + (rgb - grey) * 0.3
    iron = grey * np.array([0.72, 0.74, 0.8])
    out = np.where(leafy[..., None], soot, np.where(red[..., None], iron, np.where(fire[..., None], rgb, slate)))
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
    # (how a borrowed sheet is recoloured: the Necropolis's cold, unless the profile has its own, which may tint the flat sheets by slot)
    tint = spec.get('tint', lambda a, sheet, slot=None: cold(a))

    def sheet_path(sheet):
        path = os.path.join(src, sheet)
        if os.path.exists(path) or not fb_army or sheet not in fb_files:
            return path, False
        report.append(f'{sheet}: not painted yet; the stand-in is {fb_files[sheet]}, recoloured')
        return os.path.join(ROOT, 'art-source', 'assault', fb_army, fb_files[sheet]), True

    def load(sheet, mode, slots=None, cell=None):
        """A flat sheet, recoloured if borrowed: as a whole, or each slot's cell (`cell(i)`, its box) by its own tint."""
        path, borrowed = sheet_path(sheet)
        im = Image.open(path)
        if not borrowed:
            return im.convert(mode)
        a = np.array(im.convert('RGBA'))
        if slots is None or 'tint' not in spec:
            return Image.fromarray(tint(a, sheet)).convert(mode)
        for i, n in enumerate(slots):
            x0, y0, x1, y1 = cell(i)
            a[y0:y1, x0:x1] = tint(a[y0:y1, x0:x1], sheet, n)
        return Image.fromarray(a).convert(mode)

    for sheet, cells in spec['sprites'].items():
        path, borrowed = sheet_path(sheet)
        if not os.path.exists(path):
            report.append(f'{sheet}: not painted yet (the field falls back to existing art)')
            continue
        a = clean(Image.open(path))
        if borrowed:
            plain = a
            a = tint(a, sheet)
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
                # (a piece that leans on a wall stands on its own base, as the Orc sheet paints it: its bottom on the foot point, where the
                #  field puts it against the wall's foot; stood a footprint lower, a hold's ladder hung half a tile below the wall)
                if name in BASE_FOOT:
                    fy = y1 - 3
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
    # (a kit picture stands in for a piece no sheet gave, until its sheet is painted)
    standins = {n: k for n, k in spec.get('standins', {}).items() if n not in sprites}
    for name, other in standins.items():
        if other.startswith('=') and other[1:] in sprites:
            sprites[name], feet[name], feet_of[name] = sprites[other[1:]], feet[other[1:]], feet_of[other[1:]]
    kits = {**spec['kits'], **{n: k for n, k in standins.items() if not k.startswith('=')}}
    for name, path in kits.items():
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
    g = load(sheet, 'RGB', names, lambda i: (i % 4 * 256, i // 4 * 256, i % 4 * 256 + 256, i // 4 * 256 + 256))
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
    f = load(sheet, 'RGBA', names, lambda i: (i % 6 * 256, i // 6 * 512, i % 6 * 256 + 256, i // 6 * 512 + 512))
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
