# The Eidolons' ground show, staged in Blender (EIDOLON-BLENDER)

The owner, after the trial below: **the hybrid**. Each Eidolon keeps its painting for the figure, its name stamp and its line; Blender
stages everything round it (the sigil, the pillar, the strike across the ground, the scorch, the aftermath). Askel the Cinderhound is
the first, in the game from this branch (`claude/eidolon-blender`, with main 0.496.0 merged in). The other five follow, one push each:
Nivra, Gorm, Voltara, Aurelan, Vaelkhar.

## Askel in the game

The owner, on the first wiring: "remake the blender effects for the eidolon if needed. make it have force. make it epic." So the
Blender pieces were remade as large hero pieces and laid with main's painted strike, not instead of it. Judged against main side by
side over three full passes (`docs/samples/eidolon-blender/askel-game-before-after.webp`): bigger and harder than main at every beat
from the pillar on.

The show is cut into sheets the page lays by the board's own tiles, so it follows a board that is turned or not flat, in two layers
(`tools/blender-fx/eidolons/parts.py`, finished by `parts_finish.py`: the heroes' pixels, 32 colours shared by all, hard alpha, and a
soft glow sheet under the two big pieces):

| Sheet | Frames | What it is | Layer |
|---|---|---|---|
| `askel-stage-sigil` | 22 of 160 x 96 | burns on round its ring and inward, glows, cools and fades | the ground, under the fighters |
| `askel-stage-cracks` | 12 of 256 x 136 | a shock ring racing out and the ground cracking open white-hot, then red, then dark | the ground, under the fighters |
| `askel-stage-scorch` | 8 of 88 x 48 | a patch of burnt ground, its coals cooling, then fading | the ground, under the fighters |
| `askel-stage-pillar` (+ glow) | 16 of 144 x 352 | the pillar: the ground bursts, a white core, ragged tongues twisting up 12 tiles, rock thrown, torn away | over the fighters |
| `askel-stage-explosion` (+ glow) | 16 of 320 x 300 | the blow: a white-hot core blown out with spikes of flame, a wall of fire wider than the screen in three ranks of tongues, rock and embers thrown, heavy smoke rolling off it | over the fighters |
| `askel-stage-fire` | 14 of 64 x 112 | a tile catching fire: thin pointed tongues | over the fighters |
| `askel-stage-smoke` | 16 of 128 x 176 | a heavy column of smoke | over the fighters |
| `askel-stage-embers` | 12 of 160 x 200 | embers falling, a loop | over the fighters |

**459,842 bytes** in all (the explosion 246,542 and its glow 32,430; the pillar 92,128 and its glow 16,832; the sigil 35,158; the
cracks 16,528; the rest under 10 KB each). The largest sheet is 2560 x 600, inside any phone's texture limit. They load by URL from
`src/art/eidolons/fx/`, which `build.mjs` already copies and lists in the service worker's `FILES`, so they play offline.

**Making it smaller** (after 0.501.0, which shipped 520,144 bytes). Two things were tried on the explosion, the largest sheet:
- **Lossy WebP: not kept.** The sheet is 32 flat colours, which lossless packs well and lossy does not: at quality 90 the file is
  larger (365,172 bytes against 299,452), at 85 barely smaller (283,426), and only at 75 a real saving (203,538), where the flames'
  hard pixels visibly soften (`docs/samples/eidolon-blender/askel-explosion-lossless-q90-q75.webp`: lossless, 90 and 75, top to
  bottom, at twice the size).
- **Fewer frames: kept.** It is rendered as 20 frames and shipped as 16: every frame of the blast itself, two in three of the long
  burn and the smoke after it, where one frame is much like the next. 60,314 bytes off (the sheet and its glow), and matched stills
  of the cast cannot be told apart (`askel-explosion-20-vs-16-frames.webp`: 20 above, 16 below). The palette is still taken from all
  20, so no other sheet changed by a byte.

**What plays.** Askel's call stays **5.0 s** (`EIDOLON_MS`, unchanged: the show fits, and its smoke, embers, cracks and coals carry on
over the fight after it; nothing in its beats, the sim or the speed rule changed):

