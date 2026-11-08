# The Assault, phase 1: the Orc assault, playable

## Phase 1a and 1b (the owner's tactics direction)

Mid-build, the owner set the tactics direction: plan plus key orders, siege tools and a reactive enemy, with morale and routing left out.
Phase 1 is split.

**1a (this branch)** is the playable loop, the War Plan, the orders and slow time. On top of everything below it adds:

- **The War Plan.** Each platoon's row on the muster opens its orders (an ornate card):
  - **the way over the Redwater**, each with its trade-off: the Old Bridge is the shortest, but narrow, and its fort shoots down it; the
    West Ford's shallows slow every step and the reeds hide the village's ambush; the East Ford is a long march past the wolf pens;
  - **its part:** Main push (the nearest gate, then the throne), Ridge and cover (a few tiles behind the main push), or Flank the Warpath
    (round for the North Gate).
  A platoon plays its part on its own until the player orders it (`PlatoonState.manual`); Auto hands them all back.
- **Scouting.** The Council's posts are shown only once scouts are sent (100 crowns). Their report is spent by the next assault. The lord
  is always known.
- **The orders:**
  - move (a tap), attack target (a tap on a foe: Focus), hold, charge, fall back;
  - **Flank**: tap Flank, then a foe. The platoon goes round to the foe's far side without stopping for blows, then strikes it;
  - the formations are now the owner's four: **line, wedge, shield wall and loose**.
- **Slow time:** a Slow button on the top bar runs the battle at a tenth of its pace while orders are given, and a second tap resumes. It
  is not a pause, and every order is still tied to its tick, so it stays deterministic.
- **Morale and routing are off** (`MORALE.on = false`). No post routs, not even at the lord's fall; the rules stay in `holdMind.ts`. The
  lord's fall still takes the hold after five seconds.

