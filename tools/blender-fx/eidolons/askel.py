"""Askel the Cinderhound's summoning, staged in Blender as one show of eight seconds (a trial: docs/notes/eidolon-blender.md).

Run: python3 tools/blender-fx/eidolons/askel.py <out dir>      (pip install bpy; no display needed, Cycles on the CPU)
     FRAMES=0,12,30 picks frames; STEP=4 renders every fourth; SS=1 renders at the final pixel size (quick looks).

The stages: the wind-up (a sigil burns onto the ground, the heat gathers, embers are drawn in), the arrival (a pillar of flame, the
hound rearing up out of it and slamming down), the howl, the strike (its breath swept across the foes' ground, which catches fire) and
the aftermath (the hound burns away to embers; smoke, falling embers, the scorched ground fading).

The camera is the game's (orthographic, 30 degrees down, turned 45) and the stage is laid in the game's tiles: one tile is one unit, the
hound stands at the origin and the foes lie along +x of the `stage` (turned by `HEADING` to face them). Frames are written see-through,
`SS` times the final pixel size; finish.py shrinks them to the heroes' pixels and lays them over the battle.
"""
import math, os, random, sys
import bpy
from mathutils import Vector

OUT = sys.argv[-1]
FPS = 12
SECONDS = 8.0
N = int(FPS * SECONDS)
# The frame, in the heroes' pixels: 32 to a tile's side (a tile's diamond is 64 world pixels across, and a hero's pixel is about 1.4 of them).
PX = 32
FW, FH = 300, 420
SS = float(os.environ.get('SS', '1.5'))
# Where the camera looks, and which way the foes lie, from the hound's feet (tiles; from plate.json: see finish.py for the same numbers).
AIM = (1.07, 1.16, 0.0)
HEADING = math.atan2(-0.7, 6.7)
BIG = 1.3                                                                  # the hound's size: about four and a half tiles to its ears

rnd = random.Random(11)


# ---- small helpers (the prototype's, tools/blender-fx/prototype.py) ------------------------------------------------------------------

def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def seg(t, a, b):
    """How far `t` is from `a` to `b`, 0 to 1."""
    return clamp((t - a) / (b - a))


def ease(x):
    return x * x * (3 - 2 * x)


def out3(x):
    return 1 - (1 - x) ** 3


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = int(os.environ.get('SAMPLES', '40'))
    sc.cycles.use_denoising = True                                         # (the rock's grain would speckle the pixels otherwise)
    sc.cycles.max_bounces = 3
    sc.cycles.transparent_max_bounces = 64
    sc.render.film_transparent = True
    sc.render.resolution_x = round(FW * SS)
    sc.render.resolution_y = round(FH * SS)
    sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.view_settings.view_transform = 'Standard'
    sc.world = bpy.data.worlds.new('w')
    cam = bpy.data.cameras.new('cam')
    cam.type = 'ORTHO'
    cam.sensor_fit = 'VERTICAL'
    cam.ortho_scale = FH / PX
    ob = bpy.data.objects.new('cam', cam)
    sc.collection.objects.link(ob)
    rx, rz = math.radians(60), math.radians(45)
    ob.rotation_euler = (rx, 0, rz)
    d = 30
    ob.location = (AIM[0] + d * math.sin(rx) * math.sin(rz), AIM[1] - d * math.sin(rx) * math.cos(rz), AIM[2] + d * math.cos(rx))
    sc.camera = ob
    return sc


def mat(name):
    m = bpy.data.materials.new(name)
    try:
        m.use_nodes = True
    except Exception:
        pass
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    return m, nt


def sock(v):
    return v.outputs[0] if isinstance(v, bpy.types.Node) else v


def glow(nt, colour, alpha, strength=1.0):
    """An emitting surface that is see-through where `alpha` is low."""
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    mix = nt.nodes.new('ShaderNodeMixShader')
    tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    em = nt.nodes.new('ShaderNodeEmission')
    em.inputs['Strength'].default_value = strength
    if isinstance(colour, tuple):
        em.inputs['Color'].default_value = colour
    else:
        nt.links.new(sock(colour), em.inputs['Color'])
    nt.links.new(sock(alpha), mix.inputs[0])
    nt.links.new(tr.outputs[0], mix.inputs[1])
    nt.links.new(em.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs['Surface'])
    return em


def mth(nt, op, a, b=None, clamp_=True):
    n = nt.nodes.new('ShaderNodeMath')
    n.operation = op
    n.use_clamp = clamp_
    for i, v in enumerate((a, b)):
        if v is None:
            continue
        if isinstance(v, (int, float)):
            n.inputs[i].default_value = v
        else:
            nt.links.new(sock(v), n.inputs[i])
    return n


def ramp(nt, fac, stops):
    r = nt.nodes.new('ShaderNodeValToRGB')
    els = r.color_ramp.elements
    while len(els) < len(stops):
        els.new(0.5)
    for e, (p, c) in zip(els, stops):
        e.position = p
        e.color = c
    nt.links.new(sock(fac), r.inputs[0])
    return r


def value(nt, v=0.0):
    n = nt.nodes.new('ShaderNodeValue')
    n.outputs[0].default_value = v
    return n


def empty(name, parent=None, loc=(0, 0, 0)):
    o = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(o)
    o.parent = parent
    o.location = loc
    return o


def ball(parent, m, loc=(0, 0, 0), rad=(1, 1, 1), rot=(0, 0, 0), sub=3, smooth=True):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub, radius=1)
    o = bpy.context.object
    o.parent = parent
    o.location = loc
    o.scale = rad
    o.rotation_euler = rot
    if m:
        o.data.materials.append(m)
    if smooth:
        for p in o.data.polygons:
            p.use_smooth = True
    return o


def limb(parent, m, p0, p1, r0, r1):
    """A tapered bone from `p0` to `p1`."""
    a, b = Vector(p0), Vector(p1)
    bpy.ops.mesh.primitive_cone_add(vertices=14, radius1=r0, radius2=r1, depth=(b - a).length)
    o = bpy.context.object
    o.parent = parent
    o.location = (a + b) / 2
    o.rotation_euler = (b - a).to_track_quat('Z', 'Y').to_euler()
    o.data.materials.append(m)
    for p in o.data.polygons:
        p.use_smooth = True
    return o


# ---- the looks -------------------------------------------------------------------------------------------------------------------------

