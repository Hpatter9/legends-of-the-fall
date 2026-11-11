# LAND-IDENTITY: every land a place of its own

Branch `claude/land-identity` (from main 0.488.0). The owner: "Make sure the areas feel more distinct. The cave should feel like a cave.
With walls, bats here and there, torches on walls to light the spaces. The swamp should have more swamp water with swamp plants and
trees. Do this kind of change for all of them." The floors are right (LIVING-FIELDS); what was missing is everything standing on and
round each board that says where you are. The version and `UPDATES` are untouched; the hazards stay off.

**This push: the brief for all seventeen lands, and the caves and the mire built as the two examples.**

## The brief

For each land: what the place is; its set pieces; its edge (what stands on the two far edges, and whether it is walled); its creatures;
its light. "Built" means it is in this push.

| Land | The place | Set pieces | Edge | Creatures | Light |
| --- | --- | --- | --- | --- | --- |
| **Crystal Caves** (built) | A cavern under the mountain, its floor a shelf between walls of rock | Crystal spires and broken rock on the walls' tops, glowing fungi on the floor | **Walled**: rock walls two columns deep along the back and the side, three to six steps over the board, with lanterns in sconces every third column | Bats that hang on the walls, flit across now and then and all take off when the fight begins; fireflies | **Dark**, in violet: pools of warm light round the lanterns, violet round the crystals, teal round a shrine; water drips from the roof |
| **Mire** (built) | An island of sodden ground in open swamp water | Reeds and lilies on the board's own water; the lowest ground lies wet | **Water on all four sides**, deeper further out: willows and gnarled trees standing in it, reeds, lily pads, cattails, sunken logs, wet boulders | Frogs (waiting on art), dragonflies, fireflies, fish; will-o'-wisps over the water | Daylight under trees; mist lying on the water, the wisps' own pale glow |
| **Highlands** | A windy moor under the peaks | Boulders, a cairn, standing stones, heather | Open: crags and wind-bent pines on the far edges | Eagles circling high, rabbits, a hawk's cry | Sun, with cloud shadows drifting across |
| **Greenwood** | A clearing deep in old forest | Great trunks, roots, ferns, a fallen log, stumps | Open, but closed in: big oaks and undergrowth along the far edges | Deer at the wood's rim that bolt, squirrels, songbirds | Green shade with shafts of sun through the leaves |
| **Snowfields** | A frozen pass | Drifts, frozen trees, a snowed-in cairn, icicles on every cliff face | Open: drifts and frosted pines on the far edges | White hares, a snow owl; fighters' breath | A cold flat light; falling snow most days |
| **Dunes** | Open desert | Bones of a great beast, cacti, a half-buried statue | Open: dunes rising on the far edges | Vultures circling, lizards, scorpions | A hard sun; heat shimmer over the far edge |
| **Oasis** | Green round a pool in the sand | Palms, tents, water jars, a well | Open: palms and tents on the far edges, sand beyond | Birds at the water, lizards, fish | Sun, palm shade |
| **Ashlands** | The flank of a volcano | Vents, charred trees, cooled lava crust | Open: rivers of lava running past the far edges | Nothing living; embers | A red glow from below; ash falling |
| **Crypt** | A vault under the graveyard | Sarcophagi, pillars, candles, cobwebs, urns | **Walled**: masonry along the back and the side, with torches | Bats, rats | **Dark**, in cold blue: torches and candles |
| **Graveyard** | A churchyard at dusk | Headstones, a mausoleum, dead trees, an open grave | Open: a wrought fence and dead trees on the far edges | Crows on the stones that take off, will-o'-wisps | Dusk and mist; cold wisp-light by night |
| **City Ruins** | A fallen city's square | Broken columns, arches, fallen statues, ivy | Open: stumps of wall and colonnade on the far edges | Crows, rats, lizards on the stone | Dusty sun in shafts |
| **Ancient Temple** | A temple court in the scrub | Columns, braziers, altars, banners, idols | **Half walled**: a carved wall along the back, open at the side | Songbirds, butterflies, a temple cat | Sun, with braziers burning |
| **Forge** | A foundry floor | Anvils, furnaces, chains, pipes, quench troughs | **Walled**: brick and iron along the back and the side, furnace mouths glowing in it | Rats; sparks | **Dim**, in red: furnaces, braziers and lava |
| **Moonlit Shrine** | A shrine garden by night | A torii, stone lanterns, blossom trees, a red bridge | Open: blossom trees and lanterns on the far edges | Fireflies, frogs, koi | Moonlight; lantern pools; petals falling |
| **War Camp** | The enemy's camp | Tents, banners, weapon racks, fires, stakes | Open: a palisade along the back, tents at the side | Crows, camp dogs | Day, or firelight by night |
| **Meadows** | Farmland in summer | Hedgerows, a fence, haystacks, wildflowers | Open: a hedge and a fence on the far edges, a windmill beyond | Rabbits, butterflies, songbirds | Sun, with cloud shadows |
| **Autumn Wood** | A wood in leaf-fall | A fallen log, mushrooms, leaf drifts, stumps | Open: bare and golden trees on the far edges | Deer, crows, squirrels | Low gold light; leaves falling |

