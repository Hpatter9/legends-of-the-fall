"""Draws the four mockup UI kits into src/ui/styles/<a|b|c|d>/ (see docs/notes/ui-styles.md). Run: python3 -I tools/ui/styles.py [../chronos-assets]
Every file has the name and size of its twin in src/art/ui/ (so the 9-slice numbers in pixel.css hold); only the colours, the rivets,
stitches and gems and the textures differ. The textures are DawnLike floor tiles (chronos-assets/DawnLike/Objects/Floor.png) with their
few colours moved, by brightness rank, onto each style's own ramp: no pixel is resampled. Frames are drawn natively, as tools/ui/frames.py does."""
import os, sys
from PIL import Image
ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
ASSETS = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, '..', 'chronos-assets')
FLOOR = Image.open(os.path.join(ASSETS, 'DawnLike', 'Objects', 'Floor.png')).convert('RGBA')
T = (0, 0, 0, 0)
def rgb(h): return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) + (255,)
def lum(c): return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]

def tile(bx, by, ramp, rot=0, mirror=False):
    """The centre tile of the 3x3 set whose corner is (bx, by) in Floor.png, its colours (darkest to lightest) moved onto the ramp."""
    t = FLOOR.crop((bx + 16, by + 16, bx + 32, by + 32))
    if rot: t = t.rotate(rot)
    cols = sorted({c for c in t.getdata()}, key=lum)
    ramp = [rgb(h) for h in ramp]
    m = {c: ramp[min(len(ramp) - 1, round(i * (len(ramp) - 1) / max(1, len(cols) - 1)))] for i, c in enumerate(cols)}
    out = Image.new('RGBA', (16, 16)); px = out.load(); src = t.load()
    for x in range(16):
        for y in range(16): px[x, y] = m[src[x, y]]
    return out

def box(w, h, rings, fill):
    """Concentric one-pixel rings, outermost first (a ring is a colour or a (top-left, bottom-right) pair); the outer corners are cut."""
    im = Image.new('RGBA', (w, h), fill); px = im.load()
    for i, c in enumerate(rings):
        a, b = c if isinstance(c[0], tuple) else (c, c)
        for x in range(i, w - i): px[x, i] = a; px[x, h - 1 - i] = b
        for y in range(i, h - i): px[i, y] = a; px[w - 1 - i, y] = b
    for x, y in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)): px[x, y] = T
    return im, px

def dots(px, pts, c):
    for x, y in pts: px[x, y] = c

def button(P, hi, lo, fill, fhi, lip, liphi=None, decor=None, dec=None):
    """16x16, slice 5 5 6: outline, bevel rim, lit top band, fill, a lower lip. decor: 'rivet' | 'bolt' | 'stitch' | 'gem'."""
    im = Image.new('RGBA', (16, 16), fill); px = im.load()
    for y in (2, 3):
        for x in range(2, 14): px[x, y] = fhi
    for y in range(11, 14):
        for x in range(2, 14): px[x, y] = lip
    for x in range(2, 14): px[x, 13] = liphi or lip
    for x in range(1, 15): px[x, 1] = hi; px[x, 14] = lo
    for y in range(1, 15): px[1, y] = hi; px[14, y] = lo
    for x in range(16): px[x, 0] = P['deep']; px[x, 15] = P['deep']
    for y in range(16): px[0, y] = P['deep']; px[15, y] = P['deep']
    for x, y in ((0, 0), (15, 0), (0, 15), (15, 15)): px[x, y] = T
    for x, y in ((1, 1), (14, 1), (1, 14), (14, 14)): px[x, y] = P['deep']
    dec = dec or hi
    if decor == 'rivet':
        for x, y, dx in ((3, 3, 1), (12, 3, -1), (3, 12, 1), (12, 12, -1)): px[x, y] = dec; px[x + dx, y] = lip
    elif decor == 'bolt':   # a 2x2 iron bolt head in each corner: lit, mid, shadow
        for x, y in ((3, 3), (11, 3), (3, 11), (11, 11)):
            px[x, y] = dec; px[x + 1, y] = hi; px[x, y + 1] = hi; px[x + 1, y + 1] = lo
    elif decor == 'stitch':  # cream thread: an L-shaped stitch in each corner (only the corners are never stretched)
        for x, y, dx, dy in ((3, 3, 1, 1), (12, 3, -1, 1), (3, 12, 1, -1), (12, 12, -1, -1)):
            px[x, y] = dec; px[x + dx, y] = dec; px[x, y + dy] = dec
    elif decor == 'gem':     # a bright gem in each corner and a pale line along the lit band
        for x, y in ((3, 3), (12, 3), (3, 12), (12, 12)): px[x, y] = dec
        for x in range(6, 10): px[x, 2] = dec
    return im

