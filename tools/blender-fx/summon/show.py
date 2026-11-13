"""SUMMON-SHOW: the summoning's show, staged in Blender (docs/notes/summon-show.md). Rendered here, finished by finish.py beside it.

Run: python3 tools/blender-fx/summon/show.py <out dir>        (PART=charge,burst picks some; then finish.py)

A new hero's reveal (`firstReveal` in src/summonTarot.ts) is seen front on, a little from above, over the painted sanctum: the
circle on the floor the hero stands on, and the air above it. Its show is cut into four pieces, played one after another:

  charge   the circle charging (1.4 s): a summoning circle burns onto the floor round its rings and inward, its rune ring turning,
           motes of light spiralling in off the dark and a thin thread of light rising from its heart
  rift     the rift opening (0.5 s): a seam of white light tears up from the circle into the sky and splits wide, rings of light
           racing up it, streaks rushing past
  burst    the arrival (0.8 s): a white flash at the heart, a shock ring racing out over the floor, shards of light and rays thrown
           out, the rift collapsing into it
  after    the aftermath (a loop of 1.2 s): the circle glowing low and turning, embers and motes rising off it

and a shard card's turn has its own small flourish, seen straight on:

  flourish a ring of light breaking out round the card, a four-pointed glint at its heart and slivers of light spun outward (0.6 s)

Nothing here is a modelled object: light, rings, a sigil, sparks, shards and rays only (the pipeline's rule). Each piece is rendered
at twice its kept size, see-through, to <out>/<part>/NNN.png; finish.py shrinks it to the game's pixels, cuts its palette and packs it.
"""
import math, os, random, sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'eidolons'))
import bpy
from askel import clamp, ease, glow, mat, mth, out3, ramp, seg, value

OUT = sys.argv[-1]
os.makedirs(OUT, exist_ok=True)
SS = 2.0
# Pixels to a unit, in the kept frames. A hero on the reveal stands about 2.4 units tall; the circle is 2.2 units across.
PX = 36

# Each piece: its kept frame (px), its frames, the camera's tilt down (degrees) and the height (units) it looks at.
PARTS = {
    'charge': (176, 240, 14, 20, 2.2),
    'rift': (176, 240, 6, 20, 2.2),
    'burst': (176, 240, 9, 20, 2.2),
    'after': (176, 240, 12, 20, 2.2),
    'flourish': (112, 144, 8, 0, 0.0),
}

# The colours: the sanctum's emerald and its gold, burning up to white.
GOLD_HEAT = [(0.0, (0.02, 0.12, 0.07, 1)), (0.25, (0.08, 0.55, 0.3, 1)), (0.5, (0.55, 0.9, 0.45, 1)), (0.7, (1.0, 0.82, 0.35, 1)), (0.86, (1.0, 0.95, 0.7, 1)), (1.0, (1, 1, 1, 1))]
WHITE = (1.0, 0.98, 0.9, 1)
GOLD = (1.0, 0.8, 0.32, 1)
PALE = (0.75, 1.0, 0.82, 1)
EMERALD = (0.2, 0.95, 0.55, 1)


def reset(name):
    fw, fh, n, tilt, look = PARTS[name]
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = int(os.environ.get('SAMPLES', '24'))
    sc.cycles.use_denoising = False
    sc.cycles.max_bounces = 2
    sc.cycles.transparent_max_bounces = 64
    sc.render.film_transparent = True
    sc.render.resolution_x = round(fw * SS)
    sc.render.resolution_y = round(fh * SS)
    sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.view_settings.view_transform = 'Standard'
    sc.world = bpy.data.worlds.new('w')
    cam = bpy.data.cameras.new('cam')
    cam.type = 'ORTHO'
    cam.sensor_fit = 'VERTICAL'
    cam.ortho_scale = fh / PX
    ob = bpy.data.objects.new('cam', cam)
    sc.collection.objects.link(ob)
    # (looking along +y, tilted down by `tilt`; the frame's middle is `look` units above the circle's heart)
    rx = math.radians(90 - tilt)
    ob.rotation_euler = (rx, 0, 0)
    d = 30
    ob.location = (0, -d * math.sin(rx), look + d * math.cos(rx))
    sc.camera = ob
    return sc, n


