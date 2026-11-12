"""Gorm the Quarry Titan's ground show in pieces, for the game (EIDOLON-BLENDER, docs/notes/eidolon-blender.md).

Run: python3 tools/blender-fx/eidolons/gorm_parts.py <out dir>      (PART=explosion picks some; then ID=gorm parts_finish.py)

Stone: heavy, hard-edged, slow to rise and loud to land. Solid rock (flat-shaded slabs and boulders with a grain, lit warm from the
upper left), amber light in the splits where the ground has opened, and tan dust. The pieces take the same places in the call as Askel's:

  sigil      a quarry mark cut into the ground: a six-sided ring, chisel strokes, wedges; standing stones rise along it; then it dulls
  pillar     the painted titan's way in: the ground bursts and great slabs are thrust up twelve tiles, amber in the gaps; they
             grind, tilt apart and fall, rubble thrown
  explosion  the blow: an amber flash from under the ground, a ridge of slabs heaved up across the foes' whole side, boulders thrown
             high; the ridge topples outward and the dust rolls up
  cracks     lies on the ground: the split, wide jagged fissures racing out with a shock ring, amber inside, cooling to black
  fire       a tile heaving: a slab drives up out of it, stands, crumbles (the lead-in: the quake rolling to the foes)
  scorch     a patch of broken ground and rubble, fading
  smoke      a column of dust
  embers     grit and pebbles falling (a loop)
"""
import math, os, random, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
import askel as A
import parts as P
import nivra_parts as N
from askel import ball, clamp, ease, flat_mat, glow, image_node, mat, mth, out3, ramp, seg, value
from parts import render, scene, tint
from nivra_parts import stand

OUT = sys.argv[-1]
os.makedirs(OUT, exist_ok=True)
rnd = random.Random(61)

# The light from under the ground: amber, from its thin edge to its core.
AMBER = [(0.2, (0.12, 0.04, 0.0, 1)), (0.27, (0.45, 0.14, 0.0, 1)), (0.35, (0.85, 0.36, 0.02, 1)), (0.46, (1.0, 0.6, 0.1, 1)), (0.58, (1.0, 0.8, 0.35, 1)), (0.74, (1.0, 0.95, 0.75, 1)), (0.88, (1, 1, 1, 1))]
DUST = [(0.25, (0.2, 0.15, 0.1, 1)), (0.45, (0.42, 0.33, 0.23, 1)), (0.7, (0.66, 0.56, 0.42, 1))]


def lights(sc):
    """A warm sun from the upper left so every face of a slab is its own tone, a cool fill from behind, and a dim sky."""
    for name, energy, colour, rot in (('sun', 4.8, (1.0, 0.93, 0.8), (52, 0, -35)), ('rim', 1.6, (0.55, 0.65, 0.9), (70, 0, 150))):
        li = bpy.data.lights.new(name, 'SUN')
        li.energy = energy
        li.color = colour
        o = bpy.data.objects.new(name, li)
        o.rotation_euler = tuple(math.radians(a) for a in rot)
        sc.collection.objects.link(o)
    sc.world.use_nodes = True
    bg = sc.world.node_tree.nodes.get('Background') or sc.world.node_tree.nodes.new('ShaderNodeBackground')
    bg.inputs[0].default_value = (0.3, 0.28, 0.3, 1)
    bg.inputs[1].default_value = 0.5


