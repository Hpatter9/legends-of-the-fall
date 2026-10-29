# Joins tools/rulers/seat-strip.mjs's crops into one picture: for each ruler, the castle and Last Stand rows, before and after,
# four frames (before 350 ms apart, after 700 ms, so a breath shows). Run from the repo root: python3 tools/rulers/seat-montage.py iron_stag,sun_viper,the_king docs/samples/x.png
import sys, os
from PIL import Image, ImageDraw
rulers = sys.argv[1].split(','); out = sys.argv[2]
labels = [l for l in ('before', 'after') if os.path.exists(f'out/seat-strip/{l}-castle-{rulers[0]}-0.png')]
rows = []
for r in rulers:
    for view in ('castle', 'stand'):
        for l in labels:
            ims = [Image.open(f'out/seat-strip/{l}-{view}-{r}-{i}.png').convert('RGB') for i in range(4)]
            h = 200
            ims = [im.resize((round(im.width * h / im.height), h), Image.NEAREST) for im in ims]
            row = Image.new('RGB', (150 + sum(i.width for i in ims) + 12, h + 8), (24, 20, 28))
            ImageDraw.Draw(row).text((6, h // 2 - 12), f'{r}\n{view}\n{l}', fill=(240, 220, 160))
            x = 150
            for im in ims:
                row.paste(im, (x, 4)); x += im.width + 4
            rows.append(row)
W = max(r.width for r in rows)
sheet = Image.new('RGB', (W, sum(r.height for r in rows)), (24, 20, 28))
y = 0
for r in rows:
    sheet.paste(r, (0, y)); y += r.height
sheet.save(out); print(out, sheet.size)