def fire_mat():
    """Flame: a noise that climbs, bright in the middle and thin at the rim and the tip. An object's colour steers it: red is how far it has
    burnt out (0 whole, 1 gone), green how white-hot it runs."""
    m, nt = mat('fire')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    info = nt.nodes.new('ShaderNodeObjectInfo')
    rgb = nt.nodes.new('ShaderNodeSeparateColor')
    nt.links.new(info.outputs['Color'], rgb.inputs[0])
    clock = value(nt)
    mp = nt.nodes.new('ShaderNodeMapping')
    mp.inputs['Scale'].default_value = (1.0, 1.0, 0.55)                   # tongues, longer than wide
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector'])
    climb = nt.nodes.new('ShaderNodeCombineXYZ')
    nt.links.new(mth(nt, 'MULTIPLY', clock, -1.6, False).outputs[0], climb.inputs['Z'])
    nt.links.new(mth(nt, 'MULTIPLY', info.outputs['Random'], 37.0, False).outputs[0], climb.inputs['X'])
    add = nt.nodes.new('ShaderNodeVectorMath')
    nt.links.new(mp.outputs[0], add.inputs[0])
    nt.links.new(climb.outputs[0], add.inputs[1])
    noise = nt.nodes.new('ShaderNodeTexNoise')
    noise.noise_dimensions = '4D'
    noise.inputs['Scale'].default_value = 2.4
    noise.inputs['Detail'].default_value = 4
    noise.inputs['Roughness'].default_value = 0.62
    nt.links.new(add.outputs[0], noise.inputs['Vector'])
    nt.links.new(mth(nt, 'MULTIPLY', clock, 0.5, False).outputs[0], noise.inputs['W'])
    lw = nt.nodes.new('ShaderNodeLayerWeight')
    lw.inputs['Blend'].default_value = 0.4
    core = mth(nt, 'SUBTRACT', 1.0, lw.outputs['Facing'])
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(tc.outputs['Generated'], sep.inputs[0])
    tip = mth(nt, 'SUBTRACT', 1.15, mth(nt, 'POWER', sep.outputs['Z'], 2.2))   # thin at the tip
    heat = mth(nt, 'MULTIPLY', mth(nt, 'MULTIPLY', noise.outputs['Fac'], core), tip)
    hot = mth(nt, 'ADD', heat, mth(nt, 'MULTIPLY', rgb.outputs['Green'], 0.22))
    cut = mth(nt, 'ADD', 0.13, mth(nt, 'MULTIPLY', rgb.outputs['Red'], 0.62))
    alpha = mth(nt, 'MULTIPLY', mth(nt, 'SUBTRACT', heat, cut), 7.0)
    col = ramp(nt, hot, [(0.14, (0.42, 0.03, 0.0, 1)), (0.3, (0.95, 0.17, 0.01, 1)), (0.46, (1.0, 0.5, 0.04, 1)), (0.62, (1.0, 0.86, 0.3, 1)), (0.8, (1.0, 1.0, 0.85, 1))])
    glow(nt, col.outputs['Color'], alpha, 1.25)
    return m, clock


def smoke_mat():
    """Smoke: soft dark puffs. An object's red is how far it has thinned away."""
    m, nt = mat('smoke')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    info = nt.nodes.new('ShaderNodeObjectInfo')
    rgb = nt.nodes.new('ShaderNodeSeparateColor')
    nt.links.new(info.outputs['Color'], rgb.inputs[0])
    clock = value(nt)
    noise = nt.nodes.new('ShaderNodeTexNoise')
    noise.noise_dimensions = '4D'
    noise.inputs['Scale'].default_value = 1.7
    noise.inputs['Detail'].default_value = 3
    nt.links.new(tc.outputs['Object'], noise.inputs['Vector'])
    nt.links.new(mth(nt, 'ADD', mth(nt, 'MULTIPLY', clock, 0.35, False), mth(nt, 'MULTIPLY', info.outputs['Random'], 19.0, False), False).outputs[0], noise.inputs['W'])
    lw = nt.nodes.new('ShaderNodeLayerWeight')
    lw.inputs['Blend'].default_value = 0.45
    core = mth(nt, 'SUBTRACT', 1.0, lw.outputs['Facing'])
    body = mth(nt, 'MULTIPLY', noise.outputs['Fac'], core)
    cut = mth(nt, 'ADD', 0.16, mth(nt, 'MULTIPLY', rgb.outputs['Red'], 0.6))
    alpha = mth(nt, 'MULTIPLY', mth(nt, 'MULTIPLY', mth(nt, 'SUBTRACT', body, cut), 4.0), 0.6)
    col = ramp(nt, body, [(0.15, (0.035, 0.03, 0.035, 1)), (0.5, (0.12, 0.1, 0.1, 1)), (0.8, (0.26, 0.2, 0.17, 1))])
    glow(nt, col.outputs['Color'], alpha, 1.0)
    return m, clock


def rock_mat():
    """The hound's hide: black rock, cracked, the cracks running with lava. `glow_s` is how hard the cracks blaze, `crack_w` how wide they
    gape, `burn` how far the hound has burnt away (0 whole, 1 gone), a bright edge eating across it."""
    m, nt = mat('rock')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    vor = nt.nodes.new('ShaderNodeTexVoronoi')
    vor.feature = 'DISTANCE_TO_EDGE'
    vor.inputs['Scale'].default_value = 1.05
    nt.links.new(tc.outputs['Object'], vor.inputs['Vector'])
    crack_w = value(nt, 0.05)
    glow_s = value(nt, 2.0)
    burn = value(nt, 0.0)
    crack = mth(nt, 'DIVIDE', mth(nt, 'SUBTRACT', crack_w, vor.outputs['Distance']), crack_w)
    lava = ramp(nt, crack, [(0.0, (0, 0, 0, 1)), (0.3, (0.55, 0.03, 0.0, 1)), (0.7, (1.0, 0.3, 0.02, 1)), (1.0, (1.0, 0.7, 0.2, 1))])
    grain = nt.nodes.new('ShaderNodeTexNoise')
    grain.inputs['Scale'].default_value = 6.0
    nt.links.new(tc.outputs['Object'], grain.inputs['Vector'])
    hide = ramp(nt, grain.outputs['Fac'], [(0.3, (0.018, 0.015, 0.018, 1)), (0.75, (0.085, 0.065, 0.06, 1))])
    # (burning away: a noise the threshold climbs through, hot along its edge)
    eat = nt.nodes.new('ShaderNodeTexNoise')
    eat.inputs['Scale'].default_value = 1.6
    eat.inputs['Detail'].default_value = 3
    nt.links.new(tc.outputs['Object'], eat.inputs['Vector'])
    left = mth(nt, 'SUBTRACT', mth(nt, 'ADD', eat.outputs['Fac'], 0.32, False), mth(nt, 'MULTIPLY', burn, 1.45, False), False)
    keep = mth(nt, 'MULTIPLY', left, 14.0)
    edge = mth(nt, 'MULTIPLY', mth(nt, 'SUBTRACT', 1.0, mth(nt, 'MULTIPLY', left, 5.0)), mth(nt, 'GREATER_THAN', burn, 0.001))
    edge_col = ramp(nt, edge, [(0.0, (0, 0, 0, 1)), (0.5, (1.0, 0.3, 0.02, 1)), (1.0, (1.0, 0.85, 0.4, 1))])
    both = nt.nodes.new('ShaderNodeVectorMath')
    nt.links.new(lava.outputs['Color'], both.inputs[0])
    nt.links.new(edge_col.outputs['Color'], both.inputs[1])
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Roughness'].default_value = 0.7
    nt.links.new(hide.outputs['Color'], bsdf.inputs['Base Color'])
    nt.links.new(both.outputs[0], bsdf.inputs['Emission Color'])
    nt.links.new(glow_s.outputs[0], bsdf.inputs['Emission Strength'])
    tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    mix = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(keep.outputs[0], mix.inputs[0])
    nt.links.new(tr.outputs[0], mix.inputs[1])
    nt.links.new(bsdf.outputs[0], mix.inputs[2])
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    nt.links.new(mix.outputs[0], out.inputs['Surface'])
    return m, glow_s, crack_w, burn


