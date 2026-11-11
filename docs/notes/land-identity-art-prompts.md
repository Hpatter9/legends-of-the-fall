# LAND-IDENTITY: art prompts (one file for the battlefields' missing art)

Everything the battlefields still need that the packs, `src/art/` and the nine hold sheets do not have. Three sheets: the first two are
the LIVING-FIELDS asks (traps, and the life of the field), unchanged, folded in here so there is one place to look; the third is new.
Repo `hpatter9/legends-of-the-fall`, branch `art/land-identity`, files under `art-source/land-identity/`. Until they land the game
shows stand-ins (the hold sheets' nearest pieces, tinted sparkles, plain drawn creatures).

## 1. Traps, hazards and the land's own props (one sheet)

```
For the repo hpatter9/legends-of-the-fall, branch art/land-identity: paint one sprite sheet of battlefield traps, hazards and props for a
phone pixel-art fantasy auto-battler (the King God Castle look on a Final Fantasy Tactics style isometric height grid), saved as
art-source/land-identity/traps.png on a fully transparent background. The sheet is 1024 x 640 px: a grid of 8 columns and 5 rows of
cells, each cell exactly 128 x 128 px, read left to right, top to bottom.

Every cell shows one thing standing or lying on one isometric floor tile. The tile is a 2:1 diamond 128 px wide and 64 px tall in the
LOWER half of the cell (its middle at x 64, y 96; its four points touch the cell's left, right and bottom edges and the cell's middle
line). Do NOT paint the tile's ground itself: paint only the thing, with a soft shadow under it, so it can be laid over grass, stone,
sand or snow. Things lying flat (a trap plate, mud, cracks) stay inside the diamond. Things standing (a totem, a brazier, a wall) rise
from the diamond's middle into the cell's upper half. The light comes from the upper left. Each must read at a glance at half this size
(64 px wide), so use bold shapes, a dark outline and one strong colour each.

Row 1: 1 a spike trap, set: a square stone plate with a grid of holes and steel tips just showing, tan rim. 2 the same trap sprung: tall
steel spikes thrust up, a little blood. 3 a rope snare, set: a loop of rope on the ground pegged to a stake, half hidden by leaves.
4 the snare sprung: the loop pulled tight and lifted on a bent sapling. 5 a rune ward, lit: a ring of glowing violet runes on the ground
with a floating rune over it. 6 the ward spent: the same ring burnt out, grey and cracked. 7 brambles: a low, wide tangle of dark thorny
briars with a few red berries. 8 dry thorn scrub: the same tangle sun-bleached and leafless, for sand and autumn ground.

Row 2: 1 deep mud: a dark brown churned sink with wet highlights and a boot print. 2 quicksand: a pale sandy whirl sinking to a darker
middle, with fine rings. 3 a poison bog, frame 1: a sickly green pool with bubbles and a wisp of green vapour. 4 the bog, frame 2: the
same pool, the bubbles burst and new ones rising (it will be flipped between the two). 5 thin ice: pale blue-white ice with fine
hairline cracks and dark water showing faintly beneath. 6 cracked ice: the same, split by wide dark cracks, a shard lifting. 7 broken
ice: a jagged hole of dark water with floating shards. 8 a war totem: a carved wooden pole with a horned skull, feathers and an orange
glowing rune, about as tall as the cell.

Row 3: 1 a standing iron brazier, lit, with flames and embers. 2 the brazier knocked over, its coals spilt and glowing across the tile.
3 a steam vent, quiet: a cracked rock hole with a thin wisp of steam. 4 the vent bursting: a tall white-blue column of scalding steam.
5 rockfall mark: a scatter of rubble and a cracked ground mark where rocks have fallen before. 6 falling rocks: three boulders in
mid-air with dust trails, above the tile. 7 restless graves, quiet: disturbed earth with finger bones showing. 8 the graves stirring:
three skeletal hands reaching up from the earth in a violet glow.

Row 4: 1 a blade trap's slot: a long dark slit across a stone slab with a glint of steel inside. 2 the blade swinging: a great
crescent pendulum blade sweeping through the tile on a chain, motion blur. 3 a lightning scorch: a blackened star-shaped burn with
fused glass and a faint yellow crackle. 4 a healing shrine for the desert: a sandstone obelisk with a glowing teal sun disc. 5 a healing
shrine for the snow: a block of blue ice with a teal light inside, rimed with frost. 6 a healing shrine for the forge: a black iron
anvil-altar with teal runes. 7 a healing shrine of mossy standing stone with a teal crystal set in it. 8 a healing shrine for the
moonlit shrine: a small red torii with a teal paper lantern.

Row 5: 1 a ruined wall of pale sandstone, broken at the top, one tile wide. 2 a ruined sandstone arch, half fallen. 3 a ruined grey
stone wall capped with snow and icicles. 4 a ruined wall overgrown with moss and ivy. 5 a ruined dark crypt wall with a skull niche.
6 a war-camp powder keg bound with rope and painted with a red skull. 7 a cracked ash-grey clay urn of blasting powder, for the
ashlands. 8 an iron-bound forge crate of powder with a brass plate.

Style: crisp hand-pixelled art in the game's painted-pixel style (the same as its hold sheets: rich, slightly dark, readable), a
limited palette per cell, no text, no characters, no tile ground, nothing crossing a cell's edge, every cell's background fully
transparent.
```

## 2. The life of the battlefield (one sheet; used by step 4)

```
For the repo hpatter9/legends-of-the-fall, branch art/land-identity: paint one sprite sheet of small animals for the same game, saved as
art-source/land-identity/life.png on a fully transparent background. The sheet is 512 x 384 px: a grid of 8 columns and 6 rows of cells,
each cell exactly 64 x 64 px. Each ROW is one creature's loop of 8 frames, left to right; frames 1 to 4 are it at rest (idling,
pecking, breathing) and frames 5 to 8 are it fleeing to the RIGHT (the game flips it to flee left). Each creature is small: about 20 to
28 px long, its feet at x 32, y 56 in every frame, so it does not slide.

Row 1: a brown rabbit: sits, twitches its nose, then bounds away.
Row 2: a black crow: stands, pecks the ground, then takes off and flies.
Row 3: a small songbird (robin-like, a red breast): hops, pecks, then flutters up and away.
Row 4: a green frog: sits, its throat swelling, then leaps.
Row 5: a silver fish seen from above under water: swims in place with a flick of the tail (frames 1 to 4), then darts away leaving a
ripple (frames 5 to 8). Paint it slightly see-through, as if under the surface.
Row 6: a butterfly, orange and white: wings opening and closing at rest on the ground, then fluttering off.

Style: crisp hand-pixelled art in the game's style, a dark outline, a soft shadow under each creature at rest, bright readable colours
against grass, stone, sand and snow, no text, nothing crossing a cell's edge, every cell's background fully transparent.
```

## 3. Set pieces and creatures the lands lack (one sheet)

```
Create one sprite sheet for the game "Legends of the Last Keep" (GitHub repo hpatter9/legends-of-the-fall, branch art/land-identity,
save as art-source/land-identity/lands.png).

Canvas: 1536 x 1024 px, fully transparent background (PNG with alpha, no ground, no shadows painted on the background, no text,
no grid lines). A grid of 12 columns x 8 rows; every cell is 128 x 128 px. Each object is centred in its cell and stands on the
cell's bottom edge with 6 px of empty margin all round, so cells can be cut apart cleanly.

Style: detailed hand-painted pixel art for a dark-fantasy tactics game seen in three-quarter isometric view from above (camera
looking down at about 30 degrees, objects lit from the upper left), rich saturated colours, crisp dark outlines, the same look as
a 16-bit era tactics game's painted map props. No characters holding weapons, no UI.

Row 1, desert: saguaro cactus; barrel cactus cluster; date palm; second date palm leaning; bleached ribcage half buried in sand;
broken sandstone statue head; sand dune crest (low, wide); dry thorn tree; caravan tent with striped awning; clay water jars;
small rock pool with reeds; vulture perched on a dead branch.
Row 2, meadow and highlands: hedgerow segment running left-right; hedgerow segment running front-back; wooden post-and-rail fence
segment left-right; the same fence front-back; round haystack; second haystack with a pitchfork; small windmill with four sails;
wildflower patch; stone cairn; lone wind-bent pine; mossy boulder; grazing sheep.
Row 3, snow, caves and autumn: snow drift; frozen dead tree hung with icicles; icicle cluster hanging from a rock ledge; ice-crusted
boulder; stalactite cluster for a cave roof (the one object drawn hanging from its cell's TOP edge); red toadstool ring; brown mushroom cluster on a log; fallen mossy log;
pile of autumn leaves; orange maple tree; yellow birch tree; antlered deer standing.
Row 4, crypt and graveyard: stone pillar with a cobweb; thick corner cobweb (for hanging on a wall); candle cluster on a skull,
lit; iron candelabra, lit; open sarcophagus; tilted headstone; celtic cross headstone; wrought-iron fence segment left-right; the
same fence front-back; dead tree with a crow on it; low ground mist patch (soft, translucent); rat.
Row 5, temple, ruins and shrine: tall marble column; broken column stump; fallen column drum; ivy-covered stone arch; headless
marble statue; temple banner on a stand (red and gold); stone altar with offerings; full-size red torii gate; stone lantern, lit;
cherry blossom tree; paper lantern string between two poles; fox statue with a red bib.
Row 6, forge, ashlands and war camp: iron anvil on a block; hanging chains with a hook; glowing furnace mouth; brass pipe elbow
venting steam; charred tree; glowing lava vent; ash heap with embers; palisade segment left-right; the same palisade front-back;
war tent; tall war banner; camp fire with a spit.
Row 7, swamp and wood: mangrove tree standing in water; cypress with hanging moss; cattail reed clump; lily pad cluster with a
flower; rotten stump with fungus; great oak; young oak; fern clump; bramble thicket; hollow log; bluebell patch; standing deer (doe).
Row 8, small creatures and drifting things, each as FOUR 32 x 32 px animation frames packed left to right in the top-left
quarter of its cell (the rest of the cell empty): rat scurrying; crow flapping; vulture gliding; eagle gliding; bat flapping;
deer walking (use the whole cell's width: four 32 px frames); falling autumn leaf tumbling; falling cherry petal tumbling;
falling green leaf; rising ember; snowflake drifting; dragonfly hovering.
```
