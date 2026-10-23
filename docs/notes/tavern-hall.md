# The tavern hall: three rooms you pan across

The owner's ask: "the tavern screen is going to be too crowded with all these heroes we added", so a bigger tavern you can pan, every
owned hero in it, spread out.

## The building (`src/render/tavernSpots.ts`, `src/tavern.ts`)
- **Three rooms, 384 room pixels wide each (scene 1152 x 296), joined by two timber doorways at the seams** (`DOORWAYS`):
  - **Bar room** (0 to 384): the old room: bar and stools, the little hearth, the left round table, the long table, barrels and crates.
  - **Hearth hall** (384 to 768): a big stone fireplace, a rug in front with two benches, a round table at each end, barrels and crates.
  - **Games room** (768 to 1152): a dartboard, a weapon rack and a night window on the wall, two card tables, the bard's stage with a red curtain, barrels.
- The walls are all 128 tall (`WALL_H`), so the floor is 168 deep (more room to spread out), plus `FLOOR_PAD` (26) of floor under the front row for the room names, and
  `CEIL_H` dark ceiling above (shown only on a tall page). The doorway's opening is dark with firelight on its floor.
- New art: `wall_hearth`, `wall_back`, `arch`, `bench`, `stage` (PixelLab, same method as the rest; `tools/tavern/README.md`, `CREDITS.md`). The asset-packs
  repo could not be cloned in the worker's session, so no pack props were used; the packs are all top-down anyway (see `tavern.md`).

## The heroes
- 45 spots, **15 to a room** (a test checks it). The starting five stay along the bar in the first room; the rest are at tables, at the bar, on the benches by the
  fire, throwing darts, at the card tables, round the stage, and standing about. Locked heroes' seats stay empty (`seat: 'none'` for standing spots has nothing to leave).
- **No overlapping figures** (`figureBox` in `tavernSpots.ts`, tested): a hero's width is the sheet frame's width capped at 0.8 of the figure's height (a frame has swing room), times the
  scale the tavern draws them at (`figureHeight`: 34 to 54 room pixels); two figures must be apart across by half their widths added, or apart down by 0.7 of the smaller height. It reads
  `sheets.json` and every hero's three forms, so a remade sheet changes nothing by hand. Nothing in the tavern is hard-coded to a sheet size.

## Panning
- One canvas the size of the page, 2 screen pixels to a room pixel (3 where the page is at least 3 rooms-heights tall, i.e. a tablet). A swipe pans sideways with a little momentum
  (a fiftieth of the speed is left after a second; edges stop it), clamped at both ends. The wheel and a trackpad pan too.
- **Opens on the bar room**, centred on the stools so the five starters are in the first screen. The view is remembered for the session (`sessionStorage`, in try/catch).
- **Taps vs pans**: a press that moves more than 10 px is a pan and never picks a hero; a short still press is a tap (as before). The canvas is `touch-action: pan-y`, so a vertical gesture still goes to the page.
- **The hint**: under the picture, "Bar · Hearth · Back room" with the room in view lit (a tap glides there; a jump when motion is reduced), and a slim arrow on each side that has more. No flashing: the arrows fade in and out once.
- 12 px text, no bold (the count pill and Roster button lose their old bold and 9 px).

## Cost
- The rooms are baked once into one picture (walls, floor, rugs, doorways) when the scale changes; a frame blits only the screen's part of it, then draws the furniture and heroes within 110 room px of the view,
  sorted front to back, and the lamp glows in view (small round light sprites made once, drawn with `lighter`). The canvas is the page's size, not the scene's (the old one was a 1152x888 canvas). The fire and lamps flicker by opacity as before.
- Idles, emotes, awakened looks and grade tints, the Roster button and tapping work as before (`heroRig`, `lookKey`).

## Samples (`docs/samples/tavern-hall-*.png`, `node tools/tavern/shots.mjs`)
`bar`, `hearth`, `back` (each with all 45), `bar-left`, `back-end`, `pan` (mid-swipe), `new-save` (5 heroes), `hint`, at 393x852; `bar` and `new-save` also at 360x780 and 412x915.

## Not sure about
- The hearth hall's and games room's walls are straight PixelLab results cropped; the hearth's fireplace is not animated except by the glow.
- The ceiling is plain dark where the page is taller than the rooms.
