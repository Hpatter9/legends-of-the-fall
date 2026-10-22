## Upright only

The owner decided the game is played upright only. The manifest asks for `orientation: 'portrait'` (build.mjs), and a
phone held sideways (a coarse pointer, landscape, at most 600 px tall) sees a full-screen "Turn your phone upright" card
(`#turnUp` in src/index.html, its rules at the end of src/pixel.css) over the game. A desktop window of any shape still
plays. CLAUDE.md now has every change checked at 393x852, 360x780 and 412x915 instead of sideways; the old sideways
rules in the CSS are left for now and can go as screens are reworked.
