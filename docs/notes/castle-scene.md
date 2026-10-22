# The castle courtyard (Castle tab)

## What it is
- The Castle tab is a castle courtyard seen in the isometric (2:1, lit from the upper left) view of Chronos's building kits
  (`src/castle.ts`, data in `src/render/castleSpots.ts`). The owner's ask was "use some of the nicer sprites": the earlier 3/4 village yard
  (Chronos's plain village houses, 0.48.0; `docs/samples/castle-before-after.png` shows it beside this) gave way to the richer isometric kits
  the first worker had passed over as "far too detailed". Everything shares one view: a lattice of grass tiles with cobbled roads and a plaza, a
  closed ring of stone castle wall with a tower on each corner, a fountain in the square, flowerbeds and braziers.
  `docs/samples/castle-candidates.png` is the contact sheet of what was surveyed (every pack in the assets repo and Chronos's building art);
  the other packs are side-view (Craftpix tropical city, vector) or top-down (Craftpix village, dungeon), so they would mix perspectives.
- **Planned on the isometric grid** (`castleSpots.ts`): the yard is a lattice of ground tiles `(u, v)` (`u` down-right, `v` down-left; `Layout.grid` is
  the screen spot of tile (0, 0), `cellX`/`cellY` turn a tile into pixels) and everything is snapped to a tile.
  - **Plots**: each building has a fixed footprint of tiles sized for its grand look (1 x 2 or 2 x 1), a `door` tile, and `flip` (the kit's doors face
    down-left; mirrored they face down-right, so the left-hand buildings are mirrored and every door faces its road). At least one tile of grass or path
    lies between any two plots, and a test keeps it so.
  - **Roads**: short paths run from the square's edge to the ring road behind the south buildings and the lane (see below).
  - **Walls: the two back sides only** (`ring()` in `castleSpots.ts`): the north-west and north-east runs meet at a tower on the north corner, each ending in
    a tower (so three towers) (no gate: the runs are plain wall); the front is open grass. Each run is a line of **identical wall
    cells laid exactly `WALL_STEP` (93, 54) apart**, from the north tower to the far one, the last cell cut (`Prop.cut`) where its tower covers it. The
    cell (`tools/castle/prep.py` `wall_cell`) is made from the kit's wall block, which has end caps, two banners and a slope of 0.44, so a row of the
    raw blocks showed a notch at every joint and drifted off the 26/45 lattice: its caps and dark end columns are left out, the columns past the last
    merlon rebuilt from one merlon back, the first banner painted over (the cell starts in its middle), and it is cut at merlon starts one merlon period
    apart (five merlons, 93 px) with every column shifted up a whole number of pixels so the top and foot lines run at the lattice slope. Cells then
    butt with no seam (`docs/samples/castle-wall-joints.png`: the north corner, the east and west towers, both gate joints and mid-run seams at 3x; made by
    `node tools/castle/joints.mjs`, which draws the walls alone via a hidden `window.__castleWallsOnly` flag). Runs start and end under the towers' bases,
    which are drawn over every joint; Both runs are behind everything (`depth`). The yard is
    now 4 tiles back from the first plots' tile row (corner at (-4,-4)), so the corner tower shows two tiles behind the chapel.
  - **Props** sit on grass tiles beside the building they belong to, never on a road or a plot: crates and barrels by the treasury and armoury, a weapon
    rack and hay by the barracks, crystals by the tower, lamps along the roads, flowerbeds, bushes and trees in the corners of the yard. (There is no
    training dummy in the kits; the orcs' weapon stall is the rack.)
  - **Name tags** sit above the roofs and shrink a little (`--ts`) with the village, but stay readable; tap targets are at least about 22 css pixels.
- **One close-up scale, no zoom** (the owner: "way more zoomed in ... the wall needs to extend past the edge of the screen"). `pickScale(boxW, dpr)` picks the whole
  number `k` of **device** pixels per scene pixel that shows about `VIEW_W` (560) scene pixels across the frame: `k = 2` on a phone 360 to 412 css wide at a ratio of
  2.6 to 3 (a scene pixel about 0.7 css pixels), `k = 1` on a ratio-2 phone, the whole css scale (1, 2, 3) of about the same look at a ratio of 1. The canvas's
  backing store is `k` times the scene and its css size is that over `devicePixelRatio`, so it stays sharp at any ratio. The game is upright only; there is no zoom,
  pinch, double tap, or scrolling.
  - `viewFor(lay, boxW, boxH, dpr)` (castleSpots.ts) gives the frame's mapping: the canvas is the frame (chips bar to tab bar) with the square's column (the back
    corner tower's) in the middle and the back corner tower `TOP_GAP` (26 css px) under the top, so treetops show over the wall. If the town is taller than the
    frame (only the shortest phones, 360x780: about 100 css pixels) the page scrolls up and down from the top, never sideways. The two back wall runs are plain
    continuous wall (no gate) running diagonally off both sides of the screen; the far towers are 16 tiles out, off screen. Beyond the wall it is woods (`decorAt`).
  - **The town square** (`SQUARE`, 5 x 5 tiles, about three times the old plaza): a border of flagstones all round (`pavingAt`) and a chequer of flagstones and cobbles
    inside; the **fountain** in the middle with a walk all round it, braziers on three corners and lamp posts beside the square, two **benches** on the two north
    sides facing the fountain, market stalls along the two south sides, barrels, crates and pots round the edge, banners on poles and a well. Heroes stroll the
    square and the paths and stand about in it (`walkTiles` leaves out the fountain, benches, braziers, stalls, lamps, banners, the well, pots, crates and barrels).
  - **The fountain and the benches are made with PixelLab** (no kit has either): `tools/castle/gen.py` calls `/generate-with-style-v2` with kit pieces (Knights well,
    Dwarves shrine and brazier, Knights chapel for the fountain; Knights cart, woodpile, crates and signpost for the bench) as style references on a 256 px canvas
    (192 px for the first rounds), `no_background`, a description of the piece in the 2:1 isometric view. Each job id is saved to a scratch folder before it is polled;
    10 generations in all (seeds 11-14 and 31-33 for the fountain, 21-23 for the bench; 4 jobs at most in flight). The picks, by eye, are copied to
    `tools/castle/generated/fountain.png` (seed 33 at 256 px, 216 x 189) and `bench.png` (seed 22 at 192 px, 164 x 145); `prep.py` halves them like the kit pieces
    (the bench twice, so it is 41 x 36). In code the fountain has droplets falling down its two streams and sparkles on its water (`CastleScene.emit`; not drawn
    when the page asks for reduced motion).
  - **Nothing is cut off**: the buildings are placed so that every look is whole on the screen at 360, 393 and 412 css pixels wide (within 247 scene pixels of the
    square's column), and so are the market stalls at 393 and 412; scenery may be cropped. The four north buildings sit on two tiers (mage tower and treasury nearest
    the corner tower, barracks and armoury out on the sides of the square) so that they do not overlap.
  - **The ring of buildings**: the wall hugs the north-west and north-east sides, backing the four buildings that face the square from those sides (mage tower and
    barracks down the north-west side, treasury and armoury along the north-east side), their doors opening onto the square's border or a one-tile path from it. The south-west and south-east
    sides have a building each (stable, tavern) standing clear of the square with their doors on a ring road behind them (the pictures' doors look down, so they cannot
    face the square), reached by short paths from the square's south edge; the chapel and the library stand further down either side of the lane that leaves the
    town, each on a short side path. Gardens fill the north corner between the walls and the buildings; hedges, bushes, flowers, trees, hay and rocks are scattered
    between the buildings by a fixed hash of the tile (`scatter`), never within a tile of a building or path.
  - **The front**: the lane zigzags down from the ring road's south corner to the bottom of the scene, with a signpost beside it (the Armies place: tag
    "Armies · to battle", a tap goes to the Battle tab) and a lawn of bushes, flowers, rocks, hay and trees below the town (`decorAt`, from `FRONT_ROW` down).
    Heroes stroll the square, the paths and the lane as far down as the picture shows (`fit()` filters the walk tiles to the view). Heroes are drawn about a door high
    (`HERO_PX` 44).
  - **Name tags** are real buttons at least 32 css px square with 10 px names and 9 px second lines ("Mage Tower" / "4/4", "Tavern" / "· your heroes"), put at
    fixed spots (`Plot.tagAt`, scene pixels) round the village so none overlap and none covers a door; every tag's whole width is inside the frame at the three phone sizes.
- One canvas, drawn with nearest neighbour. There is a single arrangement (`YARD`), upright only.
- **Pictures** (`src/art/castle/`, 59 PNGs, about 1 MB, bundled into game.js as data URLs, so the service worker's `FILES` is unchanged): each is one
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

## Eight plots: six upgrades and two places
- The sim has **six upgrades** now (`BUILDING_IDS` in `src/sim/castle.ts`): the four old ones and two new ones, each with five levels and the old cost curve
  (60, 120, 200, 320, 520 crowns), starting at level 0 in saves that lack them (`readCastle`):
  - **Stable**, +4% move speed per level (`MOVE_PER_LEVEL`, `moveRate`): `startStage` passes `move` to the fight, which keeps it as `Battle.heroMove`, and
    `stepTo` divides a hero's step time by it. Steps only (swings and skills keep their speed), heroes only (foes walk as before); 1 when unset, so a plain
    fight is unchanged.
  - **Library**, +6% XP per level (`XP_PER_LEVEL`, `xpRate`): `fightXp(b, rate)` multiplies each hero's pay, and `main.ts` passes the meta's rate.
  - Tests in `test/castle.test.ts`: the step time shortens by exactly the rate, foes unaffected; XP scales by the rate; old saves start at 0, five levels.
  - **Balance** (`npm run balance -- --games 800 --saves 100`): the default report is byte-for-byte the same before and after (no castle, no change). A new
    `--castle stable=5,library=5` flag plays the whole-run table with a castle. Mean furthest stage over 12 runs of a greedy player (100 saves):
    base 5.1 / 7.2 / 10.6 / 13.6 / 16.9 / 22.8 (runs 1-5, 10); Stable 5 alone 5.1 / 7.1 / 11.1 / 13.5 / 16.8 / 23.1 (noise: walking faster barely matters to the
    greedy player); Library 5 alone 5.5 / 9.4 / 14.0 / 17.1 / 19.6 / 23.1 (heroes level sooner, then it fades); both 5.4 / 8.4 / 13.3 / 17.3 / 19.5 / 23.8.
- Two **places** that are not upgrades (`PLACE_IDS`): the **Tavern** (the Knights' inn, with its sign, barrels and lantern) and the **Chapel** (the Knights'
  church; not the Mage Tower's). They have one look, a tag "Tavern · your heroes" / "Chapel · spells", and tapping them goes to the Heroes tab (the tavern
  scene) and opens the spellbook (what the Spells tab does). `PlotId` is a building or a place; `lookFor(id, stage)` gives a plot's look.
- Looks (four each for the new upgrades): Stable: hay and a woodpile; a cart and hay; a thatched shed and the cart; the Knights' stable with its horses.
  Library: baskets and crates; the Knights' granary tower with baskets; the Fae observatory-house; the Liches' manor with teal windows (runes rise from it).
- Plots: Mage Tower, Treasury, Barracks, Armoury as before; Stable (2 x 1, door on the road below it) south of the plaza; Tavern (1 x 1) and Library (2 x 1)
  at the south-east; Chapel (1 x 1) in the north-west corner behind the mage tower. Every door has a road tile (the roads grew a south street), plots keep a
  tile apart, and the near walls hide none of them. The yard is 11 x 11 tiles still (the back margin is one tile now: a back wall hides nothing).
- **Village life**: three market stalls (`stall`, `stall2`, `stall3`) by the plaza and at the end of the main road, and a garden in the south corner: vegetable
  beds and an herb bed side by side, with a bush and flowers. (No kit has a scarecrow.) A building's goods stand beside it: crates and barrels with the
  treasury, a rack and hay with the barracks, crystals with the tower.
- Name tags are smaller (they shrink with the village) and sit where they cover no door.

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
- Pictures: `src/art/castle/` (see above; the wall is the Knights kit's wall run and watchtower). `tools/castle/prep.py` copies them from Chronos's isometric kits; `tools/castle/candidates.py` makes the
  survey sheet; credits are in `CREDITS.md`. The kits were made for Chronos (not by PixelLab); the castle pieces in `iso/castles/` (Blood Court
  keep and tower, the dwarves' hold) were surveyed and only the Liches' chapel and the Dwarves' great hall, forge and shrine are used.
- PixelLab: none this time (0 generations); the old generated towers are gone. The earlier jobs used 57 + 3 + 9.

## Tests and samples
- `test/castleScene.test.ts`: every picture named exists and its size in `SPRITE_SIZE` is the file's own (read from the PNG header); four looks
  per building, a plot inside the yard; no house sprite in two buildings and every look bigger than the last; the grand
  look of every building fits inside the yard; every picture is used and the ground tiles are one
  lattice cell wide; no two plots share a tile or sit nearer than one tile apart; every door has a paved tile in front of it, facing the right way and
  reachable on foot from the square; the square is at least 5 x 5 (twice the old 3 x 3) with the fountain in the middle, braziers and lamps round the edge, benches, a flagstone border and stalls, and a building stands on at least three of its sides; every building is whole on screen at the three phone sizes; no prop stands in a road or
  on a plot; no lawn or woods scenery sits on a road, a plot or a prop and the signpost opens onto the road; the wall runs off both screen edges with no end tower showing and the plaza, every door and tag are on screen at three phone sizes; the one close-up scale is whole and about the same width everywhere; the wall's runs line up with its tower; buildings overlap at most by a corner; vents and lights lie on
  their look; the card words grow with the level.
- `node tools/castle/shots.mjs` (after `npm run web`; `CARD=1` adds the card) makes `docs/samples/castle-{empty,part,maxed}-upright.png` at 393x852 and `castle-card-upright.png`,
  plus `castle-maxed-360x780.png` and `castle-maxed-412x915.png`, all at a device pixel ratio of 3 (`DPR=3`, a phone's).
