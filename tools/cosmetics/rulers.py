"""COSMETICS (docs/notes/cosmetics.md): the two bought rulers' art into the game, from the round-2 atlases (art-source/round2/, PR #666) and
the Crown Terrace and throne art (art-source/cosmetics/, PR #685):

  src/art/rulers/ember_sovereign.png, starlit_empress.png     the action atlases (896 x 1792: 4 x 8 cells of 224, as provenance.json)
  src/art/crown-terrace/ruler-<id>.webp                        the Crown Terrace figures (360 x 470)
  src/art/crown-terrace/<id>.webp                              their domains (800 x 1200)
  src/art/rulers/thrones.png                                   the eight thrones (4 x 2 cells of 224) with a third row: the two new ones

    python3 tools/cosmetics/rulers.py     (run once: it grows thrones.png only while it has two rows)
"""
import shutil
from PIL import Image

R2 = 'art-source/round2/'
CO = 'art-source/cosmetics/'
for short, rid in [('ember', 'ember_sovereign'), ('starlit', 'starlit_empress')]:
    shutil.copyfile(R2 + f'ruler_{short}.png', f'src/art/rulers/{rid}.png')
    Image.open(CO + f'terrace-ruler-{short}.png').convert('RGBA').save(f'src/art/crown-terrace/ruler-{rid}.webp', 'WEBP', quality=90, method=6)
    Image.open(CO + f'terrace-{short}.png').convert('RGB').save(f'src/art/crown-terrace/{rid}.webp', 'WEBP', quality=88, method=6)

thrones = Image.open('src/art/rulers/thrones.png').convert('RGBA')
if thrones.height == 448:
    grown = Image.new('RGBA', (896, 672))
    grown.alpha_composite(thrones, (0, 0))
    grown.alpha_composite(Image.open(CO + 'thrones-new.png').convert('RGBA'), (0, 448))
    grown.save('src/art/rulers/thrones.png', optimize=True)
