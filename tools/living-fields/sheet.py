# LIVING-FIELDS: lay a land's three shots side by side into one contact sheet:
#   python3 tools/living-fields/sheet.py <shots dir> <tag> <out dir> [width]
import sys, glob, os
from PIL import Image
src, tag, out = sys.argv[1:4]
width = int(sys.argv[4]) if len(sys.argv) > 4 else 1600
os.makedirs(out, exist_ok=True)
lands = sorted({os.path.basename(p).split('-')[1] for p in glob.glob(f'{src}/{tag}-*.png')})
for land in lands:
    files = sorted(p for p in glob.glob(f'{src}/{tag}-{land}-*.png') if not p[:-4].split('-')[-1].isdigit())
    ims = [Image.open(p).convert('RGB') for p in files]
    w = width // len(ims)
    ims = [im.resize((w, round(im.height * w / im.width)), Image.LANCZOS) for im in ims]
    sheet = Image.new('RGB', (w * len(ims), max(im.height for im in ims)))
    for i, im in enumerate(ims):
        sheet.paste(im, (i * w, 0))
    sheet.save(f'{out}/{tag}-{land}.jpg', quality=88)
