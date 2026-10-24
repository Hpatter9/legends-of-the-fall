"""Find frames with a blank band: python3 tools/cinematics/blank.py <raw dir> [min rows]
A row of the picture (between the bars) that is one flat near-white (or near-black) colour right across counts; a run of them
(default 12 rows) is reported. The volcano's own dark sky top is a legitimate dark run, so black needs 80."""
import glob, sys
from PIL import Image
import numpy as np

d = sys.argv[1]
need = int(sys.argv[2]) if len(sys.argv) > 2 else 12
bad = 0
for f in sorted(glob.glob(f'{d}/*.png')):
    im = np.asarray(Image.open(f).convert('RGB')).astype(int)
    h = im.shape[0]
    top, bot = int(h * 0.105), int(h * 0.745)
    runs = {'white': 0, 'black': 0}
    worst = {'white': 0, 'black': 0}
    for y in range(top, bot):
        row = im[y]
        flat = (row.max(axis=0) - row.min(axis=0)).max() <= 6
        mean = row.mean()
        if flat and mean >= 240:
            runs['white'] += 1
        else:
            runs['white'] = 0
        if flat and mean <= 12:
            runs['black'] += 1
        else:
            runs['black'] = 0
        for k in runs:
            worst[k] = max(worst[k], runs[k])
    if worst['white'] >= need or worst['black'] >= 80:
        bad += 1
        print('BLANK', f, worst)
print(len(glob.glob(f'{d}/*.png')), 'frames,', bad, 'with a blank band')
