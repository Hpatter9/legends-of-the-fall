# Dropout detector: blocks whose texture collapses (goes flat or changes wholesale) for 1-4 frames and then comes back.
import sys, os, json, glob
import numpy as np
from PIL import Image
B = 16
def load(d):
    fs = sorted(glob.glob(os.path.join(d, '*.png')))
    return np.stack([np.asarray(Image.open(f).convert('L'), dtype=np.float32) for f in fs]) if fs else None
def blocks(a):
    n, h, w = a.shape
    h2, w2 = h // B * B, w // B * B
    a = a[:, :h2, :w2].reshape(n, h2 // B, B, w2 // B, B).transpose(0, 1, 3, 2, 4).reshape(n, h2 // B, w2 // B, B * B)
    return a
def analyse(d):
    a = load(d)
    if a is None: return None
    bl = blocks(a)
    std = bl.std(-1); mean = bl.mean(-1)
    n = bl.shape[0]
    events = 0; cells = set(); frames = set()
    med = np.median(std, 0)
    for i in range(1, n - 1):
        for k in range(1, 5):
            j = i + k  # frames i..j-1 are the gap; i-1 before, j after
            if j >= n: break
            before, after = bl[i - 1], bl[j]
            gap = bl[i:j]
            # comes back: before and after nearly the same block
            same = np.abs(before - after).mean(-1) < 4
            textured = (std[i - 1] > 10) & (std[j] > 10)
            # gone: in every gap frame, the block is flat or far from before
            flat = (std[i:j] < np.maximum(3, 0.25 * std[i - 1])).all(0)
            far = (np.abs(gap - before).mean(-1) > 40).all(0)
            hit = same & textured & (flat | far)
            if hit.any():
                ys, xs = np.nonzero(hit)
                for y, x in zip(ys, xs):
                    cells.add((int(y), int(x))); frames.add(i)
                events += int(hit.sum())
    return {'events': events, 'cells': len(cells), 'frames': sorted(frames)}
root = sys.argv[1]
out = {}
for d in sorted(glob.glob(os.path.join(root, '*'))):
    if os.path.isdir(d):
        r = analyse(d)
        if r: out[os.path.basename(d)] = r
print(json.dumps(out, indent=0))
