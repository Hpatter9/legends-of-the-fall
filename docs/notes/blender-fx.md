# BLENDER-FX: every battle effect as a Blender-rendered pixel sheet

Branch `claude/blender-fx` (from main 0.492.0). The owner's decision: every battle effect in the game is to be remade as a
Blender-rendered, pixelated, fully animated frame sheet, so that everything matches. This reverses the smooth "cinematic painted"
look of `battle-effects-remake.md`. Light effects (heals, holy, lightning) keep a soft glow under their pixels; everything else is
hard pixels. The owner picked pixelated from `docs/samples/blender-fx/smooth-vs-pixel-*.png`.

Renderer and tools only: the sim is untouched, `fxPlace`'s tiles are as they were, and the version and `UPDATES` are untouched.

## What is done, and what comes next

| Batch | State |
| --- | --- |
| The pipeline (`tools/blender-fx/`) | Done: 52 scenes, 13 palettes, render, pixelate, pack, manifest, one command |
| The king's 35 spells | Done: each its own scene, element and size (the table below) |
| The ground loops (`fx-alive.md`: all ten elements, and burning ground) | Done: a rendered tile loop an element; the painted sheets are removed |
| The ultimates (all 70 heroes with a show) | Done: each its own staged strike, a wind-up by weight and element, an aftermath by element |
| The Eidolons | Not yet: they still play what the game has |
| Skills, hit sparks, projectiles; statuses, auras, hazards, boss entrances | After the ultimates |

Until a batch is made, its effects play their older looks (the painted atlases are still in the game). They are to be removed as
each batch replaces them, which will take far more out of the download than the new sheets add.

## The pipeline (`tools/blender-fx/README.md` has the commands)

`npm run blender-fx` renders what has changed, pixelates, packs and writes the manifest. It needs `pip install bpy pillow numpy`
(Blender as a Python module: Cycles on the CPU, no display).

