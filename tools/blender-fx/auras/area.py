"""AURAS-BLENDER, the area auras (docs/notes/auras-blender.md): the eleven auras that lie on the ground round a fighter, started over
and rendered in Blender.

    python3 tools/blender-fx/auras/area.py                 render what is missing, soften, pack the atlas
    python3 tools/blender-fx/auras/area.py --all           render everything again
    python3 tools/blender-fx/auras/area.py --pack          pack again from the frames already rendered
    python3 tools/blender-fx/auras/area.py --sheet out/area.png        a contact sheet of every strip (after a build)

An area aura (the Aura of Protection, the Healing Mist, the Circle of Death...) is a field of light lying on the ground of its
reach, under whoever stands in it: a pool of its colour, hoops round it and its own mark inside, turning and breathing; a few motes
of it adrift in the field; and for three of them a strike that lands in the reach now and then (the storm cloud's bolt, the spikes'
jab, the circle of death's flare). The storm cloud does not lie on the ground: it hangs over its caster.

The parts are the ones the painted atlas had, by the same keys (`<aura>.ground`, `.motes`, `.impact`), at the sizes and frame counts
the brief gives them (`tools/spell-fx/spell-parts.json`), so the game reads them through the same seam (`spellArt.ts`,
`spellLooks.ts`): this writes `src/art/fx/spells/b-auras.webp` and that session's entry in `index.json`. The Circle of Death, which
was in another session's atlas, is packed here with the rest. Frames keep their soft edges (`soften` in build.py). Nothing is a
modelled object: light, hoops, lines of light, sparks, flame and smoke only.
"""
import json, math, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(HERE, '..'))
sys.path.insert(0, HERE)
import build as cls

RAW = os.path.join(ROOT, 'out', 'blender-fx', 'area')
ART = os.path.join(ROOT, 'src', 'art', 'fx', 'spells')
SESSION = 'b-auras'
CELL, COLS = 96, 16
TAU = math.tau

# Each aura's colour (its ring's, as `auraLook` in src/render/toolkitLooks.ts has it).
COLOURS = {'aura-protection': 0xffd36a, 'spirit-guardians': 0xd8ecff, 'aura-rot': 0x8aa83a, 'storm-cloud': 0x5878b0, 'mana-font': 0x9a6aff,
           'healing-mist': 0x7be08a, 'cloud-of-daggers': 0xb4b4c8, 'slow-field': 0xffe08a, 'spike-growth': 0x5aa83a, 'bardic-notes': 0xffd36a,
           'circle-of-death': 0x8a3ab8}


