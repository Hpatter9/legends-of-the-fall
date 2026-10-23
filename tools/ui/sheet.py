"""Contact sheet of a style's screens: python3 -I tools/ui/sheet.py <style> <out.png> [suffix]"""
import sys
from PIL import Image
st, out = sys.argv[1], sys.argv[2]; suf = sys.argv[3] if len(sys.argv) > 3 else ''
names = ['fight', 'battle', 'heroes', 'sheet', 'armies', 'castle', 'recruit', 'recap']
ims = [Image.open(f'docs/samples/ui-style-{st}-{n}{suf}.png').convert('RGB') for n in names]
w, h = ims[0].size
sh = Image.new('RGB', (w * 4, h * 2))
for i, im in enumerate(ims): sh.paste(im, ((i % 4) * w, (i // 4) * h))
sh.save(out)
