"""Four battle effects rendered in Blender from the game's camera angle, as transparent frames.

Run: python3 fx.py <out dir>. Each effect writes <out>/<name>/NN.png (16 frames, 160 x 160).
"""
import math, os, random, sys
import bpy

OUT = sys.argv[-1]
FRAMES = 16
SIZE = 160


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = 24
    sc.cycles.use_denoising = False
    sc.cycles.max_bounces = 3
    sc.cycles.transparent_max_bounces = 24
    sc.render.film_transparent = True
    sc.render.resolution_x = SIZE
    sc.render.resolution_y = SIZE
    sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.view_settings.view_transform = 'Standard'
    world = bpy.data.worlds.new('w')
    sc.world = world
    # The game's view: looking down at 30 degrees, turned 45 (a 2:1 diamond grid).
    cam = bpy.data.cameras.new('cam')
    cam.type = 'ORTHO'
    cam.ortho_scale = 4.2
    ob = bpy.data.objects.new('cam', cam)
    sc.collection.objects.link(ob)
    rx, rz = math.radians(60), math.radians(45)
    ob.rotation_euler = (rx, 0, rz)
    d = 12
    ob.location = (d * math.sin(rx) * math.sin(rz), -d * math.sin(rx) * math.cos(rz), d * math.cos(rx) + 0.9)
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


def glow(nt, colour, alpha, strength=6.0):
    """An emitting surface that is see-through where `alpha` is low. Returns the emission node."""
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


def math_node(nt, op, a, b=None, clamp=True):
    n = nt.nodes.new('ShaderNodeMath')
    n.operation = op
    n.use_clamp = clamp
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


def render(sc, name, step):
    os.makedirs(os.path.join(OUT, name), exist_ok=True)
    for f in range(FRAMES):
        step(f / (FRAMES - 1))
        sc.render.filepath = os.path.join(OUT, name, f'{f:02d}.png')
        bpy.ops.render.render(write_still=True)
    print('done', name, flush=True)


def spark_mat(colour, strength=14):
    strength = 2.2
    m, nt = mat('spark')
    v = nt.nodes.new('ShaderNodeValue')
    v.outputs[0].default_value = 1
    glow(nt, colour, v.outputs[0], strength)
    return m, v


# 1. Fire burst: a ball of flame that swells, rises and tears apart, throwing embers.
def fire():
    sc = reset()
    m, nt = mat('fire')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    noise = nt.nodes.new('ShaderNodeTexNoise')
    noise.noise_dimensions = '4D'
    noise.inputs['Scale'].default_value = 2.2
    noise.inputs['Detail'].default_value = 5
    noise.inputs['Roughness'].default_value = 0.6
    nt.links.new(tc.outputs['Object'], noise.inputs['Vector'])
    lw = nt.nodes.new('ShaderNodeLayerWeight')
    lw.inputs['Blend'].default_value = 0.35
    core = math_node(nt, 'SUBTRACT', 1.0, lw.outputs['Facing'])       # bright in the middle, thin at the rim
    heat = math_node(nt, 'MULTIPLY', noise.outputs['Fac'], core)
    cut = math_node(nt, 'SUBTRACT', heat, 0.2)                          # the threshold rises as the fire dies
    alpha = math_node(nt, 'MULTIPLY', cut, 6.0)
    col = ramp(nt, heat, [(0.12, (0.35, 0.02, 0.0, 1)), (0.3, (0.9, 0.16, 0.01, 1)), (0.48, (1.0, 0.5, 0.05, 1)), (0.7, (1.0, 0.9, 0.45, 1))])
    glow(nt, col.outputs['Color'], alpha.outputs[0], 1.25)
    balls = []
    rnd = random.Random(7)
    for i in range(5):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=4, radius=1)
        o = bpy.context.object
        o.data.materials.append(m)
        balls.append((o, rnd.uniform(-0.35, 0.35), rnd.uniform(-0.35, 0.35), rnd.uniform(0.7, 1.15), rnd.uniform(0, 0.12)))
    sm, sv = spark_mat((1.0, 0.55, 0.1, 1))
    embers = []
    for i in range(22):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.045)
        o = bpy.context.object
        o.data.materials.append(sm)
        a = rnd.uniform(0, math.tau)
        embers.append((o, math.cos(a) * rnd.uniform(1.2, 2.6), math.sin(a) * rnd.uniform(1.2, 2.6), rnd.uniform(2.5, 5.0)))

    def step(t):
        noise.inputs['W'].default_value = t * 1.6
        cut.inputs[1].default_value = 0.12 + 0.5 * t * t
        grow = 1 - (1 - t) ** 3
        for o, x, y, s, lag in balls:
            g = max(0.0, min(1.0, (t - lag) / (1 - lag)))
            gg = 1 - (1 - g) ** 3
            r = 0.25 + 1.0 * gg * s
            o.scale = (r, r, r * 1.15)
            o.location = (x * (0.4 + gg), y * (0.4 + gg), 0.5 + 1.3 * g * s)
            o.rotation_euler = (g * 1.2, g * 0.7, x * 3)
        for o, vx, vy, vz in embers:
            o.location = (vx * t, vy * t, 0.4 + vz * t - 4.5 * t * t)
            k = max(0.0, 1 - t * 1.1)
            o.scale = (k, k, k)
        sv.outputs[0].default_value = 1

    render(sc, 'fire-burst', step)


