# LIVING-FIELDS: shrink the shots for the repo (a 200-colour palette: a third of the size, nothing lost that the eye wants):
#   python3 tools/living-fields/shrink.py docs/samples/living-fields [tag]
import sys, glob
from PIL import Image
tag = sys.argv[2] if len(sys.argv) > 2 else ''
for p in glob.glob(f'{sys.argv[1]}/{tag}*.png'):
    im = Image.open(p)
    if im.mode != 'P':
        im.convert('RGB').quantize(200, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(p, optimize=True)
