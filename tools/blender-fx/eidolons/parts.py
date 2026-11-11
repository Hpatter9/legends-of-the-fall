"""Askel's ground show in pieces, for the game (EIDOLON-BLENDER, docs/notes/eidolon-blender.md).

Run: python3 tools/blender-fx/eidolons/parts.py <out dir>        (PART=sigil,fire picks some; then parts_finish.py)

The trial (askel.py) was one scene for one fight. In the game the board turns, its ground rises and falls and the fighters must stand
over what lies on the ground, so the show is cut into six small pieces the page lays tile by tile (`src/eidolonStage.ts`):

  sigil    lies on the ground: burns on round its ring and inward, glows, then cools and fades
  pillar   the pillar of flame the painted hound leaps out of (and the firestorm on the foes' middle)
  blast    the great burst on the foes' middle
  fire     a tile catching fire: bursts up, burns, dies down
  scorch   the burnt ground with its coals, cooling and fading
  smoke    a puff of smoke climbing off the burnt ground

Each is rendered from the game's camera at 1.5 times the heroes' pixels, see-through, to <out>/<part>/NNN.png.
"""
import math, os, random, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
import askel as A
from askel import ball, clamp, ease, flat_mat, glow, image_node, mat, mth, out3, ramp, seg, value

OUT = sys.argv[-1]
os.makedirs(OUT, exist_ok=True)
rnd = random.Random(23)

# Each piece: its frame in hero pixels, how many frames, and where the camera looks (tiles above the ground point).
PARTS = {
    'sigil': (160, 96, 22, 0.25),
    'pillar': (120, 288, 16, 4.7),
    'blast': (176, 176, 12, 1.7),
    'fire': (64, 112, 14, 1.75),
    'scorch': (88, 48, 8, 0.0),
    'smoke': (72, 128, 12, 2.2),
}


def scene(name):
    fw, fh, n, lift = PARTS[name]
    sc = A.reset(fw, fh, (0, 0, lift))
    return sc, n


def tint(o, burnt, white=0.0):
    o.color = (clamp(burnt), clamp(white), 0, 1)


def tongue(m, loc=(0, 0, 0)):
    o = ball(None, m, loc, sub=3)
    tint(o, 1)
    return o


def render(sc, name, n, step):
    os.makedirs(os.path.join(OUT, name), exist_ok=True)
    for i in range(n):
        step(i)
        sc.render.filepath = os.path.join(OUT, name, f'{i:03d}.png')
        bpy.ops.render.render(write_still=True)
    print('done', name, flush=True)