# 2. Blessing: a ring that spreads on the ground, a pillar of light and sparks climbing a spiral.
def blessing():
    sc = reset()
    # the pillar
    m, nt = mat('pillar')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(tc.outputs['Generated'], sep.inputs[0])
    noise = nt.nodes.new('ShaderNodeTexNoise')
    noise.noise_dimensions = '4D'
    noise.inputs['Scale'].default_value = 3.0
    mp = nt.nodes.new('ShaderNodeMapping')
    mp.inputs['Scale'].default_value = (1, 1, 0.18)                     # long streaks running up the pillar
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector'])
    nt.links.new(mp.outputs[0], noise.inputs['Vector'])
    fall = math_node(nt, 'SUBTRACT', 1.0, sep.outputs['Z'])            # bright at the foot, gone at the top
    fall2 = math_node(nt, 'POWER', fall.outputs[0], 1.6)
    streak = math_node(nt, 'MULTIPLY', noise.outputs['Fac'], fall2.outputs[0])
    fade = math_node(nt, 'MULTIPLY', streak.outputs[0], 1.0)
    col = ramp(nt, fall.outputs[0], [(0.0, (0.1, 0.75, 0.2, 1)), (0.6, (0.45, 1.0, 0.3, 1)), (1.0, (0.95, 1.0, 0.6, 1))])
    glow(nt, col.outputs['Color'], fade.outputs[0], 1.3)
    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=0.75, depth=3.2, end_fill_type='NOTHING')
    pillar = bpy.context.object
    pillar.location = (0, 0, 1.6)
    pillar.data.materials.append(m)
    # the ring on the ground
    rm, rnt = mat('ring')
    rv = rnt.nodes.new('ShaderNodeValue')
    glow(rnt, (0.4, 1.0, 0.35, 1), rv.outputs[0], 1.8)
    bpy.ops.mesh.primitive_torus_add(major_radius=1.0, minor_radius=0.045, major_segments=64, minor_segments=8)
    ring = bpy.context.object
    ring.data.materials.append(rm)
    bpy.ops.mesh.primitive_torus_add(major_radius=1.0, minor_radius=0.025, major_segments=64, minor_segments=8)
    ring2 = bpy.context.object
    ring2.data.materials.append(rm)
    sm, sv = spark_mat((1.0, 1.0, 0.6, 1), 18)
    sparks = []
    rnd = random.Random(3)
    for i in range(26):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.05)
        o = bpy.context.object
        o.data.materials.append(sm)
        sparks.append((o, rnd.uniform(0, math.tau), rnd.uniform(0.5, 1.0), rnd.uniform(0, 0.5), rnd.uniform(1.5, 3.0)))

    def step(t):
        noise.inputs['W'].default_value = t
        mp.inputs['Location'].default_value = (0, 0, -t * 2.5)          # the streaks climb
        up = min(1.0, t * 3)
        out = max(0.0, (t - 0.7) / 0.3)
        fade.inputs[1].default_value = 2.2 * up * (1 - out)
        w = 1 - 0.35 * out
        pillar.scale = (w, w, 1)
        r = 0.3 + 1.25 * (1 - (1 - t) ** 3)
        ring.scale = (r, r, 1)
        ring.location = (0, 0, 0.03)
        r2 = 0.2 + 0.9 * (1 - (1 - max(0, t - 0.15) / 0.85) ** 3)
        ring2.scale = (r2, r2, 1)
        ring2.location = (0, 0, 0.03)
        rv.outputs[0].default_value = max(0.0, 1 - out)
        for o, a, rad, lag, speed in sparks:
            g = max(0.0, t - lag * 0.6)
            ang = a + g * 5
            o.location = (math.cos(ang) * rad * 0.8, math.sin(ang) * rad * 0.8, 0.1 + g * speed)
            k = 0 if g <= 0 else max(0.0, 1 - g * 1.6)
            o.scale = (k, k, k)

    render(sc, 'blessing', step)


