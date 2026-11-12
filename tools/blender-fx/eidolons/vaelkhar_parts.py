"""Vaelkhar the Dragon King's ground show in pieces, for the game (EIDOLON-BLENDER, docs/notes/eidolon-blender.md).

Run: python3 tools/blender-fx/eidolons/vaelkhar_parts.py <out dir>      (PART=explosion picks some; then ID=vaelkhar parts_finish.py)

Shadow: where the others throw light out, his takes it in. Black fire with a violet edge (its core is the dark, its rim the light),
tears in the air and the ground, and a maw that drains: the blow ends by pulling everything back into itself. The pieces take the same
places in the call as Askel's:

  sigil      a crown of horns and a slit eye cut in violet; black flames stand along it; then it dulls
  pillar     the painted dragon's way in: a tear in the air twelve tiles tall, opening to a black lens with violet fire along its
             lips, shadow pouring from its foot; it snaps shut
  explosion  the blow: a maw opens on the foes' middle and two wings of dark sweep up and out across their whole side; they stand,
             then the maw drains: streaks of violet are pulled in from everywhere, the wings are dragged back into it, and it closes
             on a last violet spark
  cracks     lies on the ground: the rift, jagged tears racing out with a violet ring, then lying black
  fire       a tile burning dark: black tongues with violet edges (the lead-in: the shadow reaching the foes)
  scorch     a patch of blight, violet embers in it, fading
  smoke      a column of dark smoke
  embers     violet motes drawn upward (a loop)
"""
import math, os, random, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
import askel as A
import parts as P
import nivra_parts as N
from askel import ball, clamp, ease, flat_mat, glow, image_node, mat, mth, out3, ramp, seg, value
from parts import render, scene, tint, cone, flame
from voltara_parts import D, E

OUT = sys.argv[-1]
os.makedirs(OUT, exist_ok=True)
rnd = random.Random(113)

# Black fire, from its thin edge (the light) to its core (the dark).
DARK = [(0.2, (0.9, 0.78, 1.0, 1)), (0.25, (0.68, 0.36, 1.0, 1)), (0.31, (0.42, 0.12, 0.85, 1)), (0.39, (0.2, 0.04, 0.48, 1)), (0.48, (0.08, 0.01, 0.2, 1)), (0.6, (0.025, 0.0, 0.07, 1)), (0.75, (0.006, 0.0, 0.02, 1))]
MURK = [(0.25, (0.03, 0.01, 0.06, 1)), (0.45, (0.1, 0.04, 0.2, 1)), (0.7, (0.24, 0.12, 0.42, 1))]
at = lambda a, c=0.0: (a * D[0] + c * E[0], a * D[1] + c * E[1])


def point(o, a, z, ang, ln, w):
    """Lay a cone in the plane that faces the camera: its foot at (a, z), pointing `ang` (0 along the screen, pi/2 up), `ln` long."""
    x, y = at(a + math.cos(ang) * ln * 0.5)
    o.scale = (w, w, max(0.01, ln))
    o.rotation_euler = (0, math.pi / 2 - ang, math.atan2(D[1], D[0]))
    o.location = (x, y, z + math.sin(ang) * ln * 0.5)


