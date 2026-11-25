"""AURAS-BLENDER (docs/notes/auras-blender.md): every class aura, started over and rendered in Blender.

    python3 tools/blender-fx/auras/build.py                 render what is missing, pixelate, pack the atlas
    python3 tools/blender-fx/auras/build.py --all           render everything again
    python3 tools/blender-fx/auras/build.py --only guardian,caster
    python3 tools/blender-fx/auras/build.py --sheet out/auras.png      a contact sheet of every strip (after a build)
    python3 tools/blender-fx/auras/build.py --pack          pack again from the frames already rendered

An aura is a soft, layered, living field of light round a fighter: a ring or sigil on the ground under its feet, wisps rising
at its rim, a shimmering shell behind it that is hollow where the body stands, and a few motes at its sides. Each piece is a
loop of FRAMES frames in a square cell of CELL px, seen by the game's own camera (lib.py), in its class's colours. Nothing is
a modelled object: light, rings, lines of light, sparks, flame, smoke and streaks only (the pipeline's rule).

The pieces are the parts `src/render/auraStyles.ts` names (`<class>.<step>.<role>`): `RECIPES` here gives each its scene. The
frames are rendered to out/blender-fx/auras/<key>/ at twice the cell, shrunk with their soft edges kept (`soften`: graded alpha, not
the hard cut the battle clips take: an aura is soft light), and packed as
`src/art/fx/aura/atlas.png` with `atlas.json` (the cell, and each key's strip: column, row, frames), the same seam the
painted atlas used, so the fight's aura and the menus' read it with no other change.
"""
import json, math, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(HERE, '..'))
RAW = os.path.join(ROOT, 'out', 'blender-fx', 'auras')
ART = os.path.join(ROOT, 'src', 'art', 'fx', 'aura')
CELL, FRAMES, COLS = 48, 8, 16
TAU = math.tau

# Each class's colour (the same as `auraStyles.ts`), as a palette: deep, mid, bright, hot.
COLOURS = dict(guardian=0xffd24a, bulwark=0xf0b860, blade=0xe0304a, marksman=0xdbe8f4, gunner=0xf2d35a, caster=0xb06cff,
               arcanist=0x7a86ff, support=0xfff0b8, beast=0xff6a2a, assassin=0x6a46a8, trickster=0xc6d2ff, warden=0x6cd060,
               vanguard=0xffa040,
               # (the plain strips: white, and given their colour by the game: a level's rings, a summon's ring, a higher grade's glow)
               plain=0xffffff)


def palette(hexc):
    r, g, b = ((hexc >> 16) & 255) / 255, ((hexc >> 8) & 255) / 255, (hexc & 255) / 255
    lin = lambda v: v ** 2.2
    c = (lin(r), lin(g), lin(b))
    mix = lambda a, b, k: tuple(a[i] + (b[i] - a[i]) * k for i in range(3))
    return dict(deep=mix((0, 0, 0), c, 0.35), mid=mix((0, 0, 0), c, 0.7), bright=c, hot=mix(c, (1, 1, 1), 0.75), spark=mix(c, (1, 1, 1), 0.5), glow=False)


# ---- the scenes: each returns step(t), t running 0..1 round the loop (frame FRAMES is frame 0 again) ----

