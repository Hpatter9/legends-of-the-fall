"""The catalogue: every effect the game plays, as a recipe (which scene, which element, how big, how long).

`w` and `h` are the canvas in tile widths (a tile is 45 of an effect's pixels across), `oy` how far down the canvas
the tile's middle sits, `ms` how long one pass lasts. `layer` says where the game draws it: 'over' the fighters
(thinned where it would hide one) or on the 'ground' under them. `glow` keeps a soft light under the pixels.
"""
from lib import PALETTES

EFFECTS = {}


def fx(id, scene, element, cw, ch, oy, frames=16, ms=1000, loop=False, glow=None, layer='over', seed=1, hold=None, stages=None, ult=False, take=None, skip=0, colours=0, at=None, **opt):
    spec = dict(id=id, element=element, w=cw, h=ch, oy=oy, frames=frames, ms=ms, loop=loop, layer=layer, seed=seed,
                glow=PALETTES[element]['glow'] if glow is None else glow)
    if stages:
        spec['stages'] = stages
    else:
        spec['scene'] = scene
        spec['opt'] = opt
    if hold is not None:
        spec['hold'] = hold
    if skip:
        # (how many of its first rendered frames are left out: a strike opens on the blow itself, its core already swollen, not on the
        # frames in which it is still forming)
        spec['skip'] = skip
    if at and at != 'one':
        # (where the renderer plays it: on each fighter the ability touches, or round the caster; unset, at the middle of what was struck)
        spec['at'] = at
    if colours:
        # (its own count of colours: a great core of fire, ice or light wants more than the shared count, or it bands flat)
        spec['colours'] = colours
    if take:
        # (how many of its rendered frames are kept, evenly spaced: fewer frames, played slower, for a smaller download)
        spec['take'] = take
    if ult:
        # (an ultimate's sheet is cut hard, with no dither, and given a dark edge, so it reads against the darkened field)
        spec['edge'] = True
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
    fx(f'ground-{el}', 'tile', pal, 1.3, 1.5, 0.74, frames=10, ms=950, loop=True, seed=20 + i, things=things, n=9, lift=1.0, fill=0.78)
# Burning ground (the fire a skill leaves on a 3x3): the same tile with tall flames.
fx('zone-fire', 'tile', 'fire', 1.3, 2.0, 0.8, frames=10, ms=800, loop=True, seed=31, things='flames', n=10, lift=1.4, fill=0.9)

# ---- the ultimates (docs/notes/blender-fx.md, src/ultStageRules.ts): each hero's ultimate plays in three stages. Its
# strike is its own: two scenes staged one into the other, in its element (no two heroes share the pair and the
# element). Its wind-up (on the caster) is by its weight and element, its aftermath (where it struck) by its element. ----

# A scene at an ultimate's size: its options, how far it reaches on the ground and how tall it stands.
BIG = dict(
    arc=(dict(r=1.5, z=1.0, sparks=18, wide=0.6), 2.5, 2.8), shockwave=(dict(r=1.9, forks=8), 2.1, 0.6), rain=(dict(r=1.6, h=3.4, n=22), 2.4, 4.0),
    burst=(dict(r=1.5, h=1.4, embers=26), 3.2, 3.4), halo=(dict(r=0.8, h=2.8, rays=9), 1.9, 3.3), dome=(dict(r=1.6), 1.8, 1.9),
    vines=(dict(r=1.5, h=1.7, n=8), 1.8, 2.3), sigil=(dict(r=1.7, points=7, skip=3, motes=14), 1.9, 1.5), spiral=(dict(r=0.9, h=2.4, bands=3), 1.6, 2.8),
    cross=(dict(r=1.9, z=1.5, wide=0.34), 2.6, 3.9), smoke=(dict(r=1.15, h=1.6, puffs=8), 2.2, 2.7), claws=(dict(r=1.9, z=1.5, wide=0.26), 2.6, 4.0),
    sparks=(dict(r=1.8, n=14, z=0.9), 2.8, 3.0), bolt=(dict(h=3.6, r=1.6, forks=3), 2.3, 4.1), trail=(dict(length=3.6, w=0.5), 3.4, 1.2),
    gust=(dict(r=1.7, n=5, turn=1.5708), 3.2, 3.0), crack=(dict(r=2.2, arms=7, rubble=18), 2.6, 1.4), chains=(dict(r=1.4, n=5, links=10, h=1.8), 1.7, 2.3),
    ring=(dict(r=1.8, n=4, thick=0.07), 2.0, 0.5), flare=(dict(r=0.9, h=2.2, tongues=8), 2.0, 3.6), nova=(dict(r=1.7, n=22, h=1.1), 2.2, 1.6),
    strike=(dict(h=3.4, r=1.3, w=0.36), 2.2, 6.6), vortex=(dict(r=1.5, h=3.0, coils=5), 1.9, 3.4), eye=(dict(r=1.2, z=1.8), 2.0, 3.4),
    crystal=(dict(r=0.7, h=2.1, shards=8), 1.8, 2.6), spikes=(dict(r=1.5, h=2.2, n=9), 2.0, 2.6), geyser=(dict(r=0.6, h=2.8, drops=30), 2.2, 3.4),
    siphon=(dict(r=0.9, h=2.2, n=7), 1.7, 3.4), cloud=(dict(r=1.6, h=0.9, puffs=10), 2.0, 1.8), souls=(dict(r=1.4, h=2.4, n=8), 2.0, 3.4),
    veil=(dict(r=1.0, h=2.0, panes=9), 1.6, 2.6), portal=(dict(r=1.0, z=1.2), 1.8, 3.2), pillar=(dict(r=0.9, h=3.2, sparks=30), 1.8, 3.6),
    shout=(dict(r=1.8, h=1.6, n=5), 2.2, 3.2), swarm=(dict(r=1.5, h=2.0, n=30), 1.9, 2.6), motes=(dict(r=1.6, h=2.2, n=34, crosses=7), 2.0, 2.6),
    hearts=(dict(r=1.0, h=2.0, n=9), 1.5, 2.6), wall=(dict(length=3.0, h=1.7, tongues=9), 2.4, 2.2), flames=(dict(r=1.3, h=1.3, tongues=9), 1.9, 2.2),
    palisade=(dict(length=3.2, h=1.7, n=8), 2.4, 2.2), beast=(dict(size=2.3), 1.9, 2.2), eyes=(dict(r=1.9, n=4, size=2.6), 2.6, 2.4),
    implode=(dict(r=1.9, n=16, z=0.8), 2.5, 2.3), slab=(dict(r=0.9, n=6, h=1.3, dark=True), 1.7, 1.9), shaft=(dict(r=0.6, h=3.2, slant=0.4), 2.6, 3.8),
)