| Stage | Main's, kept | Blender's |
|---|---|---|
| The horn (0 to 0.46 s) | the horn blown, the dim | the **sigil** burns onto the ground where the hound will come on, under the fighters |
| The pass (0.46 to 2.06 s) | the painted Askel, its name, title and line, its bounding run, out to the left | the **pillar** bursts out of the sigil (0.95 s, with its glow, the ground **cracking** under it and a rumble) and the painting **leaps out of it**, white-hot then itself |
| The sprite and the build-up (2.06 to 3.26 s) | the sprite hound runs on and breathes, the charge closes | **fire crosses the foes' ground** tile by tile from its jaws; the field is **darkened hard** just before the blow |
| The strike (3.26 s, with the 0.26 s freeze) | the hit-stop, the snap zoom, the shockwave ring, the painted great burst, the painted walls of fire, the wave and firestorm, the aftershocks, the embers flung | a **hard white flash** (0.95, was 0.55 tinted), the **explosion**: its white core already blown out in the frozen frame, then its wall of fire behind the painted walls, wider and taller than them; the ground **cracks open** and glows under the foes; a harder, longer **shake** (1.5 for 0.76 s, was 0.8 for 0.52 s); a **second and third detonation** to either side on the attack's later beats, each with a thud |
| The aftermath (4.13 s on) | the painted wall left burning, the wash | **heavy smoke** rolls up along the wall (five columns), **embers fall** across the field, the ground is left **scorched** with coals cooling, the cracks go dark, the sigil cools; all of it fades over the fight running again |

**Two layers, following the board.** The sigil and the cracks are laid like the game's painted ground loops (`GroundPaint`): once for
each diagonal row of tiles they cover, cut to that row's tile tops and drawn just after them, so the fighters stand over them. New
here (`render/groundSheet.ts`): tiles of another height take their own copy, moved by their height, so they bend over a hill or a pit.
Each scorch patch lies on its tile's own ground layer. The standing pieces are strips on the call's own layer (`stageSheet.ts`), each
on its tile's place on the page. Nothing has a facing baked in: the wall runs across the screen, the fire crosses whichever way the
foes lie.

**The short call** (2.2 s, on Auto or with full calls off): the sigil is there from the start, the pillar burns in 0.57 s, the blow
and one more detonation, fewer burning tiles and smoke columns. **Battery saver**: fewer tiles, two smoke columns, one fall of embers.
**Reduced motion**: every strip holds its steady frame and fades (the layer's own rule), the sigil and the cracks are one steady frame,
the painting fades in held still; no smoke, embers, flames before the painting, shake or rumble, and the field is not darkened hard
before the blow (it keeps the lighter dim every call has, so nothing goes nearly black and comes back:
`askel-reduced-dim-before-after.webp`).

**Where things are.** `src/eidolonStage.ts` (pure: the sheets' shapes, `sigilFrame`, `sigilSpot`, `risePass`, `wavePlan`,
`scorchFrame`, `cracksFrame`, `BLOW`, `BLOW_FEEL`, `DETONATIONS`, the budgets; `STAGED` has Askel only, so the other five play exactly
as before). `src/render/groundSheet.ts` (the ground player) and `src/stageSheet.ts` (the strip player, rows of frames and glow sheets
too): small and apart, so the general frame-sheet player (`claude/blender-fx`) can take them over. `src/eidolonCall.ts`: `stageFor`,
`stepStage`, `stagedLead`, `stagedStrike`, `stagedBlow`, `stagedDetonation`, `layCracks`, `dropStage`, and the painting's rise in
`pass`. `src/render/fx.ts`: the Eidolons' riders show their names over the heroes ("Kindled", "Stone skin", "Life drain") where the
raw keys ("eidolonWarm"...) showed. `test/eidolon-stage.test.ts` (eleven tests).

**The three passes.** One: the explosion, cracks, pillar, smoke and embers wired in; the glow sheets showed as dark boxes (they were
black-backed light on a layer that could not blend) and the wall was a row of big clean cones. Two: the glow made see-through light,
the wall rebuilt from three ranks of thinner tongues; bigger than main everywhere but still clean-edged. Three: the fire's cut raised
so its turbulence tears the outlines ragged, and the wall moved behind the painted walls so their detail shows against it.

**Honestly.**
- The Blender fire is tongues built from cones with turbulent, torn edges. It is large, sharp and bright, but it is streakier than
  painted fire; up close a tongue still reads as a spike. The painted walls in front carry the fine detail.
- 460 KB is a lot beside the first version's 120 KB; the explosion is most of it, and lossy packing does not help it (above).
- The blow lays more at once than main's (the explosion and its glow, two detonations, five smokes, three ember falls, the lead-in
  fires) on top of the painted strike. It ran without trouble in the captures; a slow phone has battery saver.
