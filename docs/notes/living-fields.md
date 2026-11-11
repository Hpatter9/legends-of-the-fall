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
`docs/samples/living-fields/before-<land>-<layout>.png`, 51 of them, with no page errors. `tools/living-fields/sheet.py` lays a land's
three side by side for looking at closely.

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
- Shrines, walls and barrels re-skinned by land from the packs.

### What Steps 3 and 4 will add

Only the timed strikes of an army's boss arena (`hazards.ts`: rockfall, flares, geysers, spikes, grasping hands, stampede, a spring, a
river's current) act on their own today; a plain board has none. Step 3 adds a set of traps and hazards to plain boards, by land.
Step 4 adds the life: today a clear day on most lands has swaying grass, shimmering water and nothing else.
