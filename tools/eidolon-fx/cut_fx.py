# EIDOLON-FX: cuts the strikes' effect strips (docs/notes/eidolon-fx.md) from the game's own painted spell sheets (art-source/spell-fx/,
# 256 px cells, one row a part in the order of src/art/fx/spells/index.json) into src/art/eidolons/fx/<name>.webp: one horizontal strip of
# CELL px frames each. Some are recoloured for their Eidolon (Aurelan's beam to gold, Vaelkhar's fire to black and violet) by mapping
# each pixel's brightness onto the Eidolon's ramp, keeping its alpha.
#   python3 tools/eidolon-fx/cut_fx.py
import json
from PIL import Image

SRC = 'art-source/spell-fx'
OUT = 'src/art/eidolons/fx'
CELL = 160
index = json.load(open('src/art/fx/spells/index.json'))
where = {}
for session, v in index.items():
    sheets = {}
    for key, p in v['parts'].items():
        sheet, part = key.split('.')
        sheets.setdefault(sheet, []).append((part, p[2]))
    for sheet, parts in sheets.items():
        for row, (part, n) in enumerate(parts):
            where[f'{sheet}.{part}'] = (f'{SRC}/{session}/{sheet}.png', row, n)

def frames(key, take=None):
    path, row, n = where[key]
    im = Image.open(path).convert('RGBA')
    out = [im.crop((i * 256, row * 256, (i + 1) * 256, (row + 1) * 256)) for i in range(n)]
    return out[:take] if take else out

def ramp(stops):
    """A brightness (0-255) to colour ramp from (at, (r, g, b)) stops."""
    lut = []
    for l in range(256):
        for (a, ca), (b, cb) in zip(stops, stops[1:]):
            if a <= l <= b:
                t = (l - a) / max(1, b - a)
                lut.append(tuple(round(ca[k] + (cb[k] - ca[k]) * t) for k in range(3)))
                break
    return lut

GOLD = ramp([(0, (90, 40, 0)), (90, (224, 150, 40)), (170, (255, 214, 106)), (230, (255, 246, 208)), (255, (255, 255, 255))])
VIOLET = ramp([(0, (10, 0, 20)), (70, (40, 8, 70)), (140, (120, 40, 210)), (200, (190, 120, 255)), (255, (240, 220, 255))])

def recolour(fr, lut):
    out = []
    for f in fr:
        px = f.load()
        g = Image.new('RGBA', f.size)
        q = g.load()
        for y in range(f.size[1]):
            for x in range(f.size[0]):
                r, gg, b, a = px[x, y]
                if a:
                    l = max(r, gg, b) * 0.6 + (r * 0.3 + gg * 0.59 + b * 0.11) * 0.4
                    c = lut[min(255, int(l))]
                    q[x, y] = (*c, a)
        out.append(g)
    return out

def save(name, fr):
    s = Image.new('RGBA', (CELL * len(fr), CELL))
    for i, f in enumerate(fr):
        s.paste(f.resize((CELL, CELL), Image.LANCZOS), (i * CELL, 0))
    s.save(f'{OUT}/{name}.webp', 'WEBP', quality=82, method=6)
    print(name, len(fr))

# (each Eidolon: `pillar`, what rises over each foe (stands on the ground); `burst`, the huge burst on the foes' middle; `after`, what
# lingers on their ground (loops); `extra`, the aftershocks' secondary bursts)
save('askel-pillar', frames('wall-fire.rise') + frames('wall-fire.break'))
save('askel-after', frames('wall-fire.stand'))
save('fire-burst', frames('ult-burst-fire.impact'))
save('nivra-pillar', frames('wall-ice.rise') + frames('wall-ice.break'))
save('nivra-after', frames('wall-ice.stand'))
save('ice-burst', frames('ult-burst-ice.impact'))
save('aurelan-pillar', recolour(frames('orbital-strike.impact'), GOLD))
save('aurelan-after', frames('wall-light.stand'))
save('aurelan-extra', frames('divine-smite.impact'))
save('light-burst', frames('ult-burst-light.impact'))
save('voltara-pillar', frames('storm-cloud.impact'))
save('voltara-extra', frames('lightning-storm.impact'))
save('lightning-burst', frames('ult-burst-lightning.impact'))
save('gorm-pillar', frames('wall-stone.rise') + frames('wall-stone.break'))
save('gorm-ring', frames('launch.impact'))
save('gorm-after', frames('fissure.ground'))
save('earth-burst', frames('ult-burst-earth.impact'))
save('vaelkhar-pillar', recolour(frames('wall-fire.rise') + frames('wall-fire.break'), VIOLET))
save('vaelkhar-after', recolour(frames('wall-fire.stand'), VIOLET))
save('vaelkhar-extra', frames('reign-of-terror.impact'))
save('dark-burst', frames('ult-burst-dark.impact'))

# (the shared impact: the flash and the shockwave ring along the ground, the one sheet generated for this (PixelLab's VFX artist,
# art-source/eidolons/fx/raw/impact-ring.png, 3 x 3 frames of 100 x 97 px, 8 used): cut into one strip, scaled by a whole 2 with nearest
# neighbour so its pixels stay crisp)
ring = Image.open('art-source/eidolons/fx/raw/impact-ring.png').convert('RGBA')
fw, fh = 100, 97
s = Image.new('RGBA', (fw * 8 * 2, fh * 2))
for i in range(8):
    f = ring.crop(((i % 3) * fw, (i // 3) * fh, (i % 3 + 1) * fw, (i // 3 + 1) * fh)).resize((fw * 2, fh * 2), Image.NEAREST)
    s.paste(f, (i * fw * 2, 0))
s.save(f'{OUT}/impact-ring.png', optimize=True)
print('impact-ring', 8)