def rock_mat():
    """Quarry stone: grey-brown with a grain and darker seams, and amber where it is still hot from the split (an object's green: 0
    cold, 1 glowing in its seams). An object's red is how far it has crumbled away."""
    m, nt = mat('rock')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    info = nt.nodes.new('ShaderNodeObjectInfo')
    rgb = nt.nodes.new('ShaderNodeSeparateColor')
    nt.links.new(info.outputs['Color'], rgb.inputs[0])
    # (a slab is a short shape stretched tall: its own up-and-down is squeezed back, so the grain is blocky like stone, not streaked
    # like timber)
    mp = nt.nodes.new('ShaderNodeMapping')
    mp.inputs['Scale'].default_value = (1.0, 1.0, 6.0)
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector'])
    grain = nt.nodes.new('ShaderNodeTexNoise')
    grain.inputs['Scale'].default_value = 2.2
    grain.inputs['Detail'].default_value = 3
    nt.links.new(mp.outputs[0], grain.inputs['Vector'])
    seams = nt.nodes.new('ShaderNodeTexVoronoi')
    seams.feature = 'DISTANCE_TO_EDGE'
    seams.inputs['Scale'].default_value = 1.1
    nt.links.new(mp.outputs[0], seams.inputs['Vector'])
    seam = mth(nt, 'MULTIPLY', mth(nt, 'SUBTRACT', 0.06, seams.outputs['Distance']), 16.0)
    stone = ramp(nt, mth(nt, 'SUBTRACT', grain.outputs['Fac'], mth(nt, 'MULTIPLY', seam, 0.35)), [(0.25, (0.06, 0.045, 0.035, 1)), (0.45, (0.19, 0.15, 0.115, 1)), (0.65, (0.35, 0.28, 0.21, 1)), (0.85, (0.52, 0.43, 0.33, 1))])
    pb = nt.nodes.new('ShaderNodeBsdfPrincipled')
    pb.inputs['Roughness'].default_value = 0.92
    nt.links.new(stone.outputs['Color'], pb.inputs['Base Color'])
    # (only the deepest of each seam glows, and only while the slab is fresh from the ground)
    glow_in = mth(nt, 'MULTIPLY', mth(nt, 'SUBTRACT', 0.03, seams.outputs['Distance']), 30.0)
    hot = ramp(nt, mth(nt, 'MULTIPLY', glow_in, rgb.outputs['Green']), [(0.0, (0, 0, 0, 1)), (0.4, (0.9, 0.35, 0.02, 1)), (0.8, (1.0, 0.75, 0.25, 1)), (1.0, (1.0, 0.95, 0.7, 1))])
    nt.links.new(hot.outputs['Color'], pb.inputs['Emission Color'])
    pb.inputs['Emission Strength'].default_value = 1.5
    eat = nt.nodes.new('ShaderNodeTexNoise')
    eat.inputs['Scale'].default_value = 2.6
    nt.links.new(tc.outputs['Object'], eat.inputs['Vector'])
    left = mth(nt, 'SUBTRACT', mth(nt, 'ADD', eat.outputs['Fac'], 0.32, False), mth(nt, 'MULTIPLY', rgb.outputs['Red'], 1.45, False), False)
    tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    mix = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(mth(nt, 'MULTIPLY', left, 14.0).outputs[0], mix.inputs[0])
    nt.links.new(tr.outputs[0], mix.inputs[1])
    nt.links.new(pb.outputs[0], mix.inputs[2])
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    nt.links.new(mix.outputs[0], out.inputs['Surface'])
    return m


def slab(m, top=0.5):
    """A slab of rock: four-sided, narrower at its broken top, flat-shaded."""
    bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=1, radius2=top, depth=1)
    o = bpy.context.object
    o.data.materials.append(m)
    o.color = (0, 0, 0, 1)
    return o


def rocks(m, n, speed, up, size=(0.14, 0.4)):
    """Boulders to throw: rough lumps."""
    out = []
    for _ in range(n):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=1)
        o = bpy.context.object
        o.data.materials.append(m)
        o.color = (0, 0, 0, 1)
        for v in o.data.vertices:
            v.co *= rnd.uniform(0.7, 1.15)
        a = rnd.uniform(0, math.tau)
        out.append((o, math.cos(a) * rnd.uniform(*speed), math.sin(a) * rnd.uniform(*speed), rnd.uniform(*up), rnd.uniform(*size), rnd.uniform(0, 6)))
    return out


def heat(o, gone, hot=0.0):
    o.color = (clamp(gone), clamp(hot), 0, 1)