def ground(c, r=0.62, points=0, skip=1, rings=1, dots=0, thick=0.024, glow=1.0, spin=1):
    """The ring on the ground under the feet: a soft pool of light, hoops round it, a sigil of straight lines inside (a star
    of `points` joined every `skip`), and dots riding the rim. It turns one step of its own symmetry in a loop, and breathes."""
    from lib import put
    import bpy
    pool, pa = c.disc('ramp', 0.9, r * 1.05, noise=3)
    m, v = c.flat('bright', 1.5)
    m2, v2 = c.flat('hot', 1.8)
    root = bpy.data.objects.new('sigil', None)
    c.sc.collection.objects.link(root)
    # (the hoops are the class's own colour, the lines and beads inside them its hottest: a white hoop reads as a plate's rim)
    hoops = [c.torus(1.0 - i * 0.2, thick / r * (1 - i * 0.25), m) for i in range(rings)]
    lines = []
    for i in range(points):
        a0, a1 = i * TAU / points, (i + skip) * TAU / points
        rr = 0.96 - (rings - 1) * 0.2 if rings > 1 else 0.96
        p0, p1 = (math.cos(a0) * rr, math.sin(a0) * rr, 0), (math.cos(a1) * rr, math.sin(a1) * rr, 0)
        dx, dy = p1[0] - p0[0], p1[1] - p0[1]
        ln = math.hypot(dx, dy)
        lines.append(c.ribbon([(p0, (-dy / ln, dx / ln, 0)), (p1, (-dy / ln, dx / ln, 0))], thick / r * 0.7, m2))
    beads = []
    for i in range(dots):
        o = c.sphere(0.07, m2, 1)
        o.location = (math.cos(i * TAU / dots) * 1.0, math.sin(i * TAU / dots) * 1.0, 0)
        beads.append(o)
    for o in hoops + lines + beads:
        o.parent = root
    sym = points or dots or 1

    def step(t):
        c.tick(t, 1.0)
        k = r * (1 + 0.04 * math.sin(TAU * t))
        put(root, (0, 0, 0.03), (k, k, 1), (0, 0, spin * t * TAU / sym))
        pa.inputs[1].default_value = glow * (1.0 + 0.25 * math.sin(TAU * t))
    return step


def _rim(c, n, r, back=0.0):
    """`n` places round the rim of the fighter's footprint, a little uneven, each with its own beat. `back` keeps them off the
    near side (towards the camera), where they would stand in front of the body."""
    out = []
    for i in range(n):
        a = i * TAU / n + c.rnd.uniform(-0.25, 0.25)
        out.append((math.cos(a) * r, math.sin(a) * r, (i / n + c.rnd.uniform(0, 0.08)) % 1.0, c.rnd.uniform(0.75, 1.0)))
    return out


def _glows(c, n, strength=1.6):
    """`n` soft points of light: each a small round patch facing the camera, hot at its heart and fading out to nothing (a ball of
    light renders as a hard disc, and at this size a hard disc is a square)."""
    out = []
    for _ in range(n):
        o, a = c.disc('ramp', strength, 1.0)
        o.rotation_euler = (math.radians(60), 0, math.radians(45))
        a.inputs[1].default_value = 2.2
        out.append(o)
    return out


def rays(c, n=6, r=0.62, h=0.85, long=0.5, w=0.1, sway=0.03):
    """Thin streaks of light rising at the rim: each climbs the height once a loop, swelling and thinning. (The rim is wider than
    the body, here and in every rising scene: wisps at the body's own width stood behind it, unseen.)"""
    from lib import bell
    m, a, _ = c.streak('mid', 'hot', 1.2, 1.6)
    bits = [(c.cross_ribbon([(0, 0, 0)] * 5, w, m), x, y, ph, s) for x, y, ph, s in _rim(c, n, r)]

    def step(t):
        for obs, x, y, ph, s in bits:
            g = (t + ph) % 1.0
            z0 = g * h
            pts = [(x + sway * math.sin(TAU * (g + j * 0.2)), y, z0 + j * long * s / 4) for j in range(5)]
            wid = lambda u, g=g, s=s: w * s * bell(g) * (0.3 + 0.7 * math.sin(u * math.pi))
            c.move_ribbon(obs[0], pts, wid, (1, 0, 0))
            c.move_ribbon(obs[1], pts, wid, (0, 1, 0))
    return step


def wind(c, n=4, r=0.62, h=1.2, w=0.12):
    """Wisps of wind winding up round the rim: each a short arc of a rising spiral."""
    from lib import bell
    m, a, _ = c.streak('mid', 'hot', 1.2, 1.5)
    bits = [(c.cross_ribbon([(0, 0, 0)] * 7, w, m), ph, s) for _, _, ph, s in _rim(c, n, r)]

    def step(t):
        for obs, ph, s in bits:
            g = (t + ph) % 1.0
            pts = []
            for j in range(7):
                a0 = TAU * (ph * 3 + g * 0.9 + j * 0.06)
                pts.append((math.cos(a0) * r, math.sin(a0) * r, g * h + j * 0.035))
            wid = lambda u, g=g, s=s: w * s * bell(g) * (0.25 + 0.75 * math.sin(u * math.pi))
            c.move_ribbon(obs[0], pts, wid, (0, 0, 1))
            c.move_ribbon(obs[1], pts, wid, (0.7, 0.7, 0))
    return step


