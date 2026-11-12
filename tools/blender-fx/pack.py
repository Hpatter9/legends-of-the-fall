"""Pack the pixelated effects into tight atlases and write the game's manifest.

Each effect's frames are cut to the smallest box that holds them all, laid out as a block, and the blocks are
shelved into WebP atlases (lossless: they are pixel art) no larger than `MAX` a side. The soft glows go into
their own small atlases, which the game draws smoothed. The manifest (`src/render/blenderFxData.ts`) says where
every clip is, where its tile's middle sits in its frames, how long it lasts and which frame stands for it when
motion is reduced.
"""
import json
import math
import os

import numpy as np
from PIL import Image

from lib import DENSITY
from pixelate import GLOW_SHRINK

MAX = 2048


def trim(frames):
    """The box every frame's solid pixels fit in: (x, y, w, h); and whether any pixel touches the canvas's edge."""
    any_ = np.zeros(frames[0].shape[:2], dtype=bool)
    for f in frames:
        any_ |= f[..., 3] > 0
    ys, xs = np.where(any_)
    if len(xs) == 0:
        return (0, 0, 1, 1), False
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    h, w = any_.shape
    return (int(x0), int(y0), int(x1 - x0), int(y1 - y0)), bool(x0 == 0 or y0 == 0 or x1 == w or y1 == h)


def grid(n, w, h):
    """How many columns a block of `n` frames takes to stay roughly square and inside an atlas."""
    best = None
    for cols in range(1, n + 1):
        rows = math.ceil(n / cols)
        if cols * w > MAX:
            break
        if rows * h > MAX:
            continue
        score = abs(cols * w - rows * h)
        if best is None or score < best[0]:
            best = (score, cols)
    return best[1] if best else 1


class Shelves:
    """Atlases filled a shelf at a time, tallest blocks first."""

    def __init__(self, pad=1):
        self.pages, self.pad = [], pad

    def place(self, w, h):
        w, h = w + self.pad, h + self.pad
        for i, pg in enumerate(self.pages):
            for sh in pg['shelves']:
                if sh['h'] >= h and sh['x'] + w <= MAX:
                    x, sh['x'] = sh['x'], sh['x'] + w
                    return i, x, sh['y']
            if pg['y'] + h <= MAX:
                pg['shelves'].append(dict(x=w, y=pg['y'], h=h))
                y, pg['y'] = pg['y'], pg['y'] + h
                return i, 0, y
        self.pages.append(dict(shelves=[], y=0))
        return self.place(w - self.pad, h - self.pad)

    def images(self):
        out = []
        for pg in self.pages:
            w = max((sh['x'] for sh in pg['shelves']), default=1)
            out.append(Image.new('RGBA', (w, pg['y']), (0, 0, 0, 0)))
        return out


HEROES_A_GROUP = 2


def group_order(ids):
    """Which group of atlases each effect goes in. Group 0 is what every fight may need (the spells, the ground loops) and
    is loaded up front; the ultimates' shared wind-ups and aftermaths are group 1; then each pair of heroes' own
    ultimates has a group, loaded when one of them is in the fight."""
    out, heroes = {}, {}
    for key in ids:
        if key.startswith('ultwind-') or key.startswith('ultafter-'):
            out[key] = 1
        elif key.startswith('ult-'):
            hero = key.split('-')[1]
            heroes.setdefault(hero, len(heroes))
            out[key] = 2 + heroes[hero] // HEROES_A_GROUP
        else:
            out[key] = 0
    return out


