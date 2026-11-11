"""ULT-EPIC 2: put tools/ult-epic/stages.mjs's frames side by side, one strip a pick and a width, the stage named over each frame.

    python3 tools/ult-epic/stage-strips.py <frames folder> <out folder> [scale=0.5]

Reads <pick>-<W>-<n>-<stage>.png and writes <out>/<pick>-<W>.jpg.
"""
import sys
from collections import defaultdict
from pathlib import Path
from PIL import Image, ImageDraw

src, out = Path(sys.argv[1]), Path(sys.argv[2])
k = float(sys.argv[3]) if len(sys.argv) > 3 else 0.5
out.mkdir(parents=True, exist_ok=True)
sets = defaultdict(list)
for f in sorted(src.glob('*.png')):
    pick, width, n, stage = f.stem.split('-')
    sets[(pick, width)].append((int(n), stage, f))
for (pick, width), frames in sorted(sets.items()):
    frames.sort()
    first = Image.open(frames[0][2])
    w, h = int(first.width * k), int(first.height * k)
    pic = Image.new('RGB', (len(frames) * (w + 4) + 4, h + 26), (18, 18, 24))
    d = ImageDraw.Draw(pic)
    for c, (n, stage, f) in enumerate(frames):
        x = 4 + c * (w + 4)
        d.text((x + 2, 6), f'{n}. {stage}', fill=(230, 230, 230))
        pic.paste(Image.open(f).convert('RGB').resize((w, h), Image.Resampling.LANCZOS), (x, 22))
    to = out / f'{pick}-{width}.jpg'
    pic.save(to, quality=84, optimize=True)
    print(to, pic.size)
