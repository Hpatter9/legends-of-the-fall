"""Voltara the Copper Goddess's ground show in pieces, for the game (EIDOLON-BLENDER, docs/notes/eidolon-blender.md).

Run: python3 tools/blender-fx/eidolons/voltara_parts.py <out dir>      (PART=explosion picks some; then ID=voltara parts_finish.py)

Lightning: nothing solid, nothing that lingers. Jagged bolts that are redrawn every frame (so they flicker and fork anew), a hard white
core with a blue edge, copper sparks, and a moment of blinding light. The pieces take the same places in the call as Askel's:

  sigil      a coil and cog cut in light: rings, teeth, a six-pointed star of zigzags; arcs hop along its ring; then it dims
  pillar     the painted goddess's way in: the sky splits, a trunk of braided bolts from above the screen to the ground, forking,
             flickering thinner, gone; sparks thrown where it lands
  explosion  the blow: a thunderclap, a white ball of discharge with arcs flung from it, then forks walking out across the foes'
             whole side, each a bolt from the sky for two frames, arcs crackling along the ground between where they landed
  cracks     lies on the ground: the burn a bolt leaves, a branching figure racing out with a ring, white, then blue, then dark
  fire       a tile struck: a small bolt, then arcs crackling over it (the lead-in: the charge walking to the foes)
  scorch     a burnt star on the ground with sparks in it, fading
  smoke      a thin wisp of smoke
  embers     sparks falling, blue and copper (a loop)
"""
import math, os, random, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
import askel as A
import parts as P
import nivra_parts as N
from askel import ball, clamp, ease, flat_mat, glow, image_node, mat, mth, out3, ramp, seg, value
from parts import render, scene, tint

OUT = sys.argv[-1]
os.makedirs(OUT, exist_ok=True)
rnd = random.Random(83)

# The discharge's colours from its thin edge to its core: violet, blue, white.
STORM = [(0.2, (0.08, 0.04, 0.3, 1)), (0.27, (0.15, 0.2, 0.75, 1)), (0.35, (0.25, 0.5, 1.0, 1)), (0.46, (0.5, 0.78, 1.0, 1)), (0.58, (0.8, 0.93, 1.0, 1)), (0.74, (0.96, 0.99, 1.0, 1)), (0.88, (1, 1, 1, 1))]
WISP = [(0.25, (0.1, 0.1, 0.16, 1)), (0.45, (0.25, 0.26, 0.36, 1)), (0.7, (0.45, 0.48, 0.6, 1))]
D = (math.sqrt(0.5), math.sqrt(0.5))                                        # along the screen
E = (math.sqrt(0.5), -math.sqrt(0.5))                                       # toward the camera


BOLT = [(0.0, (0.1, 0.12, 0.75, 1)), (0.3, (0.2, 0.42, 1.0, 1)), (0.5, (0.5, 0.8, 1.0, 1)), (0.68, (0.9, 0.97, 1.0, 1)), (0.8, (1, 1, 1, 1))]


def bolt_mat(stops=BOLT):
    """A bolt: white down its middle, blue at its edges, see-through beyond (`stops`: its colours from edge to middle; a ray of
    light takes gold). An object's red is how far it has faded."""
    m, nt = mat('bolt')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(tc.outputs['UV'], sep.inputs[0])
    info = nt.nodes.new('ShaderNodeObjectInfo')
    rgb = nt.nodes.new('ShaderNodeSeparateColor')
    nt.links.new(info.outputs['Color'], rgb.inputs[0])
    off = mth(nt, 'ABSOLUTE', mth(nt, 'SUBTRACT', sep.outputs['Y'], 0.5, False))
    core = mth(nt, 'SUBTRACT', 1.0, mth(nt, 'MULTIPLY', off, 2.0))
    hot = mth(nt, 'POWER', core, 1.3)
    # (solid out to its edge, so the blue rim survives being cut to hard pixels)
    a = mth(nt, 'MULTIPLY', mth(nt, 'MULTIPLY', mth(nt, 'POWER', core, 0.25), 3.0), mth(nt, 'SUBTRACT', 1.0, rgb.outputs['Red']))
    col = ramp(nt, hot, stops)
    glow(nt, col.outputs['Color'], a, 1.6)
    return m


