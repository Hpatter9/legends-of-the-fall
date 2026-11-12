"""Aurelan the Lion of Dawn's ground show in pieces, for the game (EIDOLON-BLENDER, docs/notes/eidolon-blender.md).

Run: python3 tools/blender-fx/eidolons/aurelan_parts.py <out dir>      (PART=explosion picks some; then ID=aurelan parts_finish.py)

Light: straight, clean and golden, where lightning is jagged and blue. Rays are straight strips of light (white down the middle, gold
at the edge) that turn and lengthen; beams come down from above the screen and stand; nothing burns, and what is left is a glow. The
pieces take the same places in the call as Askel's:

  sigil      a sun cut in light: a disc, two rings, twelve rays, a mane of points; small rays stand up along it; then it dims
  pillar     the painted lion's way in: a shaft of dawn from above the screen, many rays wide, rings of light running down it, a
             sunburst where it lands; it narrows to a thread and is gone
  explosion  the blow: a sunburst (a white-gold disc throwing long rays that turn), then beams descending across the foes' whole
             side, each standing a moment, and the radiant shock: a low dome of light racing out along the ground
  cracks     lies on the ground: a sun of rays and rings racing out, white, then gold, then gone
  fire       a tile lit: a small beam comes down on it and flares (the lead-in: the dawn reaching the foes)
  scorch     a disc of gold light left on the ground, fading
  smoke      motes of light climbing in a soft column
  embers     motes of gold drifting up (a loop)
"""
import math, os, random, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
import askel as A
import parts as P
import nivra_parts as N
import voltara_parts as V
from askel import ball, clamp, ease, flat_mat, glow, image_node, mat, mth, out3, ramp, seg, value
from parts import render, scene, tint
from voltara_parts import Bolt, D, E

OUT = sys.argv[-1]
os.makedirs(OUT, exist_ok=True)
rnd = random.Random(97)

# Dawn's light from its thin edge to its core: amber, gold, white.
DAWN = [(0.2, (0.3, 0.12, 0.0, 1)), (0.3, (0.75, 0.35, 0.02, 1)), (0.42, (1.0, 0.58, 0.06, 1)), (0.56, (1.0, 0.78, 0.2, 1)), (0.7, (1.0, 0.9, 0.5, 1)), (0.84, (1.0, 0.97, 0.8, 1)), (0.95, (1, 1, 1, 1))]
RAY = [(0.0, (0.7, 0.3, 0.02, 1)), (0.4, (1.0, 0.55, 0.05, 1)), (0.62, (1.0, 0.78, 0.2, 1)), (0.82, (1.0, 0.93, 0.6, 1)), (0.95, (1, 1, 0.95, 1))]
HAZE = [(0.25, (0.6, 0.35, 0.05, 1)), (0.45, (0.95, 0.7, 0.2, 1)), (0.7, (1.0, 0.92, 0.6, 1))]


def ray(b, a0, z0, a1, z1, width, depth=0.0, fade=0.0):
    """A straight ray (a bolt with no kinks)."""
    b.draw(None, a0, z0, a1, z1, width, 0.0, depth, fade)


def beam(bs, r, a, top, width, fade=0.0, depth=0.0):
    """A beam from the sky down to (a, 0): a wide ray with thinner ones riding beside it, shimmering."""
    ray(bs[0], a, top, a, 0.0, width, depth, fade)
    for k in range(1, len(bs)):
        off = r.uniform(-1, 1) * width * 1.6
        ray(bs[k], a + off, top, a + off * 0.8, 0.0, width * r.uniform(0.12, 0.3), depth + 0.05 * k, fade)


