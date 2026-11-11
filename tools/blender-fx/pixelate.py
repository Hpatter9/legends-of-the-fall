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


def harden(pm):
    """Straight colour and a hard mask from a premultiplied frame."""
    a = pm[..., 3]
    rgb = pm[..., :3] / np.maximum(a[..., None], 1e-4)
    h, w = a.shape
    thr = LO + (HI - LO) * np.tile(BAYER, (h // 4 + 1, w // 4 + 1))[:h, :w]
    mask = a >= thr
    # (thin parts are a little darker: what the alpha said, said in the colour)
    rgb = rgb * (0.62 + 0.38 * np.clip(a / 0.85, 0, 1))[..., None]
    return np.clip(rgb, 0, 1), mask


def shared_palette(frames):
    """`COLOURS` colours that serve every frame: a median cut over all their solid pixels, then tightened."""
    px = np.concatenate([rgb[mask] for rgb, mask in frames]) if frames else np.zeros((0, 3))
    if len(px) == 0:
        return np.zeros((1, 3), dtype=np.float32)
    if len(px) > 200000:                                     # (a fixed stride, so the same frames give the same palette)
        px = px[:: len(px) // 200000 + 1]
    strip = Image.fromarray((px.reshape(1, -1, 3) * 255 + 0.5).astype(np.uint8), 'RGB')
    q = strip.quantize(colors=COLOURS, method=Image.Quantize.MEDIANCUT, kmeans=4, dither=Image.Dither.NONE)
    pal = np.array(q.getpalette()[: COLOURS * 3], dtype=np.float32).reshape(-1, 3) / 255
    used = sorted(set(np.asarray(q).ravel().tolist()))
    return pal[used]


def to_palette(rgb, mask, pal):
    d = ((rgb[..., None, :] - pal[None, None]) ** 2).sum(-1)
    out = np.zeros(rgb.shape[:2] + (4,), dtype=np.uint8)
    out[..., :3] = (pal[d.argmin(-1)] * 255 + 0.5).astype(np.uint8)
    out[..., 3] = mask * 255
    out[~mask] = 0
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
    pms = [load(os.path.join(src, f'{i:02d}.png')) for i in range(spec['frames'])]
    hard = [harden(pm) for pm in pms]
    pal = shared_palette(hard)
    frames = [to_palette(rgb, mask, pal) for rgb, mask in hard]
    glows = [soft(pm) for pm in pms] if spec.get('glow') else []
    return frames, glows, len(pal)
