#!/usr/bin/env python3
"""Package original 8-column / 7-row hero atlases; never repaint their colours.

Columns 0..3 are front, 4..7 rear; rows idle, walk A/B, attack, hurt, dead, ability.
Only connected-component extraction, hard alpha and paired nearest-neighbour
scaling. Retain source PNGs under art-source/hero-remakes for reproducibility.
python3 tools/hero-remakes/pack.py [hero ids...]
"""
import hashlib
import json
from pathlib import Path
import sys

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
UNITS = ROOT / 'src/art/units'
SOURCE = ROOT / 'art-source/hero-remakes'
REVIEW = ROOT / 'docs/samples/hero-remakes'
ROWS = ['idle', 'walk', '_walk', 'attack', 'hurt', 'dead', 'attack2']
HEROES = ['cleric', 'buccaneer', 'wizard', 'illusionist', 'timeWitch',
          'peasant', 'ranger', 'dragoon', 'lightningMage', 'sage']


def extract(path, source_rows=7, columns=8, alpha_threshold=128):
    a = np.array(Image.open(path).convert('RGBA'))
    height, width = a.shape[:2]
    labels, _ = ndimage.label(a[:, :, 3] >= alpha_threshold, np.ones((3, 3)))
    sizes = np.bincount(labels.ravel())
    groups = [[] for _ in range(source_rows * columns)]
    for label, box in enumerate(ndimage.find_objects(labels), 1):
        if box is None or sizes[label] < 24:
            continue
        yy, xx = box
        local_y, local_x = np.nonzero(labels[box] == label)
        ys, xs = local_y + yy.start, local_x + xx.start
        row = min(source_rows - 1, int(ys.mean() * source_rows / height))
        col = min(columns - 1, int(xs.mean() * columns / width))
        # Reject merged actors rather than silently chopping a weapon in half.
        assert xx.stop - xx.start < width / columns * 1.6, (path, row, col, 'touching actors')
        assert yy.stop - yy.start < height / source_rows * 1.6, (path, row, col, 'touching rows')
        groups[row * columns + col].append((ys, xs))
    frames = []
    for slot, parts in enumerate(groups):
        assert parts, (path, slot, 'empty frame')
        ys = np.concatenate([p[0] for p in parts])
        xs = np.concatenate([p[1] for p in parts])
        x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1
        raw = np.zeros((y1 - y0, x1 - x0, 4), np.uint8)
        raw[ys - y0, xs - x0, :3] = a[ys, xs, :3]
        raw[ys - y0, xs - x0, 3] = 255
        frames.append({'image': Image.fromarray(raw), 'box': [x0, y0, x1, y1],
                       'offset': x0 - (slot % columns + 0.5) * width / columns,
                       'slot': slot, 'pixels': len(ys)})
    return frames