- The sigil is dim while the horn sounds: it lies under the call's dim, with a glow put back over it.
- The Last Stand's hall has no tile ground layers, so there the sigil, cracks and scorch are left out and the standing pieces play.

**Checked.** `npm run typecheck`, the full suite, `npm run web`, and the whole cast captured in a real fight (the Orc Warband's last
wave) at 393 x 852, 360 x 780 and 412 x 915, with the short call and reduced motion at 393 x 852 (`docs/samples/eidolon-blender/`):

- `askel-game-393.webp`, `-360`, `-412`: the whole cast, animated; `askel-game-<size>-strip.webp`: twelve stills of each.
- `askel-game-before-after.webp`: main's call above, the staged one below, at the same moments.
- `askel-game-short-strip.webp`, `askel-game-reduced-strip.webp`.

```bash
pip install bpy
python3 tools/blender-fx/eidolons/parts.py <parts>                     # the pieces, about five minutes (PART=explosion picks one)
python3 tools/blender-fx/eidolons/parts_finish.py <parts>              # the sheets, into src/art/eidolons/fx/
npm run web && STEP=84 END=6720 PORT=9071 OUT=<shots> node tools/blender-fx/eidolons/shots.mjs [--size 360x780] [--short] [--reduced]
python3 tools/blender-fx/eidolons/cast_samples.py <shots> <main's shots> docs/samples/eidolon-blender
```

**For the next five.** Each needs its own sheets (its sigil's design, its element's pillar, blow, ground break, tile piece, ground
mark and what drifts off it) and one entry in `STAGED`; the page's side is shared, and each keeps its painted strike. Ice, stone and
light need a second material beside the fire's (solid shards and rock that catch the light; the prototype has both).

---

# The trial that led to it: the fire Eidolon as one Blender scene

