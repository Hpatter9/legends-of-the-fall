"""The library of effect shapes. Each scene builds its parts in a `Ctx` (its palette says the element) and
returns `step(t)`, which poses them at time t (0 at the start, 1 at the end; a loop's 1 is its 0 again).

Sizes are in tiles' sides: `r` is the scene's reach on the ground (1.5 covers a 3x3), `h` its height.
"""
import math

from lib import RIGHT, TAU, UP, bell, clamp, ease, env, hide, put, scr, win


def _fly(c, n, r0, r1, up, key='spark', size=0.045, gravity=4.5):
    """Sparks thrown out from the middle and falling back: the common spray. Returns its own step."""
    bits = [(o, c.rnd.uniform(0, TAU), c.rnd.uniform(r0, r1), c.rnd.uniform(up * 0.5, up), c.rnd.uniform(0, 0.25)) for o in c.sparks(n, key, size)]

    def step(t, z0=0.3):
        for o, a, r, vz, lag in bits:
            g = win(t, lag * 0.4, 1)
            put(o, (math.cos(a) * r * g, math.sin(a) * r * g, max(0.03, z0 + vz * g - gravity * g * g)), 0 if g <= 0 else max(0.0, 1 - g * 1.1))
    return step


def _rise(c, n, r, h, key='spark', size=0.05, turn=4.0):
    """Motes climbing a spiral from the ground."""
    bits = [(o, c.rnd.uniform(0, TAU), c.rnd.uniform(0.35, 1.0) * r, c.rnd.uniform(0, 0.55), c.rnd.uniform(0.6, 1.0) * h) for o in c.sparks(n, key, size)]

    def step(t):
        for o, a, rad, lag, top in bits:
            g = (t + lag) % 1.0 if c.loop else win(t, lag * 0.7, lag * 0.7 + 0.5)
            ang = a + g * turn
            put(o, (math.cos(ang) * rad, math.sin(ang) * rad, 0.1 + g * top), bell(g) if 0 < g < 1 else 0)
    return step


# 1. Burst: a ball of flame that swells, rises and tears apart, throwing embers.
def burst(c, r=1.3, h=1.3, balls=5, embers=22):
    m, cut = c.flame()
    parts = [(c.sphere(1, m, 4), c.rnd.uniform(-0.35, 0.35), c.rnd.uniform(-0.35, 0.35), c.rnd.uniform(0.7, 1.15), c.rnd.uniform(0, 0.12)) for _ in range(balls)]
    fly = _fly(c, embers, r * 0.9, r * 2.0, 5.0)

    def step(t):
        c.tick(t, 1.6)
        cut.inputs[1].default_value = 0.12 + 0.5 * t * t
        for o, x, y, s, lag in parts:
            g = win(t, lag, 1)
            gg = ease(g)
            rad = (0.2 + 0.8 * gg * s) * r
            put(o, (x * (0.4 + gg) * r, y * (0.4 + gg) * r, 0.4 + h * g * s), (rad, rad, rad * 1.15), (g * 1.2, g * 0.7, x * 3))
        fly(t)
    return step


# 2. Pillar: a column of light climbing in streaks, a ring spreading on the ground, sparks up a spiral.
def pillar(c, r=0.75, h=3.2, sparks=26):
    m, nt = c.mat('pillar')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(tc.outputs['Generated'], sep.inputs[0])
    n, mp = c.noise(nt, 3.0, 4, 0.6, stretch=(1, 1, 0.18))
    fall = c.math(nt, 'POWER', c.math(nt, 'SUBTRACT', 1.0, sep.outputs['Z']), 1.6)
    fade = c.math(nt, 'MULTIPLY', c.math(nt, 'MULTIPLY', n.outputs['Fac'], fall), 1.0)
    c.emit(nt, c.pal_ramp(nt, fall, (0.0, 0.3, 0.6, 1.0)), fade, 1.3)
    col = c.tube(r, h, m)
    col.location = (0, 0, h / 2)
    ring, rv = c.ring('bright')
    ring2, _ = c.ring('hot', 0.028)
    ring2.data.materials[0] = ring.data.materials[0]
    rise = _rise(c, sparks, r * 1.2, h * 0.9, 'hot')

    def step(t):
        c.tick(t, 1.0, (0, 0, -2.5))
        out = win(t, 0.7, 1)
        fade.inputs[1].default_value = 2.2 * win(t, 0, 0.33) * (1 - out)
        w = 1 - 0.35 * out
        col.scale = (w, w, 1)
        put(ring, scale=(r * (0.4 + 1.7 * ease(t)),) * 2 + (1,))
        put(ring2, scale=(r * (0.3 + 1.2 * ease(win(t, 0.15, 1))),) * 2 + (1,))
        rv.outputs[0].default_value = 1 - out
        rise(t)
    return step


# 3. Spikes: solid shards that burst from the ground, catch the light, then sink away, on a patch of frost.
def spikes(c, r=1.05, h=2.2, n=7, verts=5, frost=True):
    m, av = c.solid()
    spots = [(0, 0, 1.0, 0.0)] + [(math.cos(i * TAU / n) * c.rnd.uniform(0.5, 1.0) * r, math.sin(i * TAU / n) * c.rnd.uniform(0.5, 1.0) * r, c.rnd.uniform(0.45, 0.8), c.rnd.uniform(0.05, 0.3)) for i in range(n)]
    shards = []
    for x, y, k, lag in spots:
        o = c.cone(0.26 * (0.6 + k * 0.6), h * k, m, verts)
        o.rotation_euler = (y * 0.35, x * 0.35, c.rnd.uniform(0, 1))
        shards.append((o, x, y, h * k, lag))
    ground, fa = c.disc('bright', 1.0, r * 1.7, noise=9) if frost else (None, None)

    def step(t):
        for o, x, y, hh, lag in shards:
            g = win(t, lag, lag + 0.28)
            k = max(0.001, (ease(g) + 0.12 * bell(g)) * (1 - win(t, 0.78, 1)))
            o.scale = (1, 1, k)
            o.location = (x, y, hh * k / 2 - 0.02)
        av.outputs[0].default_value = 1 - 0.6 * win(t, 0.8, 1)
        if ground:
            fa.inputs[1].default_value = 2.4 * win(t, 0, 0.25) * (1 - win(t, 0.8, 1))
            s = 0.4 + 0.6 * win(t, 0, 0.33)
            ground.scale = (s, s, 1)
    return step


# 4. Arc: a ribbon of light swept round, standing in real space so it tilts with the view.
def arc(c, r=1.25, sweep=250, start=-110, tilt=(28, -12), z=0.9, sparks=14, wide=0.42):
    m, a, head = c.streak('mid', 'hot', 1.2, 1.5, tail=0.55)
    pts = []
    for i in range(65):
        u = i / 64
        ang = math.radians(start + sweep * u)
        pts.append(((math.cos(ang) * r, math.sin(ang) * r, 0), (math.cos(ang), math.sin(ang), 0)))
    blade = c.ribbon(pts, lambda u: wide * math.sin(u * math.pi) ** 0.7 + 0.01, m)
    put(blade, (0, 0, z), rot=(math.radians(tilt[0]), math.radians(tilt[1]), 0))
    bits = [(o, c.rnd.uniform(0.25, 0.95), c.rnd.uniform(0.6, 1.6), c.rnd.uniform(-0.6, 0.9)) for o in c.sparks(sparks, 'hot', 0.04)]

    def step(t):
        head.outputs[0].default_value = (1 - (1 - win(t, 0, 0.6)) ** 2) * 1.05
        a.inputs[1].default_value = 1.6 * (1 - win(t, 0.55, 1))
        import bpy
        from mathutils import Vector
        bpy.context.view_layer.update()
        for o, u, speed, vz in bits:
            g = max(0.0, t - u * 0.6)
            ang = math.radians(start + sweep * u)
            p = blade.matrix_world @ Vector((math.cos(ang) * (r + 0.25 + g * speed * 2), math.sin(ang) * (r + 0.25 + g * speed * 2), 0))
            put(o, (p.x, p.y, max(0.03, p.z + vz * g - 2 * g * g)), 0 if g <= 0 else max(0.0, 1 - g * 2.2))
    return step


# 5. Bolt: a jagged bolt from the sky that re-forks as it holds, a flash on the ground, a ring thrown out.
def bolt(c, h=3.6, r=1.6, forks=2, sparks=18, seg=14):
    m, nt = c.mat('bolt')
    _, v = c.uv(nt)
    hot = c.across(nt, v, 2.5)
    a = c.math(nt, 'MULTIPLY', hot, 1.0)
    c.emit(nt, c.ramp(nt, hot, [(0.0, c.col('deep')), (0.5, c.col('bright')), (0.9, c.col('hot'))]), a, 2.0)
    lines = [(k, c.cross_ribbon([(0, 0, i) for i in range(seg + 1)], 1.0, m)) for k in range(forks + 1)]
    flash, fa = c.disc('bright', 1.6, r * 0.95)
    ring, rv = c.ring('bright', 0.04, 2.0)
    fly = _fly(c, sparks, r, r * 2, 4.0, 'hot')
    seed = c.rnd.randrange(1000)

    def path(when, k):
        import random
        rr = random.Random(seed + when * 31 + k)
        if k == 0:
            start, end = (rr.uniform(-0.5, 0.5), rr.uniform(-0.5, 0.5), h), (0, 0, 0)
        else:
            start = path(when, 0)[min(seg - 2, 3 + k * 3)]
            end = (start[0] + rr.uniform(-1.3, 1.3), start[1] + rr.uniform(-1.3, 1.3), max(0.0, start[2] - rr.uniform(0.9, 1.6)))
        out = []
        for i in range(seg + 1):
            u = i / seg
            j = 0.0 if i in (0, seg) else (0.28 if k == 0 else 0.16)
            out.append((start[0] + (end[0] - start[0]) * u + rr.uniform(-j, j), start[1] + (end[1] - start[1]) * u + rr.uniform(-j, j), start[2] + (end[2] - start[2]) * u))
        return out

    def step(t):
        f = round(t * (c.frames - 1))
        live = t < 0.62
        flick = 1.0 if f % 3 != 2 else 0.45
        a.inputs[1].default_value = (2.0 * flick) if live else 0.0
        for k, pair in lines:
            p = path(f // 2, k)
            wmax = (0.13 if k == 0 else 0.06) * (1.0 if live else 0.0)
            for o, sd in zip(pair, ((1, 0, 0), (0, 1, 0))):
                c.move_ribbon(o, p, (lambda u: wmax) if k == 0 else (lambda u: wmax * (1 - u)), sd)
        fa.inputs[1].default_value = (1.4 * flick if live else 1.0) * (1 - win(t, 0.5, 1))
        put(ring, scale=(r * (0.12 + ease(t)),) * 2 + (1,))
        rv.outputs[0].default_value = max(0.0, 1 - t * 1.2)
        fly(t, 0.1)
    return step


# 6. Vortex: ribbons of flame winding up a funnel, a pool beneath, motes drawn in.
def vortex(c, r=1.35, h=2.8, coils=4, motes=24, turns=1.25):
    m, a, _ = c.streak('mid', 'hot', 1.0, 1.4, noise=3.5)
    wound = []
    for k in range(coils):
        pts = []
        for i in range(60):
            u = i / 59
            ang = k * TAU / coils + u * TAU * 1.4
            rad = r * (1 - 0.74 * u ** 0.8)
            pts.append(((math.cos(ang) * rad, math.sin(ang) * rad, 0.1 + h * u), (0, 0, 1)))
        wound.append(c.ribbon(pts, lambda u: 0.34 * (1 - u * 0.6), m))
    pool, pa = c.disc('mid', 0.9, r * 1.2)
    bits = [(o, c.rnd.uniform(0, TAU), c.rnd.uniform(1.0, 1.5) * r, c.rnd.uniform(0, 0.6), c.rnd.uniform(0.2, 1.6)) for o in c.sparks(motes)]

    def step(t):
        c.tick(t, 1.5)
        up, out = (1, 0) if c.loop else (win(t, 0, 0.28), win(t, 0.75, 1))
        a.inputs[1].default_value = 2.6 * up * (1 - out)
        pa.inputs[1].default_value = 1.3 * up * (1 - out)
        for o in wound:
            put(o, scale=(0.5 + 0.5 * up - 0.3 * out,) * 2 + (0.4 + 0.6 * up,), rot=(0, 0, -t * TAU * (1 if c.loop else turns)))
        for o, ang, rad, lag, hh in bits:
            g = (t + lag) % 1.0 if c.loop else win(t, lag * 0.7, lag * 0.7 + 0.4)
            aa = ang - g * 3
            put(o, (math.cos(aa) * rad * (1 - g), math.sin(aa) * rad * (1 - g), 0.15 + hh * g), bell(g) if 0 < g < 1 else 0)
    return step


# 7. Beam: a lance of light lying along the board's u, one tile long so it can be laid tile after tile.
def beam(c, length=1.0, r=0.2, z=0.55, rings=2):
    m, nt = c.mat('beam')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(tc.outputs['Object'], sep.inputs[0])
    lw = nt.nodes.new('ShaderNodeLayerWeight')
    lw.inputs['Blend'].default_value = 0.45
    core = c.math(nt, 'SUBTRACT', 1.0, lw.outputs['Facing'])
    ph = c.val(nt, 0.0)
    # (the ripples along it repeat every tile, so one tile's piece runs into the next)
    wave = c.math(nt, 'SINE', c.math(nt, 'ADD', c.math(nt, 'MULTIPLY', sep.outputs['Z'], TAU * 2 / 1.0, clamp_=False), ph, clamp_=False), clamp_=False)
    body = c.math(nt, 'ADD', core, c.math(nt, 'MULTIPLY', wave, 0.12, clamp_=False))
    a = c.math(nt, 'MULTIPLY', body, 1.0)
    c.emit(nt, c.pal_ramp(nt, body, (0.15, 0.4, 0.62, 0.85)), a, 1.7)
    rod = c.tube(1.0, length, m, 24)
    put(rod, (0, 0, z), rot=(0, math.radians(90), 0))
    fm, fv = c.flat('bright', 1.6)
    floor = c.plane(1.0, fm)
    put(floor, (0, 0, 0.02), (length, 0.34, 1))
    hm, hv = c.flat('hot', 2.0)
    hoops = [c.torus(1.0, 0.035, hm) for _ in range(rings)]

    def step(t):
        up, out = win(t, 0, 0.18), win(t, 0.6, 1)
        w = r * (0.25 + 1.0 * ease(up)) * (1 - 0.75 * out)
        rod.scale = (w, w, 1)
        ph.outputs[0].default_value = -t * TAU * 3
        a.inputs[1].default_value = 2.4 * (1 - 0.5 * out)
        fv.outputs[0].default_value = 0.8 * up * (1 - out)
        for i, o in enumerate(hoops):
            g = win(t, 0.05 + i * 0.12, 0.6 + i * 0.12)
            put(o, ((i - (rings - 1) / 2) * length / max(1, rings), 0, z), (r * (1.2 + 1.3 * ease(g)),) * 3, (0, math.radians(90), 0))
            hide(o, g <= 0 or g >= 1)
        hv.outputs[0].default_value = 1 - win(t, 0.3, 0.7)
    return step


# 8. Nova: a wall of shards racing outwards in a ring, frost spreading under it.
def nova(c, r=1.5, n=18, h=0.9):
    m, av = c.solid()
    teeth = []
    for i in range(n):
        ang = i * TAU / n + c.rnd.uniform(-0.1, 0.1)
        k = c.rnd.uniform(0.6, 1.0)
        o = c.cone(0.17 * k, h * k, m, 4)
        teeth.append((o, ang, k, c.rnd.uniform(0, 0.08)))
    ground, ga = c.disc('bright', 1.1, r * 1.15, noise=8)
    ring, rv = c.ring('hot', 0.05)
    fly = _fly(c, 14, r, r * 1.8, 3.0, 'hot', 0.04)

    def step(t):
        out = ease(win(t, 0, 0.55))
        for o, ang, k, lag in teeth:
            g = win(t, lag, lag + 0.3)
            up = max(0.001, (ease(g) + 0.15 * bell(g)) * (1 - win(t, 0.72, 1)))
            rad = r * (0.25 + 0.75 * out)
            put(o, (math.cos(ang) * rad, math.sin(ang) * rad, h * k * up / 2 - 0.02), (1, 1, up), (-math.sin(ang) * 0.5, math.cos(ang) * 0.5, ang))
        av.outputs[0].default_value = 1 - 0.7 * win(t, 0.8, 1)
        ga.inputs[1].default_value = 2.2 * win(t, 0, 0.2) * (1 - win(t, 0.7, 1))
        put(ground, scale=(0.3 + 0.7 * out,) * 2 + (1,))
        put(ring, scale=(r * (0.2 + 1.05 * ease(t)),) * 2 + (1,))
        rv.outputs[0].default_value = 1 - win(t, 0.5, 0.95)
        fly(t, 0.1)
    return step


# 9. Rain: streaks falling from above onto the ground, each ending in a little splash ring.
def rain(c, r=1.4, h=3.2, n=14, slant=0.35, w=0.085):
    m, a, _ = c.streak('bright', 'hot', 1.6, 1.8)
    sm, sv = c.flat('bright', 1.6)
    drops = []
    for i in range(n):
        ang, rad = c.rnd.uniform(0, TAU), math.sqrt(c.rnd.uniform(0, 1)) * r
        o = c.cross_ribbon([(0, 0, 0), (0, 0, 0.5), (0, 0, 1)], lambda u: w * (1 - u * 0.8), m)
        hoop = c.torus(1.0, 0.09, sm)
        drops.append((o, hoop, math.cos(ang) * rad, math.sin(ang) * rad, c.rnd.uniform(0, 0.62)))

    def step(t):
        for pair, hoop, x, y, lag in drops:
            g = win(t, lag, lag + 0.22)
            z = h * (1 - g)
            for o in pair:
                put(o, (x + slant * z, y - slant * z * 0.4, z), (1, 1, 0.9), (0, math.atan(slant), 0))
                hide(o, g <= 0 or g >= 1)
            s = win(t, lag + 0.2, lag + 0.42)
            put(hoop, (x, y, 0.03), (0.08 + 0.3 * ease(s),) * 2 + (1 - 0.7 * s,))
            hide(hoop, s <= 0 or s >= 1)
        a.inputs[1].default_value = 2.2
        sv.outputs[0].default_value = 1.0
    return step


# 10. Crack: jagged fissures splitting the ground from the middle, glowing from below, rubble jumping.
def crack(c, r=2.2, arms=6, rubble=14):
    m, a, head = c.streak('bright', 'hot', 1.3, 1.8, tail=1.4)
    for k in range(arms):
        ang = k * TAU / arms + c.rnd.uniform(-0.25, 0.25)
        pts, x, y = [], 0.0, 0.0
        for i in range(13):
            pts.append(((x, y, 0.03), (-math.sin(ang), math.cos(ang), 0)))
            ang += c.rnd.uniform(-0.5, 0.5)
            x += math.cos(ang) * r / 12
            y += math.sin(ang) * r / 12
        c.ribbon(pts, lambda u: 0.11 * (1 - u) + 0.015, m)
    rm, rv = c.solid('mid', 'deep', 0.1, 0.8, 0.0)
    rocks = [(c.cone(c.rnd.uniform(0.07, 0.16), c.rnd.uniform(0.12, 0.3), rm, 4), c.rnd.uniform(0, TAU), c.rnd.uniform(0.2, 1.0) * r, c.rnd.uniform(1.5, 3.5), c.rnd.uniform(0, 0.3)) for _ in range(rubble)]
    dust, da = c.disc('mid', 0.7, r * 0.9, noise=5)

    def step(t):
        c.tick(t, 1.0)
        head.outputs[0].default_value = 1.1 * ease(win(t, 0, 0.45))
        a.inputs[1].default_value = 2.4 * (1 - win(t, 0.6, 1))
        for o, ang, rad, vz, lag in rocks:
            g = win(t, lag, lag + 0.55)
            put(o, (math.cos(ang) * rad, math.sin(ang) * rad, max(0.02, vz * g - 3.6 * g * g * vz / 3.5 * 1.0)), 0 if g <= 0 or g >= 1 else 1, (g * 5, g * 3, ang))
        da.inputs[1].default_value = 1.2 * bell(win(t, 0.1, 0.9))
    return step


# 11. Dome: a ward's half-sphere, bright at its rim and banded, that swells up and shimmers.
def dome(c, r=1.5, bands=5):
    m, nt = c.mat('dome')
    lw = nt.nodes.new('ShaderNodeLayerWeight')
    lw.inputs['Blend'].default_value = 0.55
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(tc.outputs['Object'], sep.inputs[0])
    ph = c.val(nt, 0.0)
    band = c.math(nt, 'POWER', c.math(nt, 'ABSOLUTE', c.math(nt, 'SINE', c.math(nt, 'ADD', c.math(nt, 'MULTIPLY', sep.outputs['Z'], bands * math.pi, clamp_=False), ph, clamp_=False), clamp_=False)), 6.0)
    body = c.math(nt, 'ADD', c.math(nt, 'POWER', lw.outputs['Facing'], 1.3), c.math(nt, 'MULTIPLY', band, 0.55))
    a = c.math(nt, 'MULTIPLY', body, 1.0)
    c.emit(nt, c.pal_ramp(nt, body, (0.1, 0.4, 0.7, 1.0)), a, 1.4)
    import bpy
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, radius=1)
    ball = bpy.context.object
    ball.data.materials.append(m)
    # (only the upper half shows: the lower is under the ground)
    for p in ball.data.polygons:
        p.hide = False
    import bmesh
    bm = bmesh.new()
    bm.from_mesh(ball.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -0.01], context='VERTS')
    bm.to_mesh(ball.data)
    bm.free()
    ring, rv = c.ring('hot', 0.04)
    rise = _rise(c, 12, r * 0.9, r, 'hot', 0.04, 1.0)

    def step(t):
        up, out = (1, 0) if c.loop else (win(t, 0, 0.3), win(t, 0.75, 1))
        s = r * (0.3 + 0.7 * ease(up) + (0 if c.loop else 0.06 * bell(up)))
        put(ball, scale=(s, s, s * (0.85 + 0.15 * ease(up))))
        ph.outputs[0].default_value = -t * TAU * (1 if c.loop else 2)
        a.inputs[1].default_value = 1.9 * up * (1 - out)
        put(ring, scale=(s,) * 2 + (1,))
        rv.outputs[0].default_value = up * (1 - out)
        rise(t)
    return step