def button_s(P, hi, lo, fill, fhi, lip, decor=None, dec=None):
    """10x10, slice 3 3 4: the small button."""
    im = Image.new('RGBA', (10, 10), fill); px = im.load()
    for x in range(2, 8): px[x, 2] = fhi
    for y in (6, 7):
        for x in range(2, 8): px[x, y] = lip
    for x in range(1, 9): px[x, 1] = hi; px[x, 8] = lo
    for y in range(1, 9): px[1, y] = hi; px[8, y] = lo
    for x in range(10): px[x, 0] = P['deep']; px[x, 9] = P['deep']
    for y in range(10): px[0, y] = P['deep']; px[9, y] = P['deep']
    for x, y in ((0, 0), (9, 0), (0, 9), (9, 9)): px[x, y] = T
    dec = dec or hi
    px[2, 2] = dec; px[7, 2] = dec
    return im

def trim(P):
    im = Image.new('RGBA', (8, 4)); px = im.load()
    for y, c in enumerate(P['trim']):
        for x in range(8): px[x, y] = c
    return im

def ribbon(P, grey=False):
    """32x16, slice 0 12: a band with trim lines and swallow-tailed ends."""
    w, h = 32, 16
    c = P['ribgrey'] if grey else P['rib']; edge = P['ribedge_grey'] if grey else P['ribedge']; ol = P['ribline']
    body = [ol, edge[0], c[0], c[0], c[1], c[0], c[0], c[0], c[0], c[2], c[2], c[3], edge[1], ol]
    im = Image.new('RGBA', (w, h)); px = im.load()
    for x in range(w):
        for y in range(1, 15): px[x, y] = body[y - 1]
    for y in range(1, 15):
        n = int(5 - abs(y - 7.5) * 0.8)
        for x in range(0, max(0, n)): px[x, y] = T; px[w - 1 - x, y] = T
        if n > 0: px[n, y] = ol; px[w - 1 - n, y] = ol
    return im

def flag(P):
    """8x11 war banner for a placed card."""
    im = Image.new('RGBA', (8, 11)); px = im.load(); f = P['flag']
    for x in range(8): px[x, 0] = P['deep']; px[x, 1] = P['flagbar']
    for y in range(2, 11):
        for x in range(1, 7): px[x, y] = f[0] if x < 5 else f[1]
        px[0, y] = P['deep']; px[7, y] = P['deep']
    dots(px, ((2, 3), (5, 3), (3, 4), (4, 4), (3, 5), (4, 5), (2, 6), (5, 6)), P['flagmark'])
    for x, y in ((3, 8), (4, 8), (3, 9), (4, 9), (3, 10), (4, 10)): px[x, y] = T
    dots(px, ((2, 9), (5, 9), (2, 10), (5, 10)), P['deep'])
    return im

def cardback(P):
    im = Image.new('RGBA', (8, 8)); px = im.load()
    for x in range(8):
        for y in range(8): px[x, y] = P['back'][0] if (x + y) % 8 < 4 else P['back'][1]
    return im