def sigil():
    sc, n = scene('sigil')
    fire, clock = A.fire_mat()
    path = os.path.join(OUT, 'sigil-mask.png')
    A.sigil_image(path)
    gm, gnt = mat('sigil')
    gimg = image_node(gnt, path)
    gtc = gnt.nodes.new('ShaderNodeTexCoord')
    gsep = gnt.nodes.new('ShaderNodeSeparateXYZ')
    gnt.links.new(gtc.outputs['Object'], gsep.inputs[0])
    ang = mth(gnt, 'ADD', mth(gnt, 'DIVIDE', mth(gnt, 'ARCTAN2', gsep.outputs['Y'], gsep.outputs['X'], False), math.tau, False), 0.5)
    ln = gnt.nodes.new('ShaderNodeVectorMath')
    ln.operation = 'LENGTH'
    gnt.links.new(gtc.outputs['Object'], ln.inputs[0])
    drawn, heat, alpha = value(gnt, 0.0), value(gnt, 1.0), value(gnt, 1.0)
    order = mth(gnt, 'ADD', mth(gnt, 'MULTIPLY', ang, 0.62), mth(gnt, 'MULTIPLY', mth(gnt, 'SUBTRACT', 1.0, mth(gnt, 'MULTIPLY', ln.outputs['Value'], 2.0)), 0.38))
    ahead = mth(gnt, 'SUBTRACT', mth(gnt, 'MULTIPLY', drawn, 1.12, False), order, False)
    shown = mth(gnt, 'MULTIPLY', ahead, 30.0)
    front = mth(gnt, 'SUBTRACT', 1.0, mth(gnt, 'MULTIPLY', ahead, 9.0))
    hot = mth(gnt, 'ADD', mth(gnt, 'MULTIPLY', heat, 0.66), mth(gnt, 'MULTIPLY', front, 0.5))
    col = ramp(gnt, hot, [(0.0, (0.2, 0.01, 0.0, 1)), (0.3, (0.75, 0.08, 0.0, 1)), (0.62, (1.0, 0.5, 0.05, 1)), (0.85, (1.0, 0.9, 0.45, 1)), (1.0, (1, 1, 0.9, 1))])
    ga = mth(gnt, 'MULTIPLY', mth(gnt, 'MULTIPLY', mth(gnt, 'MULTIPLY', gimg.outputs['Color'], 1.8), shown), alpha)
    glow(gnt, col.outputs['Color'], ga, 1.3)
    bpy.ops.mesh.primitive_plane_add(size=1)
    pl = bpy.context.object
    pl.scale = (5.0, 5.0, 1)
    pl.location = (0, 0, 0.02)
    pl.data.materials.append(gm)
    licks = [(tongue(fire), (i + rnd.uniform(-0.3, 0.3)) / 16 * math.tau, rnd.uniform(0.5, 1.1)) for i in range(16)]

    def step(i):
        clock.outputs[0].default_value = i * 0.3
        d = ease(clamp((i + 1) / 12))
        cool = seg(i, 14, 21)
        drawn.outputs[0].default_value = d
        heat.outputs[0].default_value = (0.6 + 0.4 * seg(i, 8, 12)) * (1 - 0.85 * cool) + (0.06 if i % 2 else 0)
        alpha.outputs[0].default_value = 1 - seg(i, 18, 22)
        for o, a, s in licks:
            lit = seg(d * 1.12, a / math.tau * 0.62 + 0.02, a / math.tau * 0.62 + 0.12)
            k = lit * s * (0.8 + 0.25 * math.sin(i * 2.1 + a * 7))
            o.location = (math.cos(a + math.pi) * 2.33, math.sin(a + math.pi) * 2.33, 0.26 * k)
            o.scale = (0.24 * k, 0.24 * k, 0.48 * k)
            tint(o, seg(i, 14, 18) if lit > 0 else 1, 0.1)

    render(sc, 'sigil', n, step)


def pillar():
    sc, n = scene('pillar')
    fire, clock = A.fire_mat()
    shells = [(tongue(fire), k, rnd.uniform(-0.2, 0.2), rnd.uniform(-0.2, 0.2), rnd.uniform(0, math.tau)) for k in range(11)]
    em, _ = flat_mat((1.0, 0.7, 0.2, 1), 1.8)
    sparks = [(ball(None, em, sub=1, smooth=False), rnd.uniform(0, math.tau), rnd.uniform(0.4, 1.5), rnd.uniform(3.0, 9.0), rnd.uniform(0, 0.4)) for _ in range(26)]

    def step(i):
        clock.outputs[0].default_value = i * 0.35
        up = out3(seg(i, -0.5, 3))
        dn = seg(i, 9, 15.5)
        for o, k, x, y, ph in shells:
            u = k / 10
            shown = seg(up, u * 0.85, u * 0.85 + 0.15)
            r = (1.6 - 0.85 * u) * (0.35 + 0.65 * shown) * (1 - 0.5 * dn) * (1 + 0.1 * math.sin(i * 1.9 + ph))
            o.location = (x * (1 - u), y * (1 - u), 0.6 + u * 7.3 * up)
            o.scale = (r, r, 2.0 * (0.5 + 0.5 * shown))
            o.rotation_euler = (0, 0, ph + i * 0.3)
            tint(o, 1 if shown <= 0 else clamp(dn * 1.15 + 0.3 * u * dn), 0.8 * (1 - u) * (1 - seg(i, 2, 7)))
        for o, a, r, v, late in sparks:
            g = seg(i / 15, late, late + 0.6)
            k = 0.05 * math.sin(g * math.pi) ** 0.5 if 0 < g < 1 else 0
            o.location = (math.cos(a + g) * r, math.sin(a + g) * r, 0.3 + v * g)
            o.scale = (k, k, k)

    render(sc, 'pillar', n, step)


