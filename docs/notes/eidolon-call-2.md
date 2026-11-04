# The Eidolon's call, second cut: the pass, the sprite and an attack that comes from somewhere (EIDOLON-CALL-2)

The owner, after blowing the horn for Askel: "I would like for it to have the summon's image come on screen and move across in a way that
represents who they are. Then it moves off screen and its attack happens, so the attack isn't blocked and you can see what happens. I also
want the attack to have more to its animation. Like, where does the fire come from?" And then: "If there are any sprites we can draw from
one of our sources, we should make a sprite version of the summons that actually perform the attack after the opening scene with the
summon." Branch `claude/eidolon-call-2` (from main 0.289.0). It changes the page only: the strike's rules and numbers (`sim/eidolons.ts`)
are untouched. It replaces the cinematic of [eidolons.md](eidolons.md) ("The page (batch 4)": the circle, the rift, the arrival, the
close-up and the lunge); the horn, the sheets and the riders are as they were.

## What plays now (`src/eidolonCall.ts`, `src/eidolonRules.ts`, `src/eidolonPass.ts`, `src/eidolons.css`)

`FULL` is about 4 s (it was 4.8), `SHORT` about 2.2 s. The shots (`SHOTS`, `shotAt`): **horn** (the horn swings up and is blown, as
before) · **pass** (the painting crosses the screen in its own way and leaves it; its name and attack stamped low over the heroes' rows,
its line beside a round portrait of its face) · **sprite** (its sprite comes onto the board from the side the painting left by) · **build**
(the source of its attack flares and the element runs from there to every foe standing) · **strike** (the sim's strike lets through on the
first beat, the hit-stop, a soft flash, the shake; the element rises over each foe struck) · **after** (scorched, frosted or broken ground
with embers, steam, sparks, dust or smoke drifting off; the sprite leaves) · resume.

| | `FULL` (ms) | `SHORT` (ms) |
|---|---|---|
| HORN | 0 | 0 |
| PASS to EXIT | 380 to 1720 | 0 to 850 |
| SPRITE | 1720 | 850 |
| BUILD (no sprite: from SPRITE, `buildAt`) | 2250 | 1150 |
| STRIKE (beats every 240 / 220) | 2720 | 1450 |
| AFTER | 3450 | 1800 |
| RESUME | 3950 | 2200 |

**The strike never lands while the painting is on the screen** (`STRIKE >= EXIT`, and each pass begins and ends off the screen at all three
phone sizes: tested). The trail, the runs, the sprite and the aftermath are drawn on a layer of the cinematic framed with the board's
picture (`.ecBoard`, given the same scale about the same point as the canvas in `frameBoard`), so they stay on their tiles through the push
in and the snap zoom. A tap skips to the strike (`skipTarget`: never before the painting has gone, never past the strike; the first call of
each Eidolon still cannot be skipped, as before). The choreography's first beat is now always the one on the foes (`CHOREO`), the others its
aftershocks.

## How each moves (`PASS`), and where its attack comes from (`SOURCES`)

