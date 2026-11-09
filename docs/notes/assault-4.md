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
- **Auto keeps the host together where the hold draws no bows** (`huddle` in `assault.ts`, the director's lever; see "The Auto lever" below).
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

**Measured again with its own bands** (the director's ask, once the Warpath's bands were made the hold's own army: before, they were orcs).
32 seeds at level 65:

| | 0.115 | **0.1175** | 0.12 |
| --- | --- | --- | --- |
| Auto | 72% | **50%** | 38% |
| Tactical | 84% | **97%** | 72% |
| Siege | 84% | **72%** | 81% |

Auto moves cleanly with the share; Tactical and Siege jump from one share to the next as single seeds tip. So its share is now **0.1175**,
where Auto wins half, as at the other holds; across the three, Tactical wins about 84% and Siege about 79%.

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
- **The Beast Packs draw no bows** (the director's call: no new archer; a beast hold with no arrows is its identity). Their archers' places (the
  lookouts, the bank, the corner towers, the wall-walk) are held by **Red Werewolves**. A post is a shooters' post only if its army's archers
  shoot (`archersOnly(post, army)`): the Den's are not, so they leap down and hunt as any post does instead of standing on their perches.
- **The pack hunts our shooters first** (`Blueprint.huntShooters`, set on the Den alone): a post marks the nearest of ours who shoots within
  its reach, going round the line to them, and only else the nearest of ours. It is the answer to a careful advance with its archers and
  mages behind a wall of blades, which no bows on the walls would otherwise punish.
- An Alpha Werewolf takes an officer's place the Council cannot fill; the Boar King (the army's last boss) holds the Seat while no warchief
  sits.
- (A fix on the way: the Warpath's bands were always built from the Orcs' roster, so the Necropolis's bands were orcs. They are the hold's own
  army now, which makes the Necropolis's twenty bands skeletons; its share was measured before this.)

**The balance** (`npm run balance -- --assault beasts --seeds 32`, the design party, a maxed castle, a full host). Its mark is level 75,
ten levels above the Undead's, as the Necropolis's was above Bloodtusk Hold's. The director asked for it to sit where the other holds do
(about Auto 50%, Tactical 75%, Siege 85 to 90%) and to be brutal, with 16 seeds or more.

First built (the archers' places standing still, 8 seeds), it was soft for careful play: at 0.135, Auto 63%, Tactical 100%, Siege 100%.
Then, at level 75:

| what the pack does | share | seeds | Auto | Tactical | Siege |
| --- | --- | --- | --- | --- | --- |
| the archers' places hunt | 0.145 | 16 | 50% | 94% | 81% |
| | 0.15 | 16 | 25% | 81% | 88% |
| | 0.1475 | 32 | 31% | 97% | 66% |
| and they hunt our shooters first | 0.135 | 32 | 53% | 94% | 88% |
| | **0.14** | **32** | **41%** | **84%** | **75%** |
| | 0.1475 | 32 | 31% | 78% | 63% |

So its share was **0.14** (`HOLD_SHARE.beasts`; **0.1475** since the Auto lever, below). Tactical is still the Den's easiest way (a massed host cuts down melee wolves as they come),
and Siege sits under it here, the other way round from Bloodtusk Hold: the ram's and the ladders' crews stand still where the pack can reach
the shooters behind them. A harder share brings Tactical to 75% but sinks Auto and Siege with it, so 0.14 is the closest these levers reach.

Tried and dropped: **the howl**, the howling stones calling out a pack of war-wolves every forty seconds until silenced (eight packs, and a
smaller four of three; at the nearest platoon, then at the main push). In every form it cost Auto (which never silences the stones) and
Siege most and Tactical (which silences them first) least, so it widened the gap it was meant to close, and it was taken out.

**Tests.** `assault-den`:

- registered and named, the same each build, its own field, and sound (`fieldProblems`);
- the river a barrier but for the bridge and the fords;
- the baileys opened only by the Fang Gate and the Antler Gate;
- 200 of the Beast Packs' own, with no orc among them and the Boar King on the Seat;
- Auto plays an assault to its end, the same way twice;
- the Warpath's bands are the hold's own army;
- its archers' places are not shooters' posts (Bloodtusk Hold's and the Necropolis's are);
- a Den post goes round a nearer swordsman of ours for an archer within its reach, where Bloodtusk Hold's takes the nearer.

`assault-holds` now expects the Den's page built too, and the rest locked.

**Screenshots**: `docs/samples/assault-4/den-*.png`: Mid and the den at 360, 393 and 412; the rope bridge, the Fang Gate's road and the East
Ford.

## 3. Elder Root (the Wildwood)

`src/sim/assault/maps/wildwood.ts` (`ELDER_ROOT`). The owner named it but gave no look, so it follows the camp overlook, which already
paints the Wildwood's "Elder-root stronghold" (`src/art/camp/camp-wild.png`, its top row): an ancient forest grown into a fortress at
dusk, its heart a vast hollow tree with a lit door.

**The layout.** Up the phone from the Landing at the south corner:

- **A black mire** from edge to edge, wider than the others' water (nine cells): two deep black channels with a slow marsh between them,
  shallow water a walker wades. It is crossed by:
  - the root bridge, over the whole mire, with its log barricade (the bridge fort) holding the far end by the ditch;
  - the West Ford and the East Ford, where the channels can be waded.
- **The forest**:
  - the West and East Watch Trees on their knolls;
  - the old shrine's ruins to the east, and the ferns (long grass);
  - the snares across the road (the stake field's slowing ground);
  - the boar runs under the east watch tree;
  - the woodcutters' log piles (they burn), leaf tents and campfires;
  - the old stones' knoll by the mire;
  - the three pipers' rings (the war drums' part): stone circles where the satyrs pipe the grove into a frenzy.
- **The rings**:
  - the ditch, the bank and the ring of thorn hedge, with the Bramble Gate, two sally ports and the North Gate;
  - the outer bailey's longhouses, bark huts (the fire arrows' targets), the brewers' fire and its oil, and the wolf pens;
  - the root wall, its four corner towers and the Heartwood Gate;
  - the Elder Root and the Throne of Roots at the top.
- **Behind**: the Grove Trail, whose satyrs' camp sends the bands.

**The garrison.** 200: 180 at 30 posts and 20 down the trail.

- The rank and file are Grove Satyrs (the flankers); its heavies the revellers who heal their friends; its pens loose wolves (the Wildwood's
  Wood Raider runs with them).
- **The Wildwood draws no bows either.** Its archers' places are held by the snare-laying satyrs, who hunt the shooters: they come down from
  their posts (`archersOnly` is false for it, as for the Den), and the grove hunts our shooters first (`huntShooters`, as the Den's pack).
- A Thorn Warden takes an officer's place the Council cannot fill; the Grove Spearlord (the army's last boss) holds the throne while no
  warchief sits.

**The balance** (`npm run balance -- --assault wildwood --seeds 32`, the design party, a maxed castle, a full host). Its mark is level 85,
ten levels above the Den's:

| | share | Auto | Tactical | Siege |
| --- | --- | --- | --- | --- |
| first build | 0.14 | 0% | 47% | 50% |
| | 0.12 | 16% | 78% | 69% |
| | 0.11 | 16% | 97% | 91% |
| and the grove hunts our shooters first | 0.10 | 38% | 100% | 97% |
| | **0.105** | **28%** | **88%** | **97%** |
| | 0.11 | 19% | 94% | 88% |
| | 0.115 | 9% | 84% | 75% |
| (tried: a marsh one cell wide, not three) | 0.11 | 25% | 75% | 88% |

So its share was **0.105** (`HOLD_SHARE.wildwood`; **0.11** since the Auto lever, below). Its spread is the Den's, wider: with no bows on its walls a careful advance (Tactical,
Siege) wins most fights, while Auto, which splits over the three crossings, falls fast as the share rises. 0.105 is the closest these
levers reach to the other holds overall. The narrower marsh was no kinder to Auto, so the mire keeps its width.

**The look.**

- Until its sheets are painted ([the prompts](assault-4-elder-root-art-prompts.md)), it is drawn with:
  - the Orc sheets recoloured by `forest` in the cutter: the grass deepened to forest green, the stone and timber mossed, the red cloth to
    leaf green, the fire kept;
  - the Druids and Fae kits: the hedges, wattle fences, tree gate, longhouses, cottages, watch platforms, stone circles, shrines, mushroom
    lanterns, carts, log piles, root bridge, oaks, birches, willows and mossy rocks;
  - the Elder Root itself as the kit's great oak, grown huge, until its painting lands.
- A green dusk over the field (`fieldGrade`), deeper at the foot; the minimap wears the forest's greens and the mire's black.
- `docs/samples/assault-art/wildwood-kit.jpg` is the two kits' labelled contact sheet.

**Tests.** `assault-elder-root`:

- registered and named, the same each build, its own field, and sound (`fieldProblems`);
- the mire a barrier but for the bridge and the fords;
- the baileys opened only by the Bramble Gate and the Heartwood Gate;
- 200 of the Wildwood's own, with no orc among them and the Grove Spearlord on the throne;
- Auto plays an assault to its end, the same way twice;
- the Warpath's bands are its own army;
- no bows, and the grove hunts our shooters first.

`assault-holds` now expects Elder Root's page built too, and the rest locked.

**Screenshots**: `docs/samples/assault-4/elder-*.png`: Mid and the Elder Root at 360, 393 and 412; the root bridge.

## The Auto lever (the director's ask, after Elder Root)

At the two holds with no bows (the Den, Elder Root), Auto, which plays the default plan's split over three crossings, fell far behind a
careful advance: a platoon alone on a ford is run down by the garrison's hunters before the others arrive. The director asked for the fix
in the bot's plan, not in the fight's rules, and for any hold:

- **`bowless(army)`** (`garrison.ts`): the army's archers do not shoot (its `A` kind reaches one tile). True for the Beast Packs and the
  Wildwood today, and for any army added later that has no bows.
- **`huddle(h)`** (`assault.ts`): the bot keeps the host together at a bowless hold, unless it plays its Tactical style (which already sends
  every platoon over the bridge). When it holds:
  - each platoon still on the opening plan's road, if its crossing is not the host's, takes the host's crossing from the nearest point of its
    road (`regrouped`, once each). The host's crossing is the one most platoons chose (the bridge between equals);
  - the parts change: a platoon with shooters is cover (behind the main push, as the cover part has always played), the rest are the main
    push, and none goes round alone on the flank.
- The bot plays a platoon only while it is the bot's (Auto on, or a platoon the player has not ordered), so a player who orders a platoon keeps
  it; turning Auto on hands it back, huddled.

Measured (32 seeds) after the lever:

| | Den, level 75 | | | Elder Root, level 85 | | |
| --- | --- | --- | --- | --- | --- | --- |
| share | 0.14 | **0.1475** | 0.155 | 0.105 | **0.11** | |
| Auto | 84% | **56%** | 56% | 56% | **50%** | |
| Tactical | 84% | **78%** | 69% | 88% | **94%** | |
| Siege | 75% | **63%** | 78% | 97% | **88%** | |

So the Den's share is now **0.1475** and Elder Root's **0.11**: Auto wins about half at both, and Tactical stays between 75 and 95%. (Before
the lever, at their old shares, Auto won 41% at the Den and 28% at Elder Root.)

The holds with bows did not move: Bloodtusk Hold at 0.155, level 55, 16 seeds, gave the same 44%, 88% and 94% before and after the lever, and
the Necropolis at 0.1175, level 65, 32 seeds, the same 50%, 97% and 72% as its measure before it.

Tests: `assault-plan` checks that the Beast Packs and the Wildwood are bowless and the Orcs and the Undead are not, that Auto brings the plan's
two fords platoons onto the bridge's road at the Den and Elder Root, and that Tactical and Bloodtusk Hold keep the plan as it was.

## 4. The Heart of the Maze (the Labyrinth)

`src/sim/assault/maps/labyrinth.ts` (`MAZE_HEART`). The owner named it but gave no look, so it follows the camp overlook, which already
paints the Labyrinth's "stone labyrinth" (`src/art/camp/camp-wild.png`, its middle row): a sandstone maze at evening, braziers and red
banners on its walls, a horned temple at its heart.

**The layout.** Up the phone from the Landing at the south corner:

- **A dark canal** from edge to edge, straight and stone-lined, three cells wide. It is crossed by:
  - the stone bridge, with its barricade (the bridge fort) holding the far end by the ditch;
  - the West Ford and the East Ford.
- **The maze** (`MAZE`, its own): walls of sandstone on the approaches between the canal and the ring, three a side and mirrored across the
  hold's middle line, their gaps the ways through. They are per-tile walls a walker goes round (a `barricade` stamp with `look: 'maze'`), so
  the fords' roads wind through them; every way still goes through (`fieldProblems`).
- **The hills**:
  - the West and East Watchtowers on their knolls;
  - the old palace's ruins to the east, and the scrub (long grass);
  - the spear pits across the road (the stake field's slowing ground);
  - the bull pens under the east watchtower;
  - the herders' fodder stacks (they burn), war tents and fires;
  - the old shrine's knoll by the canal;
  - the three horned altars (the war drums' part), where the great horns are blown.
- **The rings**:
  - the ditch, the bank and the ring of bronze-capped sandstone walls, with the Horned Gate, two sally ports and the North Gate;
  - the outer bailey's longhouses, storehouses (the fire arrows' targets), the bronze foundry and its oil, and the hound pens;
  - the limestone wall, its four corner towers and the Bronze Gate;
  - the Bull Temple and the Champion's Throne at the top.
- **Behind**: the Hill Road, whose herders' camp sends the bands.

**The garrison.** 200: 180 at 30 posts and 20 down the road.

- The rank and file are Minotaurs (the chargers); its archers **Gorgons**, who shoot (so the Labyrinth has bows: its archers' posts keep to
  their perches, and Auto does not huddle here); its heavies the bellowing Minotaurs who guard their friends; its pens loose hounds (the
  war-wolves).
- A Gorgon Queen takes an officer's place the Council cannot fill; the Minotaur Champion (the army's last boss) holds the throne while no
  warchief sits.

**The balance** (`npm run balance -- --assault labyrinth --seeds 32`, the design party, a maxed castle, a full host). Its mark is level 95,
ten above Elder Root's:

| share | 0.11 | 0.125 | 0.13 | **0.14** |
| --- | --- | --- | --- | --- |
| Auto | 78% | 44% | 41% | **44%** |
| Tactical | 100% | 91% | 94% | **84%** |
| Siege | 94% | 97% | 94% | **91%** |

So its share is **0.14** (`HOLD_SHARE.labyrinth`): Auto wins a little under half, Tactical 84% and Siege 91%, the nearest of the holds to
the director's marks. (With bows on its walls, it plays like Bloodtusk Hold and the Necropolis rather than the Den and Elder Root.)

**The look.**

- Until its sheets are painted ([the prompts](assault-4-heart-of-the-maze-art-prompts.md), fourteen: the thirteen of the Orc set and its
  maze walls, which have no Orc twin), it is drawn with:
  - the Orc sheets recoloured by `sandstone` in the cutter: the grass dried to gold, the grey stone warmed to sandstone, the red cloth and
    the fire kept;
  - the Knights and Nomads kits: the stone walls, gatehouse, barracks, watchtower, scaffold tower, granary, stone bridge, lanterns,
    standards, shrines, stalls, carts, jars and crates, acacias, oaks, red rocks and dry scrub;
  - the maze's walls as the hold's own low barricade, recoloured (`standins` in the cutter: `'=barricade'`), until `lab-14` is painted.
    The Knights kit's stone wall was tried first and dropped: a whole wall a tile, it packed into a crowd of castles, and in the Knights'
    blue.
- The cutter takes a sheet with no Orc twin (`lab-14`): not painted, it is skipped, and a stand-in fills its piece.
- A warm evening over the field (`fieldGrade`); the minimap wears dry gold outside and pale stone within.
- `docs/samples/assault-art/labyrinth-kit.jpg` is the two kits' labelled contact sheet.

**Tests.** `assault-maze`:

- registered and named, the same each build, its own field, and sound (`fieldProblems`, with the maze in it);
- the canal a barrier but for the bridge and the fords;
- the baileys opened only by the Horned Gate and the Bronze Gate;
- 200 of the Labyrinth's own, with no orc among them and the Minotaur Champion on the throne;
- Auto plays an assault to its end, the same way twice;
- the Warpath's bands are its own army;
- the maze: walls a walker goes round, on the approaches, mirrored, every tile drawn as the maze's wall; and the Labyrinth has bows.

`assault-holds` now expects the Heart of the Maze's page built too, and the rest locked.

**Screenshots**: `docs/samples/assault-4/maze-*.png`: Mid and the Bull Temple at 360, 393 and 412; the maze by the West Ford.

## 5. Bonefire Crag (the Ogre Clans)

`src/sim/assault/maps/ogres.ts` (`BONEFIRE_CRAG`). The owner named it but gave no look, so it follows the camp overlook, which already paints
the Ogre Clans' "Bonefire clan camp" (`src/art/camp/camp-wild.png`, its bottom row): a war camp on a cold highland plateau at night, a great
hall framed by mammoth tusks, hide domes, bone heaps and fires.

**The layout.** Up the phone from the Landing at the south corner:

- **A torrent in a rocky ravine** from edge to edge, narrow and bending, further south than the other holds' water. It is crossed by:
  - the bone bridge, with its barricade (the bridge fort) holding the far end, and the track north from it to the Tusk Gate;
  - the West Ford and the East Ford.
- **The highland plateau**:
  - the West and East Lookouts on their crags;
  - the giants' ring to the east (ruins), and the heather (long grass);
  - the stake pits across the track (the stake field's slowing ground);
  - the warg pens under the east lookout;
  - the clans' meat heaps (they burn), hide tents and fires;
  - the champions' knoll by the ravine;
  - the three great bonefires (the war drums' part): while one burns high, the clans near it strike harder, until it is put out.
- **The rings**:
  - the ditch, the bank and the ring wall of boulders and tusks, with the Tusk Gate, two sally ports and the North Gate;
  - the outer bailey's longhouses, hide huts (the fire arrows' targets), the smithy and its oil, and the bear pens;
  - the basalt wall, its four corner towers and the Skull Gate;
  - the Hall of Tusks and the Giant's Seat at the top.
- **Behind**: the Mountain Track, whose clans' camp sends the bands.

**The garrison.** 200: 180 at 30 posts and 20 down the track.

- The rank and file are the clans' Orc Brutes (they charge), its heavies the Ogres (they sweep with their clubs and shove heroes back), and
  its pens loose wargs (the war-wolves).
- **The clans draw no bows** (`bowless`): the brutes in the archers' places charge from them, and Auto keeps the host together here, by the
  lever.
- A Shaman King takes an officer's place the Council cannot fill; the Horned Ogre (the army's last boss) holds the seat while no warchief
  sits.

**The balance** (32 seeds, the design party, a maxed castle, a full host). The ten-a-step ladder of marks the earlier holds took (55, 65, 75,
85, 95) would put the Ogres at 105, past the level cap, so the level the remaining holds are measured at is put to the director. Until then,
**at level 100**:

| share | 0.08 | **0.10** | 0.12 | 0.14 |
| --- | --- | --- | --- | --- |
| Auto | 84% | **56%** | 16% | 6% |
| Tactical | 91% | **69%** | 34% | 9% |
| Siege | 94% | **78%** | 38% | 13% |

So its share was **0.10** at level 100 (`HOLD_SHARE.ogres`): even at the level cap the clans are the hardest hold yet, and the share falls fast. At its mark, 99, it is **0.095** ("The holds' marks", below).

**The look.**

- Until its sheets are painted ([the prompts](assault-4-bonefire-crag-art-prompts.md)), it is drawn with:
  - the Orc sheets recoloured by `highland` in the cutter: the grass cooled, the timber and stone greyed towards frost, the red cloth and
    the fire kept;
  - the Orcs and Dwarves kits (and a few Moonpack pines): the stone walls, cliff gate, great hall, cottage, forge, watchtower, shrine,
    braziers, granary, stockpile, stone bridge, boulders, rocks, dead pines and rubble beside the Orcs kit's own pieces.
- A cold night over the field (`fieldGrade`), lit warm from the upper left; the minimap wears the cold highland's greens and greys.
- `docs/samples/assault-art/ogres-kit.jpg` is the two kits' labelled contact sheet.

**Tests.** `assault-bonefire`:

- registered and named, the same each build, its own field, and sound (`fieldProblems`);
- the torrent a barrier but for the bridge and the fords;
- the baileys opened only by the Tusk Gate and the Skull Gate;
- 200 of the Ogre Clans' own, with none of Bloodtusk Hold's orcs among them and the Horned Ogre on the seat;
- Auto plays an assault to its end, the same way twice;
- the Warpath's bands are its own army;
- the clans draw no bows, and their archers' places hunt.

`assault-holds` now expects Bonefire Crag's page built too, and the rest locked.

**Screenshots**: `docs/samples/assault-4/crag-*.png`: Mid and the Hall of Tusks at 360, 393 and 412; the bone bridge.

## The holds' marks (`HOLD_MARK`, the director's ask)

Each hold's share is measured at a hero level, its **mark**. Until Bonefire Crag, the marks were a ladder of my own, ten levels an army (55,
65, 75, 85, 95), which ran past the Legendary band (65 to 85, `difficulty.md`) and would have reached 105 at the Ogres, past the level cap. The
director set the rule: the mark is the hero level a player has when they win that army's tenth star, since that is when its hold opens.

**Where it comes from.** The Legendary Orcs are tuned at level 55 (the joint rebalance: 86% of single tries there; the Orcs' `tierStart`).
Every army's tiers are the same multipliers (`TIERS`) on its own curve, and each army's curve is set so its Normal takes two to four tries
at its own recommended level (`Army.level`; `difficulty.md`, "At the recommended level"). So the level an army's Legendary star needs moves
with that army's own level, one for one: **mark = 55 + (`Army.level` - 1), at most 100.** It climbs 7 to 13 levels an army, about the old
ladder, but follows the game's pacing and stops at the cap:

| army | Orcs | Undead | Beasts | Wildwood | Labyrinth | Ogres | Infernal | Yokai | Golems |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `Army.level` | 1 | 8 | 15 | 22 | 35 | 45 | 58 | 65 | 74 |
| mark | 55 | 62 | 69 | 76 | 89 | 99 | 100 | 100 | 100 |
| old ladder | 55 | 65 | 75 | 85 | 95 | (105) | | | |

It is one table in `garrison.ts`, with its reasoning in a comment; `assault-holds` checks that it keeps to the rule, and `npm run balance --
--assault <army>` measures at the hold's mark by default. (The derivation is from the armies' levels and the tiers' design, not a new
measure of every army's Legendary tier; `tools/army-pace` can check it if wanted.)

**Re-measured** (every hold but Bloodtusk's moved; 32 seeds; targets Auto about 50%, Tactical and Siege 75 to 90%):

| hold, mark | share | Auto | Tactical | Siege |
| --- | --- | --- | --- | --- |
| Necropolis, 62 | **0.1175** (kept) | **44%** | **81%** | **88%** |
| Den, 69 | 0.135 | 78% | 100% | 88% |
| | **0.14** | **69%** | **66%** | **78%** |
| | 0.1475 (was) | 72% | 56% | 72% |
| | 0.155 | 56% | 66% | 50% |
| Elder Root, 76 | **0.095** | **56%** | **94%** | **94%** |
| | 0.10 | 38% | 100% | 97% |
| | 0.11 (was) | 28% | 84% | 84% |
| Heart of the Maze, 89 | **0.125** | **59%** | **88%** | **84%** |
| | 0.14 (was) | 19% | 78% | 72% |
| Bonefire Crag, 99 | **0.095** | **59%** | **84%** | **75%** |
| | 0.10 | 47% | 72% | 69% |

So the shares are now: the Necropolis 0.1175 (it did not need to move), the Den **0.14**, Elder Root **0.095**, the Heart of the Maze
**0.125** and Bonefire Crag **0.095**. The Den's measures jump the most from share to share (its Tactical reads 100%, 66%, 56% and 66% over
four neighbouring shares, as single seeds tip), so 0.14 is the middle of them: over 0.135 to 0.1475 together it wins about 70%, 74% and 79%.
Auto does better there than at the other holds, as the lever keeps the host together against a garrison of melee wolves at a lower level.
(The share tables in sections 2 to 5 above were measured at the old marks.)
