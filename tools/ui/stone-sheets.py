"""Labelled overview sheets: python3 -I tools/ui/stone-sheets.py <prefix> <out-prefix> [suffix] [scale]
Groups the screens into a few sheets, each tile labelled; with --compare it puts before and after side by side (prefix = the 'after' one)."""
import sys, os, glob
from PIL import Image, ImageDraw, ImageFont
args = [a for a in sys.argv[1:] if not a.startswith('--')]
prefix, out = args[0], args[1]; suf = args[2] if len(args) > 2 else ''; scale = float(args[3]) if len(args) > 3 else 0.5
cmp_ = '--compare' in sys.argv
FONT = None
for f in glob.glob('/usr/share/fonts/**/DejaVuSans-Bold.ttf', recursive=True): FONT = ImageFont.truetype(f, 18)
GROUPS = {
  'home': ['home-battle', 'home-heroes', 'home-castle', 'home-recruit', 'home-spells', 'settings', 'achievements', 'codex'],
  'heroes': ['hero-sheet', 'awakening', 'equipment', 'talents', 'party', 'armies', 'army-card', 'starter'],
  'fight': ['fight-deploy', 'fight-running', 'boss-card', 'boss-bar', 'result', 'recap', 'auto-summary'],
  'more': ['event', 'tips', 'stash', 'chest', 'calamity-pick', 'calamity-map', 'tower', 'shop', 'daily', 'gacha', 'loading'],
}
import re
for a in sys.argv:
    if a.startswith('--groups='):
        GROUPS = {g.split(':')[0]: g.split(':')[1].split(',') for g in a[9:].split(';')}
def load(p):
    try: return Image.open(p).convert('RGB')
    except Exception: return None
for g, names in GROUPS.items():
    tiles = []
    for n in names:
        a = load(f'docs/samples/{prefix}-{n}{suf}.png')
        if a is None: continue
        if cmp_:
            b = load(f'docs/samples/{prefix.replace("after", "before")}-{n}{suf}.png') or a
            w, h = a.size; t = Image.new('RGB', (w * 2 + 8, h), (30, 30, 36)); t.paste(b, (0, 0)); t.paste(a, (w + 8, 0)); a = t
        tiles.append((n, a))
    if not tiles: continue
    cols = 4 if not cmp_ else 2
    tw = int(tiles[0][1].width * scale); th = int(tiles[0][1].height * scale)
    rows = (len(tiles) + cols - 1) // cols
    sh = Image.new('RGB', (cols * (tw + 10) + 10, rows * (th + 40) + 10), (22, 22, 28)); d = ImageDraw.Draw(sh)
    for i, (n, im) in enumerate(tiles):
        x = 10 + (i % cols) * (tw + 10); y = 10 + (i // cols) * (th + 40)
        d.text((x, y + 4), n + ('   before | after' if cmp_ else ''), fill=(235, 235, 240), font=FONT)
        sh.paste(im.resize((tw, th), Image.LANCZOS), (x, y + 30))
    sh.save(f'{out}-{g}.png', optimize=True)
print('ok')