**1b (this push)** is the siege tools, the reactive enemy and the hold drawn in the owner's Orc art: see
[Phase 1b](#phase-1b-the-siege-works-the-reactive-hold-and-the-orc-art) below.

Phase 1 of `docs/design/assault-mode.md` (branch `claude/assault-design`, section 10). It builds on phase 0's engine
(`docs/notes/assault-0.md`) and its render fix. With ten stars on the Orc Warband, the army card offers **Assault Bloodtusk Hold**. The
player musters five platoons and storms the hold in one real-time battle: 55 of ours against the garrison's 200, the army's Dark
Council at its posts, and the warchief (or the Warlord) on the throne.

**Chronos Settlement's conquest code was read.** `hpatter9/little-town` is public, so this session cloned it read-only. Its
`src/shared/sim/conquest/` and `src/shared/data/troops.ts` describe a different game: Symphony of War squads of nine on a three-by-three
grid, provinces and rival realms. Two habits were borrowed:

- one plain line of flavour for each troop kind (`TroopKindDef.text`);
- siege crews striking walls harder (the design's Shieldguard and Gunners rider).

Its counters table was not taken: the design has none.

## Phase 1b: the siege works, the reactive hold and the Orc art

### The siege works (`src/sim/assault/siege.ts`)

Bought on the muster (each platoon's orders card, **Siege works**) and paid at the march as far as the crowns go, the ram first. What is not
used is paid back after the assault (a ladder never put up, the ram if it still stands; the result page says so). The choice is kept in the
save (`AssaultMeta.siege`); `buySiege`, `siegeCost` and `SIEGE_PRICES` are in `economy.ts`.

- **Ladders (100 a platoon).** The **Ladder** order, then a tap on the stone wall: the platoon walks to the wall's foot (the outer bailey
  below the nearest wall-walk tile, `scaleAim`), and four seconds after it stands there the ladder goes up. The foot and the wall-walk above
  it carry the same `Tile.ladder` number, and `canStep` lets a walker of either side step between them whatever the height (a climb each
  step). The sector graph is rebuilt for the two tiles. Defenders beside the ladder's top push it down: 600 hp, 60 a second for each foe
  there. From the wall-walk the stairs lead down into the inner bailey, so a ladder goes round the Iron Gate.
- **The ram (400).** A unit of ours (`siegeRam`, a summon, so nothing counts it as a hero), with its platoon's group. It follows its platoon
  at the Shieldguard's walk (the field's own walk, so it finds the bridge). With its platoon ordered to Assault a gate or a segment, it rolls
  up to it and strikes it for 600 (at the garrison's toughness, as the gates' hp are) every two seconds. It never fights the garrison; the
  garrison strikes it like one of ours, and shots strike it twice as hard (the archers burn it). 4,000 hp, defence 14.
- **Fire arrows.** A platoon with shooters (its hero's shot or its soldiers') ordered to **Fire**, then a tap on a hut, walks until the hut
  is within six tiles and looses at it, before any foe. Six arrows burn it: for thirty seconds every foe within three tiles chokes (3% of its
  health a second, which also wakes a post asleep there) and panics (its blows at three quarters). Then it has burnt out and stays a heap.
  The huts are the blueprint's `solid` stamps with `burns`: the three longhouses (the barracks sleep beside one), four new hide huts in the
  outer bailey, the lumber camp's log piles and three reserve tents at the Warpath's camp.
- **Suppression.** A platoon with shooters ordered to **Suppress**, then a tap: while any of its shooters stands within eight tiles of the
  spot, the foes within two of it strike at half, and its shooters take those foes first.

The bot uses them too: a platoon with a ladder scales the wall where it stands rather than assault the Iron Gate, and a cover platoon with
shooters suppresses the nearest awake archers within ten tiles of the main push.

On the battle's command bar a second row appears over the orders for a chosen platoon that can give them: **Ladder** (a kit carried),
**Fire** and **Suppress** (shooters). Each readies the next tap, as Flank does.

### The reactive hold (`src/sim/assault/react.ts`)

Run on the hold's second, in post order, no random numbers; a post's errand (`PostState.errand`) sets its mark before its own hunting.

- **Feints.** The wall struck last (within eight seconds) draws the nearest awake gate crew or bailey post whose own gate has not been struck
  for fifteen seconds and that has none of ours within eight of its home: it goes three tiles inside the threatened wall (two posts at most
  a threat; forty seconds, then home). The moment its own gate is struck it turns for home, and the walk back is the window.
- **Captains sally.** A captain's post (the South Gate's, the Iron Gate's) charges a platoon of ours within twelve tiles that has lost half
  its soldiers or whose hero is down or under half health, for twenty seconds.
- **The lord sallies once**, when ours first stand in the inner bailey: he and the throne's guard come down at the nearest platoon for
  twenty-five seconds, then climb back.
- **Wolf riders.** On the great horn the wolves leave their pens and ride for the rearmost platoon (the cover first) wherever it is, for a
  minute. (The garrison's wolves are war-wolves; there is no rider sprite.)
- **The Warpath.** The bands now gather at the reserve camp (`Blueprint.warpath`, 13, 13), each a post of its own, and march down to the
  North Gate's causeway, where they are let in while it stands (or walk through it once broken) and join the post that has lost the most.
  A band sets out every ninety seconds while a drum beats and every two and a half minutes once all three are silent, four at most (the
  design's twenty), until the Warpath is **held**: ours at the camp for ten seconds with no foe within six. The drums no longer stop the
  bands, holding the Warpath does. The **Flank the Warpath** part now goes to hold the camp first, then for the North Gate.

The old rule (bands only while a drum beats) and its test are replaced: `assault-siege` lost its band test, and `assault-react` has the new
one.

### The Orc art (`tools/assault/cut-sheets.py`, `src/render/fieldLooks.ts`, `src/render/fieldView.ts`)

`art/assault-orc` (the owner's 13 sheets, PR #442) is merged in. All 13 were there by the time 1b started, so nothing falls back.

- **The cutter** (`npm` has no script: `python3 tools/assault/cut-sheets.py orc`, `--report` to check only) cuts each sheet by its template's
  grid, clears the sheets' soft alpha (opaque from 128), trims and halves the standing pieces by a 2 x 2 box average keeping each foot point,
  and packs them with about sixty Chronos kit pieces (`KITS` points at `hpatter9/little-town/src/renderer/art/iso/kits/`) into
  `src/art/assault/orc/sprites.webp` (2048 x 918, 153 pieces), listed with their rects, feet and footprints in `src/render/assaultOrcAtlas.ts`.
  The ground textures are made seamless (offset by half, a 16 px band blended over the seam) and kept at 256 px (`ground.webp`); the
  transitions go to 64 px, the decals to 128 px, the faces to 64 x 120 columns. About 900 KB in all, loaded by URL and listed in the service
  worker (`build.mjs`, `ASSAULT_ART_FILES`).
- **The looks** (`fieldLooks.ts`, pure and tested): each tile's material from its zone, ground, height and a smooth noise (fourteen in use:
  grass, heath on the crags and the Warpath, trampled ground by the posts, mud on the bank, wet mud in the ditch and the bailey's patches,
  camp dirt, ash and scorch in the village, cobbles on the roads, flagstones inside, the wall-walk's stone, shingle by the water, planks on
  the bridge, the shallows); the fringes (the higher-ranked material's edge laid over its neighbour at the same height, turned to face it, a
  corner for a diagonal, the foam line on the water, grass creeping back over some mud); the face of each column by zone and height; the
  decals and the low clutter by zone; and every standing piece.
- **The bake** samples each tile's quarter of its 256 px texture (no 64 px repeat shows), lays the fringes, draws each face as a lip, a body
  of four steps and a foot with a dark band at the foot of the tall ones, then the decals (flat tiles only, away from the chunk's edge), the
  low clutter, the dried tall grass and the low pieces (the pens).
- **The standing pieces**: the palisade's runs (inner faces on the ring's back sides), the gates, the sally ports, the drums, the
  longhouses, huts and tents (the outer bailey's solid tiles are the camp's tents in rows), the keep's hall behind the throne (on new solid
  tiles at the mound's back), the throne and great banner, the corner towers', gate towers' and watchtowers' tops (sorted with their back
  tile, so their crew shows on them), the wall's crenels and braziers, the bridge fort's barricade, the barrels, trees and boulders on the
  solid tiles, a banner at each post outside the walls, and the plan's new landmarks (Gallows Hill's poles, the cairns' totems, the
  Warpath's pennant). Nothing taller than half a tile stands on open ground except a pole or one of the camp's set pieces phase 1 already
  drew there (`assault-looks` checks it).
- **States**: a structure's picture follows its hp each frame (whole, battered under 60%, the palisade broken under 25%, the breach or the
  broken gate), a drum beats with a small squash until it is silenced, a burning hut shows fire and smoke from the fx art and becomes a burnt
  heap, the ladders lean on the wall, and the ram rolls.
- **Far** bakes the materials and the big landmarks into its overview.

**The sheets, for the art lead (footprints and anchors):** most cells stand as the templates say. The cutter stood eleven on their own
pictures instead (`--report` lists them):

- ORC-03: the Iron Gate's three pictures sit about 27 px lower than a 2 x 2 footprint (they are painted larger than it); the postern and
  the corner tower top are 50 to 60 px high and 7 to 19 px left of their foot points.
- ORC-07: the throne and the great banner are painted about 75 px left of their cells' foot point (256, 440), at about x 180.
- ORC-08: the downward stair sits 48 px above its foot point.
- ORC-11: the ram and the trebuchet are 46 px high and 12 and 29 px left.
- The one-tile pieces of ORC-01, 08 and 10 stand on their foot point itself, not the footprint's bottom tip (27 px above it). For a thin wall
  that is right, and it is kept.
- ORC-09: the two drums are on a large 2 x 2 platform, unlike the kit's war drum, so the struck picture serves as the beating drum (with a
  squash) rather than alternating with the kit's.
- ORC-13: cell 9 (boot tracks) is painted as paw prints, like cell 10.
- Not used yet: the postern, the trebuchet, the catapult, the bolt thrower, the bridge's modular deck and the river debris (the blueprint has
  no place for them), and the stairs as sprites (the terrain's steps show them).

### 1b's numbers

Balance (`npm run balance -- --assault orcs --levels 55 --seeds 16`: the design party at level 55, a maxed castle, full platoons of
recruits; Siege is the Tactical bot with the ram and two ladders):

| Style | Wins | Host lost | Time (won) |
| --- | --- | --- | --- |
| Auto | 50% | 86% | 4:32 |
| Tactical | 88% | 46% | 3:07 |
| Siege | 100% | 39% | 3:03 |

Against 1a (Auto 50% / 85% lost, Tactical 81% / 57%), the reactive hold has not made Auto harder in wins, and the siege works pay: the ram
and ladders take Tactical from 88% to every one of sixteen, losing a third fewer of the host. The losses stay brutal on Auto, as the owner
asked; nothing was softened.

Performance: the headless bench (`npm run assault-bench`, the Bloodtusk bench fight, Auto) runs at a mean of 0.42 ms a tick, p95 1.05 ms,
worst 8.2 ms (the phase's budget is a mean of 0.75 here: met). In Chromium (headless, software drawing, x1) the art costs some frame rate:
about 30 to 50 fps at Near and 48 to 58 at Mid, against 54 to 60 before; the chunk bake is the cost and stays at two a frame.

### 1b's tests

- `assault-works`: a ladder up after four seconds joins the foot to the wall-walk and is pushed down; the ram's blows every two seconds at
  600 and the archers burning it; six fire arrows, the smoke and the burning out; suppression and its end; the refund; the same seed, the
  same assault with the works.
- `assault-react`: the bands from the Warpath (ninety seconds, two and a half minutes with the drums silent, none once held); a feint and the
  post going home; a captain's sally and the lord's; the wolves riding for the cover.
- `assault-looks`: every tile's material, the fringes, faces, decals and clutter naming the sheets' cells, the standing pieces and the rule
  that looks never hide a fighter, and the structures' states.
- `assault-economy`: the siege works' cost, buying and saving. `assault-plan`: the flank part holds the Warpath first.

### 1b's screenshots

`docs/samples/assault-1b/`: the field at Near, Mid and Far (the Landing, the South Gate, the stone wall, the throne, the village, the Warpath,
a ladder up, the structures whole, struck and broken), at 393 x 852 and the main views at 360 x 780 and 412 x 915; the muster, the orders
card's siege works and the battle's works row at the three sizes. The bench takes `&siege=1`, `&skip=n`, `&at=u,v` and `&zoom=z` for them.

## What was built

### The hold (`src/sim/assault/blueprint.ts`, `maps/orcs.ts`, `fieldMap.ts`)

- **Bloodtusk Hold's blueprint is drawn by hand as data.**
  - A 50 x 50 zone stencil of literal rows.
  - About seventy stamps: the gates and their causeways, the watchtowers and corner towers, the stairs, the longhouses, the forge, the
    pit, the pens, the barricade fort, the barrels, the drums, the stake field and the set pieces.
  - The 30 posts of the design's table, with their rosters.
  - The three approaches, the rally flag and the five muster places.
- **The rings, in tiles:**
  - the ditch, 24 to 25 and 74 to 75;
  - the palisade on the bank, 26 to 27 and 72 to 73;
  - the bank, 28 to 29 and 70 to 71;
  - the outer bailey, 30 to 37 and 62 to 69;
  - the stone wall, six steps up, 38 to 39 and 60 to 61;
  - the inner bailey, 40 to 43 and 56 to 59;
  - the stepped mound, 44 to 55, with terraces at +3, +5 and +7.
- **One change from the design's numbers.** Its river (depth 140 to 148) would run into the palisade's south corner (depth 146 to 150). So:
  - the Redwater runs at depth 156 to 163;
  - its fords cross at across -34 (West, 4 wide, reeds on the far bank) and +34 (East, 2 wide). Further out is off the map at that depth.
  - The Old Bridge stays at across 0, with its barricade fort (a U of timber, a gap a tile wide, open behind, two barrels).
- **The structures** are the design's:
  - the South Gate (2 wide);
  - the West and East Sally Ports (1 wide), mirrored about the road;
  - the North Gate (2 wide), towards the Warpath;
  - the Iron Gate (2 wide, 2 deep) in the stone wall;
  - the three war drums;
  - 64 palisade segments of three tiles along a face (both rows deep).
- **The flesh** comes from `mixSeed(ASSAULT_SALT, army index)`, never the save's seed, so every player storms the same hold. It holds:
  - boulders, bushes and tall grass in the fields;
  - ruined walls and grass in the burnt village;
  - tent rows (the war camp's yurt boulders) in the bailey, so its lanes stay walkable.
- **The ditch's stakes** are the `spikes` hazard every 8 s; the stake field's every 3 s. Walkers weight stake tiles as further away, so
  they go round when they can.
- **`fieldOk`** (`fieldProblems`) finds nothing wrong:
  - every standable tile beyond the ditch is reachable from the Landing at jump 1;
  - both baileys are shut at jump 4 until a gate breaks;
  - every post, muster place and waypoint stands on ground.
  The hold builds in about 80 ms and is copied for each assault.
- **Fliers:** the palisade's solid tiles stop fliers as well as walkers (the design: "blocks movement"). The stone wall's height does not,
  so a flier inside the palisade reaches the wall-walk and a walker never does.

### The troops (`src/sim/assault/troops.ts`)

- **The nine kinds**, by the design's table, with `troopOf` taking its rule in order and the Beastmaster's override. Every hero in
  `ALL_HEROES` maps to a kind whose sheet exists.
- **Looks:** Machine heroes lead robots, Undead heroes skeletons.
- **In `UNITS`:** each kind and look is a unit (`troop_<kind>[_<look>]`) marked `summon`, so nothing counts troops as heroes. They are
  added to `UNITS` when the module is first imported; `meta.ts` does not import it. The War-wolf (`warWolf`, `wolf_black`) is added the
  same way.
- **Stats:** base × the hero's lasting level factor (`lastingBoost`) × rank (Recruit ×1, Blooded ×1.08, Veteran ×1.16, Elite ×1.25 and
  its trick half again) × `TROOP_TUNE` (hp ×1.5, see balance).
- **The tricks:**
  - Locked shields: ×0.85 taken beside a platoon-mate;
  - the siege rider: ×1.25 on structures;
  - Cleave: every third blow, half again on the neighbours;
  - Brace: ×1.5 on a foe that stepped at them;
  - Flank: `flankStep`;
  - Volley: ×1.15 when four loose within 0.6 s;
  - Pierce: 3 armour;
  - Splash: the battle's own;
  - Mend: 4% a second to the most hurt friend within 2, soldiers first;
  - Pack: +10% a wolf, to +30%.

### The engine (`battle.ts` hooks, `assault.ts`, `garrison.ts`, `forts.ts`, `holdMind.ts`, `platoons.ts`)

**The assault is a real `Battle`**, stepped by `stepBattle`, with `Battle.field` set. `battle.ts` gained a `fieldHooks` object, read
only on a fight with a field:

- the field's tick;
- the cheap minds;
- a hero's orders before its own mind;
- its sight;
- the blow and pierce riders;
- `unitAt` through the occupancy grid;
- a step's bookkeeping;
- a barrel on the forts;
- the end;
- `around`.

**Two more changes in shared code** do nothing on any other board:

- **`walkFrom` on a board over 2,500 tiles** (only the field: the biggest other board is 252) walks a 25 x 25 window with `walkNear`. So
  every existing kit, flank, kite, perch and feared step works on the field at a window's cost.
- **`around`:** while a whole mind (a hero, an officer, the lord, a summon) decides, `b.units` is cut to the fighters within 16 tiles.
  Its kits pick targets (a blink, a dash, a revive) only from those. The Kunoichi's blink no longer crosses the hold, and a decision
  costs a few dozen fighters, not 255.

**Who runs which mind:**

- **Heroes keep their whole minds:** kits, ultimates, auras, statuses. Their orders come first: Move (attack-move, leashed within 4 of
  the point), Hold, Charge, Fall back, Assault and Focus.
- **Soldiers** run the cheap mind:
  - they steer to their formation's slot round the hero;
  - they take on what comes within reach plus 2 on a leash of 6;
  - they strike the structure their platoon assaults;
  - they strike through the battle's own `swing`.
  - While the hero is down, the first soldier walks for the platoon, the slots close up, and it strikes at ×0.85.
- **The garrison sleeps at its posts.** The rank and file run the cheap mind. The officers and the lord keep their whole minds once
  awake. Patrols walk their loops.

**The hold's mind**, once a second:

- waking within 8, calling within 12;
- the great horn on the first blow on the palisade: the barracks, wolves and pens wake, the sally ports open, the bank's archers spread
  to the side struck;
- one sally at a time at a platoon alone near an open port;
- morale: a post routs at 60% lost with its leader down, or its leader fled, never by a beating drum. Everyone routs when the lord
  falls.
- reinforcements every 90 s from 1:30 while a drum beats, four bands;
- a gate opening from inside 10 s after its crew falls with one of ours inside the wall by it;
- a downed hero rising at the rally flag after 45 s at half health with three soldiers standing;
- the Acolytes' mend.

**Structures** (`forts.ts`):

- They are not units, so no kit can shove a gate or poison a drum.
- They are struck by the Assault order, and by a leaderless platoon on its order.
- A blow has every rider off.
- Broken, they open their tiles: a palisade segment becomes a rubble ramp up from the ditch. The sector graph is rebuilt once for each
  break.
- A barrel blasts structures within a tile.

**The Council at its posts:**

- lieutenants take the Old Bridge, then the three drums, then the watchtowers;
- captains take the South Gate, the Iron Gate and the two throne places;
- mightiest first;
- a place the Council cannot fill takes a nameless Orc Chieftain.
- **The lord:** the warchief rides to defend the hold (Q1), changing form at half health. With no warchief, a member born the Warlord,
  else the Warlord at the last wall.

**Strength:** the garrison stands at the Orcs' Legendary tier at wave 8, × `ASSAULT.foeShare`. The officers and the lord stand at their
walls × the share × `officerShare`. Structures have the design's hp × the garrison's hp multiplier.

**The end:**

- the lord's fall, then 5 s of rout: won;
- all the heroes down at once: lost;
- 12:00: night;
- the retreat sounded: withdrawn.

**Determinism:**

- The garrison's small draws come from `mixSeed(seed, GARRISON_SALT)`.
- The platoons' orders are queued and applied at the next tick, and kept in the hold's log. `playAssault(b, log)` replays them.
- Ultimates and spells go through the existing `orders.ts` log.

### The save and the economy (`economy.ts`, `assaultMode.ts`, `meta.ts`, `armyStars.ts`, `council.ts`, `nemesis.ts`)

- **`Meta.assault`** holds the platoons' marks, the holds conquered, the tries, the tribute day, the war table's scene, and the muster's
  last plan and formations. It is read defensively:
  - platoons are cut to ten and marks clamped;
  - unknown hero kinds are kept, unknown armies dropped.
  An older save has none.
- **Buying:** 60 crowns a recruit, and Fill the ranks while the crowns last. There is no upkeep.
- **A fall is struck from the save as it happens** (-1, dropped on the next read), so a page closed mid-assault loses exactly the
  soldiers already fallen.
- **Settling:**
  - survivors earn 1 mark for living, 1 for every 3 kills (a structure broken counts as one) and 2 for a conquest;
  - heroes take a boss wave's XP at the Legendary tier, ×2 on a win and ½ on a loss;
  - the War settles through `noteWar` as an army run on Legendary;
  - each Council member slain pays twice the War Trophies;
  - a hold's first fall pays the Spoils (4,000 crowns for the Orcs) and the Conquest chest, and starts the tribute (150 a day for the
    Orcs).
- **A change from the design.** An assault counts as fought (the survival mark and the XP) only after two minutes of battle, or a win.
  A retreat sounded at the start would otherwise farm free promotions.
- **The Conquest chest** is a gold chest marked `conquest`: half again its crowns and stones.
- **The Council's conquest rules**, all no-ops on a save with no conquest:
  - a member slain on the winning attempt cannot cheat death;
  - a conquered army births no nemeses;
  - the Recruit draws only from unconquered armies.

### The page (`armiesView.ts`, `assaultView.ts`, `assaultScene.ts`, `home.ts`, `camp.ts`, `render/fieldView.ts`)

Every menu is built with the standard ornate menu (`ornateMenu`, `menuSection`, `menuChoice`, `menuPick`, `menuWell`, `menuNote`,
`menuFoot`).

- **The army card:**
  - **Assault Bloodtusk Hold** at ten stars, or a sealed "Win all ten stars" plate once the mode is open.
  - A conquered army's card reads "· Conquered" and "Remnants of the Orc Warband". It offers the day's tribute (**Claim tribute**).
  - Phase 1 offers no second storm: the weekly re-storm is phase 2's.
- **The war table's scene** (an ornate card, once): the scouts report.
- **The muster** (a full page: ‹ Back, March):
  - **Your host:** a row for each platoon, with its count, its veterans in words and **Fill · cost**, plus **Fill all the ranks**.
  - **The plan:** the hold drawn small from its zones, the approaches dotted, a banner for each platoon. A tap on a platoon's row moves it
    to the next approach, with the plan in a line.
  - **The hold:** the posts by zone, the lord and the Council at their posts (a tap opens the nemesis card), and the drums' line.
- **The platoon card** (Close, Fill the ranks):
  - the ten places, a tap on an empty one buying a recruit;
  - the numbers at the hero's level;
  - the formation as four choices.
- **The battle** runs as its own layer with its own renderer:
  - **The top bar:** the clock (counting down from 3:00 left), foes left of the 200, the three drums, Auto, x1 / x2, and pause.
  - **The minimap:** a tap moves the camera, and a long press sends the chosen platoon.
  - **The order row:** Hold, Charge, Fall back, the formation chip, Follow.
  - **The platoon bar:** health, count, the ultimate's bar and gem, and All. A second tap fires a full ultimate, a double tap flies
    there, and a long press opens the read-only card.
  - **The king's spell row.**
  - **A tap on the field** sends the chosen platoon: a gate, segment or drum is an Assault, a foe a Focus, anywhere else a Move. With
    All chosen, the platoons fan out round the point.
  - **The pause card:** Resume, Battle detail (Full or Lite at 30 fps), and Sound the retreat (two taps).
  - The camera drifts to the fiercest fight when left alone.
  - Soldiers' falls are saved as they happen.
- **The result page:**
  - the host (home, fallen by rank, promoted, XP);
  - the Council's lines;
  - the spoils;
  - ‹ Back, and Fill the ranks on a loss.
- **The camp's overlook:** a conquered army's camp loses its patrols and shows the castle's banner where its boss stood.
- **A spell on the field** reaches the fighters within 16 tiles of where it is cast. An "everywhere" spell reaches those near the
  camera's middle.

### The tools

- **`npm run balance -- --assault orcs`** (`tools/assault/balance.ts`): Auto and Tactical, with `--levels`, `--seeds`, `--share`,
  `--party` and `--talents`.
- **`npm run assault-bench`** and **`?bench=assault`** play a whole Bloodtusk assault (`benchInput.ts`). `--spike` and `&spike=1` keep
  phase 0's spike.

## The numbers

### Balance

The design's party (Knight, Samurai, Archer, Fire Wizard, Queen Dragoon), level 55 (the Orcs' Legendary level), a maxed castle, a full
host of recruits, 16 seeds a cell:

