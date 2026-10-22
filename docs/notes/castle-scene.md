# The castle courtyard (Castle tab)

## What it is
- The Castle tab is a castle courtyard seen in the isometric (2:1, lit from the upper left) view of Chronos's building kits
  (`src/castle.ts`, data in `src/render/castleSpots.ts`). The owner's ask was "use some of the nicer sprites": the earlier 3/4 village yard
  (Chronos's plain village houses, 0.48.0, `docs/samples/castle-before-after.png` shows it beside this) gave way to the richer isometric kits
  the first worker had passed over as "far too detailed". Everything shares one view: a lattice of grass tiles with cobbled roads and a plaza, a
  stone castle wall with a gate and a watchtower across the top, a statue in the plaza, flowerbeds and braziers.
  `docs/samples/castle-candidates.png` is the contact sheet of what was surveyed (every pack in the assets repo and Chronos's building art);
  the other packs are side-view (Craftpix tropical city, vector) or top-down (Craftpix village, dungeon), so they would mix perspectives.
- One canvas in the scene's own pixels, drawn a whole number times bigger with nearest neighbour (1 on a phone, up to 4 on a big screen), panned by
  native scroll when the screen is smaller than the scene. **Two arrangements of the same pieces** (`Layout`, `layoutFor(width < height)`):
  - `TALL` (upright): 360 x 600 pixels. The wall runs along the top in a "^": the gate in the left run, a watchtower at the apex, a plain run on the
    right. The gate road leads down to a plaza band across the middle (heroes stroll it, nothing stands on it but the statue) and a road runs on
    down between the front buildings. Mage tower (left) and treasury (right) behind the plaza, barracks and armoury in front. All four
    buildings and their tags show at once on a 393x852 phone, no panning. The front buildings' tags sit on their ground (`tagY`), so they do not
    cover the heroes' band.
  - `WIDE` (sideways): 756 x 300, one diagonal wall behind the four buildings with the gate in the middle, the cobbled street along their feet where
    the heroes stroll.
- **Pictures** (`src/art/castle/`, 34 PNGs, 568 KB, bundled into game.js as data URLs, so the service worker's `FILES` is unchanged): each is one
  piece of the kits at **half size** (`tools/castle/prep.py`: 2x2 box average, then solid or clear), so a cottage is about 100 pixels wide.
  Nothing is drawn by code but the scaffolding, flags and effects.
- **Ground**: `grass_tile` and `cobble_tile` (the Knights kit's) are laid as a lattice of diamonds 90 across and 52 down (`TILE_W`, `TILE_H`), rows
  half a tile along, back to front; every few grass tiles are mirrored so the lawn does not repeat. The grass tile's dark outline along its back
  edges is painted over in prep, so no grid shows. A tile is cobbles when its middle falls in a `Patch` (a rectangle of the scene, or a run of tiles
  along the grid axes with `u0..v1`). The page behind the scene is the grass tile's average colour (`GRASS`).
- **Four upgrades, four plots** (`Layout.plots`). Each has four looks (`stageOf(id, level)`): 0 an empty plot, 1 small, 2 bigger, 3 grand, reached in
  order and always at the top level (Treasury, Barracks and Armoury have 5 levels, the Mage Tower 4). A look is a list of pictures (`LOOKS`, parts
  with an offset from the plot) so a building grows by gaining wings and props. No house is used for two buildings:
  - Treasury: chests and barrels; the Knights stockpile shed with chests; the Knights longhouse with chests and barrels; the Dwarves' great hall
    (copper and stone, lit doors) with a brazier, chests and barrels.
  - Barracks: a campfire and hay; the Knights cottage and hay; the Settlers' thatched longhouse with a campfire; the Knights barracks with a banner,
    hay and crates.
  - Armoury: rocks, crates and a woodpile; the Dwarves' anvil stall with crates; the Knights workshop (a forge glowing inside) with a woodpile and
    crates; the Dwarves' forge (tall chimney, glowing furnace) with the anvil stall.
  - Mage Tower: rocks and crystals; the Fae moon-portal shrine; the Fae spiral tower with the shrine; the Liches' spired chapel (teal windows)
    with the spiral tower and crystals.
- **Tap a building** (or its name tag: level and a green arrow when you can afford the next) and its card opens: picture, pips, what it gives now and
  next (`effectText`), cost, Build. Build does what the old list's button did (`upgrade`, `saveMeta`, `refresh`), after closing the card.
- Achievements, Settings and Reset tips are chips in a slim bar between the top bar and the scene (they cover nothing).

## Life
- Pennants wave on the wall towers; chimneys smoke (`VENTS`, given from each look); sparks fly at the anvil; the tower's windows pulse cyan and violet and
  shed floating runes; the gold glints; lanterns glow. Up to five of the strongest unlocked heroes stroll the road and plaza, passing in front of and behind
  buildings (everything is sorted by its foot line).
- **Hero size**: a sheet's idle and walk frames are shrunk by a whole number when the page loads (`shrinkRig`: n = round(figure / 32) = `HERO_PX`, at
  least 1, box average, then solid or clear), so a hero is about 30 pixels tall (it was 20): they read beside the half-size buildings and are about a
  door high, no more. They walk the plaza band, the one stretch no building stands over.
- **Build effect**: when `update` sees a level go up it plays 1.5 s: the old look inside scaffolding with dust, a warm flash at 0.8 s as the
  new look swaps in (it settles three pixels), the scaffolding comes down and sparkles rise. A level that keeps the same look still gets it.
- **Cost**: it draws only while the Castle tab shows (not under a card, not when the page is hidden). Battery saver caps it at 30 fps. Reduced
  motion: no smoke, sparks, runes, strolls or scaffolding; the flags and glow stand still and a bought level swaps with a few sparkles.
- Name tags are real buttons over the canvas, set in percentages so they follow the scale, rebuilt only when their text changes; their `:active`
  rule keeps the centring transform (the global `button:active` would move the tag out from under a finger).

## Art and tools
- Pictures: `src/art/castle/` (see above). `tools/castle/prep.py` copies them from Chronos's isometric kits; `tools/castle/candidates.py` makes the
  survey sheet; credits are in `CREDITS.md`. The kits were made for Chronos (not by PixelLab); the castle pieces in `iso/castles/` (Blood Court
  keep and tower, the dwarves' hold) were surveyed and only the Liches' chapel and the Dwarves' great hall, forge and shrine are used.
- PixelLab: none this time (0 generations); the old generated towers are gone. The earlier jobs used 57 + 3 + 9.

## Tests and samples
- `test/castleScene.test.ts`: every picture named exists and its size in `SPRITE_SIZE` is the file's own (read from the PNG header); four looks
  per building, a plot inside the yard in both arrangements; no house sprite in two buildings and every look bigger than the last; the grand
  look of every building fits inside the yard and the upright yard is no wider than a phone; every picture is used and the ground tiles are one
  lattice cell wide; the wall, gate, statue, roads and flags exist in both arrangements; buildings overlap at most by a corner; vents and lights lie on
  their look; the card words grow with the level.
- `node tools/castle/shots.mjs` (after `npm run web`; `CARD=1` adds the card and build frames) makes `docs/samples/castle-{empty,part,maxed}-{upright,sideways}.png`,
  `castle-card-*.png` and `castle-build-*-0..4.png`.