def sigil_image(path, size=512):
    """Aurelan's mark, white on black: a sun's disc, two rings, twelve rays, and a mane of points round the outer ring."""
    from PIL import Image, ImageDraw, ImageFilter
    im = Image.new('L', (size * 2, size * 2), 0)
    d = ImageDraw.Draw(im)
    c = size
    for r, w in ((0.84, 20), (0.62, 12)):
        d.ellipse((c - size * r, c - size * r, c + size * r, c + size * r), outline=255, width=w)
    for i in range(24):                                                     # the mane: points outside the ring, long and short in turn
        a = i / 24 * math.tau
        ln = 0.98 if i % 2 == 0 else 0.92
        d.polygon([(c + math.cos(a - 0.07) * size * 0.84, c + math.sin(a - 0.07) * size * 0.84), (c + math.cos(a) * size * ln, c + math.sin(a) * size * ln), (c + math.cos(a + 0.07) * size * 0.84, c + math.sin(a + 0.07) * size * 0.84)], fill=255)
    for i in range(12):                                                     # the rays, from the disc to the inner ring
        a = i / 12 * math.tau + math.pi / 12
        d.line((c + math.cos(a) * size * 0.26, c + math.sin(a) * size * 0.26, c + math.cos(a) * size * 0.6, c + math.sin(a) * size * 0.6), fill=255, width=16 if i % 2 == 0 else 10)
    d.ellipse((c - size * 0.2, c - size * 0.2, c + size * 0.2, c + size * 0.2), fill=255)
    im.filter(ImageFilter.GaussianBlur(3)).resize((size, size), Image.LANCZOS).save(path)


def sigil():
    sc, n = scene('sigil')
    rm = V.bolt_mat(RAY)
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
    # (it is lit from the middle outward, as a sun rises, with a turn to it)
    order = mth(gnt, 'ADD', mth(gnt, 'MULTIPLY', ang, 0.3), mth(gnt, 'MULTIPLY', mth(gnt, 'MULTIPLY', ln.outputs['Value'], 2.0), 0.7))
    ahead = mth(gnt, 'SUBTRACT', mth(gnt, 'MULTIPLY', drawn, 1.12, False), order, False)
    shown = mth(gnt, 'MULTIPLY', ahead, 30.0)
    front = mth(gnt, 'SUBTRACT', 1.0, mth(gnt, 'MULTIPLY', ahead, 9.0))
    hot = mth(gnt, 'ADD', mth(gnt, 'MULTIPLY', heat, 0.66), mth(gnt, 'MULTIPLY', front, 0.5))
    col = ramp(gnt, hot, [(0.0, (0.3, 0.14, 0.02, 1)), (0.3, (0.8, 0.45, 0.05, 1)), (0.6, (1.0, 0.8, 0.3, 1)), (0.85, (1.0, 0.95, 0.7, 1)), (1.0, (1, 1, 1, 1))])
    ga = mth(gnt, 'MULTIPLY', mth(gnt, 'MULTIPLY', mth(gnt, 'MULTIPLY', gimg.outputs['Color'], 1.8), shown), alpha)
    glow(gnt, col.outputs['Color'], ga, 1.3)
    bpy.ops.mesh.primitive_plane_add(size=1)
    pl = bpy.context.object
    pl.scale = (5.0, 5.0, 1)
    pl.location = (0, 0, 0.02)
    pl.data.materials.append(gm)
    rays = [(Bolt(rm, 2), i / 12 * math.tau, rnd.uniform(0.6, 1.1)) for i in range(12)]

    def step(i):
        d = ease(clamp((i + 1) / 12))
        cool = seg(i, 14, 21)
        drawn.outputs[0].default_value = d
        heat.outputs[0].default_value = (0.62 + 0.38 * seg(i, 8, 12)) * (1 - 0.8 * cool) + (0.05 if i % 2 else 0)
        alpha.outputs[0].default_value = 1 - seg(i, 18, 22)
        for b, a, s in rays:
            # (small rays standing up off the outer ring once the light has reached it, breathing)
            k = seg(d, 0.75, 1.0) * (1 - seg(i, 14, 18)) * s * (0.85 + 0.2 * math.sin(i * 1.9 + a * 5))
            if k <= 0.02:
                b.hide()
                continue
            x, y = math.cos(a) * 2.1, math.sin(a) * 2.1
            along, deep = x * D[0] + y * D[1], x * E[0] + y * E[1]
            ray(b, along, 0.03, along, 0.9 * k, 0.07, deep)

    render(sc, 'sigil', n, step)


