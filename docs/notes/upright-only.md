## Upright only

The owner decided the game is played upright only. The manifest asks for `orientation: 'portrait'` (build.mjs), and a
phone held sideways (a coarse pointer, landscape, at most 600 px tall) sees a full-screen "Turn your phone upright" card
(`#turnUp` in src/index.html, its rules at the end of src/pixel.css) over the game. A desktop window of any shape still
plays. CLAUDE.md now has every change checked at 393x852, 360x780 and 412x915 instead of sideways; the old sideways
rules in the CSS were removed in docs/notes/upright-cleanup.md.

## The glint without the flash

The gold buttons (Battle!, Fight! and the like) had two animations that fought: the whole button blinked 12% brighter twice
a second (`pxPulse`, a hard step), and the light stripe moved by stepping its `left` edge 24 times, re-laying out and
repainting the 9-slice frame under it each step, which read as flashing and tearing as the stripe crossed. The blink is
gone, and the stripe now glides by `transform: translateX` (on the compositor, `will-change: transform`), softer and
smooth (`pxGlint` in src/pixel.css; `--glintEnd` sets how far it travels on each button).

## Room to place heroes, and a report that scrolls

- The battle camera now has some give up and down (`clampCam` in src/main.ts: 45% of the view's half-height past the
  board's edge), so on an upright phone any row, the near deploy rows included, can be dragged clear of the bench and the
  top bar. Side to side it is clamped as before.
- The result screen (`#result`) scrolls when the report is longer than the screen (`justify-content: safe center`,
  `overflow-y: auto`), and its button row sticks to the foot over a fade, so Next stage or Home can always be pressed.

## A steady Battle tab

The Battle tab in the tab bar flashed, most of all on the Armies screen where it sits lit: the old smooth look's `glow`
animation (a brightness and halo throb, `src/index.html`) still ran under the pixel frame, and a glint swept across it as
well. Both are off for the tab (`.hmTab.hero` in src/pixel.css: `animation: none; filter: none`, and its `::after` glint
removed). The Battle! and Fight! buttons keep their glint; the tab's small red "new" dot still pulses softly.

## A sweep for flashing

Every screen was checked for flashing: the camp, the hall, the tavern, the castle and its card, the library, a hero's sheet, settings, the
armies, deploy, a fight and the result. Each was scanned for looping animations that change brightness, opacity, glow or
colour, and frame-diffed for large areas that brighten or darken together. Fixed:
- the red "new" dots on the tabs and buttons blinked hard on and off (`pxBlink`, steps): now steady;
- the tutorial's highlight (`.tipLit`) blinked the same way: now a steady outline and soft glow;
- the old falling leaves (`#leaves`) drifted over every home page, indoors too, crossing the scenes' own art: removed.
Earlier fixes in the same vein: the gold buttons' brightness blink (0.56.0), the Battle tab's glow and glint (0.65.0), the
army cards' sub-pixel backdrop drift (0.66.0). What still moves is meant to: idling heroes, fire and embers, the button
glints, and a gentle twinkle on earned stars. A fight's whole-screen flashes are already capped (0.35 alpha, 120 ms, only on
ultimates and big crits) and follow the flash setting.
