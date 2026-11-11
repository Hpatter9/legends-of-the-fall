# LIVING-FIELDS: more in the battlegrounds

Branch `claude/living-fields` (from main 0.482.0). The owner: "I'd like to see more in the battlegrounds. More traps, hazards, life,
and effects. They don't feel alive enough. And make sure the floor tiles used make sense and really make the visual complete for the
theme of the battlefield." This is about the ordinary battlefields: the 8 x 11 boards of `makeBoard` (`src/sim/board.ts`) that the
daily, the quest battles and the plain waves are fought on, and the sections of an army's road. The Assault's big field is not touched.
The version and `UPDATES` are untouched.

The work is in four steps, each pushed on its own: **1** the audit (this section), **2** floors that fit, **3** hazards and traps,
**4** life and effects.

## Step 1: the audit

**How it was made.** `node tools/living-fields/plan.mjs` counts what `makeBoard` lays on each land over 200 seeds (the numbers below);
`node tools/living-fields/shots.mjs out/web docs/samples/living-fields before` takes each land's board at 393 x 852 on its three
commonest shapes (a clear day; the camera stood back over the whole board; a party of five deployed). The shots are
`docs/samples/living-fields/before-<land>-<layout>.png`. The audit looked at all 51 (three shapes a land, no page errors); the folder keeps
each land's commonest shape, seventeen in all. `tools/living-fields/sheet.py` lays a land's three side by side for looking at closely.

**How a floor is drawn today** (`boardView.ts` `paintColumn`, `areaArt.ts`). Each land has five pictures: two tops (`top1`, `top2`),
a "high" top, one side strip and its boulders. A tile's top is one of the two tops, picked by `(deco + u + v) % 2`, which is a random
scatter. Any tile standing three steps or more is given the "high" top instead (`STONY = 3`), whatever the land. Both sides of every
column are the one side strip, the right in shade. Water, ice and lava are three pictures shared by every land; deep water is the
shallows darkened. A thin dark line is drawn round every tile.

### What is wrong on every land

These are the same seventeen times, so they are named once here and not again under each land.

1. **The high ground is paved for no reason.** About 26 of a board's 88 tiles stand three or more steps up (92% of boards have some),
   and every one is drawn in the land's "high" picture, which on most lands is cut flagstone. So a meadow's hill, a wood's rise and a
   mire's hummock all become a paved terrace, and the line between grass and flagstone follows the height-3 contour exactly: a hard,
   stepped edge that looks like a rule, not a place.
2. **Two grounds meet on a hard line.** The two tops are scattered tile by tile with no patches and nothing between them, so the ground
   reads as a checkerboard of two swatches. Where grass meets stone, sand, water or snow there is no transition of any kind.
3. **Every tile is boxed.** The dark line round each tile and the lip under it are drawn even between two tiles of the same ground at the
   same height, so a flat field shows its grid.
4. **One water for every land.** The same bright blue shallows lie in the mire, the crypt, the graveyard and the desert. Deep water is
   that picture darkened, a flat navy. There is no bank: water tiles stop at a square edge against grass.
5. **Cliff faces do not match their tops.** One side strip serves the whole column, so a grass tile and a flagstone tile have the same
   face, and a face under water or lava is the same dry rock.
6. **The props are the same everywhere.** The shrine's crystal is the same teal cave crystal on the dunes, in the snow and in the forge.
   The ruined walls are the undead tileset's near-black arches on every land, including the pale City Ruins and the sandstone temple.
   The powder barrel is the same oak barrel in the volcano and the war camp.