# Each ultimate: its palette, its strike's two scenes, and its showcase's style (which sets its weight, as `ultStageRules.ts` does).
ULTS = dict(
    vael=('shadow', 'arc', 'shockwave', 'burst'), astrax=('holy', 'rain', 'flames', 'sky'), ilyra=('holy', 'halo', 'dome', 'bless'),
    orrun=('forest', 'vines', 'dome', 'bless'), nyxara=('lightning', 'sigil', 'spiral', 'bless'), kunoichi=('shadow', 'cross', 'swarm', 'blinks'),
    wizard=('fire', 'burst', 'crack', 'sky'), beastmaster=('forest', 'beast', 'crack', 'pack'), mercenary=('blood', 'cross', 'sparks', 'blinks'),
    arcBlade=('lightning', 'bolt', 'cross', 'blinks'), samurai=('holy', 'arc', 'sparks', 'line'), lancer=('wind', 'trail', 'gust', 'line'),
    minotaur=('earth', 'crack', 'smoke', 'line'), barbarian=('blood', 'crack', 'burst', 'leap'), ninjaMonk=('wind', 'sparks', 'gust', 'blows'),
    buccaneer=('shadow', 'chains', 'cross', 'hooks'), archer=('wind', 'rain', 'ring', 'sky'), dreadPirate=('shadow', 'rain', 'burst', 'sky'),
    siegeBot=('fire', 'burst', 'shockwave', 'sky'), lightningMage=('lightning', 'cloud', 'bolt', 'shots'), gunslinger=('fire', 'sparks', 'cross', 'shots'),
    rifleBot=('lightning', 'sparks', 'ring', 'shots'), dragoon=('fire', 'flare', 'wall', 'shots'), ranger=('forest', 'vines', 'ring', 'burst'),
    knight=('holy', 'shout', 'dome', 'burst'), paladin=('holy', 'nova', 'strike', 'burst'), yamabushi=('wind', 'vortex', 'gust', 'burst'),
    gorgon=('poison', 'crystal', 'smoke', 'burst'), juggernaut=('earth', 'crack', 'spikes', 'burst'), kraken=('water', 'vortex', 'geyser', 'burst'),
    mummy=('earth', 'vortex', 'chains', 'burst'), warlock=('shadow', 'sigil', 'siphon', 'burst'), tyrant=('blood', 'shout', 'spikes', 'burst'),
    shambler=('poison', 'crack', 'cloud', 'burrow'), reaper=('shadow', 'arc', 'souls', 'burst'), druid=('forest', 'palisade', 'vines', 'pack'),
    illusionist=('arcane', 'veil', 'portal', 'pack'), priestess=('holy', 'pillar', 'halo', 'bless'), werewolf=('blood', 'claws', 'shout', 'change'),
    demonSwordsman=('fire', 'chains', 'flare', 'change'), kitsune=('fire', 'spiral', 'smoke', 'burst'), karasu=('wind', 'swarm', 'vortex', 'sky'),
    timeWitch=('holy', 'sigil', 'crystal', 'burst'), wanderer=('holy', 'hearts', 'motes', 'bless'), satyr=('forest', 'swarm', 'spiral', 'bless'),
    samuraiCommander=('fire', 'pillar', 'flare', 'bless'), sage=('lightning', 'dome', 'sigil', 'bless'), cleric=('holy', 'souls', 'motes', 'bless'),
    peasant=('earth', 'veil', 'shout', 'bless'), wolfBard=('wind', 'shout', 'spiral', 'bless'), vampireLord=('blood', 'implode', 'siphon', 'burst'),
    hemomancer=('blood', 'siphon', 'rain', 'burst'), nightstalker=('shadow', 'swarm', 'claws', 'blinks'), bloodGargoyle=('earth', 'shockwave', 'slab', 'burst'),
    dhampir=('holy', 'rain', 'cross', 'shots'), warDrummer=('lightning', 'shout', 'bolt', 'burst'), geomancer=('earth', 'slab', 'crack', 'bless'),
    bellWarden=('shadow', 'shout', 'ring', 'burst'), falconer=('wind', 'shaft', 'claws', 'sky'), banneret=('fire', 'veil', 'ring', 'bless'),
    astralSphinx=('arcane', 'eye', 'sigil', 'burst'), mirageDancer=('wind', 'veil', 'cross', 'blinks'), plagueDoctor=('poison', 'cloud', 'smoke', 'burst'),
    bombardier=('fire', 'shaft', 'burst', 'sky'), astrologer=('holy', 'implode', 'burst', 'sky'), inquisitor=('holy', 'strike', 'ring', 'shots'),
    seraph=('holy', 'shaft', 'shockwave', 'sky'), corsairSurgeon=('forest', 'geyser', 'motes', 'bless'), harpooner=('ice', 'chains', 'spikes', 'hooks'),
    seaReaver=('water', 'geyser', 'gust', 'line'),
)
# ULT-AUDIT (docs/notes/ult-audit.md): a strike must show what the ability does. Only an ability that IS one great blow has the blow
# itself under it (a core, shock rings, rubble): a cut, a leap's landing, a shell, a meteor, a crash from on high.
GREAT = {'samurai', 'barbarian', 'bloodGargoyle', 'siegeBot', 'wizard', 'astrologer', 'seraph', 'bombardier', 'dreadPirate'}
# Where a strike plays. Most are one great thing at the middle of what was struck. `each`: a small one on every fighter the ability
# touches (a mark sits on each foe marked, a flurry's cut on each foe cut, what is summoned arrives where each stands). `friends`: on
# each friend the ability helps, and the caster (a heal, a blessing, a ward on them), with a line of light run out to each from the
# caster's hands. `tiles`: on each tile the ability takes (a wall stands along the tiles it blocks). `self`: round the caster (an aura, a ward, a transformation, a pull towards him).
PLACE = dict(
    wanderer='friends', satyr='friends', corsairSurgeon='friends', sage='friends', ilyra='friends', orrun='friends', nyxara='friends', samuraiCommander='friends',
    peasant='friends', priestess='friends', geomancer='tiles', kunoichi='each', mercenary='each', arcBlade='each', ninjaMonk='each', buccaneer='each', harpooner='each', mirageDancer='each',
    gorgon='each', kitsune='each', timeWitch='each', ranger='each', astralSphinx='each', vampireLord='each', gunslinger='each', dhampir='each',
    inquisitor='each', beastmaster='each', illusionist='each',
    cleric='self', knight='self', wolfBard='self', banneret='self', warlock='self', tyrant='self', bellWarden='self', plagueDoctor='self', kraken='self',
    reaper='self', mummy='self', werewolf='self', demonSwordsman='self', rifleBot='self', paladin='self', yamabushi='self',
)
# A third scene some strikes have, where two do not say what the ability does (the ring the spirits circle in, the flames a
# constellation leaves, the halo a nova's healing lands as).
THIRD = dict(cleric='ring', wanderer='halo', timeWitch='ring', astrax='sigil', dragoon='flames', banneret='flames', paladin='halo',
             seaReaver='ring', minotaur='trail', shambler='geyser', rifleBot='spiral', demonSwordsman='spiral', werewolf='flare', corsairSurgeon='ring',
             wolfBard='ring', warDrummer='shockwave', lancer='sparks')