def membrane_mat():
    """A wing's skin: the dark itself, veined, with a bright violet rim along its trailing edge, which is eaten ragged by a noise.
    Across it `u` runs from the wing's root (0) to its edge (1). An object's red is how far it has been dragged away."""
    m, nt = mat('membrane')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(tc.outputs['UV'], sep.inputs[0])
    info = nt.nodes.new('ShaderNodeObjectInfo')
    rgb = nt.nodes.new('ShaderNodeSeparateColor')
    nt.links.new(info.outputs['Color'], rgb.inputs[0])
    tatter = nt.nodes.new('ShaderNodeTexNoise')
    tatter.inputs['Scale'].default_value = 1.4
    tatter.inputs['Detail'].default_value = 4
    nt.links.new(tc.outputs['Object'], tatter.inputs['Vector'])
    # (how far in from the edge it is eaten: a ragged trailing edge, more of it gone as the maw drags it away)
    reach = mth(nt, 'SUBTRACT', mth(nt, 'ADD', 0.86, mth(nt, 'MULTIPLY', tatter.outputs['Fac'], 0.24, False), False), mth(nt, 'MULTIPLY', rgb.outputs['Red'], 0.9, False), False)
    inside = mth(nt, 'SUBTRACT', reach, sep.outputs['X'], False)
    a = mth(nt, 'MULTIPLY', inside, 40.0)
    rim = mth(nt, 'SUBTRACT', 1.0, mth(nt, 'MULTIPLY', inside, 9.0))         # 1 at the eaten edge, 0 a little way in
    veins = nt.nodes.new('ShaderNodeTexVoronoi')
    veins.feature = 'DISTANCE_TO_EDGE'
    veins.inputs['Scale'].default_value = 1.1
    nt.links.new(tc.outputs['Object'], veins.inputs['Vector'])
    vein = mth(nt, 'MULTIPLY', mth(nt, 'SUBTRACT', 0.05, veins.outputs['Distance']), 8.0)
    lit = mth(nt, 'MAXIMUM', rim, mth(nt, 'MULTIPLY', vein, 0.45))
    col = ramp(nt, lit, [(0.0, (0.012, 0.0, 0.035, 1)), (0.3, (0.1, 0.02, 0.26, 1)), (0.55, (0.36, 0.1, 0.8, 1)), (0.8, (0.68, 0.4, 1.0, 1)), (1.0, (0.93, 0.82, 1.0, 1))])
    glow(nt, col.outputs['Color'], a, 1.3)
    return m


class Membrane:
    """A wing's skin between its ribs: a fan from the wing's root out to an edge that runs rib tip to rib tip, sagging inward between
    them (a bat's scallops). Redrawn each frame as the ribs move."""
    SUB = 6

    def __init__(self, m, ribs):
        self.k = (ribs - 1) * self.SUB + 1
        me = bpy.data.meshes.new('membrane')
        me.from_pydata([(0, 0, 0)] * (self.k + 1), [], [(0, j + 1, j + 2) for j in range(self.k - 1)])
        uv = me.uv_layers.new(name='uv')
        for poly in me.polygons:
            for li in poly.loop_indices:
                uv.data[li].uv = (0.0 if me.loops[li].vertex_index == 0 else 1.0, 0.5)
        self.ob = bpy.data.objects.new('membrane', me)
        bpy.context.scene.collection.objects.link(self.ob)
        self.ob.data.materials.append(m)
        tint(self.ob, 0)

    def hide(self):
        for v in self.ob.data.vertices:
            v.co = (0, 0, -50)

    def draw(self, root, tips, i, gone):
        """`root` (a, z) and each rib's (angle, length); the skin lies a little behind the ribs."""
        def put(v, a, z):
            x, y = at(a, -0.25)
            v.co = (x, y, z)
        vs = self.ob.data.vertices
        put(vs[0], root[0], root[1])
        n = 1
        for r in range(len(tips) - 1):
            (a0, l0), (a1, l1) = tips[r], tips[r + 1]
            for q in range(self.SUB + (1 if r == len(tips) - 2 else 0)):
                t = q / self.SUB
                ang = a0 + (a1 - a0) * t
                ln = (l0 + (l1 - l0) * t) * (1 - 0.2 * math.sin(t * math.pi)) * (1 + 0.015 * math.sin(i * 1.7 + n))
                put(vs[n], root[0] + math.cos(ang) * ln, root[1] + math.sin(ang) * ln)
                n += 1
        self.ob.data.update()
        tint(self.ob, gone)


