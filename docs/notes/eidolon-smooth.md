# EIDOLON-SMOOTH: an Eidolon's call, kept smooth on a slow phone

The owner: "I meant the summons attack animations of the Eidolons." The slowdown felt is the call in a fight: the War Horn's
strike with its staged ground show (EIDOLON-BLENDER, `docs/notes/eidolon-blender.md`). Looks only; the same call, the same
pieces at the same times; the simulation is not touched.

## Measured first

`tools/eidolon-smooth/measure.mjs` plays each of the six calls in a real fight (the Orc Warband's boss wave, the horn full) at
393x852 with the page's CPU throttled four times. It keeps every frame's time and every long task, for four seconds of the
fight alone and then from the horn until the call is over and the fight has run on a second. It also counts what the board is
asked to draw each frame (draw calls, mask steps), names every picture handed to the graphics card with its time, and counts
the call's own pieces on the page at their most. `--trace` adds the browser's timeline (the style passes, how many elements
each, and what called for them); `--profile` names the functions (with `node build.mjs --plain --out out/web-plain` and
`ROOT=out/web-plain`; `WHO=<function>` names its callers); `ROOT=<folder>` measures another build.

**What was dear, in the order found:**

1. **A mask for every row of tiles under the sigil and the cracks, every frame.** `GroundSheet` drew the whole picture once for
   each diagonal row of tiles it covers (and each height), each through a mask of its own: a stencil pass set up and taken
   down. A call took the board from 24 draw calls and 9 mask steps a frame to 150 to 290 draws and 160 to 340 mask steps
   (averaged over the whole call; more at the strike, when the cracks open).
2. **The whole page restyled for each piece of the call.** `body:has(#hallOfHeroes) #hmSheet *` asked the body about every
   descendant, so each strip put on the page (a call lays some 230 to 265) had every element's style worked out afresh: about a
   hundred whole-page passes a call. `#panel:has(#mergeAll…)` did the same to the fight panel at every change of the fight's
   rows inside it.
3. **Pictures handed to the graphics card in the middle of the call.** The sigil's and the cracks' sheets went up on the frame
   they first showed, and the heroes' aura atlas (768x2688) on the frame the first aura showed: 107 to 138 ms of a throttled
   frame for the atlas.
4. **Nothing ready for a horn that filled in the fight.** The staged sheets were fetched (not decoded) only when the horn was
   already full as the fight began. A horn that filled mid-fight called with none of them loaded; the ground's sigil, cracks and
   scorch were then left out of that call altogether.

Not dear, so left as they are: the camera's frames (a transform on the board's picture; `getBoundingClientRect` was 0.6 s of a
30 s throttled call), sound, and the number of pieces (already capped, and fewer on battery saver: `stageBudget`, `fxBudget`).

## What changed

- **`render/groundCutRules.ts`, `render/groundSheet.ts`**: each tile's top under a ground sheet is a small shape of its own
  carrying the picture's own part (cut to the picture's rectangle, a pixel over on each side as the masks were), so a row is
  one plain drawing with no mask, and a tile the picture never reaches draws nothing.
- **`eidolonWarmRules.ts`, `EidolonCall.warm`**: the chosen Eidolon's pictures (figure, card, its sprite and breath, the
  strike's strips, the staged sheets and their glows) are fetched and decoded when a new board is seen, its heroes still being
  placed, whether or not the horn is full; the ground's sheets are loaded then too.
- **`render/texReady.ts`'s kept sheets** now hold the Eidolon's ground sheets and the aura atlas: handed to the graphics card
  during the deploy, one a frame, and held through the fight.
- **The two rules**: `body:has(> #hallOfHeroes)` (the page's own children only), and a class on the panel (`#panel.canMerge`,
  set where the Auto merge button is shown) in place of `#panel:has(#mergeAll…)`.

## Before and after

Headless Chromium on a software renderer, four times CPU throttle, 393x852, one run each (`es-before2`/`es-after2` of the
session). The software renderer makes every frame slow, the plain fight included (100 to 140 ms a frame here), so the numbers
are for comparing, not what a phone shows; the fight's own frame is the measure to hold the call against.

