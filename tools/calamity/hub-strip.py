# The frame strips of the Rift Sanctuary's walk-in and walk-out (CALAMITY-HUB), from the frames `hub-shots.mjs` takes.
# Usage: python3 tools/calamity/hub-strip.py  (reads docs/samples/calhub-frames/, writes docs/samples/calhub-strip-*.png)
import glob, os
from PIL import Image, ImageDraw

FRAMES = 'docs/samples/calhub-frames'
for kind in ['in', 'out', 'calm-in', 'calm-out']:
    files = sorted(glob.glob(f'{FRAMES}/{kind}-*.png'))
    if not files:
        continue
    # (every other frame, at most ten, half size, each labelled with its time on the room's clock)
    # (the walk-out starts a frame in: its first frame can still be the battle the tap left)
    pick = (files[1::2] if kind.endswith('out') else files[::2])[:10]
    w, h = 197, 426
    sheet = Image.new('RGB', (w * len(pick), h + 18), (8, 18, 14))
    d = ImageDraw.Draw(sheet)
    for i, f in enumerate(pick):
        sheet.paste(Image.open(f).convert('RGB').resize((w, h)), (i * w, 18))
        d.text((i * w + 6, 3), f"{int(os.path.basename(f).split('-')[-1][:-4])} ms", fill=(240, 220, 170))
    sheet.save(f'docs/samples/calhub-strip-{kind}.png', optimize=True)
    print(kind, len(pick))
