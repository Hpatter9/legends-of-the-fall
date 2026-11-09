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
