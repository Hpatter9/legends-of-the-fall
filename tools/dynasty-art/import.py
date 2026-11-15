"""Import the Council's backdrops (the symbols: tools/art-wire-5/import-expansion.py). (REMOVE-DYNASTY: the Houses' backdrop and the
House and heirloom paintings went with the Dynasties; their sources stay in art-source/.)"""
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'src/art/dynasty'
# (and the Council's hall after the War's end, the Assault's phase 5: docs/notes/assault-5-art-prompts.md)
for name in ['council','council-fallen']:
    im=Image.open(ROOT/f'art-source/expansion/{name}-backdrop.png').convert('RGB')
    im.thumbnail((768,1152),Image.Resampling.LANCZOS)
    im.save(OUT/f'{name}-backdrop.webp',quality=86,method=6)
print('Imported 2 backdrops.')