**With 1a's War Plan** (Auto plays the default parts: two on the main push, one in cover, one on the flank, one more on the push; Tactical
keeps the host together), at 0.155, 16 seeds: **Auto wins 50%, losing 85% of the host; Tactical wins 81%, losing 57%.** Tactics are worth
31 points. The flank costs Auto its host: a lone platoon at the North Gate is a trade-off, as the owner wants. Before the War Plan:

| foeShare | Auto wins | Auto host lost | Tactical wins | Tactical host lost |
| --- | --- | --- | --- | --- |
| 0.14 | 83% | 59% | 100% | 43% |
| **0.155 (set)** | **56%** | **66%** | **88%** | **50%** |
| 0.16 | 44% | 67% | 100% | 61% |
| 0.17 | 8% (12 seeds) | 72% | 75% | 63% |

- **The design's first guess (0.55) was far too high.** A Legendary grunt at 0.55 is about one grade-3 hero.
- **At 0.155:**
  - Auto wins 56%, inside the 40 to 60% target;
  - Tactical wins 88%, inside 75% or more;
  - tactics are worth 32 points, against the 20 or more the design asks.
- **Tactical** keeps the host together and takes the nearest beating drum as one, then the gates. Its flying hero goes over the stone wall
  to the Iron Gate's crew.