def sigil_image(path, size=512):
    """Gorm's mark, white on black: a six-sided ring inside a round one, chisel strokes between them, three wedges driven to the middle."""
    from PIL import Image, ImageDraw, ImageFilter
    im = Image.new('L', (size * 2, size * 2), 0)
    d = ImageDraw.Draw(im)
    c = size
    d.ellipse((c - size * 0.94, c - size * 0.94, c + size * 0.94, c + size * 0.94), outline=255, width=26)
    hexa = [(c + math.cos(i / 6 * math.tau) * size * 0.74, c + math.sin(i / 6 * math.tau) * size * 0.74) for i in range(6)]
    d.line(hexa + [hexa[0]], fill=255, width=20, joint='curve')
    r0 = random.Random(4)
    for i in range(18):
        a = (i + 0.5) / 18 * math.tau
        w = r0.choice((14, 18, 22))
        d.line((c + math.cos(a) * size * 0.8, c + math.sin(a) * size * 0.8, c + math.cos(a) * size * 0.9, c + math.sin(a) * size * 0.9), fill=255, width=w)
    for i in range(3):
        a = i / 3 * math.tau + math.pi / 6
        tip = (c + math.cos(a) * size * 0.12, c + math.sin(a) * size * 0.12)
        for s in (-1, 1):
            d.line((c + math.cos(a + s * 0.24) * size * 0.66, c + math.sin(a + s * 0.24) * size * 0.66, tip[0], tip[1]), fill=255, width=16)
        d.line((c + math.cos(a + 0.24) * size * 0.66, c + math.sin(a + 0.24) * size * 0.66, c + math.cos(a - 0.24) * size * 0.66, c + math.sin(a - 0.24) * size * 0.66), fill=255, width=16)
    inner = [(c + math.cos(i / 6 * math.tau + math.pi / 6) * size * 0.3, c + math.sin(i / 6 * math.tau + math.pi / 6) * size * 0.3) for i in range(6)]
    d.line(inner + [inner[0]], fill=255, width=14, joint='curve')
    im.filter(ImageFilter.GaussianBlur(3)).resize((size, size), Image.LANCZOS).save(path)


def sigil():
    sc, n = scene('sigil')
    lights(sc)
    rock = rock_mat()
    path = os.path.join(OUT, 'sigil-mask.png')
    sigil_image(path)
    gm, gnt = mat('sigil')
    gimg = image_node(gnt, path)
    gtc = gnt.nodes.new('ShaderNodeTexCoord')
    gsep = gnt.nodes.new('ShaderNodeSeparateXYZ')
    gnt.links.new(gtc.outputs['Object'], gsep.inputs[0])
    ang = mth(gnt, 'ADD', mth(gnt, 'DIVIDE', mth(gnt, 'ARCTAN2', gsep.outputs['Y'], gsep.outputs['X'], False), math.tau, False), 0.5)
    ln = gnt.nodes.new('ShaderNodeVectorMath')
    ln.operation = 'LENGTH'
    gnt.links.new(gtc.outputs['Object'], ln.inputs[0])
    drawn, heat_v, alpha = value(gnt, 0.0), value(gnt, 1.0), value(gnt, 1.0)
    order = mth(gnt, 'ADD', mth(gnt, 'MULTIPLY', ang, 0.62), mth(gnt, 'MULTIPLY', mth(gnt, 'SUBTRACT', 1.0, mth(gnt, 'MULTIPLY', ln.outputs['Value'], 2.0)), 0.38))
    ahead = mth(gnt, 'SUBTRACT', mth(gnt, 'MULTIPLY', drawn, 1.12, False), order, False)
    shown = mth(gnt, 'MULTIPLY', ahead, 30.0)
    front = mth(gnt, 'SUBTRACT', 1.0, mth(gnt, 'MULTIPLY', ahead, 9.0))
    hot = mth(gnt, 'ADD', mth(gnt, 'MULTIPLY', heat_v, 0.62), mth(gnt, 'MULTIPLY', front, 0.5))
    col = ramp(gnt, hot, [(0.0, (0.1, 0.05, 0.02, 1)), (0.3, (0.55, 0.22, 0.02, 1)), (0.62, (1.0, 0.6, 0.1, 1)), (0.85, (1.0, 0.88, 0.5, 1)), (1.0, (1, 1, 0.9, 1))])
    ga = mth(gnt, 'MULTIPLY', mth(gnt, 'MULTIPLY', mth(gnt, 'MULTIPLY', gimg.outputs['Color'], 1.8), shown), alpha)
    glow(gnt, col.outputs['Color'], ga, 1.3)
    bpy.ops.mesh.primitive_plane_add(size=1)
    pl = bpy.context.object
    pl.scale = (5.0, 5.0, 1)
    pl.location = (0, 0, 0.02)
    pl.data.materials.append(gm)
    stones = [(slab(rock, 0.6), (i + rnd.uniform(-0.2, 0.2)) / 12 * math.tau, rnd.uniform(0.6, 1.0), rnd.uniform(-0.12, 0.12), rnd.uniform(0, 3)) for i in range(12)]

    def step(i):
        d = ease(clamp((i + 1) / 12))
        cool = seg(i, 14, 21)
        drawn.outputs[0].default_value = d
        heat_v.outputs[0].default_value = (0.6 + 0.4 * seg(i, 8, 12)) * (1 - 0.85 * cool) + (0.05 if i % 2 else 0)
        alpha.outputs[0].default_value = 1 - seg(i, 18, 22)
        for o, a, s, lean, turn in stones:
            lit = out3(seg(d * 1.12, a / math.tau * 0.62 + 0.02, a / math.tau * 0.62 + 0.14))
            k = lit * s * (1 - seg(i, 15, 19))                               # (they sink back as the mark dulls)
            stand(o, math.cos(a + math.pi) * 2.33, math.sin(a + math.pi) * 2.33, 0.2, 0.7 * k, lean, lean * 0.5, turn)
            heat(o, 0 if k > 0.02 else 1, 0.5 * (1 - cool))

    render(sc, 'sigil', n, step)