# ULT-AUDIT: every hero's wind-up is the ability itself beginning, in place of a circle and a pillar by its weight: the Cleric's wisps
# rise inside the ring the spirits will keep, the Lightning Mage's cloud gathers, the Knight plants a slab and a dome closes, the Kraken's
# whirlpool turns. No two heroes have the same scenes in the same order, whatever their colours.
WIND_OWN = dict(
    vael=[('halo', 0, 1.4), ('implode', 0.2, 1.3)], astrax=[('sigil', 0, 1.3), ('motes', 0.2, 1.4)], ilyra=[('halo', 0, 1.5), ('ring', 0, 1.2)],
    orrun=[('vines', 0, 1.5), ('ring', 0.1, 1.3)], nyxara=[('sigil', 0, 1.4), ('spiral', 0.3, 1.5)], kunoichi=[('smoke', 0, 1.2), ('swarm', 0.3, 1.4)],
    wizard=[('vortex', 0, 1.3), ('flames', 0.3, 1.5)], beastmaster=[('eyes', 0, 1.4), ('swarm', 0.3, 1.4)], mercenary=[('implode', 0, 1.2), ('sparks', 0.5, 1.5)],
    arcBlade=[('spiral', 0, 1.3), ('bolt', 0.2, 1.4)], samurai=[('ring', 0, 1.2), ('flare', 0.4, 1.8)], lancer=[('gust', 0, 1.4), ('trail', 0.3, 1.4)],
    minotaur=[('smoke', 0, 1.3), ('crack', 0.3, 1.4)], barbarian=[('flare', 0, 1.5), ('shout', 0.3, 1.4)], ninjaMonk=[('spiral', 0, 1.4), ('sparks', 0.4, 1.5)],
    buccaneer=[('chains', 0, 1.5), ('ring', 0, 1.0)], archer=[('shaft', 0, 1.4), ('gust', 0.2, 1.3)], dreadPirate=[('cloud', 0, 1.4), ('souls', 0.3, 1.5)],
    siegeBot=[('ring', 0, 1.4), ('strike', 0.5, 1.8)], lightningMage=[('cloud', 0, 1.5), ('sparks', 0.4, 1.5)], gunslinger=[('halo', 0, 1.4), ('sparks', 0.6, 1.6)],
    rifleBot=[('sparks', 0, 1.3), ('bolt', 0.5, 1.6)], dragoon=[('flames', 0, 1.4), ('flare', 0.4, 1.7)], ranger=[('vines', 0, 1.4), ('swarm', 0.3, 1.4)],
    knight=[('slab', 0, 1.3), ('dome', 0.4, 1.6)], paladin=[('nova', 0, 1.2), ('pillar', 0.3, 1.7)], yamabushi=[('vortex', 0, 1.5), ('gust', 0.3, 1.5)],
    gorgon=[('vines', 0, 1.4), ('eye', 0.2, 1.5)], juggernaut=[('crack', 0, 1.3), ('slab', 0.3, 1.5)], kraken=[('vortex', 0, 1.4), ('geyser', 0.4, 1.6)],
    mummy=[('gust', 0, 1.4), ('chains', 0.3, 1.5)], warlock=[('sigil', 0, 1.4), ('siphon', 0.3, 1.5)], tyrant=[('shout', 0, 1.4), ('flare', 0.4, 1.6)],
    shambler=[('crack', 0, 1.2), ('cloud', 0.2, 1.4)], reaper=[('souls', 0, 1.4), ('arc', 0.5, 1.7)], druid=[('vines', 0, 1.4), ('motes', 0.2, 1.4)],
    illusionist=[('veil', 0, 1.5), ('sparks', 0.4, 1.4)], priestess=[('halo', 0, 1.4), ('pillar', 0.4, 1.7)], werewolf=[('ring', 0, 1.0), ('shout', 0.3, 1.5), ('claws', 0.5, 1.6)],
    demonSwordsman=[('chains', 0, 1.3), ('flames', 0.3, 1.6)], kitsune=[('spiral', 0, 1.4), ('flames', 0.3, 1.4)], karasu=[('swarm', 0, 1.5), ('gust', 0.3, 1.4)],
    timeWitch=[('sigil', 0, 1.5), ('ring', 0.2, 1.2), ('motes', 0.3, 1.4)], wanderer=[('geyser', 0, 1.3), ('hearts', 0.3, 1.5)], satyr=[('swarm', 0, 1.4), ('hearts', 0.4, 1.5)],
    samuraiCommander=[('veil', 0, 1.5), ('flare', 0.4, 1.6)], sage=[('spiral', 0, 1.4), ('dome', 0.4, 1.6)], cleric=[('ring', 0, 1.4), ('souls', 0.1, 1.5)],
    peasant=[('shout', 0, 1.4), ('slab', 0.3, 1.5)], wolfBard=[('shout', 0, 1.5), ('motes', 0.2, 1.4)], vampireLord=[('siphon', 0, 1.5), ('swarm', 0.2, 1.3)],
    hemomancer=[('siphon', 0, 1.4), ('ring', 0, 1.2), ('rain', 0.4, 1.5)], nightstalker=[('swarm', 0, 1.4), ('smoke', 0.2, 1.3)], bloodGargoyle=[('gust', 0, 1.2), ('shaft', 0.4, 1.7)],
    dhampir=[('halo', 0, 1.2), ('cross', 0.5, 1.6)], warDrummer=[('shout', 0, 1.5), ('sparks', 0.3, 1.5)], geomancer=[('slab', 0, 1.5), ('motes', 0.2, 1.3)],
    bellWarden=[('shout', 0, 1.4), ('crystal', 0.4, 1.6)], falconer=[('swarm', 0, 1.4), ('shaft', 0.4, 1.6)], banneret=[('veil', 0, 1.5), ('ring', 0.1, 1.3)],
    astralSphinx=[('eye', 0, 1.5), ('sigil', 0, 1.3)], mirageDancer=[('veil', 0, 1.4), ('gust', 0.2, 1.4)], plagueDoctor=[('cloud', 0, 1.5), ('siphon', 0.3, 1.4)],
    bombardier=[('flames', 0, 1.2), ('geyser', 0.3, 1.6)], astrologer=[('implode', 0, 1.4), ('motes', 0.2, 1.4)], inquisitor=[('halo', 0, 1.3), ('strike', 0.4, 1.7)],
    seraph=[('halo', 0, 1.4), ('shaft', 0.4, 1.7)], corsairSurgeon=[('geyser', 0, 1.4), ('ring', 0.1, 1.2)], harpooner=[('chains', 0, 1.4), ('geyser', 0.3, 1.5)],
    seaReaver=[('geyser', 0, 1.5), ('gust', 0.2, 1.4)],
)
# A wind-up that holds colours outside its element's (grey fur, amber eyes) has more of them, so the palette step keeps them.
WIND_COLOURS = dict(beastmaster=22)
# ULT-AUDIT: every hero's aftermath is what its ability leaves, low where it struck and something lifting off it: no two heroes have
# the same two scenes, whatever their colours (about forty did, in different colours). (Lists, not pairs in brackets: a test reads the
# ground loops' pairs out of this file by their shape.)
AFTER_OWN = dict(
    vael=['sigil', 'souls'], astrax=['flames', 'motes'], ilyra=['ring', 'halo'], orrun=['vines', 'swarm'],
    nyxara=['sigil', 'spiral'], kunoichi=['cloud', 'swarm'], wizard=['crack', 'flames'], beastmaster=['trail', 'motes'],
    mercenary=['crack', 'sparks'], arcBlade=['crack', 'bolt'], samurai=['trail', 'veil'], lancer=['trail', 'gust'],
    minotaur=['crack', 'smoke'], barbarian=['crack', 'flare'], ninjaMonk=['ring', 'gust'], buccaneer=['cloud', 'chains'],
    archer=['ring', 'shaft'], dreadPirate=['crack', 'souls'], siegeBot=['crack', 'cloud'], lightningMage=['cloud', 'bolt'],
    gunslinger=['ring', 'smoke'], rifleBot=['ring', 'sparks'], dragoon=['flames', 'smoke'], ranger=['vines', 'motes'],
    knight=['ring', 'pillar'], paladin=['sigil', 'pillar'], yamabushi=['cloud', 'spiral'], gorgon=['spikes', 'smoke'],
    juggernaut=['crack', 'spikes'], kraken=['ring', 'geyser'], mummy=['cloud', 'gust'], warlock=['sigil', 'siphon'],
    tyrant=['spikes', 'flare'], shambler=['cloud', 'geyser'], reaper=['ring', 'souls'], druid=['vines', 'veil'],
    illusionist=['sigil', 'veil'], priestess=['sigil', 'halo'], werewolf=['ring', 'claws'], demonSwordsman=['flames', 'chains'],
    kitsune=['ring', 'swarm'], karasu=['cloud', 'veil'], timeWitch=['sigil', 'crystal'], wanderer=['ring', 'hearts'],
    satyr=['vines', 'hearts'], samuraiCommander=['ring', 'flare'], sage=['sigil', 'dome'], cleric=['ring', 'motes'],
    peasant=['slab', 'smoke'], wolfBard=['ring', 'spiral'], vampireLord=['cloud', 'siphon'], hemomancer=['ring', 'rain'],
    nightstalker=['cloud', 'claws'], bloodGargoyle=['crack', 'slab'], dhampir=['ring', 'cross'], warDrummer=['ring', 'shout'],
    geomancer=['spikes', 'motes'], bellWarden=['ring', 'veil'], falconer=['trail', 'swarm'], banneret=['flames', 'veil'],
    astralSphinx=['sigil', 'eye'], mirageDancer=['sigil', 'gust'], plagueDoctor=['cloud', 'motes'], bombardier=['flames', 'cloud'],
    astrologer=['sigil', 'motes'], inquisitor=['flames', 'halo'], seraph=['nova', 'halo'], corsairSurgeon=['cloud', 'hearts'],
    harpooner=['spikes', 'chains'], seaReaver=['trail', 'geyser'],
)
# How large a strike is drawn when it plays on each fighter, or round the caster.
PLACE_SIZE = dict(each=0.8, friends=1.1, tiles=0.85, self=1.25)
# (a few are drawn larger where they land: a beast is a beast's size, stone creeps over the whole of a foe)
EACH_SIZE = dict(beastmaster=1.0, gorgon=1.0, geomancer=1.15)
# How much larger than a scene's own size a strike is drawn, by the show's weight.
STRIKE_SIZE = dict(blow=1.6, flurry=1.6, wave=1.9, storm=2.3, summon=2.3)
STYLE_WEIGHT = dict(line='blow', leap='blow', blinks='flurry', blows='flurry', hooks='flurry', burrow='flurry', burst='wave', bless='wave', change='wave',
                    sky='storm', shots='storm', pack='summon')
