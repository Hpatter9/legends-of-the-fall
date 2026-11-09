#!/usr/bin/env python3
"""Cuts the duel ring (art-source/expansion/duel-ring.png, PR #464) into its standing stones, so the board can stand each one on its own
tile at that tile's height (the board is not flat; one picture laid over it would float over the pits and sink into the hills).

Each stone is cut out (its alpha made hard: in or out), shrunk so the ring of feet is the 5x5 ring's edge on the board (a tile is 64 px
across), and packed into one strip, src/art/duel/ring-stones.png. src/art/duel/ring-stones.json gives each stone's box in the strip, its
foot (the bottom middle, in the strip) and where its foot stands, as (du, dv) from the ring's middle in tiles (the ring's edge is at 2.5).
Usage: python3 tools/expansion/duel-ring.py"""
import collections, json, os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', '..', 'art-source', 'expansion', 'duel-ring.png')
OUT = os.path.join(HERE, '..', '..', 'src', 'art', 'duel')
# The board's tile is 64 px across; the ring's edge is 2.5 tiles out from its middle, so the ring of feet is 5 tiles across.
TW, EDGE = 64, 2.5
# The stones at the painting's own size come out low and thin beside the board's boulders and graves; they are drawn half as big again
# (their feet stay where they were).
STONE = 1.5

im = Image.open(SRC).convert('RGBA')
W, H = im.size
px = im.load()
solid = [[px[x, y][3] >= 128 for x in range(W)] for y in range(H)]

# Label the stones (8-connected); crumbs (moss and pebbles cut off by the hard alpha) join the nearest stone.
lab = [[0] * W for _ in range(H)]
parts = []
for y in range(H):
    for x in range(W):
        if solid[y][x] and not lab[y][x]:
            n = len(parts) + 1
            lab[y][x] = n
            q = collections.deque([(x, y)])
            pts = []
            while q:
                cx, cy = q.popleft()
                pts.append((cx, cy))
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        nx, ny = cx + dx, cy + dy
                        if 0 <= nx < W and 0 <= ny < H and solid[ny][nx] and not lab[ny][nx]:
                            lab[ny][nx] = n
                            q.append((nx, ny))
            parts.append(pts)
stones = [p for p in parts if len(p) >= 300]
crumbs = [p for p in parts if len(p) < 300]
mid = lambda p: (sum(x for x, _ in p) / len(p), sum(y for _, y in p) / len(p))
for c in crumbs:
    cx, cy = mid(c)
    best = min(stones, key=lambda s: min((x - cx) ** 2 + (y - cy) ** 2 for x, y in s[:: max(1, len(s) // 200)]))
    best.extend(c)

def box(p):
    xs = [x for x, _ in p]
    ys = [y for _, y in p]
    return min(xs), min(ys), max(xs) + 1, max(ys) + 1

# Each stone's foot: the bottom middle of its box. The ring of feet is a diamond; its middle and its half-widths come from them.
feet = []
for s in stones:
    x0, y0, x1, y1 = box(s)
    feet.append(((x0 + x1) / 2, y1 - 3))
fx = [f[0] for f in feet]
fy = [f[1] for f in feet]
cx, cy = (min(fx) + max(fx)) / 2, (min(fy) + max(fy)) / 2
hw, hh = (max(fx) - min(fx)) / 2, (max(fy) - min(fy)) / 2
# Shrink so the diamond of feet is 2 * EDGE tiles across on the board.
k = (2 * EDGE * TW / 2) / hw

out = []
x = 0
cut = []
for s, (fxx, fyy) in zip(stones, feet):
    x0, y0, x1, y1 = box(s)
    pic = Image.new('RGBA', (x1 - x0, y1 - y0))
    mine = set(s)
    for (sx, sy) in mine:
        r, g, b, a = px[sx, sy]
        pic.putpixel((sx - x0, sy - y0), (r, g, b, 255))
    w, h = max(1, round(pic.width * k * STONE)), max(1, round(pic.height * k * STONE))
    small = pic.resize((w, h), Image.LANCZOS)
    r, g, b, a = small.split()
    small = Image.merge('RGBA', (r, g, b, a.point(lambda v: 255 if v >= 128 else 0)))
    # Screen x is (du - dv), screen y is (du + dv); a corner of the diamond is 2 * EDGE out on one of them.
    a_, b_ = (fxx - cx) / hw, (fyy - cy) / hh
    s_, d_ = a_ * 2 * EDGE, b_ * 2 * EDGE
    du, dv = (d_ + s_) / 2, (d_ - s_) / 2
    cut.append((small, (fxx - x0) * k * STONE, (fyy - y0) * k * STONE, du, dv))

strip_w = sum(c[0].width + 2 for c in cut)
strip_h = max(c[0].height for c in cut)
strip = Image.new('RGBA', (strip_w, strip_h))
for small, footx, footy, du, dv in cut:
    strip.paste(small, (x, 0))
    out.append({'x': x, 'y': 0, 'w': small.width, 'h': small.height, 'fx': round(footx, 1), 'fy': round(footy, 1), 'du': round(du, 2), 'dv': round(dv, 2)})
    x += small.width + 2
os.makedirs(OUT, exist_ok=True)
strip.save(os.path.join(OUT, 'ring-stones.png'))
with open(os.path.join(OUT, 'ring-stones.json'), 'w') as f:
    json.dump(out, f, indent=1)
print(len(out), 'stones,', f'{strip_w}x{strip_h}', 'shrunk by', round(k * STONE, 3))
