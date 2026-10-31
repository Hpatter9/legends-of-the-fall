# The Calamity's battle zones (CAL-ZONES)

The owner's ask: "Make the battle zones for Calamity much more interesting, more varied, with objects and moving parts. Make it feel alive
and real." Every Calamity run is a portal expedition, and until now each portal world fought on one fixed court (a flat 14 x 13 slab, the
same shape every time). Now a court's inner field (ten across, the Calamity's own board) is laid in one of six **zones** of the Calamity's
own, or now and then one of the plain shapes, picked by the fight's seed; the zone stands its **things** on its tiles (pillars, statues,
braziers, coffins, crystals, chains, banners, bones, candles, runes, skull totems), and the page brings it all to life.

## The zones (`src/sim/calZones.ts`)

Each is a real shape of heights, cover and narrows, made only of the terrain the rules already know (walls stop shots, boulders stop low
shots, deep ground stops walkers but not fliers, shallows slow, a shrine mends). They are laid through the ordinary layout machinery:
`applyLayout` (layouts.ts) now looks in `ZONE_TEMPLATES` too, eases the land round the tiles a zone pins, and keeps the zone only if `fit`
passes (every tile reachable by a walker who climbs one level; the deploy rows clear). The template tools moved to `src/sim/layoutKit.ts`
(`Plan`, `put`, `easeAround`, `fit`, and `prop` for a zone's things), unchanged, so the old shapes lay exactly as before.

| Zone | The shape | Things on it |
|---|---|---|
| The fallen nave (`nave`) | Two colonnades of pillars (walls; one in five fallen to a boulder), side aisles a step lower, a raised crossing with a dais two steps up | pillars with banners, broken pillars, braziers at the colonnades' ends, statues in the aisles, candles and a rune on the dais, rubble and bones |
| The crystal chasm (`cavern`) | A jagged chasm right across (one or two tiles), crossed on two necks of rock, a pit or two besides; crystal clusters (boulders) for cover | crystals that glow and shimmer, shards |
| The crypt rows (`crypt`) | Rows of stone coffins (boulders: they stop low shots) across a sunken floor, staggered so the lanes zigzag; a ledge a step up along each wall | coffins (some broken open: rubble, a skeleton), bones and candles in the lanes, a skull totem and a brazier at the ledges' ends |
| The broken bridge (`voidBridge`) | The middle ground is a drop into the void but for a stone bridge two wide (broken to one tile at its middle), a plank way one wide off to the side, and a floating ledge a step up beside the bridge | pillars with hanging chains at the bridge's heads, a banner, a statue or brazier on the ledge, rubble at the break |
| The ritual circle (`ritual`) | A sunken disc (a shrine at its heart two times in five), a ring of standing stones (walls) at its corners and sometimes its ends, braziers outside | runes round the disc and the summoning circle at its middle, two skull totems and two statues as the stones, candles and bones |
| The flooded vault (`floodVault`) | Shallows over the whole middle ground, a deep cistern, two dry platforms two steps up (each with a stair) on opposite sides, pillars standing in the water | pillars with chains, a statue and a brazier on the platforms, dripping water |

A chasm is deep ground with a looks flag (`Tile.chasm`): to the rules it is deep water (no walker, any flier), and the page draws no column
there, so the void shows through. `Board.props` (`Prop`, `PropKind` in board.ts) are looks only; a tall thing always stands on a tile
nobody stands on (a wall or a boulder), a low thing (bones, candles, a rune, shards, rubble) lies on open ground and hides nobody.

**Which zone** (`zoneFor(seed, world, act)`): weighted by the portal's world (the Ashen Keep leans to the broken bridge and the nave, the
Rootbound Shrine to the nave and the flooded vault, the Lost Caravan to the ritual and the vault, the Prism Vault to the crystal chasm, the
Hollow Court to the crypt, Frostwatch to the chasm and the bridge; a fort, a ring, the ravine, the pass or the islands now and then), and
leaning by the Calamity's land: the Buried Sanctum to the nave and the crypt, the Forsaken Vaults to the vault, the crypt and the chasm,
the Calamity's Heart to the broken bridge and the ritual (about 1.7 times the bridges of the first land). Its own side stream
(`mixSeed(seed, 0xca120e)`); `layoutFor` never picks a zone, so no other fight's board moves. Of 1,800 courts (six worlds, three lands):
nave 18%, broken bridge 16%, ritual 18%, crystal chasm 13%, crypt 14%, flooded vault 14%, plain shapes 6%.