def field(c, r=1.36, points=0, skip=1, rings=1, dots=0, thick=0.045, glow=1.0, spin=1, noise=3.0, spokes=0, waves=0, swirl=0, inner=0, drift=0, adrift='glow'):
    """The field on the ground: a soft pool of light out to its rim, hoops round it, a mark of straight lines inside (a star of
    `points` joined every `skip`), beads on the rim (`dots`), short thorns standing out from it (`spokes`), hoops running out from its
    heart one after another (`waves`), arcs of a whirl (`swirl`), and a second ring of beads turning the other way (`inner`). It turns
    one step of its own symmetry in a loop, and breathes. `drift` motes of it (`adrift`: soft points, notes, crescents, runes) go round
    in it just over the ground, each taking the next one's place in a loop: they are part of the field's own picture, so they lie
    under whoever stands in it (motes circling in the air passed in front of the fighters)."""
    from lib import bell, hide, put
    import bpy
    # (the pool is a soft wash and the hoops and the mark carry the field: a strong pool was a flat plate of colour over the tiles;
    # the lines are heavy, as the field is drawn three times its pixels' size)
    pool, pa = c.disc('ramp', 1.0, r * 1.05, noise=noise)
    m, v = c.flat('bright', 1.5)
    m2, v2 = c.flat('hot', 1.8)
    root = bpy.data.objects.new('mark', None)
    c.sc.collection.objects.link(root)
    back = bpy.data.objects.new('back', None)
    c.sc.collection.objects.link(back)
    kids = [c.torus(1.0 - i * 0.16, thick * (1 - i * 0.25), m) for i in range(rings)]
    rr = 0.97 - (rings - 1) * 0.16 if rings > 1 else 0.97
    for i in range(points):
        a0, a1 = i * TAU / points, (i + skip) * TAU / points
        p0, p1 = (math.cos(a0) * rr, math.sin(a0) * rr, 0), (math.cos(a1) * rr, math.sin(a1) * rr, 0)
        dx, dy = p1[0] - p0[0], p1[1] - p0[1]
        ln = math.hypot(dx, dy)
        kids.append(c.ribbon([(p0, (-dy / ln, dx / ln, 0)), (p1, (-dy / ln, dx / ln, 0))], thick * 0.7, m2))
    for i in range(dots):
        o = c.sphere(0.07, m2, 1)
        o.location = (math.cos(i * TAU / dots), math.sin(i * TAU / dots), 0)
        kids.append(o)
    for i in range(spokes):
        a = i * TAU / spokes
        d = (math.cos(a), math.sin(a), 0)
        kids.append(c.ribbon([((d[0] * 0.86, d[1] * 0.86, 0), (-d[1], d[0], 0)), ((d[0] * 0.95, d[1] * 0.95, 0), (-d[1], d[0], 0)), ((d[0] * 1.12, d[1] * 1.12, 0), (-d[1], d[0], 0))],
                             lambda u: 0.035 * (1 - u) + 0.004, m2))
    for i in range(swirl):
        pts = []
        for j in range(15):
            a = i * TAU / swirl + j * 0.11
            rad = 0.25 + 0.7 * j / 14
            pts.append(((math.cos(a) * rad, math.sin(a) * rad, 0), (math.cos(a), math.sin(a), 0)))
        kids.append(c.ribbon(pts, lambda u: 0.006 + 0.05 * math.sin(u * math.pi), m))
    for o in kids:
        o.parent = root
    for i in range(inner):
        o = c.sphere(0.06, m, 1)
        o.location = (math.cos(i * TAU / inner) * 0.62, math.sin(i * TAU / inner) * 0.62, 0)
        o.parent = back
    ripples = [c.ring('bright', thick * 0.8, 1.4) for _ in range(waves)]
    motes = [_mote(c, adrift) for _ in range(drift)]
    sym = points or spokes or swirl or dots or 1

    def step(t):
        c.tick(t, 1.0)
        k = r * (1 + 0.03 * math.sin(TAU * t))
        put(root, (0, 0, 0.03), (k, k, 1), (0, 0, spin * t * TAU / sym))
        put(back, (0, 0, 0.03), (k, k, 1), (0, 0, -t * TAU / max(1, inner)))
        pa.inputs[1].default_value = 0.75 * glow * (1.0 + 0.15 * math.sin(TAU * t))
        for i, (o, rv) in enumerate(ripples):
            g = (t + i / waves) % 1.0
            put(o, (0, 0, 0.03), (r * (0.15 + 0.85 * g), r * (0.15 + 0.85 * g), 1))
            rv.outputs[0].default_value = bell(g) ** 0.7
        for i, o in enumerate(motes):
            a = TAU * (i + t) / drift + 0.5
            rad = r * (0.58 + 0.12 * math.sin(TAU * t + i * 2.1))
            put(o, (math.cos(a) * rad, math.sin(a) * rad, 0.16 + 0.05 * math.sin(TAU * t + i)), _MOTE[adrift] * (0.85 + 0.15 * math.sin(TAU * t + i * 1.3)))
    return step


_MOTE = dict(glow=0.2, note=0.26, arc=0.22, rune=0.18)


