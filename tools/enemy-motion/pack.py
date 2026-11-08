"""Pack generated idle/recoil clips, preserving original walk/attack/death pixels.

Sources are eight poses in a four-column, two-row grid. Scale a whole clip once
against the original standing height, use nearest-neighbour and hard alpha, and
keep the original palette. No simulation sizes or scales change.
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'art-source/enemy-motion'
OUTPUT = ROOT / 'src/art/units'
PREVIEW = ROOT / 'docs/samples/enemy-motion'


def hard_alpha(image):
    pixels = np.array(image.convert('RGBA'))
    pixels[:, :, 3] = np.where(pixels[:, :, 3] >= 128, 255, 0)
    pixels[pixels[:, :, 3] == 0, :3] = 0
    return Image.fromarray(pixels)


def crop_frames(image):
    width, height = image.size
    out = []
    for i in range(8):
        col, row = i % 4, i // 4
        cut = hard_alpha(image.crop((round(col * width / 4), round(row * height / 2),
                                     round((col + 1) * width / 4), round((row + 1) * height / 2))))
        bounds = cut.getbbox()
        if bounds is None:
            raise ValueError(f'Empty generated pose {i}')
        # A whole-cell opaque background is a failed cutout, not a usable pose.
        if bounds[0] == 0 and bounds[2] == cut.width and bounds[1] == 0 and bounds[3] == cut.height:
            raise ValueError(f'Background is not transparent in pose {i}')
        out.append(cut.crop(bounds))
    return out


def main():
    originals = json.loads((SOURCE / 'originals/layouts.json').read_text())
    layout_path = OUTPUT / 'sheets.json'
    layouts = json.loads(layout_path.read_text())
    PREVIEW.mkdir(parents=True, exist_ok=True)
    reports = []
    preview_rows = []
    for key, old in originals.items():
        original = Image.open(SOURCE / 'originals' / (key + '.png')).convert('RGBA')
        row = old['rows'].index('idle')
        idle = original.crop((0, row * old['h'], old['w'], (row + 1) * old['h']))
        bounds = idle.getbbox()
        poses = crop_frames(Image.open(SOURCE / (key + '.png')))
        scale = (bounds[3] - bounds[1]) / poses[0].height
        # Restrict generated colours to the original sheet's colours without dithering.
        palette = original.convert('RGB').quantize(colors=128)
        frames = []
        for pose in poses:
            pose = pose.resize((max(1, round(pose.width * scale)), max(1, round(pose.height * scale))), Image.Resampling.NEAREST)
            alpha = pose.getchannel('A')
            pose = pose.convert('RGB').quantize(palette=palette, dither=Image.Dither.NONE).convert('RGBA')
            pose.putalpha(alpha)
            frames.append(pose)
        # Keep the original four physical rows; append hurt so death indexing stays explicit.
        width = max(old['w'], max(f.width + 4 for f in frames))
        width += (width - old['w']) % 2
        top = max(0, max(f.height for f in frames) - bounds[3] + 2)
        height = old['h'] + top
        left = (width - old['w']) // 2
        rows = old['rows'] + ['hurt']
        sheet = Image.new('RGBA', (width * old['perRow'], height * len(rows)))
        for r in range(len(old['rows'])):
            for c in range(old['perRow']):
                frame = original.crop((c * old['w'], r * old['h'], (c + 1) * old['w'], (r + 1) * old['h']))
                sheet.paste(frame, (c * width + left, r * height + top))
        for name, indices in [('idle', [0, 1, 2, 0]), ('hurt', [4, 5, 6])]:
            r = rows.index(name)
            # Clear the original row before inserting the new clip.
            sheet.paste((0, 0, 0, 0), (0, r * height, sheet.width, (r + 1) * height))
            for c, idx in enumerate(indices):
                frame = frames[idx]
                x = round((bounds[0] + bounds[2]) / 2 + left - frame.width / 2)
                y = bounds[3] + top - frame.height
                if x < 0 or x + frame.width > width or y < 0 or y + frame.height > height:
                    raise ValueError(f'{key}: clipped {name} pose {idx}')
                sheet.paste(frame, (c * width + x, r * height + y))
        entry = {**old, 'w': width, 'h': height, 'rows': rows,
                 'counts': {**old['counts'], 'idle': 4, 'hurt': 3}}
        layouts[key] = entry
        sheet.save(OUTPUT / (key + '.png'))
        # Byte-for-byte pixel verification of all old action frames after padding.
        for action in ['walk', 'attack', 'dead']:
            r = old['rows'].index(action)
            for c in range(old['counts'][action]):
                before = original.crop((c * old['w'], r * old['h'], (c + 1) * old['w'], (r + 1) * old['h']))
                after = sheet.crop((c * width + left, r * height + top, c * width + left + old['w'], r * height + top + old['h']))
                if before.tobytes() != after.tobytes():
                    raise ValueError(f'{key}: original {action} frame {c} changed')
        reports.append({'sheet': key, 'idleFrames': 4, 'hurtFrames': 3,
                        'preserved': ['walk', 'attack', 'dead'], 'padding': [left, top], 'scale': scale})
        preview_rows.append((key, idle, sheet, entry))
    layout_path.write_text(json.dumps(layouts, indent=1) + '\n')
    (SOURCE / 'packing-report.json').write_text(json.dumps(reports, indent=2) + '\n')
    # Original idle, four new idles, then three recoil poses at 2x native pixels.
    contact = Image.new('RGB', (8 * 180, len(reports) * 285), '#282c34')
    draw = ImageDraw.Draw(contact)
    for r, (key, idle, sheet, entry) in enumerate(preview_rows):
        draw.text((5, r * 285 + 3), key + ' | original | idle x4 | hurt x3', fill='white')
        poses = [idle]
        for name, n in [('idle', 4), ('hurt', 3)]:
            ri = entry['rows'].index(name)
            poses += [sheet.crop((c * entry['w'], ri * entry['h'], (c + 1) * entry['w'], (ri + 1) * entry['h'])) for c in range(n)]
        for c, frame in enumerate(poses):
            frame = frame.crop(frame.getbbox())
            frame.thumbnail((170, 245), Image.Resampling.NEAREST)
            # Small units are enlarged for review, larger units remain at roughly 2x.
            factor = min(2, 170 / frame.width, 245 / frame.height)
            frame = frame.resize((round(frame.width * factor), round(frame.height * factor)), Image.Resampling.NEAREST)
            contact.paste(frame, (c * 180 + (180 - frame.width) // 2, (r + 1) * 285 - frame.height - 5), frame)
    contact.save(PREVIEW / 'contact.png')
    print(f'Packed {len(reports)} enemies; all original walk/attack/dead pixels preserved')


if __name__ == '__main__':
    main()