def flames(c, n=6, r=0.6, h=0.55, fat=0.13):
    """Tongues of flame licking up at the rim, none of them over the knee."""
    from lib import put
    m, cut = c.flame(2.8, 0.45, 1.35, stretch=(1, 1, 0.5))
    bits = [(c.teardrop(m), x, y, ph, s) for x, y, ph, s in _rim(c, n, r)]

    def step(t):
        c.tick(t, 1.4)
        cut.inputs[1].default_value = 0.12
        for o, x, y, ph, s in bits:
            w = math.sin(TAU * (t + ph))
            hh = h * s * (0.75 + 0.25 * w)
            put(o, (x, y, hh / 2), (fat * s, fat * s, hh / 2), (0.1 * w, 0, 0))
    return step


def puffs(c, n=6, r=0.58, h=1.0, size=0.16, grow=0.6):
    """Puffs of smoke or mist lifting off the rim: each rises once a loop, swelling as it thins."""
    from lib import bell, put
    m, cut = c.flame(2.0, 0.55, 0.95)
    bits = [(c.sphere(1, m, 2), x, y, ph, s) for x, y, ph, s in _rim(c, n, r)]

    def step(t):
        c.tick(t, 1.0)
        cut.inputs[1].default_value = 0.22
        for o, x, y, ph, s in bits:
            g = (t + ph) % 1.0
            put(o, (x * (1 + 0.15 * g), y * (1 + 0.15 * g), 0.08 + g * h), size * s * (0.5 + grow * g) * bell(g) ** 0.6)
    return step


def bits(c, n=8, r=0.62, h=1.3, size=0.085, leaf=False, spin=0.6):
    """Small things carried up at the rim: sparks of light, or (`leaf`) leaves turning as they go. Each winds a little way
    round as it climbs."""
    from lib import bell, put
    if leaf:
        m, v = c.flat('bright', 1.5)
        obs = [c.ribbon([((-0.5, 0, 0), (0, 0, 1)), ((0, 0, 0), (0, 0, 1)), ((0.5, 0, 0), (0, 0, 1))], lambda u: 0.02 + 0.3 * math.sin(u * math.pi), m) for _ in range(n)]
    else:
        obs = _glows(c, n)
    places = _rim(c, n, r)

    def step(t):
        for o, (x, y, ph, s) in zip(obs, places):
            g = (t + ph) % 1.0
            a = math.atan2(y, x) + spin * g
            put(o, (math.cos(a) * r, math.sin(a) * r, 0.1 + g * h), size * s * bell(g) ** 0.5 * (3.2 if leaf else 1.5), (g * 5, g * 3, a) if leaf else None)
    return step


def shell(c, w=0.5, h=0.7, hole=0.38, z=0.0, strength=9.0):
    """The shimmering shell behind the fighter: an upright oval of light facing the camera, dark at its heart (where the body
    stands) and bright at its rim, its light moving."""
    from lib import put
    o, a = c.disc('ramp', 0.9, 1.0, noise=1.6, hole=hole)

    def step(t):
        c.tick(t, 1.2, (0, 0, 1.2 * t))
        k = 1 + 0.05 * math.sin(TAU * t)
        put(o, (0, 0, z), (w * k, h * k, 1), (math.radians(60), 0, math.radians(45)))
        a.inputs[1].default_value = strength
    return step


def halo(c, r=0.5, z=0.0, n=4, thick=0.035):
    """A hoop of light lying level, seen from the side, with sparks riding it round."""
    from lib import put
    ring, rv = c.ring('bright', thick / r, 1.6)
    glow, ga = c.disc('mid', 0.7, r * 0.9, hole=0.5)
    obs = _glows(c, n)

    def step(t):
        put(ring, (0, 0, z), (r, r, 1))
        put(glow, (0, 0, z - 0.01))
        for i, o in enumerate(obs):
            a = TAU * (i + t) / n
            put(o, (math.cos(a) * r, math.sin(a) * r, z), 0.1 * (1 + 0.3 * math.sin(TAU * t + i)))
    return step


