# The fire Eidolon, staged in Blender (EIDOLON-BLENDER, a trial)

The owner: "lets try a pass with the eidolons in blender too to see if we can improve them. start with the fire one." And the casts are
to feel epic and last 4 to 10 seconds (the timing and the slow-down are another builder's, ULT-EPIC; nothing here touches them).

**This is a trial to look at, not a release.** Nothing is wired into the game: no change to `src/`, the version or the updates list.
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