class Bolt:
    """A jagged strip of light in the plane that faces the camera, redrawn whenever it is asked to be."""

    def __init__(self, m, seg_n=14):
        self.n = seg_n
        me = bpy.data.meshes.new('bolt')
        verts = [(0, 0, 0)] * (2 * (seg_n + 1))
        faces = [(i * 2, i * 2 + 1, i * 2 + 3, i * 2 + 2) for i in range(seg_n)]
        me.from_pydata(verts, [], faces)
        uv = me.uv_layers.new(name='uv')
        for poly in me.polygons:
            for li in poly.loop_indices:
                vi = me.loops[li].vertex_index
                uv.data[li].uv = ((vi // 2) / seg_n, vi % 2)
        self.ob = bpy.data.objects.new('bolt', me)
        bpy.context.scene.collection.objects.link(self.ob)
        self.ob.data.materials.append(m)
        tint(self.ob, 1)

    def hide(self):
        for v in self.ob.data.vertices:
            v.co = (0, 0, -50)
        tint(self.ob, 1)

    def draw(self, r, a0, z0, a1, z1, width, jag, depth=0.0, fade=0.0):
        """From (a0, z0) to (a1, z1) (`a` along the screen, `z` up), `jag` wide in its kinks, thinning toward its far end."""
        dx, dz = a1 - a0, z1 - z0
        ln = math.hypot(dx, dz) or 1
        nx, nz = -dz / ln, dx / ln                                           # across it
        for i in range(self.n + 1):
            u = i / self.n
            k = 0 if i in (0, self.n) or not jag else r.uniform(-jag, jag)   # (no kinks: a straight ray)
            ca, cz = a0 + dx * u + nx * k, z0 + dz * u + nz * k
            w = width * (1 - 0.6 * u)
            for s, side in enumerate((-1, 1)):
                aa, zz = ca + nx * w * side, cz + nz * w * side
                self.ob.data.vertices[i * 2 + s].co = (aa * D[0] + depth * E[0], aa * D[1] + depth * E[1], zz)
        self.ob.data.update()
        tint(self.ob, fade)


def strike(r, bolts, a, top, width, jag, forks=2, depth=0.0, fade=0.0, lean=0.0):
    """A bolt from the sky down to (a, 0), with forks off it; uses the first `1 + forks` of `bolts`."""
    a_top = a + lean + r.uniform(-0.8, 0.8)
    bolts[0].draw(r, a_top, top, a, 0.0, width, jag, depth, fade)
    for k in range(1, len(bolts)):
        if k > forks:
            bolts[k].hide()
            continue
        u = r.uniform(0.2, 0.7)
        fa, fz = a_top + (a - a_top) * u, top * (1 - u)
        side = r.choice((-1, 1))
        bolts[k].draw(r, fa, fz, fa + side * r.uniform(0.8, 2.2), fz - r.uniform(1.0, 2.6), width * 0.5, jag * 0.7, depth, fade)


def sigil_image(path, size=512):
    """Voltara's mark, white on black: a ring of cog teeth, a coil of two rings, and a six-pointed star of zigzags."""
    from PIL import Image, ImageDraw, ImageFilter
    im = Image.new('L', (size * 2, size * 2), 0)
    d = ImageDraw.Draw(im)
    c = size
    d.ellipse((c - size * 0.9, c - size * 0.9, c + size * 0.9, c + size * 0.9), outline=255, width=22)
    for i in range(20):                                                     # the teeth
        a = i / 20 * math.tau
        pts = [(c + math.cos(a + da) * size * rr, c + math.sin(a + da) * size * rr) for da, rr in ((-0.07, 0.9), (-0.05, 0.99), (0.05, 0.99), (0.07, 0.9))]
        d.polygon(pts, fill=255)
    for r, w in ((0.7, 12), (0.58, 12), (0.16, 12)):
        d.ellipse((c - size * r, c - size * r, c + size * r, c + size * r), outline=255, width=w)
    for i in range(6):
        a = i / 6 * math.tau
        pts = []
        for k in range(6):                                                  # a zigzag from the middle ring to the coil
            rr = 0.16 + (0.58 - 0.16) * k / 5
            aa = a + (0.09 if k % 2 else -0.09) * (1 if 0 < k < 5 else 0)
            pts.append((c + math.cos(aa) * size * rr, c + math.sin(aa) * size * rr))
        d.line(pts, fill=255, width=14, joint='curve')
    im.filter(ImageFilter.GaussianBlur(3)).resize((size, size), Image.LANCZOS).save(path)


def sigil():
    sc, n = scene('sigil')
    bm = bolt_mat()
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
    # (copper where it is dull, blue-white where it is live)
    col = ramp(gnt, hot, [(0.0, (0.25, 0.1, 0.03, 1)), (0.3, (0.7, 0.35, 0.1, 1)), (0.55, (0.45, 0.65, 1.0, 1)), (0.8, (0.8, 0.93, 1.0, 1)), (1.0, (1, 1, 1, 1))])
    ga = mth(gnt, 'MULTIPLY', mth(gnt, 'MULTIPLY', mth(gnt, 'MULTIPLY', gimg.outputs['Color'], 1.8), shown), alpha)
    glow(gnt, col.outputs['Color'], ga, 1.3)
    bpy.ops.mesh.primitive_plane_add(size=1)
    pl = bpy.context.object
    pl.scale = (5.0, 5.0, 1)
    pl.location = (0, 0, 0.02)
    pl.data.materials.append(gm)
    arcs = [Bolt(bm, 6) for _ in range(6)]
    r = random.Random(5)

    def step(i):
        d = ease(clamp((i + 1) / 12))
        cool = seg(i, 14, 21)
        drawn.outputs[0].default_value = d
        heat.outputs[0].default_value = (0.62 + 0.38 * seg(i, 8, 12)) * (1 - 0.8 * cool) + (0.08 if i % 2 else 0)
        alpha.outputs[0].default_value = 1 - seg(i, 18, 22)
        for k, b in enumerate(arcs):
            # (little arcs standing up off the ring where it is live, in a new place every frame)
            if cool > 0.4 or r.random() > 0.35 + 0.5 * d:
                b.hide()
                continue
            a = r.uniform(0, math.tau * d)
            x, y = math.cos(a + math.pi) * 2.33, math.sin(a + math.pi) * 2.33
            along = x * D[0] + y * D[1]
            deep = x * E[0] + y * E[1]
            b.draw(r, along, 0.05, along + r.uniform(-0.5, 0.5), r.uniform(0.5, 1.2), 0.1, 0.12, deep)

    render(sc, 'sigil', n, step)


def pillar():
    sc, n = scene('pillar')
    bm = bolt_mat()
    storm, clock = P.hero_fire(STORM)
    trunk = [[Bolt(bm, 20) for _ in range(4)] for _ in range(4)]             # four bolts braided, each with forks
    core = ball(None, storm, sub=3)
    burst = [(P.cone(storm), i / 12 * math.tau + rnd.uniform(-0.2, 0.2), rnd.uniform(1.6, 3.0)) for i in range(12)]
    glowcol = ball(None, storm, sub=3)                                       # the air left glowing where it came down
    sp, _ = flat_mat((0.75, 0.9, 1.0, 1), 2.4)
    cu, _ = flat_mat((1.0, 0.62, 0.25, 1), 2.0)
    sparks = P.debris(sp, 26, (1.2, 4.0), (4.0, 10.0)) + P.debris(cu, 16, (1.0, 3.5), (3.0, 9.0))
    r = random.Random(17)

    def step(i):
        clock.outputs[0].default_value = i * 0.4
        # how many of the four are alive and how thick: one thin leader, then all of it, then flickering thinner, then gone
        live = [1, 4, 4, 4, 3, 3, 2, 3, 2, 2, 1, 2, 1, 1, 1, 0][i]
        thick = [0.2, 0.85, 0.8, 0.7, 0.5, 0.46, 0.36, 0.4, 0.3, 0.26, 0.2, 0.2, 0.14, 0.12, 0.09, 0.0][i]
        for k, bolts in enumerate(trunk):
            if k >= live:
                for b in bolts:
                    b.hide()
                continue
            strike(r, bolts, r.uniform(-0.25, 0.25), 12.5, thick * (1 if k == 0 else 0.6), 0.5 + 0.25 * k, forks=3 if i < 9 else 1, depth=(k - 1.5) * 0.2, fade=seg(i, 11, 16))
        k = 1 - seg(i, 2, 6)
        up = out3(seg(i, 0.3, 2))
        core.scale = (1.5 * k * up, 1.5 * k * up, 1.2 * up * k)
        core.location = (0, 0, 0.9 * up)
        tint(core, 1 - k, 0.8)
        b2 = seg(i, 0.6, 4.5)
        for o, a, ln in burst:
            g = out3(b2)
            o.scale = (0.3 * (1 - b2), 0.3 * (1 - b2), max(0.01, ln * g))
            o.rotation_euler = (0, 1.25, a)
            o.location = (math.cos(a) * (0.7 + ln * g * 0.5), math.sin(a) * (0.7 + ln * g * 0.5), 0.35)
            tint(o, 1 if b2 <= 0 else b2 ** 1.5, 0.8 * (1 - b2))
        g = seg(i, 1, 3) * (1 - seg(i, 6, 14))
        glowcol.scale = (0.5 * g, 0.5 * g, 6.0)
        glowcol.location = (0, 0, 6.0)
        tint(glowcol, 1 - 0.55 * g, 0.2)
        P.throw(sparks, seg(i, 1, 12), 8.0)

    render(sc, 'pillar', n, step)


def explosion():
    sc, n = scene('explosion')
    bm = bolt_mat()
    storm, clock = P.hero_fire(STORM)
    wisp, wclock = N.mist_mat(WISP)
    core = ball(None, storm, sub=4)
    flung = [Bolt(bm, 8) for _ in range(18)]                                 # arcs flung from the ball of discharge
    # the forks walk outward: where each lands and when (the nearest the middle first, both sides)
    spots = [s * (0.7 + 1.15 * k) for k in range(5) for s in (-1, 1)]
    forks = [[Bolt(bm, 18) for _ in range(3)] for _ in spots]
    twins = [[Bolt(bm, 16) for _ in range(2)] for _ in spots]             # a second, thinner bolt beside each
    feet = [ball(None, storm, sub=3) for _ in spots]
    crackle = [Bolt(bm, 7) for _ in range(22)]                               # along the ground between where they landed
    puffs = [(ball(None, wisp, sub=3), rnd.uniform(-5.0, 5.0), rnd.uniform(0.35, 0.6), rnd.uniform(0, 0.3)) for _ in range(6)]
    for o, *_ in puffs:
        tint(o, 1)
    sp, _ = flat_mat((0.75, 0.9, 1.0, 1), 2.4)
    cu, _ = flat_mat((1.0, 0.62, 0.25, 1), 2.0)
    sparks = P.debris(sp, 46, (2.0, 8.0), (3.0, 11.0)) + P.debris(cu, 26, (1.5, 7.0), (3.0, 10.0))
    r = random.Random(29)

    def step(i):
        clock.outputs[0].default_value = i * 0.45
        wclock.outputs[0].default_value = i * 0.25
        # the thunderclap: a white ball blown out in two frames, arcs flung from it
        c = out3(seg(i, -0.5, 2))
        gone = seg(i, 2, 4.5)
        rr = (0.6 + 3.2 * c) * (1 - 0.3 * gone)
        core.scale = (rr, rr, rr * 0.9)
        core.location = (0, 0, 1.3 + 0.8 * c)
        tint(core, 0.12 + 0.88 * gone ** 1.3, 0.12)                         # (torn and blue at its edge, never a plain white disc)
        for k, b in enumerate(flung):
            if i > 5:
                b.hide()
                continue
            ang = (k + r.uniform(-0.3, 0.3)) / len(flung) * math.pi
            reach = (2.5 + 4.0 * c) * r.uniform(0.7, 1.15)
            b.draw(r, math.cos(ang) * 0.8, 1.5 + math.sin(ang) * 0.8, math.cos(ang) * reach, 1.5 + math.sin(ang) * reach, 0.32 * (1 - 0.5 * gone), 0.4, 0.0, seg(i, 3, 6))
        # the forks, walking out from the middle: each a bolt from the sky for three frames, re-forked each
        landed = []
        for k, (a, bolts, foot) in enumerate(zip(spots, forks, feet)):
            at_i = 2.2 + abs(a) * 1.25
            age = i - at_i
            if 0 <= age < 4:
                strike(r, bolts, a, 9.6, 0.46 * (1 - 0.2 * age), 0.6, forks=2, depth=0.2 * (k % 3 - 1), fade=0.0, lean=-0.6 * (1 if a > 0 else -1))
            else:
                for b in bolts:
                    b.hide()
            if 0 <= age < 3:
                strike(r, twins[k], a + r.uniform(-0.5, 0.5), 9.6, 0.3, 0.6, forks=1, depth=0.3, fade=0.0, lean=0.7 * (1 if a > 0 else -1))
            else:
                for b in twins[k]:
                    b.hide()
            if age >= 0:
                landed.append(a)
            # (a flash where it lands, dying behind it)
            f = seg(age, 0, 0.6) * (1 - seg(age, 0.8, 4))
            foot.scale = (1.25 * f, 1.25 * f, 0.75 * f)
            foot.location = (a * D[0], a * D[1], 0.55 * f)
            tint(foot, 1 if f <= 0 else 1 - 0.85 * f, 0.3)
        for b in crackle:
            # (the ground between them goes on crackling, a new arc in a new place each frame, fewer as it dies)
            if len(landed) < 2 or r.random() > 0.85 - seg(i, 9, 15.5):
                b.hide()
                continue
            a0 = r.choice(landed) + r.uniform(-0.5, 0.5)
            b.draw(r, a0, r.uniform(0.1, 0.5), a0 + r.uniform(-1.8, 1.8), r.uniform(0.2, 2.0), 0.17, 0.28, r.uniform(-0.6, 0.6), seg(i, 11, 16))
        for o, a, s, lag in puffs:
            g = seg(i, 6 + lag * 6, 16.5)
            if g <= 0 or g >= 1:
                o.scale = (0, 0, 0)
                continue
            q = s * (0.5 + 1.0 * g)
            o.location = (a * D[0], a * D[1], 0.8 + 3.2 * g)
            o.scale = (q * 0.7, q * 0.7, q * 1.2)
            tint(o, max(g ** 1.5, 1 - seg(g, 0, 0.15)))
        P.throw(sparks, seg(i, 0.5, 15), 8.0)

    render(sc, 'explosion', n, step)


def cracks():
    """The burn a bolt leaves: a branching figure racing out with a ring, white, then blue, then dark."""
    sc, n = scene('cracks')
    from PIL import Image, ImageDraw, ImageFilter
    path = os.path.join(OUT, 'burn-mask.png')
    size = 768
    im = Image.new('L', (size, size), 0)
    d = ImageDraw.Draw(im)
    r0 = random.Random(91)
    def branch(x, y, ang, ln, w):
        while ln > 0 and w >= 1:
            stepl = r0.uniform(10, 24)
            ang += r0.uniform(-0.5, 0.5)
            nx, ny = x + math.cos(ang) * stepl, y + math.sin(ang) * stepl
            d.line((x, y, nx, ny), fill=255, width=max(1, int(round(w))))
            if r0.random() < 0.3 and w > 1.5:
                branch(nx, ny, ang + r0.choice((-1, 1)) * r0.uniform(0.4, 1.0), ln * 0.6, w * 0.65)
            x, y, ln, w = nx, ny, ln - stepl, w * 0.95
    for i in range(16):
        a = i / 16 * math.tau + r0.uniform(-0.15, 0.15)
        branch(size / 2, size / 2, a, r0.uniform(220, 360), r0.uniform(5, 8))
    d.ellipse((size / 2 - 20, size / 2 - 20, size / 2 + 20, size / 2 + 20), fill=255)
    im.filter(ImageFilter.GaussianBlur(1.0)).save(path)
    m, nt = mat('burn')
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
    ring = mth(nt, 'MULTIPLY', mth(nt, 'SUBTRACT', 1.0, mth(nt, 'MULTIPLY', mth(nt, 'ABSOLUTE', mth(nt, 'SUBTRACT', dist, ring_r, False)), 22.0)), ring_a)
    col = ramp(nt, mth(nt, 'MAXIMUM', hot, ring), [(0.0, (0.02, 0.02, 0.05, 1)), (0.22, (0.1, 0.12, 0.5, 1)), (0.45, (0.25, 0.5, 1.0, 1)), (0.65, (0.6, 0.85, 1.0, 1)), (0.85, (0.92, 0.98, 1.0, 1)), (1.0, (1, 1, 1, 1))])
    alpha = mth(nt, 'MAXIMUM', mth(nt, 'MULTIPLY', mth(nt, 'MULTIPLY', mth(nt, 'MULTIPLY', img.outputs['Color'], 2.2), shown), a_v), ring)
    glow(nt, col.outputs['Color'], alpha, 1.3)
    bpy.ops.mesh.primitive_plane_add(size=1)
    pl = bpy.context.object
    pl.scale = (7.6, 7.6, 1)
    pl.data.materials.append(m)

    def step(i):
        reach.outputs[0].default_value = 0.12 + 1.0 * out3(seg(i, -0.5, 2.2))
        heat.outputs[0].default_value = (1 - seg(i, 1.5, 8)) + (0.12 if i in (4, 6) else 0)   # (it gutters once or twice as it dies)
        a_v.outputs[0].default_value = 1 - 0.7 * seg(i, 8, 11.5)
        ring_r.outputs[0].default_value = 0.1 + 0.95 * out3(seg(i, -0.5, 2.8))
        ring_a.outputs[0].default_value = 1 - seg(i, 1.2, 3.2)

    render(sc, 'cracks', n, step)


def fire():
    """A tile struck: a small bolt from above, then arcs crackling over it."""
    sc, n = scene('fire')
    bm = bolt_mat()
    storm, clock = P.hero_fire(STORM)
    bolts = [Bolt(bm, 10) for _ in range(3)]
    arcs = [Bolt(bm, 6) for _ in range(5)]
    foot = ball(None, storm, sub=3)
    sp, _ = flat_mat((0.75, 0.9, 1.0, 1), 2.4)
    sparks = P.debris(sp, 10, (0.6, 1.8), (2.5, 5.5))
    r = random.Random(41)

    def step(i):
        clock.outputs[0].default_value = i * 0.4
        if i < 3:
            strike(r, bolts, 0.0, 3.9, 0.26 * (1 - 0.2 * i), 0.22, forks=2)
        else:
            for b in bolts:
                b.hide()
        f = seg(i, -0.3, 0.8) * (1 - seg(i, 1.5, 5))
        foot.scale = (0.75 * f, 0.75 * f, 0.5 * f)
        foot.location = (0, 0, 0.35 * f)
        tint(foot, 1 if f <= 0 else 1 - f, 0.8)
        for b in arcs:
            if i < 1 or r.random() > 0.9 - seg(i, 7, 13.5):
                b.hide()
                continue
            a0 = r.uniform(-0.6, 0.6)
            b.draw(r, a0, r.uniform(0.05, 0.4), a0 + r.uniform(-0.7, 0.7), r.uniform(0.3, 1.7), 0.1, 0.15, r.uniform(-0.4, 0.4), seg(i, 9, 14))
        P.throw(sparks, seg(i, 0, 9), 7.0)

    render(sc, 'fire', n, step)


def scorch():
    """A burnt star on the ground with sparks in it, fading."""
    sc, n = scene('scorch')
    from PIL import Image, ImageDraw, ImageFilter
    path = os.path.join(OUT, 'star-blob.png')
    im = Image.new('L', (256, 256), 0)
    d = ImageDraw.Draw(im)
    r0 = random.Random(23)
    for i in range(11):                                                     # a ragged star: a round with burnt rays
        a = i / 11 * math.tau + r0.uniform(-0.2, 0.2)
        ln = r0.uniform(60, 104)
        d.polygon([(128 + math.cos(a - 0.22) * 34, 128 + math.sin(a - 0.22) * 34), (128 + math.cos(a) * ln, 128 + math.sin(a) * ln), (128 + math.cos(a + 0.22) * 34, 128 + math.sin(a + 0.22) * 34)], fill=255)
    d.ellipse((128 - 46, 128 - 46, 128 + 46, 128 + 46), fill=255)
    im.filter(ImageFilter.GaussianBlur(5)).save(path)
    sm, snt = mat('star')
    simg = image_node(snt, path)
    stc = snt.nodes.new('ShaderNodeTexCoord')
    sno = snt.nodes.new('ShaderNodeTexNoise')
    sno.inputs['Scale'].default_value = 11.0
    sno.inputs['Detail'].default_value = 3
    snt.links.new(stc.outputs['Object'], sno.inputs['Vector'])
    a_v, live = value(snt, 1.0), value(snt, 1.0)
    sa = mth(snt, 'MULTIPLY', mth(snt, 'MULTIPLY', mth(snt, 'SUBTRACT', mth(snt, 'MULTIPLY', simg.outputs['Color'], mth(snt, 'ADD', 0.5, sno.outputs['Fac'])), 0.35), 3.5), a_v)
    sparks = mth(snt, 'MULTIPLY', mth(snt, 'MULTIPLY', mth(snt, 'SUBTRACT', sno.outputs['Fac'], 0.6), 9.0), live)
    col = ramp(snt, sparks, [(0.0, (0.015, 0.012, 0.02, 1)), (0.5, (0.2, 0.4, 1.0, 1)), (1.0, (0.85, 0.95, 1.0, 1))])
    glow(snt, col.outputs['Color'], sa, 1.0)
    bpy.ops.mesh.primitive_plane_add(size=1)
    pl = bpy.context.object
    pl.scale = (2.75, 2.75, 1)
    pl.data.materials.append(sm)
    looks = [(0.9, 1.0), (0.9, 0.6), (0.9, 0.9), (0.9, 0.4), (0.85, 0.2), (0.7, 0.0), (0.45, 0.0), (0.22, 0.0)]

    def step(i):
        a_v.outputs[0].default_value, live.outputs[0].default_value = looks[i]

    render(sc, 'scorch', n, step)


def smoke():
    """A thin wisp of smoke."""
    sc, n = scene('smoke')
    m, clock = N.mist_mat(WISP)
    puffs = [(ball(None, m, sub=3), rnd.uniform(-0.3, 0.3), rnd.uniform(-0.3, 0.3), rnd.uniform(0.6, 0.9), lag, rnd.uniform(0, math.tau)) for lag in (0.0, 0.1, 0.2, 0.32, 0.44)]

    def step(i):
        clock.outputs[0].default_value = i * 0.22
        for o, x, y, s, lag, ph in puffs:
            g = seg(i / (n - 1), lag, 0.72 + lag)
            r = s * (0.4 + 0.8 * g)
            o.location = (x + 0.5 * math.sin(g * 3 + ph), y, 0.6 + 4.4 * g)
            o.scale = (r * 0.8, r * 0.8, r * 1.3)
            o.rotation_euler = (0, 0, ph + i * 0.12)
            tint(o, 1 if g <= 0 else max(g ** 1.4, 1 - seg(g, 0, 0.1)))

    render(sc, 'smoke', n, step)


def embers():
    """Sparks falling, blue and copper: a loop."""
    sc, n = scene('embers')
    sp, _ = flat_mat((0.75, 0.9, 1.0, 1), 2.4)
    cu, _ = flat_mat((1.0, 0.62, 0.25, 1), 2.0)
    bits = [(ball(None, sp if k % 3 else cu, sub=1, smooth=False), rnd.uniform(-2.3, 2.3), rnd.uniform(0, 7.0), rnd.uniform(0, math.tau), rnd.uniform(0.03, 0.06), rnd.choice((1, 2, 2))) for k in range(48)]

    def step(i):
        t = i / n
        for o, x, z0, ph, r, turns in bits:
            z = (z0 - 7.0 * t * turns) % 7.0
            o.location = (x * math.sqrt(0.5), x * math.sqrt(0.5), z)
            k = r * min(1.0, z / 0.6, (7.0 - z) / 0.6) * (1.0 if (i + int(ph * 3)) % 3 else 0.5)   # (they wink as they fall)
            o.scale = (k, k, k * 1.6)

    render(sc, 'embers', n, step)


if __name__ == '__main__':
    P.run({'sigil': sigil, 'pillar': pillar, 'explosion': explosion, 'cracks': cracks, 'fire': fire, 'scorch': scorch, 'smoke': smoke, 'embers': embers})
