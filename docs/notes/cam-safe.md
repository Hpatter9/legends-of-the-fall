# CAM-SAFE: the camera frames the fight in the room the player really sees

Branch `claude/cam-safe`, from main 0.460.0. The owner: "Make sure when the camera is centered on the action in the wave, it takes the on
screen bars into account. Or the spells." The version is unchanged.

## What was wrong

The canvas fills the screen and parts of the page lie over it. The fight camera (`followCamRules.ts`, BATTLE-POLISH) put its point at the
middle of `area`, the room fitted at layout. That room left out only the top bar and the bench. It ran from under the top bar, so the
spell row, the boss's bar and the combo bar lay over its top. With the War Horn and four spells (two rows, from 393 wide down) the fight's
middle sat 52 to 57 px above the middle of what can be seen, under the spells, and 27 to 31 px above it at 412 (one row). The deploy's room
was also measured before the bench settled and never again: at 393 it stopped at 545 px, though the bench starts at 600.

## The safe rect (`src/render/safeRectRules.ts`, pure; `src/camSafe.ts`, the page)

- **The covers**: `CAM_COVERS` lists the parts of the page that can lie over the board: the top bar, a twist's banner, the spell row (mana,
  the orbs, the SPELL and ULT buttons, the War Horn, one row or two), the boss's bar, the combo bar, the synergy column, the tactic button
  and the bottom panel (the bench and its buttons at a deploy, the hero rows in a fight). `registerCamCover(selector)` adds any other, as
  the duel bar being built on `claude/duel-show` can (one line where it is made: `registerCamCover('#duelBar')`). The camera keeps clear
  of it from then on, and watches its size.
- **Measured**: `coverBoxes()` reads each match's box as drawn now, skipping any hidden, with no size, display none, invisible or fully
  transparent. It runs at layout and on resize. A ResizeObserver over every cover also runs it whenever one changes size or shows: the
  spell row coming in as the fight begins, a row wrapping, the boss's bar showing, a cover registered.
- **The rule** (`safeRect`): start from the canvas and take the covers away, biggest first. Each cover that lies over the room cuts it back
  from one side, whichever keeps the most room: the top, the bottom, the left or the right. A cut from the top or the bottom is worth 15 %
  more (`LEVEL`), so a button in a corner (the tactic button) trims the room's foot rather than a strip down its whole side, and the view
  stays centred across the upright screen. A cut that would leave under 160 x 140 px is not made (a sheet over everything leaves the room as
  it was). Then an 8 px margin all round.
- **Eased**: the camera's room (`Game.safe`) eases to each new measure (`easeRect`, the camera's own move time), so the view glides as the
  spell row or the boss's bar comes in. With reduced motion it is taken at once.

## What uses it (`src/main.ts`)

- **Centring** (`place`): the camera's point sits at the middle of the safe rect. Everything that sends the camera somewhere is now
  centred clear of the bars: the follow, the wave's intro camera, the ultimate's lean-in on its caster, the effects' pushes, the
  destination reveal and the look along the road.
- **Framing**: the follow's zoom-out (`followView`) fits every active fight into the safe rect (its padding plus the margin). So does the
  deploy fit (`deployFrame`), the destination reveal, the look along the road, the least zoom (`minZoom`) and the board-edge clamp
  (`clampCam`).
- **The pinch** zooms about the safe rect's middle, the same point `place` uses, so a pinch's anchor stays under the fingers.
- **Unchanged**: the board's base scale is still fitted to the old `area`, so the board is the size it was. A pan or a pinch is still the
  player's for 4 s after the last touch (`manualHeld`, untouched). The Last Stand's own camera is left alone, as asked.
- **A visible change at the deploy**: its room is now the real one between the top bar and the bench (on main it stopped 55 px short at 393, see
  above). So the placement rows are framed a little lower, centred in what is truly seen. `deploy-before-393.png`, `deploy-after-393.png`.

## Shots (`docs/samples/cam-safe/`, `tools/cam-safe/shots.mjs`)

A beasts army fight with the War Horn and four spells, 6 s into the wave. Wave 5 has no boss and wave 8 has the Alpha Werewolf and its
bar. Each cover is outlined in red, the safe rect in green dashes, its middle a green ring, and the action's centre (the point the follow
camera holds) a yellow cross. The script runs the same rule in the page for the "before" build (main 0.460.0), so both show the room the
fight should keep to.

| Shot | The action's centre against the safe rect's middle (px, x and y) |
| --- | --- |
| `before-wave5-393` / `after-wave5-393` (spells in two rows) | 0, −57 → 0, 0 |
| `before-wave5-360` / `after-wave5-360` (two rows) | 0, −57 → 0, −2 |
| `before-wave5-412` / `after-wave5-412` (one row) | 1, −31 → 0, −1 |
| `before-wave8-393` / `after-wave8-393` (two rows, the boss's bar) | −1, −52 → 20, −3 (the camera still easing after the boss: its point was 19 world px from where it was going) |
| `before-wave8-360` / `after-wave8-360` (two rows, the boss's bar) | −3, −54 → 0, −3 |
| `before-wave8-412` / `after-wave8-412` (one row, the boss's bar) | −3, −27 → 4, −3 |

Also: `ult-lean-before-after-393.png` (the ultimate's opening at 1.3 s: the caster leaned in on, now clear of the spell row) and the deploy
pair above. 0 page errors throughout.

The tightest room is 360 x 780 with two spell rows and the boss's bar: 344 x 175 px between the bar and the tactic button. That is still
a good view of the fight (`after-wave8-360.png`).

## Tests

`test/safe-rect.test.ts`: the deploy room; a fight with one spell row, two, or none; a boss wave with the combo bar and the tactic button
(which trims the foot, not the side); a corner cover that does cut from a side when that costs clearly less; the synergy column down the
side; a registered duel bar; covers with no size, a sheet over the whole screen, and the least room; the order of the covers; the easing;
and 360 x 780 with two rows and the boss's bar. `test/follow-cam.test.ts` is unchanged and passes.

## Checks run

See the end of this note for the full suite's result.