# 3. Ice spikes: real solid shards that burst from the ground, catch the light, then sink away.
def ice():
    sc = reset()
    sun = bpy.data.lights.new('sun', 'SUN')
    sun.energy = 4.5
    so = bpy.data.objects.new('sun', sun)
    so.rotation_euler = (math.radians(50), 0, math.radians(-30))
    sc.collection.objects.link(so)
    rim = bpy.data.lights.new('rim', 'SUN')
    rim.energy = 3.0
    rim.color = (0.4, 0.7, 1.0)
    ro = bpy.data.objects.new('rim', rim)
    ro.rotation_euler = (math.radians(70), 0, math.radians(150))
    sc.collection.objects.link(ro)
    sc.world.use_nodes = True
    bg = sc.world.node_tree.nodes.get('Background') or sc.world.node_tree.nodes.new('ShaderNodeBackground')
    bg.inputs[0].default_value = (0.25, 0.4, 0.6, 1)
    bg.inputs[1].default_value = 0.8
    m, nt = mat('ice')
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    pb = nt.nodes.new('ShaderNodeBsdfPrincipled')
    pb.inputs['Base Color'].default_value = (0.55, 0.82, 1.0, 1)
    pb.inputs['Roughness'].default_value = 0.12
    pb.inputs['Metallic'].default_value = 0.25
    try:
        pb.inputs['Emission Color'].default_value = (0.2, 0.55, 1.0, 1)
        pb.inputs['Emission Strength'].default_value = 0.6
    except KeyError:
        pass
    tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    mix = nt.nodes.new('ShaderNodeMixShader')
    av = nt.nodes.new('ShaderNodeValue')
    nt.links.new(av.outputs[0], mix.inputs[0])
    nt.links.new(tr.outputs[0], mix.inputs[1])
    nt.links.new(pb.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs['Surface'])
    rnd = random.Random(11)
    shards = []
    spots = [(0, 0, 1.0, 0.0)] + [(math.cos(i * math.tau / 7) * rnd.uniform(0.55, 1.05), math.sin(i * math.tau / 7) * rnd.uniform(0.55, 1.05), rnd.uniform(0.45, 0.8), rnd.uniform(0.05, 0.3)) for i in range(7)]
    for x, y, h, lag in spots:
        bpy.ops.mesh.primitive_cone_add(vertices=5, radius1=0.26 * (0.6 + h * 0.6), radius2=0.0, depth=2.2 * h)
        o = bpy.context.object
        o.data.materials.append(m)
        tilt = (x * 0.35, -y * 0.35) if (x or y) else (0, 0)
        o.rotation_euler = (-tilt[1], tilt[0], rnd.uniform(0, 1))
        shards.append((o, x, y, 2.2 * h, lag))
    # frost on the ground
    fm, fnt = mat('frost')
    tc = fnt.nodes.new('ShaderNodeTexCoord')
    ln = fnt.nodes.new('ShaderNodeVectorMath')
    ln.operation = 'LENGTH'
    fnt.links.new(tc.outputs['Object'], ln.inputs[0])
    far = math_node(fnt, 'DIVIDE', ln.outputs['Value'], 1.7)
    grad = math_node(fnt, 'SUBTRACT', 1.0, far.outputs[0])
    fn = fnt.nodes.new('ShaderNodeTexNoise')
    fn.inputs['Scale'].default_value = 9
    fmul = math_node(fnt, 'MULTIPLY', grad.outputs[0], fn.outputs['Fac'])
    fa = math_node(fnt, 'MULTIPLY', fmul.outputs[0], 2.0)
    glow(fnt, (0.6, 0.85, 1.0, 1), fa.outputs[0], 1.0)
    bpy.ops.mesh.primitive_plane_add(size=3.6)
    frost = bpy.context.object
    frost.location = (0, 0, 0.01)
    frost.data.materials.append(fm)

    def step(t):
        for o, x, y, h, lag in shards:
            g = max(0.0, min(1.0, (t - lag) / 0.28))
            pop = 1 - (1 - g) ** 3 + 0.12 * math.sin(g * math.pi)       # shoots up, with a little overshoot
            sink = max(0.0, (t - 0.78) / 0.22)
            k = max(0.001, pop * (1 - sink))
            o.scale = (1, 1, k)
            o.location = (x, y, h * k / 2 - 0.02)
        av.outputs[0].default_value = 1 - 0.6 * max(0.0, (t - 0.8) / 0.2)
        fa.inputs[1].default_value = 2.4 * min(1.0, t * 4) * (1 - max(0.0, (t - 0.8) / 0.2))
        s = 0.4 + 0.6 * min(1.0, t * 3)
        frost.scale = (s, s, 1)

    render(sc, 'ice-spikes', step)


