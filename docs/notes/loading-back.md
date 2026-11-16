# LOADING-BACK: the black and red loading screen again

The owner's ask: "Switch the loading screen back to the black and red one with the crown."

The black and red screen is the **Shattered Crown** poster (`docs/notes/shattered-crown-loading.md`): two broken gold crowns over
red banners and a black keep on a pale mountain road, from 0.467.0 (#517, heavier snow in 0.476.0) until 0.598.0 (#662) put the
snowy keep of the release art in its place. It is the only black and red loading screen in the history; the ones before it were
the king and his guard (0.215.0, a painted night scene) and the knight against the Demon Lord (pixel art).

## What changed

- `build.mjs` `LOADING_ART` embeds the Shattered Crown again: the poster (`src/art/loading/shattered-crown.webp`), its crown mask
  (`crown-mask.png`, which keeps the gleam and the breathing light on the gold) and its cloud layer (`crown-clouds.webp`, the two
  drifting cloud layers). The three files never left `src/art/loading/`.
- `src/index.html`: the three lines 0.598.0 changed are put back as they were in 0.597.0 (`.ldCrownMask` masked to the crowns,
  `.ldCrownLight` centred on them, `.ldClouds` shown and drifting). Everything else of the screen was never changed after 0.597.0 and
  stays: the layout, the 320 snowflakes, the mist, the bar, the words, the safe-area insets, the status role and aria text, and
  the reduced-motion rules.
- The snowy keep (`src/art/loading/release-poster.webp`) was used by nothing else and is removed; its source,
  `art-source/release/loading.png`, stays. CREDITS.md no longer lists it; the Shattered Crown's own entry was never taken out.

## Offline

As before 0.598.0, the art is embedded in `index.html` as data URLs, so the screen shows before `game.js` arrives; `index.html` is
in the service worker's `FILES`, so it plays offline (`tools/loading-check.mjs`'s offline reload passed: the cached page holds the
art). Nothing of it is in `game.js`. The page is 1.7 MB again (1.0 MB with the snowy keep).

## Checks

- `npm run typecheck`, `npm run web`: passed.
- `node tools/loading-check.mjs` (pointed at the browser here): 393x852, 360x780 and 412x915 passed (layout, crown mask, two cloud
  layers, 320 snowflakes, motion, reduced motion, start-up, no page errors) and the offline reload passed.
- The same check on 0.597.0's own build at 393x852. The reduced-motion frames of the two are pixel for pixel the same; the moving
  frames differ only by where the snow and the gleam are. Shots in `docs/samples/loading-back/` (`compare-393x852.png`: 0.597.0 on
  the left, this build on the right).
