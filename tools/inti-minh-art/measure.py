#!/usr/bin/env python3
"""INTI-MINH-ART: numbers behind the contact sheet, for each hero's first idle frame (the sheet the game bundles).

  python3 tools/inti-minh-art/measure.py

sat      mean saturation of the figure's pixels (0-1): how vivid the colours are
spread   the spread (standard deviation) of lightness (0-255): how deep the shading goes
edge     mean lightness of the silhouette's rim pixels (0-255): low is a strong dark outline
fill     share of the frame's box the figure covers: low is a thin, weak silhouette
px       the figure's pixels at the game's scale: how much of the screen the hero takes
Sorted by px, smallest first. The numbers only back the eye up: no one of them finds the odd ones out alone.
"""
import colorsys, sys
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parent))
from contact import heroes, idle

rows = []
for hid, name, sheet, scale in heroes():
    a = np.array(idle(sheet)).astype(float)
    on = a[..., 3] > 0
    rgb = a[..., :3][on] / 255
    mx, mn = rgb.max(1), rgb.min(1)
    sat = float(np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0).mean())
    lum = a[..., :3] @ np.array([0.299, 0.587, 0.114])
    pad = np.pad(on, 1)
    rim = on & ~(pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:])
    rows.append((hid, name, sat, float(lum[on].std()), float(lum[rim].mean()), float(on.mean()), int(on.sum() * scale * scale)))
print(f"{'hero':16}{'name':10}{'sat':>6}{'spread':>8}{'edge':>6}{'fill':>6}{'px':>6}")
for r in sorted(rows, key=lambda r: r[6]):
    print(f'{r[0]:16}{r[1]:10}{r[2]:6.2f}{r[3]:8.1f}{r[4]:6.0f}{r[5]:6.2f}{r[6]:6d}')
