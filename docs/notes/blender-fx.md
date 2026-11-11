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
| The 45 ultimates and the Eidolons | Waiting for ULT-EPIC (their length and stages are changing); the staged effects are ready for them |
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