def pillar():
    sc, n = scene('pillar')
    rm = V.bolt_mat(RAY)
    dawn, clock = P.hero_fire(DAWN)
    rays = [Bolt(rm, 2) for _ in range(22)]
    rings = [ball(None, dawn, sub=3) for _ in range(4)]                      # rings of light running down the shaft
    core = ball(None, dawn, sub=3)
    burst = [Bolt(rm, 2) for _ in range(16)]                                 # the sunburst where it lands
    mo, _ = flat_mat((1.0, 0.92, 0.6, 1), 2.2)
    motes = [(ball(None, mo, sub=1, smooth=False), rnd.uniform(0, math.tau), rnd.uniform(0.3, 1.6), rnd.uniform(3.0, 10.0), rnd.uniform(0, 0.5)) for _ in range(36)]
    r = random.Random(7)
    offs = [(r.uniform(-1.0, 1.0), r.uniform(0.05, 0.3), r.uniform(0, math.tau), r.uniform(-0.4, 0.4)) for _ in rays]

    def step(i):
        clock.outputs[0].default_value = i * 0.35
        wide = out3(seg(i, -0.3, 2.5)) * (1 - 0.9 * seg(i, 9, 15))            # it opens in two frames, then narrows to a thread
        down = out3(seg(i, -0.5, 1.5))                                       # and comes down from the sky
        for b, (off, w, ph, dep) in zip(rays, offs):
            k = wide * (0.8 + 0.25 * math.sin(i * 2.2 + ph))
            if k <= 0.02 or i >= 15:
                b.hide()
                continue
            a = off * 1.25 * wide
            ray(b, a * 0.6, 12.6, a, 12.6 * (1 - down), w * k * 1.4, dep, seg(i, 12, 16))
        for k, o in enumerate(rings):
            g = ((i * 0.11 + k / 4) % 1.0)
            live = wide * (1 - seg(i, 10, 14))
            o.location = (0, 0, 11.5 * (1 - g))
            q = 1.9 * wide * (0.6 + 0.4 * math.sin(g * math.pi))
            o.scale = (q, q, 0.22)
            tint(o, 1 if live <= 0.05 else 0.2, 0.3)
        k = 1 - seg(i, 3, 8)
        up = out3(seg(i, 0.5, 2.5))
        core.scale = (1.7 * k * up, 1.7 * k * up, 1.0 * up * k)
        core.location = (0, 0, 0.7 * up)
        tint(core, 1 if up <= 0 else 1 - k, 0.7)
        for j, b in enumerate(burst):
            g = out3(seg(i, 1, 4))
            f = seg(i, 4, 9)
            ang = j / 16 * math.pi + 0.1 * i
            if g <= 0 or f >= 1:
                b.hide()
                continue
            ray(b, math.cos(ang) * 0.6, 0.5 + math.sin(ang) * 0.4, math.cos(ang) * (1.0 + 2.6 * g), 0.5 + math.sin(ang) * (0.8 + 2.4 * g), 0.14 * (1 - 0.6 * f), 0.0, f)
        for o, a, rr, v, late in motes:
            g = seg(i / 15, late, late + 0.5)
            kk = 0.055 * math.sin(g * math.pi) ** 0.5 if 0 < g < 1 else 0
            o.location = (math.cos(a) * rr, math.sin(a) * rr, 0.3 + v * g)
            o.scale = (kk, kk, kk)

    render(sc, 'pillar', n, step)