def sigil_image(path, size=512):
    """Vaelkhar's mark, white on black: a ring, a crown of eight horns curving outside it, claw strokes inward, and a slit eye."""
    from PIL import Image, ImageDraw, ImageFilter
    im = Image.new('L', (size * 2, size * 2), 0)
    d = ImageDraw.Draw(im)
    c = size
    d.ellipse((c - size * 0.78, c - size * 0.78, c + size * 0.78, c + size * 0.78), outline=255, width=22)
    d.ellipse((c - size * 0.56, c - size * 0.56, c + size * 0.56, c + size * 0.56), outline=255, width=10)
    for i in range(8):                                                      # the horns: curved points outside the ring
        a = i / 8 * math.tau + math.pi / 8
        pts = [(c + math.cos(a - 0.16) * size * 0.78, c + math.sin(a - 0.16) * size * 0.78), (c + math.cos(a + 0.1) * size * 0.9, c + math.sin(a + 0.1) * size * 0.9), (c + math.cos(a + 0.3) * size * 0.99, c + math.sin(a + 0.3) * size * 0.99), (c + math.cos(a + 0.12) * size * 0.78, c + math.sin(a + 0.12) * size * 0.78)]
        d.polygon(pts, fill=255)
    for i in range(8):                                                      # the claws: strokes from the ring toward the eye, hooked
        a = i / 8 * math.tau
        d.line((c + math.cos(a) * size * 0.56, c + math.sin(a) * size * 0.56, c + math.cos(a + 0.22) * size * 0.34, c + math.sin(a + 0.22) * size * 0.34), fill=255, width=14)
    eye = [(c - size * 0.3, c), (c, c - size * 0.13), (c + size * 0.3, c), (c, c + size * 0.13)]
    d.line(eye + [eye[0]], fill=255, width=14, joint='curve')
    d.polygon([(c, c - size * 0.11), (c + size * 0.035, c), (c, c + size * 0.11), (c - size * 0.035, c)], fill=255)
    im.filter(ImageFilter.GaussianBlur(3)).resize((size, size), Image.LANCZOS).save(path)


def sigil():
    sc, n = scene('sigil')
    dark, clock = P.hero_fire(DARK)
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
    col = ramp(gnt, hot, [(0.0, (0.1, 0.02, 0.22, 1)), (0.3, (0.32, 0.08, 0.7, 1)), (0.6, (0.6, 0.3, 1.0, 1)), (0.85, (0.85, 0.7, 1.0, 1)), (1.0, (1, 0.95, 1, 1))])
    ga = mth(gnt, 'MULTIPLY', mth(gnt, 'MULTIPLY', mth(gnt, 'MULTIPLY', gimg.outputs['Color'], 1.8), shown), alpha)
    glow(gnt, col.outputs['Color'], ga, 1.3)
    bpy.ops.mesh.primitive_plane_add(size=1)
    pl = bpy.context.object
    pl.scale = (5.0, 5.0, 1)
    pl.location = (0, 0, 0.02)
    pl.data.materials.append(gm)
    licks = [(cone(dark), (i + rnd.uniform(-0.3, 0.3)) / 14 * math.tau, rnd.uniform(0.5, 1.0), rnd.uniform(0, 6)) for i in range(14)]

    def step(i):
        clock.outputs[0].default_value = i * 0.3
        d = ease(clamp((i + 1) / 12))
        cool = seg(i, 14, 21)
        drawn.outputs[0].default_value = d
        heat.outputs[0].default_value = (0.6 + 0.4 * seg(i, 8, 12)) * (1 - 0.8 * cool) + (0.05 if i % 2 else 0)
        alpha.outputs[0].default_value = 1 - seg(i, 18, 22)
        for o, a, s, ph in licks:
            lit = seg(d * 1.12, a / math.tau * 0.62 + 0.02, a / math.tau * 0.62 + 0.12)
            k = lit * s * (0.8 + 0.25 * math.sin(i * 2.1 + ph))
            flame(o, math.cos(a + math.pi) * 1.95, math.sin(a + math.pi) * 1.95, 0.2 * k, 0.95 * k, 0.12 * math.sin(i + ph), ph)
            tint(o, seg(i, 14, 18) if lit > 0 else 1, 0.25)

    render(sc, 'sigil', n, step)


