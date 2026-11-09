# The Assault, phase 4: the other holds

Phase 4 of `docs/design/assault-mode.md` (on `claude/assault-design`) builds the other eight holds one at a time, in the order of `ARMIES`.
Their names are the owner's: Barrow Necropolis, Howling Den, Elder Root, Heart of the Maze, Bonefire Crag, Brimstone Gate, Moonlit Shrine and
Iron Foundry. Each hold is written up below as it lands.

## How a hold is built

- **The rings are the engine's.** Every hold keeps Bloodtusk Hold's concentric rings at the same places: the ditch, the outer ring and its
  bank, the outer bailey, the inner wall six steps up, the inner bailey and the stepped mound at the heart. The fort rules, the gates, the
  siege works, the breaches, the duel and the hold's mind all read those places. A hold differs outside and between them: its approaches,
  its water, its landmarks, its camps, its posts' names and its garrison.
- **The structures keep their kinds in the code** (`palisade`, `southGate`, `ironGate`, `drum`, `Reserve tent`), so every rule plays
  unchanged; the names the player reads are the hold's own.
- **One list of holds**: `src/sim/assault/holds.ts` (`HOLDS`), read by the engine (`blueprintOf`), the codex's pages and the War News. A
  registered blueprint is all the armies screen needs to offer the Assault at that army's ten stars.
- **The garrison by army**: `KINDS` (the roster's letters G, A, B and W as that army's fighters) and `OFFICER` (the nameless officer where
  the Council has no one) in `garrison.ts`. The lord is the army's last boss, as before.
- **Each hold's share** (`HOLD_SHARE`, `shareOf`): the garrison's share of a wave foe, set by the balance tool so the bot does about as
  well at each army's Legendary level as it does at the Orcs'.
- **The art**: `tools/assault/cut-sheets.py <hold>` cuts a hold's sheets into `src/art/assault/<hold>/` with the Orc profile's piece names
  (so the field draws every hold by the same rules), and `fieldView.ts` loads the hold's atlas by army (`ATLASES`, `loadFieldArt(army)`).
  - A sheet not painted yet falls back to the Orc sheet in the same slot, recoloured for the hold: the hold is drawn on stand-ins until
    its art lands, and running the cutter again then picks the paintings up.
  - Our own siege works always keep the Orc sheet's colours.
  - `build.mjs` already copies every hold's folder and lists it for the service worker, so it plays offline.
- **Before each hold**, its ChatGPT prompts: `docs/notes/assault-4-<hold>-art-prompts.md`, mirroring the Orc set sheet for sheet, painting
  only what the Chronos kits and the Orc sheets cannot cover.

## 1. The Barrow Necropolis (the Undead Legion)

`src/sim/assault/maps/undead.ts` (`BARROW`).

**The layout.** Up the phone from the Landing at the south corner:

- **A still grey lake** runs from edge to edge where Bloodtusk Hold has its river, wider (seven cells, fourteen tiles). It is crossed by:
  - the causeway, a stone way two tiles wide, with the coffin barricade (the bridge fort) holding its far end;
  - the West Ford and the East Ford, shallow water that slows the walk.