def pillar():
    sc, n = scene('pillar')
    lights(sc)
    rock = rock_mat()
    amber, clock = P.hero_fire(AMBER)
    dust, dclock = N.mist_mat(DUST)
    slabs = []
    for k in range(13):
        a, rad = k / 13 * math.tau + rnd.uniform(-0.2, 0.2), (0.0 if k == 0 else rnd.uniform(0.5, 1.25))
        tall = 1 - 0.5 * (rad / 1.25)
        slabs.append((slab(rock, rnd.uniform(0.35, 0.6)), math.cos(a) * rad, math.sin(a) * rad, rnd.uniform(0.5, 0.8), rnd.uniform(7.5, 12.0) * tall, 0.2 * math.sin(a) * rad / 1.25, 0.2 * math.cos(a) * rad / 1.25, rnd.uniform(0, 1.5), rnd.uniform(0, 1.0), a))
    core = ball(None, amber, sub=3)
    burst = [(P.cone(amber), i / 12 * math.tau + rnd.uniform(-0.2, 0.2), rnd.uniform(1.6, 2.8)) for i in range(12)]
    puffs = [(ball(None, dust, sub=3), rnd.uniform(0, math.tau), rnd.uniform(0.9, 1.5), rnd.uniform(0, 0.3)) for _ in range(9)]
    for o, *_ in puffs:
        tint(o, 1)
    thrown = rocks(rock, 26, (1.4, 4.0), (5.0, 12.0))
    rubble = rocks(rock, 26, (1.0, 3.6), (1.0, 4.0), (0.2, 0.5))

    def step(i):
        clock.outputs[0].default_value = i * 0.4
        dclock.outputs[0].default_value = i * 0.25
        fall = seg(i, 9.5, 14.5)                                             # the slabs tilt apart and go down
        for o, x, y, r, h, lx, ly, turn, lag, a in slabs:
            up = out3(seg(i, -0.3 + lag, 2.2 + lag))                        # thrust up, the middle first; heavier than fire, a frame slower
            grind = 0.03 * math.sin(i * 2.2 + a * 3) * (1 - fall)           # they grind against each other as they stand
            out_x, out_y = math.sin(a) * 0.9 * fall, math.cos(a) * 0.9 * fall
            stand(o, x * (1 + 0.6 * fall), y * (1 + 0.6 * fall), r, h * up * (1 - 0.75 * fall ** 1.5), lx + grind + out_x, ly + grind + out_y, turn)
            heat(o, 1 if up <= 0 else fall ** 3 * 0.9, 1 - seg(i, 1.5, 6))
        k = 1 - seg(i, 2, 6)
        up = out3(seg(i, -0.4, 2))
        core.scale = (1.0 * k * up, 1.0 * k * up, 3.2 * up * k)
        core.location = (0, 0, 2.4 * up)
        tint(core, 1 - k, 0.8)
        b = seg(i, -0.3, 3.5)
        for o, a, ln in burst:
            g = out3(b)
            o.scale = (0.3 * (1 - b), 0.3 * (1 - b), max(0.01, ln * g))
            o.rotation_euler = (0, 1.25, a)
            o.location = (math.cos(a) * (0.7 + ln * g * 0.5), math.sin(a) * (0.7 + ln * g * 0.5), 0.35)
            tint(o, b ** 1.5, 0.8 * (1 - b))
        for o, a, s, lag in puffs:
            g = seg(i / 15, lag * 0.3, 0.5 + lag * 0.3) if i < 9 else seg(i, 9.5 + lag * 3, 15.8)
            rr = s * (0.5 + 1.4 * g)
            o.location = (math.cos(a) * (0.8 + 1.7 * g), math.sin(a) * (0.8 + 1.7 * g), 0.6 + (1.3 if i < 9 else 3.0) * g)
            o.scale = (rr, rr, rr * 0.7)
            tint(o, 1 if g <= 0 or g >= 1 else max(g ** 1.6, 1 - seg(g, 0, 0.15)))
        P.throw(thrown, seg(i, 0, 10), 9.0)
        P.throw(rubble, seg(i, 9.5, 15.5), 7.0)
        for o, *_ in rubble:
            o.location.z += 3.5 * (1 - seg(i, 9.5, 15.5)) if i >= 9.5 else 0

    render(sc, 'pillar', n, step)