def pillar():
    """A tear in the air: a thread, a black lens with violet fire along its lips, shadow pouring from its foot, then it snaps shut."""
    sc, n = scene('pillar')
    dark, clock = P.hero_fire(DARK)
    murk, mclock = N.mist_mat(MURK)
    lens = ball(None, dark, sub=4)
    lips = [(cone(dark), k / 30, s, rnd.uniform(0.7, 1.5), rnd.uniform(0, 6)) for k in range(31) for s in (-1, 1)]
    pour = [(cone(dark), i / 14 * math.tau + rnd.uniform(-0.2, 0.2), rnd.uniform(1.6, 3.2)) for i in range(14)]
    puffs = [(ball(None, murk, sub=3), rnd.uniform(0, math.tau), rnd.uniform(0.8, 1.3), rnd.uniform(0, 0.3)) for _ in range(8)]
    for o, *_ in puffs:
        tint(o, 1)
    vi, _ = flat_mat((0.75, 0.5, 1.0, 1), 2.2)
    motes = [(ball(None, vi, sub=1, smooth=False), rnd.uniform(-2.8, 2.8), rnd.uniform(0.5, 10.5), rnd.uniform(0, 0.6)) for _ in range(34)]

    def step(i):
        clock.outputs[0].default_value = i * 0.4
        mclock.outputs[0].default_value = i * 0.25
        tall = out3(seg(i, -0.5, 1.6))                                       # it rips upward in two frames
        wide = out3(seg(i, 1, 4)) * (1 - seg(i, 11, 13.5) ** 2)              # opens, holds, snaps shut
        half = 0.12 + 1.25 * wide
        H = 11.6 * tall * (1 - 0.9 * seg(i, 13, 15.5))
        x, y = at(0)
        lens.location = (x, y, 0.3 + H / 2)
        lens.scale = (half * D[0] + 0.05, half * D[1] + 0.05, max(0.01, H / 2))
        lens.rotation_euler = (0, 0, 0)
        # (a lens seen face on: wide along the screen, thin toward the camera)
        lens.scale = (half, half, max(0.01, H / 2))
        lens.rotation_euler = (0, 0, math.atan2(D[1], D[0]))
        lens.scale = (half, 0.08, max(0.01, H / 2))
        tint(lens, 1 if H <= 0.05 else 0.0, 1.0)
        for o, u, s, ln, ph in lips:
            # (flames along the two lips, pointing outward and a little up, longest at the middle)
            z = 0.3 + H * u
            edge = half * math.sin(u * math.pi) ** 0.6
            k = (0.5 + 0.5 * math.sin(u * math.pi)) * (0.75 + 0.3 * math.sin(i * 2.3 + ph)) * (0.25 + 0.75 * wide)
            if H <= 0.05:
                o.scale = (0, 0, 0)
                continue
            point(o, s * edge, z, math.pi / 2 - s * (1.05 - 0.25 * math.sin(i * 1.7 + ph)), ln * k * 1.5, 0.22 * (0.4 + 0.6 * wide))
            tint(o, seg(i, 12.5, 15.5), 0.3)
        b = seg(i, 0.5, 5)
        for o, a, ln in pour:
            g = out3(b)
            f = seg(i, 5, 10)
            o.scale = (0.34 * (1 - 0.5 * b), 0.34 * (1 - 0.5 * b), max(0.01, ln * g))
            o.rotation_euler = (0, 1.3, a)
            o.location = (math.cos(a) * (0.5 + ln * g * 0.5), math.sin(a) * (0.5 + ln * g * 0.5), 0.3)
            tint(o, 1 if b <= 0 else f ** 1.4, 0.3)
        for o, a, s, lag in puffs:
            g = seg(i, 1 + lag * 4, 12)
            rr = s * (0.5 + 1.3 * g)
            o.location = (math.cos(a) * (0.6 + 2.0 * g), math.sin(a) * (0.6 + 2.0 * g), 0.5 + 0.6 * g)
            o.scale = (rr, rr, rr * 0.55)
            tint(o, 1 if g <= 0 or g >= 1 else max(g ** 1.6, 1 - seg(g, 0, 0.15)))
        for o, a, z, late in motes:
            # (motes drawn in to the tear from either side while it is open)
            g = seg(i / 15, 0.15 + late * 0.5, 0.5 + late * 0.5)
            kk = 0.055 * math.sin(g * math.pi) ** 0.5 if 0 < g < 1 else 0
            x2, y2 = at(a * (1 - g))
            o.location = (x2, y2, z)
            o.scale = (kk, kk, kk)

    render(sc, 'pillar', n, step)