OWN_WEIGHT = dict(minotaur='flurry', rifleBot='flurry', priestess='summon')
# What gathers on the caster, by weight: a blow winds a spiral up the body, a flurry drags power in, a wave draws a circle,
# a storm turns a funnel, a summoning calls wisps up out of the ground.
# (a stage that runs past the end of the clip, to 1.3 or so, is still near its height on the last frame: the wind-up swells right up
# to the blow instead of dying away before it, and stands twice the hero's height by then)
WIND = dict(blow=[('ring', 0, 0.5), ('spiral', 0.1, 1.3), ('flare', 0.5, 1.9)], flurry=[('implode', 0, 1.22), ('spiral', 0.45, 1.5)],
            wave=[('sigil', 0, 1.3), ('motes', 0.15, 1.25), ('pillar', 0.45, 1.7)], storm=[('vortex', 0, 1.3), ('pillar', 0.5, 1.8)],
            summon=[('sigil', 0, 1.3), ('souls', 0.2, 1.2), ('pillar', 0.5, 1.8)])
WIND_SIZE = dict(ring=dict(r=1.1, n=3), spiral=dict(r=0.7, h=2.6, bands=3), implode=dict(r=1.5, n=16, z=0.9), sigil=dict(r=1.35, points=6, skip=2),
                 motes=dict(r=1.1, h=2.2, n=24, crosses=5), vortex=dict(r=1.15, h=2.8, coils=5, motes=20), souls=dict(r=1.0, h=2.5, n=7),
                 flare=dict(r=0.6, h=2.5, tongues=7), pillar=dict(r=0.6, h=2.9, sparks=22))