- **The barrow downs**:
  - the two ossuary towers on their knolls;
  - the old graveyard to the east (ruined walls and long grass);
  - the plague pits across the road (the stake field's slowing ground);
  - the ghoul pens under the east tower;
  - the gravediggers' coffin heaps (they burn);
  - charnel tents and witch fires;
  - the barrow knoll and its shrine by the lake;
  - the three bone-bell belfries (the war drums' part).
- **The rings**:
  - the ditch, the bank and the ring of iron railings, with the Lych Gate, two sally ports and the North Gate;
  - the outer bailey's mausoleum rows, charnel houses (the fire arrows' targets), the embalmers' furnace and its oil, and the crypt pens;
  - the crypt wall, its four corner towers and the Bone Gate;
  - the ossuary keep and the Lich King's throne on the barrow.
- **Behind**: the Dead Road, whose charnel camp sends the bands (burn it or hold it).

**The garrison.** 200: 180 at 30 posts and 20 down the Dead Road.

- The rank and file are Skeletons, Skeleton Marksmen and Skeleton Spearmen.
- The crypt pens hold **Grave Wraiths**. This is a new Assault-only fighter on the ghost's sheet, the war-wolf's part: fast, and walking
  the field as the wolves do (it does not fly over the walls). It is marked `summon`, so the bestiary leaves it out.
- A Bone Captain takes an officer's place the Council cannot fill; the Lich King holds the throne while no warchief sits.

**The balance** (`npm run balance -- --assault undead`, the design party, a maxed castle, a full host, 8 seeds). At the Orcs' share (0.155)
it is far harder than Bloodtusk Hold:

| | share 0.155 | | | share 0.10 | share 0.12 |
| --- | --- | --- | --- | --- | --- |
| | level 55 | level 65 | level 75 | level 65 | level 65 |
| Auto | 0% | 13% | 25% | 88% | **50%** |
| Tactical | 13% | 25% | 38% | 100% | **75%** |
| Siege | 38% | 38% | 75% | 88% | **88%** |

So its share is **0.12** (`HOLD_SHARE.undead`): at level 65, a little above the Orcs' 55 as the Undead's Legendary level is, Auto wins half
and Tactical three in four, as Bloodtusk Hold does at 55.

**The look.**

- Until its sheets are painted ([the prompts](assault-4-barrow-necropolis-art-prompts.md)), it is drawn with:
  - the Orc sheets, recoloured cold: the colour drained to slate, fire turned to the Liches' teal witch fire, the red cloth to ash grey;
  - the Liches and Blood Court kits: the bone walls, the iron fences, the gatehouses, the mausoleums, the crypt, the chapel, the
    watchtowers, the coffins, the gravestones, the witch fire, the lanterns, the dead oaks and pines.
- The field's light is moonlit for this hold (`fieldGrade(host, army)`), and its minimap wears its own greys.
- `docs/samples/assault-art/undead-kit.jpg` is the two kits' labelled contact sheet.

**Tests.** `assault-necropolis`:

- registered and named, the same each build, and sound (`fieldProblems`);
- the lake a barrier but for the causeway and the fords;
- the baileys opened only by the Lych Gate and the Bone Gate;
- 200 of the Undead's own, with no orc among them and the Lich King on the throne;
- Auto plays an assault to its end, the same way twice.

`assault-holds` now expects the Necropolis's page built, and the rest locked.

**Screenshots**: `docs/samples/assault-4/`:

- Mid and the keep at 360, 393 and 412;
- the causeway and the Lych Gate;
- the Undead army card with "Assault Barrow Necropolis";
- its muster;
- the opening, with an Undead lieutenant's cut-in by the lake.

## 2. The Howling Den (the Beast Packs)

`src/sim/assault/maps/beasts.ts` (`DEN`). The owner's look: an autumn moor that climbs to a snowbound den.

**The layout.** Up the phone from the Landing at the south corner:

- **A cold river in a rocky gorge** winds from edge to edge where the Necropolis has its lake: narrower (two to three cells), and bending,
  so its banks wander. It is crossed by:
  - the rope bridge, with its barricade of logs and sleds (the bridge fort) holding the far end;
  - the West Ford and the East Ford.
- **The autumn moor**:
  - the West and East Lookouts on their crags;
  - the old hall's ruins to the east, and the bracken (long grass);
  - the trap line across the road (the stake field's slowing ground);
  - the wolf runs under the east lookout;
  - the hunters' drying racks (they burn), hide tents and bonfires;
  - the knoll of the old stones by the gorge;
  - the three howling stones (the war drums' part).
- **The rings, under snow**:
  - the ditch, the bank and the ring of log walls, with the Fang Gate, two sally ports and the North Gate;
  - the outer bailey's longhouses, hide huts (the fire arrows' targets), the smoking pits and their oil, and the kennels;
  - the crag wall, its four corner towers and the Antler Gate;
  - the great den and the Seat of the Pack at the top.
- **Behind**: the Hunters' Trail, whose camp sends the bands.

**The garrison.** 200: 180 at 30 posts and 20 down the trail.

- The rank and file are Black Werewolves, its heavies White Werewolves, and its pens loose Bloodtusk Hold's war-wolves.
- **The Beast Packs draw no bows.** Their archers' places (the lookouts, the bank, the corner towers) are held by **Red Werewolves**, who hunt
  the shooters: they leap down on whoever comes near instead of loosing from the walls. So the Den has no arrows on its walls: a different
  fight from the other two holds, and the codex says so.
- An Alpha Werewolf takes an officer's place the Council cannot fill; the Boar King (the army's last boss) holds the Seat while no warchief
  sits.

**The balance** (`npm run balance -- --assault beasts`, the design party, a maxed castle, a full host, 8 seeds). Its mark is level 75, ten
levels above the Undead's, as the Necropolis's was above Bloodtusk Hold's:

| level 75 | 0.12 | 0.13 | 0.135 | 0.14 | 0.15 | 0.155 |
| --- | --- | --- | --- | --- | --- | --- |
| Auto | 50% | 88% | **63%** | 25% | 25% | 0% |
| Tactical | 100% | 88% | **100%** | 88% | 100% | 75% |
| Siege | 100% | 100% | **100%** | 100% | 88% | 63% |

Eight seeds are noisy (0.13 came out easier than 0.12). With no bows on its walls, the Den is kind to a careful advance: Tactical and Siege win
nearly every time until the Orcs' share, where Auto wins none. So its share is **0.135** (`HOLD_SHARE.beasts`): Auto wins about half, as at
the other holds, and a player who orders the platoons is rewarded more than elsewhere.

**The look.**

- Until its sheets are painted ([the prompts](assault-4-howling-den-art-prompts.md)), it is drawn with:
  - the Orc sheets recoloured by `den_tint` in the cutter: autumn on the moor (greens to russet and gold, the red cloth to tanned hide, the
    fire kept), frost on the crag wall's and the den's pieces, and the ground sheet's `campDirt` repainted as trodden snow;
  - the Moonpack kit: the log walls, bone gate and fence, longhouses, cottages, lookouts, howling stones, shrine, torches, sleds, racks, rope
    bridge, pines and rocks.
- The field lays the snow by zone (`snowOf` in `fieldLooks.ts`): the ring and all within it, and patches on the moor's last climb to the ditch;
  our camp at the Landing stays trodden moor.
- A low autumn sun over the field (`fieldGrade`), the snow's blue at the foot; the minimap wears russet outside and white within.
- `docs/samples/assault-art/beasts-kit.jpg` is the kit's labelled contact sheet.
- The cutter takes a profile's own `tint` (by sheet, and by slot on the ground and faces sheets); the Necropolis's `cold` is the default, and
  its art cuts byte for byte as before.
- The barricade's mirrored run is now found from its tiles (a run sharing a u), not from Bloodtusk Hold's column.

**Tests.** `assault-den`:

- registered and named, the same each build, its own field, and sound (`fieldProblems`);
- the river a barrier but for the bridge and the fords;
- the baileys opened only by the Fang Gate and the Antler Gate;
- 200 of the Beast Packs' own, with no orc among them and the Boar King on the Seat;
- Auto plays an assault to its end, the same way twice.

`assault-holds` now expects the Den's page built too, and the rest locked.

**Screenshots**: `docs/samples/assault-4/den-*.png`: Mid and the den at 360, 393 and 412; the rope bridge, the Fang Gate's road and the East
Ford.