def explosion():
    sc, n = scene('explosion')
    lights(sc)
    rock = rock_mat()
    amber, clock = P.hero_fire(AMBER)
    dust, dclock = N.mist_mat(DUST)
    D = (math.sqrt(0.5), math.sqrt(0.5))
    E = (math.sqrt(0.5), -math.sqrt(0.5))
    at = lambda a, c: (a * D[0] + c * E[0], a * D[1] + c * E[1])
    core = ball(None, amber, sub=4)
    spikes = [(P.cone(amber), (i + rnd.uniform(-0.3, 0.3)) / 21 * math.pi, rnd.uniform(3.0, 6.5), rnd.uniform(0.3, 0.65)) for i in range(22)]
    ridge = []
    for k in range(38):
        a = rnd.uniform(-5.3, 5.3)
        tall = 1 - 0.4 * (abs(a) / 5.3) ** 1.5
        rank = k % 3
        # (three ranks: squat blocks at the front, tall slabs behind; each leans out from the middle, heaved up from below)
        ridge.append((slab(rock, rnd.uniform(0.35, 0.65)), a, (rank - 1) * 0.8 + rnd.uniform(-0.3, 0.3), rnd.uniform(0.7, 1.15) * (1.2 - 0.15 * rank), rnd.uniform(3.8, 6.6) * (0.75 + 0.5 * rank) * tall, 0.34 * (a / 5.3) + rnd.uniform(-0.14, 0.14), rnd.uniform(0, 1.5)))
    puffs = [(ball(None, dust, sub=3), rnd.uniform(-5.0, 5.0), rnd.uniform(-0.8, 0.8), rnd.uniform(0.9, 1.5), rnd.uniform(0, 0.3), rnd.uniform(0, math.tau)) for _ in range(20)]
    for o, *_ in puffs:
        tint(o, 1)
    thrown = rocks(rock, 46, (2.0, 7.5), (5.0, 13.0), (0.18, 0.55))
    rubble = rocks(rock, 40, (1.5, 6.0), (0.5, 3.5), (0.2, 0.5))

    def step(i):
        clock.outputs[0].default_value = i * 0.45
        dclock.outputs[0].default_value = i * 0.25
        c = out3(seg(i, -0.5, 2.5))
        gone = seg(i, 2.5, 5)
        r = (0.6 + 2.9 * c) * (1 - 0.3 * gone)
        core.scale = (r * 1.25, r * 1.25, r * 0.7)                          # (low and wide: it comes from under the ground)
        core.location = (0, 0, 0.8 + 0.5 * c)
        tint(core, gone ** 1.4, 0.6)
        for o, ang, ln, w in spikes:
            g = out3(seg(i, -0.3, 3.5))
            fade = seg(i, 2.5, 6)
            x, y = at(math.cos(ang) * (1.0 + ln * g * 0.5), 0)
            o.scale = (w * (1 - 0.7 * fade), w * (1 - 0.7 * fade), max(0.01, ln * g))
            o.rotation_euler = (0, math.pi / 2 - ang, math.atan2(D[1], D[0]))
            o.location = (x, y, 0.9 + math.sin(ang) * (1.0 + ln * g * 0.5))
            tint(o, fade ** 1.3, 0.8 * (1 - fade))
        fall = seg(i, 9.6, 14.5)                                             # the ridge topples outward
        for o, a, cdep, rr, h, lean, turn in ridge:
            start = 0.8 + abs(a) * 0.55                                      # heaved up from the middle outward: the quake rolling
            up = out3(seg(i, start, start + 2.2))
            x, y = at(a, cdep)
            tip = lean * (1 + 2.6 * fall)
            stand(o, x, y, rr, h * up * (1 - 0.7 * fall ** 1.6), -tip * D[1], tip * D[0], turn)
            heat(o, 1 if up <= 0 else fall ** 3 * 0.9, 1 - seg(i, start + 0.5, start + 4))
        for o, a, cdep, s, lag, ph in puffs:
            g = seg(i, 1.5 + abs(a) * 0.55 + lag * 3, 8.5) if i < 9.6 else seg(i, 9.6 + lag * 4, 16)
            if g <= 0 or g >= 1:
                o.scale = (0, 0, 0)
                continue
            x, y = at(a, cdep + 0.9)
            late = i >= 9.6
            rr = s * ((0.5 + 0.8 * g) if not late else (0.9 + 1.7 * g))
            o.location = (x, y, (0.6 + 0.7 * g) if not late else (1.2 + 3.6 * g * s))
            o.scale = (rr, rr, rr * 0.75)
            o.rotation_euler = (0, 0, ph + i * 0.12)
            tint(o, max(g ** 1.8 * 0.9, 1 - seg(g, 0, 0.15)))
        P.throw(thrown, seg(i, 0.5, 12), 10.0)
        t = seg(i, 9.6, 15.8)
        P.throw(rubble, t, 7.5)
        for o, vx, vy, vz, rr, spin in rubble:
            if 0 < t < 1:
                x, y = at(vx * 0.9, 0)
                o.location.x += x
                o.location.y += y
                o.location.z += 0.8 + (abs(vy) % 2.5)

    render(sc, 'explosion', n, step)


