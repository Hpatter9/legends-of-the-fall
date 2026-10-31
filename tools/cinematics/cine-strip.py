# CINE-001: lay a film's frames (from cine-strips.mjs) out as one strip: python3 tools/cinematics/cine-strip.py <raw dir> <id> <out.png> [width]
import sys, glob, re
from PIL import Image
raw, sid, out = sys.argv[1], sys.argv[2], sys.argv[3]
w = sys.argv[4] if len(sys.argv) > 4 else '393'
fs = [f for f in glob.glob(f'{raw}/{sid}-*-{w}.png') if re.search(rf'{re.escape(sid)}-\d+-{w}\.png$', f)]
fs.sort(key=lambda f: int(re.findall(r'-(\d+)-\d+\.png$', f)[0]))
ims = [Image.open(f).convert('RGB') for f in fs]
if not ims: sys.exit(f'no frames for {sid}')
k = 0.5
fw, fh = int(ims[0].width * k), int(ims[0].height * k)
cols = min(8, len(ims)); rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (fw * cols + 4 * (cols - 1), fh * rows + 4 * (rows - 1)), (24, 20, 18))
for i, im in enumerate(ims):
    sheet.paste(im.resize((fw, fh), Image.LANCZOS), ((i % cols) * (fw + 4), (i // cols) * (fh + 4)))
sheet.save(out, optimize=True)
print(out, len(ims), 'frames')
