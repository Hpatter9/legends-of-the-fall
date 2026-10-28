"""Pack generated source sheets at a phone-friendly resolution; the original paintings stay untouched."""
from pathlib import Path
import sys
from PIL import Image

if len(sys.argv) != 10:
    raise SystemExit('Usage: python3 tools/fxlab/import-ability-art.py <nine generated PNG paths in atlas order>')
root = Path('src/art/fx/abilities')
root.mkdir(parents=True, exist_ok=True)
for index, path in enumerate(sys.argv[1:]):
    image = Image.open(path).convert('RGBA')
    size = 256 if index == 8 else 768
    image.resize((size, size), Image.Resampling.LANCZOS).save(root / f'atlas-{index}.png', optimize=True)