def build(key, P):
    out = os.path.join(ROOT, 'src', 'ui', 'styles', key); os.makedirs(out, exist_ok=True)
    save = lambda n, im: im.save(os.path.join(out, n + '.png'))
    b, g, off = P['btn'], P['gold'], P['off']
    d = P['decor']
    save('btn', button(P, b['hi'], b['lo'], b['fill'], b['fhi'], b['lip'], b.get('liphi'), d, P['dec']))
    save('btn-down', button(P, b['lo'], b['hi'], b['lip'], b['lip'], b['lip'], None, None))
    save('btn-off', button(P, off['hi'], off['lo'], off['fill'], off['fhi'], off['lip'], None, None))
    save('btn-gold', button(P, g['hi'], g['lo'], g['fill'], g['fhi'], g['lip'], g.get('liphi'), d, g.get('dec', P['dec'])))
    save('btn-gold-down', button(P, g['lo'], g['hi'], g['lip'], g['lip'], g['lip'], None, None))
    save('btn-s', button_s(P, b['hi'], b['lo'], b['fill'], b['fhi'], b['lip'], d, P['dec']))
    save('btn-s-down', button_s(P, b['lo'], b['hi'], b['lip'], b['lip'], b['lip']))
    save('btn-s-off', button_s(P, off['hi'], off['lo'], off['fill'], off['fhi'], off['lip']))
    # the big frame: transparent middle, so the page's own texture (set in the style's CSS) shows inside it
    im, px = box(16, 16, P['panel'], T)
    for ox, oy in ((2, 2), (12, 2), (2, 12), (12, 12)): dots(px, ((ox, oy), (ox + 1, oy), (ox, oy + 1), (ox + 1, oy + 1)), P['panelpip'][0]); px[ox + 1, oy + 1] = P['panelpip'][1]
    save('panel', im)
    for nm, (a, c) in P['cards'].items():
        im, _ = box(10, 10, [P['deep'], a, c], P['cardfill']); save('card' + nm, im)
        im, _ = box(8, 8, [P['deep'], a], P['cardfill']); save('cardb' + nm, im)
    save('card-on', box(10, 10, [P['deep'], P['cards']['-chosen'][0], P['cards']['-chosen'][1]], P['cardon'])[0])
    save('chip', box(6, 6, [P['deep'], P['chip'][0]], P['chip'][1])[0])
    save('chip-on', box(6, 6, [P['deep'], P['chipon'][0]], P['chipon'][1])[0])
    save('ribbon', ribbon(P)); save('ribbon-grey', ribbon(P, True))
    save('trim-t', trim(P)); save('trim-b', trim(P).transpose(Image.FLIP_TOP_BOTTOM))
    save('flag', flag(P)); save('cardback', cardback(P))
    save('wood', tile(*P['bar']))      # the bars (top bar, tab bar, bottom panel), shown at 2x
    save('page', tile(*P['pagetex']))  # the menu pages and the panels' fill, shown at 2x

def R(*hs): return [rgb(h) for h in hs]
STYLES = {}
# ---- A. Refined wood and gold: a clean walnut with crisp double gold trim ----
STYLES['a'] = dict(deep=rgb('#140a05'), decor='rivet', dec=rgb('#ffe9a0'),
  btn=dict(hi=rgb('#d79a3a'), lo=rgb('#6b4423'), fill=rgb('#6a4528'), fhi=rgb('#80552f'), lip=rgb('#46291a'), liphi=rgb('#46291a')),
  gold=dict(hi=rgb('#fff6c8'), lo=rgb('#b87a1c'), fill=rgb('#f4b73c'), fhi=rgb('#ffd870'), lip=rgb('#cf8a1a'), liphi=rgb('#9a620f'), dec=rgb('#fffbe6')),
  off=dict(hi=rgb('#6b6258'), lo=rgb('#2c2722'), fill=rgb('#443d36'), fhi=rgb('#514a42'), lip=rgb('#2c2722')),
  panel=[rgb('#140a05'), (rgb('#ffeaa8'), rgb('#cf8a1a')), (rgb('#f4b73c'), rgb('#a8691a')), rgb('#140a05'), rgb('#7a5030')], panelpip=R('#fff2c0', '#a8691a'),
  cards={'': (rgb('#8a5e36'), rgb('#4a2c1a')), '-r1': (rgb('#a8a49a'), rgb('#5c5850')), '-r2': (rgb('#5aa0f0'), rgb('#2c5aa0')), '-r3': (rgb('#b27af0'), rgb('#6a3aa8')), '-r4': (rgb('#f4b73c'), rgb('#b87a1c')), '-r5': (rgb('#ff4a4a'), rgb('#a01c24')), '-chosen': (rgb('#ffeaa8'), rgb('#f4b73c'))},
  cardfill=rgb('#2c1a10'), cardon=rgb('#e6932a'), chip=(rgb('#a8713f'), rgb('#26150d')), chipon=(rgb('#ffeaa8'), rgb('#e6932a')),
  rib=R('#cc2a30', '#e8604a', '#9c1c22', '#74121a'), ribgrey=R('#5e5e66', '#80808a', '#46464e', '#34343a'), ribedge=R('#f4b73c', '#b87a1c'), ribedge_grey=R('#9a9aa4', '#5e5e66'), ribline=rgb('#2a0a06'),
  trim=R('#140a05', '#ffeaa8', '#cf8a1a', '#140a05'), flag=R('#cc2a30', '#8e1218'), flagbar=rgb('#f4b73c'), flagmark=rgb('#ffeaa8'), back=R('#8a5a30', '#5c3a20'),
  bar=(0, 480, ['#2a1a10', '#38241a', '#4a3020', '#5c3d27'], 90), pagetex=(0, 480, ['#1d1009', '#22140c', '#291a10', '#301f14'], 0))