def _mote(c, kind):
    """One mote for a field: a soft point of light, a note, a crescent or a rune, small, standing to face the camera."""
    import bpy
    if kind == 'glow':
        return cls._glows(c, 1, 2.0)[0]
    root = bpy.data.objects.new('mote', None)
    c.sc.collection.objects.link(root)
    root.rotation_euler = (0, 0, math.radians(45))
    m, a, _ = c.streak('bright', 'hot', 1.0, 1.9)
    if kind == 'note':
        head = cls._glows(c, 1, 2.2)[0]
        head.rotation_euler = (math.radians(90), 0, 0)
        head.scale = (0.36, 0.3, 0.3)
        head.location = (-0.12, 0, -0.5)
        parts = [head, c.ribbon([((0.1, 0, -0.5), (1, 0, 0)), ((0.1, 0, 0.6), (1, 0, 0))], 0.06, m),
                 c.ribbon([((0.1, 0, 0.6), (0, 0, 1)), ((0.3, 0, 0.45), (0, 0, 1)), ((0.42, 0, 0.2), (0, 0, 1))], lambda u: 0.1 * (1 - u) + 0.02, m)]
    elif kind == 'arc':
        pts = [((math.cos(math.radians(-75 + 150 * i / 12)), 0, math.sin(math.radians(-75 + 150 * i / 12))),) * 2 for i in range(13)]
        parts = [c.ribbon(pts, lambda u: 0.01 + 0.2 * math.sin(u * math.pi), m)]
    else:
        hoop = c.torus(1.0, 0.11, m)
        hoop.rotation_euler = (math.radians(90), 0, 0)
        parts = [hoop, c.ribbon([((-0.6, 0, -0.6), (0.7, 0, -0.7)), ((0.6, 0, 0.6), (0.7, 0, -0.7))], 0.1, m), c.ribbon([((-0.6, 0, 0.6), (0.7, 0, 0.7)), ((0.6, 0, -0.6), (0.7, 0, 0.7))], 0.1, m)]
    for o in parts:
        o.parent = root
    return root


def stormcloud(c, r=0.85, n=9):
    """The storm cloud that hangs over its caster: a bank of cloud turning over, lit from inside now and then."""
    from lib import put
    m, cut = c.flame(1.9, 0.5, 0.95)
    puffs = [(c.sphere(1, m, 3), (i / (n - 1) - 0.5) * 2 * r, c.rnd.uniform(-0.12, 0.12), c.rnd.uniform(0.3, 0.46), c.rnd.uniform(0, 1)) for i in range(n)]
    glow, ga = c.disc('hot', 0.8, r * 0.7)

    def step(t):
        c.tick(t, 1.0)
        cut.inputs[1].default_value = 0.12
        s2 = math.sqrt(0.5)
        for o, x, z, s, ph in puffs:
            w = math.sin(TAU * (t + ph))
            put(o, (x * s2, x * s2, z + 0.03 * w), (s * (1 + 0.05 * w), s * (1 + 0.05 * w), s * 0.8))
        put(glow, (0, 0, -0.1), None, (math.radians(60), 0, math.radians(45)))
        # (a flicker of lightning in its belly, twice a loop)
        ga.inputs[1].default_value = 2.5 * max(0, math.sin(TAU * 2 * t)) ** 6
    return step


def bolt(c, h=1.9, forks=2):
    """A strike: a jagged bolt of lightning from above to the ground, a flash where it lands (plays once)."""
    from lib import bell, put, win
    m, a, _ = c.streak('bright', 'hot', 1.2, 2.2)
    def path(seed, top, bottom, dx):
        import random
        rn = random.Random(seed)
        return [(dx * (1 - j / 7) + (rn.uniform(-0.13, 0.13) if 0 < j < 7 else 0), 0, top + (bottom - top) * j / 7) for j in range(8)]
    lines = [(c.cross_ribbon(path(3 + i, h / 2, -h / 2 if i == 0 else -h * 0.1, 0 if i == 0 else (0.3 if i % 2 else -0.3)), 0.035, m), 3 + i, i) for i in range(1 + forks)]
    flash = cls._glows(c, 1, 2.4)[0]

    def step(t):
        k = bell(win(t, 0, 0.75)) ** 0.6
        for obs, seed, i in lines:
            pts = path(seed + int(t * 5), h / 2, -h / 2 if i == 0 else -h * 0.1, 0 if i == 0 else (0.3 if i % 2 else -0.3))
            for o, side in zip(obs, ((1, 0, 0), (0, 1, 0))):
                c.move_ribbon(o, pts, 0.075 * k * (1 if i == 0 else 0.6), side)
        put(flash, (0, 0, -h / 2), 0.6 * bell(win(t, 0.05, 0.9)))
    return step


