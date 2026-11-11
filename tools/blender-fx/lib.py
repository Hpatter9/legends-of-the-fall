"""The shared parts of the Blender effects: the game's camera, the element palettes, and the materials and
shapes every scene is built from.

A scene is written in the board's own units: one Blender unit is one tile's side, +x is the board's u (right and
down on the screen), -y is its v (left and down), +z is up, and the origin is the middle of the tile the effect
stands on. The camera is the game's: orthographic, looking down at 30 degrees, turned 45, so a tile is a 2:1 diamond.
"""
import math
import random

import bpy
from mathutils import Vector

# How many of an effect's pixels one tile's width (64 world px) takes: the heroes' pixel density on the board.
DENSITY = 45
# Each frame is rendered this many times larger than it is kept, so the shrink smooths before the pixels are cut.
SUPER = 2
SQRT2 = math.sqrt(2)

# Each element's colours, dark to hot (linear RGB), an accent for its sparks, and whether it is a light that keeps
# a soft glow under its pixels.
PALETTES = {
    'fire': dict(deep=(0.35, 0.02, 0.0), mid=(0.9, 0.16, 0.01), bright=(1.0, 0.5, 0.05), hot=(1.0, 0.9, 0.45), spark=(1.0, 0.55, 0.1), glow=False),
    'ice': dict(deep=(0.04, 0.16, 0.5), mid=(0.2, 0.5, 0.95), bright=(0.55, 0.82, 1.0), hot=(0.92, 0.98, 1.0), spark=(0.75, 0.92, 1.0), glow=False),
    'lightning': dict(deep=(0.08, 0.1, 0.75), mid=(0.3, 0.5, 1.0), bright=(0.6, 0.85, 1.0), hot=(1.0, 1.0, 1.0), spark=(0.8, 0.92, 1.0), glow=True),
    'earth': dict(deep=(0.1, 0.05, 0.02), mid=(0.32, 0.18, 0.07), bright=(0.62, 0.42, 0.2), hot=(0.95, 0.8, 0.5), spark=(0.75, 0.55, 0.3), glow=False),
    'blood': dict(deep=(0.18, 0.0, 0.01), mid=(0.55, 0.01, 0.03), bright=(0.95, 0.08, 0.1), hot=(1.0, 0.55, 0.5), spark=(1.0, 0.2, 0.2), glow=False),
    'forest': dict(deep=(0.02, 0.2, 0.04), mid=(0.1, 0.55, 0.12), bright=(0.4, 0.95, 0.3), hot=(0.9, 1.0, 0.6), spark=(0.75, 1.0, 0.5), glow=False),
    'poison': dict(deep=(0.08, 0.0, 0.2), mid=(0.3, 0.05, 0.5), bright=(0.45, 0.8, 0.1), hot=(0.8, 1.0, 0.35), spark=(0.6, 1.0, 0.2), glow=False),
    'holy': dict(deep=(0.6, 0.25, 0.02), mid=(1.0, 0.55, 0.08), bright=(1.0, 0.8, 0.3), hot=(1.0, 1.0, 0.85), spark=(1.0, 0.95, 0.6), glow=True),
    'shadow': dict(deep=(0.03, 0.0, 0.08), mid=(0.2, 0.03, 0.42), bright=(0.55, 0.15, 0.9), hot=(0.95, 0.7, 1.0), spark=(0.8, 0.45, 1.0), glow=False),
    'arcane': dict(deep=(0.25, 0.0, 0.3), mid=(0.75, 0.05, 0.6), bright=(1.0, 0.35, 0.8), hot=(1.0, 0.85, 0.97), spark=(1.0, 0.6, 0.9), glow=False),
    'water': dict(deep=(0.0, 0.12, 0.4), mid=(0.02, 0.4, 0.75), bright=(0.2, 0.75, 0.95), hot=(0.85, 0.98, 1.0), spark=(0.6, 0.95, 1.0), glow=False),
    'wind': dict(deep=(0.1, 0.35, 0.4), mid=(0.3, 0.65, 0.68), bright=(0.6, 0.9, 0.88), hot=(0.95, 1.0, 1.0), spark=(0.9, 1.0, 1.0), glow=False),
    'bone': dict(deep=(0.16, 0.12, 0.1), mid=(0.45, 0.4, 0.32), bright=(0.8, 0.76, 0.62), hot=(1.0, 0.98, 0.9), spark=(0.7, 1.0, 0.75), glow=False),
}