# 4. Sword arc: a ribbon of light swept round the hero, standing in real space so it tilts with the view.
def slash():
    sc = reset()
    me = bpy.data.meshes.new('arc')
    n = 64
    verts, faces, us = [], [], []
    for i in range(n + 1):
        u = i / n
        a = math.radians(-110 + 250 * u)
        w = 0.42 * math.sin(u * math.pi) ** 0.7 + 0.01
        for r in (1.25 - w * 0.35, 1.25 + w):
            verts.append((math.cos(a) * r, math.sin(a) * r, 0))
            us.append(u)
    for i in range(n):
        faces.append((i * 2, i * 2 + 1, i * 2 + 3, i * 2 + 2))
    me.from_pydata(verts, [], faces)
    uv = me.uv_layers.new(name='uv')
    for poly in me.polygons:
        for li in poly.loop_indices:
            vi = me.loops[li].vertex_index
            uv.data[li].uv = (us[vi], vi % 2)
    arc = bpy.data.objects.new('arc', me)
    sc.collection.objects.link(arc)
    arc.location = (0, 0, 0.9)
    arc.rotation_euler = (math.radians(28), math.radians(-12), 0)
    m, nt = mat('arc')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(tc.outputs['UV'], sep.inputs[0])
    head = nt.nodes.new('ShaderNodeValue')                              # where the blade is along the arc
    behind = math_node(nt, 'SUBTRACT', head.outputs[0], sep.outputs['X'], clamp=False)
    trail = math_node(nt, 'DIVIDE', behind.outputs[0], 0.55, clamp=False)
    tail = math_node(nt, 'SUBTRACT', 1.0, trail.outputs[0])            # bright at the blade, fading behind it
    ahead = math_node(nt, 'GREATER_THAN', behind.outputs[0], 0.0)
    a1 = math_node(nt, 'MULTIPLY', tail.outputs[0], ahead.outputs[0])
    a2 = math_node(nt, 'POWER', a1.outputs[0], 1.5)
    inner = math_node(nt, 'SUBTRACT', 1.0, sep.outputs['Y'])           # the outer edge is the sharp one
    edge = math_node(nt, 'POWER', sep.outputs['Y'], 2.0)
    a3 = math_node(nt, 'MULTIPLY', a2.outputs[0], math_node(nt, 'ADD', edge.outputs[0], 0.25).outputs[0])
    fade = math_node(nt, 'MULTIPLY', a3.outputs[0], 1.0)
    col = ramp(nt, a2.outputs[0], [(0.0, (0.05, 0.2, 0.9, 1)), (0.5, (0.2, 0.65, 1.0, 1)), (0.95, (0.85, 0.97, 1.0, 1))])
    glow(nt, col.outputs['Color'], fade.outputs[0], 1.5)
    arc.data.materials.append(m)
    sm, sv = spark_mat((0.7, 0.9, 1.0, 1), 16)
    rnd = random.Random(5)
    sparks = []
    for i in range(14):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.04)
        o = bpy.context.object
        o.data.materials.append(sm)
        sparks.append((o, rnd.uniform(0.25, 0.95), rnd.uniform(0.6, 1.6), rnd.uniform(-0.6, 0.9)))
    mw = arc.matrix_world

    def step(t):
        sweep = 1 - (1 - min(1.0, t / 0.6)) ** 2                        # the swing is fast, the glow lingers
        head.outputs[0].default_value = sweep * 1.05
        fade.inputs[1].default_value = 1.6 * (1 - max(0.0, (t - 0.55) / 0.45))
        bpy.context.view_layer.update()
        for o, u, speed, vz in sparks:
            g = max(0.0, t - u * 0.6)                                    # each spark leaves as the blade passes it
            a = math.radians(-110 + 250 * u)
            r = 1.5 + g * speed * 2
            p = arc.matrix_world @ __import__('mathutils').Vector((math.cos(a) * r, math.sin(a) * r, 0))
            o.location = (p.x, p.y, p.z + vz * g - 2 * g * g)
            k = 0 if g <= 0 else max(0.0, 1 - g * 2.2)
            o.scale = (k, k, k)

    render(sc, 'sword-arc', step)



