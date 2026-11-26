# HEROES-STILL — the Heroes tab's screens hold still

The owner: "The heroes overview screens don't need a moving animation behind the art. It slows the game down when scrolling there."

## What moved, and what holds still now

Found by listing every running animation and drawing loop on each screen (`tools/heroes-still/probe.mjs`):

| Screen | What moved behind the art | Now |
| --- | --- | --- |
| The tavern (the Heroes tab's own page, with "Your strongest heroes") | the ALIVE light layer over the painting (candles, lanterns, hearth, embers, dust: a canvas redrawn every frame); the guests' breathing and talking, the keeper's wipe, the hearth's warmth, the dice and the steam (CSS) | the light layer is drawn once, at rest (as with reduced motion), and never joins the loop; every animation in the scene rests at its start |
| The roster ("All heroes") | each card's motes (18 cards); and the tavern's light layer kept painting under the sheet, as it counted itself on show there | the motes rest; the tavern's layer no longer paints |
| A hero's page (every tab) | the dossier's turning currents and drifting lights, the card's turning halo and rising motes; the tavern's layer under it | all rest |
| The Hall of Heroes | the roster's card motes under it | rest |

The pictures are the same (`docs/samples/heroes-still-{before,after}-{tavern,roster,hero,hall}-393.png`: the tavern differs only where a guest
was caught mid-motion; the roster, hero page and Hall by fewer than 100 pixels).

**Kept:** the gold upgrade chevrons on the cards (`upBob`, a small transform: a marker, not a background), a tap's press, sheets opening, the
rise and gear plates. The camp, the castle and the War Room keep their life (not touched).

## Scrolling, measured

`node tools/heroes-still/scroll.mjs <label>`: each screen scrolled by the wheel, down and back, for six seconds at 393x852 with the CPU
slowed four times; the main thread's busy time over those six seconds (what the browser itself counts), with its style and layout time.
Before → after (two runs each agree within about half a second):

| Screen | Busy, of 6 s | Style + layout |
| --- | --- | --- |
| Tavern | 3.0 s → 1.4 s | 0.22 s → 0.09 s |
| Roster | 4.8 s → 3.3 s | 0.56 s → 0.35 s |
| Hero page | 4.5 s → 2.5 s | 0.65 s → 0.31 s (and its repaints, 1,404 → 6) |
| Hall of Heroes | 5.7 s → 4.7 s | 0.50 s → 0.39 s |

The frame timer on the main thread held 16.7 ms at the median on every screen, before and after, with no long tasks, so that reading alone
does not show the difference. On a phone the busy time is what decides it: the time spent drawing the backgrounds was taken from the
scrolling.

**Tried, and no measurable gain (so not kept):** `content-visibility: auto` on the roster's cards and the Hall's cells; the Hall's grey
filter on unowned heroes; stopping the standard menu's frame animations.

**Left for the director:** hiding the tavern while a sheet (the roster, a hero page, the Hall) covers it took about another 0.6 to 0.9 s off
the roster and the Hall, but the tavern is kept under those sheets on purpose (so a page never slides past empty), so it is not done here.
The Hall stays the heaviest screen: its long list itself (about 600 elements, a canvas portrait per hero) over the roster.

## How

- `src/render/ambientLayer.ts`: an `AmbientLayer` made `still` paints its light at rest and is never counted as showing, so the shared loop
  never paints it. `src/paintedTavern.ts` makes the tavern's layer still.
- `src/alive.css` (last of the page's styles that set these animations): one rule stops the tavern's scene, the roster's and Hall's card
  motes, a hero page's halo and motes, and the dossier's currents and drift.
- `test/heroes-still.test.ts` keeps both in place.
