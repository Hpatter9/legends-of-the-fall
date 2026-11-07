"""Cut the approved gear completion sheets into 256px importer sources.

Run before import-gear-icons.py to reproduce this batch from its retained sheets.
Only crops, transparent padding and downsampling; no repainting.
"""
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / 'art-source/gear/completion/manifest.json'


def main():
    manifest = json.loads(MANIFEST.read_text())
    for sheet in manifest['sheets']:
        image = Image.open(ROOT / sheet['path']).convert('RGBA')
        width, height = image.size
        start = sheet['batch'] * 9
        # The last sheet has three unused props in its last row.
        for cell, piece in enumerate(manifest['pieces'][start:start + 9]):
            col, row = cell % 3, cell // 3
            cut = image.crop((round(col * width / 3), round(row * height / 3),
                              round((col + 1) * width / 3), round((row + 1) * height / 3)))
            bounds = cut.getchannel('A').getbbox()
            if bounds is None:
                raise ValueError(f"Empty painting: {piece['id']}")
            cut = cut.crop(bounds)
            cut.thumbnail((232, 232), Image.Resampling.LANCZOS)
            icon = Image.new('RGBA', (256, 256))
            icon.alpha_composite(cut, ((256 - cut.width) // 2, (256 - cut.height) // 2))
            target = ROOT / 'art-source/gear' / piece['slot'] / (piece['id'] + '.png')
            target.parent.mkdir(parents=True, exist_ok=True)
            icon.save(target)


if __name__ == '__main__':
    main()
