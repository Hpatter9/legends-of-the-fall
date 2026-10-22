"""Mock-ups of the castle courtyard, upright 393x852 (top bar and tab bar from a real screenshot), from pack art.
Usage: mock.py <scratch dir with frame_top.png frame_bot.png gold_1.png gold_2.png> <out dir>
A: side view. Craftpix 'Medieval Field Work' platformer pieces, shrunk by a whole number and put into a small palette so they sit
   with the pixel heroes; gold piles are the only generated pieces. Drawn at scale 2 in a 196-wide yard.
B: 3/4 view. Chronos's Craftpix village houses, tents, props and ground, at their own pixel size (scale 1)."""
import json, os, sys
from PIL import Image

SCR, OUT = sys.argv[1], sys.argv[2]
FW = '/home/user/chronos-assets/assets/craftpix-net-867123-free-medieval-field-work-2d-tileset-for-platformer/PNG/'
LT = '/home/user/hpatter9/little-town/src/renderer/art/'
UNITS = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'src', 'art', 'units')
K = 7  # the platformer pieces are drawn at 1/7 (a door comes out 18 x 37 pixels, the size of a hero)


def fw(group, name):
    return Image.open(f'{FW}{group}/Cartoon_Medieval_Field_Work_Level_Set_{group} - {name}.png').convert('RGBA')


