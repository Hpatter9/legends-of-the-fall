"""The catalogue: every effect the game plays, as a recipe (which scene, which element, how big, how long).

`w` and `h` are the canvas in tile widths (a tile is 45 of an effect's pixels across), `oy` how far down the canvas
the tile's middle sits, `ms` how long one pass lasts. `layer` says where the game draws it: 'over' the fighters
(thinned where it would hide one) or on the 'ground' under them. `glow` keeps a soft light under the pixels.
"""
from lib import PALETTES

EFFECTS = {}


def fx(id, scene, element, cw, ch, oy, frames=16, ms=1000, loop=False, glow=None, layer='over', seed=1, hold=None, stages=None, **opt):
    spec = dict(id=id, element=element, w=cw, h=ch, oy=oy, frames=frames, ms=ms, loop=loop, layer=layer, seed=seed,
                glow=PALETTES[element]['glow'] if glow is None else glow)
    if stages:
        spec['stages'] = stages
    else:
        spec['scene'] = scene
        spec['opt'] = opt
    if hold is not None:
        spec['hold'] = hold
    EFFECTS[id] = spec
    return spec


def stage(scene, a, b, **opt):
    """One stage of a staged effect: `scene` playing from `a` to `b` of the effect's time."""
    return dict(scene=scene, opt=opt, at=[a, b])


# ---- the library's own preview: one of each scene, so a change to a scene can be looked at on its own ----
LIB = [
    ('burst', 'fire', 3.4, 3.6, 0.72), ('pillar', 'holy', 2.6, 4.2, 0.82), ('spikes', 'ice', 3.0, 3.0, 0.7), ('arc', 'wind', 3.0, 2.6, 0.62),
    ('bolt', 'lightning', 3.4, 4.6, 0.84), ('vortex', 'shadow', 3.0, 3.6, 0.78), ('beam', 'holy', 2.0, 1.8, 0.62), ('nova', 'ice', 3.6, 2.6, 0.6),
    ('rain', 'water', 3.6, 4.0, 0.78), ('crack', 'earth', 4.4, 3.0, 0.58), ('dome', 'holy', 3.4, 2.6, 0.68), ('projectile', 'fire', 2.2, 1.6, 0.5),
    ('trail', 'wind', 2.6, 1.6, 0.6), ('ring', 'arcane', 3.4, 2.0, 0.55), ('swarm', 'forest', 3.0, 3.0, 0.72), ('chains', 'shadow', 2.8, 2.6, 0.7),
    ('meteor', 'fire', 2.6, 3.2, 0.8), ('cloud', 'poison', 3.6, 2.6, 0.62), ('geyser', 'water', 3.0, 3.6, 0.8), ('sigil', 'arcane', 3.2, 2.4, 0.6),
    ('wall', 'fire', 1.8, 2.2, 0.78), ('crystal', 'ice', 2.2, 2.6, 0.76), ('shatter', 'ice', 3.6, 3.0, 0.66), ('gust', 'wind', 3.6, 2.6, 0.62),
    ('vines', 'forest', 3.0, 2.6, 0.7), ('motes', 'holy', 3.2, 3.2, 0.74), ('shout', 'blood', 3.6, 3.2, 0.7), ('spiral', 'wind', 2.0, 2.8, 0.8),
    ('implode', 'shadow', 3.6, 2.6, 0.62), ('bite', 'poison', 2.2, 2.6, 0.7), ('eye', 'arcane', 2.6, 2.8, 0.74), ('ribs', 'bone', 1.8, 2.0, 0.76),
    ('flames', 'fire', 1.4, 1.6, 0.76), ('ground', 'ice', 1.3, 1.0, 0.58), ('sparks', 'fire', 1.8, 1.8, 0.62), ('cross', 'blood', 2.2, 2.4, 0.66),
    ('smoke', 'earth', 2.0, 2.4, 0.76), ('portal', 'arcane', 2.2, 2.8, 0.72), ('claws', 'earth', 2.4, 2.6, 0.66), ('veil', 'wind', 2.0, 2.6, 0.8),
    ('halo', 'holy', 2.6, 3.8, 0.82), ('shockwave', 'lightning', 3.8, 2.4, 0.58), ('souls', 'shadow', 3.0, 3.4, 0.78), ('hearts', 'arcane', 2.2, 2.8, 0.78),
    ('shaft', 'holy', 3.0, 4.0, 0.84), ('slab', 'earth', 2.2, 2.2, 0.72), ('flare', 'fire', 2.0, 2.8, 0.8),
]
LOOPS = ('projectile', 'meteor', 'cloud', 'wall', 'flames', 'ground')
for name, el, w, h, oy in LIB:
    fx(f'lib-{name}', name, el, w, h, oy, loop=name in LOOPS, frames=12 if name in LOOPS else 16)
