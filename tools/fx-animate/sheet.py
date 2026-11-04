# Lays frames out in a row-major grid, five across, labelled with their order: python3 -I sheet.py out.png frame1.png ...
import sys
from PIL import Image, ImageDraw
out, files = sys.argv[1], sys.argv[2:]
ims = [Image.open(f).convert('RGB') for f in files]
w, h = ims[0].size
cols = 5
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (w * cols, h * rows))
d = ImageDraw.Draw(sheet)
for i, im in enumerate(ims):
    sheet.paste(im, ((i % cols) * w, (i // cols) * h))
    d.text(((i % cols) * w + 4, (i // cols) * h + 4), str(i), fill=(255, 255, 0))
sheet.save(out, optimize=True)