def explosion():
    sc, n = scene('explosion')
    rm = V.bolt_mat(RAY)
    dawn, clock = P.hero_fire(DAWN)
    haze, hclock = N.mist_mat(HAZE)
    core = ball(None, dawn, sub=4)
    sun = [Bolt(rm, 2) for _ in range(28)]                                   # the sunburst's rays
    spots = [s * (0.7 + 1.15 * k) for k in range(5) for s in (-1, 1)]
    beams = [[Bolt(rm, 2) for _ in range(9)] for _ in spots]
    feet = [ball(None, dawn, sub=3) for _ in spots]
    dome = [ball(None, dawn, sub=4) for _ in range(2)]                       # the radiant shock, a low dome racing out
    puffs = [(ball(None, haze, sub=3), rnd.uniform(-5.0, 5.0), rnd.uniform(0.6, 1.0), rnd.uniform(0, 0.3)) for _ in range(10)]
    for o, *_ in puffs:
        tint(o, 1)
    mo, _ = flat_mat((1.0, 0.92, 0.6, 1), 2.2)
    motes = [(ball(None, mo, sub=1, smooth=False), rnd.uniform(-5.4, 5.4), rnd.uniform(-0.6, 0.6), rnd.uniform(3.0, 8.5), rnd.uniform(0, 0.45)) for _ in range(70)]
    r = random.Random(13)
    lens = [r.uniform(0.6, 1.0) for _ in sun]

    def step(i):
        clock.outputs[0].default_value = i * 0.4
        hclock.outputs[0].default_value = i * 0.25
        # the sunburst: a white-gold disc and long rays that turn as they lengthen
        c = out3(seg(i, -0.5, 2.2))
        gone = seg(i, 3, 6)
        rr = (0.6 + 2.6 * c) * (1 - 0.35 * gone)
        core.scale = (rr, rr, rr)
        core.location = (0, 0, 1.6 + 0.6 * c)
        tint(core, 0.1 + 0.9 * gone ** 1.3, 0.3)
        for k, b in enumerate(sun):
            g = out3(seg(i, -0.3, 3.5))
            f = seg(i, 4, 8.5)
            if f >= 1:
                b.hide()
                continue
            ang = k / len(sun) * math.tau + 0.07 * i
            reach = (1.5 + 6.5 * g) * lens[k] * (1.0 if k % 2 == 0 else 0.6)
            ray(b, math.cos(ang) * rr * 0.5, 1.9 + math.sin(ang) * rr * 0.5, math.cos(ang) * reach, 1.9 + math.sin(ang) * reach, (0.3 if k % 2 == 0 else 0.16) * (1 - 0.6 * f), 0.0, f)
        # the beams, descending across the foes' side from the middle outward: each comes down, stands three frames, thins
        for k, (a, bs, foot) in enumerate(zip(spots, beams, feet)):
            at_i = 2.5 + abs(a) * 1.05
            age = i - at_i
            if 0 <= age < 6:
                down = out3(seg(age, 0, 1))
                w = 0.34 * (1 - 0.85 * seg(age, 3, 6)) * (0.9 + 0.15 * math.sin(i * 2.3 + k))
                for j, b in enumerate(bs):
                    off = (0 if j == 0 else r.uniform(-1, 1) * 0.9)
                    ray(b, a + off, 9.8, a + off * 0.85, 9.8 * (1 - down), w if j == 0 else w * r.uniform(0.2, 0.55), 0.2 * (k % 3 - 1) + 0.04 * j, seg(age, 4, 6))
            else:
                for b in bs:
                    b.hide()
            f = seg(age, 0.6, 1.4) * (1 - seg(age, 2, 6))
            foot.scale = (1.5 * f, 1.5 * f, 0.6 * f)
            foot.location = (a * D[0], a * D[1], 0.4 * f)
            tint(foot, 1 if f <= 0 else 1 - 0.9 * f, 0.5)
        # the radiant shock: two low domes of light racing out along the ground, one a beat behind the other
        for k, o in enumerate(dome):
            g = seg(i, 6 + k * 1.6, 11.5 + k * 1.6)
            q = 0.8 + 6.6 * out3(g)
            o.scale = (q, q, 1.3 * (1 - 0.5 * g))
            o.location = (0, 0, 0.15)
            tint(o, 1 if g <= 0 or g >= 1 else 0.12 + 0.88 * g ** 1.8, 0.3 * (1 - g))
        for o, a, s, lag in puffs:
            g = seg(i, 8 + lag * 5, 16.5)
            if g <= 0 or g >= 1:
                o.scale = (0, 0, 0)
                continue
            q = s * (0.6 + 1.2 * g)
            o.location = (a * D[0], a * D[1], 0.9 + 3.6 * g)
            o.scale = (q * 0.8, q * 0.8, q * 1.3)
            tint(o, max(g ** 1.5, 1 - seg(g, 0, 0.15)))
        for o, a, cdep, v, late in motes:
            g = seg(i / 15, 0.3 + late, 0.75 + late)
            kk = 0.06 * math.sin(g * math.pi) ** 0.5 if 0 < g < 1 else 0
            o.location = (a * D[0] + cdep * E[0], a * D[1] + cdep * E[1], 0.3 + v * g)
            o.scale = (kk, kk, kk)

    render(sc, 'explosion', n, step)