def canvas(scenes):
    """One canvas that holds every scene of a staged effect at an ultimate's size."""
    return box(max(BIG[s][1] for s in scenes), max(BIG[s][2] for s in scenes), 0.5)


def ult_weight(kind):
    return OWN_WEIGHT.get(kind) or STYLE_WEIGHT[ULTS[kind][3]]


# How many heroes (in the table's order) have had their own wind-up and aftermath made, and their strike made larger and
# longer: the ultimates are done about fifteen at a time. The rest keep a wind-up shared by weight and element and an
# aftermath shared by element until their turn.
ULT_OWN = 70
# Frames a stage keeps of those rendered: the strike every one after its opening; the wind-up and the aftermath a few fewer, played
# slower. (The director first set a limit of about 3 MB for the ultimates, then lifted it: bytes are spent where they buy force.)
WIND_FRAMES, STRIKE_FRAMES, AFTER_FRAMES = 12, 13, 9
# (a strike's own colours: its core is the biggest single thing drawn, and at the shared count it bands into flat rings)
STRIKE_COLOURS = 20
# A stage's length by weight (ms: `WEIGHTS` in ultStageRules.ts), which sets how many frames it is given.
STAGE_MS = dict(blow=(1600, 1500), flurry=(1700, 1600), wave=(1900, 1700), storm=(2000, 1800), summon=(2200, 2100))
# What else may gather with a weight's own wind-up, and what an aftermath may be made of: a hero takes the first pair no
# other hero of its element has, so no two wind-ups and no two aftermaths are alike.
# Each hero's own: what joins its weight's gathering in its wind-up, and its aftermath's two parts (something low where it struck,
# something lifting off it). Picked by hand to fit the ultimate; no two heroes of an element have the same.
OWN = dict(
    vael=('implode', 'sigil', 'souls'),        # the black sun draws the light in; a dark circle and what it took rise after
    astrax=('motes', 'ring', 'motes'),         # starlight gathers; rings of it spread and stardust lifts
    ilyra=('halo', 'sigil', 'veil'),           # her halo comes down; a circle of light and a curtain of it stay
    orrun=('vines', 'vines', 'swarm'),         # roots climb; they stand a while and leaves wheel off them
    nyxara=('spiral', 'ring', 'spiral'),       # the clock winds; its rings run out and unwind
    kunoichi=('veil', 'cloud', 'swarm'),       # she fades behind a curtain; a low haze and petals after
    wizard=('flare', 'crack', 'smoke'),        # fire climbs his staff; the ground is split and smoking
    beastmaster=('swarm', 'ring', 'motes'),    # leaves wheel to the horn; the call's rings and motes
    mercenary=('sparks', 'cloud', 'motes'),    # steel sparks; a red haze and drops lifting
    arcBlade=('sparks', 'crack', 'motes'),     # he crackles; scorched lines on the ground, sparks rising
    samurai=('sigil', 'ring', 'veil'),         # the still circle of the draw; a ring and a curtain of light after the cut
    lancer=('swarm', 'cloud', 'swarm'),        # dust and wind whirl up; dust rolls and scatters
    minotaur=('smoke', 'crack', 'smoke'),      # he paws up dust; cracked ground and dust
    barbarian=('shout', 'crack', 'motes'),     # his roar; the cracked ground and blood-red motes
    ninjaMonk=('veil', 'ring', 'swarm'),       # a blur round him; rings of wind and leaves
    # (the other fifty-five)
    buccaneer=('chains', 'cloud', 'souls'),    # his hooks' chains rattle out; a dark haze and the taken
    dreadPirate=('souls', 'crack', 'souls'),   # the ghost fleet's dead gather; broken ground and ghosts
    warlock=('souls', 'ring', 'souls'),        # what he will drink comes to him; the circle of death and its souls
    reaper=('swarm', 'cloud', 'motes'),        # the dark wheels round the scythe; a haze where it reaped
    nightstalker=('swarm', 'ring', 'swarm'),   # the bats lift; they scatter after
    bellWarden=('shout', 'ring', 'veil'),      # the bell's toll rings out; its rings and a stillness
    archer=('swarm', 'ring', 'motes'),         # arrows nocked in a whirl of wind; the marks' rings and dust
    yamabushi=('spiral', 'cloud', 'spiral'),   # the gale winds into his hands; dust and eddies
    karasu=('veil', 'cloud', 'veil'),          # feathers curtain him; a cloud of them hangs
    wolfBard=('shout', 'ring', 'spiral'),      # the opening chord; the hymn's rings carry
    falconer=('sparks', 'ring', 'veil'),       # the flock goes up in a flash of wings; rings where they stooped
    mirageDancer=('swarm', 'sigil', 'veil'),   # sand spins up; her mirages' shimmer stays
    siegeBot=('sparks', 'crack', 'motes'),     # the lock-on crackles; a crater and embers
    gunslinger=('ring', 'ring', 'smoke'),      # high noon's stillness; gunsmoke
    dragoon=('swarm', 'cloud', 'smoke'),       # embers draw to her breath; the ground alight and smoking
    demonSwordsman=('chains', 'crack', 'souls'),  # the hellfire chains; split ground and what the demon took
    kitsune=('swarm', 'ring', 'swarm'),        # fox fires wheel; they scatter
    samuraiCommander=('shout', 'ring', 'motes'),  # the banner raised and the cry; embers on the air
    banneret=('veil', 'sigil', 'veil'),        # the Oriflamme unfurls; its light stays over them
    bombardier=('smoke', 'cloud', 'motes'),    # rocket smoke; smoke and embers over the field
    lightningMage=('cloud', 'crack', 'spiral'),  # the storm cloud gathers; scorched lines, the air still turning
    rifleBot=('ring', 'ring', 'motes'),        # it overclocks; rings of heat and sparks
    sage=('veil', 'sigil', 'motes'),           # arcane threads; the circle and its motes
    warDrummer=('shout', 'ring', 'veil'),      # ten thousand drums; the rolling of them after
    ranger=('swarm', 'vines', 'motes'),        # leaves whirl to her net; the vines hold
    druid=('vines', 'vines', 'veil'),          # the hedge begins to grow; it stands, green light in it
    satyr=('spiral', 'ring', 'swarm'),         # the notes wind up; they dance off
    corsairSurgeon=('flare', 'cloud', 'motes'),  # the rum cask's spray; a healing mist
    knight=('shout', 'ring', 'pillar'),        # his roar; the shield's light closing
    paladin=('spiral', 'sigil', 'pillar'),     # light winds up him as he kneels; the nova's circle and its pillar
    priestess=('halo', 'sigil', 'motes'),      # light comes down to her; the circle and its motes where the fallen rose
    timeWitch=('ring', 'sigil', 'spiral'),     # the clock's rings; its face and its hands still turning
    wanderer=('swarm', 'cloud', 'motes'),      # the dawn wind; its light lingering
    cleric=('souls', 'ring', 'souls'),         # the spirits come; they circle and go
    dhampir=('sparks', 'crack', 'motes'),      # silver glints; the stakes' marks
    astrologer=('implode', 'ring', 'spiral'),  # the planets draw in; their orbits after
    inquisitor=('ring', 'sigil', 'souls'),     # the sun discs; the Tribunal's circle and the judged
    seraph=('swarm', 'cloud', 'veil'),         # feathers of light; a curtain of them falling
    gorgon=('eye', 'spikes', 'smoke'),         # her eyes open; stone and its dust
    shambler=('cloud', 'crack', 'smoke'),      # grave-earth fumes; the heaved ground
    plagueDoctor=('cloud', 'cloud', 'motes'),  # the censer's smoke; the plague hangs
    juggernaut=('smoke', 'spikes', 'smoke'),   # dust off his stamp; the spires and their dust
    mummy=('swarm', 'cloud', 'swarm'),         # the sand-wind; sand settling
    peasant=('shout', 'ring', 'smoke'),        # his call; the dust of the charge
    bloodGargoyle=('spiral', 'crack', 'motes'),  # he winds down from the spire; cracked ground, stone dust
    geomancer=('ring', 'spikes', 'motes'),     # the ground's rings; the crags stand
    kraken=('spiral', 'ring', 'motes'),        # the whirlpool begins; its rings and spray
    seaReaver=('swarm', 'cloud', 'motes'),     # spray off the wave; surf and mist
    tyrant=('shout', 'crack', 'smoke'),        # his roar from the throne; the ground it broke
    werewolf=('swarm', 'ring', 'souls'),       # the moon's pull; the howl's rings
    vampireLord=('souls', 'sigil', 'souls'),   # the eclipse draws blood; the goblet's circle
    hemomancer=('spiral', 'ring', 'motes'),    # drops wind up to the bowl; the offering poured
    illusionist=('veil', 'sigil', 'veil'),     # mirrors shimmer; the copies' shimmer
    astralSphinx=('eye', 'sigil', 'motes'),    # the riddle's eye; glyphs of starlight
    harpooner=('sparks', 'spikes', 'motes'),   # ice glints on the harpoons; ice and frost
)
SIZED = ('r', 'h', 'z', 'length', 'w', 'wide', 'tall', 'size')