def render(sc, name, n, step):
    os.makedirs(os.path.join(OUT, name), exist_ok=True)
    for i in range(n):
        step(i)
        sc.render.filepath = os.path.join(OUT, name, f'{i:03d}.png')
        bpy.ops.render.render(write_still=True)
    print('done', name, flush=True)


def lit(colour, strength=1.0):
    """A plain glowing colour; its value node sets how see-through it is."""
    m, nt = mat('lit')
    v = value(nt, 1.0)
    em = glow(nt, colour, v, strength)
    return m, v, em


def soft_flash(colour=WHITE):
    """A ball of light seen as light: bright where it faces the camera and gone at its rim, its edge torn by a noise, so it never
    reads as a solid ball."""
    m, nt = mat('flash')
    lw = nt.nodes.new('ShaderNodeLayerWeight')
    lw.inputs['Blend'].default_value = 0.5
    noise = nt.nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 4.0
    noise.inputs['Detail'].default_value = 4.0
    v = value(nt, 1.0)
    face = mth(nt, 'POWER', mth(nt, 'SUBTRACT', 1.0, lw.outputs['Facing']), 3.0)
    torn = mth(nt, 'MULTIPLY', face, mth(nt, 'ADD', mth(nt, 'MULTIPLY', noise.outputs['Fac'], 1.4), -0.1, False))
    col = ramp(nt, face, [(0.0, (0.2, 0.9, 0.5, 1)), (0.4, (1.0, 0.8, 0.3, 1)), (0.8, (1, 0.97, 0.85, 1)), (1.0, (1, 1, 1, 1))])
    glow(nt, col.outputs['Color'], mth(nt, 'MULTIPLY', mth(nt, 'MULTIPLY', torn, 1.6), v), 1.2)
    return m, v


def ico(m, loc=(0, 0, 0), r=1.0, sub=1):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub, radius=r, location=loc)
    o = bpy.context.object
    o.data.materials.append(m)
    return o


def ring(m, r=1.0, w=0.04, loc=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=r, minor_radius=w, major_segments=96, minor_segments=8, location=loc)
    o = bpy.context.object
    o.data.materials.append(m)
    return o


# ---- the circle ---------------------------------------------------------------------------------------------------------------------

def circle_image(path, size=1024):
    """The summoning circle, white on black: a double outer ring, a band of runes, an eight-pointed star of two squares, an inner ring
    with small rings at the star's points, and a heart."""
    from PIL import Image, ImageDraw, ImageFilter
    im = Image.new('L', (size, size), 0)
    d = ImageDraw.Draw(im)
    c = size / 2

    def circ(r, w):
        d.ellipse((c - r, c - r, c + r, c + r), outline=255, width=w)

    circ(c * 0.97, 12)
    circ(c * 0.9, 6)
    circ(c * 0.66, 9)
    r0 = random.Random(9)
    for i in range(24):                                                    # the runes: little glyphs of strokes between the rings
        a = (i + 0.5) / 24 * math.tau
        ca, sa = math.cos(a), math.sin(a)
        rm = c * 0.78
        for _ in range(r0.randint(2, 4)):
            u1, v1 = r0.uniform(-0.035, 0.035) * c, r0.uniform(-0.07, 0.07) * c
            u2, v2 = r0.uniform(-0.035, 0.035) * c, r0.uniform(-0.07, 0.07) * c
            p = lambda u, v: (c + ca * (rm + v) - sa * u, c + sa * (rm + v) + ca * u)
            d.line((*p(u1, v1), *p(u2, v2)), fill=255, width=7)
    for k in range(2):                                                     # the star: two squares turned an eighth from each other
        pts = [(c + math.cos(a) * c * 0.66, c + math.sin(a) * c * 0.66) for a in (k * math.pi / 4 + j * math.pi / 2 for j in range(4))]
        d.line(pts + pts[:1], fill=255, width=8)
    for j in range(8):
        a = j * math.pi / 4
        x, y = c + math.cos(a) * c * 0.66, c + math.sin(a) * c * 0.66
        d.ellipse((x - 18, y - 18, x + 18, y + 18), outline=255, width=6)
    circ(c * 0.3, 8)
    circ(c * 0.12, 6)
    d.ellipse((c - 18, c - 18, c + 18, c + 18), fill=255)
    im.filter(ImageFilter.GaussianBlur(2)).save(path)


