"""Lay the raw frames of every scene into the committed samples: python3 tools/cinematics/sheets.py <raw dir> <out dir>
A scene of its own gets a strip of all its frames (scenes-<id>.png); a family (the awakenings, the armies' last stands, ...) gets
one sheet with a frame of each of its scenes (scenes-<family>.png), the frame that shows it best."""
import glob, os, re, sys
from PIL import Image

raw, out = sys.argv[1:3]
os.makedirs(out, exist_ok=True)
FAMILIES = {'awaken': 2, 'clear': 2, 'earned': 1, 'castle': 1, 'spire': 1, 'form': 1}
pat = re.compile(r'^(.+)-(\d+)\.png$')
scenes = {}
for f in glob.glob(f'{raw}/*.png'):
    m = pat.match(os.path.basename(f))
    if m:
        scenes.setdefault(m.group(1), {})[int(m.group(2))] = f

def save(im, path):
    im = im.convert('RGB').quantize(colors=96, method=Image.Quantize.MEDIANCUT)
    im.save(path, optimize=True)
    print(path, im.size, os.path.getsize(path) // 1024, 'KB')

fam = {k: {} for k in FAMILIES}
for sid, frames in sorted(scenes.items()):
    head = sid.split('_')[0]
    if head in FAMILIES and '_' in sid:
        fam[head][sid] = frames
        continue
    ims = [Image.open(frames[i]).convert('RGB') for i in sorted(frames)]
    w, h = ims[0].size
    sc = 0.4
    tw, th = round(w * sc), round(h * sc)
    strip = Image.new('RGB', (tw * len(ims) + 4 * (len(ims) - 1), th), (20, 20, 20))
    for i, im in enumerate(ims):
        strip.paste(im.resize((tw, th), Image.LANCZOS), (i * (tw + 4), 0))
    save(strip, f'{out}/scenes-{sid}.png')

for head, group in fam.items():
    if not group:
        continue
    pick = FAMILIES[head]
    ims = []
    for sid, frames in sorted(group.items()):
        k = pick if pick in frames else sorted(frames)[-1]
        ims.append(Image.open(frames[k]).convert('RGB'))
    w, h = ims[0].size
    sc = 0.3
    tw, th = round(w * sc), round(h * sc)
    cols = min(len(ims), 9)
    rows = -(-len(ims) // cols)
    sheet = Image.new('RGB', (cols * (tw + 4), rows * (th + 4)), (20, 20, 20))
    for i, im in enumerate(ims):
        sheet.paste(im.resize((tw, th), Image.LANCZOS), ((i % cols) * (tw + 4), (i // cols) * (th + 4)))
    save(sheet, f'{out}/scenes-{head}.png')
