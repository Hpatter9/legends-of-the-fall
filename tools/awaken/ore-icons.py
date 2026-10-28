# The thirteen rift ores' icons (AWAKEN-MATS): one 32x32 icon of the Free Mining Pixel 32x32 Icons pack (Craftpix) a class,
# its shading mapped onto the class's aura colour (dark rim, the colour, a pale highlight), so every ore keeps the pack's
# drawing and reads as its class at a glance. Writes src/art/ui/ore/ore-<trait>.png and a preview sheet.
#   python3 tools/awaken/ore-icons.py [../chronos-assets]
import sys
from PIL import Image

ASSETS = sys.argv[1] if len(sys.argv) > 1 else '../chronos-assets'
SRC = f'{ASSETS}/Free-Mining-Pixel-32x32-Icons/1 Icons/Icon31_%02d.png'
# trait: (the pack's icon number, the aura colour from src/render/auraStyles.ts)
ORES = {
    'guardian': (20, 0xffd24a), 'bulwark': (11, 0xf0b860), 'blade': (31, 0xe0304a), 'marksman': (22, 0xdbe8f4),
    'gunner': (18, 0xf2d35a), 'caster': (21, 0xb06cff), 'arcanist': (24, 0x7a86ff), 'support': (28, 0xfff0b8),
    'beast': (34, 0xff6a2a), 'assassin': (12, 0x6a46a8), 'trickster': (29, 0xc6d2ff), 'warden': (36, 0x6cd060),
    'vanguard': (33, 0xffa040),
}

def rgb(c):
    return ((c >> 16) & 255, (c >> 8) & 255, c & 255)

def mix(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))

def ramp(colour, l):
    """Luminance 0..1 to a colour: a near-black rim, the colour at the middle, a pale highlight at the top."""
    dark = mix((14, 10, 22), colour, 0.18)
    light = mix(colour, (255, 255, 255), 0.6)
    return mix(dark, colour, l / 0.65) if l < 0.65 else mix(colour, light, (l - 0.65) / 0.35)

sheet = Image.new('RGBA', (13 * 72, 72), (32, 26, 40, 255))
for i, (trait, (n, colour)) in enumerate(ORES.items()):
    im = Image.open(SRC % n).convert('RGBA')
    px = im.load()
    lums = [0.2126 * r + 0.7152 * g + 0.0722 * b for (r, g, b, a) in (px[x, y] for y in range(im.height) for x in range(im.width)) if a]
    lo, hi = min(lums), max(lums)
    out = Image.new('RGBA', im.size)
    po = out.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if not a:
                continue
            l = (0.2126 * r + 0.7152 * g + 0.0722 * b - lo) / max(1, hi - lo)
            po[x, y] = (*ramp(rgb(colour), l), a)
    out.save(f'src/art/ui/ore/ore-{trait}.png')
    big = out.resize((64, 64), Image.NEAREST)
    sheet.paste(big, (i * 72 + 4, 4), big)
sheet.save('out/ore-icons-preview.png')
print('wrote', len(ORES), 'ores')
