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

## Not in this push

- **The other fifteen lands' rims, set pieces, creatures and light** (the brief above).
- **Cloud shadows and daylight** for the open lands; the ashlands' red underglow.
- **More swamp water as terrain** (and more ice, lava, rock on their lands): this changes how fights play, so it will be proposed
  separately, behind its own switch and side stream, with balance numbers. What is here is looks only.
- **Frame time**: not yet measured for this layer; the dark is one quarter-size picture and the rim is at most about 60 static
  columns and 40 sprites.

## Shots

`docs/samples/land-identity/caves-mire-before-after.jpg`: each of the two lands before, after (deployed) and after (mid-fight), at 393
wide. `after-*` and `fight-*` are the full screens; `-360` and `-412` the other two sizes. No page errors.