def blast():
    sc, n = scene('blast')
    fire, clock = A.fire_mat()
    balls = [(tongue(fire), rnd.uniform(-0.5, 0.5), rnd.uniform(-0.5, 0.5), rnd.uniform(0.75, 1.15), rnd.uniform(0, 0.12), rnd.uniform(0, math.tau)) for _ in range(7)]
    em, _ = flat_mat((1.0, 0.75, 0.25, 1), 2.0)
    embers = []
    for _ in range(30):
        a = rnd.uniform(0, math.tau)
        embers.append((ball(None, em, sub=1, smooth=False), math.cos(a) * rnd.uniform(1.4, 3.2), math.sin(a) * rnd.uniform(1.4, 3.2), rnd.uniform(3.0, 6.5)))

    def step(i):
        t = i / (n - 1)
        clock.outputs[0].default_value = i * 0.3
        for o, x, y, s, lag, ph in balls:
            g = clamp((t - lag) / (1 - lag))
            gg = 1 - (1 - g) ** 3
            r = 0.45 + 1.75 * gg * s
            o.scale = (r, r, r * 1.1)
            o.location = (x * (0.5 + 1.6 * gg), y * (0.5 + 1.6 * gg), 0.7 + 1.5 * g * s)
            o.rotation_euler = (g * 1.2, g * 0.7, ph)
            tint(o, 0.02 + 0.98 * g ** 1.6, 0.7 * (1 - g) ** 3)
        for o, vx, vy, vz in embers:
            o.location = (vx * t, vy * t, 0.5 + vz * t - 5.0 * t * t)
            k = 0.07 * max(0.0, 1 - t * 1.05)
            o.scale = (k, k, k)

    render(sc, 'blast', n, step)


def fire():
    sc, n = scene('fire')
    m, clock = A.fire_mat()
    parts = [(tongue(m), 0.0, 0.0, 0.8, 1.75, 0.0), (tongue(m), 0.5, -0.35, 0.58, 1.2, 1.3), (tongue(m), -0.5, 0.3, 0.6, 1.3, 2.6), (tongue(m), 0.1, 0.5, 0.5, 1.0, 4.1), (tongue(m), -0.15, -0.5, 0.5, 0.95, 5.2)]
    em, _ = flat_mat((1.0, 0.75, 0.25, 1), 2.0)
    sparks = [(ball(None, em, sub=1, smooth=False), rnd.uniform(-0.6, 0.6), rnd.uniform(-0.6, 0.6), rnd.uniform(1.5, 3.6), rnd.uniform(0, 0.5)) for _ in range(10)]

    def step(i):
        clock.outputs[0].default_value = i * 0.4
        up = out3(seg(i, -0.6, 2))                                          # bursting up
        over = 1 + 0.3 * math.sin(seg(i, 0, 3) * math.pi)                   # taller for a moment as it bursts
        die = seg(i, 8.5, 13.5)
        for o, x, y, r, h, ph in parts:
            k = up * (1 - 0.55 * die) * (0.9 + 0.16 * math.sin(i * 2.3 + ph))
            o.location = (x, y, h * 0.92 * k * over)
            o.scale = (r * k, r * k, h * k * over)
            o.rotation_euler = (0, 0, ph + i * 0.2)
            tint(o, die ** 1.3, 0.9 * (1 - seg(i, 0, 4)))
        for o, x, y, v, late in sparks:
            g = seg(i / 13, late, late + 0.5)
            k = 0.05 * math.sin(g * math.pi) ** 0.5 if 0 < g < 1 else 0
            o.location = (x, y, 0.4 + v * g)
            o.scale = (k, k, k)

    render(sc, 'fire', n, step)


