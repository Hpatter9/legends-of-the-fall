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

**1b (next)** is the siege tools and the reactive enemy:

- the ram for the gates;
- ladders onto the stone wall;
- fire arrows (burning huts: smoke and panic);
- archers suppressing the wall-top shooters;
- defenders reinforcing the threatened gate, so a feint can open another;
- the warchief and captains sallying out;
- wolf riders flanking;
- reinforcements down the Warpath until it is held.

Already in from the design, partly reactive: the great horn opens the sally ports and wakes the barracks, one sally at a time goes at a
platoon alone, the bank's archers shift to the side struck, and reinforcements come while the drums beat.

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
