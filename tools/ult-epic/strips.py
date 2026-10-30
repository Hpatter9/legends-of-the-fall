"""ULT-EPIC: put tools/ult-epic/shots.mjs's frames side by side, one row a pick, the time over each column.

    python3 tools/ult-epic/strips.py <frames folder> <out.png> <picks,comma,separated> <times,comma,separated> [scale=0.5]
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw

src, out, picks, times = Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3].split(','), [int(t) for t in sys.argv[4].split(',')]
k = float(sys.argv[5]) if len(sys.argv) > 5 else 0.5
first = Image.open(src / f'{picks[0]}-{times[0]}.png')
w, h = int(first.width * k), int(first.height * k)
pic = Image.new('RGB', (len(times) * (w + 4) + 4, len(picks) * (h + 22) + 4), (18, 18, 24))
d = ImageDraw.Draw(pic)
for r, p in enumerate(picks):
    for c, t in enumerate(times):
        f = src / f'{p}-{t}.png'
        x, y = 4 + c * (w + 4), 4 + r * (h + 22)
        d.text((x + 2, y + 2), f'{p} {t} ms', fill=(230, 230, 230))
        if f.exists():
            pic.paste(Image.open(f).convert('RGB').resize((w, h), Image.Resampling.LANCZOS), (x, y + 18))
out.parent.mkdir(parents=True, exist_ok=True)
pic.save(out, optimize=True)
print(out, pic.size)