7. **Bushes are laid but not drawn.** `makeBoard` marks about six tiles a board as `bush`, and only the highlands draw them.
8. **There is no path.** Nothing marks a worn way across any board (`trail` and `paved` exist only on an army's road).
9. **The board floats.** Its edge is a sheer cliff to a common foot against the backdrop, with nothing growing, pouring or hanging there.

### Each land

The numbers are a board's average, and the share of boards with any, over 200 seeds.

| Land | Floor today | What does not fit (beyond the nine above) | Hazards and features today | Life and effects today |
| --- | --- | --- | --- | --- |
| **Highlands** | Two grasses, grey cracked flagstone above height 3, dark rock sides | The flagstone tops are the worst case of (1): a third of the board is paved moor. The rock side is right. | Tall grass 2.4 (98%), shallows 1.5 (60%), boulders 1.6, barrels 0.8 (54%), shrine 0.4 (44%); river and hill shapes. Fits, but nothing is the highlands' own. | Bushes and grass sway, water shimmers. Weather: clear half the time, rain, fog, night. No animals. |
| **Greenwood** (`forest`) | Dark grass, grey flagstone high, brown earth sides | Flagstone terraces in a wood. No leaf litter, roots or moss. The second top is nearly the first. No trees stand on the board at all (`tree` is never set here). | Tall grass 4.1 (100%), shallows 1.5, barrels 0.4, shrine 0.4. A wood with no brambles, roots or snares. | Grass sways. Clear 4 in 10, rain, fog, leaves, night. Empty of birds and deer. |
| **Snowfields** (`snow`) | Two snows, a pale ice-stone high, grey-blue sides | Reads well as a whole, but ice (2.5 a board, 97%) is nearly the snow's own colour and is hard to see, which matters because it slides. Shallow water is open blue with no ice rim. | Ice, shallows 1.6 (64%), shrine 0.4, no barrels; ring, islands and plain shapes. Ice is the land's own, and fits. | Snow falls 4 in 8. Nothing else moves: no breath of wind on the ground, no drifts. |
| **Dunes** (`desert`) | Two sands, sandstone blocks high and for sides | The best match of the seventeen. The shallows (2.7 a board, 98%: more water than the highlands) are bright blue ponds with no reeds or mud, and the tall grass is green meadow grass. | Shallows 2.7, tall grass 0.9, barrels 0.4, shrine 0.4, walls 1.6 (13%). Too much water for a desert; nothing of sand's own (no quicksand). | Clear 8 in 9. Almost nothing moves. |
| **Ashlands** (`volcano`) | Dark scorched earth, red cracked rock high | Good. Shallow water (0.3 a board) is blue on black rock and reads as a mistake. The lava's rim is a bright square. | Lava 2.9 (93%), deep lava lakes 4.0 (26%), barrels 1.5 (85%). Fits; lava is the land's own. | Embers and ash most of the time, lava glows and seethes. The liveliest land today. |
| **Crypt** (`dungeon`) | Two grey flagstones, the same high | Good as stone, but with no variety at all: every tile is the same slab, so height is the only thing that reads. Shallows (3.0, 98%) are bright blue, not a dark flooded floor. Mushrooms for tall growth fit. | Shallows 3.0, tall (mushrooms) 2.4, walls 2.5 (19%), barrels 1.0 (76%), shrine 0.4. A crypt with no traps. | Fog 2 in 8, else nothing: no torches, no drips, no bats (the Calamity's zones have all three, `zoneLife.ts`). |
| **Meadows** (`plains`) | Two bright grasses, pale flagstone high, earth sides | (1) again: the hill shape is a paved pyramid. No flowers, though it is a meadow. | Tall grass 2.5, shallows 1.3, barrels 0.7, shrine 0.4. Nothing its own. | Grass sways. Clear 6 in 10. No butterflies, no birds. |
| **Autumn Wood** (`autumn`) | Leaf litter in two browns, grey flagstone high | The litter is right. Flagstone again above height 3, and blue summer shallows. | Tall (dry bracken) 2.5, shallows 1.5, barrels 0.4, shrine 0.4. | Leaves fall half the time: good. Nothing on the ground stirs. |
| **Mire** (`swamp`) | Dark moss in two greens, grey stone high | The water is the land (5.2 shallows and 5.1 deep a board, 100%) and it is the same clean bright blue as a mountain stream; it should be murky green. Stone terraces on a bog. | Shallows and deep water, reeds 2.3, walls 1.2; no barrels or shrines. Water slows but nothing here is foul: no bog, no mud. | Fog 4 in 10, rain 3. Reeds sway. No frogs, flies or bubbles. |
| **Graveyard** | Mossy earth and grey slab, slab high | Reads well. Blue shallows again; the thorn growth for tall grass fits. Gravestones stand as boulders: good. | Tall (thorns) 2.4, walls 2.2 (17%), shallows 1.4, barrels 0.3, shrine 0.4. Nothing rises from a grave outside a boss arena. | Fog and night most of the time, with ghost-green glows at the stones by night. No crows, no wisps. |
| **City Ruins** (`ruins`) | Worn paving in tan and grey | Fits. The ruined walls are near-black against pale paving (6). No rubble, weeds or fallen columns on the floor. | Walls 2.7 (20%), barrels 0.8, shallows 1.4, shrine 0.5. | Ash 2 in 10. The stillest land. |
| **Ancient Temple** | Jungle grass, sandstone slab high and for sides | The sandstone high ground is right here (a temple's terraces), but grass and slab still meet on a hard line with no overgrown edge. Black walls on sandstone (6). | Shrine 0.8 (82%), tall (palms) 2.6, walls 2.0, shallows 1.5; no barrels. A temple with no traps or wards. | Clear 4 in 9. Palms sway. |
| **Crystal Caves** | Violet cave rock in two shades | Fits. Ice (2.5, 99%) is pale blue-white and reads. The shallows are blue on violet. No crystals grow from the floor except as boulders. | Ice, shallows 1.6, walls 1.7, shrine 0.4. | Clear 6 in 8. Nothing glints or glows. |
| **Forge** | Grey flagstone, dark earth, brick sides | Fits. Blue shallows (0.2) again read as a mistake beside lava. | Lava 2.6 (94%), barrels 1.4 (85%), walls 1.7. No steam, no coals, though `coals` exists as a ground. | Embers 5 in 8, lava glows. No sparks from an anvil, no smoke. |
| **Moonlit Shrine** | Violet moss and grey slab | Fits by night. Flat blue water under the moon with no reflection. The black walls (6). | Shrine 0.8 (83%), shallows 2.4 (98%), tall 2.4, walls 1.5. | Always night: glows at the lamps, fireflies. No petals unless it rolls leaves (it cannot: night only). |
| **War Camp** | Trampled olive grass, grey cobble high | Cobbled terraces in a camp. No mud, no tracks, no stakes. | Barrels 1.5 (87%), walls 2.3, tall 0.8, shallows 1.4. No stakes, pits or fires: the barrels are its only own thing. | Night 3 in 11 with glows at the yurts. No banners, no smoke, no camp fire. |
| **Oasis** | Grass and sand scattered tile by tile, sandstone sides | The worst case of (2): green and sand tiles alternate at random, where an oasis is green round its water and sand beyond. The water (4.7 shallows, 3.0 deep, 100%) should decide which is which. | Shallows and deep water, tall 2.4, shrine 0.4, walls 1.6. | Clear 8 in 9. Palms do not stand on the board. |

### What Step 2 will do about the floor

- A height-3 tile keeps the land's own ground unless the land is stone to begin with (crypt, ruins, forge, temple terraces, crystal);
  stone on a hill becomes rock outcrop only at a cliff's brow, by the land.
- The two tops are laid in patches by a smooth noise of the seed, not tile by tile, and a soft blend is drawn where two different
  grounds meet.
- A tile's dark outline is dropped between two tiles of one ground at one height, so a flat field is a field.
- Water by land: murky green in the mire, dark in the crypt and graveyard, moonlit at the shrine; a bank (mud, sand, ice or stone
  rim) where water meets land.
- The side face under each kind of top: earth under grass, rock under stone, and so on.
- A worn path across the middle ground, by a side stream of the seed (looks only).
- Shrines, walls and barrels by land: looked at in Step 2, left for Step 3 (they want new art).


### What Steps 3 and 4 will add

Only the timed strikes of an army's boss arena (`hazards.ts`: rockfall, flares, geysers, spikes, grasping hands, stampede, a spring, a
river's current) act on their own today; a plain board has none. Step 3 adds a set of traps and hazards to plain boards, by land.
Step 4 adds the life: today a clear day on most lands has swaying grass, shimmering water and nothing else.

## Step 2: floors that fit

Looks only: no height, no ground and no rule of a tile is changed (`test/living-fields-floor.test.ts` checks the board is byte for byte
the same after its floor is worked out). The old tops stay in the build as the fallback while a land's sheet loads.

**Where the art comes from.** Each land takes its floor from one of the nine painted hold sheets already in the repo
(`src/art/assault/<hold>/ground.webp`, `edges.webp`, `faces.webp`): the hold whose army fights on that land. A sheet has sixteen ground
textures (each 4 x 4 tiles, so no single-tile repeat shows), ragged edge shapes, a waterline, and twelve cliff faces (a lip, four body
steps, a foot). Nothing new was copied from the packs, so the game is no bigger; the sheets are fetched by URL the first time a land is
shown and are already in the service worker's list, so they are there offline.

| Land | Sheet | Ground and second ground | Path | Raised ground | Shore | Water | Faces |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Highlands | Bloodtusk (orc) | grass, grass in flower | packed dirt | grass, heather showing through | shingle | the sheet's, toned blue | earth, grey cliff when high |
| Greenwood | Elder Root (wildwood) | grass, ferns | leaf mould | moss, roots showing through | shingle | lily water | earth, cliff |
| Snowfields | Howling Den (beasts) | snow with tracks, patchy snow | trodden snow | snow, iced rock | trodden snow | icy water | snow-capped stone |
| Dunes | Heart of the Maze (labyrinth) | sand, cracked clay | pebbles | sand, sandstone blocks | shingle | green pool | banked earth |
| Ashlands | Brimstone Gate (infernal) | ash, scorched shards | trodden ash | cracked ground, basalt | none | lava from the sheet; shallows dark | lava-cracked cliff; a lava fall under lava |
| Crypt | Barrow Necropolis (undead) | brick, mossed flags | cobbles | brick (a land of stone) | none | dark still water | stone wall |
| Meadows | Bloodtusk, toned brighter | grass in flower, grass | packed dirt | grass in flower, trampled grass | shingle | toned blue | earth |
| Autumn Wood | Howling Den, toned warmer | russet grass, bracken | leaf litter | russet grass | shingle | grey-blue | earth |
| Mire | Elder Root | glowing moss, sodden grass | mud | mushroom moss | wet mud | murky lily water | mud bank |
| Graveyard | Barrow Necropolis | grey grass in two kinds | packed earth | trampled grass, old flags | gravel | dark | earth, grave mound |
| City Ruins | Heart of the Maze | block paving, rubble | ash | carved flags (stone) | shingle | green pool | broken stone wall |
| Ancient Temple | Heart of the Maze | scrub, dry grass | sand | carved flags (stone) | shingle | green pool | earth, carved terrace |
| Crystal Caves | Iron Foundry (golems), toned violet | bare rock, cobbled rock | gravel | bare rock (stone) | none | dark iridescent | cliff |
| Forge | Iron Foundry | cobbles, packed dirt | iron plate | iron-banded flags (stone) | none | dark oily | stone wall |
| Moonlit Shrine | Moonlit Shrine (yokai) | blue grass, grass with petals | raked gravel | mossed flags (stone) | gravel | moonlit lily pond; a red bridge | earth, stone wall |
| War Camp | Bloodtusk | trampled grass, churned mud | packed dirt | trampled grass | wet mud | brown and murky | earth, log rampart when high |
| Oasis | Heart of the Maze | sand; green scrub beside water | pebbles | sand, sandstone blocks | scrub | green pool | banked earth |

**How it is laid** (`src/render/floorRules.ts`, pure; `floorArt.ts` loads; `boardView.ts` paints):

- **Patches, not a scatter.** The second ground is laid by a smooth noise of the board's seed, so grass and heather lie in drifts. In the
  tests fewer than one plain tile in five stands alone among another ground.
- **Raised ground is not paved unless the land is stone.** A tile three steps up keeps the land's own ground, with rock showing through on
  about a fifth of them. On the crypt, the ruins, the temple, the caves, the forge and the shrine it is the land's stone, as before.
- **Ragged edges where two grounds meet.** At one height, the higher-ranked ground (`RANK`) lays a ragged edge of its own texture over its
  neighbour, with a corner piece for a diagonal. The shape is the sheet's own; the texture is the neighbour's, so every pair of grounds
  matches. The land's growth creeps back over a path or a bank here and there.
- **Banks.** Water takes its bank's ground over its edge, then the sheet's line of foam, facing the land. Lands with a shore (mud in the
  mire and the camp, shingle elsewhere) lay it on the tiles beside the water. The oasis is green wherever a tile touches water, ragged a
  tile further out, and sand beyond.
- **A worn path** (`pathOf`): the cheapest walk for a fighter that climbs one level, from the middle of the heroes' edge to the foes',
  wandering by its own side stream of the seed (`0xf100a`), drawn in the middle ground only. Looks only: the fight's walking costs do not
  read it. An army's road keeps its own track (`Tile.trail`).
- **Faces that fit the top** (`faceOf`): earth under grass, a cliff under raised ground, stone under stone, a wet bank under water. On the
  ashlands a lava tile at the board's edge pours down its face.
- **A line only where something changes** (`seamsOf`). A tile's side is outlined only where its neighbour stands at another height or is
  another kind of ground the rules care about (water, ice, lava, tall growth, a shrine, a bridge). Between two tiles of one ground at one
  height there is only a very faint grid line (alpha 0.1), so a field reads as a field and a pond is outlined round its shore, not tile
  by tile. The deploy marks, the hover mark and every effect's tile mark are unchanged.
- **Turned sections.** An army's road section may lie turned: the floor is worked out on the board as it lies on the screen, so the
  textures and edges run on across the tiles as they are seen.
- **`BoardView.repaint()`** paints the columns again in place (used when a sheet arrives; Step 3 uses it when a tile's ground changes).

**Each audit finding, and what became of it:**

1. Paved high ground: fixed, as above.
2. Two grounds on a hard line: fixed (patches and ragged edges). The oasis is laid by its water.
3. Every tile boxed: fixed (`seamsOf`).
4. One water for every land: fixed. Each land has its sheet's own water or a tone over it, and every bank has foam.
5. Faces that do not match their tops: fixed (`faceOf`).
6. The same props everywhere: **not done in this step.** The shrine crystal, the three ruined walls and the barrel are still the same
   pictures on every land. The walls are near-black and cannot be lightened by a tint; they want new art or a pack search, which belongs
   with Step 3's props (see the art prompts there).
7. Bushes drawn only on the highlands: not done here; Step 4 (life) grows each land's own.
8. No path: fixed.
9. The bare edge: partly (the faces are now the land's own, and lava pours off the ashlands' edge); waterfalls and growth on the edge
   are Step 4.

**For the owner to look at:** the floors are painted textures now, graded to each land's own colours (see "Step 2, redone" below), so
the boards look more painted and less blocky. The tile grid is now faint on flat ground; if placing heroes feels harder to read, the faint line's strength is one number (`0.1` in `boardView.ts`).

**Shots:** the floors as they are now are in `colour-before-after-1.jpg` to `-3.jpg` (see "Step 2, redone"). The first cut's own shots
were taken at all three sizes with no page errors and are no longer kept.

## Step 2, redone: the colour (the director's review)

The first cut of Step 2 (`26ab127f`) was not released. Its structure was kept; its colour was wrong on most lands: the hold sheets are
dark, trodden siege ground, so the meadows went olive-brown, the wood and the mire yellow-brown, the ashlands flat grey, the crypt one
grey, and the oasis lost both its sand and its green.

**The fix: each land's own colours, the sheet's painting kept** (`FloorSet.tint`, `gradedGround` in `floorArt.ts`). For each kind of
ground a land names a colour. The sheet's texture is graded to it once, pixel by pixel: every pixel keeps its light and shade against
the texture's own mean (held between 0.4 and 1.7 of it, so nothing burns out or goes black) and takes the land's hue and brightness,
with a fifth of its own hue left in so flowers and leaves still show. The faces take the land's earth as a hue blend where the sheet's
is not the land's (`FloorSet.faceTint`: the wood, the mire, the ashlands, the crypt, the caves). The snowfields are untouched: the one
land the sheet already fitted.

- **No darker than before.** Each land's ground colour is at least as bright as the mean of the top it replaced
  (`src/art/areas/<land>/top1.png`, measured; a test holds it).
- **Two grounds that can be told apart.** Grass and heather-earth on the moor, grass and leaf mould in the wood, sand and clay on the
  dunes, sand and green at the oasis, stone and moss in the crypt; a test holds the second ground and the path at least 40 apart from
  the ground (summed over red, green and blue).
- **On their backdrops.** `docs/samples/living-fields/colour-before-after-1.jpg` to `-3.jpg`: all seventeen lands, the old floor beside
  the new, each on its own backdrop (`tools/living-fields/pairs.py`).
- The dunes and the oasis take the sheet's sandstone wall for their faces (the banked red earth read as brick).
- Step 3's tile marks and Step 4's life sit on the recoloured floors; every shot in the folder was retaken on them.

## Step 3: hazards and traps

Sim rules, in `src/sim/fieldTraps.ts` (pure), with a test for every one (`test/living-fields-traps.test.ts`, 17 tests). The tells are
drawn by `boardView.ts` (`paintTrap`, `trapProps`), the effects and sounds by `fx.ts` and `soundRules.ts`, the codex's lines are in
`terrainInfo.ts`.

### What was chosen

Eleven new ones, and three of the army arenas' timed strikes laid on plain boards for the first time (steam vents, falling rocks,
grasping hands). Shares are of the fighter's own health; a boss feels a third.

| | What it does | Numbers |
| --- | --- | --- |
| **Spike trap** | Springs once on the first walker to end a step there, then is spent | 10% |
| **Snare** | Springs once: rooted (no step; it still strikes what is in reach) | 2.5 s, 3% |
| **Rune ward** | Springs once: a zap and a stun | 10%, 0.7 s |
| **Brambles** | Scratch on every entry; the step is slower | 3%, the step takes twice as long |
| **Deep mud** (quicksand on sand) | Drags | the step takes three times as long; no harm |
| **Poison bog** | Bites on entry and each second stood in it, and poisons | 3%, then 2% a second |
| **Thin ice** | Lies on the land's own ice. Cracks under the first walker, breaks under the next: shallow water after, and a cold bath | 6%, chilled 2.5 s |
| **War totem** | Whoever holds its tile strikes harder, friend or foe | +15% attack while standing on it |
| **Brazier** | In the way like a barrel. A blow on a fighter beside it tips it: everyone within a tile is seared, and hot coals (the ground the rules already had) lie round it for the rest of the fight | 6% |
| **Swinging blades** (timed) | Sweep 2 or 3 tiles every 6 s, told 1.2 s before; fliers pass over | 10% |
| **Lightning** (timed, only in the rain) | Strikes a tile and its neighbours every 11 s, told 1.5 s before; fliers too | 12%, stunned 0.5 s |
| Steam vent, falling rocks, grasping hands (timed) | As in the armies' boss arenas (`hazards.ts`), every 8 to 10 s, told 1.2 to 1.5 s before | 8%, 12%, 6% and slowed 2 s |

**Left out, and why:** a collapsing bridge (it can cut a board in two, and `boardOk` promises it never is); a nest that wakes something
(it adds a fighter to one side, which is not fair to both); oil that can be lit (the brazier's coals do that job with ground the rules
already had); a pit trap (a spike trap with different art).

**By land** (two or three each, `LAND_HAZARDS`): Highlands falling rocks, brambles, lightning. Greenwood snare, brambles, lightning.
Snowfields thin ice, falling rocks. Dunes quicksand, falling rocks. Ashlands steam vents, braziers. Crypt spike traps, swinging blades,
braziers. Meadows snare, totem, lightning. Autumn Wood snare, brambles. Mire deep mud, poison bog. Graveyard grasping hands, poison bog,
brambles. City Ruins swinging blades, rune wards, spike traps. Ancient Temple rune wards, spike traps, braziers. Crystal Caves rune
wards, thin ice, falling rocks. Forge steam vents, braziers. Moonlit Shrine rune wards, totem. War Camp spike traps, braziers, totem.
Oasis quicksand, thorn scrub.

### The rules that keep it fair

- **Both sides, in plain sight.** Every one hits heroes and foes alike and is on the board before the fight: a mark painted on its tile
  with its own coloured rim, and for brambles, a totem, a ward and a brazier something standing there. The codex's Terrain tab has a
  line for each, its numbers read from the rules' constants.
- **Fliers** pass over every trap and under-foot strike; falling rocks, steam and lightning reach them, as in the arenas.
- **The way-finding knows them** (`TRAP_COST`, `RISK_COST` in `canStep`; `trapScore` where a fighter picks where to stand). A fighter
  takes another way of the same length when there is one, and walks round a bog or deep mud. A one-shot trap costs less than the two
  steps round a single tile, so a trap on a fighter's only straight line is stepped on. Nobody chooses to stand on a trap or under a
  strike; a totem is worth walking to.
- **Not on a boss's wave.** A boss feels a third of a trap and the heroes all of it, so on a boss's wave the set tilted the fight
  against the player (measured: the Golem Forge at level 80 cleared 13 of 40 attempts without the set and 5 of 40 with it, the loss all
  on the last wave). `startStage` lays none there; an army's boss arena keeps its own strikes. With that, 12 of 40.
- **Only the ordinary battlefields** (`fieldOk`): the 8 x 11 boards and an army's road sections. Not the Assault's field, the Last
  Stand's keep, a Calamity zone or a rift's court.
- **Sparse** (`PIECES`, `hazardLevel`): one or two pieces a board (a piece is a patch of 1 to 4 tiles, a brazier, or one strike); two or
  three from the fifth wave; a third level from the Elite tier. An army's bigger road section gets up to one and a half times as many.
- **Never in a side's rows**, never on water, a bridge, a ramp or a perch, and a brazier only where everyone can still get round it.

### Deterministic, and behind one switch

- Everything is laid by `layFieldHazards(board, seed, level)` from one side stream, `new Rng(mixSeed(seed, 0xf1e1d, landIndex))`. The
  fight's own stream and its skill stream are untouched (a test compares them, and the rest of the board tile for tile, on every land).
  A trap springs on a step with no roll; a strike goes by the board's clock.
- A fight made outside a run has none (`Stage.hazards` unset). `startStage` sets the level.
- **The switch is `FIELD_HAZARDS.on`.** With it off no board is given anything and every fight plays as it did.
- **Pinned recordings: none re-recorded.** Three files pin whole fights and turn the switch off at their top:
  `test/ailments-identical.test.ts`, `test/nemesis-regression.test.ts`, `test/spells-identity.test.ts`. They pass unchanged.
- One test was updated for the changed requirement: `test/long-map.test.ts` compared an army fight's tiles with its section's, tile
  for tile; the fight's own copy now also carries traps, so it compares them with the set's three fields left out, and checks the
  section on the long map is never given any.

### Balance, before and after

The tools take `FIELD_HAZARDS=0` to play a table without the set (`tools/living-fields/switch.ts`); the hero table's fights are made
outside a run, so the tool lays them at level 1. `tools/living-fields/compare.py` and `compare-heroes.py` lay two runs side by side.

| Table | Without | With | |
| --- | --- | --- | --- |
| Armies, `npm run balance -- --armies-only --attempts 20`: mean share of attempts that won a wave (1080 cells) | 22.31% | 22.30% | |
| The same: mean clear rate (72 rows) | 15.07% | 15.35% | |
| Hero sweep, `--heroes-only --games 2000`: mean win rate | 58.9% | 59.4% | a second sample without the set read 59.8% |
| The same: how far a hero's "vs avg" moved | | mean 2.6 points, at most 10.4 | between two samples without the set: mean 4.1, at most 13.7 |
| Daily, `npm run daily-rate -- --days 200`, with the hearts | 83% | 81% | |
| The same, no hearts | 70% | 68% | |
| Golem Forge at level 80, 40 attempts (the army-pace test's party) | 13 cleared | 12 cleared | |

Every figure is inside the sample's noise, and no balance band was changed. Two band tests sit close to their edge and are worth
knowing about: the daily's (56 fixed dates, band 50 to 85%, 84% on main, 82% now) and the Golem Forge's (it must clear within three
tries on one of two saves).

**What I found on the way, which changed the design twice.** First, with the way-finding cost of a trap set at two steps, no one-shot
trap ever sprang: every fighter walked round it and the traps were scenery. The costs are now below the price of walking round a
single tile. Second, the boss finding above.

### How it looks, and the art

Stand-ins until the painted sheet lands: marks drawn on the tile (a spike plate, a rope loop, a rune ring, a mud sink, a bubbling bog,
cracks in ice, a vent, rubble, a blade's slot, a scorch), the graveyard's thorns for brambles, the Calamity's skull totem and rune,
the road's brazier. One sheet covers all of them plus each land's own shrine, ruined wall and powder barrel (audit finding 6):
`docs/notes/land-identity-art-prompts.md`, cut by `tools/living-fields/import-art.py traps` into `src/art/living-fields/`. A painted
cell replaces its stand-in with no code change (`trapArt.ts`, `trapLooks.ts`); a test checks every cell the board asks for is one the
importer cuts.

When a trap springs: its word once over the tile ("Spikes!", "Snared!", "The ice breaks!"), a strip from the effects pack, a cue, and
the tile is painted again without it. Shots: `docs/samples/living-fields/life-<land>-<layout>.png` show each land's board with its traps
(level 1) and its life, before the fight, and `fight-*` twelve seconds into a fight on four lands. In the fights played while building
this, spike traps, wards, braziers, thin ice, a bog, blades, vents and rocks all went off, with no page errors.

### For the owner's call

1. **Which were chosen** (the table above), and the four left out.
2. **Fights do play differently** wherever a board has one: that is the point, and it is within noise on every table, but a given seed's
   fight is not the fight it was.
3. **None on boss waves.** If the owner wants traps in boss fights too, the fair way is to let a boss feel them in full, which makes
   them strong against bosses; that is a balance decision.
4. **A snare roots rather than stuns**, so a snared archer still shoots. This is a new status (`Unit.rootUntil`); it has no icon over
   the fighter yet beyond the trap's own effect.
5. **The numbers** start gentle. The level's thresholds (wave 5, Elite) and the piece counts are in one place (`PIECES`, `hazardLevel`).

## Step 4: life and effects

Looks only: `src/render/boardLifeRules.ts` (pure: what, where and when), `src/render/boardLife.ts` (draws it), eight tests in
`test/living-fields-life.test.ts`. The layer reads the battle and never changes it; where things are is a hash of the board's seed and
the tile, never a stream of the fight.

| | What | Where it comes from |
| --- | --- | --- |
| **Birds** | Two or three on most lands, pecking on open middle ground. A fighter within about a tile and a half sends one up and away; it comes back when its ground has been quiet for six seconds | The road's pecking birds (`src/art/road/birds.png`), by land |
| **Butterflies** | Over the meadows, the temple, the wood and the oasis; they flutter about their tile and flee the same way | A stand-in drawn in code (two frames) |
| **Fish** | In about four water tiles in ten (five a board at most), circling; they dart off when a fighter wades in | A stand-in drawn in code |
| **Fireflies** | By night on most lands; at any hour in the mire, the caves, the crypt and at the shrine. They dim near a fighter rather than flee | The shared glow |
| **Growth** | Every land now grows its own on the tiles the board marks `bush` (about six a board): flowers, ferns, mushrooms, bones, by land. It sways | The road's flair pieces (the audit's finding 7) |
| **What lies about** | Two to five decals a board, by land: bones among the graves and in the crypt, cracks in dry ground, straw and boot tracks in the camp, rubble in the ruins, puddles in the mire (and anywhere in the rain) | Each hold sheet's own `decals.webp` |
| **Marks a fight leaves** | Scorch where a barrel blew or lightning struck, rubble where rocks fell, cracks where the ground was struck, a puddle where steam burst or ice broke, embers where a brazier fell. They fade over 24 s; a board keeps 14 at most | The same decals |
| **Falls** | Water (or lava) pours off the board's two near edges wherever a water tile reaches them | The road's fall strips |
| **Shafts of light** | Two or three over the wood, the autumn wood, the temple, the ruins and the caves, one in the crypt, on a clear day; they breathe slowly | Drawn once |
| **Smoke** | A puff off a brazier, lava or hot coals about once a second during a fight | The effects pack's `fire-smoke` |
| **Dust and splashes** | Under a walking fighter's step: dust on earth (sand-coloured on the dunes, ash-grey on the ashlands), a flurry on snow, a splash in the shallows, leaves in tall grass. Seven a second at most over the whole board | The effects pack's puffs |
| **A clear day's motes** | The land's own drift (pollen, petals at the shrine, snow flecks, dust, embers by lava, crystal motes), sixteen at most. This existed for an army's road only; it now shows on every battlefield | `ambientOf` in `weatherRules.ts` |

**Tied to the weather** (`lifeFor`, `landDecals`, `shaftsFor`): birds, butterflies and rabbits keep out of rain, snow and ash; fog halves
the birds; night has one bird at most and no butterflies, and brings the fireflies out; frogs like the rain; rain adds puddles; shafts
of light only on a clear day (or falling leaves).

**Reduced motion:** nothing drifts or moves. Creatures sit still and simply are not there while a fighter is near; one still shaft; no
dust, smoke or motes. **Battery saver:** half the creatures (rounded up), no shafts, no dust or smoke, half the motes.

**Frame cost.** The layer's own step costs 0.01 to 0.02 ms a frame in a nine-fighter fight (`BoardLife.cost`; nothing is made in a
frame, only moved, faded or re-framed). What it adds to draw is small and capped: at most 15 creatures, 7 decals and 14 marks, a fall
strip per edge water tile, 3 shafts, and a handful of puffs a second. Whole-frame times with the layer on and off, three runs each on
the same board (`node tools/living-fields/shots.mjs ... --fight --bench [--no-life]`): on 40.7, 41.8 and 32.5 ms; off 41.2, 32.8 and
43.3 ms. That is the same within the run-to-run spread. **This was measured in the build machine's software renderer, which has no
GPU, so it shows the layer is not a CPU cost and says little about a phone's fill rate; I could not measure on a phone.**

**Not done, or only partly:**
- **Rabbits and frogs are in the rules but not on the board yet.** There is no pack art for them, so they appear only once the painted
  sheet lands (`docs/notes/land-identity-art-prompts.md`, sheet 2; `python3 -I tools/living-fields/import-art.py life`). The same sheet
  replaces the stand-in butterfly and fish and gives the birds a proper take-off.
- **Banners in the wind:** not done. The plain boards have no banner prop, and a pole on an open tile would hide a fighter.
- **Swaying trees:** the plain boards have no trees (`Tile.tree` is only set on roads and the Stand). The growth, tall grass and
  brambles sway.
- **Footprints:** a step raises dust or a splash, and boot or wolf tracks lie about as decals, but a walker leaves no lasting trail.
- **Torches:** braziers flicker and smoke (Step 3); the crypt has no wall torches of its own.

**Shots:** `docs/samples/living-fields/life-<land>-<layout>.png` (one board a land, with its traps and its life), `-360` and `-412` for the
meadows and the mire, `fight-*` twelve seconds into a fight on four lands. Reduced motion and battery saver were each played through a fight with no
page errors.

## After the first release (0.487.0): four follow-ups

The director released the floors and the life with the hazards' switch off by default, to wait for the owner's nod on the list.

1. **The shots were retaken on the recoloured floors, and the folder thinned** from 21 MB to 6.5 MB: one `before-*` a land, the three
   `colour-before-after-*` sheets, one `life-*` a land (traps and life together), two lands at the other two sizes, four `fight-*`.
   `shots.mjs` takes `--hazards` and `--no-hazards` (through a preview hook, `__game.fieldHazards(on)`, which nothing in the game calls),
   so the shots do not depend on the switch's default.
2. **The mire.** It has more standing water now (five decals a board, two in three of them puddles). Its ground was **not** made
   darker: by the measure in (4) a ground between the dark foes' brightness and a hero's hides one or the other, and the mire's old
   dark teal sat in that gap. It is as dark as it can be while a hero still reads on it.
3. **A snared fighter is marked**: a small rope-coloured icon over its head for as long as the snare holds it (`BoardLife.markRoots`;
   the status art's weakening icon, tinted, until a root has its own). There is no ring at its feet: the status art's ground rings are
   all too dark to tint to rope.
4. **Fighters read on every ground, measured.** `test/living-fields-floor.test.ts` computes the contrast ratio of relative luminance
   (as WCAG defines it) between each ground colour, under the board's own wash at two steps up, and (a) the mean colour of the darkest
   foes' sheets (`#281f21`, measured over `src/art/units/`: the eight darkest average a brightness of 21 to 36 of 255) and (b) a
   mid-toned hero's (`#505050`: the median sheet's brightness is 74). A dark foe must stand at 1.5 or more from the ground and a hero
   at 1.25 or more. Eleven colours failed and were moved to the nearest shade that passes: the ashlands' ground, second ground, raised
   ground, path and rock; the forge's ground, second ground and path; the shrine's ground and second ground; the caves' second ground;
   the mire's path and shore. The ashlands' ground went darker (the hero is the lighter thing there) and its raised ground a hotter
   red; the forge went warmer and a little lighter. **The measure is a proxy**: it uses one mean colour for a dark foe and one for a
   hero, and takes no account of the sprites' outlines or their own colours.
