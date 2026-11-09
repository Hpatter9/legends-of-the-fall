"""Import the painted manuscript (the Council symbols are now cut by tools/art-wire-5/import-expansion.py)."""
from pathlib import Path
from PIL import Image
ROOT = Path(__file__).resolve().parents[2]
# (the sixteen Council and News symbols are cut by tools/art-wire-5/import-expansion.py since the repainted sheet, at the sizes drawn)
manuscript = Image.open(ROOT / 'art-source/council-manuscript/manuscript.png').convert('RGB')
manuscript.resize((256,256), Image.Resampling.LANCZOS).save(ROOT / 'src/art/quests/lost-face.png', optimize=True)
print('Imported the painted manuscript.')
