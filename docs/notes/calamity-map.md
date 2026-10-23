# The Calamity's map: a local isometric land

The owner's ask: "Calamity needs to be on the battle camp screen. Maybe a portal as the starting point. Calamity shouldn't use the same tower setting. It needs a
starting spot and one to go to. After getting to the next spot and clearing it, the path unfogs and shows the next spot, or two if it's a fork. A local map with a
defined path through it and a similar fog of war." Isometric like the camp; landmarks per spot; hidden side spots; heroes walk the road.

## In the camp
- A **portal** (the PVFX Foundry rift, a CSS-stepped strip of 16 frames turning once in 1.8 s, nothing flashes; still under reduced motion) stands in the road inside the
  gate (`campLayout().portal`, `camp.ts` `portalSlot`), with a small **board** under it on its own posts (`calamitySlot`, the Daily and Tower boards' look) carrying
  `slotInfo('calamity')` ("Map 2/6 · continue", "best 3 of 6 maps" or "one hero, a climb"). A tap on either opens the Calamity (`onCalamity`: the saved run, or the hero pick).
  The war standard and the weapon rack moved a little outwards to make room. The home screen's Calamity pill is gone; `#hmCalamity` is now the board (the tips find it there).

## The land (`src/sim/calLand.ts`, pure; `src/calMap.ts`, the screen)
- Each of the 6 maps is a land (`LAND_ART` in the generated `render/calArt.ts`): green fields, forest, desert, snow, ashlands, ruins, each its own ground, road tile, trees,
  rocks and lair (names in `LAND_NAMES`: The Ashen Road, The Thornwood, The Burning Sands, The Black Summit, The Cinder Waste, The Hollow Heart). The old tower look is not used.
- **The node graph is untouched** (`calamityMap`: rows, `next`, kinds, twists, balance). `landOf(seed, act, nodes)` lays it out on an isometric lattice (a cell is `(i, j)`,
  tile 86 to 100 across by 0.578 of that down): a row's nodes stand across the land by how many there are (the pairs and threes staggered), rows `ROW_A` cells apart, the start (the
  portal) below the first row, the boss at the head. Roads are staircases of single cell steps between linked spots (the turns drawn from the stream, so they wind); trees,
  bushes and rocks are scattered off the road, thicker at the edges. Own side streams (`0x1a4d` layout, `0xdec0` decoration, `0x51de` side spots), so the maps' nodes are as they were.
- **Fog** (`fogOf`, derived from `path`, `at`, `cur`: no new save state): the start and the first floor are clear at first; a cleared spot shows the spot or spots its road
  leads to (both at a fork), the spot in play, and a hidden side spot once its node is cleared. Nothing further. On screen the fog is a dark layer drawn at a quarter of the
  scene's resolution, smoothed, with soft holes round lit spots and along lit roads; a newly lit road clears cell by cell towards its spot (about half a second, one fade,
  no blinking; none under reduced motion). `seenFog` remembers what was clear so only the new part lifts.
- The land is **baked once** into a canvas (ground, road, props and landmarks sorted by foot line), in scene pixels times a whole number of device pixels (as the camp). Only
  the fog (while it lifts), the leader and the portal change. It sits in a scroll box and the camera puts the party's spot at about 62% of the height, the road ahead above it.
- **Landmarks**: fight = a weapon stall (flattened hide tent once cleared); elite = a war drum (a skull pile); shop = a market stall; recruit = a striped tent with the standard;
  chest = chests; campfire = a fire (burnt out: logs and ash); mystery = the moon shrine; boss = the map's lair; start = a stone circle with the portal. Cleared stall, tent,
  chest and shrine are the same picture drained of colour, with a green tick. Lit spots wear a still gold ring (a cyan one for a side spot); the chosen one is brighter.
- **The leader walks**: the squad's first hero (`heroRig`, shrunk by `render/smallRig.ts`, shared with the camp) stands beside the spot the party is at and walks the road to
  the chosen one before the fight or card opens (0.5 to 1.5 s by length), the camera following; a tap anywhere arrives at once. After a side spot it walks back to the road.
- The header (gold, Pack, Home, Abandon, party, relics) is the tower view's own. The first time (until a spot has been picked on this device, `lotf-cal-hint`) the line under the map says to tap a lit spot.

