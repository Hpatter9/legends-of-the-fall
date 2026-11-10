"""Derive effect masks and cloud cutouts from the approved poster; no repainting."""
from pathlib import Path
from PIL import Image

im = Image.open('src/art/loading/shattered-crown.webp').convert('RGB')
w, h = im.size
mask = Image.new('RGBA', im.size)
clouds = Image.new('RGBA', im.size)
for y in range(h):
    for x in range(w):
        r, g, b = im.getpixel((x, y))
        # Only the gold ink, never red banners, charcoal, ivory sky or the fracture.
        gold = min(1, max(0, (g - b - 22) / 28)) * min(1, max(0, (g - 80) / 55))
        gold *= min(1, max(0, ((r - b) / max(r, 1) - .35) / .1))
        if .18 < y / h < .50:
            mask.putpixel((x, y), (255, 255, 255, round(255 * gold)))
        # Lift the existing ivory cloud strokes, tapering to nothing before the mountains.
        fade = min(1, max(0, (y / h - .41) / .035), max(0, (.65 - y / h) / .065))
        ivory = min(1, max(0, (b - 130) / 55))
        if fade and ivory:
            clouds.putpixel((x, y), (r, g, b, round(255 * ivory * fade)))
out = Path('src/art/loading')
mask.save(out / 'crown-mask.png', optimize=True)
clouds.save(out / 'crown-clouds.webp', lossless=True, method=6)
print('Crown mask and cloud cutout:', im.size)
