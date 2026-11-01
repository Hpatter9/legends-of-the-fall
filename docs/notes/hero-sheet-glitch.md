# The hero sheet on the party screen, half drawn

The owner, on 0.330.0, in the browser and the installed Android app (Samsung S24 Ultra): opening a hero's sheet from the party screen
showed "the same glitchy effect we saw earlier". In their shot (Kohaku, the Kitsune, level 7) the card, name, stars, level, XP
bar, shards and "Use tome" were drawn; the painted art was cut off, with a strip of pixel-art sprites showing at the card's left
edge; the tabs showed with Overview picked; and everything below the tabs was empty. Branch `claude/hero-sheet-glitch`.

## Cause: graphics memory again, not a script error

The same fault as `menu-glitch.md`: the phone paints a page in tiles within a graphics memory budget, and past it tiles are left
unpainted. Two things filled the budget under this sheet only:

1. **The fight's screens were drawn under the party screen.** `pixel.css` keeps the fight's sky (five parallax layers kept on the
   graphics card), the board's WebGL canvas, the HUD and the bench from being drawn while the home screen is open
   (`body:has(> #home:not([hidden]))`). Once the party screen has taken over from the home screen, the home is `hidden` (it stays
   drawn under the party as `.handoff`), so that rule let go and all of them were drawn again, under an opaque screen. The
   "pixel-art sprites" in the owner's shot are the board's figures showing through tiles the sheet could not paint.
2. **The party screen's own page was drawn under the sheet.** The sheet's backdrop is see-through (75%), and the party's scene at
   the top of its scrolling list has six drifting embers (animated transforms). Everything after them in the scroller is given a
   layer of its own: 130-odd layers, one of them the list itself, 3.6 screens tall.

Measured with the CDP layer tree at 393x852, pixel ratio 3: under the party's sheet, **145 drawing layers** on main; under the same
sheet opened from the tavern, 18. The tavern's sheet has the home screen under it, so the first rule holds there; that is why only
the party screen showed it.

A script error was ruled out first: every hero (45; all but four owned, Kohaku at level 8 with tomes held and first in the party)
was opened from the party screen and from the tavern at 393x852, 360x780 and 412x915 with pixel ratio 3: no page error, no console
error, and every owned hero's Overview built with its contents (power, the Stats panel and the rest) and laid out with a height.

## Fix (`src/pixel.css`)

- While the party screen is up (`body:has(> #party:not([hidden]))`), the same screens as under the home screen are not drawn
  (`visibility: hidden`): the sky, the board, the top bar, the HUD's pieces, the bench, the duchess. The party screen is opaque, so
  nothing changes to the eye; they come back as it closes (checked: "March to battle" shows the board and HUD as before).
- While a hero's sheet is open on the party screen (`#party:has(> #ptSheet:not([hidden]))`), the party's own page under it is not
  drawn, as under the full artwork viewer. The sheet's backdrop is now the home sheet's (`#10140fe8`, with the same safe-area padding),
  so the sheet looks the same from either place; the party no longer shows faintly through it.

After: 19 drawing layers under the party's sheet, about the same as the tavern's 18.

## Reproduced and checked

Chromium (swiftshader, GPU rasterisation) at pixel ratio 3, a fixed graphics budget of 48 MB (`--force-gpu-mem-available-mb`),
Kohaku's sheet opened on the party screen:

- main: the owner's picture: the art cut, the board's sprites at the sides, the tabs with nothing below them, the party's page
  showing through (`docs/samples/hero-sheet-glitch-party-before-after.png`, left);
- this branch: the whole sheet, with Hero power and the Stats panel under the tabs (right), at 393x852, 360x780 and 412x915.

At 48 MB the tavern's own sheet loses its lower part too (on main and on this branch alike), so 48 MB is tighter than the owner's
phone, where the tavern's sheet is fine. With the fix, the party's sheet costs a little less than the tavern's. Not changed: the home
screen is still drawn under the tavern's sheet (91% backdrop); hiding it as well would leave more headroom, but nothing has been
seen to fail there.

`test/hero-sheet-glitch.test.ts` checks that the party screen hides the same screens as the home screen, and that the party's page is
not drawn under its sheet.

- `npm run typecheck`: passed. `npm test` (full): 2260 tests, 2260 passed. `npm run web`: built.
- The sweep above (every hero, party and tavern, three sizes, pixel ratio 3, with and without the 48 MB budget): 0 failures, 0 errors.