fx('lib-strike', 'strike', 'holy', 3.0, 4.4, 0.84)
fx('lib-comet', 'comet', 'holy', 2.4, 2.8, 0.8, loop=True, frames=12)
fx('lib-palisade', 'palisade', 'ice', 1.8, 2.2, 0.78, loop=True, frames=12)
fx('lib-siphon', 'siphon', 'blood', 2.2, 3.0, 0.8)
fx('lib-tile', 'tile', 'fire', 1.6, 1.8, 0.7, loop=True, frames=12)


def box(reach, tall, pad=0.35):
    """A canvas for a scene reaching `reach` on the ground and `tall` high (in tiles' sides): its width and height in
    tile widths, and how far down it the tile's middle sits."""
    w = 1.414 * reach + pad
    up = max(0.354 * reach, 0.612 * tall) + pad / 2
    down = 0.354 * reach + pad / 2
    return dict(cw=round(w, 2), ch=round(up + down, 2), oy=round(up / (up + down), 3))


def spell(id, part, scene, element, reach, tall, pad=0.35, **kw):
    """A king's spell's part: `cast` where it lands, `hit` on each fighter it touches, `fly` and `land` for what
    falls from the sky, `stand` for what stays."""
    return fx(f'spell-{id}-{part}', scene, element, **box(reach, tall, pad), **kw)


# ---- the king's spells (docs/notes/blender-fx.md has the table): each its own scene, element and size ----
ONCE = dict(frames=14, ms=980)
HIT = dict(frames=12, ms=780)
LOOP = dict(frames=10, ms=900, loop=True)

