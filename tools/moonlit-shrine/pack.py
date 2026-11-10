#!/usr/bin/env python3
"""Pack generated paintings into the cutter's exact Moonlit Shrine source grids.

Layout operations only: crop cells, clear faint alpha, uniformly scale and place.
Art itself is generated from docs/notes/assault-4-moonlit-shrine-art-prompts.md.
Raw inputs are retained so all placement is reproducible.
"""
import importlib.util
import json
from pathlib import Path
from PIL import Image
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'art-source/assault/yokai'
spec = importlib.util.spec_from_file_location('assault_cutter', ROOT / 'tools/assault/cut-sheets.py')
cutter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cutter)
profile = cutter.SHEETS['yokai']


def cell_at(im, x, y, w, h, canvas):
    sx, sy = im.width / canvas[0], im.height / canvas[1]
    return im.crop((round(x * sx), round(y * sy), round((x+w)*sx), round((y+h)*sy)))


def pack_sheet(name):
    raw = Image.open(SRC / 'raw' / name).convert('RGBA')
    sprites = profile.get('layouts', {}).get(name, profile['sprites'].get(name))
    if sprites:
        size = (1024, 1024) if len(sprites) >= 16 else (1536, 1024)
        out = Image.new('RGBA', size)
        # Some named aliases share a cell; paint it only once.
        used = set()
        for slot, (x, y, w, h, fx, fy, fu, fv) in sprites.items():
            if (x, y) in used:
                continue
            used.add((x, y))
            piece = cell_at(raw, x, y, w, h, size)
            a = np.array(piece)
            a[:, :, 3] = np.where(a[:, :, 3] >= 128, 255, 0)
            piece = Image.fromarray(a)
            bounds = piece.getbbox()
            if bounds is None:
                raise ValueError(f'{name}: empty {slot}')
            if bounds[0] == 0 or bounds[1] == 0 or bounds[2] == piece.width or bounds[3] == piece.height:
                raise ValueError(f'{name}: {slot} touches raw cell boundary: {bounds}')
            piece = piece.crop(bounds)
            tip = fy + (fu + fv) * 16
            target_width = 64 * (fu + fv)
            scale = min(target_width / piece.width, (tip - 12) / piece.height, (w - 24) / piece.width)
            piece = piece.resize((max(1, round(piece.width * scale)), max(1, round(piece.height * scale))), Image.Resampling.LANCZOS)
            # Exact cell anchor: footprint's front tip, not the bottom of the sheet.
            px, py = x + fx - piece.width // 2, y + tip - piece.height
            out.alpha_composite(piece, (px, py))
    elif name == profile['faces'][0]:
        size = (1536, 1024)
        out = Image.new('RGBA', size)
        for i in range(12):
            x, y = i % 6 * 256, i // 6 * 512
            strip = cell_at(raw, x, y, 256, 480, size).resize((256, 480), Image.Resampling.LANCZOS)
            out.paste(strip, (x, y))
        # The 32px unused band of each row stays transparent by construction.
    else:
        size = (1024, 1024)
        ground = name == profile['ground'][0]
        out = Image.new('RGB' if ground else 'RGBA', size)
        for i in range(16):
            x, y = i % 4 * 256, i // 4 * 256
            tile = cell_at(raw, x, y, 256, 256, size).resize((256, 256), Image.Resampling.LANCZOS)
            out.paste(tile.convert('RGB') if ground else tile, (x, y))
    out.save(SRC / name)
    return {'file': name, 'rawSize': list(raw.size), 'size': list(out.size)}


if __name__ == '__main__':
    names = sorted(p.name for p in (SRC / 'raw').glob('yok-*.png'))
    report = [pack_sheet(n) for n in names]
    print(json.dumps(report, indent=2))
