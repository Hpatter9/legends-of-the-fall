"""Askel's ground show in pieces, for the game (EIDOLON-BLENDER, docs/notes/eidolon-blender.md).

Run: python3 tools/blender-fx/eidolons/parts.py <out dir>        (PART=sigil,fire picks some; then parts_finish.py)

The trial (askel.py) was one scene for one fight. In the game the board turns, its ground rises and falls and the fighters must stand
over what lies on the ground, so the show is cut into pieces the page lays tile by tile (`src/eidolonStage.ts`):

  sigil      lies on the ground: burns on round its ring and inward, glows, then cools and fades
  pillar     the pillar of flame the painted hound leaps out of: the ground bursts, a white core, tongues twisting up, torn away
  explosion  the blow: a white-hot core that blows out to a towering wall of fire wider than the screen, debris and embers thrown,
             then heavy smoke rolling up off it
  cracks     lies on the ground: a shock ring racing out and the ground cracking, the cracks white-hot, then red, then dark
  fire       a tile catching fire: thin tongues lick up, burn, die down (the lead-in to the blow)
  scorch     the burnt ground with its coals, cooling and fading
  smoke      a heavy column of smoke climbing off the burnt ground
  embers     embers falling through the air (a loop)

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
    'pillar': (144, 352, 16, 5.2),
    'explosion': (320, 300, 20, 3.6),
    'cracks': (256, 136, 12, 0.0),
    'fire': (64, 112, 14, 1.75),
    'scorch': (88, 48, 8, 0.0),
    'smoke': (128, 176, 16, 2.6),
    'embers': (160, 200, 12, 3.0),
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


def hero_fire():
    """Fire for the big pieces: turbulence at two scales warped by a third, a hard white core, and dark smoky edges where it thins."""
    m, nt = mat('herofire')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    info = nt.nodes.new('ShaderNodeObjectInfo')
    rgb = nt.nodes.new('ShaderNodeSeparateColor')
    nt.links.new(info.outputs['Color'], rgb.inputs[0])
    clock = value(nt)
    mp = nt.nodes.new('ShaderNodeMapping')
    mp.inputs['Scale'].default_value = (1.0, 1.0, 0.45)
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector'])
    climb = nt.nodes.new('ShaderNodeCombineXYZ')
    nt.links.new(mth(nt, 'MULTIPLY', clock, -1.9, False).outputs[0], climb.inputs['Z'])
    nt.links.new(mth(nt, 'MULTIPLY', info.outputs['Random'], 41.0, False).outputs[0], climb.inputs['X'])
    add = nt.nodes.new('ShaderNodeVectorMath')
    nt.links.new(mp.outputs[0], add.inputs[0])
    nt.links.new(climb.outputs[0], add.inputs[1])
    big = nt.nodes.new('ShaderNodeTexNoise')
    big.noise_dimensions = '4D'
    big.inputs['Scale'].default_value = 2.6
    big.inputs['Detail'].default_value = 3
    big.inputs['Distortion'].default_value = 1.2                           # (the warp: the tongues curl)
    fine = nt.nodes.new('ShaderNodeTexNoise')
    fine.noise_dimensions = '4D'
    fine.inputs['Scale'].default_value = 5.5
    fine.inputs['Detail'].default_value = 5
    fine.inputs['Roughness'].default_value = 0.65
    for n in (big, fine):
        nt.links.new(add.outputs[0], n.inputs['Vector'])
        nt.links.new(mth(nt, 'MULTIPLY', clock, 0.6, False).outputs[0], n.inputs['W'])
    mix = mth(nt, 'ADD', mth(nt, 'MULTIPLY', big.outputs['Fac'], 0.62), mth(nt, 'MULTIPLY', fine.outputs['Fac'], 0.42))
    lw = nt.nodes.new('ShaderNodeLayerWeight')
    lw.inputs['Blend'].default_value = 0.3
    core = mth(nt, 'ADD', 0.25, mth(nt, 'SUBTRACT', 1.0, lw.outputs['Facing']))
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(tc.outputs['Generated'], sep.inputs[0])
    tip = mth(nt, 'SUBTRACT', 1.3, mth(nt, 'MULTIPLY', mth(nt, 'POWER', sep.outputs['Z'], 0.8), 0.85))   # hottest at the foot, dark red at the tip
    heat = mth(nt, 'MULTIPLY', mth(nt, 'MULTIPLY', mix, core), tip)
    hot = mth(nt, 'ADD', heat, mth(nt, 'MULTIPLY', rgb.outputs['Green'], 0.4))
    # (the cut is high, so the turbulence tears the outline: ragged tongues with holes in them, not a clean shape)
    cut = mth(nt, 'ADD', 0.23, mth(nt, 'MULTIPLY', rgb.outputs['Red'], 0.6))
    alpha = mth(nt, 'MULTIPLY', mth(nt, 'SUBTRACT', heat, cut), 12.0)
    col = ramp(nt, hot, [(0.2, (0.05, 0.02, 0.015, 1)), (0.27, (0.4, 0.02, 0.0, 1)), (0.35, (0.9, 0.12, 0.0, 1)), (0.46, (1.0, 0.42, 0.02, 1)), (0.58, (1.0, 0.78, 0.2, 1)), (0.74, (1.0, 0.97, 0.7, 1)), (0.88, (1, 1, 1, 1))])
    glow(nt, col.outputs['Color'], alpha, 1.3)
    return m, clock


def cone(m):
    bpy.ops.mesh.primitive_cone_add(vertices=20, radius1=1, radius2=0, depth=1)
    o = bpy.context.object
    o.data.materials.append(m)
    for p in o.data.polygons:
        p.use_smooth = True
    tint(o, 1)
    return o


def flame(o, x, y, r, h, lean=0.0, turn=0.0):
    """Stand a cone of fire at (x, y): `r` wide at the foot, `h` tall, leaning."""
    o.scale = (r, r, max(0.01, h))
    o.rotation_euler = (lean * 0.5, lean, turn)
    o.location = (x + 0.5 * h * math.sin(lean), y, h * 0.5)


def chunk_mat():
    """Thrown rock: dark, its edges lit by the fire."""
    m, nt = mat('chunk')
    lw = nt.nodes.new('ShaderNodeLayerWeight')
    lw.inputs['Blend'].default_value = 0.5
    col = ramp(nt, lw.outputs['Facing'], [(0.0, (0.03, 0.02, 0.02, 1)), (0.6, (0.1, 0.04, 0.02, 1)), (1.0, (0.9, 0.35, 0.05, 1))])
    v = value(nt, 1.0)
    glow(nt, col.outputs['Color'], v, 1.0)
    return m


def debris(m, n, speed, up):
    out = []
    for _ in range(n):
        o = ball(None, m, sub=1, smooth=False)
        a = rnd.uniform(0, math.tau)
        out.append((o, math.cos(a) * rnd.uniform(*speed), math.sin(a) * rnd.uniform(*speed), rnd.uniform(*up), rnd.uniform(0.07, 0.16), rnd.uniform(0, 6)))
    return out


def throw(chunks, t, g=9.0):
    """Where thrown things are `t` (0 to 1) of the way through: out and up, then down, gone as they land."""
    for o, vx, vy, vz, r, spin in chunks:
        z = 0.3 + vz * t - g * t * t
        k = r if 0 < t < 1 and z > 0 else 0
        o.location = (vx * t, vy * t, max(0.0, z))
        o.rotation_euler = (spin + t * 9, spin * 2 + t * 7, 0)
        o.scale = (k, k * 0.8, k * 0.7)


def pillar():
    sc, n = scene('pillar')
    fire, clock = hero_fire()
    tongues = [(cone(fire), rnd.uniform(0, math.tau), rnd.uniform(0.15, 1.35), rnd.uniform(0.4, 0.75), rnd.uniform(6.0, 12.5), rnd.uniform(0, math.tau)) for _ in range(34)]
    core = ball(None, fire, sub=3)                                           # the white heart of it
    burst = [(cone(fire), i / 12 * math.tau + rnd.uniform(-0.2, 0.2), rnd.uniform(1.6, 2.8)) for i in range(12)]   # the ground bursting outward
    chunks = debris(chunk_mat(), 22, (1.2, 3.4), (5.0, 11.0))
    em, _ = flat_mat((1.0, 0.75, 0.25, 1), 2.0)
    sparks = [(ball(None, em, sub=1, smooth=False), rnd.uniform(0, math.tau), rnd.uniform(0.4, 1.8), rnd.uniform(4.0, 11.0), rnd.uniform(0, 0.4)) for _ in range(34)]

    def step(i):
        clock.outputs[0].default_value = i * 0.4
        up = out3(seg(i, -0.4, 2.2))                                         # violent: full height in two frames
        dn = seg(i, 9.5, 15.5)
        for o, a, rad, r, h, ph in tongues:
            lick = 0.8 + 0.25 * math.sin(i * 2.4 + ph)
            aa = a + i * 0.35                                               # the whole column twists
            hh = h * up * lick * (1 - 0.55 * dn)
            flame(o, math.cos(aa) * rad * (1 - 0.3 * dn), math.sin(aa) * rad * (1 - 0.3 * dn), r * (1.25 - 0.5 * dn) * (0.6 + 0.4 * up), hh, 0.07 * math.sin(ph * 5) + 0.1 * math.sin(i * 1.3 + ph), ph)
            tint(o, clamp(dn ** 1.2 + (0.12 if h > 9 else 0)), 0.6 * (1 - seg(i, 1, 5)))
        k = 1 - seg(i, 3, 9)
        core.scale = (0.75 * k * up, 0.75 * k * up, 5.2 * up * k)
        core.location = (0, 0, 4.6 * up)
        tint(core, 1 - k, 1)
        b = seg(i, -0.3, 3.5)
        for o, a, ln in burst:
            g = out3(b)
            o.scale = (0.3 * (1 - b), 0.3 * (1 - b), max(0.01, ln * g))
            o.rotation_euler = (0, 1.25, a)                                 # lying nearly flat, pointing outward
            o.location = (math.cos(a) * (0.7 + ln * g * 0.5), math.sin(a) * (0.7 + ln * g * 0.5), 0.35)
            tint(o, b ** 1.5, 0.9 * (1 - b))
        throw(chunks, seg(i, 0, 11))
        for o, a, r, v, late in sparks:
            g = seg(i / 15, late, late + 0.6)
            kk = 0.055 * math.sin(g * math.pi) ** 0.5 if 0 < g < 1 else 0
            o.location = (math.cos(a + g) * r, math.sin(a + g) * r, 0.3 + v * g)
            o.scale = (kk, kk, kk)

    render(sc, 'pillar', n, step)


def explosion():
    sc, n = scene('explosion')
    fire, clock = hero_fire()
    smoke, sclock = A.smoke_mat()
    # (the wall runs across the screen whichever way the board lies: along the camera's own left to right, a little deep)
    D = (math.sqrt(0.5), math.sqrt(0.5))
    E = (math.sqrt(0.5), -math.sqrt(0.5))
    at = lambda a, c: (a * D[0] + c * E[0], a * D[1] + c * E[1])
    core = ball(None, fire, sub=4)
    spikes = [(cone(fire), (i + rnd.uniform(-0.3, 0.3)) / 25 * math.pi, rnd.uniform(3.0, 7.0), rnd.uniform(0.25, 0.6)) for i in range(26)]
    wall = []
    for k in range(105):
        a = rnd.uniform(-5.4, 5.4)
        tall = 1 - 0.45 * (abs(a) / 5.4) ** 1.5
        # (many thin tongues in three ranks: short and thick at the front, tall and thin behind, so the wall is ragged, never a row of cones)
        rank = k % 3
        wall.append((cone(fire), a, (rank - 1) * 0.7 + rnd.uniform(-0.3, 0.3), rnd.uniform(0.6, 1.1) * (1.3 - 0.25 * rank), rnd.uniform(4.2, 7.6) * (0.8 + 0.45 * rank) * tall, rnd.uniform(0, math.tau)))
    feet = [(ball(None, fire, sub=3), a * 1.05 - 5.0, rnd.uniform(-0.4, 0.4), rnd.uniform(0.8, 1.2), rnd.uniform(0, math.tau)) for a in range(10)]   # the white-hot foot of the wall
    puffs = [(ball(None, smoke, sub=3), rnd.uniform(-4.8, 4.8), rnd.uniform(-0.6, 0.6), rnd.uniform(0.9, 1.5), rnd.uniform(0, 0.25), rnd.uniform(0, math.tau)) for _ in range(16)]
    for o, *_ in puffs:
        tint(o, 1)
    chunks = debris(chunk_mat(), 34, (2.0, 7.0), (5.0, 12.0))
    em, _ = flat_mat((1.0, 0.8, 0.3, 1), 2.2)
    embers = debris(em, 60, (1.5, 7.5), (4.0, 13.0))

    def step(i):
        clock.outputs[0].default_value = i * 0.42
        sclock.outputs[0].default_value = i * 0.25
        # the core: a white ball blown out in three frames, then gone into the wall
        c = out3(seg(i, -0.5, 3))
        gone = seg(i, 3, 6)
        r = (0.6 + 3.4 * c) * (1 - 0.3 * gone)
        core.scale = (r, r, r * 0.9)
        core.location = (0, 0, 1.2 + 0.8 * c)
        tint(core, gone ** 1.4, 0.72)
        for o, ang, ln, w in spikes:
            g = out3(seg(i, -0.3, 4))
            fade = seg(i, 3, 7.5)
            x, y = at(math.cos(ang) * (1.0 + ln * g * 0.5), 0)
            o.scale = (w * (1 - 0.7 * fade), w * (1 - 0.7 * fade), max(0.01, ln * g))
            o.rotation_euler = (0, 0, 0)
            # (pointing out from the middle, in the plane that faces the camera)
            o.rotation_euler = (math.atan2(-math.cos(ang) * D[1], math.sin(ang)) * 0 , (math.pi / 2 - ang), math.atan2(D[1], D[0]))
            o.location = (x, y, 1.2 + math.sin(ang) * (1.0 + ln * g * 0.5))
            tint(o, fade ** 1.3, 0.9 * (1 - fade))
        for o, a, cdep, rr, h, ph in wall:
            start = 1.0 + abs(a) * 0.55                                      # the wall races outward from the middle
            up = out3(seg(i, start, start + 2.6))
            die = seg(i, 11.5 + abs(a) * 0.25, 18.5)
            lick = 0.8 + 0.3 * math.sin(i * 2.5 + ph)
            x, y = at(a, cdep)
            flame(o, x, y, rr * up * (1.15 - 0.45 * die), h * up * lick * (1 - 0.5 * die), 0.16 * math.sin(ph * 3) + 0.2 * math.sin(i * 1.5 + ph), ph)
            tint(o, 1 if up <= 0 else die ** 1.2, 0.55 * (1 - seg(i, start, start + 4)))
        for o, a, cdep, rr, ph in feet:
            start = 1.0 + abs(a) * 0.55
            up = out3(seg(i, start, start + 2))
            die = seg(i, 9, 16)
            x, y = at(a, cdep)
            o.location = (x, y, 0.8 * rr * up)
            o.scale = (1.3 * rr * up, 1.3 * rr * up, 1.1 * rr * up * (1 - 0.4 * die))
            o.rotation_euler = (0, 0, ph + i * 0.2)
            tint(o, 1 if up <= 0 else die, 0.9 * (1 - 0.6 * die))
        for o, a, cdep, s, lag, ph in puffs:
            g = seg(i / 19, 0.36 + lag, 1.05 + lag)
            if g <= 0:
                o.scale = (0, 0, 0)
                continue
            x, y = at(a, cdep - 0.6)
            rr = s * (0.8 + 1.5 * g)
            o.location = (x, y, 2.2 + 5.5 * g * s)
            o.scale = (rr, rr, rr * 0.85)
            o.rotation_euler = (0, 0, ph + i * 0.12)
            tint(o, max(g ** 2.2 * 0.9, 1 - seg(g, 0, 0.12)))
        throw(chunks, seg(i, 0.5, 13), 10.0)
        throw(embers, seg(i, 0.5, 17), 9.0)

    render(sc, 'explosion', n, step)


def cracks():
    sc, n = scene('cracks')
    from PIL import Image, ImageDraw, ImageFilter
    path = os.path.join(OUT, 'cracks-mask.png')
    size = 768
    im = Image.new('L', (size, size), 0)
    d = ImageDraw.Draw(im)
    r0 = random.Random(31)
    def crack(x, y, ang, ln, w):
        """A jagged crack that forks as it runs out and thins."""
        while ln > 0 and w >= 1:
            step = r0.uniform(14, 34)
            ang += r0.uniform(-0.55, 0.55)
            nx, ny = x + math.cos(ang) * step, y + math.sin(ang) * step
            d.line((x, y, nx, ny), fill=255, width=int(round(w)))
            if r0.random() < 0.22 and w > 2:
                crack(nx, ny, ang + r0.choice((-1, 1)) * r0.uniform(0.5, 1.1), ln * 0.5, w * 0.6)
            x, y, ln, w = nx, ny, ln - step, w * 0.93
    for i in range(13):
        a = i / 13 * math.tau + r0.uniform(-0.2, 0.2)
        crack(size / 2 + math.cos(a) * 18, size / 2 + math.sin(a) * 18, a, r0.uniform(210, 350), r0.uniform(7, 11))
    d.ellipse((size / 2 - 26, size / 2 - 26, size / 2 + 26, size / 2 + 26), fill=255)
    im.filter(ImageFilter.GaussianBlur(1.2)).save(path)
    m, nt = mat('cracks')
    img = image_node(nt, path)
    tc = nt.nodes.new('ShaderNodeTexCoord')
    ln = nt.nodes.new('ShaderNodeVectorMath')
    ln.operation = 'LENGTH'
    nt.links.new(tc.outputs['Object'], ln.inputs[0])
    reach, heat, a_v, ring_r, ring_a = value(nt), value(nt, 1.0), value(nt, 1.0), value(nt), value(nt)
    dist = mth(nt, 'MULTIPLY', ln.outputs['Value'], 2.0)                    # 0 at the middle, 1 at the plane's edge
    shown = mth(nt, 'MULTIPLY', mth(nt, 'SUBTRACT', reach, dist, False), 12.0)
    lead = mth(nt, 'SUBTRACT', 1.0, mth(nt, 'MULTIPLY', mth(nt, 'SUBTRACT', reach, dist, False), 4.0))   # hottest where it is just opening
    hot = mth(nt, 'ADD', mth(nt, 'MULTIPLY', heat, 0.75), mth(nt, 'MULTIPLY', lead, 0.3))
    ring = mth(nt, 'MULTIPLY', mth(nt, 'SUBTRACT', 1.0, mth(nt, 'MULTIPLY', mth(nt, 'ABSOLUTE', mth(nt, 'SUBTRACT', dist, ring_r, False)), 22.0)), ring_a)
    col = ramp(nt, mth(nt, 'MAXIMUM', hot, ring), [(0.0, (0.02, 0.012, 0.01, 1)), (0.22, (0.4, 0.03, 0.0, 1)), (0.45, (0.95, 0.2, 0.0, 1)), (0.65, (1.0, 0.6, 0.08, 1)), (0.85, (1.0, 0.95, 0.6, 1)), (1.0, (1, 1, 1, 1))])
    alpha = mth(nt, 'MAXIMUM', mth(nt, 'MULTIPLY', mth(nt, 'MULTIPLY', mth(nt, 'MULTIPLY', img.outputs['Color'], 2.0), shown), a_v), ring)
    glow(nt, col.outputs['Color'], alpha, 1.3)
    bpy.ops.mesh.primitive_plane_add(size=1)
    pl = bpy.context.object
    pl.scale = (7.6, 7.6, 1)
    pl.data.materials.append(m)

    def step(i):
        reach.outputs[0].default_value = 0.12 + 1.0 * out3(seg(i, -0.5, 3))
        heat.outputs[0].default_value = 1 - seg(i, 2, 9)
        a_v.outputs[0].default_value = 1 - 0.75 * seg(i, 8, 11.5)
        ring_r.outputs[0].default_value = 0.1 + 0.95 * out3(seg(i, -0.5, 3.5))
        ring_a.outputs[0].default_value = 1 - seg(i, 1.5, 4)

    render(sc, 'cracks', n, step)


def fire():
    """A tile catching fire: thin pointed tongues that lick up one after another, lean and die down (cones, so each has a sharp tip)."""
    sc, n = scene('fire')
    m, clock = A.fire_mat()
    tongues = []
    for x, y, r, h, ph in ((0.0, 0.0, 0.34, 3.0, 0.0), (0.38, -0.25, 0.26, 2.1, 1.3), (-0.4, 0.2, 0.28, 2.4, 2.6), (0.12, 0.4, 0.22, 1.7, 4.1), (-0.15, -0.42, 0.24, 1.9, 5.2), (0.55, 0.2, 0.2, 1.4, 0.7), (-0.6, -0.15, 0.2, 1.5, 3.4)):
        bpy.ops.mesh.primitive_cone_add(vertices=20, radius1=1, radius2=0, depth=1)
        o = bpy.context.object
        o.data.materials.append(m)
        for p in o.data.polygons:
            p.use_smooth = True
        tint(o, 1)
        tongues.append((o, x, y, r, h, ph))
    em, _ = flat_mat((1.0, 0.75, 0.25, 1), 2.0)
    sparks = [(ball(None, em, sub=1, smooth=False), rnd.uniform(-0.6, 0.6), rnd.uniform(-0.6, 0.6), rnd.uniform(1.8, 3.8), rnd.uniform(0, 0.5)) for _ in range(12)]

    def step(i):
        clock.outputs[0].default_value = i * 0.45
        up = out3(seg(i, -0.6, 2))                                          # bursting up
        die = seg(i, 8.5, 13.5)
        for o, x, y, r, h, ph in tongues:
            lick = 0.72 + 0.34 * math.sin(i * 2.6 + ph)                      # each tongue licks up and falls back on its own beat
            hh = h * up * lick * (1 - 0.6 * die) * (1.15 if i <= 2 else 1)
            rr = r * up * (1 - 0.35 * die) * (1.1 - 0.2 * lick)
            lean = 0.16 * math.sin(i * 1.7 + ph * 2)
            o.scale = (rr, rr, max(0.01, hh))
            o.rotation_euler = (lean * 0.6, lean, ph)
            o.location = (x + 0.5 * hh * math.sin(lean), y, hh * 0.5)
            tint(o, die ** 1.3, 0.85 * (1 - seg(i, 0, 4)))
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
    """A heavy column: puffs roll up one after another, swell and thin away."""
    sc, n = scene('smoke')
    m, clock = A.smoke_mat()
    puffs = [(ball(None, m, sub=3), rnd.uniform(-0.5, 0.5), rnd.uniform(-0.5, 0.5), rnd.uniform(0.8, 1.2), lag, rnd.uniform(0, math.tau)) for lag in (0.0, 0.06, 0.13, 0.2, 0.28, 0.36, 0.44)]

    def step(i):
        clock.outputs[0].default_value = i * 0.22
        for o, x, y, s, lag, ph in puffs:
            g = seg(i / (n - 1), lag, 0.72 + lag)
            r = s * (0.6 + 1.25 * g)
            o.location = (x * (1 + g) - 0.4 * g, y * (1 + g) + 0.3 * g, 0.7 + 4.6 * g * s)
            o.scale = (r, r, r * 0.85)
            o.rotation_euler = (0, 0, ph + i * 0.12)
            tint(o, 1 if g <= 0 else max(g ** 1.7, 1 - seg(g, 0, 0.1)))

    render(sc, 'smoke', n, step)


def embers():
    """Embers falling: a loop (each falls the frame's height once a turn, wrapping)."""
    sc, n = scene('embers')
    em, _ = flat_mat((1.0, 0.7, 0.2, 1), 2.0)
    hot, _ = flat_mat((1.0, 0.95, 0.6, 1), 2.4)
    bits = [(ball(None, hot if k % 4 == 0 else em, sub=1, smooth=False), rnd.uniform(-2.3, 2.3), rnd.uniform(0, 7.0), rnd.uniform(0, math.tau), rnd.uniform(0.03, 0.06), rnd.choice((1, 1, 2))) for k in range(46)]

    def step(i):
        t = i / n
        for o, x, z0, ph, r, turns in bits:
            z = (z0 - 7.0 * t * turns) % 7.0
            sway = 0.25 * math.sin(math.tau * t * turns + ph)
            dx, dy = (x + sway) * math.sqrt(0.5), (x + sway) * math.sqrt(0.5)
            o.location = (dx, dy, z)
            k = r * min(1.0, z / 0.6, (7.0 - z) / 0.6)                      # (thinning at the wrap, so the loop has no pop)
            o.scale = (k, k, k)

    render(sc, 'embers', n, step)


ALL = {'sigil': sigil, 'pillar': pillar, 'explosion': explosion, 'cracks': cracks, 'fire': fire, 'scorch': scorch, 'smoke': smoke, 'embers': embers}
for key in (os.environ.get('PART') or ','.join(ALL)).split(','):
    ALL[key]()