def jab(c, n=6, h=1.6):
    """A strike: thorns of light thrust up out of the ground and drawn back (plays once)."""
    from lib import bell, win
    m, a, _ = c.streak('mid', 'hot', 1.1, 1.9)
    thorns = [(c.cross_ribbon([(0, 0, 0)] * 4, 0.05, m), i * TAU / n, c.rnd.uniform(0.7, 1.0), c.rnd.uniform(0, 0.2)) for i in range(n)]
    ring, rv = c.ring('bright', 0.03, 1.4)

    def step(t):
        from lib import put
        for obs, ang, s, lag in thorns:
            g = bell(win(t, lag, lag + 0.75))
            lean = 0.5
            base = (math.cos(ang) * 0.3, math.sin(ang) * 0.3, -h * 0.45)
            pts = [(base[0] + math.cos(ang) * lean * j / 3 * g, base[1] + math.sin(ang) * lean * j / 3 * g, base[2] + h * s * g * j / 3) for j in range(4)]
            for o, side in zip(obs, ((1, 0, 0), (0, 1, 0))):
                c.move_ribbon(o, pts, lambda u, g=g: 0.13 * g * (1 - u) + 0.004, side)
        put(ring, (0, 0, -h * 0.45), (0.35 + 0.6 * t, 0.35 + 0.6 * t, 1))
        rv.outputs[0].default_value = 1 - win(t, 0.4, 1)
    return step


def flareup(c, r=0.98):
    """A strike: a flare of the aura's colour bursting on the ground, a hoop racing out of it (plays once)."""
    from lib import bell, put, win
    core = cls._glows(c, 1, 2.2)[0]
    ring, rv = c.ring('hot', 0.04, 1.6)
    ring2, rv2 = c.ring('bright', 0.025, 1.3)
    sparks = cls._glows(c, 6, 1.8)

    def step(t):
        put(core, (0, 0, 0.1), 0.55 * bell(win(t, 0, 0.8)) ** 0.7)
        put(ring, (0, 0, 0.02), (r * (0.1 + 0.9 * t), r * (0.1 + 0.9 * t), 1))
        rv.outputs[0].default_value = 1 - win(t, 0.45, 1)
        put(ring2, (0, 0, 0.02), (r * 0.6 * (0.1 + 0.9 * t), r * 0.6 * (0.1 + 0.9 * t), 1))
        rv2.outputs[0].default_value = 1 - win(t, 0.3, 0.9)
        for i, o in enumerate(sparks):
            a = i * TAU / 6 + 0.4
            put(o, (math.cos(a) * r * 0.8 * t, math.sin(a) * r * 0.8 * t, 0.1 + 0.5 * bell(t)), 0.09 * (1 - t))
    return step


def note(c, r=0.85):
    """A mote: a note of music, a round head of light and its stem and flag, rocking."""
    from lib import put
    import bpy
    m, a, _ = c.streak('bright', 'hot', 1.0, 1.9)
    root = bpy.data.objects.new('note', None)
    c.sc.collection.objects.link(root)
    head = cls._glows(c, 1, 2.2)[0]
    head.rotation_euler = (math.radians(90), 0, 0)
    head.scale = (0.36, 0.3, 0.3)
    head.location = (-0.12, 0, -0.5)
    stem = c.ribbon([((0.1, 0, -0.5), (1, 0, 0)), ((0.1, 0, 0.6), (1, 0, 0))], 0.05, m)
    flag = c.ribbon([((0.1, 0, 0.6), (0, 0, 1)), ((0.3, 0, 0.45), (0, 0, 1)), ((0.42, 0, 0.2), (0, 0, 1))], lambda u: 0.09 * (1 - u) + 0.02, m)
    for o in (head, stem, flag):
        o.parent = root

    def step(t):
        put(root, (0, 0, 0.06 * math.sin(TAU * t)), r, (0, 0.2 * math.sin(TAU * t), math.radians(45)))
    return step


def point(c, r=0.42):
    """A mote: one soft point of light, swelling and settling."""
    from lib import put
    o = cls._glows(c, 1, 2.0)[0]

    def step(t):
        put(o, (0, 0, 0), r * (0.75 + 0.25 * math.sin(TAU * t)))
    return step


SCENES = dict(field=field, stormcloud=stormcloud, bolt=bolt, jab=jab, flareup=flareup, note=note, point=point, glint=cls.glint, puff=cls.puff, rune=cls.rune,
              leaf=cls.leaf, arc=cls.arc)

# ---- the recipes: each aura's parts, as the brief sizes them (tiles across) ----
G, M, I = 8, 6, 8            # frames: a ground loop, a mote's loop, a strike