def ribbon(sc, name, pts, width):
    """A flat strip of quads along `pts` (each a point and a sideways direction); u runs along it."""
    me = bpy.data.meshes.new(name)
    verts, faces, us = [], [], []
    n = len(pts) - 1
    for i, (p, side) in enumerate(pts):
        w = width(i / n)
        verts.append((p[0] - side[0] * w, p[1] - side[1] * w, p[2] - side[2] * w))
        verts.append((p[0] + side[0] * w, p[1] + side[1] * w, p[2] + side[2] * w))
        us += [i / n, i / n]
    for i in range(n):
        faces.append((i * 2, i * 2 + 1, i * 2 + 3, i * 2 + 2))
    me.from_pydata(verts, [], faces)
    uv = me.uv_layers.new(name='uv')
    for poly in me.polygons:
        for li in poly.loop_indices:
            vi = me.loops[li].vertex_index
            uv.data[li].uv = (us[vi], vi % 2)
    ob = bpy.data.objects.new(name, me)
    sc.collection.objects.link(ob)
    return ob


def disc_glow(colour, strength, reach=1.0):
    """A plane that glows in a soft round patch."""
    m, nt = mat('disc')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    ln = nt.nodes.new('ShaderNodeVectorMath')
    ln.operation = 'LENGTH'
    nt.links.new(tc.outputs['Object'], ln.inputs[0])
    far = math_node(nt, 'DIVIDE', ln.outputs['Value'], reach)
    near = math_node(nt, 'SUBTRACT', 1.0, far)
    soft = math_node(nt, 'POWER', near, 1.6)
    a = math_node(nt, 'MULTIPLY', soft, 1.0)
    glow(nt, colour, a, strength)
    bpy.ops.mesh.primitive_plane_add(size=4)
    o = bpy.context.object
    o.data.materials.append(m)
    return o, a