def glint(c, arms=4, r=0.42, z=0.0, turn=0.0):
    """A mote: a glint of light with `arms` thin points, swelling and settling once a loop."""
    from lib import put
    import bpy
    m, a, _ = c.streak('bright', 'hot', 1.6, 2.0)
    root = bpy.data.objects.new('glint', None)
    c.sc.collection.objects.link(root)
    for i in range(arms // 2):
        ang = math.pi * i / (arms // 2)
        d = (math.cos(ang), 0, math.sin(ang))
        side = (-d[2], 0, d[0])
        o = c.ribbon([((-d[0], 0, -d[2]), side), ((0, 0, 0), side), (d, side)], lambda u: 0.02 + 0.2 * math.sin(u * math.pi) ** 3, m)
        o.parent = root
    # (its heart is a soft round glow, wider than its arms are thick)
    heart = _glows(c, 1, 2.0)[0]
    heart.rotation_euler = (math.radians(60) , 0, 0)
    heart.scale = (0.55, 0.55, 0.55)
    heart.parent = root

    def step(t):
        k = r * (0.7 + 0.3 * math.sin(TAU * t))
        put(root, (0, 0, z), k, (0, turn * t * math.pi / max(1, arms // 2), math.radians(45)))
    return step


def ember(c, h=0.7, fat=0.2, z=0.12):
    """A mote: one small flame."""
    from lib import put
    m, cut = c.flame(3.0, 0.4, 1.4, stretch=(1, 1, 0.5))
    o = c.teardrop(m)

    def step(t):
        c.tick(t, 1.5)
        cut.inputs[1].default_value = 0.1
        hh = h * (0.85 + 0.15 * math.sin(TAU * t))
        put(o, (0, 0, z + hh / 2), (fat, fat, hh / 2))
    return step


def puff(c, r=0.3, z=0.0):
    """A mote: one curl of smoke or mist, turning over."""
    from lib import put
    m, cut = c.flame(2.2, 0.5, 0.95)
    obs = [c.sphere(1, m, 2) for _ in range(3)]

    def step(t):
        c.tick(t, 1.0)
        cut.inputs[1].default_value = 0.2
        for i, o in enumerate(obs):
            a = TAU * (t + i / 3)
            put(o, (math.cos(a) * r * 0.35, 0, z + math.sin(a) * r * 0.3), r * (0.75 + 0.1 * math.sin(a * 2)))
    return step


def rune(c, r=0.36, z=0.0, bars=3):
    """A mote: a small hoop of light standing up, a mark of straight lines inside it, turning to face about."""
    from lib import put
    import bpy
    m, v = c.flat('spark', 1.8)
    root = bpy.data.objects.new('rune', None)
    c.sc.collection.objects.link(root)
    hoop = c.torus(1.0, 0.09, m)
    hoop.parent = root
    for i in range(bars):
        a = math.pi * i / bars + 0.4
        d = (math.cos(a) * 0.7, math.sin(a) * 0.7, 0)
        o = c.ribbon([((-d[0], -d[1], 0), (-d[1], d[0], 0)), (d, (-d[1], d[0], 0))], 0.08, m)
        o.parent = root

    def step(t):
        put(root, (0, 0, z), r * (0.9 + 0.1 * math.sin(TAU * t)), (math.radians(60), 0.25 * math.sin(TAU * t), math.radians(45)))
    return step


def leaf(c, r=0.42, z=0.0):
    """A mote: one leaf of light, rocking as it hangs."""
    from lib import put
    m, a, _ = c.streak('bright', 'hot', 1.0, 1.7)
    o = c.ribbon([((-1, 0, 0), (0, 0, 1)), ((-0.4, 0, 0), (0, 0, 1)), ((0.3, 0, 0), (0, 0, 1)), ((1, 0, 0), (0, 0, 1))], lambda u: 0.03 + 0.42 * math.sin(u * math.pi) ** 0.8, m)

    def step(t):
        put(o, (0, 0, z + 0.05 * math.sin(TAU * t)), r, (0.5 * math.sin(TAU * t), 0.35, math.radians(45) + 0.3 * math.cos(TAU * t)))
    return step


def arc(c, r=0.42, z=0.0, wide=0.16, sweep=150):
    """A piece that circles: a short crescent of light, like the trace of a blade."""
    from lib import put
    m, a, _ = c.streak('bright', 'hot', 1.4, 1.9)
    pts = []
    for i in range(13):
        ang = math.radians(-sweep / 2 + sweep * i / 12)
        pts.append(((math.cos(ang), 0, math.sin(ang)), (math.cos(ang), 0, math.sin(ang))))
    o = c.ribbon(pts, lambda u: 0.01 + wide * math.sin(u * math.pi), m)

    def step(t):
        a.inputs[1].default_value = 1.7 + 0.4 * math.sin(TAU * t)
        put(o, (0, 0, z), r, (0, 0, math.radians(45)))
    return step


def streaks(c, n=3, length=0.9, z=0.0, w=0.12):
    """Speed lines streaming back: thin streaks along the screen's right, each running its length once a loop."""
    from lib import bell
    m, a, _ = c.streak('mid', 'hot', 1.3, 1.7)
    s2 = math.sqrt(0.5)
    along, up = (s2, s2, 0), (0, 0, 1)          # (the screen's right, in the board's ground)
    obs = [(c.ribbon([((0, 0, 0), up)] * 5, w, m), c.rnd.uniform(-0.28, 0.28), i / n) for i in range(n)]

    def step(t):
        for o, dz, ph in obs:
            g = (t + ph) % 1.0
            x0 = -length * 0.5 + length * 0.55 * (1 - g)
            pts = [(along[0] * (x0 + j * length * 0.11), along[1] * (x0 + j * length * 0.11), z + dz) for j in range(5)]
            c.move_ribbon(o, pts, lambda u, g=g: w * bell(g) * (0.2 + 0.8 * u), up)
    return step


SCENES = dict(ground=ground, rays=rays, wind=wind, flames=flames, puffs=puffs, bits=bits, shell=shell, halo=halo, glint=glint, ember=ember,
              puff=puff, rune=rune, leaf=leaf, arc=arc, streaks=streaks)

# ---- the recipes: each part of each class's two steps (`<class>.<step>.<role>`), its scene and its options ----
# Step 1 is the light aura (the ring and its wisps); step 2 the strong one (a fuller ring, the shell, more wisps, motes, and the
# class's own piece). `oy` is how far down the cell the ground's middle sits: 0.5 for what lies flat, lower for what rises.
FLAT, UP, MID = 0.5, 0.86, 0.5


def R(scene, oy, **opt):
    return dict(scene=scene, oy=oy, opt=opt)


def klass(g1, g2, rise1, rise2, mote, own=None, shell_opt=None):
    """A class's parts: its ring at each step, its wisps at each step, its shell and mote at step 2, and its own piece."""
    # (the light aura's shell is smaller and fainter than the strong one's; its ring is drawn a little heavier and its wisps are
    # two fifths more than first made, so it is plainly an aura, and still plainly less than the strong one)
    g1 = {**g1, 'thick': g1.get('thick', 0.024) * 1.35, 'glow': g1.get('glow', 1.0) * 1.3}
    rise1 = dict(rise1, opt={**rise1['opt'], 'n': round(rise1['opt']['n'] * 1.4)})
    out = {'1.ground': R('ground', FLAT, **g1), '1.shell': R('shell', MID, **{'w': 0.42, 'h': 0.6, 'strength': 6.0, **(shell_opt or {})}), '1.rise': rise1, '2.ground': R('ground', FLAT, **g2), '2.shell': R('shell', MID, **(shell_opt or {})),
           '2.rise': rise2, '2.motes': mote}
    out.update(own or {})
    return out


RECIPES = dict(
    # (the Guardian's golden ward: a six-sided seal, shafts of light standing round it)
    guardian=klass(dict(rings=1, points=6, skip=1), dict(rings=2, points=6, skip=2, dots=6), R('rays', UP, n=5, long=0.55), R('rays', UP, n=8, long=0.7, w=0.1),
                   R('glint', MID, arms=4)),
    # (the Bulwark's bronze bastion: a square keep, heavy slow shafts, a second ring thrown wide)
    bulwark=klass(dict(rings=2, points=4, skip=1, thick=0.034), dict(rings=2, points=4, skip=1, dots=4, thick=0.034), R('rays', UP, n=4, long=0.4, w=0.12, h=0.7),
                  R('rays', UP, n=6, long=0.5, w=0.12, h=0.8), R('glint', MID, arms=4, r=0.36), {'2.ground2': R('ground', FLAT, r=0.66, rings=1, dots=8, glow=0.25, thick=0.02, spin=-1)}),
    # (the Blade's crimson edge: a three-pointed mark, quick thin streaks, crescents circling)
    blade=klass(dict(rings=1, points=3, skip=1), dict(rings=1, points=6, skip=2, dots=3), R('rays', UP, n=5, long=0.6, w=0.1, h=0.8), R('rays', UP, n=9, long=0.65, w=0.1, h=0.8),
                R('glint', MID, arms=2, r=0.45), {'2.orbit': R('arc', MID)}),
    # (the Marksman's wind: thin clean rings, wisps winding up, speed lines)
    marksman=klass(dict(rings=2, thick=0.02), dict(rings=3, dots=4, thick=0.02), R('wind', UP, n=3), R('wind', UP, n=5), R('glint', MID, arms=4, r=0.34),
                   {'1.trail': R('streaks', MID, n=2), '2.trail': R('streaks', MID, n=3)}),
    # (the Gunner's powder: a ring of shot, gunsmoke lifting, sparks)
    gunner=klass(dict(rings=1, dots=6), dict(rings=2, dots=10), R('puffs', UP, n=4, size=0.17, h=0.9), R('puffs', UP, n=6, size=0.2, h=1.1), R('glint', MID, arms=4, r=0.3),
                 {'2.sparks': R('bits', UP, n=7, h=1.1, size=0.09, spin=0.2)}),
    # (the Caster's arcane seal: a five-pointed star, sparks carried up, runes circling)
    caster=klass(dict(rings=1, points=5, skip=2), dict(rings=2, points=5, skip=2, dots=5), R('bits', UP, n=6, spin=1.2), R('bits', UP, n=10, spin=1.2), R('rune', MID),
                 {'1.orbit': R('rune', MID, r=0.32, bars=2), '2.orbit': R('rune', MID, bars=3)}),
    # (the Arcanist's starlight: an eight-pointed star, a slow fall of stars upward, a halo)
    arcanist=klass(dict(rings=1, points=8, skip=3), dict(rings=2, points=8, skip=3, dots=8), R('bits', UP, n=5, size=0.09, spin=0.1), R('bits', UP, n=9, size=0.09, spin=0.1),
                   R('glint', MID, arms=8, r=0.4, turn=1), {'2.halo': R('halo', FLAT, n=5)}),
    # (the Support's radiance: a soft sun on the ground, motes of light rising, a halo)
    support=klass(dict(rings=1, dots=8, glow=1.3), dict(rings=2, points=8, skip=1, dots=8, glow=1.4), R('bits', UP, n=6, size=0.09, spin=0.4), R('rays', UP, n=7, long=0.5, w=0.1),
                  R('glint', MID, arms=4, r=0.42, turn=1), {'1.halo': R('halo', FLAT, n=3), '2.halo': R('halo', FLAT, n=6, r=0.55)}),
    # (the Beast's feral flame: a ragged burning ring, tongues of fire at its rim, embers)
    beast=klass(dict(rings=1, glow=1.3), dict(rings=2, points=3, skip=1, glow=1.5), R('flames', UP, n=7, h=0.6, fat=0.15), R('flames', UP, n=11, h=0.8, fat=0.17), R('ember', UP),
                {'2.embers': R('bits', UP, n=7, h=1.2, size=0.09, spin=0.3)}),
    # (the Assassin's shadow: a dark pool, smoke curling up, wisps of it at the sides)
    assassin=klass(dict(rings=1, glow=1.2, thick=0.02), dict(rings=2, points=4, skip=1, glow=1.3, thick=0.02), R('puffs', UP, n=6, size=0.2), R('puffs', UP, n=9, size=0.22, h=1.1),
                   R('puff', MID)),
    # (the Trickster's moonlit mist: pale rings, low mist rolling, glints)
    trickster=klass(dict(rings=2, thick=0.02, glow=1.2), dict(rings=3, dots=3, thick=0.02, glow=1.3), R('puffs', UP, n=5, size=0.2, h=0.45, grow=0.9), R('puffs', UP, n=8, size=0.22, h=0.55, grow=0.9),
                    R('glint', MID, arms=4, r=0.36, turn=1), {'2.stars': R('bits', UP, n=6, size=0.09, spin=0.8)}),
    # (the Warden's living green: a ring of growth, leaves carried up)
    warden=klass(dict(rings=1, points=6, skip=1, dots=6), dict(rings=2, points=6, skip=1, dots=12), R('bits', UP, n=5, leaf=True, size=0.09), R('bits', UP, n=9, leaf=True, size=0.09), R('leaf', MID),
                 {'2.sparks': R('bits', UP, n=6, size=0.09, spin=0.6)}),
    # (the Vanguard's charge: a hot ring, low flame, heat streaming back)
    vanguard=klass(dict(rings=1, points=3, skip=1, glow=1.2), dict(rings=2, points=3, skip=1, dots=3, glow=1.3), R('flames', UP, n=6, h=0.45, fat=0.13), R('flames', UP, n=9, h=0.6, fat=0.14),
                   R('ember', UP, h=0.55), {'1.trail': R('streaks', MID, n=2), '2.trail': R('streaks', MID, n=3, length=1.0)}),
)
# The plain strips (`PLAIN_KEYS` in auraStyles.ts): white, tinted by the game. The rings a hero of a deep level stands in (one,
# two, three hoops), the ring under a summon that says whose it is, and the glow and rising motes of a fighter of a higher combat
# grade that has no class aura (a summon). They took the place of ellipses and stars drawn in code.
RECIPES['plain'] = {
    'ring1': R('ground', FLAT, rings=1, thick=0.034, glow=0.5),
    'ring2': R('ground', FLAT, rings=2, thick=0.03, glow=0.5),
    'ring3': R('ground', FLAT, rings=3, dots=6, thick=0.028, glow=0.6),
    'mark': R('ground', FLAT, rings=1, thick=0.03, glow=1.1, r=0.5),
    'shell': R('shell', MID),
    'rise': R('bits', UP, n=7, h=1.2, size=0.085, spin=0.3),
}
KEYS = [f'{k}.{part}' for k, parts in RECIPES.items() for part in parts]


def spec_of(key):
    k, part = key.split('.', 1)
    r = RECIPES[k][part]
    from lib import DENSITY
    return dict(id=key, element=f'aura-{k}', w=CELL / DENSITY, h=CELL / DENSITY, oy=r['oy'], frames=FRAMES, ms=FRAMES * 130, loop=True, layer='under',
                seed=1 + sum(map(ord, key)) % 97, glow=False, scene=r['scene'], opt=r['opt'], colours=10)


def stamp(key):
    import hashlib
    h = hashlib.sha256(json.dumps(spec_of(key), sort_keys=True).encode())
    h.update(open(os.path.abspath(__file__), 'rb').read())
    h.update(open(os.path.join(HERE, '..', 'lib.py'), 'rb').read())
    return h.hexdigest()


def render(key):
    import bpy
    import lib
    for k, hexc in COLOURS.items():
        lib.PALETTES[f'aura-{k}'] = palette(hexc)
    spec = spec_of(key)
    c = lib.Ctx(spec)
    step = SCENES[spec['scene']](c, **spec['opt'])
    out = os.path.join(RAW, key)
    os.makedirs(out, exist_ok=True)
    for f in os.listdir(out):
        os.remove(os.path.join(out, f))
    for f in range(FRAMES):
        step(f / FRAMES)
        c.sc.render.filepath = os.path.join(out, f'{f:02d}.png')
        bpy.ops.render.render(write_still=True)
    open(os.path.join(out, 'stamp'), 'w').write(stamp(key))


def soften(path):
    """One rendered frame (twice the cell, straight alpha) as the game's frame: shrunk by a box filter with its colour weighted by its
    alpha (so a faint edge keeps its colour and does not darken), its alpha kept graded, not cut hard: an aura is soft light that
    fades out. Alpha is kept in 16 steps and colour in 32 a channel, which is what lets the picture pack small; a frame's outermost
    pixels are cleared, so a smoothed frame never takes colour from its neighbour in the atlas."""
    import numpy as np
    from PIL import Image
    a = np.asarray(Image.open(path).convert('RGBA')).astype(np.float32) / 255
    pm = a.copy()
    pm[..., :3] *= a[..., 3:4]
    h, w = pm.shape[0] // 2, pm.shape[1] // 2
    pm = pm.reshape(h, 2, w, 2, 4).mean(axis=(1, 3))
    al = pm[..., 3:4]
    rgb = np.where(al > 1e-4, pm[..., :3] / np.maximum(al, 1e-4), 0)
    al = np.round(np.clip(al, 0, 1) * 15) / 15
    rgb = np.round(np.clip(rgb, 0, 1) * 31) / 31
    out = np.concatenate([rgb * (al > 0), al], axis=2)
    out[0, :], out[-1, :], out[:, 0], out[:, -1] = 0, 0, 0, 0
    return (out * 255 + 0.5).astype(np.uint8)


def pack():
    import numpy as np
    from PIL import Image
    rows = -(-len(KEYS) * FRAMES // COLS)
    atlas = np.zeros((rows * CELL, COLS * CELL, 4), dtype=np.uint8)
    parts = {}
    for n, key in enumerate(KEYS):
        col, row = (n * FRAMES) % COLS, (n * FRAMES) // COLS
        for i in range(FRAMES):
            a = soften(os.path.join(RAW, key, f'{i:02d}.png'))
            assert a.shape[:2] == (CELL, CELL), (key, a.shape)
            atlas[row * CELL:(row + 1) * CELL, (col + i) * CELL:(col + i + 1) * CELL] = a
        parts[key] = [col, row, FRAMES]
    os.makedirs(ART, exist_ok=True)
    # (one palette of 256 colours, each with its own alpha, for the whole atlas: a third of the size of the same picture in full
    # colour, and its soft edges are kept)
    Image.fromarray(atlas, 'RGBA').quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(os.path.join(ART, 'atlas.png'), optimize=True)
    json.dump(dict(cell=CELL, parts=dict(sorted(parts.items()))), open(os.path.join(ART, 'atlas.json'), 'w'), separators=(',', ':'))
    print(f'{len(KEYS)} strips, atlas {atlas.shape[1]}x{atlas.shape[0]}, {os.path.getsize(os.path.join(ART, "atlas.png"))} bytes')


def sheet(path, zoom=2):
    from PIL import Image, ImageDraw
    at = json.load(open(os.path.join(ART, 'atlas.json')))
    im = Image.open(os.path.join(ART, 'atlas.png')).convert('RGBA')
    keys = list(at['parts'])
    cols = 3
    cw, chh = FRAMES * CELL * zoom + 8, CELL * zoom + 14
    out = Image.new('RGBA', (cols * cw, -(-len(keys) // cols) * chh), (38, 40, 52, 255))
    d = ImageDraw.Draw(out)
    for n, key in enumerate(keys):
        col, row, fr = at['parts'][key]
        strip = im.crop((col * CELL, row * CELL, (col + fr) * CELL, (row + 1) * CELL)).resize((fr * CELL * zoom, CELL * zoom), Image.NEAREST)
        x, y = (n % cols) * cw, (n // cols) * chh
        out.alpha_composite(strip, (x, y + 12))
        d.text((x + 2, y), key, fill=(255, 255, 160, 255))
    out.convert('RGB').save(path)
    print(path, out.size)


def main(argv):
    if '--render' in argv:
        for key in argv[argv.index('--render') + 1:]:
            render(key)
            print('rendered', key, flush=True)
        return
    if '--sheet' in argv:
        return sheet(argv[argv.index('--sheet') + 1], int(os.environ.get('ZOOM', 2)))
    if '--pack' in argv:
        return pack()
    only = argv[argv.index('--only') + 1].split(',') if '--only' in argv else None
    todo = []
    for key in KEYS:
        if only and key.split('.')[0] not in only and key not in only:
            continue
        try:
            fresh = open(os.path.join(RAW, key, 'stamp')).read() == stamp(key)
        except OSError:
            fresh = False
        if '--all' in argv or only or not fresh:
            todo.append(key)
    workers = min(4, max(1, len(todo)))
    print(f'rendering {len(todo)} of {len(KEYS)} strips on {workers} workers', flush=True)
    procs = [subprocess.Popen([sys.executable, os.path.abspath(__file__), '--render'] + todo[i::workers], stdout=subprocess.DEVNULL) for i in range(workers) if todo[i::workers]]
    for p in procs:
        if p.wait():
            raise SystemExit('a render failed')
    pack()


if __name__ == '__main__':
    main(sys.argv[1:])