def explosion():
    """The maw and the wings: it opens, two wings of dark sweep out across the foes' side and stand, then it drains them back in."""
    sc, n = scene('explosion')
    dark, clock = P.hero_fire(DARK)
    murk, mclock = N.mist_mat(MURK)
    maw = ball(None, dark, sub=4)
    teeth = [(cone(dark), k / 22 * math.tau, rnd.uniform(0.8, 1.5), rnd.uniform(0, 6)) for k in range(22)]
    # each wing: six ribs (long cones of black fire, the leading one longest) with a membrane stretched between them
    RIBS = 6
    wings = [(s, [(cone(dark), j / (RIBS - 1), (11.5 - 3.6 * j / (RIBS - 1)) * rnd.uniform(0.95, 1.05), rnd.uniform(0.3, 0.42), rnd.uniform(0, 6)) for j in range(RIBS)], Membrane(membrane_mat(), RIBS)) for s in (-1, 1)]
    puffs = [(ball(None, murk, sub=3), rnd.uniform(-5.2, 5.2), rnd.uniform(0.8, 1.3), rnd.uniform(0, 0.3)) for _ in range(14)]
    for o, *_ in puffs:
        tint(o, 1)
    vi, _ = flat_mat((0.78, 0.55, 1.0, 1), 2.2)
    wh, _ = flat_mat((0.97, 0.9, 1.0, 1), 2.6)
    drawn_in = [(ball(None, vi if k % 4 else wh, sub=1, smooth=False), rnd.uniform(0, math.pi), rnd.uniform(4.5, 8.5), rnd.uniform(0, 0.55)) for k in range(80)]
    spark = ball(None, wh, sub=2)

    def step(i):
        clock.outputs[0].default_value = i * 0.42
        mclock.outputs[0].default_value = i * 0.25
        opened = out3(seg(i, -0.5, 2.5))
        drain = seg(i, 8.5, 14)                                              # the maw draining: everything is pulled back in
        shut = seg(i, 13, 15.2)
        r = (0.5 + 2.3 * opened) * (1 + 0.25 * math.sin(seg(i, 8.5, 12) * math.pi)) * (1 - shut)
        x, y = at(0)
        maw.location = (x, y, 1.9)
        maw.rotation_euler = (0, 0, math.atan2(D[1], D[0]))
        maw.scale = (r, 0.3, r * 0.92)
        tint(maw, 1 if r <= 0.02 else 0.0, 1.0)
        for o, a, ln, ph in teeth:
            # (violet fire round its rim: thrown outward as it opens, bent inward as it drains)
            k = (0.7 + 0.35 * math.sin(i * 2.4 + ph)) * (1 - shut)
            inward = seg(i, 8.5, 10.5)
            ang = a + math.pi * inward
            rim = r * (1.0 if inward < 0.5 else 0.95)
            if r <= 0.02:
                o.scale = (0, 0, 0)
                continue
            point(o, math.cos(a) * rim, 1.9 + math.sin(a) * rim * 0.92, ang, ln * k * (1.6 - 0.7 * inward), 0.3)
            tint(o, 0.0, 0.1)
        fold = drain ** 1.5
        for s, ribs, skin in wings:
            root = (s * 1.2 * (1 - fold), 1.7)
            tips = []
            for o, u, ln, w, ph in ribs:
                sweep = out3(seg(i, 1.5 + u * 1.2, 5.5 + u * 1.2))            # they sweep out, the leading rib first
                theta = (0.1 + (1.2 - 1.05 * u) * sweep) * (1 - 0.75 * fold)  # from upright to spread; folding as they are dragged in
                length = ln * (0.25 + 0.75 * sweep) * (1 - 0.92 * fold) * (0.96 + 0.05 * math.sin(i * 2.0 + ph))
                tips.append((math.pi / 2 - s * theta, length))
                if i < 1.5 or length < 0.2:
                    o.scale = (0, 0, 0)
                    continue
                point(o, root[0], root[1], math.pi / 2 - s * theta, length, w * (1 - 0.6 * fold))
                tint(o, 0.9 * fold ** 2, 0.3)
            if i < 1.5 or max(t[1] for t in tips) < 0.3:
                skin.hide()
            else:
                skin.draw(root, tips, i, 0.9 * fold ** 2)
        for o, a, s, lag in puffs:
            g = seg(i, 3 + lag * 5, 9.5)
            pull = seg(i, 9.5, 14)
            if g <= 0 or pull >= 1:
                o.scale = (0, 0, 0)
                continue
            q = s * (0.5 + 0.9 * g) * (1 - 0.8 * pull)
            x2, y2 = at(a * (1 - pull), 0.8)
            o.location = (x2, y2, 0.6 + 0.4 * g + 1.2 * pull)
            o.scale = (q, q, q * 0.6)
            tint(o, max(pull ** 2, 1 - seg(g, 0, 0.15)))
        for o, a, far, late in drawn_in:
            g = seg(i, 8.3 + late * 5, 11.3 + late * 5)
            kk = 0.07 * math.sin(g * math.pi) ** 0.5 if 0 < g < 1 else 0
            rad = far * (1 - g) ** 1.3
            x2, y2 = at(math.cos(a) * rad)
            o.location = (x2, y2, 1.9 + math.sin(a) * rad * 0.8)
            o.scale = (kk, kk, kk)
        k = seg(i, 13.8, 14.6) * (1 - seg(i, 14.8, 15.6))                      # the last spark as it closes
        spark.location = (x, y, 1.9)
        spark.scale = (0.9 * k, 0.9 * k, 0.9 * k)

    render(sc, 'explosion', n, step)


