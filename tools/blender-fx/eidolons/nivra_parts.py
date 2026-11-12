"""Nivra the Rime Wyrm's ground show in pieces, for the game (EIDOLON-BLENDER, docs/notes/eidolon-blender.md).

Run: python3 tools/blender-fx/eidolons/nivra_parts.py <out dir>      (PART=explosion picks some; then ID=nivra parts_finish.py)

Ice, not Askel's fire recoloured: solid crystal that catches the light (faceted spires, flat-shaded, lit by a white sun and a blue rim),
cold white-blue light for the flashes, and pale mist. The pieces take the same places in the call as Askel's (parts.py):

  sigil      a rune of six arms freezing onto the ground round its ring and inward, crystals growing along it, then melting away
  pillar     the painted wyrm's way in: a white-blue burst, a cluster of ice spires driven up twelve tiles in two frames, then shattered
  explosion  the blow: a cold white core, a wall of ice spires racing out across the foes' side, standing a moment, then the shatter:
             every spire breaking at once, shards thrown, mist rolling up
  cracks     lies on the ground: the freezing front racing out as a ring, frost ferns spreading behind it, then fading
  fire       a tile freezing: small spires burst up, stand, break (the lead-in: the frost creeping to the foes)
  scorch     a patch of ground left iced, melting back from its edge
  smoke      cold mist climbing off the ice
  embers     ice motes and snow falling (a loop)
"""
import math, os, random, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
import askel as A
import parts as P
from askel import ball, clamp, ease, flat_mat, glow, image_node, mat, mth, out3, ramp, seg, value
from parts import render, scene, tint

OUT = sys.argv[-1]
os.makedirs(OUT, exist_ok=True)
rnd = random.Random(47)

# Cold fire: the flashes' colours from their thin edge to their core.
COLD = [(0.2, (0.02, 0.06, 0.2, 1)), (0.27, (0.05, 0.22, 0.6, 1)), (0.35, (0.15, 0.5, 0.95, 1)), (0.46, (0.4, 0.75, 1.0, 1)), (0.58, (0.7, 0.92, 1.0, 1)), (0.74, (0.92, 0.98, 1.0, 1)), (0.88, (1, 1, 1, 1))]


def lights(sc):
    """What makes ice read as ice: a white sun from the upper left, a blue rim from behind, and a cold sky to fill the facets."""
    for name, energy, colour, rot in (('sun', 4.2, (1, 1, 1), (50, 0, -30)), ('rim', 2.2, (0.3, 0.6, 1.0), (70, 0, 150))):
        li = bpy.data.lights.new(name, 'SUN')
        li.energy = energy
        li.color = colour
        o = bpy.data.objects.new(name, li)
        o.rotation_euler = tuple(math.radians(a) for a in rot)
        sc.collection.objects.link(o)
    sc.world.use_nodes = True
    bg = sc.world.node_tree.nodes.get('Background') or sc.world.node_tree.nodes.new('ShaderNodeBackground')
    bg.inputs[0].default_value = (0.1, 0.24, 0.5, 1)
    bg.inputs[1].default_value = 0.55


