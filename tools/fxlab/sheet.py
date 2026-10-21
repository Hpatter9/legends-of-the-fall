# Lays frames out in a grid (three across) at half size: python3 -I sheet.py out.png frame1.png frame2.png ...
import sys
from PIL import Image
out, files = sys.argv[1], sys.argv[2:]
ims = [Image.open(f).convert('RGB') for f in files]
w, h = ims[0].size
tw, th = w // 2, h // 2
cols = 3
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (tw * cols, th * rows))
for i, im in enumerate(ims):
    sheet.paste(im.resize((tw, th), Image.LANCZOS), ((i % cols) * tw, (i // cols) * th))
sheet.save(out, optimize=True)