def runes_image(path, size=1024):
    """The rune band alone (it turns against the circle)."""
    from PIL import Image, ImageDraw, ImageFilter
    im = Image.new('L', (size, size), 0)
    d = ImageDraw.Draw(im)
    c = size / 2
    r0 = random.Random(4)
    for i in range(12):
        a = i / 12 * math.tau
        ca, sa = math.cos(a), math.sin(a)
        rm = c * 0.5
        for _ in range(3):
            u1, v1 = r0.uniform(-0.05, 0.05) * c, r0.uniform(-0.05, 0.05) * c
            u2, v2 = r0.uniform(-0.05, 0.05) * c, r0.uniform(-0.05, 0.05) * c
            p = lambda u, v: (c + ca * (rm + v) - sa * u, c + sa * (rm + v) + ca * u)
            d.line((*p(u1, v1), *p(u2, v2)), fill=255, width=8)
    d.ellipse((c - c * 0.42, c - c * 0.42, c + c * 0.42, c + c * 0.42), outline=255, width=5)
    im.filter(ImageFilter.GaussianBlur(2)).save(path)


def image_node(nt, path):
    n = nt.nodes.new('ShaderNodeTexImage')
    n.image = bpy.data.images.load(path)
    n.image.colorspace_settings.name = 'Non-Color'
    n.extension = 'CLIP'
    return n


def circle(radius=1.4, z=0.01):
    """The circle on the floor. Returns the plane and its knobs: how far it is drawn on (0 to 1, round from the top and inward), its
    heat (0 dark emerald to 1 white) and its strength."""
    path = os.path.join(OUT, 'circle-mask.png')
    if not os.path.exists(path):
        circle_image(path)
    m, nt = mat('circle')
    img = image_node(nt, path)
    tc = nt.nodes.new('ShaderNodeTexCoord')
    nt.links.new(tc.outputs['UV'], img.inputs[0])
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(tc.outputs['Object'], sep.inputs[0])
    ang = mth(nt, 'ADD', mth(nt, 'DIVIDE', mth(nt, 'ARCTAN2', sep.outputs['Y'], sep.outputs['X'], False), math.tau, False), 0.5)
    ln = nt.nodes.new('ShaderNodeVectorMath')
    ln.operation = 'LENGTH'
    nt.links.new(tc.outputs['Object'], ln.inputs[0])
    drawn, heat, strength = value(nt, 0.0), value(nt, 0.0), value(nt, 1.0)
    # (the outer ring first, round the circle; then inward)
    order = mth(nt, 'ADD', mth(nt, 'MULTIPLY', ang, 0.55), mth(nt, 'MULTIPLY', mth(nt, 'SUBTRACT', 1.0, mth(nt, 'MULTIPLY', ln.outputs['Value'], 2.0)), 0.45))
    ahead = mth(nt, 'SUBTRACT', mth(nt, 'MULTIPLY', drawn, 1.15, False), order, False)
    shown = mth(nt, 'MULTIPLY', ahead, 25.0)
    front = mth(nt, 'SUBTRACT', 1.0, mth(nt, 'MULTIPLY', ahead, 8.0))
    hot = mth(nt, 'ADD', mth(nt, 'MULTIPLY', heat, 0.85), mth(nt, 'MULTIPLY', front, 0.5))
    col = ramp(nt, hot, GOLD_HEAT)
    a = mth(nt, 'MULTIPLY', mth(nt, 'MULTIPLY', mth(nt, 'MULTIPLY', img.outputs['Color'], 1.6), shown), strength)
    glow(nt, col.outputs['Color'], a, 1.4)
    bpy.ops.mesh.primitive_plane_add(size=2 * radius, location=(0, 0, z))
    pl = bpy.context.object
    pl.data.materials.append(m)
    return pl, drawn, heat, strength