def ice_mat():
    """Crystal: pale blue, glassy, lit a little from within. An object's red is how far it has broken away (0 whole, 1 gone)."""
    m, nt = mat('ice')
    pb = nt.nodes.new('ShaderNodeBsdfPrincipled')
    pb.inputs['Base Color'].default_value = (0.3, 0.62, 0.98, 1)
    pb.inputs['Roughness'].default_value = 0.2
    pb.inputs['Metallic'].default_value = 0.35
    info = nt.nodes.new('ShaderNodeObjectInfo')
    rgb = nt.nodes.new('ShaderNodeSeparateColor')
    nt.links.new(info.outputs['Color'], rgb.inputs[0])
    tc = nt.nodes.new('ShaderNodeTexCoord')
    # (light inside it: pale veins where the crystal's cells meet, and a bright tip, so a large face is never one flat blue)
    vor = nt.nodes.new('ShaderNodeTexVoronoi')
    vor.feature = 'DISTANCE_TO_EDGE'
    vor.inputs['Scale'].default_value = 2.6
    nt.links.new(tc.outputs['Object'], vor.inputs['Vector'])
    vein = mth(nt, 'MULTIPLY', mth(nt, 'SUBTRACT', 0.07, vor.outputs['Distance']), 14.0)
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(tc.outputs['Generated'], sep.inputs[0])
    tipl = mth(nt, 'POWER', sep.outputs['Z'], 2.5)
    lit = ramp(nt, mth(nt, 'MAXIMUM', vein, tipl), [(0.0, (0.06, 0.26, 0.8, 1)), (0.5, (0.35, 0.7, 1.0, 1)), (1.0, (0.95, 1.0, 1.0, 1))])
    nt.links.new(lit.outputs['Color'], pb.inputs['Emission Color'])
    pb.inputs['Emission Strength'].default_value = 0.6
    eat = nt.nodes.new('ShaderNodeTexNoise')
    eat.inputs['Scale'].default_value = 3.0
    nt.links.new(tc.outputs['Object'], eat.inputs['Vector'])
    left = mth(nt, 'SUBTRACT', mth(nt, 'ADD', eat.outputs['Fac'], 0.32, False), mth(nt, 'MULTIPLY', rgb.outputs['Red'], 1.45, False), False)
    keep = mth(nt, 'MULTIPLY', left, 14.0)
    tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    mix = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(keep.outputs[0], mix.inputs[0])
    nt.links.new(tr.outputs[0], mix.inputs[1])
    nt.links.new(pb.outputs[0], mix.inputs[2])
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    nt.links.new(mix.outputs[0], out.inputs['Surface'])
    return m


MIST = [(0.25, (0.22, 0.4, 0.7, 1)), (0.45, (0.5, 0.72, 0.95, 1)), (0.7, (0.86, 0.95, 1.0, 1))]


def mist_mat(stops=MIST):
    """Cold mist: pale, soft puffs (`stops`: its colours from its thin edge in; another element's dust takes its own). An object's red
    is how far it has thinned away."""
    m, nt = mat('mist')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    info = nt.nodes.new('ShaderNodeObjectInfo')
    rgb = nt.nodes.new('ShaderNodeSeparateColor')
    nt.links.new(info.outputs['Color'], rgb.inputs[0])
    clock = value(nt)
    noise = nt.nodes.new('ShaderNodeTexNoise')
    noise.noise_dimensions = '4D'
    noise.inputs['Scale'].default_value = 2.2
    noise.inputs['Detail'].default_value = 4
    nt.links.new(tc.outputs['Object'], noise.inputs['Vector'])
    nt.links.new(mth(nt, 'ADD', mth(nt, 'MULTIPLY', clock, 0.35, False), mth(nt, 'MULTIPLY', info.outputs['Random'], 19.0, False), False).outputs[0], noise.inputs['W'])
    lw = nt.nodes.new('ShaderNodeLayerWeight')
    lw.inputs['Blend'].default_value = 0.45
    core = mth(nt, 'SUBTRACT', 1.0, lw.outputs['Facing'])
    body = mth(nt, 'MULTIPLY', noise.outputs['Fac'], core)
    cut = mth(nt, 'ADD', 0.27, mth(nt, 'MULTIPLY', rgb.outputs['Red'], 0.55))
    alpha = mth(nt, 'MULTIPLY', mth(nt, 'SUBTRACT', body, cut), 6.0)
    col = ramp(nt, body, stops)
    glow(nt, col.outputs['Color'], alpha, 1.0)
    return m, clock


def spire(m, sides=6):
    """A crystal: a faceted cone, flat-shaded so each face takes the light its own way."""
    bpy.ops.mesh.primitive_cone_add(vertices=sides, radius1=1, radius2=0.04, depth=1)
    o = bpy.context.object
    o.data.materials.append(m)
    tint(o, 0)
    return o


def stand(o, x, y, r, h, lean_x=0.0, lean_y=0.0, turn=0.0):
    """Stand a spire at (x, y): `r` wide at its foot, `h` tall, leaning."""
    o.scale = (r, r, max(0.01, h))
    o.rotation_euler = (lean_x, lean_y, turn)
    o.location = (x + 0.5 * h * math.sin(lean_y), y - 0.5 * h * math.sin(lean_x), h * 0.5 * math.cos(lean_x) * math.cos(lean_y))