spell('heal', 'cast', 'motes', 'forest', 1.9, 2.3, glow=True, r=1.45, h=2.0, **ONCE)
spell('heal', 'hit', 'pillar', 'forest', 0.9, 2.0, glow=True, r=0.42, h=1.7, sparks=10, **HIT)
spell('meteor', 'fly', 'meteor', 'fire', 2.4, 3.2, **LOOP)
spell('meteor', 'land', 'burst', 'fire', 3.4, 3.6, r=1.55, h=1.5, embers=26, frames=16, ms=1040)
spell('haste', 'cast', 'ring', 'wind', 1.7, 0.4, r=1.5, n=3, thick=0.06, layer='ground', **HIT)
spell('haste', 'hit', 'spiral', 'wind', 1.2, 2.4, r=0.55, h=1.9, **HIT)
spell('shield', 'cast', 'dome', 'holy', 1.75, 1.8, r=1.5, **ONCE)
spell('shield', 'hit', 'dome', 'holy', 0.8, 0.9, r=0.62, bands=3, seed=4, **HIT)
spell('smite', 'cast', 'ring', 'holy', 1.2, 0.3, r=1.0, n=2, layer='ground', **HIT)
spell('smite', 'hit', 'strike', 'holy', 2.0, 6.6, h=3.4, r=1.0, **ONCE)
spell('chain', 'cast', 'sparks', 'lightning', 1.6, 1.6, r=0.9, n=10, **HIT)
spell('chain', 'hit', 'bolt', 'lightning', 1.9, 3.4, h=2.8, r=0.9, forks=3, sparks=12, **HIT)
spell('poison', 'cast', 'smoke', 'poison', 2.2, 2.2, r=1.2, h=1.4, puffs=7, **HIT)
spell('poison', 'stand', 'cloud', 'poison', 1.0, 1.4, pad=0.6, r=0.6, h=0.5, puffs=5, bubbles=5, **LOOP)
spell('frost', 'cast', 'nova', 'ice', 2.0, 1.4, r=1.5, **ONCE)
spell('frost', 'hit', 'spikes', 'ice', 0.8, 1.2, r=0.4, h=1.0, n=4, **HIT)
spell('rally', 'cast', 'ring', 'fire', 2.3, 0.5, r=2.0, n=3, thick=0.08, layer='ground', **HIT)
spell('rally', 'hit', 'flare', 'fire', 1.0, 2.2, r=0.36, h=1.25, tongues=4, **ONCE)
spell('quake', 'cast', 'crack', 'earth', 3.0, 1.2, r=2.6, arms=7, rubble=18, frames=16, ms=1200, layer='ground')
spell('quake', 'hit', 'spikes', 'earth', 0.9, 1.1, r=0.45, h=0.9, n=5, verts=4, frost=False, seed=3, **HIT)
spell('resurrect', 'cast', 'sigil', 'holy', 1.6, 1.4, r=1.4, points=8, skip=3, layer='ground', **ONCE)
spell('resurrect', 'hit', 'halo', 'holy', 1.5, 3.2, r=0.6, h=2.6, frames=16, ms=1200)
spell('cleanse', 'cast', 'rain', 'water', 1.9, 3.6, r=1.4, h=3.2, n=18, **ONCE)
spell('cleanse', 'hit', 'flare', 'water', 1.2, 2.6, r=0.45, h=1.5, tongues=5, seed=13, **HIT)
spell('blink', 'cast', 'portal', 'arcane', 1.5, 2.6, r=0.78, **ONCE)
spell('hex', 'cast', 'implode', 'shadow', 2.2, 2.0, r=1.6, **ONCE)
spell('hex', 'hit', 'chains', 'shadow', 0.9, 1.4, r=0.6, n=3, links=7, h=1.0, **HIT)
spell('lance', 'cast', 'beam', 'holy', 1.0, 1.4, pad=0.5, length=1.0, r=0.18, rings=1, **HIT)
spell('lance', 'hit', 'sparks', 'holy', 1.1, 1.4, r=0.7, **HIT)
spell('renewal', 'cast', None, 'forest', 1.7, 2.2, glow=True, stages=[stage('sigil', 0, 1, r=1.4, points=5, skip=2), stage('swarm', 0.08, 1, r=1.3, h=1.9, n=26)], **ONCE)
spell('renewal', 'hit', 'motes', 'forest', 0.8, 1.6, glow=True, r=0.5, h=1.3, n=10, crosses=3, seed=6, **HIT)
spell('deepfreeze', 'cast', 'ring', 'ice', 1.6, 0.4, r=1.4, n=2, layer='ground', **HIT)
spell('deepfreeze', 'hit', 'crystal', 'ice', 1.5, 2.2, r=0.52, h=1.75, frames=16, ms=1280)
spell('warcry', 'cast', 'shout', 'blood', 2.1, 3.0, r=1.7, h=1.5, **ONCE)
spell('warcry', 'hit', 'ring', 'blood', 0.9, 2.2, r=0.55, n=3, lift=1.5, thick=0.06, **HIT)
spell('bulwark', 'hit', 'slab', 'earth', 1.4, 1.4, r=0.5, h=0.7, **ONCE)
spell('wolves', 'cast', 'claws', 'forest', 1.6, 2.4, r=1.1, z=0.9, **HIT)
spell('wolves', 'hit', 'smoke', 'earth', 1.2, 1.9, r=0.6, h=1.0, seed=2, **HIT)
spell('starfall', 'fly', 'comet', 'holy', 2.0, 2.9, **LOOP)
spell('starfall', 'land', 'burst', 'holy', 2.6, 2.6, r=1.1, h=0.9, balls=4, embers=18, seed=5, **ONCE)
spell('firewall', 'stand', 'wall', 'fire', 1.0, 2.1, pad=0.5, **LOOP)
spell('icewall', 'stand', 'palisade', 'ice', 1.0, 2.2, pad=0.5, **LOOP)
spell('shatter', 'cast', 'shatter', 'ice', 2.1, 2.6, r=1.5, **ONCE)
spell('shatter', 'hit', 'cross', 'ice', 1.2, 1.9, r=0.7, **HIT)
spell('gale', 'cast', 'gust', 'wind', 2.6, 2.6, pad=0.8, r=1.5, turn=1.5708, **ONCE)
spell('thunderclap', 'hit', 'shockwave', 'lightning', 1.5, 0.8, r=1.1, forks=6, **HIT)
spell('snare', 'cast', 'vines', 'forest', 1.7, 2.2, r=1.3, h=1.5, n=7, **ONCE)
spell('snare', 'hit', 'vines', 'forest', 0.7, 1.4, r=0.5, h=0.9, n=4, seed=9, **HIT)
spell('charm', 'cast', 'ring', 'arcane', 1.4, 0.4, r=1.2, n=2, layer='ground', **HIT)
spell('charm', 'hit', 'hearts', 'arcane', 1.2, 3.0, r=0.7, h=1.8, **ONCE)
spell('foresight', 'cast', 'eye', 'water', 1.9, 3.2, glow=True, r=1.0, z=1.7, **ONCE)
spell('sunbeam', 'cast', 'shaft', 'holy', 2.4, 3.6, pad=0.8, r=0.34, h=2.2, slant=0.4, **HIT)
spell('sunbeam', 'hit', 'sparks', 'fire', 1.1, 1.4, r=0.7, seed=8, **HIT)
spell('venom', 'hit', 'bite', 'poison', 1.4, 2.8, r=0.8, z=0.95, **ONCE)
spell('mirage', 'hit', 'veil', 'wind', 1.2, 2.4, r=0.62, h=1.7, **ONCE)
spell('drain', 'hit', 'siphon', 'blood', 1.3, 3.2, r=0.6, h=1.9, **ONCE)
spell('bonewall', 'stand', 'ribs', 'bone', 1.0, 1.9, pad=0.5, **LOOP)
spell('raisedead', 'cast', 'souls', 'shadow', 1.9, 3.4, r=1.2, h=2.2, **ONCE)
spell('raisedead', 'hit', 'pillar', 'shadow', 0.9, 2.2, r=0.42, h=1.8, sparks=8, seed=12, **HIT)

# What the game ships: everything but the library's own previews.
SHIPPED = [k for k in EFFECTS if not k.startswith('lib-')]
