# The contact sheet of the CAL-VOID mock-ups: the six 393x852 shots in three columns (one per layout), fresh above, mid-map below.
from PIL import Image, ImageDraw
names = ['a-fresh', 'b-fresh', 'c-fresh', 'a-mid', 'b-mid', 'c-mid']
ims = [Image.open(f'docs/samples/cal-void-mock-{n}.png').convert('RGB') for n in names]
w, h = ims[0].size
s = 0.5
tw, th = int(w * s), int(h * s)
pad, top = 16, 40
sheet = Image.new('RGB', (pad + 3 * (tw + pad), top + 2 * (th + pad)), (16, 12, 24))
d = ImageDraw.Draw(sheet)
d.text((pad, 12), 'MOCK-UP  CAL-VOID: three small void maps (A ladder, B orbit, C spine). Top: a fresh map. Bottom: a few spots in.', fill=(255, 230, 160))
for i, im in enumerate(ims):
    x = pad + (i % 3) * (tw + pad)
    y = top + (i // 3) * (th + pad)
    sheet.paste(im.resize((tw, th), Image.LANCZOS), (x, y))
sheet.save('docs/samples/cal-void-mock-sheet.png')
print('sheet', sheet.size)