- **Not met: the host's losses.** They run about 66% on Auto (target 40 to 60%) and 50% on Tactical (target 25 to 40%). Tougher soldiers
  (hp ×2.2) did not lower them: the fights only ran longer, and the soldiers fought to the end. See the questions.

### Performance

**Headless** (`npm run assault-bench -- --seeds 3`, this container, Bloodtusk with five full minds):

| Seed | Mean | p95 | Worst | Walks a tick | Decisions a tick (most) |
| --- | --- | --- | --- | --- | --- |
| 1 | 0.635 ms | 1.45 | 20.0 | 2.67 | 28.4 (71) |
| 2 | 0.700 ms | 1.49 | 7.9 | 2.66 | 30.0 (91) |
| 3 | 0.534 ms | 1.09 | 12.0 | 1.83 | 27.5 (78) |

- The mean is 0.62 ms, inside the design's 0.75 ms desktop budget. The engine spike was 0.14 ms.
- The heroes' whole minds and the battle's own step (statuses, pending blows, hazards) cost the difference.
- Decisions peak at 71 to 91 in a big melee, over the design's 60. Single ticks of 8 to 20 ms are compiles and garbage collection.

**The browser** (Chromium, 393 x 852, the bench's Bloodtusk assault, 40 s at each level):

| Level | CPU | Sim ms a tick (mean / p95 / worst) | fps | Frame ms (mean / p95) | Work a frame | Drawn |
| --- | --- | --- | --- | --- | --- | --- |
| Near (0.5) | x4 | 4.17 / 9.4 / 27.0 | 28 | 37.7 / 50 | 8.3 ms | 65 fighters, 28 of 28 chunks |
| Mid (0.22) | x4 | 4.49 / 11.4 / 34.2 | 28 | 32.8 / 50 | 8.9 ms | 146 fighters, 58 of 58 chunks |
| Far (0.06) | x4 | 4.54 / 10.9 / 31.3 | 51 | 18.1 / 33 | 5.2 ms | 216 dots |
| Near | x1 | 1.00 / 2.1 / 7.1 | 54 | 19.3 / 33 | 1.7 ms | 67, 28 of 28 |
| Mid | x1 | 1.01 / 2.2 / 6.1 | 60 | 17.0 / 16.8 | 1.7 ms | 140, 58 of 58 |
| Far | x1 | 0.96 / 2.2 / 7.1 | 60 | 16.7 / 16.7 | 1.2 ms | 215 |

- **The x4 sim is 4.2 to 4.5 ms a tick**, over the design's 3 ms phone budget; the spike was 1.4 ms.
- **On the owner's phone**, phase 0's sim measured 0.6 ms where this container's unthrottled Chromium showed 0.35 ms. At that ratio,
  phase 1's 1.0 ms here would be about 1.7 ms on the phone, inside the budget. That is an estimate: the phone is the real gate. Open
  `?bench=assault` after release.
- If it is over, the design's fallback is the sim in a Web Worker.
- This container's Chromium has no GPU, so its frame rates are not a phone's.

## Tests

| File | What it checks |
| --- | --- |
| `assault-map` | the hold is the same each build; `fieldOk`; the baileys open only through a gate; rubble ramps; the structures; 180 and 20 |
| `assault-platoons` | every hero's kind and sheet; the rule and the overrides; the looks; level and rank scaling; never over ten; the formations' places |
| `assault-garrison` | 180 asleep at their posts; the Council by rank and Might; Chieftains in the empty places; the warchief or the Warlord; only the army's own members |
| `assault-siege` | a breach opens the way and is told; riders off; a flier reaches the wall-walk and walkers never; a gate opened from inside; drums and reinforcements |
| `assault-end` | the lord's fall and the rout; all heroes down; night; the retreat; the rise with three soldiers and not two |
| `assault-economy` | buying and filling; falls struck as they happen; the save round-trip and an older save; marks; tribute; the tenth star; settling a win, a loss and a withdrawal; a retreat at the start earns nothing |
| `assault-replay` | the same input, seed and orders play the same assault; the log replays it; another seed plays another; the budget counted over three minutes |
| `assault-plan` | the owner's four formations; the parts drive the platoons until an order; Auto hands them back; Flank goes round, then strikes; scouts |
| `assault-isolation` | no other board takes the windowed walk; an ordinary fight has no field and plays the same; troops are never heroes |
| `assault-render` (step 1) | every chunk in view is drawn |

## Art still needed

**For 1b, to the art lead:**

- the ram (two frames, pushed by a platoon);
- a ladder against the stone wall (up, and pushed down);
- a fire-arrow streak;
- a burning hut with its smoke (a loop).

Phase 1a needs none.

**The playable gate needs no new art**, and phase 1 ships with existing art only:

- gates: the camp's gate picture;
- palisade and barricade: the ruined walls;
- drums, tents, flags, fires, braziers and skulls: the arenas' set pieces;
- the troops: the unused class sheets.

The design's Orc kit, 20 images for the polish, as prompts. Each is drawn on the board's 64 x 32 isometric tile in the Craftpix pixel
style of the war camp land: a transparent background, a dark outline, and a light from the top left.

1. "Pixel-art isometric palisade wall segment, sharpened log stakes lashed with rope, 64 px tile footprint, about 80 px tall, warm brown wood, transparent background."
2. "Pixel-art isometric palisade corner post, a thicker log with a skull nailed on it, matching a log palisade, 64 px footprint, transparent background."
3. "Pixel-art isometric broken palisade: splintered stakes and a heap of logs and earth forming a ramp, 64 px footprint, transparent background."
4. "Seamless pixel-art texture, 32 x 32, vertical timber logs with rope bindings, for the side faces of an isometric wall column."
5. "Pixel-art isometric wooden gatehouse two tiles wide, log frame with a hide-covered roof and an orc skull banner, three states: whole, battered with arrows stuck in it, broken and hanging open; transparent background."
6. "Pixel-art wooden watchtower top platform with a hide roof and a ladder hole, for a raised isometric perch three tiles square, transparent background."
7. "Seamless pixel-art texture, 32 x 32, grey stone blocks with moss in the joints, for the side faces of a castle wall column."
8. "Pixel-art crenellation strip for the edge of an isometric stone wall-walk, grey merlons, one tile long, transparent background."
9. "Pixel-art isometric round stone corner tower top, three tiles square, crenellated, a brazier and an orc banner, transparent background."
10. "Pixel-art isometric iron portcullis gate in a grey stone wall, two tiles wide, three states: whole, dented and scorched, broken and bent; transparent background."
11. "Pixel-art orc keep hall, a big timber and stone longhall with bone decorations, about six by four isometric tiles of footprint, one sprite, transparent background."
12. "Pixel-art skull throne of black iron and bones for an orc warlord, isometric, one tile, transparent background."
13. "Pixel-art great orc war drum on a wooden frame with hide skin and bone beaters, isometric, a 4-frame beating sheet and a silenced (cut skin) frame, transparent background."
14. "Pixel-art isometric orc longhouse, three by two tiles, thatched hide roof and a log door, transparent background."
15. "Pixel-art tall orc war banner on a pole, red cloth with a black tusk sigil, isometric, transparent background."

## Questions for the owner

1. **The host's losses** run above the design's targets: 85% on Auto with the War Plan's flank, and 57% on Tactical. Should soldiers fall back on their own when badly
   hurt? Should the Acolytes' mend be stronger? Or are the targets to be eased?
2. **Storming a conquered hold again** waits for phase 2's weekly re-storm at Mythic. Phase 1 offers only the tribute. Is that right?
3. **The tribute is claimed on the army card**, not from a cart at camp. The cart needs a camp spot and art. Keep it on the card for now?
4. **The king's "everywhere" spells** reach only the fighters near the camera's middle on the field (a whole-field Meteor would be 200
   targets). Is that right?
5. **Music:** the assault plays the battle arrangement, then the boss arrangement once the throne's guard wakes. The design's own
   **siege** arrangement is not rendered yet (`npm run music`).

## The owner's confirmations (for later phases)

1. **The Beasts' hold** is an autumn moor that climbs to a snowbound den.
2. **The holds' working names are approved:**

   | Army | Hold |
   | --- | --- |
   | Undead | Barrow Necropolis |
   | Beasts | Howling Den |
   | Wildwood | Elder Root |
   | Labyrinth | Heart of the Maze |
   | Ogres | Bonefire Crag |
   | Infernal | Brimstone Gate |
   | Yokai | Moonlit Shrine |
   | Golems | Iron Foundry |

3. **The renderer work for the Orc art goes into 1b**, after 1a ships, so the owner's 13 sheets (on `art/assault-orc`) drop straight in. It
   is listed in section 1.2 of `docs/notes/assault-art-plan.md` on `claude/assault-art-plan`:
   - ground materials (256 px textures, each sampling a 4 x 4 block of tiles);
   - an edge and corner fringe pass for transitions;
   - a decal pass;
   - cliff faces drawn as lip, body and foot;
   - structure states;
   - a sheet cutter, `tools/assault/cut-sheets.py`;
   - about 45 Orc pieces from Chronos's iso kits (`little-town`, `src/renderer/art/iso/kits/orcs` and others), as the plan lists them.
