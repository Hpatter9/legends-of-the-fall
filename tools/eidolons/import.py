# The Eidolons' paintings into the game (EIDOLONS batch 4, docs/notes/eidolons.md). Re-runs from the sources:
#   python3 tools/eidolons/import.py
# Reads art-source/eidolons/dreamina-clean/<name>-figure.jpg and <name>-card.jpg (2048 px, a plain dark-grey ground, the generator marks
# already removed by clean_marks.py) and art-source/eidolons/horn/*.png, and writes src/art/eidolons/:
#   <name>-figure.webp  the figure cut out of its ground with a soft alpha matte, cropped to the figure, FIG_H px tall (the cinematic)
#   <name>-card.webp    the head and shoulders, CARD px square, the ground kept and darkened at the edges (the picker and the menus)
#   horn-<state>.webp   the War Horn's four paintings, trimmed to their common box, HORN px wide (they still line up exactly)
#   eid-circle.webp, eid-rift.webp   the calling's summoning circle and rift, the rows the cinematic plays (art-source/eidolons/call)
#
# The matte: the ground is a near-uniform grey with a soft gradient, so it is modelled first (the image with the figure masked out,
# blurred wide and filled in), then each pixel's difference from it gives a soft alpha (glow, smoke, frost and embers fade out rather
# than being cut). The figure's own dark parts (the hound's basalt, the dragon's scales) can be as dark as the ground, so everything
# the ground does not reach from the image's edge is held solid. The colour is un-mixed from the ground where the alpha is partial, so a
# glow edge keeps its own colour on any backdrop. A figure the painting cuts off at an edge fades out there.
import os
import numpy as np
import cv2
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
SRC = os.path.join(ROOT, 'art-source', 'eidolons', 'dreamina-clean')
HORN_SRC = os.path.join(ROOT, 'art-source', 'eidolons', 'horn')
CALL_SRC = os.path.join(ROOT, 'art-source', 'eidolons', 'call')
OUT = os.path.join(ROOT, 'src', 'art', 'eidolons')
NAMES = ['askel', 'nivra', 'aurelan', 'voltara', 'gorm', 'vaelkhar']
FIG_H = 900          # the figure's height in px (the cinematic draws it about 80% of a phone's height)
CARD = 256           # the card's side
HORN = 256           # the horn's width
# The head-and-shoulders box of each card (x0, y0, x1, y1 at 2048 px), picked by eye: Nivra's tight on her head and frost breath.
CARD_BOX = {
    'askel': (300, 100, 2048, 1848),
    'nivra': (650, 80, 1950, 1380),
    'aurelan': (250, 0, 1950, 1700),
    'voltara': (250, 100, 1850, 1700),
    'gorm': (300, 0, 1950, 1650),
    'vaelkhar': (250, 0, 1950, 1700),
}
# How far the alpha ramps over the colour difference from the ground (0..255 units), and how soft the solid core's edge is.
LO, HI = 7.0, 46.0
SOFT = 2.2


def ground_model(img, fg):
    """The grey ground under the figure: the pixels outside `fg`, blurred wide (normalised), so its gradient is kept."""
    small = cv2.resize(img, (256, 256), interpolation=cv2.INTER_AREA).astype(np.float32)
    m = cv2.resize((~fg).astype(np.float32), (256, 256), interpolation=cv2.INTER_AREA)
    m = (m > 0.99).astype(np.float32)
    num = cv2.GaussianBlur(small * m[..., None], (0, 0), 24)
    den = cv2.GaussianBlur(m, (0, 0), 24)[..., None]
    bg = num / np.maximum(den, 1e-4)
    return cv2.resize(bg, (img.shape[1], img.shape[0]), interpolation=cv2.INTER_CUBIC)


