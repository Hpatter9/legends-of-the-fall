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

# ---- the ground loops (docs/notes/fx-alive.md): one tile of ground taken by an element, laid on every tile of a
# marked patch (an area's warning, a spell's tiles, an aura), each tile a few frames on from its neighbours. Keyed by
# the game's own element names. ----
GROUND = dict(fire=('fire', 'flames'), ice=('ice', 'crystals'), lightning=('lightning', 'sparks'), light=('holy', 'motes'), dark=('shadow', 'wisps'),
              forest=('forest', 'sprouts'), poison=('poison', 'bubbles'), earth=('earth', 'stones'), wind=('wind', 'swirls'), blood=('blood', 'drops'))
for i, (el, (pal, things)) in enumerate(GROUND.items()):
    fx(f'ground-{el}', 'tile', pal, 1.3, 1.5, 0.74, frames=10, ms=950, loop=True, seed=20 + i, things=things, n=5, lift=1.0, fill=0.3)
# Burning ground (the fire a skill leaves on a 3x3): the same tile with tall flames.
fx('zone-fire', 'tile', 'fire', 1.3, 2.0, 0.8, frames=10, ms=800, loop=True, seed=31, things='flames', n=6, lift=1.4, fill=0.7)

# ---- the ultimates (docs/notes/blender-fx.md, src/ultStageRules.ts): each hero's ultimate plays in three stages. Its
# strike is its own: two scenes staged one into the other, in its element (no two heroes share the pair and the
# element). Its wind-up (on the caster) is by its weight and element, its aftermath (where it struck) by its element. ----

# A scene at an ultimate's size: its options, how far it reaches on the ground and how tall it stands.
BIG = dict(
    arc=(dict(r=1.5, z=1.0, sparks=18), 2.5, 2.8), shockwave=(dict(r=1.9, forks=8), 2.1, 0.6), rain=(dict(r=1.6, h=3.4, n=22), 2.4, 4.0),
    burst=(dict(r=1.5, h=1.4, embers=26), 3.2, 3.4), halo=(dict(r=0.8, h=2.8, rays=9), 1.9, 3.3), dome=(dict(r=1.6), 1.8, 1.9),
    vines=(dict(r=1.5, h=1.7, n=8), 1.8, 2.3), sigil=(dict(r=1.7, points=7, skip=3, motes=14), 1.9, 1.5), spiral=(dict(r=0.9, h=2.4, bands=3), 1.6, 2.8),
    cross=(dict(r=1.2, z=1.0), 1.7, 2.6), smoke=(dict(r=1.1, h=1.5, puffs=7), 2.0, 2.4), claws=(dict(r=1.3, z=1.1), 1.8, 2.8),
    sparks=(dict(r=1.2, n=12, z=0.7), 1.9, 2.2), bolt=(dict(h=3.6, r=1.6, forks=3), 2.3, 4.1), trail=(dict(length=3.2, w=0.34), 3.0, 1.0),
    gust=(dict(r=1.7, n=5, turn=1.5708), 3.2, 3.0), crack=(dict(r=2.2, arms=7, rubble=18), 2.6, 1.4), chains=(dict(r=1.4, n=5, links=10, h=1.8), 1.7, 2.3),
    ring=(dict(r=1.8, n=4, thick=0.07), 2.0, 0.5), flare=(dict(r=0.9, h=2.2, tongues=8), 2.0, 3.6), nova=(dict(r=1.7, n=22, h=1.1), 2.2, 1.6),
    strike=(dict(h=3.4, r=1.3, w=0.36), 2.2, 6.6), vortex=(dict(r=1.5, h=3.0, coils=5), 1.9, 3.4), eye=(dict(r=1.2, z=1.8), 2.0, 3.4),
    crystal=(dict(r=0.7, h=2.1, shards=8), 1.8, 2.6), spikes=(dict(r=1.5, h=2.2, n=9), 2.0, 2.6), geyser=(dict(r=0.6, h=2.8, drops=30), 2.2, 3.4),
    siphon=(dict(r=0.9, h=2.2, n=7), 1.7, 3.4), cloud=(dict(r=1.6, h=0.9, puffs=10), 2.0, 1.8), souls=(dict(r=1.4, h=2.4, n=8), 2.0, 3.4),
    veil=(dict(r=1.0, h=2.0, panes=9), 1.6, 2.6), portal=(dict(r=1.0, z=1.2), 1.8, 3.2), pillar=(dict(r=0.9, h=3.2, sparks=30), 1.8, 3.6),
    shout=(dict(r=1.8, h=1.6, n=5), 2.2, 3.2), swarm=(dict(r=1.5, h=2.0, n=30), 1.9, 2.6), motes=(dict(r=1.6, h=2.2, n=34, crosses=7), 2.0, 2.6),
    implode=(dict(r=1.9, n=16, z=0.8), 2.5, 2.3), slab=(dict(r=0.9, n=6, h=1.3), 1.7, 1.9), shaft=(dict(r=0.6, h=3.2, slant=0.4), 2.6, 3.8),
)

