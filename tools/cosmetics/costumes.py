"""COSMETICS (docs/notes/cosmetics.md): Duchess's three bought costumes, cut from the round-2 art (art-source/round2/costume_*.png, the
owner's PR #666) into pieces at her own scale and laid, frame by frame, into two overlay sheets the game draws over her:

  src/art/duchess/costumes-walk.png    96 x 144: a row per costume (regalia, knight, lantern), her walking strip's two facings (left,
                                        right), 48 px each; drawn over her wherever her walking strip is (home, castle, camp, cutscenes)
  src/art/duchess/costumes-battle.png  512 x 1920: per costume, her battle sheet's grid (src/art/units/duchess_goat.png, 128 px cells),
                                        each frame dressed at her head and back found in that frame (the two fall frames left bare)

    python3 tools/cosmetics/costumes.py

The pieces: the regalia's crown on her skull and its cape over her back, the knight's plumed helm over her head, the lantern hung from
her horns. Every piece is drawn for her facing right and mirrored for left. Pure pixels: each piece is scaled down on its own palette and its alpha cut
hard (no soft halo), as her sprite is.
"""
import numpy as np
from PIL import Image

SRC = 'art-source/round2/'
OUT = 'src/art/duchess/'
COSTUMES = ['regalia', 'knight', 'lantern']


def shrink(im, size):
    """Scale a piece down without losing its colours: resized premultiplied (so the clear pixels round it do not darken its edges), then each
    pixel snapped to the nearest colour the painter used in it (so the crown keeps its gold and its highlight instead of going brown), and
    its alpha cut hard."""
    arr = np.asarray(im).astype(float)
    pm = np.concatenate([arr[..., :3] * arr[..., 3:] / 255, arr[..., 3:]], -1).astype('uint8')
    s = np.asarray(Image.fromarray(pm, 'RGBA').resize(size, Image.LANCZOS)).astype(float)
    a = s[..., 3:]
    rgb = np.clip(s[..., :3] / np.maximum(a, 1) * 255, 0, 255)
    pal = np.unique(arr[arr[..., 3] > 200][:, :3], axis=0)
    flat = rgb.reshape(-1, 3)
    snap = pal[((flat[:, None, :] - pal[None, :, :]) ** 2).sum(-1).argmin(1)].reshape(rgb.shape)
    return Image.fromarray(np.concatenate([snap, np.where(a >= 110, 255, 0)], -1).astype('uint8'), 'RGBA')


def piece(name, box, height):
    """A piece of a costume picture, cut by `box`, scaled to `height` px tall."""
    im = Image.open(SRC + f'costume_{name}.png').convert('RGBA').crop(box)
    im = im.crop(im.getbbox())
    w = max(1, round(im.width * height / im.height))
    return shrink(im, (w, height))


def pieces(k):
    """The pieces at scale `k` (1: her walking strip, about 2: her battle sheet), facing right."""
    return {
        'crown': piece('regalia', (40, 6, 62, 19), round(7 * k)),
        'cape': piece('regalia', (0, 19, 64, 64), round(13 * k)),
        'helm': piece('knight', (0, 0, 64, 64), round(17 * k)),
        'lantern': piece('lantern', (0, 0, 64, 64), round(20 * k)),
    }


def head_of(frame):
    """Her head in a frame facing right: the top of her horns, and the front of her face under them."""
    a = frame.getchannel('A')
    l, t, r, b = a.getbbox()
    mid = l + (r - l) * 0.45
    top = min(y for y in range(t, b) for x in range(int(mid), r) if a.getpixel((x, y)) > 100)
    front = max(x for y in range(top, min(b, top + round((r - l) * 0.5))) for x in range(l, r) if a.getpixel((x, y)) > 100)
    return top, front, l, b


def dress(frame, name, ps, k, ref):
    """Lay a costume's pieces on one frame facing right, anchored at its head (and its back, for the cape). `ref` is her walking frame's
    own head (top, front), whose numbers the anchors below were set on."""
    top, front, left, bottom = head_of(frame)
    out = Image.new('RGBA', frame.size)
    # (each anchor: a piece's top-left, as an offset from the head's horn-top and face-front, in walking-strip pixels, times k)
    at = lambda dx, dy: (round(front + dx * k), round(top + dy * k))
    if name == 'regalia':
        cape = ps['cape']
        # (the cape on her back, anchored to her body (her rump and her hooves), so it stays put when her head goes down to butt; its clasp at
        #  the top of her neck in the walking frame: 21 px in from her rump, 18 px above her hooves)
        out.alpha_composite(cape, (round(left + 21 * k) - cape.width, round(bottom - 18 * k)))
        crown = ps['crown']
        out.alpha_composite(crown, at(-12, -1))
    elif name == 'knight':
        out.alpha_composite(ps['helm'], at(-13, -2))
    elif name == 'lantern':
        out.alpha_composite(ps['lantern'], at(-21, 0))
    return out


def mirror(im):
    return im.transpose(Image.FLIP_LEFT_RIGHT)


walk = Image.open(OUT + 'goat.png').convert('RGBA')
ref = head_of(walk.crop((3 * 48, 0, 4 * 48, 48)))
p1 = pieces(1)
sheet = Image.new('RGBA', (96, 48 * len(COSTUMES)))
for r, name in enumerate(COSTUMES):
    right = dress(walk.crop((3 * 48, 0, 4 * 48, 48)), name, p1, 1, ref)
    sheet.alpha_composite(mirror(right), (0, r * 48))
    sheet.alpha_composite(right, (48, r * 48))
sheet.save(OUT + 'costumes-walk.png')

battle = Image.open('src/art/units/duchess_goat.png').convert('RGBA')
k = 2.0
p2 = pieces(k)
FALLEN = {(4, 1), (4, 2)}
big = Image.new('RGBA', (battle.width, battle.height * len(COSTUMES)))
for c, name in enumerate(COSTUMES):
    for row in range(battle.height // 128):
        for col in range(battle.width // 128):
            cell = battle.crop((col * 128, row * 128, col * 128 + 128, row * 128 + 128))
            if not cell.getbbox() or (row, col) in FALLEN:
                continue
            big.alpha_composite(dress(cell, name, p2, k, ref), (col * 128, c * battle.height + row * 128))
big.save(OUT + 'costumes-battle.png', optimize=True)
print('walk head', ref)