def cracks():
    """A sun on the ground: rays and rings racing out, white, then gold, then gone."""
    sc, n = scene('cracks')
    from PIL import Image, ImageDraw, ImageFilter
    path = os.path.join(OUT, 'sun-mask.png')
    size = 768
    im = Image.new('L', (size, size), 0)
    d = ImageDraw.Draw(im)
    c = size / 2
    for i in range(24):
        a = i / 24 * math.tau
        far = 360 if i % 2 == 0 else 250
        w = 12 if i % 2 == 0 else 7
        d.polygon([(c + math.cos(a - 0.02) * 40, c + math.sin(a - 0.02) * 40), (c + math.cos(a) * far, c + math.sin(a) * far), (c + math.cos(a + 0.02) * 40, c + math.sin(a + 0.02) * 40)], fill=255)
        d.line((c + math.cos(a) * 40, c + math.sin(a) * 40, c + math.cos(a) * far * 0.7, c + math.sin(a) * far * 0.7), fill=255, width=w)
    for rr, w in ((120, 8), (210, 6), (300, 5)):
        d.ellipse((c - rr, c - rr, c + rr, c + rr), outline=255, width=w)
    d.ellipse((c - 44, c - 44, c + 44, c + 44), fill=255)
    im.filter(ImageFilter.GaussianBlur(1.2)).save(path)
    m, nt = mat('sun')
    img = image_node(nt, path)
    tc = nt.nodes.new('ShaderNodeTexCoord')
    ln = nt.nodes.new('ShaderNodeVectorMath')
    ln.operation = 'LENGTH'
    nt.links.new(tc.outputs['Object'], ln.inputs[0])
    reach, heat, a_v, ring_r, ring_a, eat_v = value(nt), value(nt, 1.0), value(nt, 1.0), value(nt), value(nt), value(nt)
    dist = mth(nt, 'MULTIPLY', ln.outputs['Value'], 2.0)
    shown = mth(nt, 'MULTIPLY', mth(nt, 'SUBTRACT', reach, dist, False), 12.0)
    lead = mth(nt, 'SUBTRACT', 1.0, mth(nt, 'MULTIPLY', mth(nt, 'SUBTRACT', reach, dist, False), 4.0))
    hot = mth(nt, 'ADD', mth(nt, 'MULTIPLY', heat, 0.75), mth(nt, 'MULTIPLY', lead, 0.3))
    ring = mth(nt, 'MULTIPLY', mth(nt, 'SUBTRACT', 1.0, mth(nt, 'MULTIPLY', mth(nt, 'ABSOLUTE', mth(nt, 'SUBTRACT', dist, ring_r, False)), 16.0)), ring_a)
    col = ramp(nt, mth(nt, 'MAXIMUM', hot, ring), [(0.0, (0.5, 0.25, 0.02, 1)), (0.3, (0.9, 0.55, 0.08, 1)), (0.55, (1.0, 0.82, 0.3, 1)), (0.8, (1.0, 0.96, 0.75, 1)), (1.0, (1, 1, 1, 1))])
    # (light does not scorch: it thins away from its outer edge in, by a noise)
    eat = nt.nodes.new('ShaderNodeTexNoise')
    eat.inputs['Scale'].default_value = 14.0
    nt.links.new(tc.outputs['Object'], eat.inputs['Vector'])
    left = mth(nt, 'MULTIPLY', mth(nt, 'SUBTRACT', mth(nt, 'ADD', eat.outputs['Fac'], 0.6, False), mth(nt, 'MULTIPLY', eat_v, 1.7, False), False), 6.0)
    alpha = mth(nt, 'MAXIMUM', mth(nt, 'MULTIPLY', mth(nt, 'MULTIPLY', mth(nt, 'MULTIPLY', mth(nt, 'MULTIPLY', img.outputs['Color'], 2.0), shown), a_v), left), ring)
    glow(nt, col.outputs['Color'], alpha, 1.3)
    bpy.ops.mesh.primitive_plane_add(size=1)
    pl = bpy.context.object
    pl.scale = (7.6, 7.6, 1)
    pl.data.materials.append(m)

    def step(i):
        reach.outputs[0].default_value = 0.12 + 1.0 * out3(seg(i, -0.5, 3))
        heat.outputs[0].default_value = 1 - 0.75 * seg(i, 2, 9)
        a_v.outputs[0].default_value = 1.0
        eat_v.outputs[0].default_value = seg(i, 6, 12)
        ring_r.outputs[0].default_value = 0.1 + 0.95 * out3(seg(i, -0.5, 3.5))
        ring_a.outputs[0].default_value = 1 - seg(i, 1.5, 4)

    render(sc, 'cracks', n, step)