def pack(hero, layout, config, looks, mapping):
    path = SOURCE / f'{hero}.png'
    # Malia's source includes an extra death take before the final ability row.
    # Select the complete original sequence, without inventing missing poses.
    source_rows = 8 if hero == 'lightningMage' else 7
    selected_rows = [0, 1, 2, 3, 4, 5, 7] if source_rows == 8 else list(range(7))
    source_frames = extract(path, source_rows)
    frames = [source_frames[row * 8 + col] for row in selected_rows for col in range(8)]
    selections = json.loads((Path(__file__).parent / 'pose-selection.json').read_text()).get(hero, {})
    for target, source in selections.items():
        frames[int(target)] = dict(source_frames[source])
    front, rear = config[hero]['sheets']
    figure = layout[front]['figure']
    # One scale for both facings of the atlas; a supplemental action clip
    # also shares one scale across its front/rear views.
    factor = figure / frames[0]['image'].height
    extra = None
    if hero == 'cleric':
        extra_path = SOURCE / 'cleric-attack.png'
        extra = extract(extra_path, 2, 4)
        extra_factor = figure / extra[0]['image'].height
        # One replacement action clip, front and rear, also serves Smite.
        for row in [3, 6]:
            for col in range(8):
                frames[row * 8 + col] = {**extra[col], 'factor': extra_factor,
                                         'source': 'cleric-attack.png'}
    for f in frames:
        im = f['image']
        scale = f.get('factor', factor)
        f['image'] = im.resize((round(im.width * scale), round(im.height * scale)), Image.Resampling.NEAREST)
        f['offset'] = round(f['offset'] * scale)
    extent = max(max(-f['offset'], f['offset'] + f['image'].width) for f in frames)
    w = max(160, 2 * (extent + 12))
    h = max(120, max(f['image'].height for f in frames) + 12)
    tone = looks[hero][0]
    report = {'hero': hero, 'source': str(path.relative_to(ROOT)),
              'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
              'sourceRows': source_rows, 'selectedRows': selected_rows,
              'poseSelections': selections,
              'extraClip': {'source': 'art-source/hero-remakes/cleric-attack.png',
                            'sha256': hashlib.sha256((SOURCE / 'cleric-attack.png').read_bytes()).hexdigest(),
                            'scale': extra_factor} if extra else None,
              'scale': factor, 'cell': [w, h], 'frames': []}
    for view, sheet in enumerate([front, rear]):
        atlas = Image.new('RGBA', (w * 4, h * 7))
        contact = Image.new('RGBA', (w * 4, (h + 16) * 7), (40, 42, 54, 255))
        d = ImageDraw.Draw(contact)
        for row in range(7):
            for col in range(4):
                f = frames[row * 8 + view * 4 + col]
                im = f['image']
                # Keep the source cell's anchor: centring a weapon's bounds
                # instead would slide the body when the weapon extends.
                left, top = w // 2 + f['offset'], h - im.height - 2
                assert left >= 4 and top >= 2, (hero, sheet, row, col, 'clipped')
                atlas.alpha_composite(im, (col * w + left, row * h + top))
                contact.alpha_composite(im, (col * w + left, row * (h + 16) + 16 + top))
                d.text((col * w + 3, row * (h + 16) + 2), f'{ROWS[row]} {col + 1}', fill='white')
                report['frames'].append({'sheet': sheet, 'row': ROWS[row], 'col': col,
                                         'source': f.get('source', path.name), 'sourceSlot': f['slot'],
                                         'sourceBox': f['box'], 'pixels': f['pixels']})
        atlas.save(UNITS / f'{sheet}.png', optimize=True)
        toned = f'{sheet}_{tone}'
        # Compatibility filenames are exact copies, never another skin filter.
        (UNITS / f'{toned}.png').write_bytes((UNITS / f'{sheet}.png').read_bytes())
        mapping[sheet] = toned
        layout[sheet] = {**layout[sheet], 'w': w, 'h': h, 'figure': figure,
                         'perRow': 4, 'rows': ROWS,
                         'counts': {'idle': 4, 'walk': 8, '_walk': 0, 'attack': 4,
                                    'hurt': 4, 'dead': 4, 'attack2': 4},
                         'facesRight': True, 'lies': True}
        contact.convert('RGB').resize((w * 8, (h + 16) * 14), Image.Resampling.NEAREST).save(REVIEW / f'{hero}-{view}.png')
        # Actual packed frames, played in the same sequence the game requests.
        for row, count in [('walk', 8), ('attack', 4), ('dead', 4)]:
            clips = []
            for i in range(count):
                ri, ci = ROWS.index(row) + i // 4, i % 4
                im = atlas.crop((ci * w, ri * h, (ci + 1) * w, (ri + 1) * h))
                bg = Image.new('RGBA', im.size, (40, 42, 54, 255)); bg.alpha_composite(im)
                clips.append(bg.convert('RGB').resize((w * 3, h * 3), Image.Resampling.NEAREST))
            clips[0].save(REVIEW / f'{hero}-{view}-{row}.gif', save_all=True,
                          append_images=clips[1:], duration=125 if row == 'walk' else 180, loop=0)
    (REVIEW / f'{hero}.json').write_text(json.dumps(report, indent=2) + '\n')
    print(f'{hero}: 56 poses, {w}x{h} cells, figure {figure}, original skin colours retained')


def main():
    sys.path.insert(0, str(ROOT / 'tools/heritage'))
    import recolour
    REVIEW.mkdir(parents=True, exist_ok=True)
    layout_path = UNITS / 'sheets.json'
    layout = json.loads(layout_path.read_text())
    config = recolour.CONFIG
    _, _, looks = recolour.read_table()
    map_path = ROOT / 'tools/heritage/sheets.json'
    mapping = json.loads(map_path.read_text())
    for hero in sys.argv[1:] or HEROES:
        assert hero in HEROES, hero
        pack(hero, layout, config, looks, mapping)
    layout_path.write_text(json.dumps(layout, indent=1) + '\n')
    map_path.write_text(json.dumps(dict(sorted(mapping.items())), indent=1) + '\n')


if __name__ == '__main__':
    main()