def rune_band(radius=1.15, z=0.02):
    path = os.path.join(OUT, 'runes-mask.png')
    if not os.path.exists(path):
        runes_image(path)
    m, nt = mat('runes')
    img = image_node(nt, path)
    tc = nt.nodes.new('ShaderNodeTexCoord')
    nt.links.new(tc.outputs['UV'], img.inputs[0])
    heat, strength = value(nt, 0.6), value(nt, 0.0)
    col = ramp(nt, heat, GOLD_HEAT)
    glow(nt, col.outputs['Color'], mth(nt, 'MULTIPLY', mth(nt, 'MULTIPLY', img.outputs['Color'], 1.6), strength), 1.6)
    bpy.ops.mesh.primitive_plane_add(size=2 * radius, location=(0, 0, z))
    pl = bpy.context.object
    pl.data.materials.append(m)
    return pl, heat, strength


def floor_glow(radius=2.0):
    """A soft pool of light on the floor round the circle."""
    m, nt = mat('pool')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    ln = nt.nodes.new('ShaderNodeVectorMath')
    ln.operation = 'LENGTH'
    nt.links.new(tc.outputs['Object'], ln.inputs[0])
    strength = value(nt, 0.0)
    fall = mth(nt, 'POWER', mth(nt, 'SUBTRACT', 1.0, mth(nt, 'MULTIPLY', ln.outputs['Value'], 2.0)), 2.0)
    glow(nt, EMERALD, mth(nt, 'MULTIPLY', fall, strength), 1.0)
    bpy.ops.mesh.primitive_plane_add(size=2 * radius, location=(0, 0, 0.005))
    pl = bpy.context.object
    pl.data.materials.append(m)
    return strength


# ---- the column of light --------------------------------------------------------------------------------------------------------------

def seam():
    """The rift: a sheet facing the camera, a seam of light up its middle whose width is set, torn at its edges by a noise that climbs,
    white at its heart and gold to emerald at its edges, fading to nothing towards its top and foot."""
    m, nt = mat('seam')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(tc.outputs['Object'], sep.inputs[0])
    width, strength, clock = value(nt, 0.05), value(nt, 1.0), value(nt, 0.0)
    noise = nt.nodes.new('ShaderNodeTexNoise')
    noise.noise_dimensions = '4D'
    noise.inputs['Scale'].default_value = 4.5
    noise.inputs['Detail'].default_value = 8.0
    mp = nt.nodes.new('ShaderNodeCombineXYZ')
    nt.links.new(mth(nt, 'MULTIPLY', sep.outputs['X'], 0.6, False).outputs[0], mp.inputs['X'])
    nt.links.new(mth(nt, 'SUBTRACT', mth(nt, 'MULTIPLY', sep.outputs['Y'], 0.25, False), mth(nt, 'MULTIPLY', clock, 3.0, False), False).outputs[0], mp.inputs['Y'])
    nt.links.new(mp.outputs[0], noise.inputs['Vector'])
    nt.links.new(clock.outputs[0], noise.inputs['W'])
    torn = mth(nt, 'MULTIPLY', mth(nt, 'SUBTRACT', noise.outputs['Fac'], 0.5, False), 1.6, False)
    # (across: 1 at the heart, 0 past the width, the edge pushed in and out by the noise)
    across = mth(nt, 'SUBTRACT', 1.0, mth(nt, 'DIVIDE', mth(nt, 'ABSOLUTE', sep.outputs['X'], None, False), mth(nt, 'MAXIMUM', mth(nt, 'MULTIPLY', width, mth(nt, 'ADD', 1.0, torn, False), False), 0.003, False), False))
    # (along: the sheet's local y runs up the column; it fades in off the floor and out towards the top)
    foot = mth(nt, 'MULTIPLY', sep.outputs['Y'], 4.0)
    top = mth(nt, 'SUBTRACT', 1.0, mth(nt, 'MULTIPLY', mth(nt, 'SUBTRACT', sep.outputs['Y'], 2.6, False), 0.36))
    along = mth(nt, 'MULTIPLY', foot, top)
    hot = mth(nt, 'POWER', across, 0.7)
    col = ramp(nt, hot, [(0.0, (0.05, 0.6, 0.3, 1)), (0.3, (0.55, 0.9, 0.4, 1)), (0.55, (1.0, 0.78, 0.3, 1)), (0.8, (1.0, 0.95, 0.75, 1)), (1.0, (1, 1, 1, 1))])
    a = mth(nt, 'MULTIPLY', mth(nt, 'MULTIPLY', mth(nt, 'MULTIPLY', across, 2.5), along), strength)
    glow(nt, col.outputs['Color'], a, 2.0)
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, 0))
    pl = bpy.context.object
    pl.data.materials.append(m)
    # (in real units, 4 wide and 8 tall, its foot on the floor; stood up to face the camera, its local y the world's up)
    for v in pl.data.vertices:
        v.co.x *= 4.0
        v.co.y = (v.co.y + 0.5) * 8.0
    pl.rotation_euler = (math.radians(90), 0, 0)
    return width, strength, clock