def cracks():
    """The split: wide jagged fissures racing out with a shock ring, amber inside, cooling to black."""
    sc, n = scene('cracks')
    from PIL import Image, ImageDraw, ImageFilter
    path = os.path.join(OUT, 'split-mask.png')
    size = 768
    im = Image.new('L', (size, size), 0)
    d = ImageDraw.Draw(im)
    r0 = random.Random(77)
    def crack(x, y, ang, ln, w):
        while ln > 0 and w >= 1.5:
            stepl = r0.uniform(20, 44)
            ang += r0.uniform(-0.7, 0.7)
            nx, ny = x + math.cos(ang) * stepl, y + math.sin(ang) * stepl
            d.line((x, y, nx, ny), fill=255, width=int(round(w)))
            if r0.random() < 0.3 and w > 4:
                crack(nx, ny, ang + r0.choice((-1, 1)) * r0.uniform(0.6, 1.2), ln * 0.55, w * 0.6)
            x, y, ln, w = nx, ny, ln - stepl, w * 0.9
    for i in range(9):                                                      # fewer and wider than fire's: the ground has split, not crazed
        a = i / 9 * math.tau + r0.uniform(-0.25, 0.25)
        crack(size / 2 + math.cos(a) * 16, size / 2 + math.sin(a) * 16, a, r0.uniform(230, 360), r0.uniform(15, 22))
    d.ellipse((size / 2 - 34, size / 2 - 34, size / 2 + 34, size / 2 + 34), fill=255)
    im.filter(ImageFilter.GaussianBlur(1.4)).save(path)
    m, nt = mat('split')
    img = image_node(nt, path)
    tc = nt.nodes.new('ShaderNodeTexCoord')
    ln = nt.nodes.new('ShaderNodeVectorMath')
    ln.operation = 'LENGTH'
    nt.links.new(tc.outputs['Object'], ln.inputs[0])
    reach, heat_v, a_v, ring_r, ring_a = value(nt), value(nt, 1.0), value(nt, 1.0), value(nt), value(nt)
    dist = mth(nt, 'MULTIPLY', ln.outputs['Value'], 2.0)
    shown = mth(nt, 'MULTIPLY', mth(nt, 'SUBTRACT', reach, dist, False), 12.0)
    lead = mth(nt, 'SUBTRACT', 1.0, mth(nt, 'MULTIPLY', mth(nt, 'SUBTRACT', reach, dist, False), 4.0))
    hot = mth(nt, 'ADD', mth(nt, 'MULTIPLY', heat_v, 0.7), mth(nt, 'MULTIPLY', lead, 0.3))
    ring = mth(nt, 'MULTIPLY', mth(nt, 'SUBTRACT', 1.0, mth(nt, 'MULTIPLY', mth(nt, 'ABSOLUTE', mth(nt, 'SUBTRACT', dist, ring_r, False)), 20.0)), ring_a)
    col = ramp(nt, mth(nt, 'MAXIMUM', hot, mth(nt, 'MULTIPLY', ring, 0.8)), [(0.0, (0.015, 0.012, 0.01, 1)), (0.22, (0.3, 0.1, 0.0, 1)), (0.45, (0.85, 0.35, 0.02, 1)), (0.65, (1.0, 0.65, 0.15, 1)), (0.85, (1.0, 0.92, 0.6, 1)), (1.0, (1, 1, 0.95, 1))])
    alpha = mth(nt, 'MAXIMUM', mth(nt, 'MULTIPLY', mth(nt, 'MULTIPLY', mth(nt, 'MULTIPLY', img.outputs['Color'], 2.0), shown), a_v), ring)
    glow(nt, col.outputs['Color'], alpha, 1.3)
    bpy.ops.mesh.primitive_plane_add(size=1)
    pl = bpy.context.object
    pl.scale = (7.6, 7.6, 1)
    pl.data.materials.append(m)

    def step(i):
        reach.outputs[0].default_value = 0.12 + 1.0 * out3(seg(i, -0.5, 3))
        heat_v.outputs[0].default_value = 1 - seg(i, 2, 8)
        a_v.outputs[0].default_value = 1 - 0.6 * seg(i, 8, 11.5)
        ring_r.outputs[0].default_value = 0.1 + 0.95 * out3(seg(i, -0.5, 3.5))
        ring_a.outputs[0].default_value = 1 - seg(i, 1.5, 4)

    render(sc, 'cracks', n, step)


