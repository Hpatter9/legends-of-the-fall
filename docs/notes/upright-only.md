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