def flat_mat(colour, strength=1.0):
    """A plain glowing colour whose strength a value sets (embers, eyes, rings)."""
    m, nt = mat('flat')
    v = value(nt, 1.0)
    glow(nt, colour, v, strength)
    return m, v


def sigil_image(path, size=512):
    """The sigil, drawn white on black: two rings, a ring of runes between them, a three-pointed star of fangs and a hound's eye."""
    from PIL import Image, ImageDraw, ImageFilter
    im = Image.new('L', (size * 2, size * 2), 0)
    d = ImageDraw.Draw(im)
    c = size
    def ring(r, w):
        d.ellipse((c - r, c - r, c + r, c + r), outline=255, width=w)
    ring(size * 0.94, 26)
    ring(size * 0.74, 14)
    ring(size * 0.30, 14)
    r0 = random.Random(5)
    for i in range(18):                                                    # the runes: short strokes between the rings
        a = i / 18 * math.tau
        for k in range(r0.randint(2, 3)):
            a1 = a + r0.uniform(-0.09, 0.09)
            a2 = a1 + r0.uniform(-0.1, 0.1)
            ra, rb = size * r0.uniform(0.77, 0.81), size * r0.uniform(0.87, 0.91)
            d.line((c + math.cos(a1) * ra, c + math.sin(a1) * ra, c + math.cos(a2) * rb, c + math.sin(a2) * rb), fill=255, width=16)
    for i in range(3):                                                     # the fangs: three long blades from the eye to the inner ring
        a = i / 3 * math.tau + math.pi / 2
        tip = (c + math.cos(a) * size * 0.72, c + math.sin(a) * size * 0.72)
        for s in (-1, 1):
            b = a + s * 2.2
            d.line((tip[0], tip[1], c + math.cos(b) * size * 0.3, c + math.sin(b) * size * 0.3), fill=255, width=18)
    for i in range(3):                                                     # and three chords tying them
        a, b = i / 3 * math.tau - math.pi / 2, (i + 1) / 3 * math.tau - math.pi / 2
        d.line((c + math.cos(a) * size * 0.73, c + math.sin(a) * size * 0.73, c + math.cos(b) * size * 0.73, c + math.sin(b) * size * 0.73), fill=255, width=12)
    d.ellipse((c - size * 0.1, c - size * 0.1, c + size * 0.1, c + size * 0.1), fill=255)
    im = im.filter(ImageFilter.GaussianBlur(3)).resize((size, size), Image.LANCZOS)
    im.save(path)


def scorch_image(path, size=512):
    """Where the ground is left black: the sigil's round and the fan the breath swept (the plane is 14 x 10 tiles, the hound 3 in from its left)."""
    from PIL import Image, ImageDraw, ImageFilter
    w, h = size, round(size * 10 / 14)
    k = w / 14
    im = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(im)
    ox, oy = 3 * k, h / 2
    d.ellipse((ox - 3.0 * k, oy - 3.0 * k, ox + 3.0 * k, oy + 3.0 * k), fill=120)
    r0 = random.Random(3)
    for _ in range(60):                                                    # the fan, as ragged patches rather than a clean wedge
        dist = r0.uniform(3.4, 10.4)
        side = max(-1.3, min(1.3, r0.gauss(0, 0.55))) * (0.2 + 0.32 * dist)
        r = r0.uniform(0.35, 1.25)
        d.ellipse((ox + (dist - r) * k, oy + (side - r) * k, ox + (dist + r) * k, oy + (side + r) * k), fill=255)
    im.filter(ImageFilter.GaussianBlur(k * 0.35)).save(path)


def image_node(nt, path):
    n = nt.nodes.new('ShaderNodeTexImage')
    n.image = bpy.data.images.load(path)
    n.image.colorspace_settings.name = 'Non-Color'
    n.extension = 'CLIP'
    return n


# ---- the show ----------------------------------------------------------------------------------------------------------------------------

