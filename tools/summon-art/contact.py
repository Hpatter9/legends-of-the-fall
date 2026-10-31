#!/usr/bin/env python3
"""A review sheet of every unit a hero calls up in a fight (docs/notes/summon-art.md): each one's walk, attack, idle, hurt and
dead rows (four frames of each, a single picture where it has no rows), drawn at the size the fight draws it (times three),
beside its caller.

  python3 tools/summon-art/contact.py before   # the looks before SUMMON-ART -> docs/samples/summon-art-before.png
  python3 tools/summon-art/contact.py after    # the summons' own sheets      -> docs/samples/summon-art-after.png
"""
import json, os, sys
from PIL import Image, ImageDraw

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..'))
U = os.path.join(ROOT, 'src/art/units/')
LAYOUT = json.load(open(U + 'sheets.json'))
MODE = sys.argv[1] if len(sys.argv) > 1 else 'after'
K = 3
ANIMS = ['walk', 'attack', 'idle', 'hurt', 'dead']

# (label, caller sheet, caller scale, look: sheet name or picture path, drawn scale, tint, alpha)
BEFORE = [
    ('Wolf (Beastmaster)', 'hero_res_beastmaster', 0.520833, 'wolf_grey', 0.55, None, 1),
    ('Wolf, tier 3', 'hero_res_beastmaster', 0.520833, 'wolf_black', 0.55, None, 1),
    ('Dire Wolf', 'hero_res_beastmaster', 0.520833, 'wolf_black', 0.85, None, 1),
    ('Treant (Druid)', 'hero_res_druid', 0.520833, 'hero_res_treant', 0.5, None, 1),
    ('Wraith (Reaper): its own', 'hero_res_reaper', 0.520833, 'hk_ghost', 0.61, (0x9f, 0xd0, 0xff), 0.78),
    ('Wraith as a risen skeleton', 'hero_res_reaper', 0.520833, 'skeleton_warrior', 0.79, (0x9f, 0xd0, 0xff), 0.78),
    ('Standard (Commander)', 'hero_res_samurai_commander', 0.625, 'src/art/castle/banner.png', 0.67, None, 1),
    ('Decoy (Illusionist)', 'hero_res_illusionist', 0.520833, 'hero_res_illusionist', 0.4375, None, 1),
]
AFTER = [
    ('Wolf (Beastmaster)', 'hero_res_beastmaster', 0.520833, 'summon_wolf', 0.45, None, 1),
    ('Wolf, tier 3', 'hero_res_beastmaster', 0.520833, 'summon_wolf_white', 0.45, None, 1),
    ('Dire Wolf', 'hero_res_beastmaster', 0.520833, 'summon_direwolf', 0.64, None, 1),
    ('Treant (Druid)', 'hero_res_druid', 0.520833, 'cls_treant', 0.5, None, 1),
    ('Treant, tier 3', 'hero_res_druid', 0.520833, 'cls_treant_3', 0.5, None, 1),
    ('Wraith (Reaper)', 'hero_res_reaper', 0.520833, 'summon_wraith', 0.55, None, 0.88),
    ('Standard (Commander)', 'hero_res_samurai_commander', 0.625, 'summon_standard', 0.45, None, 1),
    ('Decoy (Illusionist)', 'hero_res_illusionist', 0.520833, 'summon_decoy', 0.52, None, 0.85),
]


def frames(look, anim):
    """Up to four frames of a row, or the one picture."""
    if look.endswith('.png'):
        return [Image.open(os.path.join(ROOT, look)).convert('RGBA')]
    l = LAYOUT[look]
    img = Image.open(U + look + '.png').convert('RGBA')
    row = anim if anim in l['rows'] else 'idle'
    r = l['rows'].index(row)
    n = l['counts'][row]
    idx = [round(i * (n - 1) / 3) for i in range(4)] if n > 4 else list(range(n))
    out = []
    for i in idx:
        x, y = (i % l['perRow']) * l['w'], (r + i // l['perRow']) * l['h']
        out.append(img.crop((x, y, x + l['w'], y + l['h'])))
    return out


def drawn(fr, scale, tint=None, alpha=1.0):
    """A frame at its fight size (times K), tinted and faded as the fight draws it."""
    w, h = max(1, round(fr.width * scale * K)), max(1, round(fr.height * scale * K))
    im = fr.resize((w, h), Image.NEAREST)
    if tint or alpha < 1:
        px = im.load()
        for y in range(h):
            for x in range(w):
                r, g, b, a = px[x, y]
                if tint:
                    r, g, b = r * tint[0] // 255, g * tint[1] // 255, b * tint[2] // 255
                px[x, y] = (r, g, b, int(a * alpha))
    return im.crop(im.getbbox()) if im.getbbox() else im


rows = BEFORE if MODE == 'before' else AFTER
CW, CH, LW = 180, 190, 260
STEP = 128
out = Image.new('RGBA', (LW + STEP * (2 + len(ANIMS) * 2), 60 + CH * len(rows)), (58, 74, 60, 255))
d = ImageDraw.Draw(out)
d.text((10, 10), f'Summons {MODE}: each row at fight size x{K}, the caller first; then walk, attack, idle, hurt, dead (two frames each)', fill=(255, 255, 255, 255))
for i, (label, caller, cs, look, scale, tint, alpha) in enumerate(rows):
    y0 = 50 + i * CH
    d.text((10, y0 + 10), label, fill=(255, 240, 200, 255))
    d.text((10, y0 + 26), look.split('/')[-1], fill=(190, 200, 190, 255))
    cells = [drawn(frames(caller, 'idle')[0], cs)]
    for a in ANIMS:
        fs = frames(look, a)
        cells += [drawn(f, scale, tint, alpha) for f in (fs[:1] + fs[-1:] if len(fs) > 1 else fs)]
    for j, c in enumerate(cells):
        x = LW + j * STEP + (STEP if j else 0)
        # (feet on the row's ground line, centred in its slot)
        out.alpha_composite(c, (x + (STEP - c.width) // 2, max(y0, y0 + CH - 12 - c.height)))
    d.line((LW, y0 + CH - 12, out.width, y0 + CH - 12), fill=(90, 110, 90, 255))
path = os.path.join(ROOT, f'docs/samples/summon-art-{MODE}.png')
out.convert('RGB').save(path)
print('wrote', path)