TAU = math.tau
# The screen's own directions in the scene: a ribbon widened along these faces the camera.
RIGHT = (math.sqrt(0.5), math.sqrt(0.5), 0.0)
UP = (-math.sqrt(0.5) * 0.5, math.sqrt(0.5) * 0.5, math.sqrt(0.75))


def scr(x, y, z=0.0):
    """The point `x` to the screen's right and `y` up it from the origin, lifted by `z`."""
    return (RIGHT[0] * x + UP[0] * y, RIGHT[1] * x + UP[1] * y, UP[2] * y + z)


def clamp(v, lo=0.0, hi=1.0):
    return max(lo, min(hi, v))


def win(t, a, b):
    """How far `t` is through the stretch from `a` to `b`, held at 0 before and 1 after."""
    return clamp((t - a) / (b - a)) if b > a else float(t >= b)


def ease(t):
    """Fast out of the gate, settling."""
    return 1 - (1 - clamp(t)) ** 3


def bell(t):
    """Up and down again over 0..1."""
    return math.sin(clamp(t) * math.pi)


def env(t, up=0.15, down=0.75):
    """An effect's strength over its life: in over `up`, held, out from `down`."""
    return win(t, 0, up) * (1 - win(t, down, 1))


class Ctx:
    """One effect being built: the scene, its palette, its random stream, and the helpers that make its parts."""

    def __init__(self, spec):
        self.spec = spec
        self.pal = PALETTES[spec['element']]
        self.rnd = random.Random(spec.get('seed', 1))
        self.loop = bool(spec.get('loop'))
        self.frames = spec['frames']
        self.sc = self._reset()
        self._noises = []
        self._lit = False

    # ---- the scene and the camera ----

    def _reset(self):
        s = self.spec
        bpy.ops.wm.read_factory_settings(use_empty=True)
        sc = bpy.context.scene
        sc.render.engine = 'CYCLES'
        sc.cycles.device = 'CPU'
        sc.cycles.samples = s.get('samples', 24)
        sc.cycles.seed = 0
        sc.cycles.use_animated_seed = False
        sc.cycles.use_denoising = False
        sc.cycles.max_bounces = 3
        sc.cycles.transparent_max_bounces = 24
        sc.render.film_transparent = True
        w, h = s['w'], s['h']
        sc.render.resolution_x = round(w * DENSITY) * SUPER
        sc.render.resolution_y = round(h * DENSITY) * SUPER
        sc.render.resolution_percentage = 100
        sc.render.image_settings.file_format = 'PNG'
        sc.render.image_settings.color_mode = 'RGBA'
        sc.render.image_settings.compression = 15
        sc.view_settings.view_transform = 'Standard'
        sc.world = bpy.data.worlds.new('w')
        cam = bpy.data.cameras.new('cam')
        cam.type = 'ORTHO'
        cam.ortho_scale = max(w, h) * SQRT2          # the canvas's longer side, in tiles' sides
        ob = bpy.data.objects.new('cam', cam)
        sc.collection.objects.link(ob)
        rx, rz = math.radians(60), math.radians(45)
        ob.rotation_euler = (rx, 0, rz)
        d = 30
        away = Vector((d * math.sin(rx) * math.sin(rz), -d * math.sin(rx) * math.cos(rz), d * math.cos(rx)))
        # (the origin sits `oy` of the way down the canvas: the camera is raised along its own up by the difference from the middle)
        up = ob.rotation_euler.to_matrix() @ Vector((0, 1, 0))
        ob.location = away + up * ((s['oy'] - 0.5) * h * SQRT2)
        sc.camera = ob
        return sc

    def lights(self, tint=None):
        """A sun, a coloured rim and a little sky: only the solid things (ice, rock, bone) need them."""
        if self._lit:
            return
        self._lit = True
        tint = tint or self.pal['bright']
        for name, energy, colour, rot in (('sun', 4.5, (1, 1, 1), (50, 0, -30)), ('rim', 3.0, tint, (70, 0, 150))):
            li = bpy.data.lights.new(name, 'SUN')
            li.energy = energy
            li.color = colour
            o = bpy.data.objects.new(name, li)
            o.rotation_euler = tuple(math.radians(a) for a in rot)
            self.sc.collection.objects.link(o)
        world = self.sc.world
        world.use_nodes = True
        bg = world.node_tree.nodes.get('Background') or world.node_tree.nodes.new('ShaderNodeBackground')
        bg.inputs[0].default_value = (*self.pal['mid'], 1)
        bg.inputs[1].default_value = 0.7

    # ---- colours ----

    def col(self, key):
        """A palette colour by name (or a colour given outright) as RGBA."""
        c = self.pal[key] if isinstance(key, str) else key
        return (c[0], c[1], c[2], 1)

    # ---- nodes ----

    def mat(self, name='m'):
        m = bpy.data.materials.new(name)
        try:
            m.use_nodes = True
        except Exception:
            pass
        nt = m.node_tree
        for n in list(nt.nodes):
            nt.nodes.remove(n)
        return m, nt

    @staticmethod
    def sock(v):
        return v.outputs[0] if isinstance(v, bpy.types.Node) else v

    def math(self, nt, op, a, b=None, clamp_=True):
        n = nt.nodes.new('ShaderNodeMath')
        n.operation = op
        n.use_clamp = clamp_
        for i, v in enumerate((a, b)):
            if v is None:
                continue
            if isinstance(v, (int, float)):
                n.inputs[i].default_value = v
            else:
                nt.links.new(self.sock(v), n.inputs[i])
        return n

    def val(self, nt, v=1.0):
        n = nt.nodes.new('ShaderNodeValue')
        n.outputs[0].default_value = v
        return n

    def ramp(self, nt, fac, stops):
        r = nt.nodes.new('ShaderNodeValToRGB')
        els = r.color_ramp.elements
        while len(els) < len(stops):
            els.new(0.5)
        for e, (p, c) in zip(els, stops):
            e.position = p
            e.color = c
        nt.links.new(self.sock(fac), r.inputs[0])
        return r

    def pal_ramp(self, nt, fac, at=(0.1, 0.35, 0.6, 0.9)):
        """The palette as a ramp: dark where `fac` is low, hot where it is high."""
        return self.ramp(nt, fac, [(p, self.col(k)) for p, k in zip(at, ('deep', 'mid', 'bright', 'hot'))])

    def emit(self, nt, colour, alpha, strength=1.3):
        """A surface that gives off `colour` and is see-through where `alpha` is low."""
        out = nt.nodes.new('ShaderNodeOutputMaterial')
        mix = nt.nodes.new('ShaderNodeMixShader')
        tr = nt.nodes.new('ShaderNodeBsdfTransparent')
        em = nt.nodes.new('ShaderNodeEmission')
        em.inputs['Strength'].default_value = strength
        if isinstance(colour, (tuple, list, str)):
            em.inputs['Color'].default_value = self.col(colour)
        else:
            nt.links.new(self.sock(colour), em.inputs['Color'])
        nt.links.new(self.sock(alpha), mix.inputs[0])
        nt.links.new(tr.outputs[0], mix.inputs[1])
        nt.links.new(em.outputs[0], mix.inputs[2])
        nt.links.new(mix.outputs[0], out.inputs['Surface'])
        return em

    def noise(self, nt, scale=2.5, detail=4, rough=0.6, vector=None, stretch=None):
        """Moving 4D noise in the object's own space; `tick` moves it on each frame. `stretch` squeezes its space
        (0.2 on z gives long streaks up)."""
        tc = nt.nodes.new('ShaderNodeTexCoord')
        mp = nt.nodes.new('ShaderNodeMapping')
        if stretch:
            mp.inputs['Scale'].default_value = stretch
        nt.links.new(self.sock(vector) if vector is not None else tc.outputs['Object'], mp.inputs['Vector'])
        n = nt.nodes.new('ShaderNodeTexNoise')
        n.noise_dimensions = '4D'
        n.inputs['Scale'].default_value = scale
        n.inputs['Detail'].default_value = detail
        n.inputs['Roughness'].default_value = rough
        nt.links.new(mp.outputs[0], n.inputs['Vector'])
        self._noises.append((n, mp))
        return n, mp

    def tick(self, t, speed=1.5, drift=(0, 0, 0)):
        """Move every noise on to time `t`. A loop's noise walks a circle, so its last frame runs into its first."""
        for n, mp in self._noises:
            if self.loop:
                a = t * TAU
                n.inputs['W'].default_value = 0.35 * speed * math.cos(a)
                mp.inputs['Location'].default_value = (0.2 * speed * math.sin(a), 0.2 * speed * math.sin(a), 0.35 * speed * math.sin(a))
            else:
                n.inputs['W'].default_value = t * speed
                mp.inputs['Location'].default_value = (drift[0] * t, drift[1] * t, drift[2] * t)

    def uv(self, nt):
        """A ribbon's own coordinates: u along it, v across it (each 0..1)."""
        tc = nt.nodes.new('ShaderNodeTexCoord')
        sep = nt.nodes.new('ShaderNodeSeparateXYZ')
        nt.links.new(tc.outputs['UV'], sep.inputs[0])
        return sep.outputs['X'], sep.outputs['Y']

    def across(self, nt, v, power=1.0):
        """1 along a ribbon's middle, 0 at its two edges."""
        mid = self.math(nt, 'ABSOLUTE', self.math(nt, 'SUBTRACT', v, 0.5, clamp_=False))
        a = self.math(nt, 'SUBTRACT', 1.0, self.math(nt, 'MULTIPLY', mid, 2.0))
        return self.math(nt, 'POWER', a, power) if power != 1.0 else a

    # ---- materials ----

    def flat(self, key='bright', strength=1.1, alpha=1.0):
        """A plain glowing colour; the value node it returns is its alpha."""
        m, nt = self.mat('flat')
        v = self.val(nt, alpha)
        self.emit(nt, key, v, strength)
        return m, v

    def flame(self, scale=2.2, edge=0.35, strength=1.25, stretch=None):
        """Fire: noise that is hot at the heart and thin at the rim; `cut` is the threshold the scene raises as it dies."""
        m, nt = self.mat('flame')
        n, _ = self.noise(nt, scale, 5, 0.6, stretch=stretch)
        lw = nt.nodes.new('ShaderNodeLayerWeight')
        lw.inputs['Blend'].default_value = edge
        core = self.math(nt, 'SUBTRACT', 1.0, lw.outputs['Facing'])
        heat = self.math(nt, 'MULTIPLY', n.outputs['Fac'], core)
        cut = self.math(nt, 'SUBTRACT', heat, 0.2)
        alpha = self.math(nt, 'MULTIPLY', cut, 6.0)
        col = self.pal_ramp(nt, heat, (0.12, 0.3, 0.48, 0.7))
        self.emit(nt, col, alpha, strength)
        return m, cut

    def solid(self, base='bright', glow='mid', glow_strength=0.6, rough=0.15, metallic=0.25):
        """A real lit solid (ice, rock, bone) that can fade; the value node is its alpha."""
        self.lights()
        m, nt = self.mat('solid')
        out = nt.nodes.new('ShaderNodeOutputMaterial')
        pb = nt.nodes.new('ShaderNodeBsdfPrincipled')
        pb.inputs['Base Color'].default_value = self.col(base)
        pb.inputs['Roughness'].default_value = rough
        pb.inputs['Metallic'].default_value = metallic
        try:
            pb.inputs['Emission Color'].default_value = self.col(glow)
            pb.inputs['Emission Strength'].default_value = glow_strength
        except KeyError:
            pass
        tr = nt.nodes.new('ShaderNodeBsdfTransparent')
        mix = nt.nodes.new('ShaderNodeMixShader')
        av = self.val(nt, 1.0)
        nt.links.new(av.outputs[0], mix.inputs[0])
        nt.links.new(tr.outputs[0], mix.inputs[1])
        nt.links.new(pb.outputs[0], mix.inputs[2])
        nt.links.new(mix.outputs[0], out.inputs['Surface'])
        return m, av

    def streak(self, lo='mid', hi='hot', power=1.5, strength=1.15, noise=0.0, tail=None):
        """A ribbon's glow: bright along its middle, fading to its edges and (with `tail`) towards its far end. The
        value node is its strength; `head` (with `tail`) is how far along the ribbon its bright end has run."""
        m, nt = self.mat('streak')
        u, v = self.uv(nt)
        body = self.across(nt, v, power)
        head = None
        if tail:
            head = self.val(nt, 1.0)
            behind = self.math(nt, 'SUBTRACT', head, u, clamp_=False)
            fall = self.math(nt, 'SUBTRACT', 1.0, self.math(nt, 'DIVIDE', behind, tail, clamp_=False))
            live = self.math(nt, 'GREATER_THAN', behind, 0.0)
            body = self.math(nt, 'MULTIPLY', body, self.math(nt, 'MULTIPLY', fall, live))
        if noise:
            n, _ = self.noise(nt, noise, 3)
            body = self.math(nt, 'MULTIPLY', body, self.math(nt, 'ADD', n.outputs['Fac'], 0.35))
        a = self.math(nt, 'MULTIPLY', body, 1.0)
        col = self.ramp(nt, body, [(0.0, self.col('deep')), (0.3, self.col(lo)), (0.72, self.col('bright')), (1.0, self.col(hi))])
        self.emit(nt, col, a, strength)
        return m, a, head

    # ---- shapes ----

    def add(self, name, mesh):
        ob = bpy.data.objects.new(name, mesh)
        self.sc.collection.objects.link(ob)
        return ob

    def op(self, fn, mat=None, **kw):
        """Make a primitive with one of Blender's operators and give it a material."""
        fn(**kw)
        o = bpy.context.object
        if mat is not None:
            o.data.materials.append(mat)
        return o

    def sphere(self, r=1.0, mat=None, sub=3):
        return self.op(bpy.ops.mesh.primitive_ico_sphere_add, mat, subdivisions=sub, radius=r)

    def teardrop(self, mat=None, sub=3):
        """A tongue of flame's shape: a ball of radius 1 drawn to a point at the top."""
        o = self.sphere(1.0, mat, sub)
        for v in o.data.vertices:
            k = 1 - (v.co.z + 1) / 2
            v.co.x *= 0.12 + 0.88 * k ** 0.8
            v.co.y *= 0.12 + 0.88 * k ** 0.8
        return o

    def torus(self, R=1.0, r=0.04, mat=None):
        return self.op(bpy.ops.mesh.primitive_torus_add, mat, major_radius=R, minor_radius=r, major_segments=64, minor_segments=8)

    def cone(self, r=0.25, depth=1.0, mat=None, verts=5, r2=0.0):
        return self.op(bpy.ops.mesh.primitive_cone_add, mat, vertices=verts, radius1=r, radius2=r2, depth=depth)

    def tube(self, r=0.75, depth=3.0, mat=None, verts=48, caps=False):
        return self.op(bpy.ops.mesh.primitive_cylinder_add, mat, vertices=verts, radius=r, depth=depth, end_fill_type='NGON' if caps else 'NOTHING')

    def plane(self, size=2.0, mat=None):
        return self.op(bpy.ops.mesh.primitive_plane_add, mat, size=size)

    def cube(self, size=1.0, mat=None):
        return self.op(bpy.ops.mesh.primitive_cube_add, mat, size=size)

    def ribbon(self, pts, width, mat=None, name='ribbon'):
        """A strip of quads along `pts` (each a point and the sideways direction it is widened along); u runs
        along it, v across it. `width` is its half-width at each u."""
        me = bpy.data.meshes.new(name)
        verts, faces, us = [], [], []
        n = len(pts) - 1
        for i, (p, side) in enumerate(pts):
            w = width(i / n) if callable(width) else width
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
        ob = self.add(name, me)
        if mat is not None:
            me.materials.append(mat)
        return ob

    def cross_ribbon(self, pts, width, mat=None):
        """Two ribbons along the same line, crossed, so the line shows from any side. `pts` are bare points."""
        return [self.ribbon([(p, sd) for p in pts], width, mat) for sd in ((1, 0, 0), (0, 1, 0))]

    def move_ribbon(self, ob, pts, width, side):
        """Re-lay a ribbon made by `ribbon` along new points (the same count)."""
        n = len(pts) - 1
        for i, p in enumerate(pts):
            w = width(i / n) if callable(width) else width
            ob.data.vertices[i * 2].co = (p[0] - side[0] * w, p[1] - side[1] * w, p[2] - side[2] * w)
            ob.data.vertices[i * 2 + 1].co = (p[0] + side[0] * w, p[1] + side[1] * w, p[2] + side[2] * w)
        ob.data.update()

    def disc(self, key='mid', strength=1.0, reach=1.0, noise=0.0, hole=0.0):
        """A plane on the ground glowing in a soft round patch out to `reach` (with `hole`, a ring: dark inside
        that share of the reach). The node it returns is the patch's strength."""
        m, nt = self.mat('disc')
        tc = nt.nodes.new('ShaderNodeTexCoord')
        ln = nt.nodes.new('ShaderNodeVectorMath')
        ln.operation = 'LENGTH'
        nt.links.new(tc.outputs['Object'], ln.inputs[0])
        far = self.math(nt, 'DIVIDE', ln.outputs['Value'], reach)
        near = self.math(nt, 'SUBTRACT', 1.0, far)
        soft = self.math(nt, 'POWER', near, 1.4)
        if hole:
            inner = self.math(nt, 'MULTIPLY', self.math(nt, 'SUBTRACT', far, hole, clamp_=True), 1 / max(0.05, 1 - hole) * 3)
            soft = self.math(nt, 'MULTIPLY', soft, inner)
        if noise:
            n, _ = self.noise(nt, noise, 3)
            soft = self.math(nt, 'MULTIPLY', soft, self.math(nt, 'ADD', n.outputs['Fac'], 0.3))
        a = self.math(nt, 'MULTIPLY', soft, 1.0)
        col = self.pal_ramp(nt, soft, (0.0, 0.3, 0.6, 0.95)) if key == 'ramp' else key
        self.emit(nt, col, a, strength)
        o = self.plane(reach * 2.4, m)
        o.location = (0, 0, 0.02)
        return o, a

    def sparks(self, n, key='spark', r=0.05, strength=1.3):
        """`n` little glowing balls sharing one material."""
        m, _ = self.flat(key, strength)
        return [self.sphere(r, m, 1) for _ in range(n)]

    def ring(self, key='bright', r=0.05, strength=1.15):
        """A thin glowing hoop of radius 1 lying on the ground; scale it to spread it. Returns it and its alpha."""
        m, v = self.flat(key, strength)
        o = self.torus(1.0, r, m)
        o.location = (0, 0, 0.03)
        return o, v


def put(o, loc=None, scale=None, rot=None):
    if loc is not None:
        o.location = loc
    if scale is not None:
        o.scale = (scale, scale, scale) if isinstance(scale, (int, float)) else scale
    if rot is not None:
        o.rotation_euler = rot


def hide(o, hidden):
    o.hide_render = hidden