def fire():
    """A tile lit: a small beam comes down on it, flares, thins away."""
    sc, n = scene('fire')
    rm = V.bolt_mat(RAY)
    dawn, clock = P.hero_fire(DAWN)
    bs = [Bolt(rm, 2) for _ in range(7)]
    foot = ball(None, dawn, sub=3)
    mo, _ = flat_mat((1.0, 0.92, 0.6, 1), 2.2)
    motes = [(ball(None, mo, sub=1, smooth=False), rnd.uniform(-0.5, 0.5), rnd.uniform(1.5, 3.4), rnd.uniform(0, 0.5)) for _ in range(9)]
    r = random.Random(3)
    offs = [0.0] + [r.uniform(-1, 1) * 0.42 for _ in range(6)]

    def step(i):
        clock.outputs[0].default_value = i * 0.4
        down = out3(seg(i, -0.5, 1.5))
        w = 0.17 * (1 - 0.9 * seg(i, 7, 13)) * (0.9 + 0.15 * math.sin(i * 2.4))
        for j, b in enumerate(bs):
            if i >= 13:
                b.hide()
                continue
            ray(b, offs[j], 3.95, offs[j] * 0.85, 3.95 * (1 - down), w if j == 0 else w * 0.45, 0.04 * j, seg(i, 10, 14))
        f = seg(i, 0.8, 2) * (1 - seg(i, 4, 11))
        foot.scale = (0.8 * f, 0.8 * f, 0.4 * f)
        foot.location = (0, 0, 0.28 * f)
        tint(foot, 1 if f <= 0 else 1 - 0.9 * f, 0.5)
        for o, x, v, late in motes:
            g = seg(i / 13, late, late + 0.5)
            kk = 0.05 * math.sin(g * math.pi) ** 0.5 if 0 < g < 1 else 0
            o.location = (x * D[0], x * D[1], 0.3 + v * g)
            o.scale = (kk, kk, kk)

    render(sc, 'fire', n, step)


def scorch():
    """A disc of gold light left on the ground, thinning away."""
    sc, n = scene('scorch')
    sm, snt = mat('disc')
    stc = snt.nodes.new('ShaderNodeTexCoord')
    ln = snt.nodes.new('ShaderNodeVectorMath')
    ln.operation = 'LENGTH'
    snt.links.new(stc.outputs['Object'], ln.inputs[0])
    sno = snt.nodes.new('ShaderNodeTexNoise')
    sno.inputs['Scale'].default_value = 9.0
    snt.links.new(stc.outputs['Object'], sno.inputs['Vector'])
    thin, lit = value(snt, 0.0), value(snt, 1.0)
    near = mth(snt, 'SUBTRACT', 1.0, mth(snt, 'MULTIPLY', ln.outputs['Value'], 2.6))
    ringed = mth(snt, 'ADD', near, mth(snt, 'MULTIPLY', mth(snt, 'SUBTRACT', 1.0, mth(snt, 'MULTIPLY', mth(snt, 'ABSOLUTE', mth(snt, 'SUBTRACT', ln.outputs['Value'], 0.3, False)), 14.0)), 0.6))
    sa = mth(snt, 'MULTIPLY', mth(snt, 'SUBTRACT', mth(snt, 'MULTIPLY', ringed, mth(snt, 'ADD', 0.6, sno.outputs['Fac'])), mth(snt, 'ADD', 0.35, thin, False), False), 5.0)
    col = ramp(snt, mth(snt, 'MULTIPLY', ringed, lit), [(0.0, (0.75, 0.42, 0.04, 1)), (0.5, (1.0, 0.78, 0.25, 1)), (1.0, (1.0, 0.97, 0.8, 1))])
    glow(snt, col.outputs['Color'], sa, 1.0)
    bpy.ops.mesh.primitive_plane_add(size=1)
    pl = bpy.context.object
    pl.scale = (2.75, 2.75, 1)
    pl.data.materials.append(sm)
    looks = [(0.0, 1.0), (0.02, 0.95), (0.06, 0.85), (0.12, 0.75), (0.2, 0.6), (0.32, 0.45), (0.48, 0.3), (0.66, 0.2)]

    def step(i):
        thin.outputs[0].default_value, lit.outputs[0].default_value = looks[i]

    render(sc, 'scorch', n, step)


