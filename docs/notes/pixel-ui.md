# Pixel UI

The whole interface now looks like the sprites: a SNES-RPG feel in the same dark brown and gold.

- **Kit** (`src/art/ui/`, drawn by `tools/ui/frames.py`, run it again to change them): `panel` (rivets, 12px at 2x), `card`
  (6px, with `card-r1`..`r5` rarity edges, `card-on`, `card-chosen`), `cardb-*` (the slimmer bench frame, 4px), `chip`
  (4px label frame), `btn`, `btn-gold`, `btn-s` (small) each with `-down` and `-off`, `ribbon` and `ribbon-grey`,
  the `wood` tile, `trim-t/b/l/r` (the gold line along a bar), `cardback` and `flag` (the war banner on a placed card).
  Every frame is a 9-slice shown with `border-image` at 2x (the big Battle button at 3x), `image-rendering: pixelated`.
  Never scale them by a fraction.
- **Icons**: the five tab icons and gold, crown, gear, sound, mute, trophy came from PixelLab (32x32, shown 1:1;
  `tools/ui/genicons.py`, `SET=ui` for the second set). The sound button's face is chosen by CSS from `data-off`.
- **Font**: Pixelify Sans (OFL) replaces `--display` and `--body`; Press Start 2P stays for numbers.
- **CSS**: all of it is `src/pixel.css`, inlined at the end of the page's style by `build.mjs` (so it overrides the older
  smooth rules, which stay as the fallback). Spellbook styles are injected at run time, so its rules are written `body .sb...`.
- **Offline**: the frames and the font files are in the service worker's `FILES`. The tab icons and the `ic-*` pictures used in
  menus are bundled into game.js; the CSS ones are files under `ui/`.
- **Kept**: layout, the redraw logic, tabs, tips, the war banner (now a pixel flag swaying in whole pixels), rarity frames,
  reduced-motion rules (the glint and glow on Battle! and Fight!, the flag and the badges all stop).
- **Moved on purpose**: Fight! has the first row of the button bar and the four small buttons the second, so the frames fit.
  The version line sits clear of the round buttons (upright, under them on the right; sideways, bottom right).
- `tools/ui/shots.mjs` and `tools/ui/shots2.mjs` take the before and after screenshots in `docs/samples/` (needs Playwright).