def cracks():
    """The rift on the ground: jagged tears racing out with a violet ring, then lying black."""
    sc, n = scene('cracks')
    from PIL import Image, ImageDraw, ImageFilter
    path = os.path.join(OUT, 'rift-mask.png')
    size = 768
    im = Image.new('L', (size, size), 0)
    d = ImageDraw.Draw(im)
    r0 = random.Random(131)
    def tear(x, y, ang, ln, w):
        while ln > 0 and w >= 1.5:
            stepl = r0.uniform(18, 40)
            ang += r0.uniform(-0.45, 0.45)
            nx, ny = x + math.cos(ang) * stepl, y + math.sin(ang) * stepl
            d.line((x, y, nx, ny), fill=255, width=int(round(w)))
            if r0.random() < 0.22 and w > 4:
                tear(nx, ny, ang + r0.choice((-1, 1)) * r0.uniform(0.5, 1.0), ln * 0.45, w * 0.5)
            x, y, ln, w = nx, ny, ln - stepl, w * 0.9
    for i in range(6):                                                      # few and wide, and longest along the screen: a rift, not a web
        a = i / 6 * math.tau + r0.uniform(-0.2, 0.2)
        tear(size / 2, size / 2, a, r0.uniform(260, 370), r0.uniform(20, 28))
    d.polygon([(size / 2 - 60, size / 2), (size / 2, size / 2 - 26), (size / 2 + 60, size / 2), (size / 2, size / 2 + 26)], fill=255)
    im.filter(ImageFilter.GaussianBlur(1.4)).save(path)
    edge_path = os.path.join(OUT, 'rift-edge.png')
    Image.open(path).filter(ImageFilter.FIND_EDGES).filter(ImageFilter.GaussianBlur(2.2)).point(lambda v: min(255, v * 3)).save(edge_path)
    m, nt = mat('rift')
    img = image_node(nt, path)
    edge = image_node(nt, edge_path)
    tc = nt.nodes.new('ShaderNodeTexCoord')
    ln = nt.nodes.new('ShaderNodeVectorMath')
    ln.operation = 'LENGTH'
    nt.links.new(tc.outputs['Object'], ln.inputs[0])
    reach, heat, a_v, ring_r, ring_a = value(nt), value(nt, 1.0), value(nt, 1.0), value(nt), value(nt)
    dist = mth(nt, 'MULTIPLY', ln.outputs['Value'], 2.0)
    shown = mth(nt, 'MULTIPLY', mth(nt, 'SUBTRACT', reach, dist, False), 12.0)
    ring = mth(nt, 'MULTIPLY', mth(nt, 'SUBTRACT', 1.0, mth(nt, 'MULTIPLY', mth(nt, 'ABSOLUTE', mth(nt, 'SUBTRACT', dist, ring_r, False)), 20.0)), ring_a)
    # (black inside, violet along its lips while it is fresh)
    lit = mth(nt, 'MAXIMUM', mth(nt, 'MULTIPLY', edge.outputs['Color'], heat), ring)
    col = ramp(nt, lit, [(0.0, (0.008, 0.0, 0.02, 1)), (0.3, (0.3, 0.07, 0.65, 1)), (0.6, (0.62, 0.32, 1.0, 1)), (0.85, (0.88, 0.75, 1.0, 1)), (1.0, (1, 0.96, 1, 1))])
    body = mth(nt, 'MAXIMUM', mth(nt, 'MULTIPLY', img.outputs['Color'], 2.0), mth(nt, 'MULTIPLY', edge.outputs['Color'], heat))
    alpha = mth(nt, 'MAXIMUM', mth(nt, 'MULTIPLY', mth(nt, 'MULTIPLY', body, shown), a_v), ring)
    glow(nt, col.outputs['Color'], alpha, 1.3)
    bpy.ops.mesh.primitive_plane_add(size=1)
    pl = bpy.context.object
    pl.scale = (7.6, 7.6, 1)
    pl.data.materials.append(m)

    def step(i):
        reach.outputs[0].default_value = 0.12 + 1.0 * out3(seg(i, -0.5, 3))
        heat.outputs[0].default_value = 1 - 0.9 * seg(i, 2.5, 9)
        a_v.outputs[0].default_value = 1 - 0.55 * seg(i, 8, 11.5)
        ring_r.outputs[0].default_value = 0.1 + 0.95 * out3(seg(i, -0.5, 3.5))
        ring_a.outputs[0].default_value = 1 - seg(i, 1.5, 4)

    render(sc, 'cracks', n, step)


