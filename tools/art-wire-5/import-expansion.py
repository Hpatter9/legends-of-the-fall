"""Cut the Nemesis War's and the Houses' painted icons from art-source/expansion/ (PR #464's repaints) at the sizes the game draws.

- nemesis-icons.png (12 x 5 cells of 128): row 1 the twelve modelled traits, row 2 the ten Council events, row 3 the News icons and the
  War Trophy (the order is in docs/notes/expansion-2-art-prompts.md). The traits go to src/art/dynasty/trait-<id>.png, the Council and
  News symbols to src/art/council/<kind>.png.
- seasons-fates.png (nine 128 x 256 cells, the icon in the top 128): src/art/dynasty/<name>.png.
- frames.png (five cells of 256): the scar frames 1 to 3 and the heirloom frame, src/art/expansion/scar-<n>.png and heirloom-frame.png,
  and the signet ring, src/art/expansion/heirloom-chip.png.

Each icon is trimmed to what is painted (alpha 8 and up), set square on a small margin and brought down with Lanczos, so it is drawn
smoothly (`image-rendering: auto`) at about a third of its pixels on a 3x phone. The frames keep their full cell's square, so their
transparent middles line up with the face or item they surround. Bundled into game.js as data URLs: nothing for the service worker.

    python3 tools/art-wire-5/import-expansion.py
"""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'art-source/expansion'

# (the drawn sizes: a trait 28 px, a News line 24, the War Trophy 32, a fate 18 to 32, a season 18 to 48; the face 32 to 40, an item 48)
ICON = 96
SEASON = 144

TRAITS = ['ironSkull', 'arrowCatcher', 'scarred', 'sureFooted', 'spellScorned', 'hornDeaf', 'survivor', 'healerHunter', 'executioner',
          'ambusher', 'hillKing', 'loneWolf']
# (the Council's and the News's symbols by cell: `slain` wears the iron skull, as before; 27, the bandaged fist, and 30, the small
#  shield, have no event of their own yet)
COUNCIL = {'slain': 0, 'recruit': 12, 'promotion': 13, 'feud': 14, 'betrayal': 15, 'feast': 16, 'trial': 17, 'oath': 18, 'desertion': 19,
           'fled': 20, 'cheated': 21, 'humiliated': 24, 'vengeance': 25, 'reclaimed': 26, 'duel': 28, 'token': 29}
SEASONS = ['spring', 'summer', 'autumn', 'winter']
FATES = ['mentor', 'regular', 'shade', 'fallen', 'legend']


def fit(tile: Image.Image, size: int, margin: float = 0.04) -> Image.Image:
    """Trim to the painted part, centre it on a transparent square with a small margin, and bring it down to `size`."""
    a = tile.getchannel('A').point(lambda x: 255 if x >= 8 else 0)
    box = a.getbbox()
    assert box, 'empty cell'
    part = tile.crop(box)
    side = round(max(part.size) * (1 + 2 * margin))
    sq = Image.new('RGBA', (side, side))
    sq.paste(part, ((side - part.width) // 2, (side - part.height) // 2))
    return sq.resize((size, size), Image.Resampling.LANCZOS)


def save(im: Image.Image, path: Path) -> None:
    """Saved as a 256-colour palette PNG with its alpha: no visible change at these sizes, and under a third of the bytes in game.js."""
    path.parent.mkdir(parents=True, exist_ok=True)
    im.quantize(256, method=Image.Quantize.FASTOCTREE).save(path, optimize=True)


icons = Image.open(SRC / 'nemesis-icons.png').convert('RGBA')
assert icons.size == (1536, 640)
cell = lambda c: icons.crop((c % 12 * 128, c // 12 * 128, c % 12 * 128 + 128, c // 12 * 128 + 128))
for i, name in enumerate(TRAITS):
    save(fit(cell(i), ICON), ROOT / f'src/art/dynasty/trait-{name}.png')
for name, c in COUNCIL.items():
    save(fit(cell(c), ICON), ROOT / f'src/art/council/{name}.png')

sf = Image.open(SRC / 'seasons-fates.png').convert('RGBA')
assert sf.size == (1152, 256)
for i, name in enumerate(SEASONS + FATES):
    save(fit(sf.crop((i * 128, 0, i * 128 + 128, 128)), SEASON if name in SEASONS else ICON), ROOT / f'src/art/dynasty/{name}.png')

frames = Image.open(SRC / 'frames.png').convert('RGBA')
assert frames.size == (1280, 256)
frame = lambda i: frames.crop((i * 256, 0, i * 256 + 256, 256))
for n in (1, 2, 3):
    # (a frame painted 18 to 238 in its 256 cell: cropped to that square, so the brass meets the face's edge)
    save(frame(n - 1).crop((17, 17, 239, 239)).resize((128, 128), Image.Resampling.LANCZOS), ROOT / f'src/art/expansion/scar-{n}.png')
save(frame(3).crop((12, 12, 244, 244)).resize((192, 192), Image.Resampling.LANCZOS), ROOT / 'src/art/expansion/heirloom-frame.png')
save(fit(frame(4), 48), ROOT / 'src/art/expansion/heirloom-chip.png')

# a review sheet: every cut at its drawn size and at 2x, on the menus' dark ground
names = [f'dynasty/trait-{t}' for t in TRAITS] + [f'council/{c}' for c in COUNCIL] + [f'dynasty/{s}' for s in SEASONS + FATES] + \
    [f'expansion/scar-{n}' for n in (1, 2, 3)] + ['expansion/heirloom-frame', 'expansion/heirloom-chip']
preview = Image.new('RGB', (10 * 92, (len(names) + 9) // 10 * 120), '#211c24')
draw = ImageDraw.Draw(preview)
for i, n in enumerate(names):
    im = Image.open(ROOT / f'src/art/{n}.png').convert('RGBA')
    x, y = i % 10 * 92, i // 10 * 120
    big = im.resize((64, 64), Image.Resampling.LANCZOS)
    small = im.resize((24, 24), Image.Resampling.LANCZOS)
    preview.paste(big, (x + 14, y + 4), big)
    preview.paste(small, (x + 34, y + 72), small)
    draw.text((x + 2, y + 100), n.split('/')[1][:14], fill='#efdbb6')
out = ROOT / 'docs/samples/art-wire-5'
out.mkdir(parents=True, exist_ok=True)
preview.save(out / 'icons.png')
print(f'Cut {len(TRAITS)} traits, {len(COUNCIL)} Council and News symbols, {len(SEASONS + FATES)} seasons and fates, 3 scar frames, '
      'the heirloom frame and its chip.')