# Each ultimate: its palette, its strike's two scenes, and its showcase's style (which sets its weight, as `ultStageRules.ts` does).
ULTS = dict(
    vael=('shadow', 'arc', 'shockwave', 'burst'), astrax=('holy', 'rain', 'burst', 'sky'), ilyra=('holy', 'halo', 'dome', 'bless'),
    orrun=('forest', 'vines', 'dome', 'bless'), nyxara=('lightning', 'sigil', 'spiral', 'bless'), kunoichi=('shadow', 'cross', 'smoke', 'blinks'),
    wizard=('fire', 'burst', 'crack', 'sky'), beastmaster=('forest', 'claws', 'smoke', 'pack'), mercenary=('blood', 'cross', 'sparks', 'blinks'),
    arcBlade=('lightning', 'bolt', 'cross', 'blinks'), samurai=('holy', 'arc', 'sparks', 'line'), lancer=('wind', 'trail', 'gust', 'line'),
    minotaur=('earth', 'crack', 'smoke', 'line'), barbarian=('blood', 'crack', 'burst', 'leap'), ninjaMonk=('wind', 'sparks', 'gust', 'blows'),
    buccaneer=('shadow', 'chains', 'cross', 'hooks'), archer=('wind', 'rain', 'ring', 'sky'), dreadPirate=('shadow', 'rain', 'burst', 'sky'),
    siegeBot=('fire', 'burst', 'shockwave', 'sky'), lightningMage=('lightning', 'bolt', 'shockwave', 'shots'), gunslinger=('fire', 'sparks', 'cross', 'shots'),
    rifleBot=('lightning', 'sparks', 'ring', 'shots'), dragoon=('fire', 'flare', 'burst', 'shots'), ranger=('forest', 'vines', 'ring', 'burst'),
    knight=('holy', 'shout', 'dome', 'burst'), paladin=('holy', 'nova', 'strike', 'burst'), yamabushi=('wind', 'vortex', 'gust', 'burst'),
    gorgon=('poison', 'eye', 'crystal', 'burst'), juggernaut=('earth', 'crack', 'spikes', 'burst'), kraken=('water', 'vortex', 'geyser', 'burst'),
    mummy=('earth', 'vortex', 'chains', 'burst'), warlock=('shadow', 'sigil', 'siphon', 'burst'), tyrant=('blood', 'shout', 'spikes', 'burst'),
    shambler=('poison', 'crack', 'cloud', 'burrow'), reaper=('shadow', 'arc', 'souls', 'burst'), druid=('forest', 'vines', 'spikes', 'pack'),
    illusionist=('arcane', 'veil', 'portal', 'pack'), priestess=('holy', 'pillar', 'halo', 'bless'), werewolf=('blood', 'claws', 'shout', 'change'),
    demonSwordsman=('fire', 'chains', 'flare', 'change'), kitsune=('fire', 'spiral', 'burst', 'burst'), karasu=('wind', 'swarm', 'vortex', 'sky'),
    timeWitch=('holy', 'sigil', 'crystal', 'burst'), wanderer=('holy', 'motes', 'ring', 'bless'), satyr=('forest', 'swarm', 'spiral', 'bless'),
    samuraiCommander=('fire', 'shout', 'flare', 'bless'), sage=('lightning', 'sigil', 'dome', 'bless'), cleric=('holy', 'souls', 'motes', 'bless'),
    peasant=('earth', 'shout', 'smoke', 'bless'), wolfBard=('wind', 'shout', 'spiral', 'bless'), vampireLord=('blood', 'implode', 'siphon', 'burst'),
    hemomancer=('blood', 'siphon', 'rain', 'burst'), nightstalker=('shadow', 'swarm', 'claws', 'blinks'), bloodGargoyle=('earth', 'shockwave', 'slab', 'burst'),
    dhampir=('holy', 'rain', 'cross', 'shots'), warDrummer=('lightning', 'shout', 'bolt', 'burst'), geomancer=('earth', 'slab', 'spikes', 'bless'),
    bellWarden=('shadow', 'shockwave', 'crystal', 'burst'), falconer=('wind', 'swarm', 'claws', 'sky'), banneret=('fire', 'veil', 'ring', 'bless'),
    astralSphinx=('arcane', 'eye', 'sigil', 'burst'), mirageDancer=('wind', 'veil', 'cross', 'blinks'), plagueDoctor=('poison', 'cloud', 'smoke', 'burst'),
    bombardier=('fire', 'rain', 'burst', 'sky'), astrologer=('holy', 'implode', 'burst', 'sky'), inquisitor=('holy', 'strike', 'ring', 'shots'),
    seraph=('holy', 'shaft', 'shockwave', 'sky'), corsairSurgeon=('forest', 'geyser', 'motes', 'bless'), harpooner=('ice', 'chains', 'spikes', 'hooks'),
    seaReaver=('water', 'geyser', 'gust', 'line'),
)
STYLE_WEIGHT = dict(line='blow', leap='blow', blinks='flurry', blows='flurry', hooks='flurry', burrow='flurry', burst='wave', bless='wave', change='wave',
                    sky='storm', shots='storm', pack='summon')
