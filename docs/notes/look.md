# Look: camera, backdrop, ground

- **Camera** (`src/main.ts`): upright, the board shows `ZOOM` (1.6) times the width-fit size; sideways it still fits.
  The camera is a world point (`cx`, `cy`) clamped to the board's bounds (a board that fits an axis stays centred).
  It starts on the heroes' rows in deploy and eases to the middle of the board when the fight begins (`focus`).
  A drag that starts on a placed hero or a bench card places heroes as before; any other drag pans (8 px dead zone, so
  taps still place or pick up heroes).
- **Backdrop**: five parallax layers of the Mountain Backgrounds m1 set (`#sky` in `index.html`, copied as `bg1..5.png`
  by `build.mjs`), shifted a few pixels by the pan.
- **Ground** (`src/render/boardView.ts`): detailed grass tops, cracked flagstones for the high ground, the Undead
  tileset's dark rock face down the column sides. The old tufts, flowers, pebbles and orange cobbles are gone.
- No tileset in the packs gives seamless detailed grass or stone, so the tops are cut from the battleground paintings.
