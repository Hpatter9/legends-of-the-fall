# Lays the captures of tools/awaken/aura-places.mjs into the AWAKEN-002 phase B pictures:
#   docs/samples/awaken-auras-places.png         every place at 393x852, labelled
#   docs/samples/awaken-auras-sizes.png          the fight, dossier and camp at 360x780, 393x852 and 412x915
#   docs/samples/awaken-auras-closeups.png       close-ups of the aura in a few places
#   docs/samples/awaken-auras-calm.png           reduced motion and battery saver
import os
from PIL import Image, ImageDraw, ImageFont
BASE = 'out/aura-places'
BG = (24, 26, 32)
def font(size):
    for p in ['/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', '/usr/share/fonts/dejavu/DejaVuSans.ttf']:
        try: return ImageFont.truetype(p, size)
        except OSError: pass
    return ImageFont.load_default()
F, FB = font(24), font(34)
def grid(items, cols, w, h, title, out):
    rows = (len(items) + cols - 1) // cols
    img = Image.new('RGB', (cols * (w + 12) + 12, 70 + rows * (h + 44)), BG)
    d = ImageDraw.Draw(img)
    d.text((14, 16), title, fill=(255, 210, 74), font=FB)
    for i, (label, path) in enumerate(items):
        x, y = 12 + (i % cols) * (w + 12), 70 + (i // cols) * (h + 44)
        if os.path.exists(path):
            img.paste(Image.open(path).convert('RGB').resize((w, h), Image.LANCZOS), (x, y + 34))
        d.text((x, y + 4), label, fill=(230, 232, 240), font=F)
    img.save(out, optimize=True)
    print(out)
P = f'{BASE}/393x852'
places = [('Fight', 'fight'), ('Last Stand', 'stand'), ('Cinematic (awakening)', 'scene3'), ('Camp (Battle tab)', 'camp'),
          ('Tavern', 'tavern'), ('Roster', 'roster'), ('Dossier', 'dossier'), ('Rank up card', 'rankup'),
          ('Awakening burst', 'awaken-burst'), ('War council', 'party'), ('Summoning hall', 'hall'), ('Calamity map', 'calmap')]
grid([(l, f'{P}/{n}.png') for l, n in places], 6, 393, 852, 'AWAKEN-002 · class auras in the game (393x852)', 'docs/samples/awaken-auras-places.png')
grid([(f'{n} {s}', f'{BASE}/{s}/{n}.png') for n in ['fight', 'dossier', 'camp'] for s in ['360x780', '393x852', '412x915']], 9, 360, 780,
     'AWAKEN-002 · the three phone sizes', 'docs/samples/awaken-auras-sizes.png')
calm = [(f'{n} · reduced motion', f'{BASE}/393x852-reduced/{n}.png') for n in ['fight', 'dossier', 'camp', 'stand']] + \
       [(f'{n} · battery saver', f'{BASE}/393x852-saver/{n}.png') for n in ['fight', 'dossier', 'camp', 'stand']]
grid(calm, 8, 393, 852, 'AWAKEN-002 · reduced motion and battery saver (393x852)', 'docs/samples/awaken-auras-calm.png')
# close-ups: (label, capture, box in the 786x1704 capture)
CLOSE = [
    ('Fight', 'fight', (0, 780, 420, 1090)), ('Last Stand', 'stand', (100, 440, 786, 900)),
    ('Dossier', 'dossier', (60, 360, 740, 900)), ('Roster', 'roster', (16, 400, 770, 900)),
    ('Camp', 'camp', (100, 860, 700, 1220)), ('War council', 'party', (20, 150, 766, 700)),
    ('Rank up card (before, after)', 'rankup', (150, 520, 640, 780)), ('Cinematic', 'scene3', (180, 640, 786, 1240))]
tiles = []
for label, name, box in CLOSE:
    path = f'{P}/{name}.png'
    if not os.path.exists(path): continue
    im = Image.open(path).convert('RGB')
    b = box
    tiles.append((label, im.crop(b)))
W, H = 460, 400
img = Image.new('RGB', (4 * (W + 12) + 12, 70 + 2 * (H + 44)), BG)
d = ImageDraw.Draw(img)
d.text((14, 16), 'AWAKEN-002 · close-ups (393x852 at 2x)', fill=(255, 210, 74), font=FB)
for i, (label, t) in enumerate(tiles):
    x, y = 12 + (i % 4) * (W + 12), 70 + (i // 4) * (H + 44)
    k = min(W / t.width, H / t.height)
    t = t.resize((round(t.width * k), round(t.height * k)), Image.LANCZOS)
    img.paste(t, (x + (W - t.width) // 2, y + 34))
    d.text((x, y + 4), label, fill=(230, 232, 240), font=F)
img.save('docs/samples/awaken-auras-closeups.png', optimize=True)
print('docs/samples/awaken-auras-closeups.png')