def scorch():
    sc, n = scene('scorch')
    from PIL import Image, ImageDraw, ImageFilter
    path = os.path.join(OUT, 'scorch-blob.png')
    im = Image.new('L', (256, 256), 0)
    d = ImageDraw.Draw(im)
    r0 = random.Random(9)
    for _ in range(14):                                                    # a ragged patch, not a clean round
        a, rr = r0.uniform(0, math.tau), r0.uniform(0, 52)
        r = r0.uniform(26, 58)
        d.ellipse((128 + math.cos(a) * rr - r, 128 + math.sin(a) * rr - r, 128 + math.cos(a) * rr + r, 128 + math.sin(a) * rr + r), fill=255)
    im.filter(ImageFilter.GaussianBlur(9)).save(path)
    sm, snt = mat('scorch')
    simg = image_node(snt, path)
    stc = snt.nodes.new('ShaderNodeTexCoord')
    sno = snt.nodes.new('ShaderNodeTexNoise')
    sno.inputs['Scale'].default_value = 9.0
    sno.inputs['Detail'].default_value = 4
    snt.links.new(stc.outputs['Object'], sno.inputs['Vector'])
    a_v, coal = value(snt, 1.0), value(snt, 1.0)
    patchy = mth(snt, 'MULTIPLY', simg.outputs['Color'], mth(snt, 'ADD', 0.35, sno.outputs['Fac']))
    sa = mth(snt, 'MULTIPLY', mth(snt, 'MULTIPLY', mth(snt, 'SUBTRACT', patchy, 0.3), 3.0), a_v)
    coals = mth(snt, 'MULTIPLY', mth(snt, 'MULTIPLY', mth(snt, 'SUBTRACT', sno.outputs['Fac'], 0.55), 7.0), coal)
    col = ramp(snt, coals, [(0.0, (0.012, 0.008, 0.008, 1)), (0.5, (0.65, 0.08, 0.0, 1)), (1.0, (1.0, 0.5, 0.06, 1))])
    glow(snt, col.outputs['Color'], sa, 1.0)
    bpy.ops.mesh.primitive_plane_add(size=1)
    pl = bpy.context.object
    pl.scale = (2.75, 2.75, 1)
    pl.data.materials.append(sm)
    looks = [(0.9, 1.0), (0.9, 0.9), (0.9, 0.7), (0.9, 0.45), (0.85, 0.2), (0.7, 0.0), (0.45, 0.0), (0.22, 0.0)]

    def step(i):
        a_v.outputs[0].default_value, coal.outputs[0].default_value = looks[i]

    render(sc, 'scorch', n, step)


def smoke():
    sc, n = scene('smoke')
    m, clock = A.smoke_mat()
    puffs = [(ball(None, m, sub=3), rnd.uniform(-0.25, 0.25), rnd.uniform(-0.25, 0.25), rnd.uniform(0.8, 1.15), lag, rnd.uniform(0, math.tau)) for lag in (0.0, 0.12, 0.26)]

    def step(i):
        clock.outputs[0].default_value = i * 0.25
        for o, x, y, s, lag, ph in puffs:
            g = seg(i / (n - 1), lag, 1.0 + lag * 0.3)
            r = s * (0.55 + 0.9 * g)
            o.location = (x - 0.25 * g, y + 0.2 * g, 0.6 + 3.0 * g * s)
            o.scale = (r, r, r * 0.85)
            o.rotation_euler = (0, 0, ph + i * 0.15)
            tint(o, 1 if g <= 0 else max(g ** 1.5, 1 - seg(g, 0, 0.12)))

    render(sc, 'smoke', n, step)


ALL = {'sigil': sigil, 'pillar': pillar, 'blast': blast, 'fire': fire, 'scorch': scorch, 'smoke': smoke}
for key in (os.environ.get('PART') or ','.join(ALL)).split(','):
    ALL[key]()