## How it is built

Pure rules in `src/render/landRimRules.ts` (the tests read them), drawn by `boardView.ts` (`layRim`) and `boardLife.ts`.
`src/render/holdSprites.ts` loads a hold sheet's standing pieces.

- **The rim.** Columns of the land's own ground laid **outside** the board along its two far edges (`rimOf`), each painted by the
  board's own column painter and placed in the board's own draw order. A rim column is therefore behind every tile it stands
  beyond and every fighter on those tiles: it cannot cover a unit, and it is not a tile of the board, so nobody can stand on it and no
  rule sees it. A wall rises three to six steps over the board's edge (by a smooth noise, so its top is ragged). A land of water also
  rings the two near edges, but only below the board and only with things that lie flat (lilies, water plants).
- **Set pieces** stand on rim columns, never on an open tile of the board: at most 40 a board, 10 of them giving light.
- **Dressing** (`dressingOf`) is the small things on the board's own tiles: reeds and lilies on the mire's water, at a tile's back
  corner and low, so a fighter standing in the water shows over them. Never on a trap's tile.
- **Wet low ground** (`wetLow`): the mire's lowest open tiles are drawn as its wet mud. Looks only: to the rules they are plain ground.
- **Light** (`LAND_LIGHT`, `lightsOf`; `BoardLife.light`). A dark land has one dark layer over the board, drawn at a quarter of the
  screen's size: the land's dark colour at its weight, with a soft pool cut out round every light (wall torches, glowing crystals,
  braziers, lava, shrines, wards) and faded out at its own edges so there is no box. It is made once when the board is built and again
  only when a light falls. The lights' own glows flicker on the board. The weight is capped (`MAX_DARK`, 0.42) and a test holds the
  floors' contrast measure under it. The mire is **not** darkened: its ground sits just lighter than a hero, and any dark over it
  brings the two together (measured: 1.14 where the rule asks 1.25).
- **Creatures.** Bats (`BATS`: five in the caves, four in the crypt) hang along the far walls, one flits across every 5 to 11 s, and
  all take off when the fight begins. Dragonflies over the mire. A drip falls from the caves' roof about every 1.7 s.
- **Reduced motion:** nothing moves; bats hang, and are simply gone in a fight. **Battery saver:** half the bats and creatures, no
  drips; the lights' glows are stepped every other frame, as the board's other life is.

## The art

Everything in this push is art the repo already had: each land's hold sheet (`src/art/assault/<hold>/sprites.webp`: the caves use the
Iron Foundry's crystal rocks and lanterns, the mire the Elder Root's willows, trees, reeds, lilies, logs, mist and wisps), and the
Calamity's bats. No new file; the hold sheets were already copied by the build and kept by the service worker, so they are there
offline. They are fetched the first time a land that uses them is shown (about 1.7 MB a hold).