def smoke():
    """Motes of light climbing in a soft column."""
    sc, n = scene('smoke')
    m, clock = N.mist_mat(HAZE)
    puffs = [(ball(None, m, sub=3), rnd.uniform(-0.3, 0.3), rnd.uniform(-0.3, 0.3), rnd.uniform(0.5, 0.8), lag, rnd.uniform(0, math.tau)) for lag in (0.0, 0.1, 0.2, 0.32, 0.44)]
    mo, _ = flat_mat((1.0, 0.95, 0.7, 1), 2.2)
    motes = [(ball(None, mo, sub=1, smooth=False), rnd.uniform(-0.8, 0.8), rnd.uniform(-0.3, 0.3), rnd.uniform(3.0, 5.2), rnd.uniform(0, 0.5)) for _ in range(16)]

    def step(i):
        clock.outputs[0].default_value = i * 0.22
        for o, x, y, s, lag, ph in puffs:
            g = seg(i / (n - 1), lag, 0.72 + lag)
            r = s * (0.4 + 0.7 * g)
            o.location = (x, y, 0.6 + 4.2 * g)
            o.scale = (r * 0.7, r * 0.7, r * 1.6)
            tint(o, 1 if g <= 0 else max(g ** 1.3, 1 - seg(g, 0, 0.1)))
        for o, x, y, v, late in motes:
            g = seg(i / (n - 1), late, late + 0.5)
            kk = 0.05 * math.sin(g * math.pi) ** 0.5 if 0 < g < 1 else 0
            o.location = (x, y, 0.4 + v * g)
            o.scale = (kk, kk, kk)

    render(sc, 'smoke', n, step)


def embers():
    """Motes of gold drifting up: a loop (each rises the frame's height once or twice a turn, wrapping)."""
    sc, n = scene('embers')
    mo, _ = flat_mat((1.0, 0.9, 0.5, 1), 2.2)
    wh, _ = flat_mat((1.0, 0.98, 0.85, 1), 2.4)
    bits = [(ball(None, mo if k % 3 else wh, sub=1, smooth=False), rnd.uniform(-2.3, 2.3), rnd.uniform(0, 7.0), rnd.uniform(0, math.tau), rnd.uniform(0.03, 0.06), rnd.choice((1, 1, 2))) for k in range(48)]

    def step(i):
        t = i / n
        for o, x, z0, ph, r, turns in bits:
            z = (z0 + 7.0 * t * turns) % 7.0
            sway = 0.3 * math.sin(math.tau * t * turns + ph)
            o.location = ((x + sway) * math.sqrt(0.5), (x + sway) * math.sqrt(0.5), z)
            k = r * min(1.0, z / 0.6, (7.0 - z) / 0.6)
            o.scale = (k, k, k)

    render(sc, 'embers', n, step)


if __name__ == '__main__':
    P.run({'sigil': sigil, 'pillar': pillar, 'explosion': explosion, 'cracks': cracks, 'fire': fire, 'scorch': scorch, 'smoke': smoke, 'embers': embers})
