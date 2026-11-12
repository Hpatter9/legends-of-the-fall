"""Turn an effect's rendered frames into pixel art.

Each frame is shrunk to the heroes' pixel density, its alpha is cut hard (thin parts keep a fixed dither, so a
mist stays a mist), and all the frames of the effect are cut to one shared palette of `COLOURS` colours. A light
effect also keeps a soft glow: a small blurred copy the game draws underneath, smoothed.
"""
import os

import numpy as np
from PIL import Image, ImageFilter

from lib import SUPER

COLOURS = 14
# An ultimate's sheet (hard cut, dark edge) keeps as many: its core is a large shape, and fewer colours left it a flat dome.
EDGED_COLOURS = 14
# The glow is kept at a quarter of the pixels' size: the game stretches it smoothly, which is what makes it soft.
GLOW_SHRINK = 4
# Alpha below LO is dropped and above HI is solid; between, the fixed 4x4 pattern decides (a dither, not a blur).
LO, HI = 0.3, 0.62
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], dtype=np.float32) / 16 + 1 / 32


def load(path):
    """A frame as premultiplied float RGBA, shrunk by `SUPER` with a box filter."""
    im = np.asarray(Image.open(path).convert('RGBA'), dtype=np.float32) / 255
    im[..., :3] *= im[..., 3:4]
    h, w = im.shape[0] // SUPER, im.shape[1] // SUPER
    return im[:h * SUPER, :w * SUPER].reshape(h, SUPER, w, SUPER, 4).mean(axis=(1, 3))


def harden(pm, dither=True):
    """Straight colour and a hard mask from a premultiplied frame. Without `dither` the cut is one hard line (an ultimate's sheet)."""
    a = pm[..., 3]
    rgb = pm[..., :3] / np.maximum(a[..., None], 1e-4)
    h, w = a.shape
    thr = LO + (HI - LO) * np.tile(BAYER, (h // 4 + 1, w // 4 + 1))[:h, :w] if dither else 0.42
    mask = a >= thr
    # (thin parts are a little darker: what the alpha said, said in the colour)
    rgb = rgb * (0.62 + 0.38 * np.clip(a / 0.85, 0, 1))[..., None]
    return np.clip(rgb, 0, 1), mask


def shared_palette(frames, colours=COLOURS):
    """`COLOURS` colours that serve every frame: a median cut over all their solid pixels, then tightened."""
    px = np.concatenate([rgb[mask] for rgb, mask in frames]) if frames else np.zeros((0, 3))
    if len(px) == 0:
        return np.zeros((1, 3), dtype=np.float32)
    if len(px) > 200000:                                     # (a fixed stride, so the same frames give the same palette)
        px = px[:: len(px) // 200000 + 1]
    strip = Image.fromarray((px.reshape(1, -1, 3) * 255 + 0.5).astype(np.uint8), 'RGB')
    q = strip.quantize(colors=colours, method=Image.Quantize.MEDIANCUT, kmeans=4, dither=Image.Dither.NONE)
    pal = np.array(q.getpalette()[: colours * 3], dtype=np.float32).reshape(-1, 3) / 255
    used = sorted(set(np.asarray(q).ravel().tolist()))
    return pal[used]


def to_palette(rgb, mask, pal):
    d = ((rgb[..., None, :] - pal[None, None]) ** 2).sum(-1)
    out = np.zeros(rgb.shape[:2] + (4,), dtype=np.uint8)
    out[..., :3] = (pal[d.argmin(-1)] * 255 + 0.5).astype(np.uint8)
    out[..., 3] = mask * 255
    out[~mask] = 0
    return out


def edged(frame, pal):
    """A frame with a one-pixel dark edge round everything solid (the palette's darkest colour, darkened): an ultimate's sheet plays over
    a darkened field and a bright effect with a hard dark edge reads against it."""
    solid = frame[..., 3] > 0
    grown = solid.copy()
    grown[1:, :] |= solid[:-1, :]
    grown[:-1, :] |= solid[1:, :]
    grown[:, 1:] |= solid[:, :-1]
    grown[:, :-1] |= solid[:, 1:]
    rim = grown & ~solid
    dark = (pal[np.argmin(pal.sum(axis=1))] * 0.45 * 255 + 0.5).astype(np.uint8)
    out = frame.copy()
    out[rim, :3] = dark
    out[rim, 3] = 255
    return out


def soft(pm):
    """The glow under a light effect: the frame blurred and shrunk, kept premultiplied-looking (bright where dense)."""
    im = Image.fromarray((np.clip(pm, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGBA').filter(ImageFilter.GaussianBlur(3.2))
    w, h = im.size
    small = im.resize((max(1, -(-w // GLOW_SHRINK)), max(1, -(-h // GLOW_SHRINK))), Image.Resampling.BOX)
    arr = np.asarray(small, dtype=np.float32) / 255
    # (un-premultiply: the game's textures are straight alpha)
    a = np.clip(arr[..., 3] * 1.6, 0, 1)
    rgb = np.clip(arr[..., :3] / np.maximum(arr[..., 3:4], 1e-3), 0, 1)
    return Image.fromarray((np.dstack([rgb, a]) * 255 + 0.5).astype(np.uint8), 'RGBA')


def pixelate(raw, spec):
    """The effect's frames as pixel art (RGBA arrays), and its glow frames (images; none for a hard effect)."""
    src = os.path.join(raw, spec['id'])
    n = spec['frames']
    first = spec.get('skip', 0)
    take = min(n - first, spec.get('take') or n - first)
    # (the frames kept: all of them, or `take` of them evenly spaced from the first kept (after `skip`) to the last)
    keep = range(first, n) if take == n - first else [first + round(i * (n - 1 - first) / (take - 1)) for i in range(take)]
    pms = [load(os.path.join(src, f'{i:02d}.png')) for i in keep]
    hard = [harden(pm, dither=not spec.get('edge')) for pm in pms]
    pal = shared_palette(hard, EDGED_COLOURS if spec.get('edge') else COLOURS)
    frames = [to_palette(rgb, mask, pal) for rgb, mask in hard]
    if spec.get('edge'):
        frames = [edged(f, pal) for f in frames]
    glows = [soft(pm) for pm in pms] if spec.get('glow') else []
    return frames, glows, len(pal)
