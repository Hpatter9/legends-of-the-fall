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
