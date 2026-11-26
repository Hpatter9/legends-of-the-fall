# SUMMON-SMOOTH: the summoning's show, kept smooth on a slow phone

The owner: "The summon spells slow the phone a little with all the effects at the same time. Clean that up so it stays smooth."
Read as the summoning's show on the Recruit page: the one- and ten-stone draws, the cards' turns and flourishes, a new hero's
reveal, in the Classic look and in Starfall's. Looks only; the same show.

## Measured first

`tools/summon-smooth/measure.mjs` plays a ten-stone draw (with "Reveal all") and a single stone that brings a hero in, in the real
page with its CPU throttled four times, and keeps every frame's time and every long task, in two windows: the cards, and the
reveals. `--trace` adds the browser's own timeline (time by kind of work, what was restyled and why); `--profile` names the
functions (with `node build.mjs --plain`); `STYLE=<css>` tries a change of look before it is made.

**What was dear was not the effects.** In the order found:

1. **Every hero sheet's pixels read back on the phone** (`idleBounds`: the box round a sheet's idle figure, for portraits). A
   ten-draw's ten card faces each read a sheet never read before, and a pass over all 299 sheets ran in the background after
   the page loaded (`warmPortraits`) and landed in the show: about 6 s of `getImageData` through one throttled ten-draw.
2. **The whole collection redrawn at every refresh of the page**: a portrait canvas for each of some seventy heroes, at the
   start and the end of every draw, with its panel shut. Two seconds with no frame at the start of a ten-draw.
3. **The whole page restyled whenever anything was shown or hidden.** Two rules asked the body about a `hidden` attribute
   anywhere under it (`body:has(#cutscene:not([hidden]))`, and the tower map's), so each `hidden` set or cleared anywhere gave
   all 1,400 elements their style anew: about 110 ms each, sixteen times through a ten-draw. And a reveal hid the screens under
   it by a rule on every element in them.
4. **Sheets and paintings decoded on the page's own thread**, in the frame that first drew from them.
5. **"Reveal all" turned every card in one step**: ten turns, ten new pairs of canvases and ten blurred, blended glows begun in
   one frame. (At four times throttle the draw stood still so long that the cards' own timers had all fired by the time it was
   offered.)

## What changed

- **The idle boxes are made when the game is built** (`tools/summon-smooth/idle-boxes.py` writes `src/render/idleBoxData.ts`:
  all 299 sheets, 26 KB; `idleBoxRules.ts` reads it). Nothing reads a sheet's pixels for it on the phone, here or in the codex
  and the party. A test holds each sheet's size in bytes against the table, so a changed sheet without the table made again
  fails (`python3 tools/summon-smooth/idle-boxes.py`; `--check`).
- **The collection is drawn only with its panel open** (`drawCollection`, on the panel's `toggle`), and the draw's doubled
  refresh is one.
- **The two body-wide rules ask the body's own children** (`body:has(> #cutscene…)`, `body:has(> #towerMap…)`: both are its
  children, so the meaning is the same). **A reveal stands in a holder of its own** (`#revealHost`) and says it is up by the
  class `revealUp` on the body; the screens under it are hidden by `content-visibility: hidden` (a browser without it keeps the
  rule on every element).
- **Sheets and paintings are decoded off the page's thread before they are drawn from** (`sheetDecoded`): a card's face is drawn
  once its sheet is in (it lies face down meanwhile, as it does anyway; a turn asked for sooner waits for it), the totals'
  portraits likewise, and a draw's new heroes have their sheet, their painting and their sprite's crop made ready while the cards
  are read (`warmReveal`, `revealCrop`).
- **"Reveal all" turns the cards 90 ms apart** (`revealAllTimes`): ten in under a second.
- **At most five flourishes play at once** (three on battery saver); the rest wait their turn, none longer than 0.2 s behind its
  card in a ten-draw, so every card still has its flourish (`flourishWait`, `flourishCap`). A flourish's canvases are kept and
  used again, and its small glow has no blur of its own (it is a quarter the size and smoothed as it is drawn larger). Starfall's
  burst takes its turn by the same rule.
- The scroll to the new allies' row is asked in the next frame, with that frame's own layout.

Reduced motion is as it was (no flourish, the calm reveal).

## Before and after

A ten-stone draw with three new heroes, four times throttle, two runs each (`out/web` against main 0.625.0):

| Classic, ten-draw | Before | After |
| --- | --- | --- |
| Worst frame, the cards | 2,667 / 2,517 ms | 367 / 383 ms |
| 95th-percentile frame, the cards | 200 / 83 ms | 100 / 67 ms |
| Worst frame, the reveals | 950 / 1,567 ms | 150 / 183 ms |
| 95th-percentile frame, the reveals | 33 ms | 17 ms |
| Frames over 33 ms, the reveals | 41 / 42 | 4 / 3 |
| Long tasks (50 ms and over), whole draw | 38 / 37 | 4 / 3 |
| Tasks over 100 ms, whole draw | 9 / 8 | 2 / 2 |
| Longest task | 2,644 / 2,479 ms | 178 / 167 ms |
| "Reveal all" to the last card turned | 340 / 189 ms | 244 / 233 ms |

| Starfall, ten-draw | Before | After |
| --- | --- | --- |
| Worst frame, the cards | 2,533 / 2,600 ms | 350 / 350 ms |
| Worst frame, the reveals | 1,333 / 1,317 ms | 133 / 133 ms |
| Long tasks, whole draw | 39 / 48 | 2 / 4 |
| Tasks over 100 ms | 10 / 9 | 2 / 2 |
| Longest task | 2,471 / 2,559 ms | 188 / 164 ms |

A single stone with a new hero: worst frame 283 to 300 ms before, 133 to 200 after; tasks over 100 ms 4 before, 2 after.

**The target (no frame over 33 ms, no task over 100 ms) is not met.** Two hitches are left in a ten-draw: one at its start (a
task of 160 to 190 ms, then a frame of about 350 ms as the results are first laid out and painted) and one at its end (130 to
160 ms as the last hero joins and the page refreshes). Trying the cards without their glows, without their glyph's animation
and without the text under them changed neither (`STYLE=`), so what is left at the start is the first layout and paint of the
results themselves; on this machine that is painted in software, and how much of it a phone's graphics card takes away I
cannot measure here.

## Not covered

The king's summoning spells in a fight were not measured (the job was read as the Recruit page's show). Measured on one
machine, in headless Chromium with software graphics, not on a phone. The two rules narrowed in `cinematics.css` and
`sanctuary.css` and the reveal's holder touch pages beyond the summoning (a cutscene's quip, the tower map's version line): I
checked their meaning by reading, not by photographing a cutscene or the map.

Pictures: `docs/samples/summon-smooth/classic-before-after.jpg`, `starfall-before-after.jpg` (a ten-draw at 393 x 852: face
down, turning after "Reveal all", a reveal's charge, its arrival, the hero in view, the spread after; before over after;
`tools/summon-smooth/strip.mjs`). The moments are by the clock, so the before and after frames are not the same instant.
