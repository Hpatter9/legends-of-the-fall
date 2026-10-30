"""Mechanically pack retained paintings into square cells; never repaint frames.
Run from any directory: python3 art-source/spell-fx/pack.py
Requires Pillow. See layout.json for the reviewed source cuts.
"""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent
CELL = 256
MARGIN = 21


def pack():
    layout = json.loads((ROOT / 'layout.json').read_text())
    for key, rows in layout.items():
        source = Image.open(ROOT / 'originals/a-toolkit' / f'{key}.png').convert('RGBA')
        result = Image.new('RGBA', (max(len(row['cuts']) for row in rows) * CELL, len(rows) * CELL))
        for r, row in enumerate(rows):
            frames = [source.crop(box) for box in row['cuts']]
            # One scale per row preserves the painted growth and decay of the animation.
            scale = min((CELL - 2 * MARGIN) / max(f.width for f in frames),
                        (CELL - 2 * MARGIN) / max(f.height for f in frames))
            for c, frame in enumerate(frames):
                size = (max(1, round(frame.width * scale)), max(1, round(frame.height * scale)))
                frame = frame.resize(size, Image.Resampling.LANCZOS)
                x = c * CELL + (CELL - frame.width) // 2
                y = r * CELL + (CELL - frame.height) // 2
                if key.startswith('wall-') and row['part'] in ('rise', 'stand', 'break'):
                    y = (r + 1) * CELL - MARGIN - frame.height
                result.paste(frame, (x, y))
        result.save(ROOT / 'a-toolkit' / f'{key}.png')


if __name__ == '__main__':
    pack()