def pillar_glow():
    """A soft column of light behind the seam (a cylinder, brightest at its axis as seen)."""
    m, nt = mat('column')
    lw = nt.nodes.new('ShaderNodeLayerWeight')
    lw.inputs['Blend'].default_value = 0.5
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(tc.outputs['Object'], sep.inputs[0])
    strength = value(nt, 0.0)
    face = mth(nt, 'POWER', mth(nt, 'SUBTRACT', 1.0, lw.outputs['Facing']), 2.0)
    along = mth(nt, 'MULTIPLY', mth(nt, 'MULTIPLY', sep.outputs['Z'], 2.0), mth(nt, 'SUBTRACT', 1.0, mth(nt, 'MULTIPLY', mth(nt, 'SUBTRACT', sep.outputs['Z'], 2.6, False), 0.36)))
    glow(nt, (0.45, 0.95, 0.6, 1), mth(nt, 'MULTIPLY', mth(nt, 'MULTIPLY', face, along), strength), 0.9)
    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=1.0, depth=2.0, location=(0, 0, 0), end_fill_type='NOTHING')
    o = bpy.context.object
    # (in real units: 8 tall, its foot on the floor; the shader's z runs 0 to 8)
    for v in o.data.vertices:
        v.co.z = (v.co.z + 1.0) * 4.0
    o.data.materials.append(m)
    return o, strength


# ---- the pieces ----------------------------------------------------------------------------------------------------------------------

def charge():
    sc, n = reset('charge')
    pl, drawn, heat, strength = circle()
    band, bheat, bstr = rune_band(0.78)
    pool = floor_glow()
    col, cstr = pillar_glow()
    col.scale = (0.08, 0.08, 1.0)
    rnd = random.Random(3)
    motes = []
    for k in range(64):
        m, v, em = lit(rnd.choice([GOLD, PALE, WHITE, EMERALD]), rnd.uniform(1.0, 1.6))
        o = ico(m, r=rnd.uniform(0.03, 0.055))
        motes.append((o, v, rnd.uniform(0, math.tau), rnd.uniform(1.4, 2.6), rnd.uniform(0.0, 2.6), rnd.uniform(-0.25, 0.55), rnd.uniform(0.6, 1.1)))

    def step(i):
        t = i / (n - 1)
        drawn.outputs[0].default_value = ease(clamp(t / 0.55))
        heat.outputs[0].default_value = 0.35 + 0.5 * t + (0.04 if i % 2 else 0)
        strength.outputs[0].default_value = 0.8 + 0.6 * t
        band.rotation_euler = (0, 0, -t * math.pi / 3)
        bheat.outputs[0].default_value = 0.5 + 0.45 * t
        bstr.outputs[0].default_value = seg(t, 0.25, 0.6)
        pool.outputs[0].default_value = 0.25 + 0.5 * t
        cstr.outputs[0].default_value = 0.9 * seg(t, 0.55, 1.0)
        col.scale = (0.05 + 0.08 * t, 0.05 + 0.08 * t, 1.0)
        for o, v, a0, r0, z0, late, speed in motes:
            # (each mote comes in off the dark in a spiral to the circle's heart, then is drawn up the thread)
            p = clamp((t - late * 0.5) * speed * 1.6)
            a = a0 + p * 2.4
            r = r0 * (1 - out3(p)) + 0.05
            z = z0 * (1 - p) + 0.15 * p
            o.location = (math.cos(a) * r, math.sin(a) * r * 0.9, z)
            v.outputs[0].default_value = 0.0 if p <= 0 else min(1.0, p * 4) * (1 - seg(p, 0.92, 1.0))
            o.scale = (1, 1, 1 + 2.5 * p)

    render(sc, 'charge', n, step)