def grow(opt, k):
    """A scene's options with its sizes (not its counts) made `k` times larger."""
    return {key: (v * k if key in SIZED else v) for key, v in opt.items()}


def sized(scene, k):
    return grow(BIG[scene][0], k)


def canvas_of(scenes, k, pad=0.5):
    return box(max(BIG[sc][1] for sc in scenes) * k, max(BIG[sc][2] for sc in scenes) * k, pad)


_wound, _after, _own_wind, _own_after = set(), set(), set(), set()
for i, (kind, (pal, first, second, style)) in enumerate(ULTS.items()):
    weight = ult_weight(kind)
    own = i < ULT_OWN
    # (the strike is the biggest thing in the game: four tiles and more for a blow, most of the foes' side for a storm or a summoning.
    # Under the hero's own two scenes lies the blow itself, the same for all in its element's colours: a white-hot core, two shock
    # rings and debris, its heaviest frames first. The first scene opens it, the second lands as the first is at its height.)
    place = PLACE.get(kind, 'one')
    k = STRIKE_SIZE[weight] if place == 'one' else EACH_SIZE.get(kind, PLACE_SIZE[place])
    scenes = [first, second] + ([THIRD[kind]] if kind in THIRD else [])
    stages = [stage(first, 0, 0.7, **sized(first, k)), stage(second, 0.25, 1, **sized(second, k))] + ([stage(THIRD[kind], 0.1, 0.9, **sized(THIRD[kind], k))] if kind in THIRD else [])
    reach, tall = max(BIG[sc][1] for sc in scenes) * k, max(BIG[sc][2] for sc in scenes) * k
    if kind in GREAT:
        # (a great blow: under the hero's own scenes lies the blow itself, in its element's colours: a white-hot core that tears open,
        # two shock rings and rubble, its heaviest frames first)
        stages = [stage('impact', 0.12, 1, r=2.2 * k)] + stages
        reach, tall = max(reach, 2.2 * k * 1.25), max(tall, 2.4 * k)
    fx(f'ult-{kind}-strike', None, pal, **box(reach, tall, 0.6), frames=16, take=STRIKE_FRAMES, skip=3 if kind in GREAT else 1, colours=STRIKE_COLOURS, ms=1300, seed=40 + 2 * i + 59, ult=True,
       at=place, stages=stages)
    if own:
        wind_ms, after_ms = STAGE_MS[weight]
        base = [sc for sc, _, _ in WIND[weight]]
        extra, low, high = OWN[kind]
        low, high = AFTER_OWN.get(kind, (low, high))
        assert (low, high) not in _own_after, kind
        # (the wind-up builds: the weight's own gathering, then the hero's own part joins it and swells to the blow)
        fx(f'ult-{kind}-windup', None, pal, **box(max(BIG[sc][1] for sc in ([w[0] for w in WIND_OWN[kind]] if kind in WIND_OWN else base + [extra])) * 0.72, max(3.4, max(BIG[w[0]][2] for w in WIND_OWN.get(kind, [('ring',)])) * 0.72), 0.5), frames=round(wind_ms / 105), take=WIND_FRAMES, colours=WIND_COLOURS.get(kind, 0), ms=wind_ms, seed=7 + i, ult=True,
           stages=[stage(sc, a, b, **sized(sc, 0.72)) for sc, a, b in WIND_OWN[kind]] if kind in WIND_OWN else
           [stage(sc, a, b, **WIND_SIZE[sc]) for sc, a, b in WIND[weight]] + [stage(extra, 0.3, 1.3, **sized(extra, 0.72))])
        _own_after.add((low, high))
        # (the aftermath lingers: something low where it struck, something lifting off it, both thinning to nothing)
        fx(f'ult-{kind}-aftermath', None, pal, **canvas_of((low, high), 0.8), frames=round(after_ms / 120), take=AFTER_FRAMES, ms=after_ms, seed=9 + i, ult=True,
           stages=[stage(low, 0, 0.85, **sized(low, 0.8)), stage(high, 0.1, 1, **sized(high, 0.8))])
        continue
    if (weight, pal) not in _wound:
        _wound.add((weight, pal))
        fx(f'ultwind-{weight}-{pal}', None, pal, **box(1.9, 3.4, 0.5), frames=16, take=WIND_FRAMES, ms=1800, seed=7, ult=True,
           stages=[stage(sc, a, b, **WIND_SIZE[sc]) for sc, a, b in WIND[weight]])
    if pal not in _after:
        _after.add(pal)
        # (the aftermath: the element's fumes rolling low where it struck and its motes lifting off, thinning to nothing)
        fx(f'ultafter-{pal}', None, pal, **box(1.9, 2.4, 0.5), frames=12, take=AFTER_FRAMES, ms=1700, seed=9, ult=True,
           stages=[stage('cloud', 0, 1, r=0.95, h=0.36, puffs=5, bubbles=0), stage('motes', 0, 1, r=1.3, h=1.9, n=22, crosses=0)])