def fire():
    """A tile heaving: a slab drives up out of it with a smaller one each side, stands, crumbles."""
    sc, n = scene('fire')
    lights(sc)
    rock = rock_mat()
    dust, dclock = N.mist_mat(DUST)
    sl = [(slab(rock, top), x, y, r, h, lx, ly, turn) for top, x, y, r, h, lx, ly, turn in ((0.45, 0.0, 0.0, 0.42, 2.5, 0.05, 0.1, 0.4), (0.55, 0.42, -0.2, 0.3, 1.5, 0.1, 0.34, 1.1), (0.5, -0.42, 0.22, 0.32, 1.7, -0.1, -0.32, 0.2), (0.6, 0.1, 0.45, 0.24, 1.0, -0.32, 0.05, 0.8))]
    puff = ball(None, dust, sub=3)
    tint(puff, 1)
    bits = rocks(rock, 10, (0.7, 1.9), (3.0, 6.0), (0.07, 0.15))

    def step(i):
        dclock.outputs[0].default_value = i * 0.25
        fall = seg(i, 8.5, 12.5)
        for k, (o, x, y, r, h, lx, ly, turn) in enumerate(sl):
            up = out3(seg(i, -0.4 + k * 0.3, 2.0 + k * 0.3))
            stand(o, x, y, r, h * up * (1 - 0.8 * fall ** 1.4), lx * (1 + 2 * fall), ly * (1 + 2 * fall), turn)
            heat(o, 1 if up <= 0 else fall ** 3, 1 - seg(i, 1, 6))
        g = seg(i, 0, 5) if i < 8 else seg(i, 8.5, 13.5)
        rr = 0.5 + 0.7 * g
        puff.location = (0.2, 0.5, 0.4 + 0.5 * g)
        puff.scale = (rr, rr, rr * 0.6)
        tint(puff, 1 if g <= 0 or g >= 1 else max(g ** 1.5, 1 - seg(g, 0, 0.15)))
        P.throw(bits, seg(i, 0, 7), 7.0)

    render(sc, 'fire', n, step)