Stand-ins and gaps so far: the bats are 16 px silhouettes; frogs still have no art; there are no stalactites (nothing in the packs
hangs from a roof) and no cave-wall art of its own (the walls are the floor's rock and cliff face). The combined prompt file
(`docs/notes/land-identity-art-prompts.md`, with the earlier traps and life sheets folded in) comes with the next push, when the
other fifteen lands show what is still missing.

## The second push: the other fifteen lands

Every land now has a rim (`RIMS` is a full table), set pieces from its own hold sheet (`PICKS`: a list of pieces with their shares,
which ring they may stand on, and whether they sway, drift or glow), and its light.

| Land | Rim | What stands on it (from the land's sheet) | Light and air |
| --- | --- | --- | --- |
| Crypt | walls of dressed stone, 3 to 5 steps | sarcophagi, coffins, weeping angels, skulls, cold lamps; cold wall lamps | dark 0.32, cold pools; bats; drips |
| Forge | stone walls, 3 to 5 steps | pipes and gauges, gears, a furnace, a crane, chains, a pouring crucible | dark 0.30, warm pools; sparks rise |
| Graveyard | open, follows the board | iron fence at the edge, headstones, crosses, dead trees, angel, mausoleum, lamps, mist | dusk 0.24; two crows wheel overhead |
| Highlands | open, up to 2 steps up | boulders, pines, rocks, a standing stone | cloud shadows; an eagle overhead |
| Wood | open | great oaks and pines thick behind the board, brush, foxgloves, toadstools, a hollow log | one cloud; green leaves drift down |
| Snows | open | white pines, drifts, snowy brush, bare trees, a frozen fall | cold blue tint; one cloud |
| Dunes | open, up to 2 steps up | red rock, thorn, bones, a fallen column, a great skull | warm glow; two vultures overhead |
| Oasis | green shore, then sand | shade trees, cypress, olive, tents, jars | warm glow; a bird overhead |
| Meadows | open | long grass, a far copse, a log, a wood stack, a well | cloud shadows |
| Autumn wood | open | gold birches, red brush, logs, stumps | cloud shadows; leaves fall |
| Ruins | open, up to 2 steps up | standing and fallen columns, broken and ivied walls, a statue, olives | cloud shadows; two bats |
| Temple | a raised terrace of pale stone | a colonnade, braziers, banners, the bull, cypress, an altar | one cloud |
| Shrine | open | blossom and wish trees, bamboo, stone lanterns, small gates, a fox, a shrine | violet glow; petals fall |
| War camp | open | a stake line at the edge; tents, banners, a bonfire, a watchtower behind | cloud shadows; a crow overhead |
| Ashlands | black rock, then a river of lava | burnt and burning trees, glowing spires, sulphur, a lava fall; vents smoking in the lava | red glow from below that breathes; sparks rise |

- **Walls** stand only in the caves, the crypt and the forge, and only along the two far edges (a test holds it). Open country never
  stands more than its two steps over the board's edge beside it.
- **Light** (`landRimRules.ts`): `LAND_LIGHT` (the dark lands; each passes the fighters' contrast rule under its dark), `CLOUDS`
  (shadows that cross an open land on a clear day only), `LAND_WASH` (a tint or a glow of at most 0.1; none at night or in fog),
  `torchLight` (a land's own torch colour). `boardLifeRules.ts`: `SOARERS` (birds wheeling overhead), `LAND_AIR` (leaves, petals,
  sparks, a few at a time).
- **Cost.** The far rim lies behind the whole board, so its ground, walls and every piece that stands still are drawn once into one
  picture under the board; only what sways at the board's edge, drifts or glows stays a sprite. Measured in this box (a software
  renderer, 393 x 852, ten fighters mid-fight, mean frame time, before then after, two runs each): crypt 50 and 53 ms, then 64 and
  67; graveyard 51 and 50, then 54 and 50; shrine 53 and 53, then 60 and 59; war camp 47 and 46, then 51 and 50. Before the rim was
  baked the same lands were 5 to 10 ms dearer. The crypt's cost is its dark layer (the caves' has been in since the first push).
  **Not measured:** a real phone's GPU (the software renderer pays for every pixel drawn, which a phone's GPU does not in the same
  way), and a fight of more than ten fighters. The layer's own step is under 0.05 ms a frame.
