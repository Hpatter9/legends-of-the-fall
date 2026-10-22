# Tower look

The roguelike tower's map was a flat brown page with square icons and dotted lines. It now reads as a tower being climbed. Only the look
changed: the rules in `src/sim/tower.ts` are untouched.

- **Backdrop** (`src/towerBack.ts`, `rogue.css`): pack art laid out once, in whole pixels, scrolling with the map. Stone walls step in
  two floors at a time (a ledge at each step) with sky and clouds at the edges, arched and barred windows, wall torches and (in the halls)
  banners. Act 1 is the dark crypt, act 2 the halls (tinted warm brick, dusk sky, white clouds, banners), act 3 the storm summit (cold
  brick, black and grey clouds). Later acts reuse the three with a hue turn and a numeral (`actLook` in `towerTheme.ts`, tested).
  The nodes follow the taper: `Layout` gives every row's x and y.
- **Stairs**: pixel-drawn stone steps (SVG rects at integer coordinates) replace the dotted lines. Dim where not to be taken, softly lit
  (steady, no blinking) where the party can go next, warm with a wall torch beside them where already walked.
- **Node frames**: a clipped two-layer frame per kind with its own silhouette and colours: fight (steel), elite (spiked crimson), campfire
  (arched ember), shop (gold shield), treasure (bronze), mystery (violet octagon), boss (large crowned crimson). Open nodes glow steadily.
- **Party marker**: the lead hero's portrait climbs the stairs to the chosen node in 0.5 s (rounded to whole pixels every frame, a 2px hop per
  step), then the node is entered. Under `prefers-reduced-motion` it just goes.
- **Act intro card**: "Act 2 · The Haunted Halls" over the act's backdrop panning up, about 2 s, a tap skips it. Played once per run and act
  per session, when an act's map is first opened at its foot.
- **Boss gate** at the top of each map: the boss's portrait in an arch with its name (first foe of the act's boss band, `bossOfAct`).
- Motion: only the torch flames animate (six sprite frames in steps, never opacity or brightness), and not under reduced motion. Pixel art
  is at 1x or 2x only. No per-frame filters; the node glows are static drop-shadows.

Art, cut by `tools/tower-art.py` (needs `chronos-assets` next to this repo) into `src/art/tower/`: see CREDITS.md. Everything is bundled into
`game.js` as data URLs, so offline play needs no new `FILES` entries. Screenshots: `tools/rogue/tower-look.mjs` writes
`docs/samples/tower-look-{before,after}-*.png`.

Not verified: a real phone's frame rate (checked only in headless Chromium), and the look at act 4 and beyond (the tinted reuse).