def fire():
    """A tile burning dark: black tongues with violet edges."""
    sc, n = scene('fire')
    dark, clock = P.hero_fire(DARK)
    tongues = [(cone(dark), x, y, r, h, ph) for x, y, r, h, ph in ((0.0, 0.0, 0.4, 3.0, 0.0), (0.38, -0.25, 0.3, 2.1, 1.3), (-0.4, 0.2, 0.32, 2.4, 2.6), (0.12, 0.4, 0.26, 1.7, 4.1), (-0.15, -0.42, 0.28, 1.9, 5.2), (0.55, 0.2, 0.24, 1.4, 0.7), (-0.6, -0.15, 0.24, 1.5, 3.4))]
    vi, _ = flat_mat((0.78, 0.55, 1.0, 1), 2.2)
    sparks = [(ball(None, vi, sub=1, smooth=False), rnd.uniform(-0.6, 0.6), rnd.uniform(-0.6, 0.6), rnd.uniform(1.8, 3.8), rnd.uniform(0, 0.5)) for _ in range(10)]

    def step(i):
        clock.outputs[0].default_value = i * 0.45
        up = out3(seg(i, -0.6, 2))
        die = seg(i, 8.5, 13.5)
        for o, x, y, r, h, ph in tongues:
            lick = 0.72 + 0.34 * math.sin(i * 2.6 + ph)
            flame(o, x, y, r * up * (1 - 0.35 * die) * (1.1 - 0.2 * lick), h * up * lick * (1 - 0.6 * die), 0.16 * math.sin(i * 1.7 + ph * 2), ph)
            tint(o, die ** 1.3, 0.38)
        for o, x, y, v, late in sparks:
            g = seg(i / 13, late, late + 0.5)
            k = 0.05 * math.sin(g * math.pi) ** 0.5 if 0 < g < 1 else 0
            o.location = (x, y, 0.4 + v * g)
            o.scale = (k, k, k)

    render(sc, 'fire', n, step)