def matte(img):
    h, w = img.shape[:2]
    f = img.astype(np.float32)
    # a first guess at the ground: the median of the border
    border = np.concatenate([f[:8].reshape(-1, 3), f[:, :8].reshape(-1, 3), f[:, -8:].reshape(-1, 3)])
    g0 = np.median(border, axis=0)
    fg0 = np.linalg.norm(f - g0, axis=2) > 28
    fg0 = cv2.dilate(fg0.astype(np.uint8), np.ones((25, 25), np.uint8)).astype(bool)
    bg = ground_model(img, fg0)
    d = np.linalg.norm(f - bg, axis=2)
    d = cv2.GaussianBlur(d, (0, 0), 0.8)
    soft = np.clip((d - LO) / (HI - LO), 0, 1)
    soft = soft * soft * (3 - 2 * soft)
    # the solid core: everything but the ground. The ground is each sizeable patch near the ground's colour: the open ground the edges
    # reach, and the patches the figure closes round (inside a coil, between a wing and a body, behind a halo)
    ground = (d < LO + 5).astype(np.uint8)
    ground = cv2.morphologyEx(ground, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    n, lab, stats, _ = cv2.connectedComponentsWithStats(ground, 4)
    big = np.zeros(n, bool)
    big[1:] = stats[1:, cv2.CC_STAT_AREA] > 2500
    outside = big[lab]
    core = ~outside
    # (specks of noise in the ground are not figure: keep the core's big pieces, and every piece that glows on its own)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(core.astype(np.uint8), 8)
    keep = np.zeros(n, bool)
    for i in range(1, n):
        if stats[i, cv2.CC_STAT_AREA] > 1800:
            keep[i] = True
    core = keep[lab]
    core = cv2.morphologyEx(core.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    core = cv2.erode(core, np.ones((3, 3), np.uint8)).astype(np.float32)
    core = cv2.GaussianBlur(core, (0, 0), SOFT)
    a = np.maximum(soft, core)
    # (the ground's own patches keep only the soft alpha: nothing in them is held solid)
    a = np.where(outside, soft, a)
    # the colour un-mixed from the ground where the alpha is partial
    am = np.maximum(a, 0.02)[..., None]
    col = np.clip(bg + (f - bg) / am, 0, 255)
    col = np.where(a[..., None] > 0.98, f, col)
    return col.astype(np.uint8), a


def fade_edges(a, frac=0.06):
    """A figure the painting cuts off at an edge (a tail, a fog bank, the ground it stands on) fades out over that edge's last `frac`."""
    h, w = a.shape
    n = int(min(h, w) * frac)
    ramp = np.linspace(0, 1, n) ** 1.4
    if a[:3].max() > 0.2:
        a[:n] *= ramp[:, None]
    if a[-3:].max() > 0.2:
        a[-n:] *= ramp[::-1][:, None]
    if a[:, :3].max() > 0.2:
        a[:, :n] *= ramp[None, :]
    if a[:, -3:].max() > 0.2:
        a[:, -n:] *= ramp[::-1][None, :]
    return a


def crop_box(a, pad=24):
    ys, xs = np.where(a > 0.04)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    h, w = a.shape
    return max(0, x0 - pad), max(0, y0 - pad), min(w, x1 + pad), min(h, y1 + pad)


def figure(name):
    img = cv2.imread(os.path.join(SRC, f'{name}-figure.jpg'))[:, :, ::-1]
    col, a = matte(img)
    a = fade_edges(a)
    x0, y0, x1, y1 = crop_box(a)
    rgba = np.dstack([col, (a * 255).astype(np.uint8)])[y0:y1, x0:x1]
    im = Image.fromarray(rgba, 'RGBA')
    k = FIG_H / im.height
    im = im.resize((round(im.width * k), FIG_H), Image.LANCZOS)
    out = os.path.join(OUT, f'{name}-figure.webp')
    im.save(out, 'WEBP', quality=80, method=6, alpha_quality=85)
    return out


def card(name):
    img = Image.open(os.path.join(SRC, f'{name}-card.jpg')).convert('RGB')
    box = CARD_BOX[name]
    im = img.crop(box).resize((CARD, CARD), Image.LANCZOS)
    # (the ground darkened towards the edges, so the card sits on the game's dark menus)
    yy, xx = np.mgrid[0:CARD, 0:CARD] / (CARD - 1) - 0.5
    vig = np.clip(1.15 - 1.1 * np.sqrt(xx ** 2 + yy ** 2), 0.45, 1)
    arr = (np.asarray(im).astype(np.float32) * vig[..., None]).astype(np.uint8)
    out = os.path.join(OUT, f'{name}-card.webp')
    Image.fromarray(arr).save(out, 'WEBP', quality=82, method=6)
    return out


def horns():
    ims = {s: Image.open(os.path.join(HORN_SRC, f'horn-{s}.png')).convert('RGBA') for s in ['empty', 'light', 'ready', 'blast']}
    box = None
    for im in ims.values():
        b = im.getchannel('A').getbbox()
        box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
    outs = []
    for s, im in ims.items():
        c = im.crop(box)
        c = c.resize((HORN, round(c.height * HORN / c.width)), Image.LANCZOS)
        out = os.path.join(OUT, f'horn-{s}.webp')
        c.save(out, 'WEBP', quality=85, method=6, alpha_quality=90)
        outs.append(out)
    print('horn box', box)
    return outs


def calls():
    """The calling's sheets (art part 1): the summoning circle's turning frames (row 0: six of 256 px) and the rift opening (row 0: eight of
    256 px), the rows the cinematic plays, kept at their size."""
    outs = []
    for name, frames in (('eid-circle', 6), ('eid-rift', 8)):
        im = Image.open(os.path.join(CALL_SRC, f'{name}.png')).convert('RGBA').crop((0, 0, 256 * frames, 256))
        out = os.path.join(OUT, f'{name}.webp')
        im.save(out, 'WEBP', quality=88, method=6, alpha_quality=90)
        outs.append(out)
    return outs


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    total = 0
    for n in NAMES:
        for p in (figure(n), card(n)):
            total += os.path.getsize(p)
            print(os.path.relpath(p, ROOT), os.path.getsize(p) // 1024, 'KB')
    for p in horns() + calls():
        total += os.path.getsize(p)
        print(os.path.relpath(p, ROOT), os.path.getsize(p) // 1024, 'KB')
    print('total', total // 1024, 'KB')