def build():
    sc = reset()
    os.makedirs(OUT, exist_ok=True)
    stage = empty('stage')
    stage.rotation_euler = (0, 0, HEADING)
    fire, fire_clock = fire_mat()
    smoke, smoke_clock = smoke_mat()
    rock, glow_s, crack_w, burn = rock_mat()

    def tint(o, burnt, white=0.0):
        o.color = (clamp(burnt), clamp(white), 0, 1)

    def tongue(parent, loc=(0, 0, 0)):
        o = ball(parent, fire, loc, sub=3)
        tint(o, 1)
        return o

    # The ground under everything hides whatever is below it (the hound, before it rises).
    hm, hnt = mat('hold')
    ho = hnt.nodes.new('ShaderNodeOutputMaterial')
    hnt.links.new(hnt.nodes.new('ShaderNodeHoldout').outputs[0], ho.inputs['Surface'])
    bpy.ops.mesh.primitive_plane_add(size=60)
    bpy.context.object.data.materials.append(hm)

    # The light: a cool one from the upper left so the rock has a shape, and the fire's own from below.
    sun = bpy.data.lights.new('sun', 'SUN')
    sun.energy = 2.2
    sun.color = (0.75, 0.8, 1.0)
    so = bpy.data.objects.new('sun', sun)
    sc.collection.objects.link(so)
    so.rotation_euler = (math.radians(50), 0, math.radians(120))
    fl = bpy.data.lights.new('firelight', 'POINT')
    fl.color = (1.0, 0.45, 0.1)
    fl.shadow_soft_size = 1.0
    flo = bpy.data.objects.new('firelight', fl)
    sc.collection.objects.link(flo)
    flo.parent = stage
    flo.location = (3.0, -2.5, 1.0)

    # The scorched ground (black, with coals in it), under the sigil.
    scorch_path = os.path.join(OUT, 'scorch-mask.png')
    scorch_image(scorch_path)
    sm, snt = mat('scorch')
    simg = image_node(snt, scorch_path)
    stc = snt.nodes.new('ShaderNodeTexCoord')
    sno = snt.nodes.new('ShaderNodeTexNoise')
    sno.inputs['Scale'].default_value = 3.0
    sno.inputs['Detail'].default_value = 4
    smp = snt.nodes.new('ShaderNodeMapping')
    smp.inputs['Scale'].default_value = (14, 10, 1)                        # (the plane's own stretch, so the grain is in tiles)
    snt.links.new(stc.outputs['Object'], smp.inputs['Vector'])
    snt.links.new(smp.outputs[0], sno.inputs['Vector'])
    scorch_a = value(snt, 0.0)
    scorch_r = value(snt, 0.0)                                              # how far from the hound the ground is burnt yet
    ssep = snt.nodes.new('ShaderNodeSeparateXYZ')
    snt.links.new(stc.outputs['Object'], ssep.inputs[0])
    sx = mth(snt, 'ADD', mth(snt, 'MULTIPLY', ssep.outputs['X'], 14.0, False), 4.0, False)
    sy = mth(snt, 'MULTIPLY', ssep.outputs['Y'], 10.0, False)
    sdist = mth(snt, 'SQRT', mth(snt, 'ADD', mth(snt, 'MULTIPLY', sx, sx, False), mth(snt, 'MULTIPLY', sy, sy, False), False), None, False)
    reached = mth(snt, 'MULTIPLY', mth(snt, 'SUBTRACT', scorch_r, sdist, False), 2.0)
    coal = value(snt, 0.0)
    patchy = mth(snt, 'MULTIPLY', simg.outputs['Color'], mth(snt, 'ADD', 0.1, mth(snt, 'MULTIPLY', sno.outputs['Fac'], 1.5, False), False))
    sa = mth(snt, 'MULTIPLY', mth(snt, 'MULTIPLY', mth(snt, 'MULTIPLY', mth(snt, 'SUBTRACT', patchy, 0.3), 3.0), scorch_a), reached)
    coals = mth(snt, 'MULTIPLY', mth(snt, 'MULTIPLY', mth(snt, 'SUBTRACT', sno.outputs['Fac'], 0.56), 6.0), coal)
    scol = ramp(snt, coals, [(0.0, (0.012, 0.008, 0.008, 1)), (0.5, (0.6, 0.07, 0.0, 1)), (1.0, (1.0, 0.45, 0.05, 1))])
    glow(snt, scol.outputs['Color'], sa, 1.0)
    bpy.ops.mesh.primitive_plane_add(size=1)
    scorch = bpy.context.object
    scorch.parent = stage
    scorch.scale = (14, 10, 1)
    scorch.location = (4, 0, 0.01)
    scorch.data.materials.append(sm)

    # The sigil: burnt on round the ring and inward, white-hot where it is being drawn.
    sig_path = os.path.join(OUT, 'sigil.png')
    sigil_image(sig_path)
    gm, gnt = mat('sigil')
    gimg = image_node(gnt, sig_path)
    gtc = gnt.nodes.new('ShaderNodeTexCoord')
    gsep = gnt.nodes.new('ShaderNodeSeparateXYZ')
    gnt.links.new(gtc.outputs['Object'], gsep.inputs[0])
    ang = mth(gnt, 'ADD', mth(gnt, 'DIVIDE', mth(gnt, 'ARCTAN2', gsep.outputs['Y'], gsep.outputs['X'], False), math.tau, False), 0.5)
    ln = gnt.nodes.new('ShaderNodeVectorMath')
    ln.operation = 'LENGTH'
    gnt.links.new(gtc.outputs['Object'], ln.inputs[0])
    drawn = value(gnt, 0.0)                                                 # 0 to 1: how much of it is drawn
    sig_heat = value(gnt, 1.0)                                              # 1 blazing, 0 dull
    sig_a = value(gnt, 1.0)
    # (the ring first, round from the front; then inward to the eye)
    order = mth(gnt, 'ADD', mth(gnt, 'MULTIPLY', ang, 0.62), mth(gnt, 'MULTIPLY', mth(gnt, 'SUBTRACT', 1.0, mth(gnt, 'MULTIPLY', ln.outputs['Value'], 2.0)), 0.38))
    ahead = mth(gnt, 'SUBTRACT', mth(gnt, 'MULTIPLY', drawn, 1.12, False), order, False)
    shown = mth(gnt, 'MULTIPLY', ahead, 30.0)
    front = mth(gnt, 'SUBTRACT', 1.0, mth(gnt, 'MULTIPLY', ahead, 9.0))     # 1 at the drawing edge, 0 behind it
    hotness = mth(gnt, 'ADD', mth(gnt, 'MULTIPLY', sig_heat, 0.62), mth(gnt, 'MULTIPLY', front, 0.5))
    gcol = ramp(gnt, hotness, [(0.0, (0.25, 0.01, 0.0, 1)), (0.3, (0.75, 0.08, 0.0, 1)), (0.62, (1.0, 0.5, 0.05, 1)), (0.85, (1.0, 0.9, 0.45, 1)), (1.0, (1, 1, 0.9, 1))])
    ga = mth(gnt, 'MULTIPLY', mth(gnt, 'MULTIPLY', mth(gnt, 'MULTIPLY', gimg.outputs['Color'], 1.6), shown), sig_a)
    glow(gnt, gcol.outputs['Color'], ga, 1.3)
    bpy.ops.mesh.primitive_plane_add(size=1)
    sigil = bpy.context.object
    sigil.parent = stage
    sigil.scale = (6.4, 6.4, 1)
    sigil.location = (0, 0, 0.03)
    sigil.data.materials.append(gm)

    # The heat on the ground: a soft round of light under the sigil.
    dm, dnt = mat('heat')
    dtc = dnt.nodes.new('ShaderNodeTexCoord')
    dl = dnt.nodes.new('ShaderNodeVectorMath')
    dl.operation = 'LENGTH'
    dnt.links.new(dtc.outputs['Object'], dl.inputs[0])
    heat_a = value(dnt, 0.0)
    soft = mth(dnt, 'POWER', mth(dnt, 'SUBTRACT', 1.0, mth(dnt, 'MULTIPLY', dl.outputs['Value'], 2.0)), 1.5)
    hcol = ramp(dnt, soft, [(0.0, (0.8, 0.1, 0.0, 1)), (0.6, (1.0, 0.45, 0.05, 1)), (1.0, (1.0, 0.85, 0.4, 1))])
    glow(dnt, hcol.outputs['Color'], mth(dnt, 'MULTIPLY', soft, heat_a), 1.0)
    bpy.ops.mesh.primitive_plane_add(size=1)
    heat = bpy.context.object
    heat.parent = stage
    heat.scale = (8.4, 8.4, 1)
    heat.location = (0, 0, 0.02)
    heat.data.materials.append(dm)

    # Small flames licking round the sigil's ring as it is drawn.
    licks = []
    for i in range(22):
        a = (i + rnd.uniform(-0.3, 0.3)) / 22 * math.tau
        licks.append((tongue(stage), a, rnd.uniform(0.45, 1.15)))

    # Embers drawn in to the middle, spiralling.
    em_m, _ = flat_mat((1.0, 0.6, 0.12, 1), 1.6)
    drawn_in = [(ball(stage, em_m, sub=1, smooth=False), rnd.uniform(0, math.tau), rnd.uniform(3.5, 6.5), rnd.uniform(0, 1), rnd.uniform(0.3, 1.6)) for _ in range(80)]

    # The pillar of flame the hound comes out of.
    pillar = [(tongue(stage), k, rnd.uniform(-0.25, 0.25), rnd.uniform(-0.25, 0.25), rnd.uniform(0, math.tau)) for k in range(11)]
    # (a ring of force along the ground, thrown twice: the pillar, and the slam)
    ring_m, rnt = mat('ring')
    ring_v = value(rnt, 0.0)
    glow(rnt, (1.0, 0.55, 0.12, 1), ring_v, 1.5)
    bpy.ops.mesh.primitive_torus_add(major_radius=1.0, minor_radius=0.022, major_segments=72, minor_segments=8)
    ring = bpy.context.object
    ring.parent = stage
    ring.data.materials.append(ring_m)
    # (a white flash on the ground under the pillar and the slam)
    fm, fnt = mat('flash')
    ftc = fnt.nodes.new('ShaderNodeTexCoord')
    fln = fnt.nodes.new('ShaderNodeVectorMath')
    fln.operation = 'LENGTH'
    fnt.links.new(ftc.outputs['Object'], fln.inputs[0])
    flash_a = value(fnt, 0.0)
    fsoft = mth(fnt, 'POWER', mth(fnt, 'SUBTRACT', 1.0, mth(fnt, 'MULTIPLY', fln.outputs['Value'], 2.0)), 0.8)
    fcol = ramp(fnt, fsoft, [(0.0, (1.0, 0.5, 0.05, 1)), (0.5, (1.0, 0.9, 0.5, 1)), (1.0, (1, 1, 0.95, 1))])
    glow(fnt, fcol.outputs['Color'], mth(fnt, 'MULTIPLY', fsoft, flash_a), 1.4)
    bpy.ops.mesh.primitive_plane_add(size=1)
    flash = bpy.context.object
    flash.parent = stage
    flash.scale = (9, 9, 1)
    flash.location = (0, 0, 0.05)
    flash.data.materials.append(fm)

    # ---- the hound: black cracked rock, lit from within, a mane and tail of flame. It faces +x; `body` turns about its hind feet. ----
    hound = empty('hound', stage)
    hound.scale = (BIG, BIG, BIG)
    PIV = Vector((-1.15, 0, 0))
    body = empty('body', hound, PIV)
    def B(p):
        return Vector(p) - PIV
    ball(body, rock, B((0.75, 0, 1.78)), (0.95, 0.72, 0.88))                # the chest, deep
    ball(body, rock, B((-0.3, 0, 1.75)), (0.95, 0.5, 0.56))                # the loin, drawn in
    ball(body, rock, B((-1.1, 0, 1.62)), (0.62, 0.55, 0.66))               # the haunch
    ball(body, rock, B((1.05, 0, 2.3)), (0.6, 0.56, 0.56))                   # the withers
    for s in (-1, 1):
        ball(body, rock, B((0.95, 0.42 * s, 1.62)), (0.4, 0.26, 0.6))      # the shoulders
        limb(body, rock, B((1.0, 0.44 * s, 1.5)), B((1.12, 0.44 * s, 0.75)), 0.3, 0.2)
        limb(body, rock, B((1.12, 0.44 * s, 0.78)), B((1.05, 0.44 * s, 0.1)), 0.2, 0.16)
        ball(body, rock, B((1.2, 0.44 * s, 0.1)), (0.36, 0.26, 0.16))        # a forepaw
        ball(body, rock, B((-1.1, 0.4 * s, 1.35)), (0.5, 0.26, 0.62))      # the thighs
        limb(body, rock, B((-1.0, 0.44 * s, 1.15)), B((-1.5, 0.44 * s, 0.62)), 0.3, 0.19)
        limb(body, rock, B((-1.5, 0.44 * s, 0.66)), B((-1.2, 0.44 * s, 0.1)), 0.19, 0.15)
        ball(body, rock, B((-1.05, 0.44 * s, 0.1)), (0.36, 0.26, 0.16))      # a hind paw
    NECK = Vector((1.3, 0, 2.3))
    head = empty('head', body, B(NECK))
    head.scale = (1.22, 1.22, 1.22)                                          # (a big head reads at this size)
    def Hd(p):
        return Vector(p) - NECK
    limb(head, rock, Hd((1.15, 0, 2.15)), Hd((1.95, 0, 2.95)), 0.62, 0.42)   # the neck
    ball(head, rock, Hd((2.05, 0, 3.02)), (0.54, 0.48, 0.46))               # the skull
    ball(head, rock, Hd((2.68, 0, 2.97)), (0.66, 0.29, 0.22))               # the snout
    ball(head, rock, Hd((3.28, 0, 3.0)), (0.13, 0.15, 0.11))              # the nose
    for s in (-1, 1):
        limb(head, rock, Hd((1.9, 0.27 * s, 3.25)), Hd((1.6, 0.45 * s, 3.95)), 0.2, 0.0)      # the ears, swept back
        ball(head, rock, Hd((2.25, 0.2 * s, 3.12)), (0.2, 0.12, 0.1))      # the brows
    eye_m, eye_v = flat_mat((1.0, 0.95, 0.5, 1), 4.0)
    for s in (-1, 1):
        ball(head, eye_m, Hd((2.42, 0.27 * s, 3.1)), (0.13, 0.09, 0.09), sub=2)
    JAW = Vector((2.05, 0, 2.86))
    jaw = empty('jaw', head, Hd(JAW))
    ball(jaw, rock, Vector((2.62, 0, 2.76)) - JAW, (0.6, 0.24, 0.1))
    maw_m, maw_v = flat_mat((1.0, 0.75, 0.25, 1), 3.0)
    maw = ball(head, maw_m, Hd((2.45, 0, 2.86)), (0.34, 0.15, 0.05), sub=2)   # the fire in its throat
    fang_m, _ = flat_mat((1.0, 0.95, 0.8, 1), 1.2)
    for s in (-1, 1):
        for x in (3.0, 2.8, 2.6):
            limb(head, fang_m, Hd((x, 0.14 * s, 2.86)), Hd((x + 0.02, 0.14 * s, 2.68)), 0.045, 0.0)
    muzzle = empty('muzzle', head, Hd((3.25, 0, 2.84)))
    # (the mane along the neck and back, the tail, and the fire at its feet)
    mane = []
    for i in range(13):
        u = i / 12
        x = 2.0 - u * 2.6
        z = 3.25 - u * 1.2 if u < 0.35 else 2.83 - (u - 0.35) * 0.55
        par = head if u < 0.3 else body
        loc = Hd((x, 0, z)) if par is head else B((x, 0, z))
        mane.append((tongue(par, loc), Vector(loc), 0.34 + 0.3 * math.sin(u * math.pi), rnd.uniform(0, math.tau)))
    tail = [(tongue(body), i / 6, rnd.uniform(0, math.tau)) for i in range(7)]
    feet = [(tongue(body, B((x, y, 0.2))), rnd.uniform(0, math.tau)) for x, y in ((1.2, 0.44), (1.2, -0.44), (-1.05, 0.44), (-1.05, -0.44))]

    # The breath: a torrent of flame from its jaws, swept across the field.
    NB = 44
    breath = [(tongue(stage), i / (NB - 1), rnd.uniform(-0.2, 0.2), rnd.uniform(0.85, 1.2), rnd.uniform(0, math.tau)) for i in range(NB)]
    # The ground it leaves burning: flames standing in the fan the breath swept.
    fires = []
    for i in range(40):
        dist = rnd.uniform(4.0, 10.5)
        side = rnd.uniform(-1, 1) * (0.2 + 0.34 * dist)
        fires.append((tongue(stage), dist, side, rnd.uniform(0.5, 0.95), rnd.uniform(1.0, 1.9), rnd.uniform(0, 0.5), rnd.uniform(0, math.tau)))
    # Sparks thrown by the slam and by the breath's front, and embers rising off the hound as it burns away.
    spark_m, _ = flat_mat((1.0, 0.8, 0.3, 1), 2.0)
    slam_sparks = [(ball(stage, spark_m, sub=1, smooth=False), rnd.uniform(0, math.tau), rnd.uniform(2.0, 5.5), rnd.uniform(2.5, 6.0)) for _ in range(36)]
    rise = [(ball(stage, em_m, sub=1, smooth=False), rnd.uniform(-2.4, 4.2), rnd.uniform(-0.8, 0.8), rnd.uniform(0.4, 5.0), rnd.uniform(0, 1), rnd.uniform(1.2, 2.6), rnd.uniform(0, math.tau)) for _ in range(60)]
    # Embers falling over the whole field at the end.
    fall = [(ball(stage, em_m, sub=1, smooth=False), rnd.uniform(-3.0, 10.5), rnd.uniform(-4.5, 4.5), rnd.uniform(2.5, 7.5), rnd.uniform(0, 1), rnd.uniform(0, math.tau)) for _ in range(70)]
    # Smoke off the burnt ground and off where the hound stood.
    def puff():
        o = ball(stage, smoke, sub=3)
        tint(o, 1)
        return o
    smokes = [(puff(), rnd.uniform(4.0, 10.5), rnd.uniform(-1, 1), rnd.uniform(0, 0.9), rnd.uniform(0.8, 1.4), rnd.uniform(0, math.tau)) for _ in range(20)]
    smokes += [(puff(), rnd.uniform(-1.5, 3.5), rnd.uniform(-0.8, 0.8), rnd.uniform(0.5, 1.1), rnd.uniform(1.0, 1.5), rnd.uniform(0, math.tau)) for _ in range(6)]

    # The times (seconds).
    T_SIGIL, T_PILLAR, T_RISE, T_SLAM, T_HOWL, T_BREATH, T_BREATH_END, T_BURN, T_END = 0.15, 2.25, 2.4, 3.45, 3.65, 4.45, 5.8, 6.15, 8.0
    stage_inv = None

    def step(t):
        nonlocal stage_inv
        fire_clock.outputs[0].default_value = t * 2.2
        smoke_clock.outputs[0].default_value = t
        wind = seg(t, T_SIGIL, T_PILLAR)
        here = seg(t, T_RISE, T_RISE + 0.5)                                  # the hound has come
        gone = seg(t, T_BURN, T_BURN + 1.0)                                  # the hound burning away
        cool = seg(t, T_BURN + 0.2, T_END - 0.15)                            # the field cooling

        # the sigil and the heat
        drawn.outputs[0].default_value = ease(seg(t, T_SIGIL, T_PILLAR - 0.45))
        sig_heat.outputs[0].default_value = (0.55 + 0.45 * seg(t, T_PILLAR - 0.6, T_PILLAR)) * (1 - 0.9 * cool) + 0.08 * math.sin(t * 9)
        sig_a.outputs[0].default_value = 1 - seg(t, T_END - 1.0, T_END - 0.1)
        heat_a.outputs[0].default_value = (0.08 + 0.27 * wind ** 2) * (1 - seg(t, T_BURN, T_BURN + 1.2)) * (0.9 + 0.1 * math.sin(t * 13))
        scorch_a.outputs[0].default_value = 0.6 * seg(t, T_PILLAR, T_PILLAR + 0.4) * (1 - seg(t, T_END - 0.9, T_END - 0.05))
        scorch_r.outputs[0].default_value = 3.4 + 9.0 * seg(t, T_BREATH + 0.15, T_BREATH_END)
        coal.outputs[0].default_value = seg(t, T_BREATH + 0.3, T_BREATH_END) * (1 - cool)
        fl.energy = 2500 * (0.15 * wind + here) * (1 - gone) * (1.0 + 0.8 * seg(t, T_BREATH, T_BREATH + 0.3) * (1 - seg(t, T_BREATH_END, T_BURN)))
        for o, a, s in licks:
            lit = seg(drawn.outputs[0].default_value * 1.12, a / math.tau * 0.62 + 0.02, a / math.tau * 0.62 + 0.12)
            die = seg(t, T_BURN + 0.2, T_BURN + 1.3)
            k = lit * (0.55 + 0.45 * wind) * s
            kk = k * (0.8 + 0.25 * math.sin(t * 10 + a * 7))
            o.location = (math.cos(a + math.pi) * 2.98, math.sin(a + math.pi) * 2.98, 0.3 * kk)
            o.scale = (0.3 * k, 0.3 * k, 0.55 * kk * (1 + 0.8 * seg(t, T_PILLAR, T_SLAM)))
            tint(o, die if lit > 0 else 1, 0.1)
        for o, a, r, ph, h in drawn_in:
            g = (t * 0.7 + ph) % 1.0
            on = seg(t, T_SIGIL + 0.2 + ph * 0.5, T_SIGIL + 0.9) * (1 - seg(t, T_PILLAR - 0.1, T_PILLAR + 0.15))
            rr = r * (1 - g) ** 1.4
            aa = a + g * 3.4
            k = 0.05 * on * math.sin(clamp(g) * math.pi) ** 0.6 * (1 + wind)
            o.location = (math.cos(aa) * rr, math.sin(aa) * rr, 0.15 + h * g * (1 - g) * 3)
            o.scale = (k, k, k)

        # the pillar, the ring and the flash
        up = out3(seg(t, T_PILLAR, T_PILLAR + 0.3))
        dn = seg(t, T_SLAM - 0.45, T_SLAM + 0.25)
        for o, k, x, y, ph in pillar:
            u = k / 10
            shown = seg(up, u * 0.85, u * 0.85 + 0.15)
            r = (2.1 - 1.1 * u) * (0.35 + 0.65 * shown) * (1 - 0.45 * dn) * (1 + 0.1 * math.sin(t * 17 + ph))
            o.location = (x * (1 - u), y * (1 - u), 0.6 + u * 9.5 * up)
            o.scale = (r, r, 2.2 * (0.5 + 0.5 * shown))
            o.rotation_euler = (0, 0, ph + t * 2)
            tint(o, 1 if shown <= 0 else clamp(dn * 1.15 + 0.25 * u * dn), 0.75 * (1 - u) * (1 - dn))
        # (the ring: at the pillar, then again at the slam)
        r1, r2 = seg(t, T_PILLAR, T_PILLAR + 0.55), seg(t, T_SLAM, T_SLAM + 0.6)
        rr, ra = (r2, 1 - r2) if r2 > 0 else (r1, 1 - r1)
        ring.scale = (0.8 + 8.5 * out3(rr), 0.8 + 8.5 * out3(rr), 1.6)
        ring.location = (1.5 if r2 > 0 else 0, 0, 0.12)
        ring_v.outputs[0].default_value = ra if 0 < rr < 1 else 0
        flash_a.outputs[0].default_value = max(1 - seg(t, T_PILLAR, T_PILLAR + 0.4) if t >= T_PILLAR else 0, 0.8 * (1 - seg(t, T_SLAM, T_SLAM + 0.3)) if t >= T_SLAM else 0)
        flash.location = (1.5 if t >= T_SLAM else 0, 0, 0.05)

        # the hound: up out of the ground rearing, down on its forefeet, the howl, the breath, and away
        rise_k = out3(seg(t, T_RISE, T_SLAM - 0.4))
        fall_k = seg(t, T_SLAM - 0.3, T_SLAM) ** 2
        rear = -0.82 * (1 - fall_k)
        howl = math.sin(seg(t, T_HOWL, T_BREATH - 0.15) * math.pi) ** 0.7
        brace = seg(t, T_BREATH - 0.3, T_BREATH) * (1 - seg(t, T_BREATH_END, T_BREATH_END + 0.3))
        breathing = seg(t, T_BREATH, T_BREATH + 0.12) * (1 - seg(t, T_BREATH_END - 0.1, T_BREATH_END + 0.1))
        sweep = math.radians(24) * (1 - 2 * ease(seg(t, T_BREATH, T_BREATH_END)))
        hound.location = (0, 0, -7.5 * BIG * (1 - rise_k))
        recoil = 0.06 * breathing * math.sin(t * 40)
        body.rotation_euler = (0, rear + 0.1 * brace + recoil - 0.06 * howl, 0)
        body.location = PIV + Vector((-0.25 * brace, 0, -0.1 * brace + 0.25 * math.sin(seg(t, T_SLAM, T_SLAM + 0.35) * math.pi) * -0.5))
        head.rotation_euler = (0, -0.75 * howl + 0.62 * brace - 0.25 * (1 - fall_k), sweep * brace)
        jaw.rotation_euler = (0, 0.25 * (1 - fall_k) + 0.55 * howl + 0.7 * breathing + 0.08 * brace, 0)
        surge = max(seg(t, T_BREATH - 0.35, T_BREATH + 0.1) * (1 - seg(t, T_BREATH_END, T_BREATH_END + 0.5)), 0.6 * howl, 1 - seg(t, T_RISE, T_SLAM + 0.3))
        glow_s.outputs[0].default_value = 1.5 + 2.2 * surge + 0.25 * math.sin(t * 7)
        crack_w.outputs[0].default_value = 0.045 + 0.04 * surge
        burn.outputs[0].default_value = ease(gone)
        eye_v.outputs[0].default_value = 1 - seg(gone, 0.2, 0.5)
        maw_v.outputs[0].default_value = max(howl, breathing, 0.4 * (1 - fall_k)) * (1 - gone)
        blaze = (1 - seg(gone, 0.1, 0.9)) * here
        for o, loc, s, ph in mane:
            k = s * (1 + 0.5 * surge) * (0.9 + 0.2 * math.sin(t * 11 + ph))
            o.location = loc + Vector((-0.12 * k, 0, 0.75 * k))
            o.scale = (0.5 * k, 0.42 * k, 1.35 * k)
            o.rotation_euler = (0, -0.5 + 0.2 * math.sin(t * 6 + ph), 0)
            tint(o, 1 - blaze, 0.35 * surge)
        for o, u, ph in tail:
            sway = 0.35 * math.sin(t * 4 + u * 2.5)
            x = -1.62 - 0.95 * u - 0.5 * u * u
            z = 1.95 + 1.5 * u - 0.5 * u * u
            k = (0.42 - 0.2 * u) * (1 + 0.3 * surge) * (0.9 + 0.2 * math.sin(t * 12 + ph))
            o.location = B((x, sway * u, z))
            o.scale = (0.85 * k, 0.85 * k, 1.5 * k)
            o.rotation_euler = (0, -0.9 + u * 0.6, 0)
            tint(o, 1 - blaze, 0.3 * (1 - u))
        for o, ph in feet:
            k = 0.3 * (0.85 + 0.25 * math.sin(t * 13 + ph))
            o.scale = (k, k, k * 1.9)
            tint(o, 1 - blaze * seg(t, T_SLAM, T_SLAM + 0.2), 0.0)

        # the breath: each puff leaves the jaws in turn, drops to the ground and runs along it, swelling and tearing apart
        bpy.context.view_layer.update()
        if stage_inv is None:
            stage_inv = stage.matrix_world.inverted()
        m0 = stage_inv @ muzzle.matrix_world.translation
        for o, u, wob, s, ph in breath:
            t0 = T_BREATH + u * (T_BREATH_END - T_BREATH - 0.25)
            g = (t - t0) / 0.62
            if g <= 0 or g >= 1:
                o.scale = (0, 0, 0)
                tint(o, 1)
                continue
            # (where the jaws were when it left them, on this run of the sweep)
            a0 = math.radians(24) * (1 - 2 * ease(seg(t0, T_BREATH, T_BREATH_END))) + wob * 0.25
            reach = 6.2 * (1 - (1 - g) ** 1.7)
            p = Vector((m0.x + math.cos(a0) * reach, m0.y + math.sin(a0) * reach + wob * 2.2 * g, 0.5 + (m0.z - 0.5) * (1 - g) ** 2.4 + 0.6 * g * g))
            r = (0.4 + 1.75 * g ** 0.8) * s
            o.location = p
            o.scale = (r * 1.25, r, r * (0.9 + 0.5 * g))
            o.rotation_euler = (ph + t * 3, 0.4, a0)
            tint(o, g ** 2.2 * 0.95, 0.9 * (1 - g) ** 1.5)
        # (the jaws' fire: one hot ball held at the muzzle while it breathes)
        maw.scale = Vector((0.34, 0.15, 0.05)) * (1 + 1.6 * breathing)
        for o, dist, side, r, h, late, ph in fires:
            t_on = T_BREATH + 0.15 + seg(dist, 4.0, 10.5) * 0.35                    # lit as the front passes
            # (the breath sweeps from one side to the other: the far side of the fan lights later)
            t_on += 0.7 * seg(-side / (0.2 + 0.34 * dist), -1, 1)
            on = out3(seg(t, t_on, t_on + 0.25))
            die = seg(t, T_BURN + late, T_BURN + late + 0.9)
            k = on * (1 - 0.35 * die) * (0.88 + 0.2 * math.sin(t * 12 + ph))
            o.location = (dist, side, h * 0.48 * k)
            o.scale = (r * k, r * k, h * 0.62 * k * (1 + 0.4 * (1 - seg(t, t_on, t_on + 0.6))))
            o.rotation_euler = (0, 0, ph)
            tint(o, 1 if on <= 0 else die, 0.5 * (1 - seg(t, t_on, t_on + 0.5)))

        # sparks, embers and smoke
        g = seg(t, T_SLAM, T_SLAM + 0.9)
        for o, a, v, vz in slam_sparks:
            k = 0.06 * (1 - g) if 0 < g < 1 else 0
            o.location = (1.6 + math.cos(a) * v * 1.4 * g, math.sin(a) * v * 1.4 * g, 0.2 + vz * g - 5.5 * g * g)
            o.scale = (k, k, k)
        for o, x, y, z, ph, v, a in rise:
            g = seg(t, T_BURN + ph * 0.8, T_BURN + ph * 0.8 + 1.1)
            k = 0.055 * math.sin(g * math.pi) ** 0.5 if 0 < g < 1 else 0
            o.location = (x + 0.3 * math.sin(a + t * 3), y + 0.3 * math.cos(a + t * 2.5), z + v * g)
            o.scale = (k, k, k)
        for o, x, y, z, ph, a in fall:
            g = seg(t, T_BREATH_END - 0.3 + ph * 1.1, T_BREATH_END + 1.2 + ph * 1.1)
            k = 0.05 * min(1, g * 6) * (1 - g) ** 0.5 if 0 < g < 1 else 0
            o.location = (x + 0.4 * math.sin(a + t * 1.7), y, max(0.08, z * (1 - g * 1.05)))
            o.scale = (k, k, k)
        for i, (o, x, y, late, s, ph) in enumerate(smokes):
            from_hound = i >= 20
            t0 = (T_BURN + 0.1 if from_hound else T_BREATH + 0.7) + late
            g = seg(t, t0, min(T_END + 0.2, t0 + 2.2))
            if g <= 0:
                o.scale = (0, 0, 0)
                continue
            yy = y * (1.0 if from_hound else (0.2 + 0.34 * x))
            r = s * (0.7 + 1.3 * g)
            o.location = (x - 0.5 * g, yy + 0.4 * g, (1.3 if from_hound else 0.7) + 3.0 * g * s)
            o.scale = (r, r, r * 0.8)
            o.rotation_euler = (0, 0, ph + t * 0.4)
            tint(o, max(seg(t, T_END - 0.9, T_END), g ** 1.6, 1 - seg(g, 0, 0.15)))

    return sc, step


def main():
    sc, step = build()
    want = os.environ.get('FRAMES')
    frames = [int(x) for x in want.split(',')] if want else list(range(0, N, int(os.environ.get('STEP', '1'))))
    for f in frames:
        step(f / FPS)
        sc.render.filepath = os.path.join(OUT, f'{f:03d}.png')
        bpy.ops.render.render(write_still=True)
        print('frame', f, flush=True)


main()