# 12. Projectile: a ball of the element flying to the right with a tail (a loop: the renderer moves it).
def projectile(c, r=0.28, tail=1.3):
    m, cut = c.flame(3.0, 0.4, 1.5)
    ball = c.sphere(r, m, 3)
    tm, ta, _ = c.streak('mid', 'bright', 1.2, 1.5, noise=4)
    # (it flies along the screen's right: the board's (1, 1))
    d = (math.sqrt(0.5), math.sqrt(0.5), 0)
    side = (0, 0, 1)
    strip = c.ribbon([((-d[0] * tail * i / 12, -d[1] * tail * i / 12, 0), side) for i in range(13)], lambda u: r * 0.9 * (1 - u) + 0.01, tm)
    bits = [(o, c.rnd.uniform(0, 1), c.rnd.uniform(-1, 1) * r, c.rnd.uniform(-1, 1) * r) for o in c.sparks(8, 'hot', 0.035)]

    def step(t):
        c.tick(t, 2.0)
        cut.inputs[1].default_value = 0.1
        put(ball, (0, 0, 0), rot=(t * TAU, 0, 0))
        ta.inputs[1].default_value = 2.2
        for o, lag, oy, oz in bits:
            g = (t + lag) % 1.0
            put(o, (-d[0] * tail * g + oy * 0.3, -d[1] * tail * g - oy * 0.3, oz), 1 - g)
    return step


# 13. Trail: a streak left on the ground along the board's u, that fades from its tail.
def trail(c, length=2.0, w=0.26):
    m, a, head = c.streak('mid', 'hot', 1.4, 1.6, noise=5, tail=0.8)
    c.ribbon([((-length / 2 + length * i / 24, 0, 0.04), (0, 1, 0)) for i in range(25)], lambda u: w * (0.4 + 0.6 * math.sin(u * math.pi)), m)
    fly = _fly(c, 8, 0.3, 0.8, 1.5, 'hot', 0.035)

    def step(t):
        c.tick(t, 1.2)
        head.outputs[0].default_value = 1.6 * ease(win(t, 0, 0.5))
        a.inputs[1].default_value = 2.2 * (1 - win(t, 0.5, 1))
        fly(t, 0.05)
    return step


# 14. Ring: hoops of light thrown out along the ground, one after another.
def ring(c, r=1.5, n=3, thick=0.05, lift=0.0):
    hoops = [c.ring('bright' if i % 2 else 'hot', thick * (1 - i * 0.2)) for i in range(n)]
    glow, ga = c.disc('mid', 0.8, r * 0.8)

    def step(t):
        for i, (o, v) in enumerate(hoops):
            g = win(t, i * 0.14, 0.6 + i * 0.14)
            put(o, (0, 0, 0.03 + lift * g), (r * (0.1 + 0.95 * ease(g)),) * 2 + (1 + 2 * (1 - g),))
            v.outputs[0].default_value = 1 - win(g, 0.6, 1)
            hide(o, g <= 0 or g >= 1)
        ga.inputs[1].default_value = 1.4 * bell(win(t, 0, 0.6))
    return step


# 15. Swarm: many small things wheeling round the middle and climbing (leaves, wisps, bats, blood).
def swarm(c, r=1.2, h=1.8, n=22, kind='leaf', inward=False):
    m, v = c.flat('bright', 1.5)
    m2, _ = c.flat('hot', 1.7)
    things = []
    for i in range(n):
        mm = m if i % 3 else m2
        o = c.cone(0.11, 0.32, mm, 3) if kind == 'leaf' else c.sphere(0.09, mm, 1)
        things.append((o, c.rnd.uniform(0, TAU), c.rnd.uniform(0.4, 1.0) * r, c.rnd.uniform(0, 1), c.rnd.uniform(0.3, 1.0) * h, c.rnd.uniform(0.7, 1.3)))

    def step(t):
        for o, a, rad, lag, top, speed in things:
            g = (t * speed + lag) % 1.0 if c.loop else win(t, lag * 0.45, lag * 0.45 + 0.55)
            ang = a + g * 5 * speed
            rr = rad * ((1 - g) if inward else (0.5 + 0.5 * g))
            put(o, (math.cos(ang) * rr, math.sin(ang) * rr, 0.15 + top * g), bell(g) * 1.2 if 0 < g < 1 else 0, (g * 9, g * 6, ang))
    return step


# 16. Chains: links climbing out of the ground in arcs that close over the middle.
def chains(c, r=1.1, n=4, links=9, h=1.5):
    m, av = c.solid('bright', 'mid', 0.8, 0.3, 0.9)
    strands = []
    for k in range(n):
        ang = k * TAU / n + 0.4
        strands.append((ang, [c.torus(0.13, 0.045, m) for _ in range(links)]))
    ring, rv = c.ring('mid', 0.04)

    def step(t):
        grow = ease(win(t, 0, 0.45))
        pull = win(t, 0.45, 0.65)
        for ang, ls in strands:
            for i, o in enumerate(ls):
                u = i / (links - 1)
                shown = u <= grow
                rad = r * (1 - u * (0.75 + 0.2 * pull))
                z = h * math.sin(u * math.pi * 0.62) * (1 - 0.25 * pull)
                put(o, (math.cos(ang) * rad, math.sin(ang) * rad, 0.05 + z), 1 if shown else 0, (math.radians(90) if i % 2 else 0, 0, ang + (math.radians(90) if i % 2 else 0)))
        av.outputs[0].default_value = 1 - win(t, 0.8, 1)
        put(ring, scale=(r,) * 2 + (1,))
        rv.outputs[0].default_value = win(t, 0, 0.15) * (1 - win(t, 0.75, 1))
    return step


# 17. Meteor: a burning rock with a long tail, falling from the upper right (a loop: the renderer flies it).
def meteor(c, r=0.42, tail=2.4):
    rm, rv = c.solid('deep', 'mid', 1.4, 0.9, 0.0)
    rock = c.sphere(r * 0.8, rm, 2)
    for vtx in rock.data.vertices:
        vtx.co *= c.rnd.uniform(0.8, 1.15)
    m, cut = c.flame(2.6, 0.5, 1.5, stretch=(1, 1, 1))
    hood = c.sphere(r * 1.25, m, 3)
    # (it falls from the upper right of the screen: its tail runs up and to the right behind it)
    d = (0.55, 0.55, 1.0)
    tm, ta, _ = c.streak('mid', 'hot', 1.1, 1.6, noise=3.5)
    tails = c.cross_ribbon([(0, 0, 0)] * 13, 0.1, tm)
    line = [(d[0] * tail * i / 12, d[1] * tail * i / 12, d[2] * tail * i / 12) for i in range(13)]
    for o, sd in zip(tails, ((0.7, -0.7, 0), (0.4, 0.4, -0.5))):
        c.move_ribbon(o, line, lambda u: r * 1.1 * (1 - u) ** 0.7 + 0.01, sd)
    bits = [(o, c.rnd.uniform(0, 1), c.rnd.uniform(-1, 1), c.rnd.uniform(-1, 1)) for o in c.sparks(10, 'hot', 0.04)]

    def step(t):
        c.tick(t, 2.2)
        cut.inputs[1].default_value = 0.06
        ta.inputs[1].default_value = 2.4
        put(rock, rot=(t * TAU, t * TAU, 0))
        put(hood, rot=(0, t * TAU, 0))
        for o, lag, ox, oz in bits:
            g = (t + lag) % 1.0
            put(o, (d[0] * tail * g + ox * 0.25, d[1] * tail * g - ox * 0.25, d[2] * tail * g + oz * 0.2), (1 - g) * 1.2)
    return step


# 18. Cloud: a low bank of fumes that rolls and boils (a loop), bubbles popping in it.
def cloud(c, r=1.5, h=0.7, puffs=9, bubbles=10):
    m, cut = c.flame(1.8, 0.5, 1.0)
    parts = [(c.sphere(1, m, 3), c.rnd.uniform(0, TAU), math.sqrt(c.rnd.uniform(0.05, 1)) * r * 0.75, c.rnd.uniform(0.45, 0.75), c.rnd.uniform(0, 1)) for _ in range(puffs)]
    rise = _rise(c, bubbles, r * 0.9, h * 2.2, 'hot', 0.05, 0.6)

    def step(t):
        c.tick(t, 1.2)
        k = 1 if c.loop else env(t, 0.2, 0.7)
        cut.inputs[1].default_value = 0.1 + 0.5 * (1 - k)
        for o, a, rad, s, ph in parts:
            w = math.sin((t + ph) * TAU)
            aa = a + 0.12 * w
            put(o, (math.cos(aa) * rad, math.sin(aa) * rad, h * 0.5 * s), (s * r * 0.62 * (1 + 0.06 * w), s * r * 0.62 * (1 + 0.06 * w), h * s * (1 - 0.08 * w)))
        rise(t)
    return step