def R(scene, frames, size, loop=True, **opt):
    return dict(scene=scene, frames=frames, size=size, loop=loop, opt=opt)


RECIPES = {
    # (the Aura of Protection, and every ward that takes its look: a golden seal of eight points, two hoops, beads on its rim)
    'aura-protection': dict(ground=R('field', G, 5.0, points=8, skip=3, rings=2, dots=8, drift=4), motes=R('glint', M, 0.4, arms=4, r=0.8)),
    # (Spirit Guardians' ground: a pale hallowed ring, four marks, hoops running out)
    'spirit-guardians': dict(ground=R('field', G, 5.0, points=4, skip=1, rings=2, dots=4, waves=2), motes=R('glint', M, 0.6, arms=8, r=0.8, turn=1)),
    # (rot: a sour pool with no clean lines, its light moving in blotches, bubbles of it adrift)
    'aura-rot': dict(ground=R('field', G, 5.0, rings=1, noise=7.0, glow=1.5, thick=0.03, inner=7, drift=5), motes=R('puff', M, 0.5, r=0.6)),
    # (the storm cloud hangs over its caster; its bolt falls from it)
    'storm-cloud': dict(ground=R('stormcloud', G, 2.5), impact=R('bolt', I, 1.2, loop=False)),
    # (the font of magic: an arcane seal of six points, a second ring of beads turning the other way, runes adrift)
    'mana-font': dict(ground=R('field', G, 7.0, points=6, skip=2, rings=2, dots=6, inner=12, drift=4, adrift='rune'), motes=R('rune', M, 0.5, r=0.7)),
    # (the healing mist: a soft green pool with hoops breathing out of it, soft points of its light adrift)
    'healing-mist': dict(ground=R('field', G, 5.0, rings=1, noise=4.5, glow=1.4, thick=0.03, waves=3, drift=5), motes=R('point', M, 0.4, r=0.5)),
    # (the cloud of daggers: a steel whirl turning, crescents of blades adrift)
    'cloud-of-daggers': dict(ground=R('field', G, 3.0, rings=1, swirl=5, glow=0.7, thick=0.036, drift=3, adrift='arc'), motes=R('arc', M, 0.4, r=0.8)),
    # (the slow field: a dial, twelve beads on its rim and twelve turning the other way inside, as a clock's two hands would)
    'slow-field': dict(ground=R('field', G, 8.0, rings=2, dots=12, inner=12, glow=0.8, drift=3), motes=R('glint', M, 0.4, arms=4, r=0.8, turn=1)),
    # (spike growth: a ring of thorns standing out of it; a jab of thorns out of the ground)
    'spike-growth': dict(ground=R('field', G, 3.0, rings=1, spokes=12, points=6, skip=1, glow=0.8), impact=R('jab', I, 1.0, loop=False)),
    # (the bard's song: the lines of a stave ringing outward, notes adrift)
    'bardic-notes': dict(ground=R('field', G, 7.0, rings=1, waves=4, glow=0.7, thick=0.032, drift=4, adrift='note'), motes=R('note', M, 0.4)),
    # (the circle of death: a dark seal of five points, turned the other way; a flare bursting in it)
    'circle-of-death': dict(ground=R('field', G, 5.0, points=5, skip=2, rings=2, dots=5, spin=-1, glow=1.2), impact=R('flareup', I, 1.0, loop=False)),
}
KEYS = [f'{k}.{part}' for k, parts in RECIPES.items() for part in parts]


def recipe(key):
    k, part = key.rsplit('.', 1)
    return RECIPES[k][part]


def spec_of(key):
    from lib import DENSITY
    r = recipe(key)
    return dict(id=key, element=f'area-{key.rsplit(".", 1)[0]}', w=CELL / DENSITY, h=CELL / DENSITY, oy=0.5, frames=r['frames'], ms=r['frames'] * 90, loop=r['loop'],
                layer='under', seed=1 + sum(map(ord, key)) % 97, glow=False, scene=r['scene'], opt=r['opt'])


def stamp(key):
    import hashlib
    h = hashlib.sha256(json.dumps(spec_of(key), sort_keys=True).encode())
    for f in (os.path.abspath(__file__), os.path.join(HERE, 'build.py'), os.path.join(HERE, '..', 'lib.py')):
        h.update(open(f, 'rb').read())
    return h.hexdigest()