| Eidolon | frame, mean | 95th | worst | call's length | draws a frame | mask steps |
| --- | --- | --- | --- | --- | --- | --- |
| Askel | 266 → 179 ms | 417 → 283 | 783 → 533 | 31.3 → 22.1 s | 148 → 52 | 160 → 30 |
| Nivra | 296 → 165 | 567 → 250 | 967 → 633 | 35.5 → 21.2 | 246 → 30 | 296 → 14 |
| Gorm | 288 → 162 | 500 → 267 | 900 → 883 | 34.8 → 21.7 | 287 → 31 | 344 → 12 |
| Voltara | 279 → 176 | 433 → 283 | 867 → 550 | 32.9 → 22.8 | 197 → 35 | 229 → 18 |
| Aurelan | 291 → 164 | 533 → 267 | 833 → 600 | 35.0 → 21.4 | 245 → 29 | 295 → 13 |
| Vaelkhar | 264 → 153 | 483 → 283 | 883 → 633 | 32.9 → 20.6 | 218 → 22 | 257 → 6 |

(The fight alone, same runs: 120 to 140 ms mean before, 100 to 127 after. The call's length is on the wall clock: the same
call, fewer slow frames. Every frame of both is a "long task" at this throttle on this renderer, so that count says nothing.)
Style work in a call: 4.3 to 5.6 s → 4.1 to 4.5 s, 223 to 268 → 186 to 199 elements a pass. Large pictures handed to the
graphics card inside the call: the sigil, the cracks and the aura atlas before; none of the three after.

`docs/samples/eidolon-smooth/<eidolon>-before-after.webp`: each call at 393x852, the old build over the new (the photograph
tool's clock drifts between two runs of the same build once the strike is near, so the columns do not line up to the frame;
the pieces are the same). `reduced-and-saver.webp`: Askel with reduced motion, Vaelkhar on battery saver.

## What is still dear, and not done

- **The call's pieces are DOM strips played by CSS steps** (some 250 at the most, 45 to 95 with a filter): each restyles
  itself every frame, about 4 s of style work in a throttled call, and each step repaints. Moving them to the board's own
  drawing would be a rewrite of `eidolonCall.ts`; not attempted.
- **Units' sheets handed to the graphics card mid-fight** (640x840 and 608x812: a hero's other form, a raised soldier): 35 to
  58 ms of a throttled frame each. A fight's matter, not the call's; it could join the kept sheets.