The pass is data: a path (screen shares, its heights from the ground line the page gives: the foes' rows, a little towards the heroes), a
gait (`passPose`: the bob or leap curve and the lean), its size, the number of leaps or steps, its facing, its trail (`marksOf`: a mark at
each footfall for the gaits that touch down, else evenly).

| Eidolon | How it crosses | Its trail | The attack's source |
|---|---|---|---|
| Askel, the Cinderhound | bounds in from the right in six long low leaps over the foes and out to the left, nose up rising and down landing | a burning paw-print at each footfall, an ember wake | the prints flare; then the hound sprite runs back on and **breathes his fire** across the foes, the flame racing along the ground to each one and bursting |
| Nivra, the Rime Wyrm | slithers in from the left in slow rolling waves, a coil gliding just over the ground, out to the right | a frost wake | the wyrm sprite comes down onto the board and breathes frost: ice creeps from it to each foe and spears up |
| Aurelan, the Lion of Dawn | strides in from the left, mane blazing, and leaps up out of the top of the screen | sunfire at his footfalls | the sky he leapt into: lances of light fall from where he vanished, the lion sprite roaring on the board below |
| Voltara, the Copper Goddess | floats across high from the left, swaying | copper sparks hanging in the air | the sparks: lightning leaps from spark to spark, then down onto each foe (no sprite) |
| Gorm, the Quarry Titan | stomps in from the left in heavy lurching steps (a thud of the screen at each), out to the right | the ground cracking at each step | the golem sprite walks on and slams: cracks split from its fists to each foe, stone bursting up |
| Vaelkhar, the Dragon King | dives from the top right, sweeps low with his shadow under him, climbs out of the top left | his shadow | the dragon sprite comes down over the field and pours a torrent of black fire over the foes |

The runs (`.ecRun`): a streak drawn out behind a racing head of the element's pack strip, each Eidolon's own (`run-race`, `creep`, `lance`,
`arc`, `crack`, `torrent`). The pack strips are the effects already in the game (`src/art/fx/vfx/`, `fx/magic/`: flame, sparkles, ice puffs,
pillar of light, lightning, earth burst, dark smoke, dark circle), played by steps; no code-drawn art beyond the glows and streaks.

## The sprites on the board (the owner's addition; `SPRITES`, `spriteFrame`, `spritePlace`)

After the painting has gone, the sprite comes on from the side it left by (`comes`: running along the ground, or a flier down from the
top), stands beside the foes (a runner, so it breathes or strikes across them) or in front of them (a flier), winds up through its
build-up, **its attack frame is the strike** (`hitAt`; a breath opens a little earlier, `lead`, so its flame has reached the foes as the
damage lands: `breathReach` is 1 at the strike, tested), and goes back the way it came (Askel leaps away on his leap row), fading by the
resume. It faces the way it goes, and the foes while it attacks. Placed by the clock, so a skip finds it where it should be.

| Eidolon | Sprite | Source |
|---|---|---|
| Askel | `src/art/eidolons/sprites/askel.png` (111 x 97, rows run, breath, idle, leap; six frames each) and his flame `askel-breath.png` (three frames, drawn from the mouth across the foes) | the owner's Gemini sheet, `art-source/eidolons/gemini/askel-sheet-gemini.jpg`, cut by `tools/eidolon-call-2/cut_askel.py` |
| Nivra | `sprites/nivra.png` (72 x 114, three frames) | whtdragon's MV large Asian dragon, its silver-white colour, cooled to ice blue (`cut_sprites.py`) |
| Aurelan | `sprites/aurelan.png` (48 x 48, three frames walking right) | whtdragon's MV golden lion |
| Voltara | none | no pack has a copper goddess: her attack stays effect-only, from her sparks |
| Gorm | `src/art/units/golem_stone.png` (already in the game, walk and attack rows) | the Craftpix golems |
| Vaelkhar | `sprites/vaelkhar.png` (120 x 120, three frames) | whtdragon's MV big dragons, the black one with burning wings, its fire turned violet |

**Askel's cut** (`cut_askel.py`): the magenta keyed out with a tolerance (`min(R, B) - G`, so the JPEG's pink halo goes and the fire's
yellows stay), brought down by 4 a block at a time (a block is solid if most of it is, its colour the mean of its solid pixels; hard alpha,
crisp edges; the last pink tint on an edge taken out), every frame centred on the hound's body (its dark pixels, not the flaming tail) and
standing on one baseline (a row keeps its own heights, so the leap stays in the air). The three breathing frames had the hound's rear cropped:
the hound is made whole from the breath row's third frame (its rear only, so no legs are doubled) under the breathing head and shoulders,
matched at the snout and the feet, and the flame is cut out as its own strip, its root at the left middle.

The three-frame pack sprites use their one row for walking and attacking (the attack the same frames, its blow on the last, with a lunge).

## Reduced motion, battery saver, no flicker

