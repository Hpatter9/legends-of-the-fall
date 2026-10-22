# The castle courtyard (Castle tab)

## What it is
- The Castle tab is a castle courtyard seen in the isometric (2:1, lit from the upper left) view of Chronos's building kits
  (`src/castle.ts`, data in `src/render/castleSpots.ts`). The owner's ask was "use some of the nicer sprites": the earlier 3/4 village yard
  (Chronos's plain village houses, 0.48.0, `docs/samples/castle-before-after.png` shows it beside this) gave way to the richer isometric kits
  the first worker had passed over as "far too detailed". Everything shares one view: a lattice of grass tiles with cobbled roads and a plaza, a
  stone castle wall with a gate and a watchtower across the top, a statue in the plaza, flowerbeds and braziers.
  `docs/samples/castle-candidates.png` is the contact sheet of what was surveyed (every pack in the assets repo and Chronos's building art);
  the other packs are side-view (Craftpix tropical city, vector) or top-down (Craftpix village, dungeon), so they would mix perspectives.
- **Planned on the isometric grid** (`castleSpots.ts`): the yard is a lattice of ground tiles `(u, v)` (`u` down-right, `v` down-left; `Layout.grid` is
  the screen spot of tile (0, 0), `cellX`/`cellY` turn a tile into pixels) and everything is snapped to a tile.
  - **Plots**: each building has a fixed footprint of tiles sized for its grand look (1 x 2 or 2 x 1), a `door` tile, and `flip` (the kit's doors face
    down-left; mirrored they face down-right, so the left-hand buildings are mirrored and every door faces its road). At least one tile of grass or path
    lies between any two plots, and a test keeps it so.
  - **Roads**: one road enters by the gatehouse, winds to the plaza (a clear 3 x 3 of cobbles, the statue on the middle tile, a brazier on each corner)
    and branches to every door; each door has a road tile in front of it. Heroes stroll those tiles only (`walkTiles`, a breadth-first route from tile
    to tile), never over the statue or a brazier.
  - **Walls**: a corner tower, the gatehouse in the left run and plain runs in the right run, all on the same lattice lines (tower at (-5,-5), runs along
    `u = -5` and `v = -5`), drawn behind everything (`depth`). Trees beyond them are behind the wall.
  - **Props** sit on grass tiles beside the building they belong to, never on a road or a plot: crates and barrels by the treasury and armoury, a weapon
    rack and hay by the barracks, crystals by the tower, lamps, flowerbeds, bushes and trees along the walls and the edges. (There is no training dummy
    in the kits; the orcs' weapon stall is the rack.)
  - **Name tags** sit above the roofs of the two back buildings and below the feet of the two front ones, so they never cover a door or the heroes' road.
- One canvas in the scene's own pixels, drawn a whole number times bigger with nearest neighbour (1 on a phone, up to 4 on a big screen), panned by
  native scroll when the screen is smaller than the scene. **Two arrangements of the same plaza** (`Layout`, `layoutFor(width < height)`):
  - `TALL` (upright): 392 x 584, the plaza with mage tower and treasury on its north side and barracks and armoury on short roads off its south side.
    It fits a 393x852 phone (600 px for the scene) with no panning, so nothing is cut off.
  - `WIDE` (sideways): 756 x 520, the same plaza with all four buildings on the two roads that wrap its north side (barracks and armoury at the far
    ends), the wall closing the yard on both sides. It opens framed on the plaza (`openTop`), with a short pan up to the gate and tower.
- **Pictures** (`src/art/castle/`, 34 PNGs, 568 KB, bundled into game.js as data URLs, so the service worker's `FILES` is unchanged): each is one
  piece of the kits at **half size** (`tools/castle/prep.py`: 2x2 box average, then solid or clear), so a cottage is about 100 pixels wide.
  Nothing is drawn by code but the scaffolding, flags and effects.
- **Ground**: `grass_tile` and `cobble_tile` (the Knights kit's) are laid as the lattice of diamonds 90 across and 52 down (`TILE_W`, `TILE_H`), rows
  half a tile along, back to front; every few grass tiles are mirrored so the lawn does not repeat. The grass tile's dark outline along its back
  edges is painted over in prep, so no grid shows. A tile is cobbles when it is in the plaza or a road block (`isPaved`). The page behind the scene is the grass tile's average colour (`GRASS`).
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
  door high, no more. They walk the roads and the plaza ring.
- **Build effect**: when `update` sees a level go up it plays 1.5 s: the old look inside scaffolding with dust, a warm flash at 0.8 s as the
  new look swaps in (it settles three pixels), the scaffolding comes down and sparkles rise. A level that keeps the same look still gets it.
- **Cost**: it draws only while the Castle tab shows (not under a card, not when the page is hidden). Battery saver caps it at 30 fps. Reduced
  motion: no smoke, sparks, runes, strolls or scaffolding; the flags and glow stand still and a bought level swaps with a few sparkles.
- Name tags are real buttons over the canvas, set in percentages so they follow the scale, rebuilt only when their text changes; their `:active`
  rule keeps the centring transform (the global `button:active` would move the tag out from under a finger).

## Art and tools
- Pictures: `src/art/castle/` (see above; the wall is now all the Knights kit's: gatehouse, wall run and watchtower). `tools/castle/prep.py` copies them from Chronos's isometric kits; `tools/castle/candidates.py` makes the
  survey sheet; credits are in `CREDITS.md`. The kits were made for Chronos (not by PixelLab); the castle pieces in `iso/castles/` (Blood Court
  keep and tower, the dwarves' hold) were surveyed and only the Liches' chapel and the Dwarves' great hall, forge and shrine are used.
- PixelLab: none this time (0 generations); the old generated towers are gone. The earlier jobs used 57 + 3 + 9.

## Tests and samples
- `test/castleScene.test.ts`: every picture named exists and its size in `SPRITE_SIZE` is the file's own (read from the PNG header); four looks
  per building, a plot inside the yard in both arrangements; no house sprite in two buildings and every look bigger than the last; the grand
  look of every building fits inside the yard and the upright yard is no wider than a phone; every picture is used and the ground tiles are one
  lattice cell wide; no two plots share a tile or sit nearer than one tile apart; every door has a paved tile in front of it, facing the right way and
  reachable by road from the gate; the plaza is a clear 3 x 3 with the statue in the middle and a brazier on each corner; no prop stands in a road or
  on a plot; the wall's runs line up with its tower; buildings overlap at most by a corner; vents and lights lie on
  their look; the card words grow with the level.
- `node tools/castle/shots.mjs` (after `npm run web`; `CARD=1` adds the card and build frames) makes `docs/samples/castle-{empty,part,maxed}-{upright,sideways}.png`,
  `castle-card-*.png` and `castle-build-*-0..4.png`.