OWN_WEIGHT = dict(minotaur='flurry', rifleBot='flurry', priestess='summon')
# What gathers on the caster, by weight: a blow winds a spiral up the body, a flurry drags power in, a wave draws a circle,
# a storm turns a funnel, a summoning calls wisps up out of the ground.
WIND = dict(blow=[('ring', 0, 0.5), ('spiral', 0.15, 1)], flurry=[('implode', 0, 1)], wave=[('sigil', 0, 1), ('motes', 0.2, 1)],
            storm=[('vortex', 0, 1)], summon=[('sigil', 0, 0.7), ('souls', 0.25, 1)])
WIND_SIZE = dict(ring=dict(r=1.0, n=3), spiral=dict(r=0.6, h=2.0, bands=3), implode=dict(r=1.3, n=14, z=0.8), sigil=dict(r=1.2, points=6, skip=2),
                 motes=dict(r=1.0, h=1.8, n=20, crosses=4), vortex=dict(r=1.0, h=2.2, coils=4, motes=18), souls=dict(r=0.9, h=2.0, n=6))


def canvas(scenes):
    """One canvas that holds every scene of a staged effect at an ultimate's size."""
    return box(max(BIG[s][1] for s in scenes), max(BIG[s][2] for s in scenes), 0.5)


def ult_weight(kind):
    return OWN_WEIGHT.get(kind) or STYLE_WEIGHT[ULTS[kind][3]]


_wound, _after = set(), set()
for kind, (pal, first, second, style) in ULTS.items():
    # (the strike: the first scene opens it, the second lands as the first is at its height)
    fx(f'ult-{kind}-strike', None, pal, **canvas((first, second)), frames=16, ms=1300, seed=40 + len(EFFECTS),
       stages=[stage(first, 0, 0.7, **BIG[first][0]), stage(second, 0.25, 1, **BIG[second][0])])
    weight = ult_weight(kind)
    if (weight, pal) not in _wound:
        _wound.add((weight, pal))
        fx(f'ultwind-{weight}-{pal}', None, pal, **box(1.5, 2.6, 0.5), frames=14, ms=1800, seed=7,
           stages=[stage(sc, a, b, **WIND_SIZE[sc]) for sc, a, b in WIND[weight]])
    if pal not in _after:
        _after.add(pal)
        # (the aftermath: the element's fumes rolling low where it struck and its motes lifting off, thinning to nothing)
        fx(f'ultafter-{pal}', None, pal, **box(1.9, 2.4, 0.5), frames=12, ms=1700, seed=9,
           stages=[stage('cloud', 0, 1, r=0.95, h=0.36, puffs=5, bubbles=0), stage('motes', 0, 1, r=1.3, h=1.9, n=22, crosses=0)])

# What the game ships: everything but the library's own previews.
SHIPPED = [k for k in EFFECTS if not k.startswith('lib-')]