## Hidden side spots (`sideSpots`, `sideChoices`, `Current.side`, `TowerState.sideDone`)
- From the seed: none on some maps, one or two on others (about 0.7 a map), each hanging off a node of the first half on its own row: a **hoard** (gold only, half a chest's) or a
  **mini-boss** (a named elite and its escort, `sideEliteAt`: gold, half the XP, no heal, no relic and no gear). A spot with no room on the land is left out.
- Revealed when the node it hangs from is cleared; takeable only while the party stands there. **Optional**: the road's own choices are untouched. Taking it (`enterNode` with its id)
  changes neither `at`, `row` nor the floor; `clearNode` marks it in `sideDone` and the party is back on the road with the same choices. Moving on skips it for good.
- Saves: both new fields are optional; a run saved before loads and carries on (a map's side spots come from the seed).

## Round two: readability, the start, clipping, balance
- **Spot kinds** (the pack art, `tools/calmap/prep.py`): a plain fight is a **foe camp**: an orc palisade corner with a skull-and-spear banner at its foot (flattened tarp once cleared); an
  elite is the war drum platform (a skull pile once cleared); a shop the one market stall; a recruit camp a tent with a standard, **the tent varying camp to camp** (striped red, cream
  yurt, striped green); chests, the campfire (a burnt-out ring once cleared) and the moon shrine as before; the boss's lair per map. A hidden hoard is an ore cart, a hidden mini-boss an antler
  skull banner over a bone fence.
- **The road**: each land's road tile is chosen to read against its ground and to suit it (trodden dirt through the grass, grey flagstones through the forest, dark earth through the sand, dark
  slush through the snow, mud through the ash, cobbles through the ruins), the fog's holes are narrower (a ribbon of lit road with a bloom round each spot, not a blob), and the ground tiles
  are one or two kinds so the land's own look (sand, snow, ash, ruins) dominates. Each branch of a fork is its own road.
- **The start**: a calamity's first floor is **one spot or two** (`makeMap(..., twoStarts)`, the calamity's own rule: the paths set out from two lanes; six paths, so the map keeps its width). Such a map
  is redrawn on its own salts until it has a mini-boss with ways round it, a shop and a chest and no floor wider than four (`calamityMap`). The tower's maps are untouched (a test: they still start from three or four spots on some maps). This
  changes the calamity's maps (a saved run keeps the map it has).
- **No clipping**: a landmark stands over its cell but no further out than the scene's edge lets its whole picture show (`CalMap.ax`, from the picture's reach each side, a recruit camp's standard
  included), so nothing is cut at 344 to 360px wide; its ring, button and fog hole follow it.
- **Balance** (`npm run balance -- --no-tables --calamity --attempts 300`, share felling each map's boss): before the round 87 / 81 / 64 / 43 / 34 / 17 %; with the start capped and nothing else changed
  82 / 77 / 58 / 41 / 30 / 16; after trimming the side mini-boss (a quarter of the fight's XP) and retuning the bosses' hp (2000, 3100, 3250, 3250, 2760, 1900) **85 / 81 / 63 / 44 / 35 / 15**
  (the note's 86 / 80 / 64 / 45 / 33 / 14).

Tests: `test/calLand.test.ts`. Art: `tools/calmap/prep.py` (atlas and portal), shots: `tools/calmap/shots.mjs` with `saves.ts` (`docs/samples/calamity-map-*.png`).

## Closing and reopening (the owner's add-on)
Everything the map shows comes from the calamity's own save slot, which the page saves at every change (`saveSlot`): the leader's spot (the node in play, else the one cleared last, else the
portal), the fog already lifted and the spent landmarks (all derived from `path`, `at`, `cur` and `sideDone`), and the hidden side spots revealed, taken or skipped (`sideDone`, and the
node the party stands at). The one new field is `TowerState.going`, set when a walk begins (`setGoing`) and cleared when the spot is entered.
- **Closed mid-walk:** the walk is saved as begun. Reopening via the portal lands on the map with the leader at the spot it was walking to, that spot lit as chosen with its button ready,
  and its fight (or card) not yet started. Choosing a different spot puts the leader back where the party really stood first.
- **Closed mid-fight:** as the tower and the calamity always did: the fight's band and strength are fixed when its node is entered and saved with the run; the fight itself is not saved
  (no mid-battle state), and the party's wounds are applied only when a fight ends, so reopening starts that same node's fight again from its deploy screen, as if freshly entered.
- **Closed between maps:** the boss's fall advances the map and is saved at once, so reopening shows the next map's start (the portal, the first floor lit, no side spots taken).
- Tapping the camp portal (or loading a saved calamity from anywhere) lands on the map with the camera on the leader. The fog lift animation is only for a spot newly seen in this session;
  after reopening the same view appears (`tools/calmap/reload.mjs` reloads the page mid-map and compares the screenshots byte for byte: identical).
- Tests (`test/calLand.test.ts`): a run mid-map with fog, a side spot taken and spent spots survives serialising and loading with the same state and the same view; mid-walk; between maps.