- **Scenes** (`scenes.py`): a library of 52 effect shapes, each a small Blender scene built in code from the game's camera
  (orthographic, 30 degrees down, turned 45; one unit is one tile's side) and returning `step(t)`. Each takes its colours from
  its effect's element (`lib.py`: fire, ice, lightning, earth, blood, forest, poison, holy, shadow, arcane, water, wind, bone)
  and its size from its options, so one scene serves many effects that do not look alike.
- **Recipes** (`effects.py`): an effect is a scene (or stages of scenes), an element, a canvas, a frame count and a time.
- **Stages**: `stages=[stage(scene, from, to), ...]` plays several scenes in one effect, each over its own stretch of the
  time. A long staged ultimate (4 to 6 seconds: wind-up, strike, aftermath) is one recipe with three or more stages; the
  manifest carries each stage's first and last frame (`cuts`), and `bfxStage` says which stage a frame is in, so the renderer
  can hold on the strike or time the blow to it. Renewal's cast is the first staged effect (a circle, then leaves wheeling).
- **Pixelate** (`pixelate.py`): each frame is rendered at twice its size, shrunk to 45 px a tile (the heroes' pixel density
  on the board), its alpha cut hard (thin parts keep a fixed 4x4 dither, so a mist reads as a mist, not a blob), and all of
  an effect's frames cut to one shared palette of 14 colours. A light effect also keeps a glow: the frame blurred, at a
  quarter size.
- **Pack** (`pack.py`): each effect is cut to the smallest box that holds all its frames and shelved into atlases of at most
  1024 x 1024: `src/art/fx/blender/px-<n>.webp` (lossless) and `soft-<n>.webp` (the glows). The manifest is
  `src/render/blenderFxData.ts` (generated).
- **Reproducible**: the scripts are the source; the rendered frames live in `out/` and are made again by the command. Seeds are
  fixed, so a second run on the same machine gives the same files.

**Bytes added** (the pipeline and the king's spells): 59 effects, 756 frames, 5 pixel atlases and 1 glow atlas: 417 KB in all (417,070 bytes) (`src/art/fx/blender/`), fetched by
URL behind the game and kept by the service worker for offline play (`build.mjs`: `BLENDER_FX_FILES` in `FILES`). The manifest
adds about 14 KB to game.js.

## How the game plays them

- `src/render/blenderFxRules.ts` (pure): a clip's frame at a time (`bfxFrame`), its strength (`bfxAlpha`), its box on the board
  (`bfxBox`), the battery saver's budget (`bfxBudget`), and which clips each king's spell plays (`spellBfx`, `SPELL_LAY`,
  `SPELL_STANDS`, `BFX_WALL_SPELL`).
- `src/render/blenderFxArt.ts`: loads the atlases once behind the game and cuts the frames (hard pixels for the sheets,
  smoothed for the glows). Until they have loaded, the older looks play.
- `src/render/fx.ts`: three helpers play a clip through the effects' own paths.
  - `bfxOnce`: a clip played once with the middle of its tile at a point. A clip that lies on the ground (`layer: 'ground'`
    in its recipe: a ring, a circle, a crack) is laid on the tiles' tops under the fighters (`GroundPaint`); any other stands in
    the effects' layer and is thinned where it would hide a fighter (FX-CLEAR, `coverAlpha`).
  - `bfxStand`: a loop that stays while something lasts (a wall, the Poison Cloud), on its own tile's ground, so it sorts with
    the fighters by depth: whoever stands on the tile is drawn over it, and it thins while they do.
  - `bfxFly`: a loop flown from the sky to a tile (the meteor, the shower's stars).
- **Placement**: a clip is anchored on the middle of the tile it stands on (the manifest's `ax`, `ay`), at one of its pixels
  to 64/45 world px, so it lands on the tiles `fxPlace` names. The tiles' own marks (`alivePatch`) stay under every spell.
- **Reduced motion**: a clip holds its one readable frame (`hold`: the fullest frame of a clip played once, the first of a
  loop), steady for its life, and comes in and goes softly. What falls from the sky still moves (where it is going is the
  warning), on its held frame.
- **Battery saver**: no glow layer, at most three of a spell's touches drawn at once, and loops at half their frame rate.
- **A line of pieces** (the Lance's column, the Sunbeam's row) is laid tile by tile, each a beat after the one before, each
  keeping a share of its glow (`BFX_LINE_GLOW`), so the line glows without whitening.
- **Just called up**: a wolf, a decoy or a wraith has no sprite on the tick its spell calls it; its touch plays on its tile.
- **Sounds and timings** are unchanged: the sounds come from the same events (`soundRules.ts`), and the sim's times (the
  meteor's fall, a wall's life, the cloud's six seconds) drive the clips.
- **The renderer never changes the battle**: the helpers only read it.

## The king's spells

Each spell's parts are `spell-<id>-<part>`: `cast` where it lands, `hit` on each fighter it touches, `fly` and `land` for what
falls, `stand` for what stays. The leading scene is the one that carries the spell's look; no two spells lead with the same.

| Spell | Leads with | Element | Its parts |
| --- | --- | --- | --- |
| Heal | motes (a pool of light, sparks and crosses rising) | forest, glow | cast over the 3x3; a small pillar on each hero |
| Meteor | meteor (a burning rock with a tail) | fire | flies down the slant; a great burst where it lands |
| Haste | spiral (bands racing up a helix) | wind | hoops on the ground; the spiral on each hero |
| Shield | dome (a banded ward) | holy, glow | the dome over the 3x3; a small one on each hero |
| Smite | strike (a spear of light from the sky) | holy, glow | a ring where it is aimed; the spear on the foe |
| Chain Lightning | bolt (a forked bolt that re-forks) | lightning, glow | a spark at the cast; a bolt on each foe it leaps to |
| Poison Cloud | cloud (a low boiling bank) | poison | a puff as it lands; the cloud on each tile for 6 s |
| Frost Nova | nova (a ring of shards racing out) | ice | the nova over the 3x3; spikes on each foe |
| Rally | flare (flame rushing up the body) | fire | a ring of fire from the squad's middle; the flare on each hero |
| Earthquake | crack (fissures splitting the ground) | earth | the crack, wide; rock spikes under each foe |
| Resurrect | halo (a hoop coming down on rays) | holy, glow | a circle on the ground; the halo on the risen |
| Cleanse | rain (streaks and splash rings) | water | rain over the 3x3; a rush of water up each hero |
| Blink | portal (an upright ring that tears open) | arcane | the portal where the hero lands |
| Hex | implode (streaks dragged into a knot) | shadow | the knot over the 3x3; chains on each foe |
| Light Lance | beam (a lance of light, a tile long) | holy, glow | laid tile by tile down the column; a spark on each foe |
| Renewal | swarm (leaves wheeling) over a circle | forest, glow | staged: the circle, then the leaves; motes on each hero |
| Deep Freeze | crystal (a block closing round the foe) | ice | a ring; the crystal on the foe |
| Battle Cry | shout (arcs of force thrown up) | blood | the shout at the squad's middle; rising hoops on each hero |
| Bulwark | slab (blocks of stone slammed up) | earth | the rampart round each hero |
| Call the Wolves | claws (three raking cuts) | forest | the claws where they come; dust on each wolf's tile |
| Meteor Shower | comet (a four-pointed star, twin tails) | holy, glow | each star flies down in turn; a golden burst where it lands |
| Wall of Fire | wall (a tile of standing flame) | fire | a loop on each tile of the wall, rising as it comes |
| Ice Wall | palisade (tall shards that glint) | ice | a loop on each tile of the wall |
| Shatter | shatter (a block bursting to shards) | ice | the burst over the 3x3; a cross cut on each foe |
| Gale | gust (crescents of wind sweeping) | wind | the gust, blowing towards the far rows |
| Thunderclap | shockwave (a sheet of force, forks in it) | lightning, glow | the clap on each foe beside a hero |
| Thorn Snare | vines (thorned tendrils curling in) | forest | the vines over the 3x3; small ones on each foe |
| Charm | hearts (hearts drifting up) | arcane | a ring; the hearts on the foe |
| Foresight | eye (an eye that opens and looks about) | water, glow | the eye over the 3x3 |
| Sunbeam | shaft (a slanting shaft of sun) | holy, glow | laid tile by tile along the row; a spark on each foe |
| Venom Fang | bite (two jaws snapping shut) | poison | the bite on the foe |
| Mirage | veil (a wavering curtain) | wind | the veil round each decoy as it appears |
| Drain Life | siphon (streams drawn up into a ball) | blood | the siphon on the foe |
| Bone Wall | ribs (curved bones breaking out) | bone | a loop on each tile of the wall |
| Raise Dead | souls (wisps winding out of a pool) | shadow | the souls over the 3x3; a dark pillar on the raised |

A spell whose sheets have loaded plays them in place of every older layer of its look (the signature's release, the painted cast
and impact, the pack's strips, the frost's spikes, the lance's pillars, the cloud's puffs). Its tiles' marks, its words ("Haste",
"Frozen"), its shake and its sounds are as they were.

## The ground loops

A marked patch of ground (`alivePatch`: an area's warning, a spell's tiles, an aura, a Mythic's diamond) was a faint fill, a
bright rim and the owner's painted sheets (`src/art/fx/alive/`: a framed edge cut into quarters, and a borderless fill, eight
elements). The painted sheets are gone. Each tile of a patch now carries the element's rendered loop (`ground-<element>`, the
`tile` scene): mostly open ground with a moving scatter of the element's colour and its own things standing in it.

| Element | What stands in its tile |
| --- | --- |
| fire | tongues of flame and sparks |
| ice | crystals that glint |
| lightning | crackles that jump across the ground (glow) |
| light | motes rising (glow) |
| dark | wisps that waver |
| forest | sprouts swaying, motes |
| poison | bubbles swelling and bursting |
| earth | stones, and dust glinting |
| wind | swirls turning |
| blood | drops leaping |

- All ten of the game's elements have one (the painted sheets had eight; lightning and blood fell back to the pack's rune).
- A tile's loop stands on the tile's own ground over its fill and rim, under whoever stands there. It breathes with the tile
  (`tileLook`'s strip, at `ALIVE.RENDERED` of it), thins under a fighter (`ALIVE.OCCUPIED`), runs a few frames on from its
  neighbours (`stripFrame`), holds its first frame with reduced motion, and is left out on the battery saver, as the paint was.
  A light's tile keeps a share of its glow (`ALIVE.RENDERED_GLOW`: a patch's glows overlap).
- The drawn fill and rim are as they were, and so are the tiles (`fxPlace`).
- **Burning ground** (`zone`: the fire a skill leaves on a 3x3) is `zone-fire`, the same tile with tall flames, on each tile's
  own ground (so it sorts with the fighters), lower under a fighter, carrying its own sparks. The painted flame, its sway and
  its ember particles are no longer drawn once the sheets have loaded.
- **Bytes**: the eleven loops add 25 KB to the atlases (442,064 bytes in all now: 70 effects, 866 frames). Removing the painted sheets takes 518 KB of PNG out
  of game.js (they were bundled as data URLs, about 690 KB of the script).

`test/fx-alive.test.ts`: three tests held the painted sheets (the atlas's cell and rows, the quarters, the fill). They now hold
the rendered loops instead: every element has one, a tile's worth, the lights with their glow; the painted files and their
loader are gone; the loop's strength on open ground and under a fighter. This is the owner's decision changing a requirement,
not a test loosened. `tools/fx-alive/cut.py` (which cut the painted sheet) is kept for the record; its output is no longer used.

## The ultimates, round 2: each hero's own three stages (fifteen at a time)

The director's review of the first ultimates push: every hero's wind-up, strike and aftermath is to be its own recipe, sized to its
real length, bigger than any spell, building through the wind-up and lingering after; delivered about fifteen heroes at a time. So
the shared wind-ups and aftermaths described below are now only what a hero plays until its turn comes (`ULT_OWN` in
`tools/blender-fx/effects.py`). The first fifteen are done: Vael, Astrax, Ilyra, Orrun, Nyxara, Kunoichi, Wizard, Beastmaster,
Mercenary, Arc Blade, Samurai, Lancer, Minotaur, Barbarian, Ninja Monk.

For a hero whose turn has come:

- **Wind-up** `ult-<kind>-windup`: the weight's own gathering, with a part of the hero's own joining it from a third of the way in
  and swelling to the blow (so it builds). No two heroes of an element have the same scenes. Its frames are one per 105 ms of the
  stage's real length (`ULT_STAGES[kind].windup.ms`: 15 to 21 frames), and it is played across the stage as it runs that use.
- **Strike** `ult-<kind>-strike`: the same pair of scenes as before, half as large again (three to four tiles across or high) and
  longer: 18 frames over 1.5 s.
- **Aftermath** `ult-<kind>-aftermath`: something low where it struck and something lifting off it, both thinning to nothing; no
  two heroes of an element have the same pair. One frame per 120 ms of the stage's real length (12 to 18 frames).

`ultBfx` gives a hero its own sheet when it exists and the shared one otherwise, so the other 55 heroes still play all three
stages. The manifest now also carries each staged clip's scenes (`sc`), which the tests read.

**Bytes**: the atlases are 2,612,154 bytes now. The fifteen heroes' own sheets and larger strikes added 594,292 bytes over the
first ultimates push; the other 55 will add about 2.2 MB more at this size.

Photographed in fights with `tools/ult-epic/stages.mjs`: Kunoichi, Wizard, Beastmaster, Samurai, Minotaur and Barbarian (that tool's
save owns fourteen heroes; the Mythics, Mercenary, Arc Blade, Lancer and Ninja Monk are not among them, so theirs are shown as
frames only, `ult-frames.png`). Known rough edge: a strike made of smoke (the Kunoichi's) is a heavy mass for a moment at this size.

## The ground loops, round 2: full tiles

The director's review: the loops were thin (a few flames or shards on a tile) where the painted fill they replaced covered the
patch edge to edge. Each loop now covers its whole tile: the element's moving pattern runs right to the tile's edges (so
neighbouring tiles join into one ground with no borders) and fills most of it, with nine things standing in it instead of five;
burning ground has ten tall flames. Under a fighter it still thins. `docs/samples/blender-fx/ground-frames.png` and
`ground-in-fight-<size>.jpg` were retaken, the latter in the opening seconds of a fight on open ground, before the lines meet.

## The ultimates (the first push: shared wind-ups and aftermaths)

ULT-EPIC (0.495.0, `src/ultStageRules.ts`, `docs/notes/ult-epic.md`) plays an ultimate fired by hand in three stages over 4 to 6
seconds and left `STAGE_ART[kind][stage]` as the place to hang a sheet. Every hero kind with a show (70 of them: the five Mythics,
the 45, and the twenty that joined) now has all three hung there:

- **Wind-up** (on the caster, across the whole stage): `ultwind-<weight>-<palette>`. What gathers depends on the show's weight: a
  blow winds a spiral up the body, a flurry drags power in to a knot, a wave draws a circle with motes rising, a storm turns a
  funnel, a summoning calls wisps up out of a circle. In the hero's element: 30 sheets cover the weights and elements in use.
- **Strike** (on each spot it struck, up to five; two on the battery saver): `ult-<kind>-strike`, the hero's own. Each is two
  scenes staged one into the other in its element (the table below), and no two heroes have the same pair and element. A further
  burst of a flurry or a storm plays the same sheet smaller.
- **Aftermath** (where it struck, across the stage): `ultafter-<palette>`: the element's fumes rolling low and its motes lifting
  off, thinning to nothing. Drawn at 0.7 so those it struck show through. 12 sheets.

So a hero's ultimate is its own strike and its own combination of the three; the wind-ups and aftermaths are shared between
heroes of the same weight and element, which keeps the download down. `Fx.ultGather`, `ultImpact` and `ultAfter` play them on the
moment's layer (`bfxUlt`), which runs while the fight is held, in place of the painted gathering, burst, nova, ring, dust and
motes. `ultMoment.ts` hands the hero's kind on to them. Reduced motion holds each sheet's one readable frame; a light keeps its
glow (not on the battery saver). The stages' lengths, the band, the dim, the camera, the freeze, the shake and the sounds are
ULT-EPIC's and are untouched. The Eidolons' calls are not in this batch.

**Bytes**: the ultimates add 112 sheets and 1,684 frames: 1,575,798 bytes (the atlases are 2,017,862 bytes in all now: 26 pixel
atlases and 2 glow atlases). The older painted ultimate kit is still in the game for the Eidolons and for the moment before the
sheets have loaded; it can go when the Eidolons are done.

| Hero | Element | Weight | Its strike |
| --- | --- | --- | --- |
| vael | shadow | wave | a sweeping arc, then a clap of force |
| astrax | holy | storm | a rain from above, then a great burst |
| ilyra | holy | wave | a halo descending, then a ward closing |
| orrun | forest | wave | vines climbing, then a ward closing |
| nyxara | lightning | wave | a circle drawn, then a spiral rising |
| kunoichi | shadow | flurry | a cross cut, then rolling smoke |
| wizard | fire | storm | a great burst, then the ground splitting |
| beastmaster | forest | summon | raking claws, then rolling smoke |
| mercenary | blood | flurry | a cross cut, then a spray of sparks |
| arcBlade | lightning | flurry | a forked bolt, then a cross cut |
| samurai | holy | blow | a sweeping arc, then a spray of sparks |
| lancer | wind | blow | a streak along the ground, then a sweeping gust |
| minotaur | earth | flurry | the ground splitting, then rolling smoke |
| barbarian | blood | blow | the ground splitting, then a great burst |
| ninjaMonk | wind | flurry | a spray of sparks, then a sweeping gust |
| buccaneer | shadow | flurry | chains closing, then a cross cut |
| archer | wind | storm | a rain from above, then rings thrown out |
| dreadPirate | shadow | storm | a rain from above, then a great burst |
| siegeBot | fire | storm | a great burst, then a clap of force |
| lightningMage | lightning | storm | a forked bolt, then a clap of force |
| gunslinger | fire | storm | a spray of sparks, then a cross cut |
| rifleBot | lightning | flurry | a spray of sparks, then rings thrown out |
| dragoon | fire | storm | a rush of flame, then a great burst |
| ranger | forest | wave | vines climbing, then rings thrown out |
| knight | holy | wave | arcs of force, then a ward closing |
| paladin | holy | wave | a ring of shards, then a spear from the sky |
| yamabushi | wind | wave | a funnel turning, then a sweeping gust |
| gorgon | poison | wave | an eye opening, then a crystal closing |
| juggernaut | earth | wave | the ground splitting, then spikes bursting up |
| kraken | water | wave | a funnel turning, then a jet thrown up |
| mummy | earth | wave | a funnel turning, then chains closing |
| warlock | shadow | wave | a circle drawn, then streams drawn up |
| tyrant | blood | wave | arcs of force, then spikes bursting up |
| shambler | poison | flurry | the ground splitting, then a boiling bank |
| reaper | shadow | wave | a sweeping arc, then wisps winding up |
| druid | forest | summon | vines climbing, then spikes bursting up |
| illusionist | arcane | summon | a wavering curtain, then a portal tearing open |
| priestess | holy | summon | a pillar of light, then a halo descending |
| werewolf | blood | wave | raking claws, then arcs of force |
| demonSwordsman | fire | wave | chains closing, then a rush of flame |
| kitsune | fire | wave | a spiral rising, then a great burst |
| karasu | wind | storm | a wheeling swarm, then a funnel turning |
| timeWitch | holy | wave | a circle drawn, then a crystal closing |
| wanderer | holy | wave | motes rising, then rings thrown out |
| satyr | forest | wave | a wheeling swarm, then a spiral rising |
| samuraiCommander | fire | wave | arcs of force, then a rush of flame |
| sage | lightning | wave | a circle drawn, then a ward closing |
| cleric | holy | wave | wisps winding up, then motes rising |
| peasant | earth | wave | arcs of force, then rolling smoke |
| wolfBard | wind | wave | arcs of force, then a spiral rising |
| vampireLord | blood | wave | power dragged in, then streams drawn up |
| hemomancer | blood | wave | streams drawn up, then a rain from above |
| nightstalker | shadow | flurry | a wheeling swarm, then raking claws |
| bloodGargoyle | earth | wave | a clap of force, then slabs slammed up |
| dhampir | holy | storm | a rain from above, then a cross cut |
| warDrummer | lightning | wave | arcs of force, then a forked bolt |
| geomancer | earth | wave | slabs slammed up, then spikes bursting up |
| bellWarden | shadow | wave | a clap of force, then a crystal closing |
| falconer | wind | storm | a wheeling swarm, then raking claws |
| banneret | fire | wave | a wavering curtain, then rings thrown out |
| astralSphinx | arcane | wave | an eye opening, then a circle drawn |
| mirageDancer | wind | flurry | a wavering curtain, then a cross cut |
| plagueDoctor | poison | wave | a boiling bank, then rolling smoke |
| bombardier | fire | storm | a rain from above, then a great burst |
| astrologer | holy | storm | power dragged in, then a great burst |
| inquisitor | holy | storm | a spear from the sky, then rings thrown out |
| seraph | holy | storm | a shaft from the sky, then a clap of force |
| corsairSurgeon | forest | wave | a jet thrown up, then motes rising |
| harpooner | ice | flurry | chains closing, then spikes bursting up |
| seaReaver | water | blow | a jet thrown up, then a sweeping gust |

`test/blender-fx.test.ts` adds three tests: every kind with a show has its three stages on `STAGE_ART` (the right sheet, on the
caster or the struck, played once, the wind-up of its own weight, one element through all three); no two strikes pair the same
scenes in the same element, and the recipe's styles are the showcases' own; a sheet on the moment's layer is placed by its
frame's middle, the moment hands on the kind, and reduced motion holds one frame. `test/ult-stages.test.ts` passes untouched.

Pictures: `docs/samples/blender-fx/ult-<hero>-<width>.jpg` (two moments in each stage, in a real fight, taken with ULT-EPIC's own
`tools/ult-epic/stages.mjs`), and `ult-frames.png` (the strikes' own frames).

## Tests

`test/blender-fx.test.ts`: the manifest holds together (every frame inside its atlas, no blocks overlapping, anchors and
times sane); the atlases are in the repo and in the service worker's list; the pixel size; a clip's frames, loops, the
battery saver, reduced motion's held frame; a staged clip's stages; every spell has its sheets and leads with its own scene;
walls stand, what falls flies and lands, lines are laid tile by tile; the lights have their glow and the rest do not; the
rules are pure.

No older test pinned the painted look of a king's spell in a way this changes: the painted sheets and signatures are still
in the game as the look that plays until the rendered sheets have loaded, so their tests pass untouched.

## Pictures

- `docs/samples/blender-fx/spells-in-fight-393x852.jpg`: every spell cast in a real fight, three moments each (the sheet for the owner).
- `docs/samples/blender-fx/spells-360x780.jpg`, `spells-412x915.jpg`: every spell in a fight at the other two phone sizes, one moment each.
- `docs/samples/blender-fx/spells-frames.png`: the spells' own frames (a contact sheet from the pipeline).
- `docs/samples/blender-fx/library.png`: one of each of the 52 scenes.
- `docs/samples/blender-fx/ground-frames.png`: the ground loops' frames.
- `docs/samples/blender-fx/ground-in-fight-393x852.jpg` (and `-360x780`, `-412x915`): patches of each element and burning ground in a real fight.
- `docs/samples/blender-fx/reduced-motion-393x852.jpg`: seven spells with reduced motion asked for (each holds its one readable frame).

`node tools/blender-fx/shots.mjs` takes them (after `npm run web`), and `tools/blender-fx/shots_sheet.py` joins them.
