# The castle courtyard (Castle tab)

## What it is
- The Castle tab is a village courtyard seen from slightly above (`src/castle.ts`, data in `src/render/castleSpots.ts`), drawn from Chronos's
  village art: flat grass with tufts and flowers, a palisade with a gate across the top, a cobbled road down (or along) the middle with a plaza and
  well, trees and props. Everything shares one view and one flat-colour pixel look; the owner picked this over a side-view mock-up
  (`docs/samples/castle-mock-*.png`, `tools/castle/mock.py`) because the first, mixed-perspective courtyard "looked off".
- One canvas in the scene's own pixels, drawn a whole number times bigger with nearest neighbour (1 on a phone, up to 4 on a big screen), panned by
  native scroll when the screen is smaller than the scene. **Two arrangements of the same pieces** (`Layout`, `layoutFor(width < height)`):
  - `TALL` (upright): 360 x 600 pixels, the road down the middle from the gate; tower and treasury behind the plaza, barracks and armoury
    in front. All four buildings and their tags show at once on a 393x852 phone, no panning.
  - `WIDE` (sideways): 756 x 300, the four buildings in a row either side of the gate road, the cobbled road along their feet. Fits a sideways
    phone without panning sideways (it can pan down a few pixels on a short page).
- **Four upgrades, four plots** (`Layout.plots`). Each has four looks (`stageOf(id, level)`): 0 an empty plot, 1 small, 2 bigger, 3 grand, reached in
  order and always at the top level (Treasury, Barracks and Armoury have 5 levels, the Mage Tower 4). A look is a list of pictures (`LOOKS`, parts
  with an offset from the plot) so a building grows by gaining wings and props. No house sprite is used for two buildings:
  - Treasury: crates; `house1`; `tt_long` (the Tiny Town inn) with gold; `gb_house` (red, grand) with chests and gold piles, a lantern.
  - Barracks: a cloth tent; a red yurt with a rack; `house2` with a rack and a lantern; `house4` with a yurt, rack, lantern and fence.
  - Armoury: anvil, planks and a log; the red market roof over an anvil and rack; the stone shop with anvil, rack and a sword sign; the shop
    with the tall gabled house beside it.
  - Mage Tower: a ring of pebbles and a crate; three towers of one family (squat, middle, tall with a balcony and crystal), generated with
    PixelLab at their final size in the village houses' palette (flat shading, low detail, low top-down view) because the only other towers in
    the packs are smooth vector art; 9 generations (a test of 3, then 6), no more.
- **Tap a building** (or its name tag: level and a green arrow when you can afford the next) and its card opens: picture, pips, what it gives now and
  next (`effectText`), cost, Build. Build does what the old list's button did (`upgrade`, `saveMeta`, `refresh`), after closing the card.
- Achievements, Settings and Reset tips are chips in a slim bar between the top bar and the scene (they cover nothing).

## Life
- Pennants wave at the gate; chimneys smoke (`VENTS`, found on each sprite); sparks fly at the anvil; the tower's windows pulse cyan and violet and
  shed floating runes; the gold glints; lanterns glow. Up to five of the strongest unlocked heroes stroll the road and plaza, passing in front of and behind
  buildings (everything is sorted by its foot line).
- **Hero size**: a sheet's idle and walk frames are shrunk by a whole number when the page loads (`shrinkRig`: n = round(figure / 24), at least 2,
  box average, then solid or clear), so a hero is about 20 pixels tall, a little over a door (the tavern's sheets are cut for a 3x room and would tower here).
- **Build effect**: when `update` sees a level go up it plays 1.5 s: the old look inside scaffolding with dust, a warm flash at 0.8 s as the
  new look swaps in (it settles three pixels), the scaffolding comes down and sparkles rise. A level that keeps the same look still gets it.
- **Cost**: it draws only while the Castle tab shows (not under a card, not when the page is hidden). Battery saver caps it at 30 fps. Reduced
  motion: no smoke, sparks, runes, strolls or scaffolding; the flags and glow stand still and a bought level swaps with a few sparkles.
- Name tags are real buttons over the canvas, set in percentages so they follow the scale, rebuilt only when their text changes; their `:active`
  rule keeps the centring transform (the global `button:active` would move the tag out from under a finger).

## Art and tools
- Pictures: `src/art/castle/` (53 small PNGs, 244 KB, bundled into game.js as data URLs, so the service worker's `FILES` is unchanged).
  `tools/castle/prep.py` copies them from Chronos and the assets repo, `tools/castle/towers.py` makes the towers; credits are in `CREDITS.md`.
- PixelLab: the first (rejected) courtyard used 57 generations; the mock-ups 3 (gold piles, not used in the final); the towers 9. Balance
  1959.75 at the start of the job, 1386.75 after the mock-ups; other workers draw from the same balance.

## Tests and samples
- `test/castleScene.test.ts`: every picture named exists and its size in `SPRITE_SIZE` is the file's own (read from the PNG header); four looks
  per building, a plot inside the yard in both arrangements; no house sprite in two buildings and every look bigger than the last; the grand
  look of every building fits inside the yard and the upright yard is no wider than a phone; buildings overlap at most by a corner; vents and lights lie on
  their look; the card words grow with the level.
- `node tools/castle/shots.mjs` (after `npm run web`; `CARD=1` adds the card and build frames) makes `docs/samples/castle-{empty,part,maxed}-{upright,sideways}.png`,
  `castle-card-*.png` and `castle-build-*-0..4.png`.