# ---- the showcase's beats (docs/notes/blender-fx.md, `Fx.showBeat`): a hand-fired ultimate plays a showcase, a string of small beats
# (she vanishes, appears, cuts; a circle marks a crowd; one called up lands). Each beat is a short clip in the showcase's element, keyed
# `beat-<clip>-<the game's element>`; a few are one element's only (a bolt, a tongue of flame, a spire of rock, heaved ground). A line
# (a dash, a hook's reach, a blessing running to an ally) is a row of small clips along it, so no clip is ever turned. ----
BEATS = dict(
    # (a puff of smoke where she stood)
    puff=('smoke', dict(r=0.85, h=1.4, puffs=9), box(1.5, 2.0), 10, 560, {}),
    # (she is there: a flare leaping up)
    appear=('flare', dict(r=0.5, h=1.5, tongues=6), box(1.3, 2.4), 9, 450, {}),
    # (the cut across a foe: two crossed strokes, hard and bright)
    cut=('cross', dict(r=1.05, z=0.7, wide=0.3), box(1.7, 1.9), 8, 400, {}),
    # (one blow of a flurry, a bullet's spark)
    blow=('sparks', dict(r=0.55, n=10, z=0.55), box(1.0, 1.2), 7, 400, {}),
    # (the dust a run kicks up, laid along it)
    dust=('gust', dict(r=0.6, n=3, h=0.6), box(1.0, 1.0), 8, 400, {}),
    # (one link of a line thrown out: a hook's reach, a blessing's ribbon)
    link=('flare', dict(r=0.3, h=0.8, tongues=5), box(0.8, 1.2), 7, 400, {}),
    # (a landing that cracks the ground)
    crash=(None, [stage('impact', 0, 1, r=1.5, rubble=14, sparks=16), stage('crack', 0.1, 1, r=1.5, arms=6, rubble=8)], box(2.6, 2.4, 0.5), 12, 900, dict(colours=20)),
    # (a storm cloud gathering over the caster)
    cloud=('cloud', dict(r=1.3, h=0.6, puffs=9, bubbles=0), box(2.0, 1.2), 10, 1200, dict(loop=True)),
    # (it snaps tight round a foe)
    snare=('vines', dict(r=0.6, n=5, h=1.2), box(1.1, 1.6), 10, 600, {}),
    # (the element strikes a foe: a pillar of it)
    smite=('pillar', dict(r=0.45, h=2.4, sparks=14), box(1.0, 2.8), 10, 560, {}),
    # (it bursts out of the caster: the change, the last cut)
    nova=('nova', dict(r=1.3, n=16, h=0.8), box(2.0, 1.5), 10, 600, {}),
    # (the call goes out along the ground)
    call=('shockwave', dict(r=2.2, forks=7), box(3.2, 1.0), 10, 800, dict(layer='ground')),
    # (a ring on the one it lands on, grips or blesses)
    ring=('ring', dict(r=0.6, n=2), box(1.0, 0.5), 8, 560, dict(layer='ground')),
    # (power gathering at the caster's feet)
    gather=(None, [stage('sigil', 0, 1, r=1.0, points=5, skip=2, motes=8), stage('implode', 0.15, 1, r=1.1, n=12, z=0.7)], box(1.7, 1.6), 12, 1800, {}),
    # (a crowd marked until the blow falls)
    mark=(None, [stage('sigil', 0, 1, r=1.8, points=7, skip=3, motes=12), stage('pillar', 0.05, 0.5, r=0.4, h=2.4, sparks=10)], box(2.8, 2.8), 13, 2400, {}),
    # (what falls, seen high over a mark)
    sky=('comet', dict(r=0.42, tail=2.0), box(2.0, 2.9), 6, 420, dict(loop=True)),
)
# (the beats that are one element's whatever the showcase's: a bolt out of the cloud, the breath's flame, the rock that rises, the ground heaving)
BEAT_ONLY = dict(
    bolt=('lightning', 'bolt', dict(h=3.4, r=1.0, forks=2, sparks=14), box(1.6, 3.8), 9, 450),
    flame=('fire', 'flames', dict(r=0.42, h=0.95, tongues=4), box(0.8, 1.3), 8, 460),
    rise=('earth', 'spikes', dict(r=0.6, h=1.8, n=5, frost=False), box(1.1, 2.2), 10, 700),
    tunnel=('earth', 'crack', dict(r=0.8, arms=4, rubble=8), box(1.9, 1.2), 9, 520),
)
for j, (clip, (scene, opt, canvas, n, ms, more)) in enumerate(BEATS.items()):
    for i, (el, (pal, _)) in enumerate(GROUND.items()):
        if scene:
            fx(f'beat-{clip}-{el}', scene, pal, **canvas, frames=n, ms=ms, seed=300 + 11 * j + i, ult=True, **more, **opt)
        else:
            fx(f'beat-{clip}-{el}', None, pal, **canvas, frames=n, ms=ms, seed=300 + 11 * j + i, ult=True, stages=opt, **more)
for j, (clip, (pal, scene, opt, canvas, n, ms)) in enumerate(BEAT_ONLY.items()):
    fx(f'beat-{clip}', scene, pal, **canvas, frames=n, ms=ms, seed=500 + j, ult=True, **opt)

# ---- ULT-AUDIT: what an ability IS, as a loop that stays for as long as the ability lasts (docs/notes/ult-audit.md). Spirit Guardians:
# four ghostly figures a fighter tall circling the Cleric, round and round (`paintAura` draws it on her while the aura lives). ----
fx('aura-spirits', 'spirits', 'wind', **box(3.3, 4.2, 0.4), frames=12, ms=1300, loop=True, seed=71, glow=False, r=1.5, n=4, tall=2.3, mode='circle', hoop=False)

# What the game ships: everything but the library's own previews.
SHIPPED = [k for k in EFFECTS if not k.startswith('lib-')]