def shards(m, n, speed, up, size=(0.1, 0.3)):
    """Broken ice to throw: small faceted bits."""
    out = []
    for _ in range(n):
        bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=1, radius2=0.0, depth=2.2)
        o = bpy.context.object
        o.data.materials.append(m)
        tint(o, 0)
        a = rnd.uniform(0, math.tau)
        out.append((o, math.cos(a) * rnd.uniform(*speed), math.sin(a) * rnd.uniform(*speed), rnd.uniform(*up), rnd.uniform(*size), rnd.uniform(0, 6)))
    return out


def sigil_image(path, size=512):
    """Nivra's rune, white on black: two rings, runes between them, and a six-armed crystal with barbs on each arm."""
    from PIL import Image, ImageDraw, ImageFilter
    im = Image.new('L', (size * 2, size * 2), 0)
    d = ImageDraw.Draw(im)
    c = size
    for r, w in ((0.94, 24), (0.76, 12), (0.2, 12)):
        d.ellipse((c - size * r, c - size * r, c + size * r, c + size * r), outline=255, width=w)
    r0 = random.Random(8)
    for i in range(24):
        a = i / 24 * math.tau + r0.uniform(-0.03, 0.03)
        d.line((c + math.cos(a) * size * 0.79, c + math.sin(a) * size * 0.79, c + math.cos(a + r0.uniform(-0.06, 0.06)) * size * 0.9, c + math.sin(a) * size * 0.9), fill=255, width=14)
    for i in range(6):
        a = i / 6 * math.tau + math.pi / 6
        tip = (c + math.cos(a) * size * 0.72, c + math.sin(a) * size * 0.72)
        d.line((c + math.cos(a) * size * 0.2, c + math.sin(a) * size * 0.2, tip[0], tip[1]), fill=255, width=18)
        for k, far in ((0.34, 0.2), (0.5, 0.17), (0.63, 0.1)):               # the barbs, shorter toward the tip
            for s in (-1, 1):
                bx, by = c + math.cos(a) * size * k, c + math.sin(a) * size * k
                d.line((bx, by, bx + math.cos(a + s * 1.05) * size * far, by + math.sin(a + s * 1.05) * size * far), fill=255, width=12)
    d.polygon([(c + math.cos(i / 6 * math.tau) * size * 0.12, c + math.sin(i / 6 * math.tau) * size * 0.12) for i in range(6)], fill=255)
    im.filter(ImageFilter.GaussianBlur(3)).resize((size, size), Image.LANCZOS).save(path)


def sigil():
    sc, n = scene('sigil')
    lights(sc)
    ice = ice_mat()
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
    drawn, heat, alpha = value(gnt, 0.0), value(gnt, 1.0), value(gnt, 1.0)
    order = mth(gnt, 'ADD', mth(gnt, 'MULTIPLY', ang, 0.62), mth(gnt, 'MULTIPLY', mth(gnt, 'SUBTRACT', 1.0, mth(gnt, 'MULTIPLY', ln.outputs['Value'], 2.0)), 0.38))
    ahead = mth(gnt, 'SUBTRACT', mth(gnt, 'MULTIPLY', drawn, 1.12, False), order, False)
    shown = mth(gnt, 'MULTIPLY', ahead, 30.0)
    front = mth(gnt, 'SUBTRACT', 1.0, mth(gnt, 'MULTIPLY', ahead, 9.0))
    hot = mth(gnt, 'ADD', mth(gnt, 'MULTIPLY', heat, 0.66), mth(gnt, 'MULTIPLY', front, 0.5))
    col = ramp(gnt, hot, [(0.0, (0.04, 0.12, 0.35, 1)), (0.3, (0.12, 0.4, 0.85, 1)), (0.62, (0.45, 0.8, 1.0, 1)), (0.85, (0.85, 0.97, 1.0, 1)), (1.0, (1, 1, 1, 1))])
    ga = mth(gnt, 'MULTIPLY', mth(gnt, 'MULTIPLY', mth(gnt, 'MULTIPLY', gimg.outputs['Color'], 1.8), shown), alpha)
    glow(gnt, col.outputs['Color'], ga, 1.3)
    bpy.ops.mesh.primitive_plane_add(size=1)
    pl = bpy.context.object
    pl.scale = (5.0, 5.0, 1)
    pl.location = (0, 0, 0.02)
    pl.data.materials.append(gm)
    crystals = [(spire(ice, 5), (i + rnd.uniform(-0.3, 0.3)) / 14 * math.tau, rnd.uniform(0.45, 1.0), rnd.uniform(-0.25, 0.25), rnd.uniform(0, 3)) for i in range(14)]

    def step(i):
        d = ease(clamp((i + 1) / 12))
        cool = seg(i, 14, 21)
        drawn.outputs[0].default_value = d
        heat.outputs[0].default_value = (0.6 + 0.4 * seg(i, 8, 12)) * (1 - 0.8 * cool) + (0.06 if i % 2 else 0)
        alpha.outputs[0].default_value = 1 - seg(i, 18, 22)
        for o, a, s, lean, turn in crystals:
            lit = out3(seg(d * 1.12, a / math.tau * 0.62 + 0.02, a / math.tau * 0.62 + 0.14))
            k = lit * s * (1 - seg(i, 14, 19))
            stand(o, math.cos(a + math.pi) * 2.33, math.sin(a + math.pi) * 2.33, 0.16 * k, 0.75 * k, lean, lean * 0.5, turn)
            tint(o, seg(i, 15, 19))

    render(sc, 'sigil', n, step)