def shrink(im, k=K, colors=40):
    sm = im.resize((max(1, im.width // k), max(1, im.height // k)), Image.BOX)
    a = sm.getchannel('A').point(lambda v: 255 if v > 110 else 0)
    q = sm.convert('RGB').quantize(colors, method=Image.MEDIANCUT, dither=Image.NONE).convert('RGBA')
    q.putalpha(a)
    return q


def canvas(w, h):
    return Image.new('RGBA', (w, h), (0, 0, 0, 0))


def put(cv, im, x, y):
    cv.alpha_composite(im, (int(x), int(y)))


def flip(im):
    return im.transpose(Image.FLIP_LEFT_RIGHT)


# ---------- heroes (idle frame of each sheet, the way the tavern draws them) ----------
SHEETS = json.load(open(f'{UNITS}/sheets.json'))
HERO = {'knight': ('knight_1', 0.74), 'samurai': ('samurai', 0.8), 'kunoichi': ('kunoichi', 0.7), 'archer': ('samurai_archer', 0.6), 'wizard': ('fire_wizard', 0.79)}


def hero(kind, face=1):
    sheet, sc = HERO[kind]
    lay = SHEETS[sheet]
    img = Image.open(f'{UNITS}/{sheet}.png').convert('RGBA')
    r = lay['rows'].index('idle')
    fr = img.crop((0, r * lay['h'], lay['w'], (r + 1) * lay['h']))
    k = min(54, max(34, lay['figure'] * sc * 0.9)) / lay['figure']
    fr = fr.resize((max(1, round(lay['w'] * k)), max(1, round(lay['h'] * k))), Image.NEAREST)
    if (face == 1) != lay.get('facesRight', True):
        fr = flip(fr)
    return fr


def stand(cv, im, cx, foot):
    put(cv, im, cx - im.width // 2, foot - im.height)


def shadow(cv, cx, foot, w):
    d = Image.new('RGBA', (w, 3), (20, 14, 6, 0))
    for x in range(w):
        for y in range(3):
            if (y == 1) or (1 <= x < w - 1):
                d.putpixel((x, y), (20, 14, 6, 90))
    put(cv, d, cx - w // 2, foot - 1)


# ================= A: side view =================
def house(spec):
    """Compose one building at full size (128 px to the tile) then shrink it. Returns (image, door x)."""
    wall, storeys, wide, roof = spec['wall'], spec.get('storeys', 1), spec.get('wide', True), spec.get('roof', 'A')
    W = 576 if wide else 256
    pad = 140
    H = storeys * 320 + 320
    cv = canvas(704 + 2 * pad, H + 400)
    gy = H + 380  # ground line
    x0 = pad + (704 - W) // 2
    parts = ['01', '02', '03'] if wide else ['01', '03']
    for s in range(storeys):
        top = gy - 320 * (s + 1)
        x = x0
        for p in parts:
            w = fw('Building', f'Wall {wall} {p}')
            put(cv, w, x, top)
            x += w.width
        if s:
            put(cv, fw('Building', 'Pillar 01').resize((W, 64)), x0, top + 288)
            if wide:
                for wx in (x0 + 70, x0 + W - 200, x0 + W // 2 - 64):
                    put(cv, fw('Building', spec.get('window', 'Window 02')), wx, top + 90)
    roof_y = gy - 320 * storeys - 118
    if spec.get('chimney') and wide:
        put(cv, fw('Building', spec['chimney']), x0 + W - 200, roof_y - 40)
    if roof in ('A', 'B') and wide:
        put(cv, fw('Building', f'Roof {roof} 05'), x0 - 64, roof_y)
        put(cv, fw('Building', f'Roof {roof} 04'), x0 - 64 + 352 - 20, roof_y)
    else:
        put(cv, fw('Building', f'Roof {roof} 05' if spec.get('lean', 'L') == 'L' else f'Roof {roof} 04'), x0 - 40, roof_y)
    door = fw('Building', spec.get('door', 'Door 02')[0:] if False else spec.get('door', 'Door 02'))
    dx = x0 + (W - door.width) // 2 - (0 if wide else 0)
    put(cv, door, dx, gy - door.height)
    if spec.get('windows', True):
        for wx in ([x0 + 70, x0 + W - 200] if wide else []):
            put(cv, fw('Building', spec.get('window', 'Window 02')), wx, gy - 300)
    if spec.get('canopy'):
        put(cv, fw('Building', spec['canopy']), dx - 64, gy - 300)
    for bx, name in spec.get('banners', []):
        put(cv, fw('Environment', name), x0 + bx, gy - 330)
    for bx, name, by in spec.get('stuff', []):
        put(cv, fw('Environment', name), x0 + bx, gy - by)
    bb = cv.getchannel('A').getbbox()
    im = cv.crop((bb[0], bb[1], bb[2], gy))
    return shrink(im), (dx - bb[0] + door.width // 2) // K


def shed(kind):
    """A first small building: an open timber shed under a plank roof, with something of its trade in it."""
    cv = canvas(420, 420)
    gy = 400
    put(cv, fw('Building', 'Pillar 02').resize((40, 300)), 78, gy - 300)
    put(cv, fw('Building', 'Pillar 02').resize((40, 300)), 300, gy - 300)
    put(cv, fw('Building', 'Canopy 01'), 82, gy - 380)
    if kind == 'treasury':
        put(cv, fw('Environment', 'Wooden Crate'), 190, gy - 110)
    elif kind == 'barracks':
        put(cv, fw('Environment', 'Hay 01'), 130, gy - 140)
    else:
        put(cv, fw('Environment', 'Barrel'), 140, gy - 120)
        put(cv, fw('Building', 'Decor Tools 01').resize((100, 100)), 230, gy - 130)
    bb = cv.getchannel('A').getbbox()
    return shrink(cv.crop((bb[0], bb[1], bb[2], gy)))


def scaffold(stage_wide=True):
    cv = canvas(520, 520)
    gy = 500
    for x in (20, 200, 420):
        put(cv, fw('Building', 'Pillar 02'), x, gy - 320)
    put(cv, fw('Building', 'Pillar 01').resize((420, 64)), 40, gy - 330)
    put(cv, fw('Building', 'Pillar 01').resize((420, 64)), 40, gy - 180)
    put(cv, fw('Building', 'Pillar 03'), 20, gy - 280)
    put(cv, fw('Building', 'Ladder 02').rotate(90, expand=True).resize((64, 352)), 300, gy - 352)
    put(cv, fw('Environment', 'Rock 01'), 120, gy - 100)
    put(cv, fw('Environment', 'Wooden Crate'), 350, gy - 110)
    bb = cv.getchannel('A').getbbox()
    return shrink(cv.crop((bb[0], bb[1], bb[2], gy)))


def tower(storeys):
    """A stone tower from the pack's brick pieces."""
    cv = canvas(480, 160 * (storeys + 4) + 200)
    gy = cv.height - 20
    brick = fw('Building', 'Roof A 02')  # 320 x 160: a wood cap over dark brick
    body = brick.crop((0, 48, 320, 160))
    x0 = 80
    top = gy
    for i in range(storeys):
        top -= 112 * 2
        for j in range(2):
            put(cv, body.resize((320, 112)), x0, gy - 112 * (2 * i + j + 1))
    top = gy - 224 * storeys
    # crenellated cap and the balcony roof
    put(cv, brick.crop((0, 0, 320, 48)).resize((384, 56)), x0 - 32, top - 40)
    put(cv, fw('Building', 'Decor Roof 01').resize((260, 260)), x0 + 30, top - 250)
    # arched windows up the tower
    for i in range(storeys):
        put(cv, fw('Building', 'Stone Window 02').resize((120, 120)), x0 + 100, gy - 224 * (i + 1) + 60)
    put(cv, fw('Building', 'Door 03').resize((90, 180)), x0 + 115, gy - 180)
    if storeys >= 3:
        put(cv, fw('Environment', 'Banner 02'), x0 - 30, gy - 600)
    bb = cv.getchannel('A').getbbox()
    return shrink(cv.crop((bb[0], bb[1], bb[2], gy)))


def dummy():
    cv = canvas(260, 400)
    put(cv, fw('Building', 'Pillar 02').resize((40, 300)), 110, 80)
    put(cv, fw('Building', 'Pillar 01').resize((200, 40)), 30, 130)
    put(cv, fw('Environment', 'Barrel').resize((110, 110)), 75, 120)
    put(cv, fw('Environment', 'Bucket').resize((70, 70)), 95, 60)
    bb = cv.getchannel('A').getbbox()
    return shrink(cv.crop((bb[0], bb[1], bb[2], 380)))


def rubble():
    cv = canvas(520, 300)
    for name, x, y in (('Rock 01', 20, 120), ('Rock 02', 190, 90), ('Rock 03', 330, 190), ('Rock 05', 120, 215), ('Rock 06', 270, 210)):
        put(cv, fw('Environment', name), x, y)
    put(cv, fw('Building', 'Pillar 01').resize((200, 40)), 150, 230)
    bb = cv.getchannel('A').getbbox()
    return shrink(cv.crop((bb[0], bb[1], bb[2], 300)))


def a_stage(id_, st):
    """The picture of a building at one of its four looks, put together from the platformer pieces (the gold piles are generated)."""
    if id_ == 'mageTower':
        return rubble() if st == 0 else tower(st)
    if st == 0:
        return scaffold()
    wall = {'treasury': 'B', 'barracks': 'C', 'armoury': 'A'}[id_]
    roof = {'treasury': 'A', 'barracks': 'B', 'armoury': 'A'}[id_]
    chim = {'treasury': 'Chimney 01', 'barracks': None, 'armoury': 'Chimney 02'}[id_]
    door = {'treasury': 'Wide Door 02', 'barracks': 'Wide Door 01', 'armoury': 'Door 04'}[id_]
    if st == 1:
        im = shed(id_)
    elif st == 2:
        im, _ = house({'wall': wall, 'roof': roof, 'door': door, 'chimney': chim, 'canopy': 'Canopy 02' if id_ != 'barracks' else None, 'banners': [(30, 'Banner 03'), (400, 'Banner 03')] if id_ == 'barracks' else []})
    else:
        im, _ = house({'wall': wall, 'storeys': 2, 'roof': roof, 'door': door, 'chimney': chim, 'canopy': 'Canopy 02', 'banners': [(30, 'Banner 03'), (400, 'Banner 02' if id_ == 'armoury' else 'Banner 03')], 'stuff': [(470, 'Hay 02', 0)] if id_ == 'barracks' else []})
    return im


def a_extras(sc, id_, st, cx, foot):
    """What stands beside a building at that look: gold at the treasury, a dummy at the barracks."""
    if id_ == 'treasury' and st >= 1:
        g1 = gold(1 if st < 3 else 2)
        put(sc, g1, cx - g1.width // 2 - 8, foot - g1.height + 4)
        if st >= 2:
            put(sc, gold(2 if st < 3 else 1), cx + 14, foot - gold(2).height + 4)
        if st >= 3:
            put(sc, gold(1), cx - 46, foot - gold(1).height + 4)
    if id_ == 'barracks' and st >= 2:
        d = dummy()
        stand(sc, d, cx + 38, foot + 7)


def gold(n):
    g = Image.open(f'{SCR}/gold_{n}.png').convert('RGBA')
    return g.crop(g.getchannel('A').getbbox())


def glow(sc, cx, cy, rgb, r):
    for y in range(-r, r + 1):
        for x in range(-r, r + 1):
            d = (x * x + y * y) ** 0.5
            if d < r and (x + y) % 2 == 0:
                px_ = sc.getpixel((cx + x, cy + y))
                a = (1 - d / r) * 0.55
                sc.putpixel((cx + x, cy + y), tuple(int(px_[i] * (1 - a) + rgb[i] * a) for i in range(3)) + (255,))


def strip_a(path):
    ids = ['treasury', 'barracks', 'armoury', 'mageTower']
    names = {'treasury': 'Treasury', 'barracks': 'Barracks', 'armoury': 'Armoury', 'mageTower': 'Mage Tower'}
    from PIL import ImageDraw, ImageFont
    f = ImageFont.load_default(size=14)
    cols, rows = 4, 4
    cw, rh = 250, 330
    sheet = Image.new('RGBA', (cw * cols + 120, rh * rows), (110, 150, 200, 255))
    d = ImageDraw.Draw(sheet)
    for r, id_ in enumerate(ids):
        d.text((8, r * rh + 8), names[id_], fill=(20, 10, 4), font=f)
        for st in range(4):
            sc = canvas(cw // 2, rh // 2)
            foot = rh // 2 - 14
            im = a_stage(id_, st)
            stand(sc, im, cw // 4, foot)
            a_extras(sc, id_, st, cw // 4, foot)
            big = sc.resize((cw, rh), Image.NEAREST)
            sheet.alpha_composite(big, (120 + st * cw, r * rh))
            d.text((126 + st * cw, r * rh + 4), f'look {st}', fill=(20, 10, 4), font=f)
    sheet.convert('RGB').save(path)


def mock_a(level='mid'):
    W, H, S = 196, 328, 2
    sc = canvas(W, H)
    # sky and mountains from the pack's background layer
    bg = fw('Background', 'Layer 00') if False else Image.open(f'{FW}Background/Cartoon_Medieval_Field_Work_Level_Set_Background - Layer 00.png').convert('RGBA')
    bg = bg.resize((int(bg.width * 150 / bg.height), 150), Image.BOX)
    bg = bg.crop(((bg.width - W) // 2, 0, (bg.width - W) // 2 + W, 150))
    q = bg.convert('RGB').quantize(28, method=Image.MEDIANCUT, dither=Image.NONE).convert('RGBA')
    put(sc, q, 0, 0)
    for y in range(150, 205):
        for x in range(W):
            sc.putpixel((x, y), q.getpixel((x, 149)))
    # the far wall with its gate
    brick = fw('Building', 'Roof A 02')
    wall_row = shrink(brick.crop((0, 40, 320, 160)).resize((320, 112)))
    wy = 98
    for x in range(0, W, wall_row.width):
        put(sc, wall_row, x, wy)
        put(sc, wall_row, x, wy + wall_row.height - 2)
    cap = shrink(brick.crop((0, 0, 320, 44)))
    for x in range(0, W, cap.width):
        put(sc, cap, x, wy - cap.height + 2)
    gate = shrink(fw('Building', 'Wide Door 04'))
    put(sc, gate, W // 2 - gate.width // 2, wy + 2 * wall_row.height - gate.height - 2)
    # terrace (back row stands on it) and the lower yard: grass-topped dirt tiles from the platformer set
    from PIL import ImageEnhance

    def tile(n):
        t = shrink(fw('Platformer', f'Ground {n}'))
        rgb = ImageEnhance.Brightness(t.convert('RGB')).enhance(1.6)
        out = rgb.convert('RGBA')
        out.putalpha(t.getchannel('A'))
        return out

    t_dirt = tile('06')
    ty, ly = 146, 234
    for base, bottom, top_n in ((ty, ly, '02'), (ly, H, '11')):
        t_top = tile(top_n)
        for x in range(0, W + 18, t_top.width):
            put(sc, t_top, x, base)
            for y in range(base + t_top.height - 2, bottom, t_dirt.height):
                put(sc, t_dirt, x, y)
    foot_back, foot_front = ty + 4, ly + 4
    # back row: the tower and the treasury
    tw = a_stage('mageTower', 2)
    stand(sc, tw, 42, foot_back + 2)
    tr = a_stage('treasury', 2)
    stand(sc, tr, 142, foot_back + 2)
    a_extras(sc, 'treasury', 2, 142, foot_back + 2)
    br = a_stage('barracks', 2)
    stand(sc, br, 50, foot_front)
    ar = a_stage('armoury', 2)
    stand(sc, ar, 150, foot_front)
    a_extras(sc, 'barracks', 2, 62, foot_front)
    # props
    for sprite, x, foot, k in [('Tree 01', 188, foot_back + 2, 7), ('Hay 02', 6, foot_front + 2, 7), ('Cart 02', 190, foot_front + 30, 7)]:
        im = shrink(fw('Environment', sprite), k)
        stand(sc, im, x, foot)
    # heroes on the lower yard
    for kind, x, foot, face in [('knight', 34, 276, 1), ('archer', 88, 296, -1), ('wizard', 122, 272, 1), ('kunoichi', 160, 292, -1), ('samurai', 60, 316, 1)]:
        shadow(sc, x, foot, 18)
        stand(sc, hero(kind, face), x, foot)
    glow(sc, 42, foot_back - 52, (90, 220, 255), 14)
    glow(sc, 42, foot_back - 28, (90, 220, 255), 10)
    tags = []
    for name, lv, cx, top in (('Mage Tower', '3/4', 42, foot_back - tw.height), ('Treasury', '3/5', 142, foot_back - tr.height), ('Barracks', '3/5', 50, foot_front - br.height), ('Armoury', '3/5', 150, foot_front - ar.height)):
        tags.append((name, lv, cx, top - 3))
    return sc, S, tags


def draw_tags(page, tags, S, x_off, y_off):
    from PIL import ImageDraw, ImageFont
    f1 = ImageFont.load_default(size=13)
    f2 = ImageFont.load_default(size=10)
    d = ImageDraw.Draw(page)
    for name, lv, cx, bottom in tags:
        w = int(max(d.textlength(name, font=f1), d.textlength('level ' + lv, font=f2))) + 16
        x = x_off + cx * S - w // 2
        x = max(2, min(391 - w, x))
        y = y_off + bottom * S - 32
        d.rounded_rectangle((x, y, x + w, y + 32), 6, fill=(26, 13, 7), outline=(184, 118, 30), width=2)
        d.text((x + w // 2, y + 3), name, fill=(255, 228, 138), font=f1, anchor='mt')
        d.text((x + w // 2, y + 18), 'level ' + lv, fill=(200, 179, 148), font=f2, anchor='mt')


def frame(scene, S, name, tags=()):
    top = Image.open(f'{SCR}/frame_top.png')
    bot = Image.open(f'{SCR}/frame_bot.png')
    page = Image.new('RGB', (393, 852), (30, 20, 10))
    page.paste(top.crop((0, 0, 393, 118)), (0, 0))
    page.paste(bot, (0, 775))
    big = scene.resize((scene.width * S, scene.height * S), Image.NEAREST)
    area = Image.new('RGB', (393, 657), (30, 20, 10))
    area.paste(big, ((393 - big.width) // 2, 0))
    page.paste(area, (0, 118))
    draw_tags(page, tags, S, (393 - big.width) // 2, 118)
    page.save(f'{OUT}/{name}')


# ================= B: 3/4 view from Chronos's village art =================
def lt(path):
    return Image.open(LT + path).convert('RGBA')


TREE = '/home/user/chronos-assets/tiny-rpg-town-files/tiny-rpg-town-files/Assets/Environments/Vegetation props/'


def b_stage(id_, st):
    """A building at one of its four looks from the village art (native pixels): returns the picture and the (dx, dy) of small props to lay in front."""
    cv = Image.new('RGBA', (190, 190), (0, 0, 0, 0))
    gy = 180

    def base(im, cx=95):
        put(cv, im, cx - im.width // 2, gy - im.height)

    def at(im, x, y):
        put(cv, im, x - im.width // 2, y - im.height)
    if id_ == 'treasury':
        if st == 0:
            at(lt('clutter/crates_tall.png'), 70, gy)
            at(lt('clutter/crate_stack.png'), 110, gy - 4)
            at(lt('village/box1.png'), 140, gy)
        elif st == 1:
            base(lt('village/house1.png'))
            at(lt('clutter/chest_gold.png'), 60, gy + 4)
        elif st == 2:
            base(lt('village/house2.png'))
            at(lt('clutter/chest_gold.png'), 40, gy + 4)
            at(lt('clutter/gold1.png'), 150, gy + 6)
            at(lt('clutter/gold2.png'), 62, gy + 6)
        else:
            base(lt('packs/su_castle.png'))
            at(lt('clutter/gold1.png'), 40, gy + 6)
            at(lt('clutter/gold2.png'), 150, gy + 6)
            at(lt('clutter/chest_gold.png'), 62, gy + 8)
            at(lt('clutter/chest_gold.png'), 130, gy + 8)
    elif id_ == 'barracks':
        if st == 0:
            at(lt('village/camp3.png'), 95, gy)
        elif st == 1:
            at(lt('packs/su_tent.png'), 80, gy)
            at(lt('packs/v_rack.png'), 150, gy + 4)
        elif st == 2:
            base(lt('village/house4.png'))
            at(lt('packs/v_rack.png'), 24, gy + 4)
        else:
            base(lt('village/house4.png'), 100)
            at(lt('packs/su_tent.png'), 30, gy)
            at(lt('packs/v_rack.png'), 168, gy + 4)
            at(lt('packs/v_rack.png'), 20, gy + 8)
            at(lt('village/lantern.png'), 176, gy - 4)
    elif id_ == 'armoury':
        if st == 0:
            at(lt('packs/v_anvil.png'), 70, gy)
            at(lt('village/log1.png'), 110, gy)
            at(lt('packs/v_planks.png'), 140, gy - 2)
        elif st == 1:
            base(lt('shops/gb_canopy.png'))
            at(lt('packs/v_anvil.png'), 70, gy + 2)
            at(lt('packs/v_rack.png'), 130, gy + 2)
        elif st == 2:
            base(lt('shops/gb_shop.png'))
            at(lt('packs/v_anvil.png'), 40, gy + 6)
            at(lt('packs/v_rack.png'), 162, gy + 6)
            at(lt('packs/v_sign_sword.png'), 150, gy - 2)
        else:
            base(lt('shops/gb_house.png'))
            at(lt('packs/v_anvil.png'), 30, gy + 8)
            at(lt('packs/v_rack.png'), 166, gy + 8)
            at(lt('packs/v_rack.png'), 40, gy + 10)
            at(lt('packs/v_sign_sword.png'), 150, gy + 2)
    else:
        if st == 0:
            for x, name in ((60, 'fields/pebble1.png'), (95, 'fields/pebble3.png'), (125, 'fields/pebble5.png')):
                at(lt(name), x, gy)
            at(lt('village/box2.png'), 140, gy)
        else:
            base(lt({1: 'packs/su_lookout.png', 2: 'packs/su_roundcastle.png', 3: 'packs/su_magetower.png'}[st]))
    bb = cv.getchannel('A').getbbox()
    return cv.crop(bb)


def strip_b(path):
    ids = ['treasury', 'barracks', 'armoury', 'mageTower']
    names = {'treasury': 'Treasury', 'barracks': 'Barracks', 'armoury': 'Armoury', 'mageTower': 'Mage Tower'}
    from PIL import ImageDraw, ImageFont
    f = ImageFont.load_default(size=14)
    cw, rh = 200, 200
    sheet = Image.new('RGBA', (cw * 4 + 100, rh * 4), (160, 176, 92, 255))
    d = ImageDraw.Draw(sheet)
    for r, id_ in enumerate(ids):
        d.text((6, r * rh + 8), names[id_], fill=(20, 30, 4), font=f)
        for st in range(4):
            im = b_stage(id_, st)
            sheet.alpha_composite(im, (100 + st * cw + (cw - im.width) // 2, r * rh + rh - im.height - 6))
            d.text((106 + st * cw, r * rh + 4), f'look {st}', fill=(20, 30, 4), font=f)
    sheet.convert('RGB').save(path)


def mock_b():
    W, H = 393, 657
    g = lt('roads/ground_grass.png')
    px_ = [p for p in g.getdata() if p[3] == 255]
    from collections import Counter
    grass = Counter(px_).most_common(1)[0][0]
    sc = Image.new('RGBA', (W, H), grass)
    # a few tufts and flowers, laid by a fixed pattern
    import random
    rnd = random.Random(7)
    tufts = [lt(f'fields/tuft{i}.png') for i in range(1, 7)] + [lt(f'fields/flower{i}.png') for i in (1, 3, 5, 9)]
    for _ in range(70):
        t = rnd.choice(tufts)
        put(sc, t, rnd.randrange(0, W - t.width), rnd.randrange(150, H - t.height))
    # the cobbled road: the sheet's inner cobble tile
    road = lt('roads/road1_grass.png').crop((32, 16, 48, 32))
    x0, x1 = 165, 229
    for y in range(120, H, 16):
        for x in range(x0, x1, 16):
            put(sc, road, x, y)
    for y in range(120, H):
        sc.putpixel((x0, y), (40, 56, 86, 255))
        sc.putpixel((x1 - 1, y), (40, 56, 86, 255))
    # plaza by the well
    for y in range(352, 400, 16):
        for x in range(x0 - 32, x1 + 32, 16):
            put(sc, road, x, y)
    items = []  # (foot y, image, centre x)

    def add(im, cx, foot):
        items.append((foot, im, cx))

    pal = lt('village/palisade01.png')
    gate = lt('village/palisade05.png')
    for x in range(0, W, 32):
        put(sc, pal, x, 96)
    put(sc, gate, W // 2 - 16, 96)
    put(sc, gate, W // 2 - 48, 96)
    put(sc, gate, W // 2 + 16, 96)
    add(lt('village/lantern.png'), W // 2 - 56, 140)
    add(lt('village/lantern.png'), W // 2 + 56, 140)
    # the four buildings at their middle look
    for id_, cx, foot in (('mageTower', 84, 372), ('treasury', 304, 376), ('barracks', 92, 590), ('armoury', 306, 584)):
        im = b_stage(id_, 2)
        bb = im.getchannel('A').getbbox()
        add(im, cx, foot + (im.height - bb[3]) - 12 + 12)
    add(lt('packs/v_well.png'), W // 2, 380)
    add(Image.open(TREE + 'tree-1.png').convert('RGBA'), 30, 210)
    add(Image.open(TREE + 'tree-2.png').convert('RGBA'), 372, 210)
    add(Image.open(TREE + 'bush-1.png').convert('RGBA'), 350, 640)
    # heroes at a size that fits the doors (about 28 px)
    for kind, x, foot, face in [('knight', 150, 450, 1), ('archer', 200, 470, -1), ('wizard', 245, 440, -1), ('kunoichi', 170, 500, 1), ('samurai', 225, 520, -1)]:
        sheet, sc_ = HERO[kind]
        lay = SHEETS[sheet]
        img = Image.open(f'{UNITS}/{sheet}.png').convert('RGBA')
        r = lay['rows'].index('idle')
        fr = img.crop((0, r * lay['h'], lay['w'], (r + 1) * lay['h']))
        k = 40 / lay['figure']
        fr = fr.resize((max(1, round(lay['w'] * k)), max(1, round(lay['h'] * k))), Image.NEAREST)
        if (face == 1) != lay.get('facesRight', True):
            fr = flip(fr)
        items.append((foot, fr, x))
    for foot, im, cx in sorted(items, key=lambda t: t[0]):
        bb = im.getchannel('A').getbbox()
        put(sc, im, cx - im.width // 2, foot - bb[3])
    tags = []
    for id_, name, lv, cx, foot in (('mageTower', 'Mage Tower', '3/4', 84, 372), ('treasury', 'Treasury', '3/5', 304, 376), ('barracks', 'Barracks', '3/5', 92, 590), ('armoury', 'Armoury', '3/5', 306, 584)):
        tags.append((name, lv, cx, foot - b_stage(id_, 2).height - 2))
    return sc, 1, tags


def debug():
    items = [house({'wall': 'B', 'storeys': 1, 'roof': 'A', 'chimney': 'Chimney 01', 'door': 'Wide Door 02', 'canopy': 'Canopy 02'})[0], house({'wall': 'C', 'storeys': 1, 'roof': 'B', 'door': 'Wide Door 01'})[0], house({'wall': 'A', 'storeys': 1, 'roof': 'A', 'chimney': 'Chimney 02', 'door': 'Door 04'})[0], scaffold(), tower(2), dummy()]
    sh = Image.new('RGBA', (1300, 420), (90, 130, 180, 255))
    x = 0
    for im in items:
        b = im.resize((im.width * 3, im.height * 3), Image.NEAREST)
        sh.alpha_composite(b, (x, 10))
        x += b.width + 10
        print(im.size)
    sh.save(f'{OUT}/dbgA.png')


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    if len(sys.argv) > 3:
        debug()
        sys.exit()
    sc, S, tags = mock_a()
    frame(sc.convert('RGBA'), S, 'castle-mock-A.png', tags)
    strip_a(f'{OUT}/castle-mock-A-stages.png')
    print('A done')
    sc, S, tags = mock_b()
    frame(sc, S, 'castle-mock-B.png', tags)
    strip_b(f'{OUT}/castle-mock-B-stages.png')
    print('B done')