def rift():
    sc, n = reset('rift')
    pl, drawn, heat, strength = circle()
    band, bheat, bstr = rune_band(0.78)
    pool = floor_glow()
    width, sstr, clock = seam()
    col, cstr = pillar_glow()
    rings = []
    for k in range(3):
        m, v, em = lit(WHITE if k == 0 else GOLD, 1.2)
        rings.append((ring(m, 0.4, 0.03), v, k))
    rnd = random.Random(7)
    streaks = []
    for k in range(26):
        m, v, em = lit(rnd.choice([WHITE, GOLD, PALE]), 1.2)
        o = ico(m, r=1.0, sub=1)
        streaks.append((o, v, rnd.uniform(0, math.tau), rnd.uniform(0.25, 0.9), rnd.uniform(0, 1), rnd.uniform(1.2, 2.2)))
    drawn.outputs[0].default_value = 1.0

    def step(i):
        t = i / (n - 1)
        clock.outputs[0].default_value = i * 0.35
        heat.outputs[0].default_value = 0.9 + (0.05 if i % 2 else 0)
        strength.outputs[0].default_value = 1.6
        band.rotation_euler = (0, 0, -math.pi / 3 - t * 0.6)
        bheat.outputs[0].default_value = 1.0
        bstr.outputs[0].default_value = 1.0
        pool.outputs[0].default_value = 0.8 + 0.3 * t
        # (the seam tears up: a hair first, then splits wide)
        width.outputs[0].default_value = 0.02 + 0.26 * out3(seg(t, 0.15, 1.0))
        sstr.outputs[0].default_value = 0.7 + 0.3 * t
        cstr.outputs[0].default_value = 0.35 + 0.35 * t
        s = 0.1 + 0.32 * out3(t)
        col.scale = (s, s, 1.0)
        for o, v, k in rings:
            p = clamp(t * 1.3 - k * 0.22)
            o.location = (0, 0, 0.1 + 4.6 * out3(p))
            r = 0.35 + 0.5 * p
            o.scale = (r / 0.4, r / 0.4 * 0.9, 1)
            v.outputs[0].default_value = 0.0 if p <= 0 else 1 - seg(p, 0.6, 1.0)
        for o, v, a, r, ph, speed in streaks:
            z = ((ph + t * speed) % 1.0) * 6.0
            o.location = (math.cos(a) * r, math.sin(a) * r, z)
            o.scale = (0.012, 0.012, 0.25 + 0.3 * speed)
            v.outputs[0].default_value = seg(t, 0.1, 0.4) * (1 - seg(z, 3.6, 5.2))

    render(sc, 'rift', n, step)


