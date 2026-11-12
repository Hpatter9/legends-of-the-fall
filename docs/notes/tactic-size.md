# TACTIC-SIZE: the tactic plaque is compact, and its size is pinned

Branch `claude/tactic-size`, from main 0.502.0. The owner: "the tactic button is huge now for some reason in a wave". The version is
unchanged.

## What was found: it did not grow; it was shipped too big

The plaque could not be made to grow. It was measured in real waves on 0.486.0 (the release that shipped it under the spell row) and on
0.502.0, at 393x852, 360x780 and 412x915, by sampling its box every 100 ms through the whole wave (`tools/tactic-size/shots.mjs`):

| Moment | 0.486.0 | 0.502.0 |
| --- | --- | --- |
| A late save's wave 5, Auto off | 95 x 71 px | 95 x 71 px |
| A boss wave, each ultimate fired by hand so its whole scene plays, then both Autos on | 95 x 71 | 95 x 71 |
| A fresh save's party, wave 1 | 95 x 71 | 95 x 71 |
| Every text of the page a third larger (a phone's larger text) | 95 x 71 | 95 x 71 |
| A duel | 95 x 71 | 95 x 71 |

At every width the least and the greatest box seen were the same, 95 x 71 px, and nothing on the plaque or above it in the page carried a
transform, a zoom or a scale (the body's own `translateZ(0)` is the identity). The suspects were each looked at:

- **A rule now matching it.** No style sheet rule that names `#tacticBtn`, `.fhTactic` or `#tacticDock` changed between 0.486.0 and
  0.502.0, and none of the 105 lines of CSS added since can match it.
- **The painted buttons' sheet order.** `paintedButtons.css` and `paintedDeployment.css` give it its plate and a least height of 44 px;
  its own rule, an id deeper, set the size. Unchanged.
- **An ultimate's push-in, the showcase's dim, the camera's zoom.** These move and scale the board's canvas, never the page. The plaque
  is a child of the body, outside the canvas; through 59 to 104 samples a size with an ultimate's scene up, its box did not change. (The
  scene's band and dim lie over it for that moment.)
- **The installed app.** No rule depends on the display mode. An Android web view's text zoom makes text larger, not boxes: with the
  plaque's words a third larger the box was still 95 x 71.

So the size is the one I shipped in 0.485.0, on the instruction to match the Formation button: 95 x 71 px, three lines (icon, "Tactic",
the word). Before 0.485.0 the tactic button was a 58 x 66 px medallion above the hero rows. The plaque covers 6745 px² against the
medallion's 3828: it has been three quarters larger since the day it moved, and it sits up beside the spells where the eye is. That is
the "huge". The cause is my size, not a later release.

## The fix: a one-line plaque, 92 x 44 px

- The plaque is now one line: its icon and the tactic's word side by side ("Advance", "Hold", "Charge"), 92 x 44 px (`src/tactics.css`,
  `src/tacticsView.ts`). The small "Tactic" label is gone from its face; the button's label for a screen reader still says "Tactic:
  Advance together. Tap for the next". Same corner, same right edge, same plate as the Formation button; a thumb's height.
- 4048 px²: 40 % smaller than it was, and 27 px shorter, so it is level with the boss's bar beside it instead of hanging below.
- **Pinned.** Its width and height are set in one rule, with the least and the most set too (`min-*: 0`, `max-*` the size), one line,
  cut at its edge, so its words, a larger text size or a shared rule cannot stretch it.

Two sizes were tried in the same boss wave (`after-size-a-<w>.png`, `after-size-b-<w>.png`):

| | A (shipped here) | B |
| --- | --- | --- |
| Shape | one line: icon, word | a badge: icon over the word |
| Size | 92 x 44 px (4048 px²) | 64 x 56 px (3584 px²) |
| The word | 13 px, clear | 11 px, to fit "Advance" in 64 |
| Beside the boss's bar | level with it | 12 px below it |

A is shipped: it reads at a glance, is no taller than the bar it sits beside, and keeps the word at a readable size. B is a little
smaller in area and leaves 28 px more of the boss's bar, at the price of a smaller word and a taller box. Swapping to B is the rule's
width, height and direction.

## So it cannot grow again

- `test/tactic-size.test.ts` reads the page's style sheets: the plaque's own rule pins 92 x 44 with nothing left to stretch it; no other
  rule in any sheet may size or scale `#tacticBtn` or `.fhTactic` (a least height no taller than the plaque, and the 1 px press, are
  allowed); nothing may scale the dock.
- `tools/tactic-size/shots.mjs` plays the waves above at the three widths and fails if the plaque's box is ever anything but 92 x 44, if
  it changes at all during a wave, if anything scales it or the page above it, or if its icon and word leave its box.
- `tools/hud-even/shots.mjs` now expects the pinned size where it expected the Formation button's. Its save (and this tool's) now holds
  the army stars that open all four spell slots: since 0.491.0 a save without them shows three orbs, and its four-orb cases had failed
  on main for that reason alone.

## Checks

- `npm run typecheck`, `npm run web`, the full suite (3243 passed).
- On this branch: 78 checks, no page error. `tools/hud-even/shots.mjs` against the new size: its size, corner, overlap and camera
  checks pass at the three widths.
- `tools/tactic-size/shots.mjs` on this branch, on 0.502.0 and on 0.486.0 (`PIN=0` for the releases), at 393x852, 360x780 and 412x915.
- Shots in `docs/samples/tactic-size/`: `v486-*` and `v502-*` (before), `after-*`: `late-wave5`, `late-boss`, `late-boss-ultimate`,
  `fresh-wave1`, `bigtext`, `duel`, and `after-size-a`, `after-size-b`; the top of the screen, one pixel a point.