# 19. Geyser: a jet thrown straight up that fans out and falls back as drops, a ring spreading at its foot.
def geyser(c, r=0.4, h=2.4, drops=26):
    m, nt = c.mat('jet')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(tc.outputs['Generated'], sep.inputs[0])
    n, mp = c.noise(nt, 4.0, 4, 0.6, stretch=(1, 1, 0.25))
    lw = nt.nodes.new('ShaderNodeLayerWeight')
    lw.inputs['Blend'].default_value = 0.4
    body = c.math(nt, 'MULTIPLY', c.math(nt, 'MULTIPLY', c.math(nt, 'SUBTRACT', n.outputs['Fac'], 0.3), 2.6), c.math(nt, 'SUBTRACT', 1.0, lw.outputs['Facing']))
    a = c.math(nt, 'MULTIPLY', body, 1.0)
    c.emit(nt, c.pal_ramp(nt, body, (0.05, 0.25, 0.5, 0.8)), a, 1.2)
    jet = c.cone(r * 0.6, h, m, 24, r * 1.7)
    ring, rv = c.ring('hot', 0.05)
    bits = [(o, c.rnd.uniform(0, TAU), c.rnd.uniform(0.3, 1.4), c.rnd.uniform(0.75, 1.1) * h, c.rnd.uniform(0.1, 0.5)) for o in c.sparks(drops, 'bright', 0.055, 1.6)]

    def step(t):
        c.tick(t, 1.0, (0, 0, -3.0))
        up, out = ease(win(t, 0, 0.3)), win(t, 0.55, 0.9)
        k = max(0.001, up * (1 - out))
        put(jet, (0, 0, h * k / 2), (1 + 0.4 * out, 1 + 0.4 * out, k))
        a.inputs[1].default_value = 3.0 * (1 - 0.6 * out)
        put(ring, scale=(0.2 + 1.3 * ease(t),) * 2 + (1,))
        rv.outputs[0].default_value = 1 - win(t, 0.5, 0.9)
        for o, ang, rad, top, lag in bits:
            g = win(t, lag, lag + 0.5)
            put(o, (math.cos(ang) * rad * g, math.sin(ang) * rad * g, max(0.03, top * (1 - (2 * g - 0.9) ** 2 / 0.81) if g < 0.95 else 0.03)), 0 if g <= 0 or g >= 1 else 1.2 - 0.5 * g)
    return step


# 20. Sigil: a magic circle drawn on the ground: two hoops, a star of lines between them, turning.
def sigil(c, r=1.4, points=6, skip=2, motes=10):
    m, v = c.flat('bright', 1.7)
    m2, v2 = c.flat('hot', 1.9)
    import bpy
    root = bpy.data.objects.new('sigil', None)
    c.sc.collection.objects.link(root)
    outer = c.torus(1.0, 0.035, m)
    inner = c.torus(0.72, 0.022, m)
    lines = []
    for i in range(points):
        a0, a1 = i * TAU / points, (i + skip) * TAU / points
        p0, p1 = (math.cos(a0) * 0.72, math.sin(a0) * 0.72, 0), (math.cos(a1) * 0.72, math.sin(a1) * 0.72, 0)
        dx, dy = p1[0] - p0[0], p1[1] - p0[1]
        ln = math.hypot(dx, dy)
        lines.append(c.ribbon([(p0, (-dy / ln, dx / ln, 0)), (p1, (-dy / ln, dx / ln, 0))], 0.022, m2))
        dot = c.sphere(0.06, m2, 1)
        dot.location = (math.cos(a0) * 0.86, math.sin(a0) * 0.86, 0)
        lines.append(dot)
    for o in [outer, inner] + lines:
        o.parent = root
    rise = _rise(c, motes, r * 0.8, 1.2, 'hot', 0.04, 1.5)

    def step(t):
        up, out = (1, 0) if c.loop else (win(t, 0, 0.25), win(t, 0.75, 1))
        s = r * (0.5 + 0.5 * ease(up)) * (1 + 0.08 * out)
        put(root, (0, 0, 0.03), (s, s, 1), (0, 0, t * TAU / (points if c.loop else 4)))
        v.outputs[0].default_value = up * (1 - out)
        v2.outputs[0].default_value = win(t, 0.1, 0.35) * (1 - out) if not c.loop else 1
        rise(t)
    return step


# 21. Wall: a tile's stretch of flame standing along the board's u (a loop), sparks lifting off it.
def wall(c, length=1.0, h=1.25, tongues=5):
    m, cut = c.flame(2.6, 0.45, 1.3, stretch=(1, 1, 0.5))
    parts = []
    for i in range(tongues):
        o = c.teardrop(m)
        parts.append((o, (i + 0.5) / tongues * length - length / 2, c.rnd.uniform(0.7, 1.0), c.rnd.uniform(0, 1)))
    rise = _rise(c, 8, 0.4, h * 1.5, 'hot', 0.035, 0.3)

    def step(t):
        c.tick(t, 1.6)
        cut.inputs[1].default_value = 0.1
        for o, x, s, ph in parts:
            w = math.sin((t + ph) * TAU)
            hh = h * s * (1 + 0.14 * w)
            put(o, (x, 0.04 * w, hh / 2), (length / tongues * 1.1, 0.26, hh / 2), (0, 0.1 * w, 0))
        rise(t)
    return step


# 22. Crystal: one great faceted block that closes round whoever stands there, glints, and breaks.
def crystal(c, r=0.5, h=1.7, shards=6, stone=False):
    # (`stone`: grey rock lit plainly, whatever the element: what the Gorgon's gaze leaves is stone, not a crystal of her poison's green)
    if stone:
        _plain_lights(c)
    m, av = c.solid((0.4, 0.4, 0.42), (0.09, 0.09, 0.1), 0.25, 0.85, 0.0) if stone else c.solid('bright', 'mid', 0.7, 0.08, 0.3)
    top = c.cone(r, h * 0.45, m, 6)
    body = c.tube(r, h * 0.55, m, 6, caps=True)
    side = []
    for i in range(shards):
        ang = i * TAU / shards + 0.3
        k = c.rnd.uniform(0.35, 0.6)
        o = c.cone(r * 0.45, h * k, m, 5)
        side.append((o, ang, h * k))
    glint, gv = c.flat('hot', 2.4)
    star = [c.ribbon([((-0.22, 0, 0), (0, 0, 1)), ((0, 0, 0), (0, 0, 1)), ((0.22, 0, 0), (0, 0, 1))], lambda u: 0.035 * math.sin(u * math.pi) + 0.004, glint),
            c.ribbon([((0, 0, -0.3), (1, 0, 0)), ((0, 0, 0), (1, 0, 0)), ((0, 0, 0.3), (1, 0, 0))], lambda u: 0.035 * math.sin(u * math.pi) + 0.004, glint)]
    mist, ma = c.disc('bright', 0.9, r * 2.6, noise=7)

    def step(t):
        up = ease(win(t, 0, 0.22)) + 0.08 * bell(win(t, 0, 0.3))
        gone = win(t, 0.82, 1)
        k = max(0.001, up * (1 - gone))
        put(body, (0, 0, h * 0.275 * k), (1, 1, k))
        put(top, (0, 0, h * (0.55 + 0.225) * k), (1, 1, k))
        for o, ang, hh in side:
            g = max(0.001, ease(win(t, 0.08, 0.34)) * (1 - gone))
            put(o, (math.cos(ang) * r * 0.9, math.sin(ang) * r * 0.9, hh * g / 2), (1, 1, g), (-math.sin(ang) * 0.45, math.cos(ang) * 0.45, 0))
        av.outputs[0].default_value = 1 - 0.5 * gone
        gl = bell(win(t, 0.3, 0.6))
        for o in star:
            put(o, (0.18, -0.18, h * 0.8), gl * 1.6, (0, 0, math.radians(-45)))
            hide(o, gl <= 0.02)
        ma.inputs[1].default_value = 2.0 * win(t, 0, 0.2) * (1 - gone)
    return step


# 23. Shatter: a block that bursts into shards flung outwards, tumbling, with a flash at the heart.
def shatter(c, r=1.5, n=22, h=1.2):
    m, av = c.solid('bright', 'mid', 0.7, 0.08, 0.3)
    bits = []
    for i in range(n):
        o = c.cone(c.rnd.uniform(0.07, 0.16), c.rnd.uniform(0.25, 0.6), m, 4)
        bits.append((o, c.rnd.uniform(0, TAU), c.rnd.uniform(0.5, 1.0) * r, c.rnd.uniform(1.5, 4.0), c.rnd.uniform(3, 9)))
    flash, fa = c.disc('hot', 1.8, r * 0.8)
    flash.location = (0, 0, 0.5)
    ring, rv = c.ring('hot', 0.06)

    def step(t):
        g = ease(t)
        for o, ang, rad, vz, spin in bits:
            put(o, (math.cos(ang) * rad * g, math.sin(ang) * rad * g, max(0.04, h * 0.5 + vz * t - 5.5 * t * t)), 1 - 0.6 * win(t, 0.7, 1), (t * spin, t * spin * 0.7, ang))
        av.outputs[0].default_value = 1 - win(t, 0.8, 1)
        fa.inputs[1].default_value = 2.5 * (1 - win(t, 0, 0.35))
        put(ring, scale=(r * (0.15 + 1.0 * ease(t)),) * 2 + (1,))
        rv.outputs[0].default_value = 1 - win(t, 0.45, 0.9)
    return step


# 24. Gust: crescents of wind sweeping across the ground along the board's u, one behind another.
def gust(c, r=1.5, n=4, h=1.1, turn=0.0):
    m, a, _ = c.streak('mid', 'hot', 1.3, 1.5)
    crescents = []
    for k in range(n):
        pts = []
        for i in range(25):
            u = i / 24
            ang = math.radians(-70 + 140 * u)
            pts.append(((math.cos(ang) * 0.9 - 0.9, math.sin(ang) * 0.9, 0), (math.cos(ang), math.sin(ang), 0)))
        o = c.ribbon(pts, lambda u: 0.22 * math.sin(u * math.pi) + 0.005, m)
        crescents.append((o, k / n * 0.5, c.rnd.uniform(0.2, h), c.rnd.uniform(0.7, 1.1)))
    bits = [(o, c.rnd.uniform(-1, 1) * r * 0.8, c.rnd.uniform(0.1, h), c.rnd.uniform(0, 0.5)) for o in c.sparks(14, 'hot', 0.04)]
    # (`turn` swings the whole gust round: 0 blows along the board's u, a quarter turn towards its far rows)
    ct, st = math.cos(turn), math.sin(turn)

    def step(t):
        a.inputs[1].default_value = 2.0
        for o, lag, z, s in crescents:
            g = win(t, lag, lag + 0.5)
            x = -r + 2 * r * ease(g)
            put(o, (x * ct, x * st, z), (s * (0.6 + 0.6 * g), s * r * (0.7 + 0.5 * g), 1), (math.radians(90), 0, turn))
            hide(o, g <= 0 or g >= 1)
        for o, y, z, lag in bits:
            g = win(t, lag, lag + 0.45)
            x = -r + 2.3 * r * g
            put(o, (x * ct - y * st, x * st + y * ct, z + 0.3 * math.sin(g * 9)), bell(g) if 0 < g < 1 else 0)
    return step