def pillar():
    sc, n = scene('pillar')
    lights(sc)
    ice = ice_mat()
    cold, clock = P.hero_fire(COLD)
    mist, mclock = mist_mat()
    spires = []
    for k in range(24):
        a, rad = rnd.uniform(0, math.tau), rnd.uniform(0.0, 1.35)
        tall = 1 - 0.55 * (rad / 1.35)
        spires.append((spire(ice), math.cos(a) * rad, math.sin(a) * rad, rnd.uniform(0.38, 0.7), rnd.uniform(6.5, 12.0) * tall, 0.26 * math.sin(a) * rad / 1.35 + rnd.uniform(-0.05, 0.05), 0.26 * math.cos(a) * rad / 1.35 + rnd.uniform(-0.05, 0.05), rnd.uniform(0, 3), rnd.uniform(0, 0.8)))
    core = ball(None, cold, sub=3)
    burst = [(P.cone(cold), i / 12 * math.tau + rnd.uniform(-0.2, 0.2), rnd.uniform(1.8, 3.0)) for i in range(12)]
    puffs = [(ball(None, mist, sub=3), rnd.uniform(0, math.tau), rnd.uniform(0.9, 1.4), rnd.uniform(0, 0.3)) for _ in range(8)]
    bits = shards(ice, 34, (1.5, 4.5), (5.0, 12.0), (0.16, 0.42))

    def step(i):
        clock.outputs[0].default_value = i * 0.4
        mclock.outputs[0].default_value = i * 0.25
        brk = seg(i, 9.5, 12)                                                # the shatter
        for o, x, y, r, h, lx, ly, turn, lag in spires:
            up = out3(seg(i, -0.4 + lag, 1.8 + lag))                        # driven up in two frames, the middle first
            stand(o, x, y, r * (0.5 + 0.5 * up) * (1 - 0.5 * brk), h * up * (1 - 0.85 * brk), lx * (1 + 2 * brk), ly * (1 + 2 * brk), turn)
            tint(o, brk ** 1.5)
        k = 1 - seg(i, 2, 6)
        up = out3(seg(i, -0.4, 2))
        core.scale = (1.1 * k * up, 1.1 * k * up, 5.0 * up * k)
        core.location = (0, 0, 4.2 * up)
        tint(core, 1 - k, 1)
        b = seg(i, -0.3, 3.5)
        for o, a, ln in burst:
            g = out3(b)
            o.scale = (0.32 * (1 - b), 0.32 * (1 - b), max(0.01, ln * g))
            o.rotation_euler = (0, 1.25, a)
            o.location = (math.cos(a) * (0.7 + ln * g * 0.5), math.sin(a) * (0.7 + ln * g * 0.5), 0.35)
            tint(o, b ** 1.5, 0.9 * (1 - b))
        for o, a, s, lag in puffs:
            # (mist thrown out at the foot as it comes up, and again as it breaks)
            g = max(seg(i / 15, lag * 0.3, 0.45 + lag * 0.3), 0) if i < 9 else seg(i, 9.5 + lag * 3, 15.5)
            rr = s * (0.5 + 1.3 * g)
            o.location = (math.cos(a) * (0.8 + 1.6 * g), math.sin(a) * (0.8 + 1.6 * g), 0.6 + (1.2 if i < 9 else 3.5) * g)
            o.scale = (rr, rr, rr * 0.7)
            tint(o, 1 if g <= 0 or g >= 1 else max(g ** 1.6, 1 - seg(g, 0, 0.15)))
        P.throw(bits, seg(i, 9.5, 15.5), 8.0)
        for o, *_ in bits:
            o.location.z += 3.0 * (1 - seg(i, 9.5, 15.5)) if i >= 9.5 else 0

    render(sc, 'pillar', n, step)