- Reduced motion: clouds lie still, nothing wheels, falls or breathes. Battery saver: one cloud fewer, one bird, no leaves or sparks.

## The third push: the mire's water, and taller walls (the director's and the owner's notes)

- **The mire** read as a board on a brown mat: the hold sheet's own water is brown, and the rim had a straight outer edge. Now the
  rim water takes the land's colour (`RimSpec.tones`: the sheet's painting recoloured murky green to teal, darker each ring out),
  is four rings deep on the far sides and three on the near, and thins away (`fades`: the outer two rings are fainter and the
  outermost is broken up by a noise), so it runs out into the backdrop with no straight edge. Much more lies in it on every side;
  on the near sides only what lies low (beside the board lilies and water plants; further out reed clumps, sunken logs, wet
  stones, wisps and mist; a test holds the list). On the board: puddles stand on about two thirds of the lowest tiles
  (`puddleOn`, drawn on the tile, looks only) and there are more reeds and lilies on its water.
- **Taller walls** (the owner: "I'd like taller cave walls"): the caves' walls stand 8 to 12 steps over the board (they were 3 to
  6), the crypt's 7 to 10, the forge's 6 to 9; the second ring stands two steps higher again, so the top is stepped and ragged.
  Torches hang at two heights in turn (`TORCH_UPS`: 1.6 and 4.4 steps up; the low ones' pools are wider and their glow stronger and
  warmer against the dark). The faces are broken up by small pieces of the land's sheet hung on them (`WALL_STUDS`: crystals in the
  caves, skulls in the crypt, pipes in the forge); the rock itself is the sheet's face laid step by step, so it does not stretch.
  Still on the two far edges only. At 393 x 852, 360 x 780 and 412 x 915 the walls stay under the top bar when deployed; mid-fight
  (the camera closer) their tops pass behind the spell row and the tactic plaque, which stay readable (`batch1-sizes-*.jpg`).
  Stalactites wait for art (the prompt file's sheet 3 does not have them yet: added below).
- Frame time for this batch (same measure, a noisier hour: the war camp, unchanged since the second push, read 56 then 51 ms):
  mire 71 then 63; caves 81 then 71 (both cheaper than the first push, because the rim is now baked); forge 62 then 74 (new walls
  and its dark).
- Shots: `batch1-crystal-swamp.jpg`, `batch1-dungeon-forge.jpg` (before | deployed | mid-fight), `batch1-sizes-360.jpg`, `-412.jpg`.

## The fourth push: the open lands thin into their backdrops

The mire's lesson applied to every open land: what surrounds the board must read as the place and run out into the backdrop, never
lie as a mat with a straight edge. Every open land's rim is now three rings deep (the ashlands' four, so its river of lava stays
whole) and `fades`: the ring beside the board is solid, the next is at 0.72, the outermost at 0.4 and broken up by a noise, and
each ring thins with everything standing on it, so far trees, tents and stones go into the backdrop as into a haze. A wall never
fades (a test holds both). Shots, each land before | deployed | mid-fight at 393 wide: `batch2-*` (graveyard, snows, ashlands,
shrine), `batch3-*` (wood, autumn wood, meadows, highlands), `batch4-*` (dunes, oasis, ruins, temple, war camp);
`open-lands-sizes-360.jpg` and `-412.jpg` (graveyard, snows, ashlands, meadows, dunes, deployed and mid-fight).

## The dark lands' cost, trimmed (the director's ask)

- The walls no longer lie under the dark layer: the baked wall picture and the pieces hung on its face take the land's dark as a
  **tint** (`darkTint`: the dark laid over white, multiplied in, which costs nothing to draw). The dark layer is now cut to the
  board's own shape (its floor as high as it stands and its near sides, one tile's margin: `DARK_MARGIN`), not a box four tiles
  and twelve steps past it, so it covers far fewer pixels. The pools of light on the floor are as they were; the walls' own light is
  their torches' glow.
