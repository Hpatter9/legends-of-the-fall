"""Pack generated 8x7 sources; hard alpha, component extraction and nearest sampling only.
Run from the repository root. Requires Pillow, NumPy and SciPy.
"""
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage

ROOT = Path('src/art/units')
IDS = ['kitsune', 'gorgon', 'illusionist', 'timeWitch']
SHEETS = ['hero_res_kitsune', 'hero_res_gorgon', 'hero_res_illusionist', 'hero_res_time_witch']
ROWS = ['idle', 'walk', '_walk', 'attack', 'hurt', 'dead', 'attack2']
layout = json.loads((ROOT / 'sheets.json').read_text())
report = []
previews = []
for hero, sheet in zip(IDS, SHEETS):
    source = np.array(Image.open(f'tools/seductress/source/{hero}.png').convert('RGBA'))
    height, width = source.shape[:2]
    labels, count = ndimage.label(source[:, :, 3] >= 128, np.ones((3, 3)))
    groups = [[] for _ in range(56)]
    # Assign whole connected actors by centroid. Ignore loose alpha speckles.
    for n, box in enumerate(ndimage.find_objects(labels), 1):
        if box is None:
            continue
        yy, xx = np.where(labels[box] == n)
        if len(xx) < 70:
            continue
        yy += box[0].start; xx += box[1].start
        r = min(6, int(yy.mean() / (height / 7)))
        c = min(7, int(xx.mean() / (width / 8)))
        # Touching actors are split at their nominal cell boundary.
        if xx.max() - xx.min() > width / 8 * 1.5 or yy.max() - yy.min() > height / 7 * 1.5:
            for row in range(7):
                for col in range(8):
                    keep = (yy >= row * height / 7) & (yy < (row + 1) * height / 7) & (xx >= col * width / 8) & (xx < (col + 1) * width / 8)
                    if keep.any(): groups[row * 8 + col].append((yy[keep], xx[keep]))
        else:
            groups[r * 8 + c].append((yy, xx))
    actors = []
    for index, group in enumerate(groups):
        assert group, (hero, index)
        yy = np.concatenate([g[0] for g in group]); xx = np.concatenate([g[1] for g in group])
        x0, x1, y0, y1 = int(xx.min()), int(xx.max()), int(yy.min()), int(yy.max())
        crop = np.zeros((y1-y0+1, x1-x0+1, 4), dtype=np.uint8)
        crop[yy-y0, xx-x0, :3] = source[yy, xx, :3]
        crop[yy-y0, xx-x0, 3] = 255
        actors.append(Image.fromarray(crop))
    # Source inspection: first-row hats/ears meet the canvas edge; use intact
    # second-row poses for idle. Rear Kitsune cast 4 turns forward: use cast 3.
    selections = {}
    for facing in range(2):
        offset = facing * 4
        chosen = []
        for row in range(7):
            for col in range(4):
                sr, sc = row, offset + col
                if row == 0 and hero in ['kitsune', 'illusionist']: sr = 1
                if hero == 'kitsune' and facing == 1 and row == 6 and col == 3: sc = 6
                chosen.append(sr * 8 + sc)
        selections[facing] = chosen
    factor = 96 / actors[selections[0][0]].height
    # Shared frame size for a front/rear pair, centred horizontally and feet
    # anchored at the frame bottom. Preserve uniform scale through each action.
    scaled = [im.resize((max(1, round(im.width*factor)), max(1, round(im.height*factor))), Image.Resampling.NEAREST) for im in actors]
    fw = max(im.width for im in scaled) + 8
    fw += fw % 2
    fh = max(im.height for im in scaled) + 6
    for facing in range(2):
        name = sheet + ('_back' if facing else '')
        atlas = Image.new('RGBA', (fw*4, fh*7))
        for index, src in enumerate(selections[facing]):
            im = scaled[src]
            atlas.paste(im, ((index % 4)*fw + (fw-im.width)//2, (index//4)*fh + fh-im.height-2))
        atlas.save(ROOT / f'{name}.png')
        spec = layout[name]
        spec.update(w=fw, h=fh, rows=ROWS, perRow=4, figure=96,
                    counts=dict(idle=4, walk=8, attack=4, hurt=4, dead=4, attack2=4, _walk=0))
        if facing == 0:
            previews.append((hero, scaled[selections[0][0]], scaled[selections[1][0]]))
        report.append(dict(hero=hero, sheet=name, width=fw, height=fh, sourceCells=selections[facing]))
(ROOT / 'sheets.json').write_text(json.dumps(layout, indent=1)+'\n')
Path('docs/samples/seductress/packing.json').write_text(json.dumps(report, indent=2)+'\n')
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 20)
board = Image.new('RGB', (1600, 340), '#152031'); d = ImageDraw.Draw(board)
for i, (hero, front, rear) in enumerate(previews):
    for j, im in enumerate([front, rear]):
        im = im.resize((im.width*2, im.height*2), Image.Resampling.NEAREST)
        x = i*400 + j*200 + (200-im.width)//2
        board.paste(im, (x, 240-im.height), im)
    d.text((i*400+20, 270), {'kitsune': 'Kitsune', 'gorgon': 'Gorgon', 'illusionist': 'Illusionist', 'timeWitch': 'Time Witch'}[hero], font=font, fill='#f4d68b')
    d.text((i*400+20, 302), 'Front / rear', font=font, fill='#c8d0dc')
board.save('docs/samples/seductress/packed-preview.png')
print(json.dumps(report, indent=2))