def explosion():
    sc, n = scene('explosion')
    lights(sc)
    ice = ice_mat()
    cold, clock = P.hero_fire(COLD)
    mist, mclock = mist_mat()
    D = (math.sqrt(0.5), math.sqrt(0.5))
    E = (math.sqrt(0.5), -math.sqrt(0.5))
    at = lambda a, c: (a * D[0] + c * E[0], a * D[1] + c * E[1])
    core = ball(None, cold, sub=4)
    spikes = [(P.cone(cold), (i + rnd.uniform(-0.3, 0.3)) / 25 * math.pi, rnd.uniform(3.0, 7.0), rnd.uniform(0.25, 0.6)) for i in range(26)]
    wall = []
    for k in range(72):
        a = rnd.uniform(-5.4, 5.4)
        tall = 1 - 0.4 * (abs(a) / 5.4) ** 1.5
        rank = k % 3
        # (three ranks: short and thick at the front, tall and thin behind; each leans out from the middle, like a crown thrown up)
        wall.append((spire(ice, 5 + k % 2), a, (rank - 1) * 0.75 + rnd.uniform(-0.3, 0.3), rnd.uniform(0.5, 0.9) * (1.25 - 0.2 * rank), rnd.uniform(3.6, 6.4) * (0.8 + 0.5 * rank) * tall, 0.3 * (a / 5.4) + rnd.uniform(-0.12, 0.12), rnd.uniform(0, 3)))
    puffs = [(ball(None, mist, sub=3), rnd.uniform(-5.0, 5.0), rnd.uniform(-0.8, 0.8), rnd.uniform(0.9, 1.5), rnd.uniform(0, 0.3), rnd.uniform(0, math.tau)) for _ in range(18)]
    for o, *_ in puffs:
        tint(o, 1)
    bits = shards(ice, 70, (2.0, 8.0), (4.0, 12.0), (0.18, 0.5))

    def step(i):
        clock.outputs[0].default_value = i * 0.45
        mclock.outputs[0].default_value = i * 0.25
        c = out3(seg(i, -0.5, 2.5))
        gone = seg(i, 2.5, 5)
        r = (0.6 + 3.3 * c) * (1 - 0.3 * gone)
        core.scale = (r, r, r * 0.9)
        core.location = (0, 0, 1.2 + 0.8 * c)
        tint(core, gone ** 1.4, 0.45)
        for o, ang, ln, w in spikes:
            g = out3(seg(i, -0.3, 3.5))
            fade = seg(i, 2.5, 6)
            x, y = at(math.cos(ang) * (1.0 + ln * g * 0.5), 0)
            o.scale = (w * (1 - 0.7 * fade), w * (1 - 0.7 * fade), max(0.01, ln * g))
            o.rotation_euler = (0, math.pi / 2 - ang, math.atan2(D[1], D[0]))
            o.location = (x, y, 1.2 + math.sin(ang) * (1.0 + ln * g * 0.5))
            tint(o, fade ** 1.3, 0.9 * (1 - fade))
        brk = seg(i, 9.6, 12.2)                                              # the shatter: all of it at once
        for o, a, cdep, rr, h, lean, turn in wall:
            start = 0.8 + abs(a) * 0.5                                       # the spires race outward from the middle
            up = out3(seg(i, start, start + 1.8))
            x, y = at(a, cdep)
            # (leaning along the wall's own line, away from the middle)
            stand(o, x, y, rr * (0.5 + 0.5 * up) * (1 - 0.45 * brk), h * up * (1 - 0.8 * brk), -lean * D[1] * (1 + 1.5 * brk), lean * D[0] * (1 + 1.5 * brk), turn)
            tint(o, 1 if up <= 0 else brk ** 1.6)
        for o, a, cdep, s, lag, ph in puffs:
            # (mist at the wall's foot as it rises, a great roll of it as it breaks)
            g = seg(i, 1.5 + abs(a) * 0.5 + lag * 3, 8.5) if i < 9.6 else seg(i, 9.6 + lag * 4, 16)
            if g <= 0 or g >= 1:
                o.scale = (0, 0, 0)
                continue
            x, y = at(a, cdep + 0.9)
            late = i >= 9.6
            rr = s * ((0.5 + 0.7 * g) if not late else (0.9 + 1.6 * g))
            o.location = (x, y, (0.6 + 0.6 * g) if not late else (1.4 + 4.0 * g * s))
            o.scale = (rr, rr, rr * 0.75)
            o.rotation_euler = (0, 0, ph + i * 0.12)
            tint(o, max(g ** 1.8 * 0.9, 1 - seg(g, 0, 0.15)))
        t = seg(i, 9.6, 15.8)
        P.throw(bits, t, 8.5)
        for o, vx, vy, vz, rr, spin in bits:
            # (they start where the wall stood, along its line and up its height)
            if 0 < t < 1:
                x, y = at(vx * 0.9, 0)
                o.location.x += x
                o.location.y += y
                o.location.z += 1.0 + (abs(vy) % 3.5)

    render(sc, 'explosion', n, step)