def render(key):
    import bpy
    import lib
    for k, hexc in COLOURS.items():
        lib.PALETTES[f'area-{k}'] = cls.palette(hexc)
    spec = spec_of(key)
    c = lib.Ctx(spec)
    step = SCENES[spec['scene']](c, **spec['opt'])
    out = os.path.join(RAW, key)
    os.makedirs(out, exist_ok=True)
    for f in os.listdir(out):
        os.remove(os.path.join(out, f))
    n = spec['frames']
    for f in range(n):
        step(f / n if spec['loop'] else f / (n - 1))
        c.sc.render.filepath = os.path.join(out, f'{f:02d}.png')
        bpy.ops.render.render(write_still=True)
    open(os.path.join(out, 'stamp'), 'w').write(stamp(key))


def pack():
    import numpy as np
    from PIL import Image
    rows = len(RECIPES)
    atlas = np.zeros((rows * CELL, COLS * CELL, 4), dtype=np.uint8)
    parts = {}
    for row, (k, ps) in enumerate(RECIPES.items()):
        col = 0
        for part, r in ps.items():
            key = f'{k}.{part}'
            for i in range(r['frames']):
                a = cls.soften(os.path.join(RAW, key, f'{i:02d}.png'))
                assert a.shape[:2] == (CELL, CELL), (key, a.shape)
                atlas[row * CELL:(row + 1) * CELL, (col + i) * CELL:(col + i + 1) * CELL] = a
            # (column, row, frames, tiles across, loops, where its foot is in the cell: the session's own form, `spellLooks.ts`)
            parts[key] = [col, row, r['frames'], r['size'], 1 if r['loop'] else 0, 0.5]
            col += r['frames']
            assert col <= COLS, key
    path = os.path.join(ART, f'{SESSION}.webp')
    # (one palette of 256 colours with alpha, kept exactly: a soft-edged picture a third the size of its full colour)
    Image.fromarray(atlas, 'RGBA').quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).convert('RGBA').save(path, lossless=True, method=6, exact=True)
    idx_path = os.path.join(ART, 'index.json')
    idx = json.load(open(idx_path))
    for s in idx.values():
        for key in parts:
            if s is not idx.get(SESSION):
                s['parts'].pop(key, None)
    idx[SESSION] = dict(cell=CELL, w=atlas.shape[1], h=atlas.shape[0], bytes=os.path.getsize(path), parts=parts)
    json.dump(idx, open(idx_path, 'w'))
    print(f'{len(parts)} strips, atlas {atlas.shape[1]}x{atlas.shape[0]}, {os.path.getsize(path)} bytes')


def sheet(path, zoom=1):
    from PIL import Image, ImageDraw
    idx = json.load(open(os.path.join(ART, 'index.json')))[SESSION]
    im = Image.open(os.path.join(ART, f'{SESSION}.webp')).convert('RGBA')
    keys = list(idx['parts'])
    cw, chh = 8 * CELL * zoom + 8, CELL * zoom + 14
    cols = 2
    out = Image.new('RGBA', (cols * cw, -(-len(keys) // cols) * chh), (96, 80, 56, 255))
    d = ImageDraw.Draw(out)
    for n, key in enumerate(keys):
        col, row, fr = idx['parts'][key][:3]
        strip = im.crop((col * CELL, row * CELL, (col + fr) * CELL, (row + 1) * CELL)).resize((fr * CELL * zoom, CELL * zoom), Image.NEAREST)
        x, y = (n % cols) * cw, (n // cols) * chh
        out.alpha_composite(strip, (x, y + 12))
        d.text((x + 2, y), key, fill=(255, 255, 200, 255))
    out.convert('RGB').save(path)
    print(path, out.size)


def main(argv):
    if '--render' in argv:
        for key in argv[argv.index('--render') + 1:]:
            render(key)
            print('rendered', key, flush=True)
        return
    if '--sheet' in argv:
        return sheet(argv[argv.index('--sheet') + 1], int(os.environ.get('ZOOM', 1)))
    if '--pack' in argv:
        return pack()
    todo = []
    for key in KEYS:
        try:
            fresh = open(os.path.join(RAW, key, 'stamp')).read() == stamp(key)
        except OSError:
            fresh = False
        if '--all' in argv or not fresh:
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