- **What the numbers say.** The bench now also times the draw itself (`drawMs`: the renderer's `render` with the GPU's work
  finished). On this box's software renderer the draw is about 1.1 ms a frame on every land, before LAND-IDENTITY, after it, and
  after this trim (crypt 2.4 to 3.5 as the first land measured, warming up; caves 1.03 to 1.41; forge 1.05 to 1.21; war camp 0.94
  to 1.28): the layer's cost is inside the noise. The frame *intervals* reported earlier (45 to 70 ms) are this box's own load, not
  the draw, and swing by 10 ms or more from run to run, so the earlier "dearer by 12 ms" readings were not a sound measure and I
  withdraw them. **Still not measured:** a real phone's GPU, where covering fewer pixels is what matters; that is what this trim
  is for.

## The terrain rule: the mire floods (ON since the owner's call; see "Both switches on" below)

Everything above is looks only. This is the one part that changes how a fight plays, so it is a rule of its own
(`src/sim/landTerrain.ts`), behind its own switch (`LAND_TERRAIN.on`; it was built off, and with it off nothing is laid and every fight is exactly as it
was; a test holds it) and laid from its own side stream of the seed (`TERRAIN_SALT`), at the fight's start, before the traps. With
it on a flooded fight has the same foes in the same places and the same fight stream as before (a test holds that too).

- **The rule.** On the mire, two or three pools of shallow water are laid on the lowest open ground (plain tiles no more than one
  step over the board's lowest), two to four tiles each, never past 30% of a board's standable tiles. Shallow water is the rule the
  game already has (a step into it takes twice as long; fliers do not mind). Nothing is deep, so nobody is cut off.
- **The boards** (`node tools/land-identity/mire.mjs`, 500 seeds): shallow water goes from 6.2% of the standable tiles to 13.7%
  (5.0 tiles a board to 11.0; the wettest board 30%); every tile of all 500 flooded boards can still be walked to.
- **The fights** (the same tool: 3,000 random five-hero teams, the nine field bands in turn, stage 5 foes, on the mire; the same
  seeds, teams and bands with the switch off and then on). Heroes' wins:

  | Band | As it is | Flooded | Change |
  | --- | --- | --- | --- |
  | skeletons | 44.6% | 37.1% | -7.5 |
  | werewolves | 61.4% | 61.1% | -0.3 |
  | minotaurs | 59.3% | 64.1% | +4.8 |
  | gorgons | 63.7% | 65.5% | +1.8 |
  | satyrs | 68.8% | 68.8% | 0.0 |
  | mixed | 65.2% | 63.1% | -2.1 |
  | orcs | 61.3% | 62.5% | +1.2 |
  | demons | 47.7% | 45.0% | -2.7 |
  | ogres | 63.1% | 61.3% | -1.8 |
  | all | 59.4% | 58.7% | -0.7 |

  One standard error is about 0.9 points over all 3,000 fights and about 2.7 over a band's 333. So the whole is inside the noise;
  the skeletons' fall (-7.5, about 2.8 errors) is the one figure that looks real: their archers get more shots at heroes wading
  toward them. The minotaurs' rise (+4.8, 1.8 errors) may be the same thing the other way (chargers slowed), or noise.
- **Not measured:** the armies' roads (they bring their own boards, which this does not touch), the daily and whole runs (the mire
  is one land in seventeen there), and how it plays with the traps on (both switches are off).
- **To see it:** `__game.landTerrain(true)` then start a run on the mire, or `tools/living-fields/shots.mjs ... --flood`.
  `docs/samples/land-identity/mire-flood-proposal.jpg`: three of the mire's boards, as they are and flooded.
- **Owner's calls:** whether to turn it on; whether the skeletons' fights on the mire want easing if so; and whether the other
  lands should get the same (more ice on the snows, more lava in the ashlands, more rock in the highlands). `FLOODS` takes a land
  a line; the lava and ice would each need their own measure, because they hurt and slide where water only slows.

## Both switches on (the owner's call, 2026-11-11)