def cracks():
    """The freezing front: a ring racing out over the ground, frost ferns spreading behind it."""
    sc, n = scene('cracks')
    from PIL import Image, ImageDraw, ImageFilter
    path = os.path.join(OUT, 'frost-mask.png')
    size = 768
    im = Image.new('L', (size, size), 0)
    d = ImageDraw.Draw(im)
    r0 = random.Random(52)
    def fern(x, y, ang, ln, w):
        """A frost fern: a straight spine with barbs both sides, each a smaller fern."""
        if ln < 14 or w < 1:
            return
        ex, ey = x + math.cos(ang) * ln, y + math.sin(ang) * ln
        d.line((x, y, ex, ey), fill=255, width=int(round(w)))
        steps = int(ln / 26)
        for k in range(1, steps + 1):
            f = k / (steps + 1)
            bx, by = x + (ex - x) * f, y + (ey - y) * f
            for s in (-1, 1):
                fern(bx, by, ang + s * (math.pi / 3 + r0.uniform(-0.12, 0.12)), ln * (1 - f) * 0.42, w * 0.6)
    for i in range(12):
        a = i / 12 * math.tau + r0.uniform(-0.08, 0.08)
        fern(size / 2, size / 2, a, r0.uniform(280, 360), r0.uniform(7, 10))
    im.filter(ImageFilter.GaussianBlur(1.1)).save(path)
    m, nt = mat('frost')
    img = image_node(nt, path)
    tc = nt.nodes.new('ShaderNodeTexCoord')
    ln = nt.nodes.new('ShaderNodeVectorMath')
    ln.operation = 'LENGTH'
    nt.links.new(tc.outputs['Object'], ln.inputs[0])
    reach, heat, a_v, ring_r, ring_a = value(nt), value(nt, 1.0), value(nt, 1.0), value(nt), value(nt)
    dist = mth(nt, 'MULTIPLY', ln.outputs['Value'], 2.0)
    shown = mth(nt, 'MULTIPLY', mth(nt, 'SUBTRACT', reach, dist, False), 12.0)
    lead = mth(nt, 'SUBTRACT', 1.0, mth(nt, 'MULTIPLY', mth(nt, 'SUBTRACT', reach, dist, False), 4.0))
    hot = mth(nt, 'ADD', mth(nt, 'MULTIPLY', heat, 0.75), mth(nt, 'MULTIPLY', lead, 0.3))
    ring = mth(nt, 'MULTIPLY', mth(nt, 'SUBTRACT', 1.0, mth(nt, 'MULTIPLY', mth(nt, 'ABSOLUTE', mth(nt, 'SUBTRACT', dist, ring_r, False)), 18.0)), ring_a)
    col = ramp(nt, mth(nt, 'MAXIMUM', hot, ring), [(0.0, (0.1, 0.25, 0.5, 1)), (0.25, (0.2, 0.5, 0.9, 1)), (0.5, (0.5, 0.82, 1.0, 1)), (0.75, (0.85, 0.96, 1.0, 1)), (1.0, (1, 1, 1, 1))])
    alpha = mth(nt, 'MAXIMUM', mth(nt, 'MULTIPLY', mth(nt, 'MULTIPLY', mth(nt, 'MULTIPLY', img.outputs['Color'], 2.0), shown), a_v), ring)
    glow(nt, col.outputs['Color'], alpha, 1.3)
    bpy.ops.mesh.primitive_plane_add(size=1)
    pl = bpy.context.object
    pl.scale = (7.6, 7.6, 1)
    pl.data.materials.append(m)

    def step(i):
        reach.outputs[0].default_value = 0.1 + 1.0 * out3(seg(i, -0.5, 3))
        heat.outputs[0].default_value = 1 - 0.8 * seg(i, 2, 9)
        a_v.outputs[0].default_value = 1 - 0.8 * seg(i, 8, 11.5)
        ring_r.outputs[0].default_value = 0.1 + 0.95 * out3(seg(i, -0.5, 3.5))
        ring_a.outputs[0].default_value = 1 - seg(i, 1.5, 4)

    render(sc, 'cracks', n, step)