# 5. Lightning: a jagged bolt that re-forks every other frame, a flash on the ground and a ring thrown out.
def lightning():
    sc = reset()
    SEG = 14
    m, nt = mat('bolt')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(tc.outputs['UV'], sep.inputs[0])
    mid = math_node(nt, 'SUBTRACT', sep.outputs['Y'], 0.5, clamp=False)
    off = math_node(nt, 'ABSOLUTE', mid)
    core = math_node(nt, 'SUBTRACT', 1.0, math_node(nt, 'MULTIPLY', off, 2.0))
    hot = math_node(nt, 'POWER', core, 2.5)
    a = math_node(nt, 'MULTIPLY', hot, 1.0)
    col = ramp(nt, hot, [(0.0, (0.15, 0.3, 1.0, 1)), (0.5, (0.5, 0.75, 1.0, 1)), (0.9, (1.0, 1.0, 1.0, 1))])
    glow(nt, col.outputs['Color'], a, 2.0)
    bolts = []
    for k in range(3):                                                   # the trunk and two forks
        pts = [((0, 0, i), (1, 0, 0)) for i in range(SEG + 1)]
        for sd in ((1, 0, 0), (0, 1, 0)):                                # two strips crossed, so it shows from any side
            o = ribbon(sc, f'bolt{k}', [(p, sd) for p, _ in pts], lambda u: 1.0)
            o.data.materials.append(m)
            bolts.append((o, k, sd))
    flash, fa = disc_glow((0.6, 0.8, 1.0, 1), 1.6, 1.5)
    flash.location = (0, 0, 0.02)
    rm, rnt = mat('ring')
    rv = rnt.nodes.new('ShaderNodeValue')
    glow(rnt, (0.55, 0.8, 1.0, 1), rv.outputs[0], 2.0)
    bpy.ops.mesh.primitive_torus_add(major_radius=1.0, minor_radius=0.04, major_segments=64, minor_segments=8)
    ring = bpy.context.object
    ring.data.materials.append(rm)
    sm, sv = spark_mat((0.8, 0.9, 1.0, 1))
    rnd = random.Random(9)
    sparks = []
    for i in range(18):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.045)
        o = bpy.context.object
        o.data.materials.append(sm)
        ang = rnd.uniform(0, math.tau)
        sparks.append((o, math.cos(ang) * rnd.uniform(1.5, 3.2), math.sin(ang) * rnd.uniform(1.5, 3.2), rnd.uniform(1.5, 4.0)))

    def path(seed, k):
        r = random.Random(seed * 31 + k)
        top = 3.6
        if k == 0:
            start, end, i0 = (r.uniform(-0.5, 0.5), r.uniform(-0.5, 0.5), top), (0, 0, 0), 0
        else:
            tr = path(seed, 0)
            j = 4 + k * 3
            start = tr[j]
            end = (start[0] + r.uniform(-1.3, 1.3), start[1] + r.uniform(-1.3, 1.3), start[2] - r.uniform(0.9, 1.6))
        out = []
        for i in range(SEG + 1):
            u = i / SEG
            j = 0.0 if i in (0, SEG) else (0.28 if k == 0 else 0.16)
            out.append((start[0] + (end[0] - start[0]) * u + r.uniform(-j, j), start[1] + (end[1] - start[1]) * u + r.uniform(-j, j), start[2] + (end[2] - start[2]) * u))
        return out

    def step(t):
        f = round(t * (FRAMES - 1))
        live = t < 0.62
        flick = 1.0 if f % 3 != 2 else 0.45                              # a stutter, like real lightning
        a.inputs[1].default_value = (2.0 * flick) if live else 0.0
        for o, k, sd in bolts:
            p = path(f // 2, k)
            wmax = (0.13 if k == 0 else 0.06) * (1.0 if live else 0.0)
            for i, q in enumerate(p):
                w = wmax * (1.0 if k == 0 else 1 - i / SEG)
                o.data.vertices[i * 2].co = (q[0] - sd[0] * w, q[1] - sd[1] * w, q[2])
                o.data.vertices[i * 2 + 1].co = (q[0] + sd[0] * w, q[1] + sd[1] * w, q[2])
            o.data.update()
        fa.inputs[1].default_value = (1.4 * flick if live else 1.0) * (1 - max(0.0, (t - 0.5) / 0.5))
        r = 0.2 + 1.6 * (1 - (1 - t) ** 3)
        ring.scale = (r, r, 1)
        ring.location = (0, 0, 0.04)
        rv.outputs[0].default_value = max(0.0, 1 - t * 1.2)
        for o, vx, vy, vz in sparks:
            o.location = (vx * t, vy * t, 0.1 + vz * t - 5 * t * t)
            k = max(0.0, 1 - t * 1.4)
            o.scale = (k, k, k)

    render(sc, 'lightning', step)


# 6. Shadow vortex: ribbons of dark flame winding up a funnel, a pool beneath, motes drawn in.
def vortex():
    sc = reset()
    m, nt = mat('coil')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(tc.outputs['UV'], sep.inputs[0])
    noise = nt.nodes.new('ShaderNodeTexNoise')
    noise.noise_dimensions = '4D'
    noise.inputs['Scale'].default_value = 3.5
    nt.links.new(tc.outputs['Object'], noise.inputs['Vector'])
    mid = math_node(nt, 'ABSOLUTE', math_node(nt, 'SUBTRACT', sep.outputs['Y'], 0.5, clamp=False))
    across = math_node(nt, 'SUBTRACT', 1.0, math_node(nt, 'MULTIPLY', mid, 2.0))
    ends = math_node(nt, 'SINE', math_node(nt, 'MULTIPLY', sep.outputs['X'], math.pi, clamp=False))
    body = math_node(nt, 'MULTIPLY', across, ends)
    wisp = math_node(nt, 'MULTIPLY', body, math_node(nt, 'ADD', noise.outputs['Fac'], 0.35))
    a = math_node(nt, 'MULTIPLY', wisp, 1.0)
    col = ramp(nt, wisp, [(0.0, (0.05, 0.0, 0.12, 1)), (0.35, (0.35, 0.05, 0.7, 1)), (0.6, (0.75, 0.25, 1.0, 1)), (0.9, (1.0, 0.8, 1.0, 1))])
    glow(nt, col.outputs['Color'], a, 1.4)
    coils = []
    for k in range(4):
        pts = []
        for i in range(60):
            u = i / 59
            ang = k * math.tau / 4 + u * math.tau * 1.4
            rad = 1.35 - 1.0 * u ** 0.8
            p = (math.cos(ang) * rad, math.sin(ang) * rad, 0.1 + 2.8 * u)
            pts.append((p, (0, 0, 1)))
        o = ribbon(sc, f'coil{k}', pts, lambda u: 0.34 * (1 - u * 0.6))
        o.data.materials.append(m)
        coils.append(o)
    pool, pa = disc_glow((0.3, 0.05, 0.6, 1), 0.9, 1.6)
    pool.location = (0, 0, 0.02)
    sm, sv = spark_mat((0.85, 0.5, 1.0, 1))
    rnd = random.Random(21)
    motes = []
    for i in range(24):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.045)
        o = bpy.context.object
        o.data.materials.append(sm)
        motes.append((o, rnd.uniform(0, math.tau), rnd.uniform(1.4, 2.0), rnd.uniform(0, 0.6), rnd.uniform(0.2, 1.6)))

    def step(t):
        noise.inputs['W'].default_value = t * 1.5
        up = min(1.0, t * 3.5)
        out = max(0.0, (t - 0.75) / 0.25)
        a.inputs[1].default_value = 2.6 * up * (1 - out)
        pa.inputs[1].default_value = 1.3 * up * (1 - out)
        for k, o in enumerate(coils):
            o.rotation_euler = (0, 0, -t * math.tau * 1.25)               # the whole funnel turns
            s = 0.5 + 0.5 * up - 0.3 * out
            o.scale = (s, s, 0.4 + 0.6 * up)
        for o, ang, rad, lag, h in motes:
            g = max(0.0, min(1.0, (t - lag * 0.7) / 0.4))
            aa = ang - g * 3
            r = rad * (1 - g)
            o.location = (math.cos(aa) * r, math.sin(aa) * r, 0.15 + h * g)
            k = 0 if g <= 0 or g >= 1 else math.sin(g * math.pi)
            o.scale = (k, k, k)

    render(sc, 'shadow-vortex', step)


ALL = {'fire': fire, 'blessing': blessing, 'ice': ice, 'slash': slash, 'lightning': lightning, 'vortex': vortex}
for key in (os.environ.get('FX') or ','.join(ALL)).split(','):
    ALL[key]()
