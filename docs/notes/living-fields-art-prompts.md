# LIVING-FIELDS: art prompts

Two sheets, meant for **one chat** (ask for the first, then the second). Until they land the game draws plain stand-ins: marks painted
on the tile for spikes, a snare, mud, a bog, thin ice and the strikes' tiles; the graveyard's thorns for brambles; the Calamity's skull
totem and rune; the road's brazier. Every stand-in is used through one lookup (`src/render/trapArt.ts`), so a painted cell takes its
stand-in's place the moment the sheet is cut, with no code change.

**To bring a sheet in:** save it under `art-source/living-fields/` on branch `art/living-fields`, then
`python3 -I tools/living-fields/import-art.py traps` (or `life`). It checks the sheet's size, trims each cell, packs
`src/art/living-fields/<sheet>.png` and writes `<sheet>.json` (each cell's frame, and where its tile's middle lies). A cell left blank
is left out and keeps its stand-in.

## 1. Traps, hazards and the land's own props (one sheet)

```
For the repo hpatter9/legends-of-the-fall, branch art/living-fields: paint one sprite sheet of battlefield traps, hazards and props for a
phone pixel-art fantasy auto-battler (the King God Castle look on a Final Fantasy Tactics style isometric height grid), saved as
art-source/living-fields/traps.png on a fully transparent background. The sheet is 1024 x 640 px: a grid of 8 columns and 5 rows of
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
For the repo hpatter9/legends-of-the-fall, branch art/living-fields: paint one sprite sheet of small animals for the same game, saved as
art-source/living-fields/life.png on a fully transparent background. The sheet is 512 x 384 px: a grid of 8 columns and 6 rows of cells,
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
