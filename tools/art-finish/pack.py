"""Rebuild the finishing-pass menu art, treant reactions and painted VFX atlas.

All sources are retained. Cropping, padding and resampling only; treant action
pixels and their original palette are preserved, with hard alpha for new poses.
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'art-source/finishing-pass'
SHEETS = SOURCE / 'sheets'
OUT = ROOT / 'src/art/finishing'
PREVIEW = ROOT / 'docs/samples/art-finish'


def cells(name, cols, rows, count):
    image = Image.open(SHEETS / (name + '.png')).convert('RGBA')
    width, height = image.size
    return [image.crop((round(i % cols * width / cols), round(i // cols * height / rows),
                        round((i % cols + 1) * width / cols), round((i // cols + 1) * height / rows))) for i in range(count)]


def fit(image, size, margin=0.05):
    bounds = image.getchannel('A').getbbox()
    if bounds is None:
        raise ValueError('Empty source painting')
    image = image.crop(bounds)
    image.thumbnail((round(size[0] * (1 - margin * 2)), round(size[1] * (1 - margin * 2))), Image.Resampling.LANCZOS)
    out = Image.new('RGBA', size)
    out.paste(image, ((size[0] - image.width) // 2, (size[1] - image.height) // 2))
    return out


def menu_art():
    groups = [('travellers', 3, 1, ['pilgrim', 'deserter', 'cartographer'], 320),
              ('pennants', 3, 3, ['oath-iron', 'oath-ember', 'oath-coin', 'oath-vigil', 'provisions'], 128),
              ('outlines', 3, 3, ['empty-head', 'empty-torso', 'empty-main', 'empty-off', 'empty-feet', 'empty-belt', 'empty-acc'], 128)]
    icons = []
    for name, cols, rows, keys, size in groups:
        for key, image in zip(keys, cells(name, cols, rows, len(keys))):
            icon = fit(image, (size, size))
            icon.save(OUT / (key + '.webp'), quality=88, method=6)
            icons.append((key, icon))
    Image.open(SHEETS / 'backing.png').convert('RGB').resize((256, 384), Image.Resampling.LANCZOS).save(OUT / 'doll-backing.webp', quality=85, method=6)
    contact = Image.new('RGB', (5 * 180, 3 * 200), '#282c34')
    draw = ImageDraw.Draw(contact)
    for i, (key, icon) in enumerate(icons):
        icon.thumbnail((160, 160), Image.Resampling.LANCZOS)
        x, y = i % 5 * 180, i // 5 * 200
        contact.paste(icon, (x + (180 - icon.width) // 2, y), icon)
        draw.text((x + 6, y + 168), key, fill='white')
    contact.save(PREVIEW / 'menu-contact.png')


def treants():
    originals = json.loads((SOURCE / 'treant-originals/layouts.json').read_text())
    layout_path = ROOT / 'src/art/units/sheets.json'
    layouts = json.loads(layout_path.read_text())
    report = []
    for key, old in originals.items():
        original = Image.open(SOURCE / 'treant-originals' / (key + '.png')).convert('RGBA')
        idle_row = old['rows'].index('idle')
        idle = original.crop((0, idle_row * old['h'], old['w'], (idle_row + 1) * old['h']))
        bounds = idle.getbbox()
        poses = []
        for image in cells(key, 4, 1, 4):
            a = np.array(image)
            a[:, :, 3] = np.where(a[:, :, 3] >= 128, 255, 0)
            a[a[:, :, 3] == 0, :3] = 0
            image = Image.fromarray(a)
            poses.append(image.crop(image.getbbox()))
        # Last generated pose is the reference stance; scale the whole clip once.
        scale = (bounds[3] - bounds[1]) / poses[3].height
        palette = original.convert('RGB').quantize(colors=128)
        frames = []
        for image in poses[:3]:
            image = image.resize((round(image.width * scale), round(image.height * scale)), Image.Resampling.NEAREST)
            alpha = image.getchannel('A')
            image = image.convert('RGB').quantize(palette=palette, dither=Image.Dither.NONE).convert('RGBA')
            image.putalpha(alpha)
            frames.append(image)
        width = max(old['w'], max(f.width + 4 for f in frames))
        width += (width - old['w']) % 2
        left = (width - old['w']) // 2
        top = max(0, max(f.height for f in frames) - bounds[3] + 2)
        height = old['h'] + top
        rows = old['rows'] + ['hurt']
        sheet = Image.new('RGBA', (width * old['perRow'], height * len(rows)))
        for row in range(len(old['rows'])):
            for col in range(old['perRow']):
                frame = original.crop((col * old['w'], row * old['h'], (col + 1) * old['w'], (row + 1) * old['h']))
                sheet.paste(frame, (col * width + left, row * height + top))
        row = rows.index('hurt')
        for col, frame in enumerate(frames):
            x = round((bounds[0] + bounds[2]) / 2 + left - frame.width / 2)
            y = bounds[3] + top - frame.height
            if x < 0 or x + frame.width > width or y < 0:
                raise ValueError(f'{key}: clipped hurt frame')
            sheet.paste(frame, (col * width + x, row * height + y))
        for name in old['rows']:
            row = old['rows'].index(name)
            for col in range(old['counts'][name]):
                before = original.crop((col * old['w'], row * old['h'], (col + 1) * old['w'], (row + 1) * old['h']))
                after = sheet.crop((col * width + left, row * height + top, col * width + left + old['w'], row * height + top + old['h']))
                assert before.tobytes() == after.tobytes(), f'{key}: {name} changed'
        sheet.save(ROOT / 'src/art/units' / (key + '.png'))
        layouts[key] = {**old, 'w': width, 'h': height, 'rows': rows, 'counts': {**old['counts'], 'hurt': 3}}
        report.append({'sheet': key, 'hurtFrames': 3, 'allOriginalRowsPreserved': True, 'padding': [left, top]})
    layout_path.write_text(json.dumps(layouts, indent=1) + '\n')
    (SOURCE / 'treant-report.json').write_text(json.dumps(report, indent=2) + '\n')


def effects():
    atlas = Image.new('RGBA', (6 * 128, 3 * 128))
    for row, key in enumerate(['fire', 'smoke', 'electric']):
        for col, image in enumerate(cells(key, 3, 3, 6)):
            # Shared cell footprint and feathered margins prevent neighbour bleed.
            image = image.resize((112, 112), Image.Resampling.LANCZOS)
            pixels = np.array(image)
            yy, xx = np.indices((112, 112))
            edge = np.clip(np.minimum.reduce([xx, yy, 111 - xx, 111 - yy]) / 10, 0, 1)
            pixels[:, :, 3] = pixels[:, :, 3] * edge * edge * (3 - 2 * edge)
            atlas.paste(Image.fromarray(pixels), (col * 128 + 8, row * 128 + 8))
    atlas.save(OUT / 'spell-motion.webp', lossless=True, method=6)
    frames = []
    for frame in range(6):
        canvas = Image.new('RGB', (384, 150), '#282c34')
        for row in range(3):
            image = atlas.crop((frame * 128, row * 128, (frame + 1) * 128, (row + 1) * 128))
            canvas.paste(image, (row * 128, 10), image)
        frames.append(canvas)
    frames[0].save(PREVIEW / 'spell-motion.gif', save_all=True, append_images=frames[1:], duration=90, loop=0)


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    PREVIEW.mkdir(parents=True, exist_ok=True)
    menu_art()
    treants()
    effects()
    print('Packed 3 travellers, 5 expedition icons, 7 empty slots, doll backing, 3 treant clips and 18 spell frames')