def fire():
    """A tile freezing: small spires burst up, stand a moment, break."""
    sc, n = scene('fire')
    lights(sc)
    ice = ice_mat()
    sp = [(spire(ice, 5), x, y, r, h, lx, ly, turn) for x, y, r, h, lx, ly, turn in ((0.0, 0.0, 0.26, 2.7, 0.0, 0.05, 0.3), (0.4, -0.25, 0.2, 1.8, 0.1, 0.3, 1.1), (-0.42, 0.22, 0.21, 2.0, -0.08, -0.3, 2.0), (0.12, 0.42, 0.17, 1.4, -0.3, 0.1, 0.7), (-0.15, -0.44, 0.18, 1.5, 0.32, -0.1, 2.6), (0.55, 0.2, 0.15, 1.1, -0.1, 0.42, 1.7), (-0.6, -0.15, 0.15, 1.2, 0.1, -0.44, 0.2))]
    bits = shards(ice, 12, (0.6, 1.8), (3.0, 6.0), (0.05, 0.12))

    def step(i):
        brk = seg(i, 8.5, 11)
        for k, (o, x, y, r, h, lx, ly, turn) in enumerate(sp):
            up = out3(seg(i, -0.5 + k * 0.25, 1.6 + k * 0.25))
            stand(o, x, y, r * (0.5 + 0.5 * up) * (1 - 0.4 * brk), h * up * (1 - 0.85 * brk), lx, ly, turn)
            tint(o, brk ** 1.5)
        t = seg(i, 8.5, 13.5)
        P.throw(bits, t, 7.0)
        for o, *_ in bits:
            if 0 < t < 1:
                o.location.z += 0.8

    render(sc, 'fire', n, step)