def burst():
    sc, n = reset('burst')
    pl, drawn, heat, strength = circle()
    band, bheat, bstr = rune_band(0.78)
    pool = floor_glow()
    width, sstr, clock = seam()
    col, cstr = pillar_glow()
    drawn.outputs[0].default_value = 1.0
    fm, fv = soft_flash()
    flash = ico(fm, (0, 0, 1.3), 1.0, sub=4)
    for f in flash.data.polygons:
        f.use_smooth = True
    wm, wv, wem = lit(GOLD, 1.2)
    wave = ring(wm, 1.0, 0.035)
    wm2, wv2, wem2 = lit(PALE, 1.2)
    wave2 = ring(wm2, 1.0, 0.025)
    rnd = random.Random(12)
    shards = []
    for k in range(40):
        m, v, em = lit(rnd.choice([WHITE, GOLD, GOLD, PALE, EMERALD]), rnd.uniform(1.0, 1.6))
        o = ico(m, r=1.0, sub=0)
        # (thrown out round the heart, mostly sideways and up, a few low across the floor)
        a = rnd.uniform(0, math.tau)
        up = rnd.uniform(-0.3, 1.0)
        dirv = (math.cos(a) * (1 - abs(up) * 0.5), math.sin(a) * (1 - abs(up) * 0.5) * 0.6, up)
        shards.append((o, v, dirv, rnd.uniform(1.4, 2.8), rnd.uniform(0.03, 0.06), (rnd.uniform(0, 6), rnd.uniform(0, 6), rnd.uniform(0, 6))))
    rays = []
    for k in range(14):
        m, v, em = lit(WHITE if k % 2 else GOLD, 1.2)
        bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=1.0, radius2=0.0, depth=1.0, location=(0, 0, 1.3))
        o = bpy.context.object
        o.data.materials.append(m)
        # (a ray in the camera's plane, from the heart outward)
        a = (k + 0.5) / 14 * math.tau + rnd.uniform(-0.1, 0.1)
        rays.append((o, v, a, rnd.uniform(1.3, 2.3)))

    def step(i):
        t = i / (n - 1)
        clock.outputs[0].default_value = 2.1 + i * 0.35
        heat.outputs[0].default_value = 1.0 - 0.3 * seg(t, 0.4, 1.0)
        strength.outputs[0].default_value = 1.6 - 0.5 * seg(t, 0.4, 1.0)
        band.rotation_euler = (0, 0, -math.pi / 3 - 0.6 - t * 0.5)
        bstr.outputs[0].default_value = 1.0 - 0.4 * t
        pool.outputs[0].default_value = 1.1 - 0.6 * t
        # (the rift collapses into the flash)
        width.outputs[0].default_value = 0.28 * (1 - out3(seg(t, 0.0, 0.35)))
        sstr.outputs[0].default_value = 1 - seg(t, 0.2, 0.4)
        cstr.outputs[0].default_value = 0.7 * (1 - seg(t, 0.0, 0.45))
        s = 0.42 * (1 - 0.7 * seg(t, 0.0, 0.4))
        col.scale = (s, s, 1.0)
        f = out3(seg(t, 0.0, 0.5))
        flash.scale = (0.4 + 1.3 * f, 0.4 + 1.3 * f, 0.4 + 1.5 * f)
        fv.outputs[0].default_value = (1 - seg(t, 0.15, 0.55)) * 0.95
        w = out3(seg(t, 0.05, 1.0))
        wave.scale = (0.4 + 1.85 * w, 0.4 + 1.85 * w, 1)
        wv.outputs[0].default_value = 1 - seg(t, 0.5, 1.0)
        w2 = out3(seg(t, 0.2, 1.0))
        wave2.scale = (0.3 + 1.4 * w2, 0.3 + 1.4 * w2, 1)
        wv2.outputs[0].default_value = seg(t, 0.2, 0.3) * (1 - seg(t, 0.6, 1.0))
        for o, v, d, sp, r, rot in shards:
            p = out3(seg(t, 0.05, 1.0))
            dist = sp * p
            o.location = (d[0] * dist, d[1] * dist, 1.3 + d[2] * dist - 0.8 * t * t)
            o.scale = (r * 0.5, r * 0.5, r * (1.6 + 2.0 * (1 - p)))
            o.rotation_euler = (rot[0] + t * 3, rot[1], rot[2] + t * 2)
            v.outputs[0].default_value = (1 - seg(t, 0.55, 1.0))
        for o, v, a, ln in rays:
            p = out3(seg(t, 0.0, 0.6))
            L = ln * (0.3 + 0.7 * p)
            wdt = 0.06 * (1 - 0.6 * p)
            o.scale = (wdt, wdt, L)
            # (the cone points along its local z; laid in the x-z plane at angle a, its base at the heart)
            o.rotation_euler = (0, math.pi / 2 - a, 0)
            o.location = (math.cos(a) * L / 2, -0.2, 1.3 + math.sin(a) * L / 2)
            v.outputs[0].default_value = 0.9 * (1 - seg(t, 0.3, 0.75))

    render(sc, 'burst', n, step)