The owner: "lets try a pass with the eidolons in blender too to see if we can improve them. start with the fire one." And the casts are
to feel epic and last 4 to 10 seconds (the timing and the slow-down are another builder's, ULT-EPIC; nothing here touches them).

**This was a trial to look at.** Nothing in it is wired into the game; the hybrid above is what shipped.
Branch `claude/eidolon-blender`, from `claude/blender-fx` (the Blender prototype and the pixelated finish the owner chose).

## What to look at (`docs/samples/eidolon-blender/`)

- `askel-cast.webp`: the whole cast, 8 seconds at 12 frames a second, laid over a real fight at 393 x 852 (the Orc Warband's last wave).
- `askel-stages.png`: eight stills of its stages, at twice the size so the pixels show.
- `askel-today-vs-blender.png`: today's Askel against this one, the figure and the strike.
- `askel-today-frames.png`: today's cast frame by frame (every 300 ms of its 4 seconds), for reference; `plate.png` is the fight the
  frames are laid over.
- `askel-sheet.webp` and `askel-glow-sheet.webp`: what would ship (below).

## Today's fire Eidolon

Askel the Cinderhound (`docs/notes/eidolons.md`, `eidolon-call-2.md`, `eidolon-fx.md`): about 4 seconds. The horn, the painted figure
passing over the board with its name and line, a small sprite of the hound running in, its breath, then the great burst, the walls of
fire over each foe and the fire left on their ground. Its pieces are a painting (900 px), a 24-frame sprite sheet and painted spell
sheets, moved by the page.

## The Blender show (8 seconds, one scene)

`tools/blender-fx/eidolons/askel.py` stages it all in one scene, from the game's camera (orthographic, 30 degrees down, turned 45), in the
game's tiles, so everything lies on the ground as the board does:

| Time | Stage |
|---|---|
| 0.15 to 2.25 s | **The wind-up.** A sigil (two rings, runes, three fangs, a hound's eye) burns onto the ground round its ring and inward, white-hot where it is being drawn; small flames catch along it; embers spiral in to the middle; the ground's glow grows. |
| 2.25 to 3.45 s | **The arrival.** A pillar of flame nine tiles tall with a ring of force; the hound comes up out of the ground inside it, rearing, as the pillar thins. |
| 3.45 s | **The slam.** Its forefeet come down: a white flash, a second ring, sparks thrown. |
| 3.65 to 4.3 s | **The howl.** Head thrown back, jaws open, the cracks in its hide blazing. |
| 4.45 to 5.8 s | **The strike.** It braces and breathes a torrent of fire, swept across the foes' ground from one side to the other; the ground blackens under it and catches fire behind it. |
| 6.15 to 8 s | **The aftermath.** The hound burns away to embers from the edges in; smoke climbs off the burnt ground; embers fall; the fires die, the coals cool and the sigil dulls and fades. The last frame is empty. |

The hound is modelled from simple shapes (about four and a half tiles to its ears, so it towers over the heroes): black rock, cracked,
the cracks running with lava and blazing harder as it howls and breathes (lit from within), a mane and a tail of flame, burning eyes,
fangs and a fire in its throat.

**The finish** (`finish.py`, the owner's choice from `tools/blender-fx/README.md`): frames are rendered at 450 x 630 and shrunk to
300 x 420, the heroes' pixel size (a hero's pixel is about 1.4 of the board's); cut to 24 colours shared by the whole show; the alpha
hardened (bright pixels are there or not; the dark smoke and scorch keep three flat steps of see-through so the ground shows); and the
brightest parts keep a soft glow underneath, as light on the screen.

**Looked at and redone** (the first render is never the good one): three quick passes of ten frames and two full renders. What changed
between them: the hound was a third of its size and its hide a mesh of white cracks (a giraffe); it stood with its jaws already over
the foes, so the breath left the screen; the scorched ground was a hard wedge and showed before the breath; the ground's glow became a
solid disc that hid the heroes; the rock speckled (the render is now denoised); the head was too small to read; the smoke was peppered.

## Honestly: better and worse than today's

**Better**
- **It is a show with a shape.** Wind-up, arrival, slam, howl, strike, aftermath: eight seconds that build, where today's four are
  separate pieces cut together. This is what the owner asked the casts to be.
- **It belongs to the board.** The sigil, the rings, the breath, the burnt fan and the fires all lie on the ground at the board's own
  angle, and the fire lights the hound. Today's figure and bursts are flat pictures laid over the screen.
- **One hound.** The same creature rises, howls, breathes and burns away. Today a painting passes and a small sprite does the work.
- **Things today's has none of:** the sigil being drawn, the rising out of the pillar, the hound burning away, the scorch and coals.
- **Cheap to change.** A time or a size is a number in the script; all 96 frames re-render in about ten minutes on four CPU cores.

**Worse**
- **The hound is a worse drawing.** Today's painted Askel is a far better picture of a hound: fur of cinders, a real snarl, weight.
  This one is built from balls and cones; it reads as a great beast with ears, jaws and a tail of flame, but closer to a hyena or a big
  cat, and its hide is busier than the painting's (too much orange line, not enough black). At hero pixel size its face is a few pixels.
- **The strike has less force.** Today's blow fills the foes' half with a white flash, a bloom, a great burst, walls of fire and
  numbers. The Blender breath is a rolling cloud that reads as soft, lumpy fire, and it has no flash, hit-stop, shake or snap zoom
  (those are the page's, and would be added when wired).
- **No close-up, name or line.** The name stamp and the spoken line are today's best beat; this trial does not replace them, and the
  painting should stay for them.
- **Fire made of noisy shells, not simulated flame.** Good as pixels, but the pillar and breath are blobby in places.
- **It hides the heroes.** The sigil lies under the heroes' feet and the hound stands just behind them, drawn over everything as
  today's cast is. Wired in properly it would be two layers (the ground's under the fighters, the hound and fire over them).
- **The ground is flat.** The scene assumes level ground; this battlefield is a low dome, so the far edge of the sigil floats a few
  pixels. A tall hill or a pit under it would show.
- **One facing.** It is rendered for this fight's lie (the foes down and to the right). An army section turned another way would need
  the sheet mirrored, or a second render.

## If it shipped

- `askel-sheet.webp`: the 96 pixel frames, 3600 x 3360, lossless: **818,260 bytes**. `askel-glow-sheet.webp`: the glow at a quarter
  size: **30,626 bytes**. About 849 KB together, against about 523 KB for today's six Askel files, and about 1.1 MB for everything
  under `src/art/eidolons/` today. Six Eidolons at this size would be about 5 MB more for the offline cache.
- Ways to make it smaller: 10 frames a second (a sixth off), cropping each stage to its own box (the wind-up and aftermath are mostly
  empty), or splitting the hound (a small loop) from the ground effects.
- A 3600 x 3360 texture is large for a phone's GPU; it would be cut into two or three sheets or drawn on a 2D canvas.
- Wiring is its own job (and needs ULT-EPIC's timing): the frames drawn at the hound's tile through the board's projection in two
  layers, the page's flash, hit-stop and shake at 3.45 s and 4.45 s, the sim's strike let through at the breath, the name and line kept
  over the howl, a short version for the setting, and a still one for reduced motion.

## What the other five would take

The stage (camera, sigil, embers, rings, scorch, smoke, the finish and the samples) is shared; each Eidolon needs its own figure, its own
element's material and its own strike. Roughly a half to a full day each at this quality, most of it on the figure:

- **Nivra the Rime Wyrm** (ice): a long body along a curve is easy; ice is solid and catches light, which Cycles does well (the
  prototype's ice spikes were its best effect). Likely the strongest of the six.
- **Gorm the Quarry Titan** (earth): blocks of rock are what simple shapes do best; stone spires and dust. Easy and should look good.
- **Voltara the Copper Goddess** (lightning): bolts are easy (the prototype has them); a human figure is the hardest thing to model
  from simple shapes. The risk is the figure.
- **Aurelan the Lion of Dawn** (light): a lion has the hound's problem (a face and a mane to read at a few pixels); light shafts are easy.
- **Vaelkhar the Dragon King** (dark): wings, horns and a long neck: the most modelling. Dark fire is the fire here recoloured.

**A suggestion.** The weak part is the modelled figure and the strong part is the staged ground show. A mix may be the best of both:
keep each Eidolon's painting (and its sprite) for the figure, the name and the line, and use Blender for what it does well: the sigil,
the pillar, the breath on the ground, the scorch and the aftermath, lit and laid at the board's angle. Or have the figures painted
(a ChatGPT sheet per Eidolon from the game's camera angle) and the ground show rendered round them.

## Re-rendering

```bash
pip install bpy
npm run web && PORT=9071 OUT=<shots> node tools/blender-fx/eidolons/shots.mjs      # today's cast, the plate and plate.json
python3 tools/blender-fx/eidolons/askel.py <frames>                                 # about ten minutes; STEP=8 SS=1 for a quick look
python3 tools/blender-fx/eidolons/finish.py <frames> <shots> docs/samples/eidolon-blender
```

What ran for this trial: the three scripts above (two full renders and three quick passes), and the samples looked at by eye. No
typecheck, build check or tests were needed: nothing in `src/` changed (`npm run web` was run only to take today's pictures).