def scorch():
    """Broken ground: a ragged dark patch with stones in it, wearing away."""
    sc, n = scene('scorch')
    lights(sc)
    rock = rock_mat()
    from PIL import Image, ImageDraw, ImageFilter
    path = os.path.join(OUT, 'rubble-blob.png')
    im = Image.new('L', (256, 256), 0)
    d = ImageDraw.Draw(im)
    r0 = random.Random(19)
    for _ in range(14):
        a, rr = r0.uniform(0, math.tau), r0.uniform(0, 52)
        r = r0.uniform(26, 58)
        d.ellipse((128 + math.cos(a) * rr - r, 128 + math.sin(a) * rr - r, 128 + math.cos(a) * rr + r, 128 + math.sin(a) * rr + r), fill=255)
    im.filter(ImageFilter.GaussianBlur(9)).save(path)
    sm, snt = mat('broken')
    simg = image_node(snt, path)
    stc = snt.nodes.new('ShaderNodeTexCoord')
    sno = snt.nodes.new('ShaderNodeTexVoronoi')
    sno.feature = 'DISTANCE_TO_EDGE'
    sno.inputs['Scale'].default_value = 6.0
    snt.links.new(stc.outputs['Object'], sno.inputs['Vector'])
    wear = value(snt, 0.0)
    seam = mth(snt, 'MULTIPLY', mth(snt, 'SUBTRACT', 0.09, sno.outputs['Distance']), 12.0)
    sa = mth(snt, 'MULTIPLY', mth(snt, 'MULTIPLY', mth(snt, 'SUBTRACT', mth(snt, 'MULTIPLY', simg.outputs['Color'], mth(snt, 'ADD', 0.5, seam, False)), mth(snt, 'ADD', 0.3, wear, False), False), 5.0), 0.8)
    col = ramp(snt, seam, [(0.0, (0.05, 0.04, 0.035, 1)), (1.0, (0.012, 0.01, 0.01, 1))])
    glow(snt, col.outputs['Color'], sa, 1.0)
    bpy.ops.mesh.primitive_plane_add(size=1)
    pl = bpy.context.object
    pl.scale = (2.75, 2.75, 1)
    pl.data.materials.append(sm)
    stones = []
    for _ in range(9):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=1)
        o = bpy.context.object
        o.data.materials.append(rock)
        o.color = (0, 0, 0, 1)
        a, rr = rnd.uniform(0, math.tau), rnd.uniform(0.1, 0.8)
        o.location = (math.cos(a) * rr, math.sin(a) * rr, 0.05)
        s = rnd.uniform(0.07, 0.16)
        stones.append((o, s))
    looks = [0.0, 0.0, 0.03, 0.07, 0.12, 0.22, 0.36, 0.52]

    def step(i):
        wear.outputs[0].default_value = looks[i]
        for k, (o, s) in enumerate(stones):
            kk = s * (1 - seg(i, 4 + k * 0.35, 6 + k * 0.35))
            o.scale = (kk, kk, kk * 0.7)

    render(sc, 'scorch', n, step)


def smoke():
    """A column of dust."""
    sc, n = scene('smoke')
    m, clock = N.mist_mat(DUST)
    puffs = [(ball(None, m, sub=3), rnd.uniform(-0.5, 0.5), rnd.uniform(-0.5, 0.5), rnd.uniform(0.8, 1.2), lag, rnd.uniform(0, math.tau)) for lag in (0.0, 0.06, 0.13, 0.2, 0.28, 0.36, 0.44)]

    def step(i):
        clock.outputs[0].default_value = i * 0.22
        for o, x, y, s, lag, ph in puffs:
            g = seg(i / (n - 1), lag, 0.72 + lag)
            r = s * (0.6 + 1.25 * g)
            o.location = (x * (1 + g) - 0.4 * g, y * (1 + g) + 0.3 * g, 0.7 + 4.0 * g * s)
            o.scale = (r, r, r * 0.8)
            o.rotation_euler = (0, 0, ph + i * 0.12)
            tint(o, 1 if g <= 0 else max(g ** 1.6, 1 - seg(g, 0, 0.1)))

    render(sc, 'smoke', n, step)


def embers():
    """Grit and pebbles falling: a loop."""
    sc, n = scene('embers')
    grit, _ = flat_mat((0.62, 0.52, 0.38, 1), 1.0)
    dark, _ = flat_mat((0.3, 0.25, 0.2, 1), 1.0)
    bits = [(ball(None, grit if k % 3 else dark, sub=1, smooth=False), rnd.uniform(-2.3, 2.3), rnd.uniform(0, 7.0), rnd.uniform(0, math.tau), rnd.uniform(0.035, 0.08), rnd.choice((1, 2, 2))) for k in range(50)]

    def step(i):
        t = i / n
        for o, x, z0, ph, r, turns in bits:
            z = (z0 - 7.0 * t * turns) % 7.0
            o.location = (x * math.sqrt(0.5), x * math.sqrt(0.5), z)
            k = r * min(1.0, z / 0.6, (7.0 - z) / 0.6)
            o.scale = (k, k * 0.8, k * 0.7)

    render(sc, 'embers', n, step)


if __name__ == '__main__':
    P.run({'sigil': sigil, 'pillar': pillar, 'explosion': explosion, 'cracks': cracks, 'fire': fire, 'scorch': scorch, 'smoke': smoke, 'embers': embers})