# 25. Vines: thorned tendrils that climb out of the ground and curl in over the middle.
def vines(c, r=1.2, n=6, h=1.4):
    m, av = c.solid('mid', 'deep', 0.3, 0.6, 0.0)
    tm, tv = c.solid('hot', 'bright', 0.4, 0.5, 0.0)
    stems = []
    for k in range(n):
        ang = k * TAU / n + c.rnd.uniform(-0.2, 0.2)
        segs = [c.cone(0.085 * (1 - i / 9 * 0.6), 0.34, m, 5, 0.085 * (1 - (i + 1) / 9 * 0.6)) for i in range(9)]
        thorns = [c.cone(0.035, 0.16, tm, 3) for _ in range(4)]
        stems.append((ang, c.rnd.uniform(0.75, 1.0), c.rnd.uniform(0, 0.2), segs, thorns))

    def step(t):
        gone = win(t, 0.8, 1)
        for ang, k, lag, segs, thorns in stems:
            grow = ease(win(t, lag, lag + 0.5)) * (1 - gone)
            pts = []
            for i in range(10):
                u = i / 9
                rad = r * k * (1 - 0.85 * u * u)
                z = h * k * math.sin(u * math.pi * 0.6)
                sway = 0.25 * math.sin(u * 5 + ang * 3)
                pts.append((math.cos(ang + sway) * rad, math.sin(ang + sway) * rad, z))
            for i, o in enumerate(segs):
                p0, p1 = pts[i], pts[i + 1]
                d = (p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2])
                ln = math.sqrt(d[0] ** 2 + d[1] ** 2 + d[2] ** 2)
                o.rotation_mode = 'QUATERNION'
                from mathutils import Vector
                o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(Vector(d))
                shown = clamp(grow * 9 - i)
                put(o, ((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2 * (0.3 + 0.7 * grow)), (1, 1, max(0.001, shown) * ln / 0.34 * 1.1))
                hide(o, shown <= 0)
            for j, o in enumerate(thorns):
                i = 2 + j * 2
                p = pts[i]
                shown = clamp(grow * 9 - i)
                put(o, (p[0], p[1], p[2] * (0.3 + 0.7 * grow) + 0.08), max(0.001, shown), (0.6 * (-1) ** j, 0.5, ang))
                hide(o, shown <= 0)
        av.outputs[0].default_value = 1 - 0.5 * gone
        tv.outputs[0].default_value = 1 - 0.5 * gone
    return step


# 26. Motes: a quiet fall of light: soft sparks climbing from a glowing patch, crosses winking among them.
def motes(c, r=1.4, h=2.0, n=28, crosses=5):
    rise = _rise(c, n, r, h, 'hot', 0.055, 1.2)
    patch, pa = c.disc('ramp', 1.0, r * 1.05)
    gm, gv = c.flat('hot', 2.2)
    plus = []
    for i in range(crosses):
        a = c.ribbon([((-0.16, 0, 0), (0, 0, 1)), ((0.16, 0, 0), (0, 0, 1))], 0.04, gm)
        b = c.ribbon([((0, 0, -0.2), (1, 0, 0)), ((0, 0, 0.2), (1, 0, 0))], 0.04, gm)
        plus.append((a, b, c.rnd.uniform(-1, 1) * r * 0.7, c.rnd.uniform(-1, 1) * r * 0.7, c.rnd.uniform(0.5, 1.0) * h, c.rnd.uniform(0, 0.45)))
    ring, rv = c.ring('bright', 0.04)

    def step(t):
        rise(t)
        k = 1 if c.loop else env(t, 0.15, 0.7)
        pa.inputs[1].default_value = 1.5 * k
        for a, b, x, y, top, lag in plus:
            g = (t + lag) % 1.0 if c.loop else win(t, lag, lag + 0.5)
            for o in (a, b):
                put(o, (x, y, 0.3 + top * g), bell(g) if 0 < g < 1 else 0, (0, 0, math.radians(-45)))
        put(ring, scale=(r * (0.3 + 0.75 * ease(t)),) * 2 + (1,))
        rv.outputs[0].default_value = 0 if c.loop else 1 - win(t, 0.5, 0.9)
    return step


# 27. Shout: arcs of force thrown forwards and upwards from the middle, like a war cry made visible.
def shout(c, r=1.6, n=4, h=1.4):
    m, a, _ = c.streak('bright', 'hot', 1.2, 1.7)
    waves = []
    for k in range(n):
        pts = []
        for i in range(33):
            u = i / 32
            ang = u * TAU
            pts.append(((math.cos(ang), math.sin(ang), 0), (0, 0, 1)))
        waves.append((c.ribbon(pts, 0.09, m), k * 0.13))
    fly = _fly(c, 16, r, r * 1.6, 3.5, 'hot', 0.045)

    def step(t):
        a.inputs[1].default_value = 2.0
        for o, lag in waves:
            g = win(t, lag, lag + 0.55)
            s = r * (0.15 + 0.9 * ease(g))
            put(o, (0, 0, 0.2 + h * ease(g)), (s, s, 1 + 2.5 * (1 - g)))
            hide(o, g <= 0 or g >= 1)
        fly(t)
    return step


# 28. Spiral: two bands of light racing up a helix round whoever stands there.
def spiral(c, r=0.55, h=1.9, bands=2, turns=2.2):
    m, a, head = c.streak('mid', 'hot', 1.2, 1.6, tail=0.6)
    for k in range(bands):
        pts = []
        for i in range(70):
            u = i / 69
            ang = k * TAU / bands + u * TAU * turns
            pts.append(((math.cos(ang) * r, math.sin(ang) * r, 0.05 + h * u), (0, 0, 1)))
        c.ribbon(pts, lambda u: 0.17 * (1 - 0.5 * u), m)
    ring, rv = c.ring('bright', 0.04)
    rise = _rise(c, 12, r * 1.3, h, 'hot', 0.04, 3.0)

    def step(t):
        head.outputs[0].default_value = ((t * 1.6) % 1.6) if c.loop else 1.7 * win(t, 0, 0.75)
        a.inputs[1].default_value = 2.2 * (1 if c.loop else 1 - win(t, 0.8, 1))
        put(ring, scale=(r * (0.6 + 1.2 * ease(t)),) * 2 + (1,))
        rv.outputs[0].default_value = 0 if c.loop else 1 - win(t, 0.4, 0.8)
        rise(t)
    return step


# 29. Implode: streaks and motes dragged in from all round to a knot of dark at the middle, which then snaps shut.
def implode(c, r=1.6, n=12, z=0.6):
    m, a, _ = c.streak('mid', 'hot', 1.3, 1.6)
    rays = []
    for i in range(n):
        ang = i * TAU / n + c.rnd.uniform(-0.15, 0.15)
        o = c.ribbon([((0, 0, 0), (0, 0, 1)), ((0.5, 0, 0), (0, 0, 1)), ((1, 0, 0), (0, 0, 1))], lambda u: 0.07 * (1 - u) + 0.006, m)
        rays.append((o, ang, c.rnd.uniform(0, 0.3), c.rnd.uniform(-0.3, 0.5)))
    km, cut = c.flame(3.0, 0.5, 1.3)
    knot = c.sphere(1, km, 3)
    ring, rv = c.ring('bright', 0.045)

    def step(t):
        c.tick(t, 2.0)
        a.inputs[1].default_value = 2.2
        for o, ang, lag, dz in rays:
            g = win(t, lag, lag + 0.45)
            rad = r * (1 - ease(g))
            put(o, (math.cos(ang) * rad, math.sin(ang) * rad, z + dz * (1 - g)), (0.3 + 0.5 * bell(g), 1, 1), (0, 0, ang))
            hide(o, g <= 0 or g >= 1)
        s = 0.12 + 0.42 * win(t, 0.1, 0.7) - 0.5 * win(t, 0.82, 1)
        put(knot, (0, 0, z), max(0.001, s), (t * 4, t * 3, 0))
        cut.inputs[1].default_value = 0.08 + 0.3 * win(t, 0.8, 1)
        put(ring, scale=(r * (1.05 - 0.9 * ease(t)),) * 2 + (1,))
        rv.outputs[0].default_value = win(t, 0, 0.1) * (1 - win(t, 0.7, 0.95))
    return step


# 30. Bite: two jaws of fangs that open wide and snap shut on the middle, venom spitting from the bite.
def bite(c, r=0.75, n=5, z=0.85):
    m, av = c.solid('hot', 'bright', 0.9, 0.2, 0.0)
    import bpy
    jaws = []
    for sgn in (1, -1):
        root = bpy.data.objects.new('jaw', None)
        c.sc.collection.objects.link(root)
        for i in range(n):
            u = (i - (n - 1) / 2) / ((n - 1) / 2)
            o = c.cone(0.15, 0.6 * (1 - 0.45 * abs(u)) + (0.35 if abs(u) > 0.4 and abs(u) < 0.9 else 0), m, 4)
            # (the fangs hang along the screen's left to right: the board's (1, 1))
            put(o, (u * r * 0.6, u * r * 0.6, 0), rot=(0 if sgn < 0 else math.pi, 0, 0))
            o.parent = root
        jaws.append((root, sgn))
    fly = _fly(c, 14, 0.5, 1.4, 2.5, 'bright', 0.05)
    slash_m, sa, _ = c.streak('bright', 'hot', 1.2, 1.8)
    gash = c.ribbon([((-r * 0.75 * (1 - i / 6 * 2), -r * 0.75 * (1 - i / 6 * 2), z), (0, 0, 1)) for i in range(7)], lambda u: 0.08 * math.sin(u * math.pi) + 0.004, slash_m)

    def step(t):
        open_ = bell(win(t, 0, 0.5)) * 0.9
        shut = win(t, 0.42, 0.52)
        gap = 0.25 + open_ * (1 - shut) - 0.2 * shut
        for root, sgn in jaws:
            put(root, (0, 0, z + sgn * gap), win(t, 0, 0.12) * (1 - win(t, 0.8, 1)) + 0.001)
        av.outputs[0].default_value = 1 - 0.6 * win(t, 0.8, 1)
        sa.inputs[1].default_value = 2.4 * bell(win(t, 0.48, 0.9))
        hide(gash, t < 0.48)
        fly(max(0.0, (t - 0.5) / 0.5), z)
    return step


# 31. Eye: a great eye of light that opens over the middle, looks about, and closes.
def eye(c, r=0.95, z=1.5):
    m, a, _ = c.streak('bright', 'hot', 1.0, 1.7)
    import bpy
    root = bpy.data.objects.new('eye', None)
    c.sc.collection.objects.link(root)
    lids = []
    for sgn in (1, -1):
        pts = [((math.cos(math.pi * i / 24) * r, 0, sgn * math.sin(math.pi * i / 24) * r * 0.5), (0, 0, 1)) for i in range(25)]
        o = c.ribbon(pts, lambda u: 0.05 + 0.03 * math.sin(u * math.pi), m)
        o.parent = root
        lids.append((o, sgn))
    im, iv = c.flat('mid', 1.5)
    iris = c.torus(0.24, 0.07, im)
    pm, pv = c.flat('hot', 2.2)
    pupil = c.sphere(0.1, pm, 2)
    for o in (iris, pupil):
        o.parent = root
    rays = []
    for i in range(7):
        ang = math.radians(20 + i * 23.3)
        o = c.ribbon([((math.cos(ang) * r * 0.75, 0, math.sin(ang) * r * 0.75), (math.sin(ang), 0, -math.cos(ang))), ((math.cos(ang) * r * 1.15, 0, math.sin(ang) * r * 1.15), (math.sin(ang), 0, -math.cos(ang)))], 0.03, m)
        o.parent = root
        rays.append(o)
    ring, rv = c.ring('bright', 0.04)

    def step(t):
        op = ease(win(t, 0.05, 0.35)) * (1 - win(t, 0.78, 0.95))
        # (it faces the camera: turned to the screen's plane)
        put(root, (0, 0, z), 1, (math.radians(-30), 0, math.radians(45)))
        for o, sgn in lids:
            o.scale = (1, 1, max(0.02, op))
        look = 0.14 * math.sin(win(t, 0.35, 0.78) * TAU)
        put(iris, (look, -0.01, 0), max(0.001, op), (math.radians(90), 0, 0))
        put(pupil, (look, -0.02, 0), max(0.001, op))
        for i, o in enumerate(rays):
            hide(o, op < 0.6)
        a.inputs[1].default_value = 2.0 * win(t, 0, 0.1) * (1 - win(t, 0.85, 1))
        put(ring, scale=(1.4 * (0.3 + 0.8 * ease(t)),) * 2 + (1,))
        rv.outputs[0].default_value = 1 - win(t, 0.4, 0.8)
    return step


# 32. Ribs: a row of great curved bones that break out of the ground along the board's u and stand (hold), then sink.
def ribs(c, length=1.0, n=3, h=1.2, hold=True):
    m, av = c.solid('bright', 'mid', 0.25, 0.7, 0.0)
    bones = []
    for i in range(n):
        x = (i + 0.5) / n * length - length / 2
        for sgn in (1, -1):
            segs = [c.cone(0.07 * (1 - j / 6 * 0.7), 0.3, m, 6, 0.07 * (1 - (j + 1) / 6 * 0.7)) for j in range(6)]
            bones.append((x, sgn, segs, c.rnd.uniform(0, 0.15), c.rnd.uniform(0.85, 1.0)))
    dm, dv = c.solid('mid', 'deep', 0.1, 0.9, 0.0)
    fly = _fly(c, 10, 0.3, 0.9, 2.0, 'mid', 0.05, 5.0)

    def step(t):
        gone = 0 if c.loop else win(t, 0.82, 1)
        for x, sgn, segs, lag, k in bones:
            grow = 1 if c.loop else (ease(win(t, lag, lag + 0.3)) + 0.1 * bell(win(t, lag, lag + 0.35))) * (1 - gone)
            for j, o in enumerate(segs):
                u0, u1 = j / 6, (j + 1) / 6
                p = lambda u: (x, sgn * (0.34 - 0.3 * math.sin(u * 1.9)), h * k * math.sin(u * 1.75) * grow)
                p0, p1 = p(u0), p(u1)
                d = (p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2] + 1e-5)
                from mathutils import Vector
                o.rotation_mode = 'QUATERNION'
                o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(Vector(d))
                ln = math.sqrt(d[0] ** 2 + d[1] ** 2 + d[2] ** 2)
                put(o, ((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2), (1, 1, max(0.001, ln / 0.3 * 1.15)))
        av.outputs[0].default_value = 1 - 0.6 * gone
        if not c.loop:
            fly(t, 0.05)
        else:
            fly(1.0)
    return step


# 33. Flames: a tile's small fire burning on the ground (a loop): three tongues and their sparks.
def flames(c, r=0.42, h=0.9, tongues=3):
    m, cut = c.flame(2.8, 0.45, 1.3, stretch=(1, 1, 0.5))
    parts = [(c.teardrop(m), c.rnd.uniform(0, TAU), c.rnd.uniform(0.0, 0.6) * r, c.rnd.uniform(0.6, 1.0), c.rnd.uniform(0, 1)) for _ in range(tongues)]
    rise = _rise(c, 6, r, h * 1.6, 'hot', 0.035, 0.4)
    glow, ga = c.disc('mid', 0.8, r * 1.5)

    def step(t):
        c.tick(t, 1.6)
        cut.inputs[1].default_value = 0.1
        for o, a, rad, s, ph in parts:
            w = math.sin((t + ph) * TAU)
            hh = h * s * (1 + 0.15 * w)
            put(o, (math.cos(a) * rad, math.sin(a) * rad, hh / 2), (r * 0.75 * s, r * 0.75 * s, hh / 2), (0.08 * w, 0, 0))
        ga.inputs[1].default_value = 1.2 + 0.2 * math.sin(t * TAU)
        rise(t)
    return step


# 34. Ground: the ground itself taking an element (a loop): a patch of moving light on the tile with small
# things standing in it (crystals for frost, bubbles for a bog, sparks for a charged floor).
def ground(c, r=0.62, things='crystals', n=5):
    patch, pa = c.disc('ramp', 1.0, r, noise=6)
    extra = None
    objs = []
    if things == 'crystals':
        m, av = c.solid()
        for i in range(n):
            ang, rad = c.rnd.uniform(0, TAU), c.rnd.uniform(0.1, 0.8) * r
            o = c.cone(0.06, c.rnd.uniform(0.12, 0.3), m, 4)
            put(o, (math.cos(ang) * rad, math.sin(ang) * rad, 0.08), rot=(c.rnd.uniform(-0.3, 0.3), c.rnd.uniform(-0.3, 0.3), 0))
        gm, gv = c.flat('hot', 2.2)
        objs = [(o, c.rnd.uniform(-1, 1) * r * 0.6, c.rnd.uniform(-1, 1) * r * 0.6, c.rnd.uniform(0, 1)) for o in c.sparks(4, 'hot', 0.04)]
    elif things == 'bubbles':
        m, _ = c.flat('bright', 1.4)
        objs = [(c.sphere(c.rnd.uniform(0.04, 0.08), m, 2), c.rnd.uniform(-1, 1) * r * 0.6, c.rnd.uniform(-1, 1) * r * 0.6, c.rnd.uniform(0, 1)) for _ in range(n)]
    elif things == 'sparks':
        objs = [(o, c.rnd.uniform(-1, 1) * r * 0.6, c.rnd.uniform(-1, 1) * r * 0.6, c.rnd.uniform(0, 1)) for o in c.sparks(n + 2, 'hot', 0.04)]
    elif things == 'motes':
        extra = _rise(c, n + 3, r * 0.8, 0.8, 'hot', 0.04, 0.8)

    def step(t):
        c.tick(t, 1.3)
        pa.inputs[1].default_value = 1.7 + 0.25 * math.sin(t * TAU)
        for o, x, y, ph in objs:
            g = (t + ph) % 1.0
            if things == 'bubbles':
                put(o, (x, y, 0.03 + 0.12 * g), 0.3 + 1.0 * g if g < 0.85 else 0.001)
            else:
                put(o, (x, y, 0.1 + (0.5 * g if things == 'sparks' else 0.12)), bell(g))
        if extra:
            extra(t)
    return step


# 35. Sparks: the small burst where a blow lands: a flash, short streaks thrown out, bits flying.
def sparks(c, r=0.6, n=8, z=0.5):
    m, a, _ = c.streak('bright', 'hot', 1.2, 2.0)
    rays = []
    for i in range(n):
        ang = i * TAU / n + c.rnd.uniform(-0.25, 0.25)
        el = c.rnd.uniform(-0.4, 0.9)
        o = c.cross_ribbon([(0, 0, 0), (0.5, 0, 0), (1, 0, 0)], lambda u: 0.05 * math.sin(u * math.pi) + 0.004, m)
        rays.append((o, ang, el, c.rnd.uniform(0.6, 1.0)))
    fm, cut = c.flame(3.0, 0.5, 1.6)
    core = c.sphere(1, fm, 3)
    fly = _fly(c, 8, r, r * 1.8, 2.5, 'hot', 0.035)

    def step(t):
        c.tick(t, 2.0)
        a.inputs[1].default_value = 2.4
        for pair, ang, el, k in rays:
            g = ease(t)
            for o in pair:
                put(o, (math.cos(ang) * r * 0.9 * g * k, math.sin(ang) * r * 0.9 * g * k, z + el * r * 0.6 * g), (r * 0.55 * k * (1 - 0.8 * t), 1, 1), (0, -el * 0.6, ang))
                hide(o, t > 0.85)
        put(core, (0, 0, z), max(0.001, r * 0.42 * bell(win(t, 0, 0.6))))
        cut.inputs[1].default_value = 0.05 + 0.4 * t
        fly(t, z)
    return step


# 36. Cross: two slashes laid across each other in the air (an X cut), one after the other, facing the screen.
def cross(c, r=0.8, z=0.8, wide=0.16):
    cuts = []
    for sgn, lag in ((1, 0.0), (-1, 0.2)):
        m, a, head = c.streak('mid', 'hot', 1.2, 1.25, tail=0.9)
        pts = [(scr(u * r, sgn * u * r * 0.9, z), scr(0.6, -sgn * 0.65)) for u in [i / 12 * 2 - 1 for i in range(13)]]
        c.ribbon(pts, lambda u: wide * math.sin(u * math.pi) + 0.004, m)
        cuts.append((a, head, lag))
    fly = _fly(c, 10, 0.5, 1.2, 2.0, 'hot', 0.04)

    def step(t):
        for a, head, lag in cuts:
            head.outputs[0].default_value = 1.0 * win(t, lag, lag + 0.28) + 0.9 * win(t, 0.6, 1)
            a.inputs[1].default_value = 2.4
        fly(max(0.0, (t - 0.3) / 0.7), z)
    return step


# 37. Smoke: a puff that rolls up off the ground and thins away.
def smoke(c, r=0.7, h=1.2, puffs=5):
    m, cut = c.flame(2.0, 0.55, 0.9)
    parts = [(c.sphere(1, m, 3), c.rnd.uniform(0, TAU), c.rnd.uniform(0, 0.6) * r, c.rnd.uniform(0.6, 1.0), c.rnd.uniform(0, 0.2)) for _ in range(puffs)]

    def step(t):
        c.tick(t, 1.2)
        # (it is ragged from the start and tears open as it rises, so it never sits as one solid mass over the fighters)
        cut.inputs[1].default_value = 0.2 + 0.6 * t * t
        for o, a, rad, s, lag in parts:
            g = win(t, lag, 1)
            put(o, (math.cos(a) * rad * (0.5 + g), math.sin(a) * rad * (0.5 + g), 0.2 + h * g * s), r * s * (0.35 + 0.55 * ease(g)), (g, g * 0.5, a))
    return step


# 38. Portal: an upright ring of light that tears open, swirls and winks shut.
def portal(c, r=0.75, z=0.95):
    import bpy
    root = bpy.data.objects.new('portal', None)
    c.sc.collection.objects.link(root)
    m, a, _ = c.streak('mid', 'hot', 1.0, 1.6, noise=4)
    arms = []
    for k in range(3):
        pts = []
        for i in range(40):
            u = i / 39
            ang = k * TAU / 3 + u * TAU * 0.9
            rad = 1 - 0.8 * u
            pts.append(((math.cos(ang) * rad, 0, math.sin(ang) * rad), (math.cos(ang), 0, math.sin(ang))))
        o = c.ribbon(pts, lambda u: 0.16 * (1 - u * 0.7), m)
        o.parent = root
        arms.append(o)
    hm, hv = c.flat('hot', 2.0)
    hoop = c.torus(1.0, 0.06, hm)
    hoop.rotation_euler = (math.radians(90), 0, 0)
    hoop.parent = root
    bits = [(o, c.rnd.uniform(0, TAU), c.rnd.uniform(1.1, 1.8), c.rnd.uniform(0, 0.5)) for o in c.sparks(14)]
    for o, *_ in bits:
        o.parent = root

    def step(t):
        c.tick(t, 1.5)
        op = (ease(win(t, 0, 0.3)) + 0.1 * bell(win(t, 0, 0.35))) * (1 - ease(win(t, 0.75, 1)))
        s = max(0.001, r * op)
        put(root, (0, 0, z), (s, s, s * 1.25), (0, 0, math.radians(45)))
        for o in arms:
            o.rotation_euler = (0, -t * TAU * 1.5, 0)
        a.inputs[1].default_value = 2.4
        hv.outputs[0].default_value = 1.0
        for o, ang, rad, lag in bits:
            g = win(t, lag, lag + 0.4)
            aa = ang + g * 2
            put(o, (math.cos(aa) * rad * (1 - g), 0, math.sin(aa) * rad * (1 - g)), bell(g) / max(0.2, op) if 0 < g < 1 else 0)
    return step


# 39. Claws: three raking cuts torn down across the air, side by side, facing the screen.
def claws(c, r=0.9, z=0.85, n=3, wide=0.13):
    cuts = []
    for k in range(n):
        m, a, head = c.streak('mid', 'hot', 1.2, 1.25, tail=1.0)
        off = (k - (n - 1) / 2) * wide * 2.8
        pts = []
        for i in range(17):
            u = i / 16 * 2 - 1
            bow = 0.22 * (1 - u * u)
            pts.append((scr(off - u * r * 0.35 + bow, -u * r * 0.95, z), scr(0.94, 0.34)))
        c.ribbon(pts, lambda u: wide * math.sin(u * math.pi) ** 0.8 + 0.004, m)
        cuts.append((a, head, k * 0.07))
    fly = _fly(c, 10, 0.5, 1.2, 2.0, 'hot', 0.04)

    def step(t):
        for a, head, lag in cuts:
            head.outputs[0].default_value = 1.0 * win(t, lag, lag + 0.3) + 1.0 * win(t, 0.62, 1)
            a.inputs[1].default_value = 2.4
        fly(max(0.0, (t - 0.25) / 0.75), z)
    return step


# 40. Veil: a curtain of shimmering light that wavers round whoever stands there, hiding them.
def veil(c, r=0.65, h=1.7, panes=7):
    m, nt = c.mat('veil')
    u, v = c.uv(nt)
    n, _ = c.noise(nt, 2.5, 3, 0.5, stretch=(1, 1, 0.3))
    ends = c.math(nt, 'SINE', c.math(nt, 'MULTIPLY', u, math.pi, clamp_=False))
    body = c.math(nt, 'MULTIPLY', c.math(nt, 'MULTIPLY', c.across(nt, v, 0.8), ends), c.math(nt, 'ADD', n.outputs['Fac'], 0.25))
    a = c.math(nt, 'MULTIPLY', body, 1.0)
    c.emit(nt, c.pal_ramp(nt, body, (0.05, 0.3, 0.55, 0.85)), a, 1.3)
    sheets = []
    for k in range(panes):
        ang = k * TAU / panes
        o = c.ribbon([((0, 0, h * i / 12), (1, 0, 0)) for i in range(13)], 0.2, m)
        sheets.append((o, ang, c.rnd.uniform(0, 1)))
    rise = _rise(c, 10, r, h, 'hot', 0.04, 2.0)

    def step(t):
        c.tick(t, 1.2, (0, 0, -1.5))
        k = 1 if c.loop else env(t, 0.2, 0.75)
        a.inputs[1].default_value = 2.6 * k
        for o, ang, ph in sheets:
            aa = ang + t * TAU * (1 / panes if c.loop else 0.35)
            w = 1 + 0.15 * math.sin((t + ph) * TAU)
            put(o, (math.cos(aa) * r * w, math.sin(aa) * r * w, 0.02), (1, 1, 0.5 + 0.5 * (1 if c.loop else ease(win(t, 0, 0.3)))), (0, 0, aa + math.pi / 2))
        rise(t)
    return step


# 41. Halo: a hoop of light that comes down from above on rays, with a soft pillar under it.
def halo(c, r=0.6, h=2.6, rays=7):
    hm, hv = c.flat('hot', 2.2)
    hoop = c.torus(1.0, 0.07, hm)
    m, a, _ = c.streak('mid', 'hot', 1.0, 1.4)
    shafts = []
    for i in range(rays):
        ang = i * TAU / rays
        o = c.ribbon([((math.cos(ang) * r * 0.9, math.sin(ang) * r * 0.9, 0), (-math.sin(ang), math.cos(ang), 0)), ((math.cos(ang) * r * 0.55, math.sin(ang) * r * 0.55, h), (-math.sin(ang), math.cos(ang), 0))], 0.09, m)
        shafts.append(o)
    patch, pa = c.disc('ramp', 1.0, r * 2.0)
    rise = _rise(c, 14, r * 1.3, h * 0.8, 'hot', 0.05, 1.0)
    ring, rv = c.ring('bright', 0.04)

    def step(t):
        down = ease(win(t, 0, 0.45))
        gone = win(t, 0.78, 1)
        put(hoop, (0, 0, h * (1 - down) + 1.25 * down), (r * (1 - 0.3 * gone),) * 2 + (1,))
        hv.outputs[0].default_value = 1 - gone
        a.inputs[1].default_value = 1.7 * win(t, 0.05, 0.3) * (1 - win(t, 0.6, 0.95))
        pa.inputs[1].default_value = 1.8 * win(t, 0.2, 0.5) * (1 - gone)
        put(ring, scale=(r * (0.5 + 2.0 * ease(win(t, 0.3, 1))),) * 2 + (1,))
        rv.outputs[0].default_value = win(t, 0.3, 0.35) * (1 - win(t, 0.6, 0.95))
        rise(max(0.0, (t - 0.25) / 0.75))
    return step


# 42. Shockwave: a clap: a flat sheet of force slammed outwards low over the ground, with forks of light in it.
def shockwave(c, r=1.6, forks=7):
    m, nt = c.mat('sheet')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    ln = nt.nodes.new('ShaderNodeVectorMath')
    ln.operation = 'LENGTH'
    nt.links.new(tc.outputs['Object'], ln.inputs[0])
    edge = c.val(nt, 0.5)
    d = c.math(nt, 'ABSOLUTE', c.math(nt, 'SUBTRACT', ln.outputs['Value'], edge, clamp_=False))
    band = c.math(nt, 'SUBTRACT', 1.0, c.math(nt, 'DIVIDE', d, 0.16))
    a = c.math(nt, 'MULTIPLY', c.math(nt, 'POWER', band, 1.5), 1.0)
    c.emit(nt, c.pal_ramp(nt, band, (0.1, 0.4, 0.65, 0.9)), a, 1.8)
    sheet = c.plane(r * 2.6, m)
    sheet.location = (0, 0, 0.12)
    bm, ba, _ = c.streak('bright', 'hot', 2.0, 2.0)
    arms = []
    for i in range(forks):
        ang = i * TAU / forks + c.rnd.uniform(-0.2, 0.2)
        pts, x, y, aa = [], 0.0, 0.0, ang
        for j in range(9):
            pts.append((x, y, 0.2 + 0.05 * (j % 2)))
            aa = ang + c.rnd.uniform(-0.7, 0.7)
            x += math.cos(aa) * r / 8
            y += math.sin(aa) * r / 8
        arms.append(c.ribbon([(p, (-math.sin(ang), math.cos(ang), 0)) for p in pts], lambda u: 0.045 * (1 - u) + 0.006, bm))
    flash, fa = c.disc('hot', 1.8, r * 0.5)
    fly = _fly(c, 12, r, r * 1.6, 2.5, 'hot', 0.04)

    def step(t):
        f = round(t * (c.frames - 1))
        edge.outputs[0].default_value = r * (0.1 + 1.05 * ease(t))
        a.inputs[1].default_value = 2.2 * (1 - win(t, 0.55, 1))
        for i, o in enumerate(arms):
            hide(o, t > 0.5 or (f + i) % 3 == 2)
            put(o, scale=(0.4 + 0.6 * ease(win(t, 0, 0.3)),) * 2 + (1,))
        ba.inputs[1].default_value = 2.4
        fa.inputs[1].default_value = 2.4 * (1 - win(t, 0, 0.4))
        fly(t, 0.1)
    return step


# 43. Souls: wisps with long tails that wind up out of a dark pool, like the dead answering a call.
def souls(c, r=1.1, h=2.2, n=7):
    m, a, head = c.streak('mid', 'hot', 1.0, 1.6, tail=0.45)
    for k in range(n):
        ang0 = k * TAU / n + c.rnd.uniform(-0.3, 0.3)
        rad = c.rnd.uniform(0.35, 1.0) * r
        top = c.rnd.uniform(0.7, 1.0) * h
        pts = []
        for i in range(50):
            u = i / 49
            ang = ang0 + u * 3.2
            rr = rad * (1 - 0.45 * u)
            pts.append(((math.cos(ang) * rr, math.sin(ang) * rr, 0.05 + top * u), (0, 0, 1)))
        c.ribbon(pts, lambda u: 0.22 * (0.5 + 0.5 * u), m)
    pool, pa = c.disc('ramp', 0.9, r * 1.25, noise=4)
    hm, hv = c.flat('hot', 2.0)
    ring, rv = c.ring('mid', 0.05)

    def step(t):
        c.tick(t, 1.0)
        head.outputs[0].default_value = 1.5 * win(t, 0.1, 0.9)
        a.inputs[1].default_value = 2.4 * (1 - win(t, 0.85, 1))
        pa.inputs[1].default_value = 1.8 * win(t, 0, 0.2) * (1 - win(t, 0.7, 1))
        put(ring, scale=(r * (0.4 + 0.8 * ease(t)),) * 2 + (1,))
        rv.outputs[0].default_value = 1 - win(t, 0.5, 0.9)
    return step


# 44. Hearts: little hearts that drift up from the middle, swaying, and pop.
def hearts(c, r=0.7, h=1.7, n=7):
    m, v = c.flat('bright', 1.6)
    m2, _ = c.flat('hot', 1.9)
    import bpy
    made = []
    for i in range(n):
        root = bpy.data.objects.new('heart', None)
        c.sc.collection.objects.link(root)
        mm = m if i % 2 else m2
        for sx in (-1, 1):
            lobe = c.sphere(0.5, mm, 2)
            put(lobe, (sx * 0.38, 0, 0.3))
            lobe.parent = root
        tip = c.cone(0.78, 0.95, mm, 4)
        put(tip, (0, 0, -0.32), (1, 0.62, 1), (math.pi, 0, 0))
        tip.parent = root
        made.append((root, c.rnd.uniform(-1, 1) * r, c.rnd.uniform(0, 0.5), c.rnd.uniform(0.6, 1.0) * h, c.rnd.uniform(0.13, 0.24)))
    ring, rv = c.ring('bright', 0.04)

    def step(t):
        for root, x, lag, top, size in made:
            g = (t + lag) % 1.0 if c.loop else win(t, lag, lag + 0.5)
            sway = 0.15 * math.sin(g * 7 + x * 5)
            s = size * (ease(win(g, 0, 0.3)) * (1 + 0.5 * win(g, 0.85, 1))) if 0 < g < 1 else 0
            put(root, ((x + sway) * 0.7, (x + sway) * 0.7, 0.5 + top * g), max(0.001, s), (0, 0, math.radians(45)))
        put(ring, scale=(r * (0.4 + 1.0 * ease(t)),) * 2 + (1,))
        rv.outputs[0].default_value = 0 if c.loop else 1 - win(t, 0.4, 0.8)
    return step


# 45. Shaft: a slanting shaft of sun from the sky onto the tile, with a bright pool where it lands.
def shaft(c, r=0.42, h=3.4, slant=0.5):
    m, nt = c.mat('shaft')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(tc.outputs['Generated'], sep.inputs[0])
    n, mp = c.noise(nt, 3.5, 3, 0.5, stretch=(1, 1, 0.12))
    lw = nt.nodes.new('ShaderNodeLayerWeight')
    lw.inputs['Blend'].default_value = 0.4
    body = c.math(nt, 'MULTIPLY', c.math(nt, 'ADD', n.outputs['Fac'], 0.45), c.math(nt, 'SUBTRACT', 1.0, lw.outputs['Facing']))
    fall = c.math(nt, 'SUBTRACT', 1.15, sep.outputs['Z'])
    a = c.math(nt, 'MULTIPLY', c.math(nt, 'MULTIPLY', body, fall), 1.0)
    c.emit(nt, c.pal_ramp(nt, c.math(nt, 'MULTIPLY', body, fall), (0.1, 0.4, 0.75, 1.1)), a, 1.15)
    col = c.cone(r, h, m, 24, r * 0.55)
    pool, pa = c.disc('ramp', 1.2, r * 1.9)
    fly = _fly(c, 10, 0.5, 1.2, 2.2, 'hot', 0.04)

    def step(t):
        c.tick(t, 1.0, (0, 0, 2.0))
        up, out = win(t, 0, 0.2), win(t, 0.6, 1)
        w = max(0.001, (0.3 + 0.7 * ease(up)) * (1 - 0.8 * out))
        # (it leans in from the upper right of the screen)
        put(col, (slant * h / 2, slant * h / 2, h / 2), (w, w, 1), (-math.atan(slant), math.atan(slant), 0))
        a.inputs[1].default_value = 2.6 * up * (1 - 0.6 * out)
        pa.inputs[1].default_value = 2.2 * up * (1 - out)
        fly(max(0.0, (t - 0.15) / 0.85), 0.05)
    return step


# 46. Slab: thick blocks of stone that slam up out of the ground in a ring and stand as a rampart, then drop.
def slab(c, r=0.55, n=4, h=1.0, dark=False):
    # (`dark`: heavy stone in stone's own grey-brown, lit plainly whatever the element, and thick, for an ultimate's wall or a planted
    # slab: it must stand out against pale ground and not take the element's tint)
    if dark:
        _plain_lights(c)
    m, av = c.solid((0.3, 0.27, 0.24), (0.06, 0.055, 0.05), 0.15, 0.9, 0.0) if dark else c.solid('bright', 'mid', 0.15, 0.85, 0.0)
    blocks = []
    for i in range(n):
        ang = i * TAU / n + math.radians(45)
        o = c.cube(1.0, m)
        blocks.append((o, ang, c.rnd.uniform(0.8, 1.0), i * 0.06))
    fly = _fly(c, 12, 0.6, 1.3, 2.4, 'mid', 0.05, 5.0)
    ring, rv = c.ring('hot', 0.05)

    def step(t):
        gone = win(t, 0.8, 1)
        for o, ang, k, lag in blocks:
            g = (ease(win(t, lag, lag + 0.2)) + 0.12 * bell(win(t, lag, lag + 0.28))) * (1 - gone)
            hh = max(0.001, h * k * g)
            put(o, (math.cos(ang) * r, math.sin(ang) * r, hh / 2), (0.56, 0.26, hh) if dark else (0.42, 0.16, hh), (0, 0, ang + math.pi / 2))
        av.outputs[0].default_value = 1 - 0.5 * gone
        put(ring, scale=(r * (0.6 + 1.6 * ease(t)),) * 2 + (1,))
        rv.outputs[0].default_value = 1 - win(t, 0.35, 0.8)
        fly(t, 0.05)
    return step


# 47. Flare: a rush of flame up round whoever stands there: tongues climbing the body and leaving the top.
def flare(c, r=0.5, h=1.7, tongues=6):
    m, cut = c.flame(2.6, 0.45, 1.35, stretch=(1, 1, 0.45))
    parts = [(c.teardrop(m), i * TAU / tongues, c.rnd.uniform(0.7, 1.0), c.rnd.uniform(0, 0.25)) for i in range(tongues)]
    ring, rv = c.ring('hot', 0.05)
    rise = _rise(c, 12, r * 1.2, h * 1.2, 'hot', 0.045, 1.0)

    def step(t):
        c.tick(t, 1.6, (0, 0, -2.0))
        cut.inputs[1].default_value = 0.1 + 0.5 * win(t, 0.55, 1)
        for o, a, s, lag in parts:
            g = win(t, lag, lag + 0.6)
            hh = h * s * (0.3 + 0.7 * ease(g))
            put(o, (math.cos(a + t * 2) * r, math.sin(a + t * 2) * r, hh / 2 + 0.4 * h * win(t, 0.6, 1)), (0.34, 0.34, hh / 2))
        put(ring, scale=(r * (0.8 + 1.6 * ease(t)),) * 2 + (1,))
        rv.outputs[0].default_value = 1 - win(t, 0.3, 0.7)
        rise(t)
    return step


# 48. Strike: a great spear of light that slams down from the sky, a four-pointed flare and a ring where it lands.
def strike(c, h=3.6, r=1.0, w=0.3):
    m, nt = c.mat('spear')
    lw = nt.nodes.new('ShaderNodeLayerWeight')
    lw.inputs['Blend'].default_value = 0.5
    core = c.math(nt, 'SUBTRACT', 1.0, lw.outputs['Facing'])
    a = c.math(nt, 'MULTIPLY', core, 1.0)
    c.emit(nt, c.pal_ramp(nt, core, (0.1, 0.35, 0.6, 0.9)), a, 1.2)
    tip = c.cone(1.0, 1.0, m, 4)
    shaft_ = c.cone(1.0, 1.0, m, 4)
    gm, ga, _ = c.streak('bright', 'hot', 1.0, 1.3)
    flare = [c.ribbon([(scr(-1, 0), scr(0, 1)), (scr(0, 0), scr(0, 1)), (scr(1, 0), scr(0, 1))], lambda u: 0.1 * math.sin(u * math.pi) + 0.004, gm),
             c.ribbon([(scr(0, -0.7), scr(1, 0)), (scr(0, 0), scr(1, 0)), (scr(0, 0.7), scr(1, 0))], lambda u: 0.1 * math.sin(u * math.pi) + 0.004, gm)]
    pool, pa = c.disc('ramp', 1.2, r * 1.2)
    hoop, hv = c.ring('hot', 0.06)
    hoop2, hv2 = c.ring('bright', 0.04)
    fly = _fly(c, 16, r, r * 1.9, 4.0, 'hot', 0.045)

    def step(t):
        fall = win(t, 0, 0.22) ** 2
        gone = win(t, 0.55, 0.9)
        z = h * (1 - fall)
        k = max(0.001, 1 - gone)
        put(tip, (0, 0, z + 0.45), (w * k, w * k, 0.9), (math.pi, 0, 0.6))
        put(shaft_, (0, 0, z + 0.9 + 0.9), (w * 0.8 * k, w * 0.8 * k, 1.8), (0, 0, 0.6))
        a.inputs[1].default_value = 2.6
        hit = win(t, 0.2, 0.26)
        fl = hit * (1 - win(t, 0.3, 0.75))
        for o in flare:
            put(o, (0, 0, 0.35), max(0.001, fl * r * 1.3))
            hide(o, fl <= 0.02)
        ga.inputs[1].default_value = 2.4
        pa.inputs[1].default_value = 2.4 * hit * (1 - win(t, 0.5, 1))
        for o, v, lag in ((hoop, hv, 0.2), (hoop2, hv2, 0.3)):
            g = win(t, lag, lag + 0.6)
            put(o, scale=(r * (0.1 + 1.0 * ease(g)),) * 2 + (1,))
            v.outputs[0].default_value = (1 - win(g, 0.5, 1)) if g > 0 else 0
        fly(max(0.0, (t - 0.2) / 0.8), 0.1)
    return step


# 49. Comet: a four-pointed star falling with twin tails (a loop: the renderer flies it down).
def comet(c, r=0.3, tail=1.8):
    gm, ga, _ = c.streak('bright', 'hot', 1.0, 1.3)
    import bpy
    root = bpy.data.objects.new('star', None)
    c.sc.collection.objects.link(root)
    for k in range(4):
        ang = k * math.pi / 4
        ln = r * (1.5 if k % 2 == 0 else 0.8)
        d, sd = scr(math.cos(ang), math.sin(ang)), scr(-math.sin(ang), math.cos(ang))
        o = c.ribbon([((-d[0] * ln, -d[1] * ln, -d[2] * ln), sd), ((0, 0, 0), sd), ((d[0] * ln, d[1] * ln, d[2] * ln), sd)], lambda u: r * 0.3 * math.sin(u * math.pi) + 0.004, gm)
        o.parent = root
    cm, cv = c.flat('hot', 1.4)
    core = c.sphere(r * 0.42, cm, 2)
    tm, ta, _ = c.streak('mid', 'bright', 1.1, 1.2, noise=4)
    d = (0.55, 0.55, 1.0)
    for off in (-0.12, 0.12):
        line = [(d[0] * tail * i / 12 + off * RIGHT[0] * (1 + i / 4), d[1] * tail * i / 12 + off * RIGHT[1] * (1 + i / 4), d[2] * tail * i / 12) for i in range(13)]
        c.ribbon([(p, (0.7, -0.7, 0)) for p in line], lambda u: r * 0.4 * (1 - u) + 0.006, tm)
    bits = [(o, c.rnd.uniform(0, 1), c.rnd.uniform(-1, 1)) for o in c.sparks(8, 'hot', 0.04)]

    def step(t):
        c.tick(t, 2.0)
        ga.inputs[1].default_value = 2.4
        ta.inputs[1].default_value = 2.2
        s = 1 + 0.18 * math.sin(t * TAU * 2)
        put(root, scale=s)
        for o, lag, ox in bits:
            g = (t + lag) % 1.0
            put(o, (d[0] * tail * g + ox * 0.2, d[1] * tail * g - ox * 0.2, d[2] * tail * g), (1 - g) * 1.2)
    return step


# 50. Palisade: a tile's stretch of tall shards standing in a row along the board's u (a loop: it glints).
def palisade(c, length=1.0, h=1.5, n=5):
    m, av = c.solid('bright', 'mid', 0.6, 0.1, 0.3)
    for i in range(n):
        x = (i + 0.5) / n * length - length / 2
        k = c.rnd.uniform(0.7, 1.0) * (1.0 if i % 2 == 0 else 0.75)
        o = c.cone(0.17, h * k, m, 5)
        put(o, (x, c.rnd.uniform(-0.08, 0.08), h * k / 2 - 0.02), rot=(c.rnd.uniform(-0.15, 0.15), c.rnd.uniform(-0.12, 0.12), c.rnd.uniform(0, 1)))
    for i in range(n - 1):
        x = (i + 1) / n * length - length / 2
        o = c.cone(0.12, h * 0.4, m, 4)
        put(o, (x, c.rnd.choice((-0.2, 0.2)), h * 0.2 - 0.02), rot=(c.rnd.uniform(-0.4, 0.4), 0, 0))
    gm, ga, _ = c.streak('bright', 'hot', 1.0, 1.4)
    glints = []
    for i in range(3):
        pair = [c.ribbon([(scr(-0.16, 0), scr(0, 1)), (scr(0, 0), scr(0, 1)), (scr(0.16, 0), scr(0, 1))], lambda u: 0.04 * math.sin(u * math.pi) + 0.003, gm),
                c.ribbon([(scr(0, -0.22), scr(1, 0)), (scr(0, 0), scr(1, 0)), (scr(0, 0.22), scr(1, 0))], lambda u: 0.04 * math.sin(u * math.pi) + 0.003, gm)]
        glints.append((pair, c.rnd.uniform(-0.4, 0.4) * length, c.rnd.uniform(0.5, 1.0) * h, i / 3))
    mist, ma = c.disc('bright', 0.8, 0.7, noise=7)

    def step(t):
        c.tick(t, 1.0)
        ga.inputs[1].default_value = 2.4
        ma.inputs[1].default_value = 1.6
        for pair, x, z, ph in glints:
            g = bell(win((t + ph) % 1.0, 0, 0.45))
            for o in pair:
                put(o, (x + 0.12, -0.12, z), max(0.001, g * 1.5))
                hide(o, g <= 0.05)
    return step


# 51. Siphon: streams drawn up out of the one standing there, curling into a ball that swells over their head.
def siphon(c, r=0.6, h=1.9, n=5):
    m, a, head = c.streak('mid', 'hot', 1.1, 1.25, tail=0.5, noise=4)
    for k in range(n):
        ang0 = k * TAU / n
        pts = []
        for i in range(40):
            u = i / 39
            ang = ang0 + u * 2.6
            rad = r * math.sin(u * math.pi * 0.85 + 0.35) * (1 - u * 0.6)
            pts.append(((math.cos(ang) * rad, math.sin(ang) * rad, 0.25 + (h - 0.25) * u), (0, 0, 1)))
        c.ribbon(pts, lambda u: 0.15 * (1 - 0.5 * u), m)
    om, cut = c.flame(3.2, 0.5, 1.25)
    orb = c.sphere(1, om, 3)
    fly = _fly(c, 12, 0.5, 1.2, 2.0, 'bright', 0.05)
    hoop, hv = c.ring('mid', 0.045)

    def step(t):
        c.tick(t, 1.8)
        head.outputs[0].default_value = (0.2 + 1.5 * win(t, 0, 0.7)) % 1.5 if t < 0.7 else 1.5 + 0.5 * win(t, 0.7, 0.85)
        a.inputs[1].default_value = 2.6 * (1 - win(t, 0.7, 0.85))
        s = 0.08 + 0.36 * ease(win(t, 0.12, 0.7))
        pop = win(t, 0.8, 1)
        put(orb, (0, 0, h), max(0.001, s * (1 + 0.5 * pop)), (t * 5, t * 3, 0))
        cut.inputs[1].default_value = 0.06 + 0.6 * pop
        put(hoop, scale=(r * (1.3 - 0.6 * ease(t)),) * 2 + (1,))
        hv.outputs[0].default_value = win(t, 0, 0.1) * (1 - win(t, 0.6, 0.85))
        fly(max(0.0, (t - 0.8) / 0.2) * 0.6, h)
    return step


# 52. Tile: one tile of ground taken by an element (a loop): a moving pattern across the whole tile, edge to edge, with the element's
# own small things standing in it (tongues of flame, crystals, bubbles, motes, wisps, swirls, stones, sprouts).
def tile(c, things='flames', n=4, fill=0.85, lift=1.0):
    m, nt = c.mat('tile')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(tc.outputs['Object'], sep.inputs[0])
    nz, _ = c.noise(nt, 5.0, 3, 0.55)
    # (the pattern runs right to the tile's edge, so a patch of tiles joins into one ground with no borders between them)
    body = c.math(nt, 'ADD', c.math(nt, 'MULTIPLY', nz.outputs['Fac'], 1.5), -0.35 + (fill - 0.5))
    a = c.math(nt, 'MULTIPLY', body, 1.0)
    c.emit(nt, c.pal_ramp(nt, nz.outputs['Fac'], (0.3, 0.45, 0.6, 0.78)), a, 1.1)
    ground = c.plane(1.02, m)
    ground.location = (0, 0, 0.02)
    spots = [(c.rnd.uniform(-0.4, 0.4), c.rnd.uniform(-0.4, 0.4), c.rnd.uniform(0.6, 1.0), c.rnd.uniform(0, 1)) for _ in range(n)]
    parts, rise, extra = [], None, []
    if things == 'flames':
        fm, cut = c.flame(3.0, 0.45, 1.3, stretch=(1, 1, 0.5))
        parts = [(c.teardrop(fm), x, y, k, ph) for x, y, k, ph in spots]
        extra.append(lambda t: cut.inputs[1].__setattr__('default_value', 0.1))
        rise = _rise(c, 5, 0.4, 0.9 * lift, 'hot', 0.035, 0.4)
    elif things == 'crystals':
        sm, _ = c.solid()
        for x, y, k, ph in spots:
            o = c.cone(0.1, 0.46 * k * lift, sm, 4)
            put(o, (x, y, 0.23 * k * lift), rot=(c.rnd.uniform(-0.3, 0.3), c.rnd.uniform(-0.3, 0.3), ph))
        parts = [(o, x, y, k, ph) for o, (x, y, k, ph) in zip(c.sparks(3, 'hot', 0.04), spots)]
    elif things == 'bubbles':
        bm, _ = c.flat('bright', 1.3)
        parts = [(c.sphere(0.1 * k, bm, 2), x, y, k, ph) for x, y, k, ph in spots]
        rise = _rise(c, 4, 0.4, 0.5 * lift, 'hot', 0.04, 0.3)
    elif things == 'motes':
        rise = _rise(c, n + 4, 0.42, 0.9 * lift, 'hot', 0.045, 0.8)
    elif things == 'wisps':
        wm, wa, _ = c.streak('mid', 'hot', 1.0, 1.2, noise=4)
        for x, y, k, ph in spots:
            pts = [((x + 0.08 * math.sin(i * 0.9 + ph * 6), y + 0.08 * math.cos(i * 0.7 + ph * 6), 0.04 + 0.6 * k * lift * i / 9), (0.7, 0.7, 0)) for i in range(10)]
            parts.append((c.ribbon(pts, lambda u: 0.1 * (1 - u) + 0.012, wm), x, y, k, ph))
        extra.append(lambda t: wa.inputs[1].__setattr__('default_value', 2.4))
    elif things == 'swirls':
        wm, wa, _ = c.streak('mid', 'hot', 1.2, 1.2)
        for x, y, k, ph in spots:
            pts = [((math.cos(i / 15 * 4.2) * 0.2 * k * (0.4 + i / 15), math.sin(i / 15 * 4.2) * 0.2 * k * (0.4 + i / 15), 0.0), (math.cos(i / 15 * 4.2), math.sin(i / 15 * 4.2), 0)) for i in range(16)]
            parts.append((c.ribbon(pts, lambda u: 0.07 * math.sin(u * math.pi) + 0.006, wm), x, y, k, ph))
        extra.append(lambda t: wa.inputs[1].__setattr__('default_value', 2.2))
    elif things == 'stones':
        sm, _ = c.solid('bright', 'mid', 0.15, 0.85, 0.0)
        for x, y, k, ph in spots:
            o = c.cone(0.12 * k, 0.24 * k * lift, sm, 4)
            put(o, (x, y, 0.1 * k * lift), rot=(0, 0, ph * 3))
        parts = [(o, x, y, k, ph) for o, (x, y, k, ph) in zip(c.sparks(3, 'hot', 0.035), spots)]
    elif things == 'sprouts':
        sm, _ = c.solid('bright', 'mid', 0.4, 0.6, 0.0)
        for x, y, k, ph in spots:
            for sgn in (-1, 1):
                o = c.cone(0.06, 0.4 * k * lift, sm, 3)
                parts.append((o, x, y, k, ph + (0.5 if sgn > 0 else 0)))
                o['lean'] = 0.5 * sgn
        rise = _rise(c, 4, 0.4, 0.7 * lift, 'hot', 0.035, 0.6)
    elif things == 'sparks':
        bm, ba, _ = c.streak('bright', 'hot', 2.0, 1.4)
        for x, y, k, ph in spots:
            pts = [(x + c.rnd.uniform(-0.05, 0.05) + 0.3 * k * (i / 5 - 0.5), y + c.rnd.uniform(-0.08, 0.08), 0.06 + 0.04 * (i % 2)) for i in range(6)]
            parts.append((c.ribbon([(p, (0, 1, 0)) for p in pts], 0.03, bm), x, y, k, ph))
        extra.append(lambda t: ba.inputs[1].__setattr__('default_value', 2.4))
        rise = _rise(c, 4, 0.4, 0.6 * lift, 'hot', 0.035, 0.3)
    elif things == 'drops':
        bm, _ = c.flat('bright', 1.3)
        parts = [(c.sphere(0.08 * k, bm, 2), x, y, k, ph) for x, y, k, ph in spots]

    def step(t):
        c.tick(t, 1.3)
        a.inputs[1].default_value = 2.0 + 0.3 * math.sin(t * TAU)
        for fn in extra:
            fn(t)
        for o, x, y, k, ph in parts:
            g = (t + ph) % 1.0
            w = math.sin(g * TAU)
            if things == 'flames':
                hh = 0.55 * k * lift * (1 + 0.16 * w)
                put(o, (x, y, hh / 2), (0.2 * k, 0.2 * k, hh / 2), (0.1 * w, 0, 0))
            elif things in ('crystals', 'stones'):
                put(o, (x + 0.05, y - 0.05, 0.2 * k * lift + 0.1), bell(g))
            elif things == 'bubbles':
                put(o, (x, y, 0.04 + 0.1 * g), 0.3 + 1.0 * g if g < 0.85 else 0.001)
            elif things == 'wisps':
                put(o, (0.03 * w, 0, 0), (1, 1, 0.75 + 0.25 * w))
            elif things == 'swirls':
                put(o, (x, y, 0.05 + 0.06 * k), 0.8 + 0.3 * w, (0, 0, -t * TAU))
            elif things == 'sprouts':
                lean = o['lean']
                put(o, (x + 0.05 * lean, y, 0.18 * k * lift), rot=(0, lean * (1 + 0.25 * w), ph * 6))
            elif things == 'sparks':
                hide(o, g > 0.35)
            elif things == 'drops':
                put(o, (x, y, 0.04 + 0.35 * k * lift * bell(g)), 0.4 + 0.8 * bell(g))
        if rise:
            rise(t)
    return step


# 53. Impact: the heart of a great blow: a white-hot core that swells and tears, two shock rings racing out along the
# ground, a wide flash under it, and debris thrown high that tumbles back down. Laid under an ultimate's own scenes.
def impact(c, r=3.0, rubble=26, sparks=30):
    fm, cut = c.flame(2.4, 0.5, 1.5)
    core = c.sphere(1, fm, 4)
    flash, fa = c.disc('ramp', 1.6, r * 0.75, noise=3.0)
    rings = [c.ring('hot', 0.09, 1.3), c.ring('bright', 0.06, 1.2)]
    sm, sv = c.solid('mid', 'deep', 0.5, 0.8, 0.0)
    rocks = [(c.cone(c.rnd.uniform(0.09, 0.22), c.rnd.uniform(0.18, 0.42), sm, 4), c.rnd.uniform(0, TAU), c.rnd.uniform(0.35, 1.0) * r, c.rnd.uniform(3.0, 6.5), c.rnd.uniform(0, 0.12), c.rnd.uniform(3, 9))
             for _ in range(rubble)]
    fly = _fly(c, sparks, r * 0.6, r * 1.25, 6.0, 'hot', 0.06, 5.0)

    def step(t):
        c.tick(t, 2.0)
        # (the core: a fireball up in the first frame or two, the heaviest of the whole effect; then it tears open at once, so the
        # fighters under it show through the holes, and burns on in rags, growing and thinning, for most of the blow)
        s = r * (0.12 + 0.42 * ease(win(t, 0, 0.12))) * (1 + 0.35 * win(t, 0.12, 1))
        put(core, (0, 0, 0.5 + 0.5 * r * 0.2 * t), (s, s, s * 0.85), (t * 2, t, 0))
        cut.inputs[1].default_value = 0.04 + 0.29 * win(t, 0.08, 0.2) + 0.1 * win(t, 0.2, 0.85) + 0.25 * win(t, 0.82, 1)
        # (the flash on the ground is broken by noise and gone early: a flat disc of one colour reads as paint)
        fa.inputs[1].default_value = 2.4 * (1 - win(t, 0.04, 0.4))
        for i, (o, v) in enumerate(rings):
            g = win(t, i * 0.1, 0.75 + i * 0.1)
            put(o, scale=(r * (0.08 + 1.0 * ease(g)),) * 2 + (1 + 3 * (1 - g),))
            v.outputs[0].default_value = (1 - win(g, 0.55, 1)) if g > 0 else 0
            hide(o, g <= 0 or g >= 1)
        for o, ang, rad, vz, lag, spin in rocks:
            g = win(t, lag, 0.95)
            z = vz * g - vz * 1.05 * g * g
            put(o, (math.cos(ang) * rad * g, math.sin(ang) * rad * g, max(0.04, z)), 0 if g <= 0 else 1 - 0.7 * win(g, 0.8, 1), (g * spin, g * spin * 0.6, ang))
        sv.outputs[0].default_value = 1 - win(t, 0.85, 1)
        fly(t, 0.3)
    return step


# 55. Spirits: ghostly figures (a head, a robed body drawn down to a wisp, two wings), each about a fighter tall, standing in a ring
# round the middle. `mode`: they `rise` out of the ground, `circle` (a loop turns each exactly into the next one's place, so it runs
# round for ever), or `fade` upward and away. A faint hoop on the ground shows the ring they keep.
TOWARDS = (0.612, -0.612, 0.5)


def spirits(c, r=1.2, n=4, tall=1.1, mode='circle', turns=0.5, hoop=True):
    robe_m, robe_a = c.solid('bright', 'mid', 1.2, 0.5, 0.0)
    hood_m, hood_a = c.solid('mid', 'deep', 0.5, 0.6, 0.0)
    face_m, face_a = c.flat('deep', 0.25)
    steel_m, steel_a = c.flat('hot', 1.6)
    figs = []
    for k in range(n):
        robe = c.teardrop(robe_m)
        hood = c.teardrop(hood_m)
        face = c.sphere(1.0, face_m, 2)
        pads = [c.sphere(1.0, robe_m, 2), c.sphere(1.0, robe_m, 2)]
        spear = c.cone(1.0, 1.0, steel_m, 6, r2=0.6)
        tip = c.cone(1.0, 1.0, steel_m, 4)
        wake = [c.sphere(1.0, robe_m, 1) for _ in range(4)]
        figs.append((robe, hood, face, pads, spear, tip, wake, c.rnd.uniform(0, 1)))
    ring, rv = c.ring('mid', 0.035) if hoop else (None, None)
    pool, pa = c.disc('ramp', 0.5, r * 1.15, hole=0.72) if hoop else (None, None)

    def step(t):
        c.tick(t, 1.0)
        # (a loop turns one place round the ring; a single pass, `turns` of the way round)
        turn = (TAU / n if c.loop else TAU * turns) * t
        for k, (robe, hood, face, pads, spear, tip, wake, ph) in enumerate(figs):
            lag = 0.45 * k / n
            grown = ease(win(t, lag, lag + 0.45)) if mode == 'rise' else 1 - win(t, 0.25 + lag * 0.5, 0.85 + lag * 0.3) if mode == 'fade' else 1.0
            s = tall * max(0.001, grown if mode == 'rise' else 0.4 + 0.6 * grown)
            ang = k * TAU / n + turn
            bob = 0.06 * tall * math.sin(TAU * (t * (1 if c.loop else 2) + ph))
            lift = (0.9 * tall * (1 - grown) if mode == 'fade' else 0.0) + bob
            x, y = math.cos(ang) * r, math.sin(ang) * r
            base = 0.1 * tall + lift
            # (a guardian: a long robe drawn down to a wisp, a hood over a face in shadow on the side the camera sees, a pauldron on each
            # shoulder, a spear held upright at its side; behind it along the ring, a wake of fading wisps)
            put(robe, (x, y, base + 0.4 * s), (0.25 * s, 0.25 * s, 0.4 * s), (math.pi, 0, 0))
            put(hood, (x, y, base + 0.84 * s), (0.17 * s, 0.17 * s, 0.21 * s))
            put(face, (x + TOWARDS[0] * 0.075 * s, y + TOWARDS[1] * 0.075 * s, base + (0.8 + TOWARDS[2] * 0.075) * s), (0.085 * s, 0.085 * s, 0.1 * s))
            for side, o in zip((-1, 1), pads):
                put(o, (x + RIGHT[0] * side * 0.22 * s, y + RIGHT[1] * side * 0.22 * s, base + 0.66 * s), (0.11 * s, 0.11 * s, 0.075 * s))
            sx, sy = x + RIGHT[0] * 0.31 * s, y + RIGHT[1] * 0.31 * s
            put(spear, (sx, sy, base + 0.62 * s), (0.02 * s, 0.02 * s, 1.1 * s))
            put(tip, (sx, sy, base + 1.24 * s), (0.04 * s, 0.04 * s, 0.16 * s))
            for i, o in enumerate(wake):
                back = ang - 0.16 * (i + 1) * (1 if mode != 'rise' else 0.3)
                put(o, (math.cos(back) * r, math.sin(back) * r, base + (0.3 - 0.04 * i) * s), 0.11 * s * (1 - 0.2 * i))
            for o in (robe, hood, face, *pads, spear, tip, *wake):
                hide(o, grown <= 0.01)
        shown = win(t, 0, 0.15) if mode == 'rise' else 1 - win(t, 0.6, 1) if mode == 'fade' else 1.0
        if hoop:
            put(ring, scale=(r, r, 1))
            rv.outputs[0].default_value = 0.9 * shown
            pa.inputs[1].default_value = 0.9 * shown
    return step


def _plain_lights(c):
    """Plain light for a thing that keeps its own colours whatever the element (a grey wolf): a white sun, a warm white rim and a grey
    sky, in place of the element's coloured rim and sky (`Ctx.lights`), which turned grey fur the element's green."""
    import bpy
    if c._lit:
        return
    c._lit = True
    for name, energy, colour, rot in (('sun', 4.5, (1, 1, 1), (50, 0, -30)), ('rim', 2.4, (1.0, 0.96, 0.9), (70, 0, 150))):
        li = bpy.data.lights.new(name, 'SUN')
        li.energy = energy
        li.color = colour
        o = bpy.data.objects.new(name, li)
        o.rotation_euler = tuple(math.radians(a) for a in rot)
        c.sc.collection.objects.link(o)
    world = c.sc.world
    world.use_nodes = True
    bg = world.node_tree.nodes.get('Background') or world.node_tree.nodes.new('ShaderNodeBackground')
    bg.inputs[0].default_value = (0.42, 0.42, 0.46, 1)
    bg.inputs[1].default_value = 0.7


# 56. Beast: a wolf's shape (a long body, a head and snout, two ears, four legs, a tail) bursting out of a puff of smoke in a leap,
# across the camera's view, and landing. What is summoned, arriving.
def beast(c, size=1.0, puffs=3):
    # (a wolf's own colours, whatever the element: grey fur, an amber eye; the smoke it bursts from and the ring it lands in are the
    # element's, the magic that called it)
    # (lit plainly: the element's green rim light and sky turned its grey fur green)
    _plain_lights(c)
    m, av = c.solid((0.3, 0.29, 0.31), (0.08, 0.075, 0.08), 0.5, 0.8, 0.0)
    eye_m, _ = c.flat((1.0, 0.72, 0.18), 2.6)
    body = c.sphere(1.0, m, 2)
    chest = c.sphere(1.0, m, 2)
    head = c.sphere(1.0, m, 2)
    snout = c.cone(1.0, 1.0, m, 6)
    ears = [c.cone(1.0, 1.0, m, 4), c.cone(1.0, 1.0, m, 4)]
    legs = [c.cone(1.0, 1.0, m, 5, r2=0.5) for _ in range(4)]
    tail = c.teardrop(m)
    eye = c.sphere(1.0, eye_m, 1)
    sm, cut = c.flame(2.0, 0.55, 0.9)
    smoke_ = [(c.sphere(1, sm, 3), c.rnd.uniform(0, TAU), c.rnd.uniform(0.1, 0.5), c.rnd.uniform(0.6, 1.0)) for _ in range(puffs)]
    ring, rv = c.ring('mid', 0.04)
    F = RIGHT

    def at(o, along, up, scale, rot=None, side=0.0):
        put(o, (c._bx + F[0] * along + TOWARDS[0] * side, c._by + F[1] * along + TOWARDS[1] * side, c._bz + up), scale, rot)

    def step(t):
        c.tick(t, 1.2)
        s = size
        # (out of the smoke in an arc, from behind the spot to on it, growing as it comes)
        g = ease(win(t, 0.05, 0.6))
        c._bx, c._by = -F[0] * 0.5 * s * (1 - g), -F[1] * 0.5 * s * (1 - g)
        c._bz = 0.22 * s + 0.55 * s * bell(win(t, 0.05, 0.6))
        k = s * (0.35 + 0.65 * g)
        tilt = 0.5 * (1 - 2 * win(t, 0.05, 0.6)) * (1 - win(t, 0.6, 0.8))
        zr = math.atan2(F[1], F[0])
        at(body, -0.05 * k, 0.0, (0.34 * k, 0.15 * k, 0.16 * k), (0, -tilt * 0.4, zr))
        at(chest, 0.2 * k, 0.03 * k, (0.2 * k, 0.17 * k, 0.19 * k), (0, 0, zr))
        at(head, 0.42 * k, 0.16 * k + tilt * 0.1 * k, 0.13 * k)
        at(snout, 0.56 * k, 0.13 * k + tilt * 0.12 * k, (0.06 * k, 0.06 * k, 0.2 * k), (0, math.pi / 2, zr))
        for sgn, e in zip((-1, 1), ears):
            at(e, 0.38 * k, 0.3 * k + tilt * 0.1 * k, (0.04 * k, 0.04 * k, 0.12 * k), None, sgn * 0.06 * k)
        stride = math.sin(TAU * t * 2)
        for i, leg in enumerate(legs):
            fore = i < 2
            swing = (0.5 if fore else -0.5) * (1 - win(t, 0.6, 0.75)) + 0.15 * stride * (1 if i % 2 else -1)
            at(leg, (0.24 if fore else -0.26) * k + swing * 0.12 * k, -0.2 * k, (0.035 * k, 0.035 * k, 0.26 * k), (0, swing * (1 if fore else 1), zr), (0.05 if i % 2 else -0.05) * k)
        at(tail, -0.42 * k, 0.08 * k, (0.05 * k, 0.05 * k, 0.2 * k), (0, -math.pi / 2 - 0.5, zr))
        at(eye, 0.47 * k, 0.2 * k + tilt * 0.1 * k, 0.03 * k, None, 0.1 * k)
        gone = win(t, 0.82, 1)
        av.outputs[0].default_value = 1 - gone
        for o in (body, chest, head, snout, *ears, *legs, tail, eye):
            hide(o, t < 0.04 or gone >= 1)
        # (a small puff, torn open at once: the beast is what is to be seen, not the smoke)
        cut.inputs[1].default_value = 0.25 + 0.6 * win(t, 0.05, 0.45)
        for o, a, rad, sc in smoke_:
            q = win(t, 0, 0.7)
            put(o, (-F[0] * 0.4 * s + math.cos(a) * rad * s * (0.4 + q), -F[1] * 0.4 * s + math.sin(a) * rad * s * (0.4 + q), 0.2 * s + 0.4 * s * q * sc), 0.24 * s * sc * (0.5 + 0.5 * ease(q)), (q, q * 0.5, a))
        # (no ring where it lands: a bright ring of the element under each wolf was the loudest thing in the picture; a little dust
        # kicked up is enough)
        hide(ring, True)
    return step


# 57. Eyes: pairs of eyes opening one after another in dark brush round the middle, watching, blinking. What is about to be called.
def eyes(c, r=1.3, n=5, size=1.0):
    # (wolves' heads lifting out of the dark one after another: a dark grey head with two pricked ears and a snout, and two amber eyes
    # side by side that open, watch and blink. Animals, plainly, and plainly pairs of eyes)
    em, ev = c.flat((1.0, 0.55, 0.05), 1.6)
    _plain_lights(c)
    fm, fa = c.solid((0.13, 0.125, 0.13), (0.035, 0.03, 0.035), 0.4, 0.9, 0.0)
    shade, sa = c.disc('deep', 0.9, r * 1.2, noise=3)
    heads = []
    for k in range(n):
        ang = k * TAU / n + c.rnd.uniform(-0.4, 0.4)
        rad = c.rnd.uniform(0.55, 1.0) * r
        head = c.sphere(1.0, fm, 2)
        neck = c.teardrop(fm)
        snout = c.cone(1.0, 1.0, fm, 6)
        ears = [c.cone(1.0, 1.0, fm, 4), c.cone(1.0, 1.0, fm, 4)]
        heads.append((ang, rad, head, neck, snout, ears, [c.sphere(1.0, em, 1), c.sphere(1.0, em, 1)], k / n * 0.6, c.rnd.uniform(0.5, 0.9)))

    k = size

    def step(t):
        c.tick(t, 0.8)
        gone = win(t, 0.88, 1)
        fa.outputs[0].default_value = 1 - gone
        sa.inputs[1].default_value = 1.6 * win(t, 0, 0.2) * (1 - gone)
        for n_, (ang, rad, head, neck, snout, ears, pair, lag, blink) in enumerate(heads):
            x, y = math.cos(ang) * rad, math.sin(ang) * rad
            g = ease(win(t, lag, lag + 0.3))
            z = (0.1 + 0.5 * g) * k
            # (a wolf's head seen from the side, so its outline is a wolf's: a long snout out across the camera's view (to the left for
            # one, to the right for the next), a brow, two tall ears pricked back, a thick ruff for the neck, and the eye on its near side)
            f = 1 if n_ % 2 == 0 else -1
            gk = g * k
            put(neck, (x - RIGHT[0] * f * 0.06 * gk, y - RIGHT[1] * f * 0.06 * gk, z * 0.5), (0.24 * gk + 0.001, 0.24 * gk + 0.001, 0.36 * gk + 0.001), (math.pi, 0, 0))
            put(head, (x, y, z), (0.2 * gk + 0.001, 0.2 * gk + 0.001, 0.17 * gk + 0.001))
            put(snout, (x + RIGHT[0] * f * 0.33 * gk, y + RIGHT[1] * f * 0.33 * gk, z - 0.05 * gk), (0.095 * gk + 0.001, 0.095 * gk + 0.001, 0.5 * gk + 0.001), (0, f * math.radians(100), math.radians(45)))
            for side, e in zip((-1, 1), ears):
                put(e, (x - RIGHT[0] * f * (0.07 + side * 0.05) * gk + TOWARDS[0] * side * 0.05 * gk, y - RIGHT[1] * f * (0.07 + side * 0.05) * gk + TOWARDS[1] * side * 0.05 * gk, z + 0.22 * gk), (0.075 * gk + 0.001, 0.075 * gk + 0.001, 0.36 * gk + 0.001), (0, -f * 0.3, math.radians(45)))
            opened = win(t, lag + 0.2, lag + 0.28) * (0.12 if abs(t - blink) < 0.03 else 1.0)
            for side, e in zip((-1, 1), pair):
                # (the near eye, and the far one just seen past the brow)
                put(e, (x + (TOWARDS[0] * (0.17 if side > 0 else 0.1) + RIGHT[0] * f * (0.09 + (0 if side > 0 else 0.07))) * k, y + (TOWARDS[1] * (0.17 if side > 0 else 0.1) + RIGHT[1] * f * (0.09 + (0 if side > 0 else 0.07))) * k, z + (0.05 + TOWARDS[2] * 0.14) * k), (0.055 * k, 0.055 * k, 0.045 * opened * k + 0.001))
                hide(e, opened <= 0.01 or gone >= 1)
            for o in (head, neck, snout, *ears):
                hide(o, g <= 0.01 or gone >= 1)
    return step


# 58. Whirlpool: water turning on the ground, flat: spiral arms of foam winding in to a dark eye, flecks carried round. A pull, seen
# from above; not a funnel standing up.
def whirlpool(c, r=1.6, arms=5, flecks=16):
    m, a, _ = c.streak('mid', 'hot', 1.3, 1.3)
    blades = []
    for k in range(arms):
        pts = []
        for i in range(40):
            u = i / 39
            ang = k * TAU / arms + u * 3.6
            rr = r * (1 - 0.86 * u)
            pts.append(((math.cos(ang) * rr, math.sin(ang) * rr, 0.03 + 0.05 * u), (math.cos(ang), math.sin(ang), 0)))
        blades.append(c.ribbon(pts, lambda u: 0.13 * (1 - 0.6 * u) + 0.01, m))
    eye, ea = c.disc('deep', 1.4, r * 0.3)
    pool, pa = c.disc('ramp', 0.8, r * 1.05, noise=4, hole=0.18)
    bits = [(o, c.rnd.uniform(0, TAU), c.rnd.uniform(0.3, 1.0), c.rnd.uniform(0, 1)) for o in c.sparks(flecks, 'hot', 0.04)]

    def step(t):
        c.tick(t, 1.0)
        shown = win(t, 0, 0.15) * (1 - win(t, 0.8, 1))
        turn = -TAU * (0.2 + 1.1 * t)
        for o in blades:
            put(o, (0, 0, 0), (0.55 + 0.45 * ease(win(t, 0, 0.3)),) * 2 + (1,), (0, 0, turn))
        a.inputs[1].default_value = 2.2 * shown
        ea.inputs[1].default_value = 1.8 * shown
        pa.inputs[1].default_value = 1.3 * shown
        for o, ang, rad, ph in bits:
            g = (t * 1.3 + ph) % 1.0
            rr = r * rad * (1 - 0.8 * g)
            an = ang + turn * 1.4 - g * 2.5
            put(o, (math.cos(an) * rr, math.sin(an) * rr, 0.08), shown * bell(g))
    return step


# 59. Sandstorm: a low wide wall of blown sand, broken bands of it racing round at different heights and speeds, grit carried up.
def sandstorm(c, r=1.5, h=1.1, bands=6, grit=18):
    m, a, _ = c.streak('mid', 'bright', 1.1, 1.1, noise=5.0)
    strips = []
    for k in range(bands):
        z = h * (0.12 + 0.8 * k / max(1, bands - 1))
        rad = r * c.rnd.uniform(0.75, 1.05)
        a0, span = c.rnd.uniform(0, TAU), c.rnd.uniform(1.6, 2.8)
        pts = [((math.cos(a0 + span * i / 24) * rad, math.sin(a0 + span * i / 24) * rad, z), (0, 0, 1)) for i in range(25)]
        strips.append((c.ribbon(pts, lambda u: 0.16 * math.sin(u * math.pi) + 0.01, m), c.rnd.uniform(0.7, 1.5) * (1 if k % 2 else -1)))
    rise = _rise(c, grit, r, h * 1.2, 'bright', 0.045, 5.0)
    dust, da = c.disc('ramp', 0.7, r * 1.1, noise=5)

    def step(t):
        c.tick(t, 1.6)
        shown = win(t, 0, 0.15) * (1 - win(t, 0.8, 1))
        grow = 0.5 + 0.5 * ease(win(t, 0, 0.35))
        for o, speed in strips:
            put(o, (0, 0, 0), (grow, grow, 1), (0, 0, TAU * speed * t))
        a.inputs[1].default_value = 2.0 * shown
        da.inputs[1].default_value = 1.2 * shown
        rise(t)
    return step


# 60. Wings: two great wings of light unfolding out from a point at the shoulders' height, each a fan of long feathers, held open,
# then folding away upward. Seen face on, across the camera's view.
def wings(c, r=1.3, h=2.0, feathers=7):
    m, a, _ = c.streak('bright', 'hot', 1.4, 1.5)
    root = scr(0, 0, h * 0.42)
    fans = []
    for side in (-1, 1):
        for i in range(feathers):
            th = math.radians(-12 + 80 * i / (feathers - 1))
            ln = r * (1.0 - 0.32 * abs(i / (feathers - 1) - 0.35))
            tip = (math.cos(th) * side * ln, math.sin(th) * ln)
            nrm = scr(-math.sin(th) * side, math.cos(th))
            pts = [(scr(tip[0] * u, tip[1] * u + 0.12 * math.sin(u * math.pi) * ln), nrm) for u in [j / 12 for j in range(13)]]
            o = c.ribbon(pts, lambda u: 0.11 * math.sin(min(1.0, u * 1.25) * math.pi * 0.85) + 0.012, m)
            fans.append((o, i / (feathers - 1)))
    core, cv = c.flat('hot', 2.2)
    orb = c.sphere(1.0, core, 2)
    ring, rv = c.ring('mid', 0.04)

    def step(t):
        gone = win(t, 0.78, 1)
        for o, k in fans:
            g = ease(win(t, 0.05 + 0.25 * k, 0.4 + 0.25 * k)) * (1 - gone)
            put(o, (root[0], root[1], root[2] + 0.5 * h * gone), max(0.001, g))
            hide(o, g <= 0.01)
        a.inputs[1].default_value = 2.4
        put(orb, root, 0.14 * (1 - gone) * (0.6 + 0.4 * bell(win(t, 0, 0.5))) + 0.001)
        put(ring, scale=(r * (0.3 + 0.7 * ease(win(t, 0, 0.5))),) * 2 + (1,))
        rv.outputs[0].default_value = win(t, 0, 0.1) * (1 - win(t, 0.5, 0.9))
    return step


# 61. Banner: a tall pole planted with a long cloth streaming from its top, snapping in the wind, a ring spreading from its foot.
# The cloth is four shapes of one wave shown in turn, so it flies.
def banner(c, h=2.3, w=1.2, tails=2):
    pole_m, pole_a = c.solid((0.32, 0.26, 0.2), (0.07, 0.06, 0.05), 0.2, 0.8, 0.0)
    _plain_lights(c)
    m, a, _ = c.streak('mid', 'bright', 0.6, 1.4)
    pole = c.tube(0.035, h, pole_m, 8, caps=True)
    tip_m, _ = c.flat('hot', 2.0)
    tip = c.cone(0.07, 0.2, tip_m, 4)
    cloths = []
    for ph in range(4):
        shapes = []
        for j in range(tails):
            top = h * (0.93 - 0.3 * j)
            pts = [(scr(x * w, top - 0.06 * x * w + 0.1 * w * x * math.sin(x * 5.0 - ph * TAU / 4 + j)), scr(0, 1)) for x in [i / 16 for i in range(17)]]
            shapes.append(c.ribbon(pts, lambda u, j=j: (0.16 - 0.03 * j) * (1 - 0.35 * u) + 0.01, m))
        cloths.append(shapes)
    ring, rv = c.ring('mid', 0.05)

    def step(t):
        up = ease(win(t, 0, 0.2)) + 0.06 * bell(win(t, 0, 0.3))
        gone = win(t, 0.82, 1)
        k = max(0.001, up * (1 - gone))
        put(pole, (0, 0, h * 0.5 * k), (1, 1, k))
        put(tip, (0, 0, (h + 0.1) * k), k)
        pole_a.outputs[0].default_value = 1 - gone
        now = int(t * 14) % 4
        for ph, shapes in enumerate(cloths):
            for o in shapes:
                put(o, (0, 0, -h * (1 - k)), (max(0.001, ease(win(t, 0.12, 0.4))), 1, 1))
                hide(o, ph != now or t < 0.12 or gone >= 1)
        a.inputs[1].default_value = 2.0 * (1 - gone)
        put(ring, scale=((0.3 + 1.3 * ease(win(t, 0.1, 0.7))),) * 2 + (1,))
        rv.outputs[0].default_value = win(t, 0.1, 0.18) * (1 - win(t, 0.45, 0.8))
    return step


SCENES = {f.__name__: f for f in (
    burst, pillar, spikes, arc, bolt, vortex, beam, nova, rain, crack, dome, projectile, trail, ring, swarm, chains, meteor, cloud, geyser, sigil,
    wall, crystal, shatter, gust, vines, motes, shout, spiral, implode, bite, eye, ribs, flames, ground, sparks, cross, smoke, portal, claws, veil,
    halo, shockwave, souls, hearts, shaft, slab, flare, strike, comet, palisade, siphon, tile, impact, spirits, beast, eyes, whirlpool, sandstorm, wings, banner,
)}