The owner decided: swamp water on, hazards on. `LAND_TERRAIN.on` and `FIELD_HAZARDS.on` are both **true**. No traps on a boss's
wave, as designed (`run.ts`); the skeletons on the mire are not eased (the owner's word).

**Measured** with `node tools/land-identity/flip.mjs` (the hero sweep's fights on each land's own boards: random five-hero teams,
the nine field bands in turn, stage 5 foes, the traps at the level a run lays them on that wave, 2; the same seeds, teams and bands
with both switches off and then both on). Heroes' wins:

| Over all 17 lands (900 fights a land, 1,700 a band) | Both off | Both on | Change |
| --- | --- | --- | --- |
| skeletons | 47.6% | 49.5% | +1.9 |
| werewolves | 54.2% | 58.3% | +4.1 |
| minotaurs | 60.4% | 63.5% | +3.1 |
| gorgons | 66.2% | 66.4% | +0.2 |
| satyrs | 68.5% | 70.5% | +2.0 |
| mixed | 66.1% | 69.2% | +3.1 |
| orcs | 59.7% | 63.6% | +3.9 |
| demons | 48.7% | 47.6% | -1.1 |
| ogres | 64.6% | 64.4% | -0.2 |
| **all** | **59.6%** | **61.5%** | **+1.9** |

One standard error is about 0.4 points for the whole and 1.2 for a band over all lands, so the whole's +1.9 is real: the traps
help the heroes a little on balance (the foes cross more ground to reach them, and walk into more). By land (1.7 an error): from
-3.6 (the autumn wood) to +6.0 (the temple) and +5.8 (the ruins); eleven of the seventeen within two errors. A band on one land
is only 100 fights (5 an error), so those cells are too noisy to read one by one.

| The mire alone, flooded and trapped (3,000 fights, 333 a band) | Both off | Both on | Change |
| --- | --- | --- | --- |
| skeletons | 44.6% | 45.8% | +1.2 |
| werewolves | 61.4% | 74.0% | +12.6 |
| minotaurs | 59.3% | 70.7% | +11.4 |
| gorgons | 63.7% | 55.3% | -8.4 |
| satyrs | 68.8% | 73.3% | +4.5 |
| mixed | 65.2% | 71.2% | +6.0 |
| orcs | 61.3% | 69.1% | +7.8 |
| demons | 47.7% | 48.0% | +0.3 |
| ogres | 63.1% | 67.6% | +4.5 |
| **all** | **59.4%** | **63.9%** | **+4.4** |

(0.9 an error for the whole, 2.7 for a band.) On the mire the two together favour the heroes more than elsewhere: the bands that
run in (werewolves, minotaurs, orcs) wade through pools, mud and bog to get there, and lose by it; the gorgons, who stand off and
shoot, gain. The skeletons' fall under flooding alone (-7.5) is cancelled by the traps (+1.2 with both). Nothing was eased.

- **The first hour** (`node tools/first-hour/pace.mjs`, 40 new saves a starter pack on the first army, Normal): Sword and Shield
  cleared in a mean 2.1 tries before and 2.2 after; Blade and Spell 1.8 and 1.8; every save of both packs cleared within 12 tries
  before and after; nobody lost on wave 1 either way. No move beyond noise, so the first army keeps its hazards.
- **What the flip broke: three tests, all recordings of other systems** (`spells-identity`, `ailments-identical`; each "plays
  exactly as recorded before <that system>"). They already turn the traps off for that reason; they failed because the mire's
  fights were now flooded. They now turn the flooding off the same way, and say why. Nothing was re-recorded and no test was
  loosened; what the two switches themselves do is held by `living-fields-traps` and `land-terrain` (whose first test now holds
  that the switch is on, that off is still the old board, and that a fight on the mire is fought flooded). Every balance band test
  passed unchanged with both on.
- `tools/living-fields/switch.ts` reads `FIELD_HAZARDS=0` and `LAND_TERRAIN=0`, so any balance tool and the pace tool can be played
  as before the flip.
- Shots with both on: `docs/samples/land-identity/switches-on-393.jpg` (mire, crypt, meadows, snows; deployed and mid-fight),
  `switches-on-360.jpg`, `switches-on-412.jpg`. No page errors.
- **Not measured:** whole runs, the daily and the armies' own tables with both on (the armies' table was measured for the traps
  alone in LIVING-FIELDS: 22.31% then 22.30%); fights above stage 5 or above the Normal tier, where the traps lie thicker (level 3).

## The other three lands (the owner said yes; each shipped only if its measure allowed)

The owner's rule, through the director: a land's own terrain ships ON only if its numbers are within noise overall and no band
moves by more than about 8 points; otherwise it stays off and the numbers are reported. `FLOODS` now has four lands, each with its
own `on`, laid by the same rule as the mire's pools (`kind`: water, ice, lava or rock).

- **The boards** (`node tools/land-identity/flip.mjs --boards --lands swamp,snow,volcano,highlands`, 500 seeds a land; every tile
  of every board can still be walked to in all four):

  | Land | Laid | As `makeBoard` lays it | Laid thicker | Most on a board |
  | --- | --- | --- | --- | --- |
  | Mire | shallow water | 6.2% of the open tiles (5.0 a board) | 13.7% (11.0) | 30% |
  | Snows | ice | 3.0% (2.5) | 12.1% (10.1) | 23% |
  | Ashlands | lava (middle ground only) | 3.1% (2.5) | 7.7% (6.2) | 17% |
  | Highlands | boulders (middle ground only, kept only if the board can still be walked) | 2.0% (1.7) | 6.3% (5.3) | 11% |

- **The fights** (`node tools/land-identity/flip.mjs --lands snow,volcano,highlands --games 3000 --only terrain --base hazards
  --force`: 3,000 fights a land, the traps on in both passes, so the change is the terrain's alone on top of the game as it now
  is; 0.9 points an error for a land, 2.7 for a band on a land). Heroes' wins:

  | Land | Without | With | Change | The bands that moved most | Shipped |
  | --- | --- | --- | --- | --- | --- |
  | Snows (ice) | 57.9% | 58.4% | +0.5 | orcs +3.9, demons -3.6, skeletons +2.7 | **ON** |
  | Ashlands (lava) | 66.9% | 70.2% | +3.4 | werewolves +12.3, ogres +10.2, skeletons +4.8, demons -4.2 | **off** |
  | Highlands (boulders) | 60.9% | 65.4% | +4.6 | minotaurs +13.5, demons +10.2, werewolves +7.8, ogres +6.3, gorgons -5.4 | **off** |

  The snows' ice is inside the noise overall and no band moves by more than 3.9, so it is on. The ashlands' lava and the
  highlands' boulders each move the whole by several errors and two bands by more than 10 points, both in the heroes' favour (the
  foes that run in burn in the lava, or queue up round the boulders), so both are off, as the rule says. They are built and
  tested (a test turns each on to hold its rule) and can be turned on by one word each in `FLOODS`.
- **If the owner wants them anyway**, the lever is lighter settings (fewer or smaller patches), measured again: not tried, because
  the instruction was to report and leave them off.
- The first hour with the snows' ice on: unchanged (2.2 and 1.8 tries, 40 of 40 saves of both packs cleared).
- A test caught one slip while this was built: a boulder that could not stay left a stray field on its tile; a rejected tile is
  now put back exactly as it was found.
- Shots: `docs/samples/land-identity/snows-ice.jpg` (three of the snows' boards, before and now), `snows-ice-sizes.jpg` (360 and
  412 wide, deployed and mid-fight). On the snows the ice is pale on pale: a few more glinting tiles a board, easy to miss at
  phone size. No page errors.

## Not built: needs art, or the owner's call

- **Art the sheets do not have** (`docs/notes/land-identity-art-prompts.md`): cacti and palms, hedgerows, a fence, haystacks and a
  windmill for the meadows, cobwebs and candles, icicles, a torii of full size, deer, rats, falling leaves and petals as painted
  frames. Stand-ins are in where the sheets have something near (acacia and olive for the palms, tinted sparkles for leaves).
- **Heat shimmer** over the dunes: not built (it needs a filter over the board, which costs more than this layer may).

## Shots

`docs/samples/land-identity/lands-1..6-*.jpg`: every land before, after (deployed) and after (mid-fight) at 393 wide.
`caves-mire-before-after.jpg` is the first push's. No page errors in any run.