# ---- B. Dark stone and iron: cold slate, riveted iron, ember accents ----
STYLES['b'] = dict(deep=rgb('#0b0e12'), decor='bolt', dec=rgb('#b4c2cf'),
  btn=dict(hi=rgb('#8595a1'), lo=rgb('#2a323c'), fill=rgb('#3c4755'), fhi=rgb('#4d5a6a'), lip=rgb('#29313b')),
  gold=dict(hi=rgb('#ffd0a0'), lo=rgb('#8a3c10'), fill=rgb('#ec7a2c'), fhi=rgb('#ffa660'), lip=rgb('#b8521a'), liphi=rgb('#7a3410'), dec=rgb('#ffe2c4')),
  off=dict(hi=rgb('#4e5560'), lo=rgb('#1c2026'), fill=rgb('#2c323a'), fhi=rgb('#343b44'), lip=rgb('#1c2026')),
  panel=[rgb('#0b0e12'), (rgb('#8595a1'), rgb('#3c4755')), rgb('#0b0e12'), (rgb('#4d5a6a'), rgb('#1f262e'))], panelpip=R('#c4d0da', '#3c4755'),
  cards={'': (rgb('#56626f'), rgb('#27303a')), '-r1': (rgb('#8595a1'), rgb('#3c4755')), '-r2': (rgb('#5a8ae0'), rgb('#2a4a8a')), '-r3': (rgb('#a07ae0'), rgb('#5a3a98')), '-r4': (rgb('#ec7a2c'), rgb('#8a3c10')), '-r5': (rgb('#f0503a'), rgb('#8a1c14')), '-chosen': (rgb('#ffb070'), rgb('#ec7a2c'))},
  cardfill=rgb('#1a2028'), cardon=rgb('#c4521a'), chip=(rgb('#56626f'), rgb('#151a20')), chipon=(rgb('#ffd0a0'), rgb('#ec7a2c')),
  rib=R('#3c4755', '#566474', '#2c3540', '#1e252e'), ribgrey=R('#4a5058', '#666d76', '#383d44', '#2a2e34'), ribedge=R('#ec7a2c', '#8a3c10'), ribedge_grey=R('#8595a1', '#4e5560'), ribline=rgb('#0b0e12'),
  trim=R('#0b0e12', '#8595a1', '#3c4755', '#0b0e12'), flag=R('#c4521a', '#7a2c0c'), flagbar=rgb('#8595a1'), flagmark=rgb('#ffd0a0'), back=R('#3c4755', '#27303a'),
  bar=(0, 96, ['#171c23', '#1f262e', '#2a323c', '#36404c'], 0), pagetex=(0, 144, ['#10141a', '#141a21', '#19202a', '#1f2731'], 0))