**The court** (`destinationBoard(seed, world, act)` in sanctuary.ts): the field is `makeBoard(seed, world's land, 10, 13, zone)` (so the
land's own puddles, tall growth, boulders, shrines and barrels are laid round the zone as on any board); the two margins each side are the
world's scenery as before, now at the height of the field's edge beside them; the landmarks and the arrival portal are as they were.
`enterNode` passes the act. The board's seed, land and weather are the court's as before.

## The look (`src/render/zoneLife.ts`, hooks in `boardView.ts` and one line in `main.ts`)

- **Things on the tiles** (`zoneProps`): each drawn inside its own tile's container, so it sorts by depth with the land and the fighters.
  Tinted to the world (`LOOKS`: stone, flame, runes, crystal, fog, motes, void, light).
- **Moving parts:** braziers and candles flicker (their glows breathe, the candles' own two frames), embers rise from every brazier's
  flame; the skull totems burn (six frames) with a green glow; runes turn (eight frames) and pulse; crystals glow and shimmer; chains and
  banners swing from the pillars' tops; drifting fog banks; motes by world (embers in the Ashen Keep, spores, dust, sparkles, snow-light);
  two slanting light shafts that breathe; water dripping from the dark above with a ring where it lands; a glow far down in every chasm,
  and now and then something vast passing beneath the board in the void; bats crossing over the field every ten seconds or so.
- **Never hiding a fighter:** a tall thing (pillar, statue, brazier, crystal, totem; a pillar's chain and banner with it) fades to 38%
  while a fighter stands behind it (`fadeTall`, fed by the page each frame with the fighters' places), and comes back after.
- **Calm:** with reduced motion everything is laid out and held still (the board view's own rule); on a battery saver the air has fewer
  motes, fog and shafts, no bats or deep shadow, and it moves every other frame. Draw count: a zone adds about 30 to 60 sprites (one
  texture each kind, mostly the road atlas and one-pixel motes).

## Checks

- `test/calamity-zones.test.ts`: every zone lays on the Calamity board in every world's land (30 seeds each: walkable end to end, the deploy
  rows clear and free of barrels, the same each time); each zone's own shape, its tall things only on solid tiles, nothing in the deploy
  rows; a portal court in a zone: every hero deploy tile reaches every foe deploy tile (a jump-1 walker), a band of 13 stands on open
  ground; the pick by seed, world and land (the Heart has more bridges), `layoutFor` never picks a zone; a fight plays out to its end on
  every zone; a portal fight entered in a run is the same board each time.
- The existing layout, board, sanctuary, rift, terrain, lands and calamity tests pass unchanged.
- **Balance** (the greedy bot, `playCalamity`, 200 seeds, before / after): first region cleared 194 / 195; second region cleared 77 / 65;
  full clears 2 / 2; mean regions 1.37 / 1.31; mean floors 12.9 / 13.2. The second region is a little harder on the new courts (the
  flooded vault's slow water and the bridge's narrows); 12 in 200 is within about 1.3 standard errors of the old, so no retune.
- Screenshots (`tools/calamity/zone-shots.mjs`, each zone six seconds into a fight): `docs/samples/calzones-<zone>-<world>-393.png` for all
  six zones (and the nave in Frostwatch, the bridge in the Prism Vault), some at 360 and 412, and the bridge with reduced motion
  (`-calm-393`).