def after():
    sc, n = reset('after')
    pl, drawn, heat, strength = circle()
    band, bheat, bstr = rune_band(0.78)
    pool = floor_glow()
    drawn.outputs[0].default_value = 1.0
    rnd = random.Random(21)
    embers = []
    for k in range(56):
        m, v, em = lit(rnd.choice([GOLD, PALE, WHITE, EMERALD]), rnd.uniform(1.0, 1.5))
        o = ico(m, r=rnd.uniform(0.025, 0.045))
        a, r = rnd.uniform(0, math.tau), math.sqrt(rnd.uniform(0, 1)) * 1.1
        embers.append((o, v, a, r, rnd.uniform(0, 1), rnd.uniform(2.0, 3.6), rnd.uniform(0, math.tau)))

    def step(i):
        t = i / n                                                            # (a loop: the last frame leads back into the first)
        heat.outputs[0].default_value = 0.55 + 0.05 * math.sin(t * math.tau)
        strength.outputs[0].default_value = 1.0 + 0.12 * math.sin(t * math.tau)
        # (the band has twelve runes: a twelfth of a turn a loop meets itself)
        band.rotation_euler = (0, 0, -t * math.tau / 12)
        bheat.outputs[0].default_value = 0.6
        bstr.outputs[0].default_value = 0.8
        pool.outputs[0].default_value = 0.45 + 0.06 * math.sin(t * math.tau)
        for o, v, a, r, ph, top, sw in embers:
            p = (ph + t) % 1.0
            o.location = (math.cos(a) * r + 0.08 * math.sin(sw + p * math.tau), math.sin(a) * r, p * top)
            v.outputs[0].default_value = seg(p, 0.0, 0.12) * (1 - seg(p, 0.6, 1.0))

    render(sc, 'after', n, step)


def flourish():
    """A shard card's turn, seen straight on (the card lies in the x-z plane, its middle at the origin)."""
    sc, n = reset('flourish')
    wm, wv, wem = lit(GOLD, 1.2)
    wave = ring(wm, 1.0, 0.03)
    wave.rotation_euler = (math.radians(90), 0, 0)
    wm2, wv2, wem2 = lit(WHITE, 1.2)
    wave2 = ring(wm2, 1.0, 0.02)
    wave2.rotation_euler = (math.radians(90), 0, 0)
    # (the glint: two long thin diamonds crossed, and a short pair turned an eighth)
    glints = []
    for k, (ln, rot) in enumerate([(1.0, 0), (1.0, 90), (0.45, 45), (0.45, 135)]):
        m, v, em = lit(WHITE if k < 2 else GOLD, 1.2)
        o = ico(m, r=1.0, sub=0)
        glints.append((o, v, ln, math.radians(rot)))
    rnd = random.Random(31)
    slivers = []
    for k in range(18):
        m, v, em = lit(rnd.choice([WHITE, GOLD, PALE, EMERALD]), 1.2)
        o = ico(m, r=1.0, sub=0)
        slivers.append((o, v, (k + rnd.uniform(-0.3, 0.3)) / 18 * math.tau, rnd.uniform(0.8, 1.5), rnd.uniform(0.02, 0.035)))

    def step(i):
        t = i / (n - 1)
        w = out3(seg(t, 0.0, 0.8))
        wave.scale = (0.3 + 1.3 * w, 0.3 + 1.3 * w * 1.25, 1)
        wv.outputs[0].default_value = 1 - seg(t, 0.4, 1.0)
        w2 = out3(seg(t, 0.15, 1.0))
        wave2.scale = (0.2 + 0.9 * w2, 0.2 + 0.9 * w2 * 1.25, 1)
        wv2.outputs[0].default_value = seg(t, 0.1, 0.2) * (1 - seg(t, 0.5, 1.0))
        g = math.sin(math.pi * seg(t, 0.0, 0.7))
        for o, v, ln, rot in glints:
            o.scale = (0.03 + 0.02 * g, 0.03, ln * (0.2 + 0.9 * g))
            o.rotation_euler = (0, rot + t * 0.4, 0)
            o.location = (0, -0.5, 0)
            v.outputs[0].default_value = g
        for o, v, a, sp, r in slivers:
            p = out3(seg(t, 0.05, 1.0))
            aa = a + p * 1.4
            d = 0.2 + sp * p
            o.location = (math.cos(aa) * d, -0.3, math.sin(aa) * d * 1.2)
            o.scale = (r, r, r * 3)
            o.rotation_euler = (0, math.pi / 2 - aa - 0.6, 0)
            v.outputs[0].default_value = seg(t, 0.05, 0.15) * (1 - seg(t, 0.55, 1.0))

    render(sc, 'flourish', n, step)


PIECES = {'charge': charge, 'rift': rift, 'burst': burst, 'after': after, 'flourish': flourish}
pick = [p for p in os.environ.get('PART', '').split(',') if p]
for name, fn in PIECES.items():
    if not pick or name in pick:
        fn()