def scorch():
    """A patch of ground left iced: a ragged sheet, melting back from its edge."""
    sc, n = scene('scorch')
    from PIL import Image, ImageDraw, ImageFilter
    path = os.path.join(OUT, 'ice-blob.png')
    im = Image.new('L', (256, 256), 0)
    d = ImageDraw.Draw(im)
    r0 = random.Random(13)
    for _ in range(14):
        a, rr = r0.uniform(0, math.tau), r0.uniform(0, 52)
        r = r0.uniform(26, 58)
        d.ellipse((128 + math.cos(a) * rr - r, 128 + math.sin(a) * rr - r, 128 + math.cos(a) * rr + r, 128 + math.sin(a) * rr + r), fill=255)
    im.filter(ImageFilter.GaussianBlur(9)).save(path)
    sm, snt = mat('sheet')
    simg = image_node(snt, path)
    stc = snt.nodes.new('ShaderNodeTexCoord')
    sno = snt.nodes.new('ShaderNodeTexVoronoi')                               # (cells, like cracked ice)
    sno.inputs['Scale'].default_value = 7.0
    snt.links.new(stc.outputs['Object'], sno.inputs['Vector'])
    melt, glint = value(snt, 0.0), value(snt, 1.0)
    patchy = mth(snt, 'MULTIPLY', simg.outputs['Color'], mth(snt, 'ADD', 0.55, mth(snt, 'MULTIPLY', sno.outputs['Distance'], 0.8, False), False))
    sa = mth(snt, 'MULTIPLY', mth(snt, 'SUBTRACT', patchy, mth(snt, 'ADD', 0.3, melt, False), False), 6.0)
    shine = mth(snt, 'MULTIPLY', mth(snt, 'SUBTRACT', 1.0, mth(snt, 'MULTIPLY', sno.outputs['Distance'], 2.2)), glint)
    col = ramp(snt, shine, [(0.0, (0.3, 0.55, 0.85, 1)), (0.6, (0.6, 0.85, 1.0, 1)), (1.0, (0.95, 1.0, 1.0, 1))])
    glow(snt, col.outputs['Color'], sa, 1.0)
    bpy.ops.mesh.primitive_plane_add(size=1)
    pl = bpy.context.object
    pl.scale = (2.75, 2.75, 1)
    pl.data.materials.append(sm)
    looks = [(0.0, 1.0), (0.0, 0.9), (0.02, 0.75), (0.05, 0.6), (0.1, 0.45), (0.2, 0.3), (0.34, 0.2), (0.5, 0.1)]

    def step(i):
        melt.outputs[0].default_value, glint.outputs[0].default_value = looks[i]

    render(sc, 'scorch', n, step)


def smoke():
    """Cold mist climbing off the ice."""
    sc, n = scene('smoke')
    m, clock = mist_mat()
    puffs = [(ball(None, m, sub=3), rnd.uniform(-0.5, 0.5), rnd.uniform(-0.5, 0.5), rnd.uniform(0.8, 1.2), lag, rnd.uniform(0, math.tau)) for lag in (0.0, 0.06, 0.13, 0.2, 0.28, 0.36, 0.44)]

    def step(i):
        clock.outputs[0].default_value = i * 0.22
        for o, x, y, s, lag, ph in puffs:
            g = seg(i / (n - 1), lag, 0.72 + lag)
            r = s * (0.6 + 1.2 * g)
            o.location = (x * (1 + g) - 0.4 * g, y * (1 + g) + 0.3 * g, 0.7 + 3.8 * g * s)
            o.scale = (r, r, r * 0.8)
            o.rotation_euler = (0, 0, ph + i * 0.12)
            tint(o, 1 if g <= 0 else max(g ** 1.5, 1 - seg(g, 0, 0.1)))

    render(sc, 'smoke', n, step)


def embers():
    """Ice motes and snow falling: a loop (each falls the frame's height once or twice a turn, wrapping)."""
    sc, n = scene('embers')
    snow, _ = flat_mat((0.9, 0.97, 1.0, 1), 1.6)
    blue, _ = flat_mat((0.5, 0.8, 1.0, 1), 1.8)
    bits = [(ball(None, snow if k % 3 else blue, sub=1, smooth=False), rnd.uniform(-2.3, 2.3), rnd.uniform(0, 7.0), rnd.uniform(0, math.tau), rnd.uniform(0.03, 0.065), rnd.choice((1, 1, 2))) for k in range(54)]

    def step(i):
        t = i / n
        for o, x, z0, ph, r, turns in bits:
            z = (z0 - 7.0 * t * turns) % 7.0
            sway = 0.4 * math.sin(math.tau * t * turns + ph)
            o.location = ((x + sway) * math.sqrt(0.5), (x + sway) * math.sqrt(0.5), z)
            k = r * min(1.0, z / 0.6, (7.0 - z) / 0.6)
            o.scale = (k, k, k)

    render(sc, 'embers', n, step)


P.PARTS['explosion'] = (320, 300, 16, 3.6)                                 # (rendered as the 16 frames it ships)
if __name__ == '__main__':
    P.run({'sigil': sigil, 'pillar': pillar, 'explosion': explosion, 'cracks': cracks, 'fire': fire, 'scorch': scorch, 'smoke': smoke, 'embers': embers})