# ---- C. Parchment and ink: storybook paper, inked borders, wax-seal red, leather ----
STYLES['c'] = dict(deep=rgb('#2b1a0e'), decor='stitch', dec=rgb('#f0e0b8'),
  btn=dict(hi=rgb('#c99a60'), lo=rgb('#4a2c14'), fill=rgb('#8a5a30'), fhi=rgb('#9e6c3a'), lip=rgb('#6a4222')),
  gold=dict(hi=rgb('#f2a898'), lo=rgb('#5a0f0a'), fill=rgb('#b3261e'), fhi=rgb('#cc4034'), lip=rgb('#8a1812'), liphi=rgb('#6a100c'), dec=rgb('#f6e2c0')),
  off=dict(hi=rgb('#d8c8a0'), lo=rgb('#8a7a5c'), fill=rgb('#c4b48e'), fhi=rgb('#cdbf9a'), lip=rgb('#b0a07c')),
  panel=[rgb('#2b1a0e'), (rgb('#e8d4a2'), rgb('#b89860')), rgb('#2b1a0e'), (rgb('#c9a96a'), rgb('#a88850'))], panelpip=R('#b3261e', '#6a100c'),
  cards={'': (rgb('#a88850'), rgb('#6a4a2a')), '-r1': (rgb('#8a8a82'), rgb('#4a4a44')), '-r2': (rgb('#3a6ab8'), rgb('#1e3a78')), '-r3': (rgb('#8a4ab8'), rgb('#4e2678')), '-r4': (rgb('#c8901e'), rgb('#7a520c')), '-r5': (rgb('#b3261e'), rgb('#6a100c')), '-chosen': (rgb('#b3261e'), rgb('#e8d4a2'))},
  cardfill=rgb('#ecdcb4'), cardon=rgb('#f6e8c4'), chip=(rgb('#6a4a2a'), rgb('#e6d4a8')), chipon=(rgb('#2b1a0e'), rgb('#b3261e')),
  rib=R('#a3281f', '#c8483a', '#82180f', '#62100a'), ribgrey=R('#7a6a54', '#968670', '#5e5040', '#46392c'), ribedge=R('#f0e0b8', '#c9a96a'), ribedge_grey=R('#d8c8a0', '#a89870'), ribline=rgb('#2b1a0e'),
  trim=R('#2b1a0e', '#e8d4a2', '#a88850', '#2b1a0e'), flag=R('#b3261e', '#7a140e'), flagbar=rgb('#e8d4a2'), flagmark=rgb('#f6e8c4'), back=R('#a88850', '#8a6c3a'),
  bar=(0, 288, ['#4a2c18', '#573520', '#64402a', '#744c32'], 0), pagetex=(0, 240, ['#e4d2a4', '#e9d9ae', '#eddeb6', '#f1e3be'], 0))
# ---- D. Royal arcane: deep navy and violet cloth, silver and cyan trim, Endesga 32 colours ----
STYLES['d'] = dict(deep=rgb('#181425'), decor='gem', dec=rgb('#2ce8f5'),
  btn=dict(hi=rgb('#c0cbdc'), lo=rgb('#262b44'), fill=rgb('#3a4466'), fhi=rgb('#4c5a88'), lip=rgb('#2a3050')),
  gold=dict(hi=rgb('#ffffff'), lo=rgb('#124e89'), fill=rgb('#0099db'), fhi=rgb('#2ce8f5'), lip=rgb('#0e72ad'), liphi=rgb('#124e89'), dec=rgb('#ffffff')),
  off=dict(hi=rgb('#5a6988'), lo=rgb('#1f2238'), fill=rgb('#2e3350'), fhi=rgb('#353b5a'), lip=rgb('#232842')),
  panel=[rgb('#181425'), (rgb('#c0cbdc'), rgb('#5a6988')), rgb('#0099db'), rgb('#181425')], panelpip=R('#2ce8f5', '#0099db'),
  cards={'': (rgb('#5a6988'), rgb('#262b44')), '-r1': (rgb('#8b9bb4'), rgb('#3a4466')), '-r2': (rgb('#0099db'), rgb('#124e89')), '-r3': (rgb('#b55088'), rgb('#68386c')), '-r4': (rgb('#2ce8f5'), rgb('#0e72ad')), '-r5': (rgb('#e43b44'), rgb('#a22633')), '-chosen': (rgb('#2ce8f5'), rgb('#0099db'))},
  cardfill=rgb('#1f2238'), cardon=rgb('#124e89'), chip=(rgb('#5a6988'), rgb('#1a1c30')), chipon=(rgb('#2ce8f5'), rgb('#0e72ad')),
  rib=R('#68386c', '#8a4a90', '#4e2a54', '#3a1e40'), ribgrey=R('#3a4466', '#4c5a88', '#2a3050', '#1f2238'), ribedge=R('#c0cbdc', '#5a6988'), ribedge_grey=R('#8b9bb4', '#3a4466'), ribline=rgb('#181425'),
  trim=R('#181425', '#2ce8f5', '#0099db', '#181425'), flag=R('#68386c', '#4e2a54'), flagbar=rgb('#c0cbdc'), flagmark=rgb('#2ce8f5'), back=R('#3a4466', '#262b44'),
  bar=(112, 192, ['#1c1a38', '#22214a', '#2a2a5a', '#34346c'], 0), pagetex=(0, 384, ['#141226', '#181630', '#1c1b3a', '#25234c'], 0))
if __name__ == '__main__':
    for k, P in STYLES.items(): build(k, P)
    print('drew', ', '.join(STYLES))