Reduced motion (`.still`): the painting fades in where it would be mid-way and out again, held still; the trail is laid at once; the runs
appear as streaks without a racing head; no wake, shake or snap; the strips hold their first frame. Battery saver: fewer wake motes
(`wakeRate`), runs to at most five foes (`maxRuns`), one drift a foe. Nothing loops a brightness (the looping strips only step their frames;
`test/no-flicker.test.ts` passes).

## For generated art, later

Voltara has no sprite. Prompts in the style the owner used for Askel (each "pixel-art sprite sheet, side view facing right, 4 rows x 6
frames on a flat magenta #FF00FF background, consistent size and baseline, row 1 idle, row 2 move, row 3 a special move, row 4 the attack"):

- **Voltara, the Copper Goddess**: a tall woman of polished copper and brass clockwork, a blindfold of riveted copper, copper coils and rings
  orbiting her, arcs of blue-white lightning between her raised hands; row 2 floating forward a little above the ground, robes of copper
  wire trailing; row 3 rising with arms spread, the rings spinning; row 4 hands thrust forward, a bolt of lightning leaving them to the
  cell's edge (the bolt separable from her).
- **Nivra, the Rime Wyrm**: a long serpentine dragon of translucent ice scales, pale blue and white, frost smoke round her; row 2
  slithering in waves; row 3 rearing up in a coil; row 4 a breath of frost and ice shards from her jaws to the cell's edge.
- **Aurelan, the Lion of Dawn**: a great golden lion with a blazing sunburst mane, light streaming off him; row 2 a proud trot; row 3 a
  leap upward; row 4 a roar, a burst of sunlight from his jaws.
- **Gorm, the Quarry Titan**: a hulking golem of grey quarried stone blocks with glowing orange cracks and moss, one fist a boulder hammer;
  row 2 heavy stomping walk; row 3 raising the hammer; row 4 slamming the ground, rocks bursting up in front of him.
- **Vaelkhar, the Dragon King**: a black-scaled dragon with violet glowing cracks, great tattered wings and a crown of horns, a dark halo;
  row 2 flying with wing beats; row 3 a dive; row 4 a torrent of black-violet fire from his jaws to the cell's edge.

## Tests

`test/eidolon-pass.test.ts` (5): every Eidolon has its own gait and trail and a source; each pass starts and ends off the screen and is on
it mid-way, at 393x852, 360x780 and 412x915 and three ground lines; the strike after the pass; every pass leaves at least two marks on the
screen, laid while it is still on it, and the runs start from the trail or from where it left (Aurelan's from the top); the gaits leap or
plod as they should; saver and reduced motion draw less; the sprites come on only once the painting has gone, never show the blow in the
wind-up, attack through the strike (Askel's flame full at the strike), and are gone by the resume; Voltara has none; the sheets are
credited. `test/eidolon-moment.test.ts` updated for the owner's new requirement (the beats are now horn, pass, sprite, build, strike, after,
resume, about four seconds; the skip goes to the strike; the first beat is on the foes).

## Checked

`npm run typecheck`; `npm test -- eidolon horn flicker` (34 pass); the full `npm test` after merging main 0.290.0 (1944 pass, 0 fail);
`npm run web`. `tools/eidolon-call-2/shots.mjs` (port 9061, the clock stepped by hand: every animation seen is stepped, as a paused one still
in its delay is not listed by the page, and a cancelled one is left alone; `DEBUG=1` lists what of the layer shows) and `strip.py` join the
frames: `docs/samples/eidolon-call2-<id>-strip.png` for all six (horn, the pass at three points, the sprite coming on, the build-up, the
impact, the aftermath, the fight running again), the key frames of Askel's at 393x852 (`eidolon-call2-askel-{pass2,sprite,build,impact,after}.png`),
Askel's strip at 360x780 and 412x915 (and Vaelkhar's at 412x915), the short one, reduced motion, battery saver, and
`eidolon-call2-askel-sheet.png` (the cut sheet and its flame). No page errors, no missing files, no sideways overflow.