- **Worst frames** are down by a quarter to a third (Gorm's hardly: one 883 ms frame at its strike), not gone.
- Not measured on a real phone or a real graphics card; the mask and draw counts are exact, the times are this machine's.

# EIDOLON-SMOOTH 2: the call's strips drawn on canvases

The director: move the call's ~250 strips (page elements stepped by CSS, 45 to 95 with filters) off the page's style and layout.

## Where they went, and why not into the board's drawing

The call's layer lies over the whole page, HUD included (`.ecLayer`, z-index 55): its dim darkens everything and its pieces stand
bright over that dim and rise across the top bar. The board's own canvas lies under the HUD, so pieces drawn in it would pass under
the bar and be darkened with the board. So (the director's choice) the pieces are drawn on **2D canvases laid in the call's layer**,
among the elements that stay, in the order the elements had. No second WebGL context.

- **`callPieceRules.ts`** (pure): the stylesheet's animations as sums of a time: which frame a strip shows (`steps(5)`,
  `steps(n, jump-none)`, rows of a staged sheet), how solid it is (waits, fades, the reduced-motion hold), where its mover has
  carried it (debris, drifts, boulders, embers, the wake), CSS's cubic-beziers and keyframes eased between each two stops, and the
  CSS colour filters as matrices.
- **`callPieces.ts`** (pure): each piece as its look and its place at a time; one maker for each element kind it replaces.
- **`callCanvas.ts`**: the pictures held decoded; the drawing. A canvas is the page's size at the screen's sharpness up to 2
  (1.5 on battery saver), takes its pixels when it first has a piece and gives them back when it has none.
- **What covers what.** A piece goes on the host's last canvas unless the page has since put a *breaker* after it: a run, the
  great burst, an aftershock's burst, the Eidolon's sprite or its breath. Then it takes a new canvas over that. Other elements
  (soft lights and gradients) stay over the strips before them. A call uses up to seven canvases, a few at a time.
- **Glows and tints, made once.** A strip's `drop-shadow` is a picture of every frame's shadow alone (half size, with room
  round it), made as the Eidolon is warmed and drawn under the strip; the small strips' colour filters are worked into copies
  of their pixels; a staged glow sheet's `brightness(1.2)` likewise.
- **The clock.** The pieces run on the page's own time as the CSS animations did, stand still through the freeze on the blow
  (taking hold a frame after the blow, as the class that held the animations did) and run on while the call goes. The fight's
  speed is neither read nor written here.

**What stays elements** (about 80 at the most, where there were 225 to 265): the lights blended with the board (`mix-blend-mode:
screen`: pools, the gate, the charge, the bloom, shafts, mists, the dome and rays, the great burst, the aftershocks' bursts, the
shock ring), which a canvas cannot blend with the page under it; the plain gradients moved only by transform and opacity (scars,
dust, the maw); the two SVG lines; the words, bars, painting, sprite and breath; and the runs, whose heads must lie under later
runs' streaks. Of these only the burst, the ring, the eight aftershock bursts and the runs' heads still step a sheet by CSS.

## The look

`tools/blender-fx/eidolons/shots.mjs` now photographs on a clock wholly its own (the page's loop watch stood down, the freeze
held, a new animation shown at its start), so two builds can be held against each other frame by frame. Every strip was checked
to show the same frame in both builds (`CLOCK=1 WHAT=<sheet>`), and the pictures compared for all six, and for reduced motion and
battery saver: the same but for edge pixels (a canvas smooths a scaled edge a little differently) and the fight's own moving
parts. `docs/samples/eidolon-smooth/<eidolon>-canvas.webp` and `reduced-and-saver-canvas.webp`: 0.631 over this.

Three things found on the way and kept as they were: a strip that waited comes on fully solid whatever its own opacity (the smoke
is not see-through, nor the firestorm); the smoke and embers are cut at once when the call goes (measured on the page: the
stylesheet's 1.1 s fade never took hold); with reduced motion a flare stands on its first frame.

**Known differences.** On a screen sharper than 2x the strips are drawn at 2x and scaled (they were at the screen's own
sharpness). A glow's width does not follow a strip's own small scaling (a tile's fire at 0.7 to 1.05 of its size has the glow of
one at 1). The staged glow sheet's 3 px blur is left out (it is a quarter-size sheet shown smoothed already).

## Before and after

As above: headless, software renderer, 4x CPU, 393x852, one run each, against 0.631 (which has EIDOLON-SMOOTH's first fixes).

| Eidolon | elements at most | style work in a call | elements a style pass | frame, mean | 95th | worst |
| --- | --- | --- | --- | --- | --- | --- |
| Askel | 230 → 78 | 5.0 → 3.5 s | 185 → 120 | 206 → 213 ms | 300 → 333 | 533 → 450 |
| Nivra | 262 → 84 | 5.1 → 2.9 | 195 → 105 | 210 → 189 | 350 → 350 | 767 → 450 |
| Gorm | 262 → 83 | 4.3 → 2.6 | 180 → 92 | 182 → 158 | 317 → 267 | 617 → 550 |
| Voltara | 258 → 108 | 4.7 → 2.5 | 191 → 104 | 201 → 174 | 317 → 250 | 633 → 467 |
| Aurelan | 225 → 84 | 5.1 → 2.7 | 194 → 106 | 208 → 152 | 333 → 233 | 933 → 500 |
| Vaelkhar | 265 → 86 | 4.6 → 2.4 | 200 → 86 | 172 → 144 | 300 → 250 | 733 → 500 |

The board's own draws a frame are as they were (19 to 41 in a call). Style work is down by a third to a half, the worst frame by
a tenth to nearly a half; Askel's mean frame is no better (213 against 206, inside one run's noise). The 2.4 to 3.5 s of style
left is mostly the fight's own HUD (its rows are restyled every frame, call or no call), not the call. On this machine the 2D
canvases are drawn by the processor, which a phone's graphics card does: the frame times here undersell or oversell that, and
nothing was measured on a phone.

## The fighters' sheets

`render/texReadyRules.ts` (`fighterSheets`, `regroup`), `texReady.ts` (`keepGroup`): each fighter's sheet and its view from behind
are among the kept sheets, named afresh for each fight (the last fight's are let go). A fighter turning its back for the first
time no longer has that sheet handed to the graphics card mid-fight. Memory: about 2.1 MB a sheet; five heroes and four kinds of
foe with their views from behind are 18 sheets, 38 MB, all of which the fight would come to hold anyway once each had turned. Not
covered: a fighter that arrives mid-fight (a summon, a hero's other form): its sheet still goes up when it is first drawn.