def scorch():
    """A patch of blight, violet embers in it, fading."""
    sc, n = scene('scorch')
    from PIL import Image, ImageDraw, ImageFilter
    path = os.path.join(OUT, 'blight-blob.png')
    im = Image.new('L', (256, 256), 0)
    d = ImageDraw.Draw(im)
    r0 = random.Random(37)
    for _ in range(14):
        a, rr = r0.uniform(0, math.tau), r0.uniform(0, 52)
        r = r0.uniform(26, 58)
        d.ellipse((128 + math.cos(a) * rr - r, 128 + math.sin(a) * rr - r, 128 + math.cos(a) * rr + r, 128 + math.sin(a) * rr + r), fill=255)
    im.filter(ImageFilter.GaussianBlur(9)).save(path)
    sm, snt = mat('blight')
    simg = image_node(snt, path)
    stc = snt.nodes.new('ShaderNodeTexCoord')
    sno = snt.nodes.new('ShaderNodeTexNoise')
    sno.inputs['Scale'].default_value = 9.0
    sno.inputs['Detail'].default_value = 4
    snt.links.new(stc.outputs['Object'], sno.inputs['Vector'])
    a_v, live = value(snt, 1.0), value(snt, 1.0)
    sa = mth(snt, 'MULTIPLY', mth(snt, 'MULTIPLY', mth(snt, 'SUBTRACT', mth(snt, 'MULTIPLY', simg.outputs['Color'], mth(snt, 'ADD', 0.35, sno.outputs['Fac'])), 0.3), 3.0), a_v)
    em = mth(snt, 'MULTIPLY', mth(snt, 'MULTIPLY', mth(snt, 'SUBTRACT', sno.outputs['Fac'], 0.56), 7.0), live)
    col = ramp(snt, em, [(0.0, (0.01, 0.0, 0.025, 1)), (0.5, (0.4, 0.1, 0.8, 1)), (1.0, (0.8, 0.6, 1.0, 1))])
    glow(snt, col.outputs['Color'], sa, 1.0)
    bpy.ops.mesh.primitive_plane_add(size=1)
    pl = bpy.context.object
    pl.scale = (2.75, 2.75, 1)
    pl.data.materials.append(sm)
    looks = [(0.9, 1.0), (0.9, 0.9), (0.9, 0.7), (0.9, 0.45), (0.85, 0.2), (0.7, 0.0), (0.45, 0.0), (0.22, 0.0)]

    def step(i):
        a_v.outputs[0].default_value, live.outputs[0].default_value = looks[i]

    render(sc, 'scorch', n, step)


def smoke():
    """A column of dark smoke."""
    sc, n = scene('smoke')
    m, clock = N.mist_mat(MURK)
    puffs = [(ball(None, m, sub=3), rnd.uniform(-0.5, 0.5), rnd.uniform(-0.5, 0.5), rnd.uniform(0.8, 1.2), lag, rnd.uniform(0, math.tau)) for lag in (0.0, 0.06, 0.13, 0.2, 0.28, 0.36, 0.44)]

    def step(i):
        clock.outputs[0].default_value = i * 0.22
        for o, x, y, s, lag, ph in puffs:
            g = seg(i / (n - 1), lag, 0.72 + lag)
            r = s * (0.6 + 1.25 * g)
            o.location = (x * (1 + g) - 0.4 * g, y * (1 + g) + 0.3 * g, 0.7 + 4.4 * g * s)
            o.scale = (r, r, r * 0.85)
            o.rotation_euler = (0, 0, ph + i * 0.12)
            tint(o, 1 if g <= 0 else max(g ** 1.7, 1 - seg(g, 0, 0.1)))

    render(sc, 'smoke', n, step)


def embers():
    """Violet motes drawn upward: a loop."""
    sc, n = scene('embers')
    vi, _ = flat_mat((0.7, 0.42, 1.0, 1), 2.2)
    wh, _ = flat_mat((0.95, 0.85, 1.0, 1), 2.4)
    bits = [(ball(None, vi if k % 4 else wh, sub=1, smooth=False), rnd.uniform(-2.3, 2.3), rnd.uniform(0, 7.0), rnd.uniform(0, math.tau), rnd.uniform(0.03, 0.06), rnd.choice((1, 2, 2))) for k in range(48)]

    def step(i):
        t = i / n
        for o, x, z0, ph, r, turns in bits:
            z = (z0 + 7.0 * t * turns) % 7.0
            sway = 0.25 * math.sin(math.tau * t * turns + ph)
            o.location = ((x + sway) * math.sqrt(0.5), (x + sway) * math.sqrt(0.5), z)
            k = r * min(1.0, z / 0.6, (7.0 - z) / 0.6)
            o.scale = (k, k, k * 1.5)

    render(sc, 'embers', n, step)


if __name__ == '__main__':
    P.run({'sigil': sigil, 'pillar': pillar, 'explosion': explosion, 'cracks': cracks, 'fire': fire, 'scorch': scorch, 'smoke': smoke, 'embers': embers})