def pack(items, art_dir, manifest_path):
    """`items`: (spec, frames, glows) for every shipped effect, in catalogue order. Returns the bytes written."""
    blocks, soft_blocks, warn, core_pages = [], [], [], []
    for spec, frames, glows in items:
        box, clipped = trim(frames)
        if clipped:
            warn.append(spec['id'])
        x0, y0, w, h = box
        cut = [Image.fromarray(np.ascontiguousarray(f[y0:y0 + h, x0:x0 + w]), 'RGBA') for f in frames]
        cols = grid(len(cut), w, h)
        blocks.append(dict(spec=spec, cut=cut, w=w, h=h, cols=cols, x0=x0, y0=y0, solid=[int((f[..., 3] > 0).sum()) for f in frames]))
        if glows:
            gw, gh = glows[0].size
            soft_blocks.append(dict(id=spec['id'], cut=glows, w=gw, h=gh, cols=grid(len(glows), gw, gh)))
    clips = {}
    order = group_order([b['spec']['id'] for b in blocks])
    for kind, bl in (('px', blocks), ('soft', soft_blocks)):
        # (each group has atlases of its own, so the game can load a group only when a fight needs it; within a group the tallest blocks
        # are shelved first)
        pages = []
        groups = {}
        for b in bl:
            groups.setdefault(order[b.get('id') or b['spec']['id']] if kind == 'px' else 0, []).append(b)
        for g in sorted(groups):
            sh = Shelves(pad=1 if kind == 'px' else 2)
            for b in sorted(groups[g], key=lambda b: (-math.ceil(len(b['cut']) / b['cols']) * b['h'], b.get('id') or b['spec']['id'])):
                rows = math.ceil(len(b['cut']) / b['cols'])
                page, b['x'], b['y'] = sh.place(b['cols'] * b['w'], rows * b['h'])
                b['page'] = len(pages) + page
            got = sh.images()
            if kind == 'px':
                core_pages = core_pages + list(range(len(pages), len(pages) + len(got))) if g == 0 else core_pages
            pages += got
        for b in bl:
            for i, im in enumerate(b['cut']):
                pages[b['page']].paste(im, (b['x'] + (i % b['cols']) * b['w'], b['y'] + (i // b['cols']) * b['h']))
        for f in os.listdir(art_dir):
            if f.startswith(kind + '-'):
                os.remove(os.path.join(art_dir, f))
        for i, im in enumerate(pages):
            # (the pixels are kept exactly; the glows are soft already, so they are squeezed)
            if kind == 'px':
                im.save(os.path.join(art_dir, f'{kind}-{i}.webp'), lossless=True, quality=100, method=6, exact=False)
            else:
                im.save(os.path.join(art_dir, f'{kind}-{i}.webp'), quality=60, alpha_quality=70, method=6)
        if kind == 'px':
            px_pages = [im.size for im in pages]
        else:
            soft_pages = [im.size for im in pages]
    soft_by = {b['id']: b for b in soft_blocks}
    for b in blocks:
        s = spec = b['spec']
        W, H = round(s['w'] * DENSITY), round(s['h'] * DENSITY)
        n = len(b['cut'])
        # (the frame that stands for the effect when it is held still: the one asked for, else the fullest)
        hold = s.get('hold', 0 if s.get('loop') else max(range(n), key=lambda i: b['solid'][i]))
        clip = dict(a=b['page'], x=b['x'], y=b['y'], w=b['w'], h=b['h'], n=n, cols=b['cols'],
                    ax=round(W / 2 - b['x0'], 1), ay=round(s['oy'] * H - b['y0'], 1), ms=s['ms'], loop=bool(s.get('loop')), hold=hold,
                    layer=s.get('layer', 'over'), el=s['element'])
        if 'stages' in s:
            # (a stage may run past the end of the clip, so it is still at its height on the last frame: its last frame is the clip's)
            clip['cuts'] = [[min(n - 1, round(st['at'][0] * (n - 1))), min(n - 1, round(st['at'][1] * (n - 1)))] for st in s['stages']]
            clip['sc'] = [st['scene'] for st in s['stages']]
        g = soft_by.get(s['id'])
        if g:
            clip['g'] = dict(a=g['page'], x=g['x'], y=g['y'], w=g['w'], h=g['h'], cols=g['cols'], ax=round(W / 2 / GLOW_SHRINK, 2), ay=round(s['oy'] * H / GLOW_SHRINK, 2))
        clips[s['id']] = clip
    lines = [
        '// Generated by tools/blender-fx/build.py: do not edit by hand. Where each Blender-rendered effect lies in its atlas (src/art/fx/blender/),',
        '// where its tile\'s middle sits in its frames, how long it lasts, and its glow\'s place when it has one. docs/notes/blender-fx.md.',
        '',
        "import type { BfxClip } from './blenderFxRules';",
        '',
        '/** How many of an effect\'s pixels a tile\'s width takes, and how much smaller the glow frames are kept. */',
        f'export const BFX_DENSITY = {DENSITY};',
        f'export const BFX_GLOW_SHRINK = {GLOW_SHRINK};',
        '/** The hard pixel atlases\' sizes, then the soft glow atlases\' (`px-<n>.webp`, `soft-<n>.webp`). */',
        f'export const BFX_PX: readonly (readonly [number, number])[] = {json.dumps(px_pages)};',
        f'export const BFX_SOFT: readonly (readonly [number, number])[] = {json.dumps(soft_pages)};',
        '/** The pixel atlases every fight may need (the spells, the ground loops): loaded up front. The rest are loaded when a fight needs them. */',
        f'export const BFX_CORE: readonly number[] = {json.dumps(core_pages)};',
        '',
        'export const BFX_CLIPS: Readonly<Record<string, BfxClip>> = {',
    ]
    for key in sorted(clips):
        lines.append(f"  '{key}': {json.dumps(clips[key], separators=(', ', ': '))},")
    lines += ['};', '']
    open(manifest_path, 'w').write('\n'.join(lines))
    total = sum(os.path.getsize(os.path.join(art_dir, f)) for f in os.listdir(art_dir) if f.endswith('.webp'))
    return total, warn, px_pages, soft_pages
