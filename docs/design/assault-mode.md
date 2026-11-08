# Conquest: the Assault on the Hold

This is a design for the owner to approve. This branch changes no game code. The owner's brief: once an army's ten stars are won,
the player storms that army's fortress to finish it off. The battle is fought on a huge map of its own, 100 x 100 tiles. The five heroes
each lead a platoon of ten soldiers who match them, 55 fighters in all, against 200 defenders in a real siege. Soldiers who fall are gone
for good and are bought and replaced with crowns. Heroes are only downed. The army's Dark Council defends the fortress, with the warchief
at its heart. The Orc Warband comes first.

The owner calls the mode **Assault** or **Conquest**. In the game's words, the player **assaults** (storms) a **hold**, and a hold that
falls is **conquered**. The Orc Warband's hold is **Bloodtusk Hold**.

I studied the existing code before designing:

- the board, heights, layouts and lands (`board.ts`, `layouts.ts`, `lands.ts`);
- the battle engine (`battle.ts`, `path.ts`), its tactics, formations and orders (`tactics.ts`, `formations.ts`, `orders.ts`);
- the armies, tiers and stars (`armies.ts`, `tiers.ts`, `docs/notes/army-stars.md`, `difficulty.md`);
- the Nemesis War, phases 1 to 4 (`nemesis.ts`, `council.ts`, `muster.ts`, `revenge.ts`, `duel.ts`);
- the Calamity's map engine (`tower.ts`, `calLand.ts`), the long map (`chain.ts`, `docs/notes/long-map.md`);
- the camp overlook's enemy camps (`SCOUT_CAMPS` in `src/render/overlookLayout.ts`);
- the board renderer (`boardView.ts`, `iso.ts`) and the sprite sheets in `src/art/units/`.

**Chronos Settlement's switched-off conquest** (`hpatter9/little-town`, `src/shared/sim/conquest/`, `data/troops.ts`) could not be read:
this session was not allowed to attach that repository. Nothing here is borrowed from it. The worker who builds phase 1 should read it
first and borrow its troop table and its army bookkeeping where they fit. That should change details, not the shape of this design.

---

## 0. The night we stormed Bloodtusk Hold

> Ten stars on the Orc Warband, and the army card turns over a new face: a red seal and the words **Assault Bloodtusk Hold**.
>
> The muster screen is a war table. Five banners stand at the Landing, our camp at the south corner of the map. Kwame the Knight has ten
> Shieldguard behind him, three of them Veterans from the drills. Asha the Wizard has ten Battlemages in grey. Rhys the Ranger is short
> two archers, so we pay 120 crowns to fill the ranks. The intelligence well lists 200 orcs. **Gash the Lieutenant** holds the Old
> Bridge. **Morrow** is not here: he is an Undead captain, and this is not his war. Sitting the throne on the mound at the centre, in his
> own black armour, is **Vorga Skullsplitter, Warchief of the Dark Council**. He came to hold the Tusk himself.
>
> We plan in three taps. Kwame and Asha go up the main road to the bridge. Rhys swings west to the ford, behind the burnt village.
> The Samurai and his Blades go east, to silence the war drum on the ridge. March.
>
> The camera drifts north over the Redwater. Gash's archers loose from the bridge barricade. Kwame's line locks into a Shield Wall and
> walks into it, and Asha's mages burn the barricade's back rank. The bridge falls in forty seconds. Gash flees, so Gash will be back,
> Humiliated. In the east, the Samurai's Blades reach the drum. Its beat stops, and the rumble of orc reinforcements from the north
> goes quiet with it.
>
> The palisade is the first wall. Archers on the earth bank behind it shoot down at us from three steps up. Rhys's archers duel them from
> the burnt village's roofs. We pick the South Gate. It takes Kwame's whole platoon and the King's Meteor to break, and we lose four
> Shieldguard there. The outer bailey is a maze of yurts and longhouses. The barracks empty when the alarm horn sounds, and it turns
> into a street fight.
>
> Then the stone wall: six steps of sheer grey, corner towers, and the Iron Gate. Our Queen Dragoon flies her lancers' captain onto the
> wall-walk and clears the gate tower. The gate breaks. Up the terraces of the mound, Vorga turns at half health into his second form.
> His bodyguard brutes shove Kwame off the terrace twice. Asha's last two mages stand on the stairs and pour fire into his scars.
>
> He falls. The war banner on the mound comes down, ours goes up, and every orc still standing breaks and runs for the North Gate.
> **Bloodtusk Hold is conquered.** Thirty-one of our fifty soldiers march home. Nineteen do not, and the platoon screen shows their
> empty places. The War News scrolls: *"The Warchief is slain at Bloodtusk Hold. The Orc Warband is broken. The Council's seat is
> empty."* Back at camp, the overlook's painting of the orc encampment smokes under a blue banner, and a cart of tribute will come each
> morning.

---

## 1. The fantasy and the core loop

### 1.1 What it is

Assault is the **endgame of each army**. The army runs are raids: fifteen waves on small boards. The Assault is the war's last battle:

- one long battle (12 minutes of battle time at most, 6 at double speed);
- one huge, hand-shaped map per army;
- a fortress to breach;
- the army's lords to kill.

The player's side has three layers:

- **The heroes** fight with their full kits, ultimates and talents, as now.
- **The platoons** are the new layer: bought, kept, lost and replaced.
- **The king** casts his spells and Decrees and blows the War Horn, as now.

The defenders are a garrison of 200, posted all over the map, led by the army's members of the Dark Council.

### 1.2 How it unlocks

- **The army's tenth star**: the Legendary star (`armyStars`, 10 of 10). The army card gets a second button beside Fight!:
  **Assault**. While the army has fewer than ten stars, it shows a sealed "Win all ten stars" plate.
- **The mode as a whole** opens with the first army to reach ten stars. A short scene plays at the war table: the scout reports that
  the Warband has withdrawn to its hold.
- **Platoons can be bought from then on** (the Barracks, section 6). Before that, nothing new appears on any screen. The mode does not
  touch the early game.

### 1.3 The loop

1. **Muster.** Fill the five platoons with crowns. Each platoon belongs to a hero of the party, not to a slot. Look at the hold's
   intelligence. Pick each platoon's approach, an opening order of one tap each.
2. **Assault.** One real-time battle. Select a platoon and tap the map to send it. Change formations and stances, cast spells, fire
   ultimates, break gates, kill officers. The heroes fight on their own, as always. The player directs the platoons.
3. **Settle**, win or lose:
   - **Losses are permanent.** Fallen soldiers leave their platoons.
   - **Survivors gain veterancy.**
   - **Heroes take XP** as from a boss wave.
   - **The War settles** as after a run (`noteWar`). Council members slain, maimed or fled are written in, and the hold's fight births
     nemeses by the same rules as an army run.
4. **Conquered**, on a win: see 1.4. A lost or abandoned assault keeps its survivors and costs nothing else. The hold stands
   at full strength for the next attempt (see question Q3).

### 1.4 What "finishing off" an army means

Recommendation (Q2): **the army breaks, but its content stays.**

- **The army card** shows **Conquered**: the red seal turns to our blue, a banner stands over the scene, and the troops on the card
  kneel (the idle frame dimmed, a still pose; no new art). Its waves, stars, tiers, chests and dailies all still play. The card
  calls them **"Remnants of the Orc Warband"**, so nothing a player is farming disappears.
- **The camp changes.**
  - The overlook's painting of that army's camp (`SCOUT_CAMPS.orcs`, the Siege encampment) gets the **conquered dressing**: our
    banner at its `boss` point, two smoke columns rising from its patrol points, and its patrol figures removed.
  - The camp's Hall of trophies hangs the hold's **war banner** (the trophy room, `painted-boss-trophies.md`).
  - Both are overlays on the existing paintings (section 9).
- **The War narrows.**
  - A conquered army's Council members slain in the assault die for good. Cheating death is off inside a conquest, but only on the
    winning attempt.
  - A member who fled lives on, Humiliated, as now (`revenge.ts`).
  - A conquered army no longer births nemeses, and the Council's Recruit draws only from unconquered armies. The Council shrinks as
    the player conquers, and the war comes to a point.
- **The last hold.**
  - The warchief may flee a fallen hold (Q1). If he does, he retreats to the strongest hold still standing.
  - Conquering the last hold ends the Dark Council: its seats burn, and the War ends with a scene.
  - That is the true endgame the owner asked for. It also gives the Last Stand and the Calamity a natural place to be retired or
    folded in (Q5).

### 1.5 Rewards

| What | When | Size (first numbers, the balance tool tunes them) |
| --- | --- | --- |
| **The Spoils of the Hold**: crowns | first conquest | 4,000 x (1 + 0.35 x army index) |
| **The Conquest chest**, a new chest above gold in the stash (`Meta.stash`, `rollChest` with milestone `conquest`) | first conquest | gold-chest contents x1.5, plus a guaranteed piece of hero gear when the `rollGear` hook is filled |
| **War Trophies**, the Council's currency (`council.ts`) | every assault | x2 the usual rate for each Council member slain at the hold (`TROPHIES` by rank) |
| **Tribute**: a cart at the camp each real day, claimed with a tap | every day after the conquest | 150 crowns a conquered army a day, x(1 + 0.15 x army index) |
| **The war banner**, a camp trophy | first conquest | one per army |
| **Hero XP** | every assault | each hero earns a boss wave's XP at the army's Legendary tier, x2 on a win |
| **Veterancy** | every assault | every surviving soldier gets +1 rank step, plus 1 for every 3 kills (section 6) |

Tribute pays for replacement soldiers over time. The loop closes: conquering feeds the next conquest.

**Storming it again** (Q4): a conquered hold can be stormed again once a week, as **"The Warband regroups"**. The garrison takes the
Mythic tier's multipliers. A win pays a Conquest chest at half size and keeps the tribute flowing. That makes the mode replayable at
level 100 without a new map.

---

## 2. The map

### 2.1 Generation versus hand-authoring

Recommendation: **hand-authored bones, seeded flesh.**

- **The blueprint is drawn by hand** for each army, as data (`src/sim/assault/maps/<army>.ts`). It holds:
  - **the zone stencil**: a 50 x 50 grid of characters, each covering 2 x 2 tiles, naming the zone (camp, river, ford, road,
    fields, ditch, bank, bailey, wall, mound, rear and so on);
  - **the structure stamps**: exact runs and footprints for palisades, stone walls, gates, towers, the keep, the longhouses and the
    drums;
  - **the posts**: named places where the garrison stands, each with its roster (section 4);
  - **the roads**.

  These decide the battle's tactics, so they must be the same every time. A player learns the hold.
- **The flesh is generated**, from a fixed seed per army (`mixSeed(ASSAULT_SALT, armyIndex)`; not the save's seed, so every player
  storms the same hold). The generator:
  - lays the land's relief (the board's own `relief()` noise, `easeRelief`) inside each zone, at the zone's height band;
  - scatters the land's grounds by zone (tall grass in the fields, shallows at the fords, coals at the forge);
  - places boulders, trees, bushes, the area's props and pieces at the zone's densities.

  It reuses `board.ts`'s pieces, so the land looks the way the current boards do.
- **Checks after building** (`fieldOk`, the big brother of `boardOk`):
  - every standable tile outside the walls is reachable from the Landing for a jump-1 walker;
  - the inner bailey is reachable only through the gates, by ladder or by air;
  - every post is reachable from its own side;
  - nothing is placed on a solid tile.

  A failed check means the blueprint is wrong. It is a test, never a re-roll at run time.

The whole map is about 10,000 `Tile`s (about 1 MB in memory). It is built in under 100 ms at the assault's start from the blueprint and
the seed, and **never saved**.

### 2.2 Coordinates

- `u` runs 0 to 99 and `v` runs 0 to 99, as the boards do. The isometric view puts (0, 0) at the top corner and (99, 99) at the bottom
  corner of the screen.
- The assault runs **up the phone**: from **the Landing** at the south corner (bottom of the screen, `u + v` near 198) to the **keep**
  at the centre (50, 50). Behind the keep is **the Warpath**, the orcs' rear, at the north corner (top of the screen).
- The **west and east corners** are the flanks.
- Below, "depth" is `u + v`: 0 is the north corner, 198 the south. "Across" is `u - v`: -99 is the west corner, +99 the east.

### 2.3 Bloodtusk Hold, the Orc Warband's map

The Orc Warband fights on the War Camp and Highlands lands. The map blends them: highland grass and crags in the outer zones, warcamp
mud, palisades and yurts nearer the hold. A new looks-only field, `Tile.land`, gives each tile its land's textures, so one board
can wear two skins.

From south to north:

**1. The Landing** (depth 176 to 198; our camp)

- A gentle slope of highland grass (height 0 to 1) with the paved road starting at the centre line.
- Our camp: the castle's banners, six tents (the `tent` piece, tinted blue), two campfires and the **rally flag**.
- Platoons deploy here: five 4 x 3 boxes, one per platoon, fanned along the road.
- Phase 2 adds the trebuchet park, a 4 x 4 pad.
- No foe is posted here, and foes never path into it while a platoon holds the rally flag (they stop at depth 170).

**2. The Redwater** (depth 140 to 148; the river)

- A river 3 to 5 tiles wide runs from the west corner to the east corner. Its `stream` tiles flow east, and it falls over a two-step
  ledge at across -70 (a `Fall`).
- Deep water in most places. It can be crossed at three points:
  - **The West Ford**, at across -50: shallows 4 wide. Tall reeds on the far bank hide an ambush (the existing `ambush` rule).
  - **The Old Bridge**, at across 0, on the road: planks 2 wide. The far end is a **barricade fort**: a palisade U with a 1-wide gap,
    two powder barrels and a lieutenant's post.
  - **The East Ford**, at across +45: shallows 2 wide, then a deep pool.
- Fliers cross anywhere.

**3. The Killing Fields** (depth 108 to 140; the rolling land)

- Hills up to height 4, by relief, eased so walkers can climb them.
- The road winds north to the South Gate.
- Set pieces:
  - **The West Watchtower** on a crag at (22, 92), a perch at height 6, reached by a ramp. It holds 4 archers and a grunt.
  - **The East Watchtower** on the ridge at (88, 30), the mirror of the west one.
  - **The burnt village** at across -35: ruined walls (`wall` tiles) and broken roofs. A shooter's cover, and a good place for our
    archers.
  - **The stake field** across the road at depth 120: the `spikes` hazard on a three-second clock. It is told before it strikes, as
    hazards are now, so a careful march goes round it.
  - **The wolf pens** under the East Watchtower: a fence ring with 8 war-wolves. They are loosed on the alarm.
  - **The lumber camp**: log piles (boulders), stumps (bushes) and 6 grunts.
  - Two tall-grass meadows, and a shrine on a knoll (the `shrine` ground): a place to heal mid-assault.
- **The three war drums** (section 5.4) stand here, on the west knoll, the east ridge and before the South Gate. Each has a guard.

**4. The Ditch and the Palisade** (the square ring `u, v` in 26 to 74, its edge)

- **The ditch**: a ring two tiles wide at height -2 below the land. Its floor is stakes (the `spikes` hazard, slower here), and it
  has ramps at the gates.
- **The earth bank** inside the ditch stands at +2.
- **The palisade** stands on the bank's outer edge: solid `wall` tiles with a timber skin. They block movement, and the bank's
  height lets orc archers shoot over them.
- The palisade is **breakable**, in segments of 3 tiles (section 5.1).
- Four gates:
  - **the South Gate** on the road: 2 wide, a wooden gatehouse flanked by two towers;
  - **the West and East Sally Ports**: 1 wide each. The orcs open them to sally out on the alarm, so they can be rushed while open;
  - **the North Gate**: the reinforcements' way in.

**5. The Outer Bailey** (between the palisade and the stone wall)

The orc town is a maze of lanes:

- tent rows (the warcamp's yurt boulders);
- three **longhouses** (the barracks: 3 x 2 solid footprints with a door tile; 14 orcs inside wake on the alarm);
- **the forge**: `coals` ground and an anvil;
- **the Bonefire**: a big campfire in a ring of skulls;
- **the training pit**: a sunken arena ring at height -1;
- the beast pens.

The lanes are 2 to 3 tiles wide. This is where formations matter: a Shield Wall holds a lane, and Skirmishers flow round the yurts.

**6. The Stone Wall** (the square ring `u, v` in 38 to 62)

- The **curtain wall**: 2 tiles thick, standing **+6 above the bailey**. That is above `CLIMB_MAX` (4), so no walker climbs it.
- The wall's top tiles are a **wall-walk**, standable and reached by stairs (`ramp` tiles) inside. Defenders stand on it with the full
  height bonus (`blowMult`, `shotReach`).
- **Four corner towers**: 3 x 3 perches at +8, each with 3 archers.
- **The Iron Gate** on the south side: 2 wide, a portcullis, the strongest structure on the map.
- A postern on the north side, 1 wide, opened for the reinforcements.
- The stone wall is **not breakable in phase 1**. In phase 2 it falls to the trebuchet and to powder kegs carried by sappers.

**7. The Keep and the Throne Mound** (the centre, `u, v` in 44 to 56)

- A stepped mound: terraces at +3, +5 and +7 above the inner bailey, joined by one broad staircase on the south face and a narrow one on
  the north.
- The top is **the Throne Mound**: an open 7 x 7 yard with:
  - the **keep's hall**, a big sprite on the mound's north half;
  - the skull throne;
  - braziers, and the war banner.
- The **lord of the hold** waits here with his bodyguard (section 4.3). The last fight is on a stage that looks like a stage.
- The terrace edges are cliffs of 2. Shoves knock fighters down the terraces, a falling blow (`settleFalls`).

**8. The Warpath** (depth 0 to 40; the rear)

- Highland crags, the orcs' reserve camp, cages, and a second, bigger Bonefire.
- **Reinforcements** gather here and march in by the North Gate (section 4.4).
- It is reachable round either flank, a long walk through the hills. Burning the reserve camp is a phase 2 objective.

**How alive it is**, so it reads as a place, not a puzzle:

- patrols walk set loops (two bands of six, between the watchtowers);
- smoke rises from the fires, and the forge glows;
- the drums beat, so the screen pulses gently in time when the camera is near them (reduced motion turns this off);
- banners move, and crows lift off as the camera passes (the overlook already has crows);
- the river flows and falls;
- the land's weather (`weatherOf`) plays.

The garrison is not frozen in rows. Idle orcs at the Bonefire and the training pit run their idle and attack frames at each other
(sparring), a looks-only loop on the renderer.

### 2.4 Reading it on a phone

The map is 100 x 100 tiles. At the game's tile size (64 x 32, `iso.ts`) it is 6,400 x 3,200 pixels plus heights. The usual board is
drawn at about 0.6.

- **The camera** pans with one finger and zooms with a pinch, from 0.08 (the whole hold) to 0.7 (close in).
  - A double tap on a platoon's portrait flies to it.
  - **Follow** keeps the selected hero centred until the player drags.
  - With nothing selected and no input for 6 seconds, the camera **drifts to the fiercest fight**: the most blows in the last
    3 seconds, in a 12 x 12 window. The view never cuts. It drifts at most 30 tiles a second.
- **Three levels of detail**, by zoom:
  - **Near** (0.35 and up): every fighter's sprite, damage numbers (heroes and named foes only), the full effects.
  - **Mid** (0.15 to 0.35): sprites drawn smaller, with no numbers. Troops' blows have no particles, only a flash.
  - **Far** (below 0.15): the map is one baked overview texture (1,024 px). Each platoon is a banner with its count ("7"), each foe
    post a red shield with its count, and each fighter a 3 px dot.
  - **The thresholds have hysteresis** (10%), so a pinch at the edge does not flicker between levels.
- **The minimap**: 104 x 104 px, top right, below the top bar.
  - It is drawn once from the map's heights and zones.
  - Platoon dots (blue), foe dots (red) and structures (gates turn grey when broken) are redrawn twice a second.
  - A tap on it moves the camera there. With a platoon selected, a long press sends that platoon there.
- **Upright only.** At 393 x 852 the battle view is 393 x about 560 between the top bar and the command bar. At 0.35 that shows about
  20 tiles across: a platoon and its fight, with room.

---

## 3. The forces

### 3.1 Platoons

- Each of the five heroes of the party leads **a platoon of up to 10 soldiers**: 55 fighters when every platoon is full.
- **The soldiers' kind follows their hero.** Archers get archers and mages get mages, as the owner asked.
- A platoon belongs to its **hero kind**. A hero swapped out of the party keeps its platoon in the Barracks, at no cost. A hero with no
  platoon can still march alone.
- There is **no rarity**, as with heroes (`no-rarity.md`). Every soldier costs the same.

### 3.2 The nine troop kinds

The kind comes from the hero's class trait and shot; the look comes from its origin. In order (`troopOf(heroKind)`):

1. An explicit override in the table, for the few heroes the rule misplaces.
2. A support (by `roleOf`), not a guardian or vanguard: **Acolytes**.
3. Guardian or Bulwark, or a melee Warden: **Shieldguard**.
4. Vanguard: **Lancers**.
5. Gunner, or a bullet shot: **Gunners**.
6. An arrow shot: **Archers**.
7. Any other shot (fire, bolt, curse, leaf): **Battlemages**.
8. Beast: **Beasts**.
9. Trickster or Assassin: **Skirmishers**.
10. Anything else: **Blades**.

The **look** changes for the Machine origin (the robot sheets) and the Undead origin (the skeleton sheets); the kind stays the same. All
nine kinds use **sheets already in `src/art/units/`**. The PixelLab class sheets `cls_*_1` have been unused since the Resonance repaint
gave those heroes `hero_res_*` sheets. They are the same classes in plainer kit, so they read at once as rank-and-file.

The stats below are base numbers at hero level 1. They scale with the hero's level (3.3). A soldier is about a third of a hero, with no
skills, only its kind's one trick.

| Kind | Sheet (alternative look) | hp | atk | def | range | move ms | atk ms | jump | Trick |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Shieldguard** | `cls_paladin_1` (machine: `robot_swordsman`; undead: `skeleton_warrior`) | 120 | 5 | 8 | 1 | 800 | 1200 | 2 | **Locked shields**: +2 AC while a platoon-mate stands beside it; blows at a structure x1.25 |
| **Blades** | `cls_barbarian_1` | 95 | 10 | 4 | 1 | 650 | 1000 | 2 | **Cleave**: every third blow splashes |
| **Lancers** | `hero_lancer` (undead: `skeleton_spearman`) | 105 | 9 | 5 | 2 | 700 | 1200 | 2 | **Brace**: the first blow on a charging foe x1.5; reach 2 over a friend |
| **Skirmishers** | `cls_illusionist_1` (machine: `robot_swordsman`; undead: `skeleton_warrior`) | 80 | 8 | 3 | 1 | 450 | 700 | 3 | **Flank**: they seek the side or back (`flankStep`) and climb well |
| **Archers** | `samurai_archer` (alternative `cls_ranger_1`) | 70 | 9 | 2 | 4 | 700 | 1400 | 2 | **Volley**: when 4 or more of the platoon loose together, +15% |
| **Gunners** | `cls_gunslinger_1` (machine: `robot_infantry`) | 70 | 13 | 2 | 5 | 750 | 2000 | 2 | **Pierce**: ignores 3 defence; x1.25 at a structure |
| **Battlemages** | `cls_warlock_1` (alternative `wanderer_mage`) | 60 | 11 | 1 | 3 | 750 | 1700 | 2 | **Splash**, at half the hero's share |
| **Acolytes** | `cls_cleric_1` | 75 | 4 | 3 | 2 | 700 | 1300 | 2 | **Mend**: each heals the most hurt friend within 2 for 4% a second, troops first |
| **Beasts** | `wolf_grey` (the Beastmaster's wolf) | 85 | 9 | 3 | 1 | 380 | 700 | 3 | **Pack**: +10% for each other Beast on the same foe, to +30% |

The first numbers come from the foes' scale (an Orc Grunt is about 1.5 of a Shieldguard at the Orcs' Normal). The balance tool sets them
for real (section 7.6).

**Every hero, by the rule above** (to check against the art: a hero should look like the leader of its platoon):

| Kind | Heroes |
| --- | --- |
| Shieldguard (13) | Knight, Peasant, Yamabushi Tengu, Paladin, Shambler (undead look), Mummy (undead), Kraken Mate, Juggernaut (machine), Blood Gargoyle, Geomancer, Bell Warden, Eclipse Sovereign, Worldroot |
| Blades (6) | Samurai, Ninja Monk, Samurai Commander, Barbarian, Tyrant, Vampire Lord |
| Lancers (4) | Lancer, Dread Pirate (undead), Queen Dragoon, Demon Swordsman |
| Skirmishers (9) | Kunoichi, Kitsune, Karasu Tengu, Illusionist, Mercenary, Buccaneer, Reaper (undead), Arc Blade (machine), Strigoi |
| Archers (3) | Archer, Ranger, Falconer |
| Gunners (4) | Gunslinger, Rifle Bot (machine), Siege Bot (machine), Dhampir |
| Battlemages (10) | Fire Wizard, Wanderer, Lightning Mage, Gorgon, Druid, Warlock, Time Witch, Great Sage, Hemomancer, Last Star |
| Acolytes (7) | Satyr, Cleric, Wolf Bard, High Priestess, War Drummer, Unburied Saint, Fateweaver |
| Beasts (3) | Werewolf, Minotaur, **Beastmaster** (an override: the rule makes him an Acolyte, but he calls wolves) |

Notes:

- Flying heroes (the Queen Dragoon, Karasu, the Reaper, the Strigoi, the Last Star) lead soldiers who walk. Only the hero flies, so
  the hero is the one sent onto the wall-walk (section 5).
- Before the sheets are committed to troops, check that no hero's alternative look still shows a `cls_*` sheet (the hero looks in
  `heroLooks.ts`, the classic-look option if there is one). If one does, take the next sheet listed.

### 3.3 How strong a soldier is

- A soldier's hp and attack are its kind's base times the **hero's level factor**: the same curve the hero's own base stats follow
  (`levels.ts`), applied to the base numbers above.
- **Veterancy** (6.3) multiplies on top.
- Origin traits that are passive stat bonuses (Knightly +5% health and the like) apply to the hero's own platoon at half strength.
- **Nothing else carries**: no gear, talents, runes, relics or hero skills.

So a platoon keeps pace with its hero without its own upgrade grind, and the main game's balance is untouched: troops exist only in
the Assault.

### 3.4 How a hero leads

- **The hero is the platoon's anchor.** Each soldier has a **slot** in the platoon's formation, an offset from the hero, turned to face
  the platoon's heading (3.5).
- Soldiers walk to their slots, and **engage** any foe that comes within their reach plus 2. They return to their slots when it is
  dead, or when they stray more than 6 tiles from the hero (the **leash**).
- **The hero fights by its own mind**, as now, with its full kit. Its walks are towards the order point, and it is leashed to stay
  within 4 tiles of it unless the order is Charge.
- **Leaderless**: while the hero is downed, the platoon holds its last order at -15% attack, and the slots close up on its
  middle.
- **A downed hero** lies where it fell.
  - Revive skills and the king's Resurrect lift it as now.
  - Otherwise, if at least 3 of its soldiers are alive, they **carry it back**: after 45 seconds it rises at the rally flag with 50%
    health.
  - With fewer than 3 soldiers left, it stays down until the battle ends.
  - **Heroes never die.** This is "downed as normal": a hero's fall here costs nothing after the battle.

### 3.5 Orders

The orders are **five verbs and a tap**. All of them are logged orders (`orders.ts`, new `Order` kinds), applied at the next tick, so
the assault replays.

| Order | How | What it does |
| --- | --- | --- |
| **Move** (attack-move) | select a platoon, tap the ground | The hero walks to the point and the soldiers follow in formation. They fight what they meet on the way. This is the default. |
| **Hold** | the Hold button | Stand here. Engage within reach plus 1. Shooters stay put. |
| **Charge** | the Charge button | Run at the nearest foe group, 20% faster for 6 s (the existing `CHARGE` edge, for this platoon only). Once a platoon. |
| **Fall back** | the Fall back button | Withdraw to the rally flag or to the nearest friendly platoon, whichever is nearer, at Shieldguard speed. Foes get no free blows. |
| **Assault** | select a platoon, tap a gate, a palisade segment, a drum or a tower | Strike the structure. Only the soldiers who can reach it strike; the shooters cover. |
| **Focus** | select a platoon, tap a foe | That foe first, then free again. |

**All** selects every platoon. Its Move fans them out round the point, each keeping its relative place.

**Formations, per platoon.** The four existing formations scale up. Their effects are those of `formations.ts`, read per platoon:

- **Shield Wall**: the slots are a line, two deep.
- **Spearhead**: a wedge with the hero at the tip.
- **Hollow Square**: the shooters and Acolytes in the middle.
- **Skirmish**: loose, one tile apart.

Each kind has a default (Shieldguard: Wall; Blades, Lancers, Beasts: Spearhead; Archers, Gunners, Battlemages: Skirmish; Acolytes:
Square). The player changes it with one tap on the formation chip, and the platoon reforms over a second or two.

**The opening plan.** On the muster screen, each platoon is given an **approach**: West Ford, Old Bridge or East Ford (the Orcs' three).
This is a Move order logged at tick 0, so the battle starts already moving, and a player who never touches the command bar still gets a
sensible assault.

**Auto.** As in the rest of the game, an **Auto** switch hands the platoons to the bot. It plays the plan, then pushes for the nearest
gate. It is good enough to win with a strong host, not good enough to win cheaply (section 7.6).

---

## 4. The enemy

### 4.1 The garrison: 200

The 200 are **posts**, not waves. Each post is a named place on the blueprint with a roster, a leader and a **state**:

| State | What the post does |
| --- | --- |
| **Posted** | Stands still or walks its loop. |
| **Alerted** | Fights anything within 8 tiles, and calls the posts within 12. |
| **Sallying** | Leaves its post to attack a target the hold's mind picks. |
| **Routed** | Runs for the keep, or for the North Gate once the lord has fallen. |

**The Orc garrison, by post** (grunts G, archers A, brutes B, war-wolves W; the leader in brackets):

| Zone | Post | Roster | Count |
| --- | --- | --- | --- |
| Killing Fields | Old Bridge barricade | 5G 3A (lieutenant) | 9 |
| | West Watchtower | 4A 1G | 5 |
| | East Watchtower | 4A 1G | 5 |
| | Patrols, two loops | 2 x (4G 2A) | 12 |
| | Wolf pens | 8W 2G | 10 |
| | Lumber camp | 6G | 6 |
| | Burnt village ambush (tall grass) | 6G | 6 |
| | War drums, three | 3 x (4G 2B) (a lieutenant each) | 21 |
| The Palisade | South Gate and its towers | 4G 4A 2B (captain) | 11 |
| | West and East Sally Ports | 2 x (3G 2A 1B) | 12 |
| | North Gate | 3G 1A | 4 |
| | The bank's archers | 12A, in four groups | 12 |
| Outer Bailey | Longhouses (the barracks) | 9G 5B | 14 |
| | The forge | 6B | 6 |
| | The Bonefire and the training pit | 6G 2B | 8 |
| | Beast pens | 6W | 6 |
| Stone Wall | Four corner towers | 4 x 3A | 12 |
| | Iron Gate | 3B 2G 1A (captain) | 7 |
| | Wall-walk | 4A | 4 |
| The Keep | The Throne Mound | 7B (bodyguard), 2 captains, **the lord** | 10 |
| The Warpath | Reinforcements, four bands | 4 x (3G 1A 1B) | 20 |
| | | **Total** | **200** |

- 180 stand on the map at the start, and 20 arrive as reinforcements.
- The war-wolves are a new foe entry drawn from the existing `wolf_black` sheet (the Beastmaster's black wolf), so no new art is needed.
- The leaders' places are filled from the Council (4.2). A place the Council cannot fill takes an **Orc Chieftain** (`orcChieftain`) at
  the officer's strength, as a nameless officer.

**Strength.** Every defender takes the army's **Legendary** tier multipliers (`TIERS[3]`), the army's `tierStart`, and the wave-8
multiplier as a fixed level. Then **one per-army factor**, `ASSAULT.foeShare`, sets each foe's hp and attack (first guess: 0.55 of a
wave foe's). This factor is the main dial of the whole mode (7.6). The officers and the lord use the boss walls (`mid`, `last`) and
their nemesis multipliers, as in a run.

### 4.2 The Council at its posts

The **army's own members** of the Dark Council are its home-army nemeses (`Nemesis.army === 'orcs'`). They take the leaders' places by
rank, mightiest first:

- **Lieutenants** take the outer posts: the Old Bridge first, then the three drums, then the watchtowers.
- **Captains** take the South Gate, the Iron Gate and the two places on the Throne Mound, in that order.

Each fights as it does in a run, with its traits, weaknesses, scars, trophies, taunts and fleeing (`Unit.nem`, `nemesisTraits.ts`).
Its post's soldiers are its **sworn band**:

- while it stands, they take its morale (4.5);
- when it falls, they waver;
- when it flees, they rout.

Members of other armies are not at the hold: they are with their own armies. The War News says so before the assault ("Morrow keeps to
the Barrow Downs").

**Taunts.** As the assault opens, the cut-in plays for the most notable Council member present (`tauntCut.ts`). Each captain who sees a
hero it has a score with taunts once, as the hero comes within 10 tiles.

**Duels** (phase 3): a Vain captain at the Iron Gate may call a champion out. The ring is fenced on the gate's courtyard (`duelRing.ts`
with a ring centred off the board's middle), and the rest of the battle carries on round it.

### 4.3 The lord of the hold

The keep is held by **the warchief, if one sits** (Q1). This is the recommendation:

- The warchief is the Council's single top seat, so he is the war's villain.
- He comes to defend whichever hold is stormed. That gives every assault the warchief "at its heart", as the brief asks.
- He fights as in the Muster (`muster.ts`): his own boss's second form at half health, or `CHIEF_PHASE`.

If no warchief sits, the hold's own lord holds the throne: the army's last boss (the **Orc Warlord**) at the Legendary wall.

The bodyguard of seven brutes holds the terraces. **The win is the lord's fall** (5.5).

### 4.4 Reinforcements

- While **any war drum still beats**, a band of 5 from the Warpath gathers every **90 seconds**, from 1:30. It enters by the North Gate
  and joins the post that has lost the most.
- Four bands at most: the 20 of the table.
- **Silencing all three drums stops them.** A band already marching still arrives.

### 4.5 The hold's mind

The hold's mind is cheap: one decision a second for the whole garrison.

- **The alarm** spreads from post to post (4.1). The palisade's posts sound the **great horn** when the first gate or segment is
  struck. Then:
  - the barracks empty;
  - the sally ports open;
  - the bank archers spread to the threatened side.
- **Sallies.** Once a second, the mind looks for a platoon that is alone (no friendly platoon within 8) and near a sally port. It sends
  the post with the most soldiers at it, at most one sally at a time. This punishes a platoon left behind, which is a tactic the player
  can read.
- **Morale** belongs to foes only. A post routs when it has lost 60% of its soldiers and its leader is down, or when its leader flees.
  Routed orcs run for the keep, or after the lord's fall for the North Gate. A routed orc caught still fights back. A rout feels like
  a win along the line without hiding the score.
- **The player's soldiers never rout.** The owner wants losses to be the player's choice of where to fight, not a morale roll.

---

## 5. The siege

### 5.1 Walls, gates and structures

Walls are made of two things the engine already has, plus one new thing:

| What | How it is built | What stops what |
| --- | --- | --- |
| **The stone wall** | **height**: a ridge 6 steps above the ground on both sides, its top standable (the wall-walk) | Walkers cannot climb it (`CLIMB_MAX` is 4). Fliers can. Defenders on top have the height bonus. |
| **The palisade** | **solid tiles** (`Tile.wall` with a timber skin), on the bank at +2 | Blocks walking and low shots. Archers on the bank shoot over it. |
| **Gates, palisade segments, drums, towers' hoardings** | the new thing: **structures** | |

**Structures** (`Fort` on the board, `Unit.fort` in the battle):

- A structure is a **still foe unit with a footprint**: one or more tiles, its hp, defence, and what it becomes when broken.
- It is targeted and struck through the ordinary pipeline (`hurt`), with every rider off: no lifesteal, no ailments, no XP, no mana,
  no crits.
- It takes **x1.25** from Shieldguard and Gunners, and **x1.5** from a hero whose class is Bulwark or whose shot is a bullet (the Siege
  Bot and the Juggernaut were made for this).
- **Broken**:
  - its tiles change: a gate's become passable floor at the passage's height; a palisade segment's become a rubble ramp from the ditch
    to the bank;
  - it sends a `breach` event, which the renderer swaps to the broken art and shakes.
- Units never pick structures by themselves. Only the **Assault** order (3.5) or a hero's own targeting with nothing else in reach
  does.

| Structure | hp (phase 1, before `foeShare`) | def | Footprint |
| --- | --- | --- | --- |
| Palisade segment | 1,600 | 6 | 3 tiles |
| Sally port | 2,400 | 8 | 1 |
| South Gate | 5,000 | 10 | 2 |
| North Gate | 3,000 | 8 | 2 |
| Iron Gate (portcullis) | 9,000 | 14 | 2 |
| War drum | 1,500 | 4 | 1 |

### 5.2 Breaching (by phase)

**Phase 1:**

- **Break the gates and palisade segments by hand.**
- **Fliers onto the wall-walk.** A flying hero ordered to Move onto the stone wall lands on the wall-walk. It fights the wall's archers
  and the gate tower's crew. A gate whose tower crew is dead **opens from inside** after 10 seconds: one of ours lifts the bar.
- **Powder barrels.** The bridge fort's barrels, and the barrels at the forge, blow as they do now (`blast`). Each also deals 2,000
  to a structure within a tile.

**Phase 2:**

- **Ladders.** A ladder kit bought at the muster (one a platoon, 100 crowns). The **Scale** order on a stone-wall tile puts it up in
  4 seconds, and that tile becomes a jump-1 ramp for both sides (a new `Tile.ladder`). Defenders push ladders down: a ladder has 600
  hp.
- **The ram.** A siege piece bought at the muster (400 crowns, lost if destroyed). Pushed by a platoon, it moves at Shieldguard speed
  and deals 600 to a gate every 2 s. Archers can burn it.
- **The trebuchet.** One a battle, set up at the Landing's park. The king calls a **volley** with a tap, like a spell: a 3 x 3 strike
  on any tile within 60 of the park, told 3 s before (the boss warnings' ground marks), every 45 s. It deals 3,000 to structures and
  breaks a 3-tile stretch of stone wall into a rubble ramp after **three** hits.
- **Sappers.** A platoon picks up a powder keg at the forge or the bridge and carries it at half speed. The **Plant** order drops it on
  a wall tile: a 5 s fuse, then it breaches 3 tiles. One keg at a time.

### 5.3 Towers

Towers are **perches** (`Tile.perch` with a `ramp`): height for shooters, and nothing else.

- **Clearing a tower** means killing its crew.
- A cleared tower can be **taken**: a platoon of shooters on it gets the height bonus against the defenders.
- Taking towers is how the player wins the archery duel at the walls, and why archers want the burnt village and the towers.

### 5.4 The war drums

The drums are the main objective in the Killing Fields. While a drum beats:

- foes within 8 tiles take **+10% attack** and stand firm (they cannot rout);
- reinforcements keep coming (4.4).

Each drum is a structure with a guard and a lieutenant's post. Silencing them is a choice: three detours away from the road for a
quieter assault, or straight at the gate against a growing garrison.

### 5.5 Winning, losing and the time limit

| Outcome | How |
| --- | --- |
| **Won** | The lord of the hold falls. His bodyguard and every other post rout. After 5 s of the rout, the battle ends and the hold is **Conquered**. The fleeing orcs do not need to be chased. |
| **Lost** | All five heroes are down at the same moment: the host breaks and falls back. |
| **Night falls** | **12:00 of battle time.** Treated as a withdrawal. |
| **Withdraw** | The pause menu's **Sound the retreat**, with a confirm. |

**A lost or withdrawn assault:**

- The soldiers still standing come home.
- The fallen are lost, as in every outcome.
- Council members slain stay slain, and those who fled are Humiliated: the War settles as after a lost run.
- Heroes take half the XP.
- Nothing else is lost.

**The time limit.** Twelve minutes of battle time is about six real minutes at the x2 speed (x1 and x2 only; section 7.2). It is long
enough for a full assault with detours, and short enough for a phone session. The clock shows from 3:00 left, and a horn sounds at
1:00.

---

## 6. The economy

### 6.1 Prices

| What | Price | Note |
| --- | --- | --- |
| A recruit, any kind | **60 crowns** | Flat price: no rarity, and troops scale with their hero, not with money. |
| A full platoon | 600 | |
| The whole host | 3,000 | About a Hard army clear's crowns plus a silver chest, at the point the tenth star is won. |
| Ladders, ram (phase 2) | 100, 400 | Per battle. Unused ones are refunded. |

- **Replenishing is buying.** The platoon screen's **Fill the ranks** buys every empty slot at once, at 60 each. The new soldiers
  are Recruits.
- **There is no upkeep.** The owner asked for "bought with crowns and replenished the same way". Upkeep would only be friction, and
  tribute already sets the pace.
- All prices are one table (`ASSAULT_PRICES`), so they are easy to retune.

### 6.2 Permanent losses

- A soldier is lost the moment it falls. A soldier hurt but standing comes home **at full health** (there are no troop wounds).
- The battle's result lists the fallen by platoon, with their ranks, so losing a Veteran stings and losing a Recruit does not.
- Acolytes and the heroes' heals are how a careful player keeps veterans alive. That is the point of the healer platoon.

### 6.3 Veterancy

Each soldier keeps a small count of **marks**:

- +1 for every assault survived;
- +1 for every 3 kills (structures count as 1 kill each);
- +2 for being part of a conquest.

| Rank | Marks | hp and attack | Shown as |
| --- | --- | --- | --- |
| Recruit | 0 | x1 | no pip |
| Blooded | 1 | x1.08 | one pip |
| Veteran | 3 | x1.16 | two pips |
| Elite | 6 | x1.25, and the kind's trick is stronger (+50% of its number) | a gold pip |

- The ranks are drawn as pips over each soldier on the platoon screen, and as a tiny gold glint on Elites in battle (Near detail only).
- **Phase 3: the Barracks**, a new castle building (`castle.ts`), raises the rank new recruits join at: Blooded at level 1, Veteran
  at level 3, for crowns and stones on the castle's usual curve. It is the money sink once all nine holds are conquered.

### 6.4 The save

```ts
/** Assault and Conquest (docs/design/assault-mode.md). Missing on an older save: nothing bought, nothing conquered. */
interface AssaultMeta {
  v: 1;
  /** Each platoon by its hero's kind: one entry a soldier, its marks (0 to 99). Length 0 to 10. */
  troops: Record<string, number[]>;
  /** Holds conquered: the day key of the first conquest, the tier it was won at (3 Legendary, 4 Mythic) and the wins since. */
  conquered: Record<string, { day: number; tier: number; wins: number }>;
  /** Attempts by army (the result screen's "Assault 3"). */
  tries: Record<string, number>;
  /** The day key tribute was last claimed. */
  tribute?: number;
  /** Phase 2: a battle in progress (its own slot holds the snapshot; this is its army and start). */
  live?: { army: string; seed: number; t0: number };
}
Meta.assault?: AssaultMeta
```

- `loadMeta` reads it defensively, as it reads `stash`:
  - platoons are cut to 10, and marks are clamped;
  - unknown hero kinds are kept (a later hero may come back), unknown armies dropped.
- An older save gets nothing. The mode opens on the next load if an army already has ten stars, and its scene plays then.
- **The battle in progress** (phase 2) is snapshotted every 20 s of battle time into its own slot (`legends.assault`): the `Battle`
  as plain data, plus the order log since. A reload restores the snapshot and replays at most 200 ticks.
- In phase 1 there is no snapshot. Closing the page mid-assault counts as a withdrawal on the next load: the soldiers lost up to the
  last result are lost; the others are kept. The phase-1 build keeps the platoons' losses written as they happen (each fall a small
  write to `Meta.assault`), so a closed page cannot undo a loss.

---

## 7. The engine

### 7.1 The problem in numbers

The current fight is built for 10 to 20 fighters on 88 tiles. Most of its costs grow with the board and the crowd:

| Cost today | Where | At 255 fighters on 10,000 tiles |
| --- | --- | --- |
| `walkFrom`: a full Dijkstra with an open list searched in a straight line (O(N²) in tiles) | each walk decision (`decide`, `firstStep`) | about 10⁸ operations a call. Impossible. |
| `unitAt`: a linear search of `b.units` | many times a decision | 255 per call, thousands of calls a tick |
| `b.units.filter(...)` for foes, friends and auras | several times a decision | O(n²) a tick: about 65,000 checks, tolerable but wasteful |
| One baked texture per board (`generateTexture`) | `boardView.ts` | a 6,400 x 3,400 texture: too big for a phone's GPU |

The rule of `CLAUDE.md` still holds, as does this one: **every existing fight plays out exactly as it does now.** All of the new
machinery is **behind `Battle.field`** (absent everywhere but the Assault). No existing function changes behaviour when it is absent.

### 7.2 The budget

**The target phone** is a mid-range phone of the last three years (a Pixel 6a or iPhone 11 class).

| Budget | Value |
| --- | --- |
| Frame rate | **60 fps** at Near detail, a 30 fps floor at Far |
| Simulation, mean per 100 ms tick | **3 ms or less** on the target phone; about 0.75 ms on the desktop Node bench (a 4x phone factor) |
| Simulation, worst tick | **8 ms or less** (a breach that rebuilds routes; the alarm) |
| Rendering | **10 ms or less** a frame at Near: the visible chunks, at most about 120 fighters in view, at most 64 live effects |
| Memory | **60 MB or less** of new textures: terrain chunks in a cache of 36, the overview 1,024 x 512, nine troop sheets |
| Start | **1.5 s or less** from March to the first frame: build the map, bake the overview, place 235 fighters |

- **Speed.** x1 and x2 only. x2 doubles the sim cost, to 6 ms a frame-second, which fits.
- **A Lite setting** (Settings, Battle detail) caps at 30 fps, drops shadows and idle animations off the camera's centre, and halves
  the effects pool. It is offered automatically if the first 10 s average under 40 fps.

**Phase 0 proves this budget before any content is built** (section 10).

### 7.3 How the simulation scales

1. **An occupancy grid.** `Battle.field.occ`, an `Int32Array` of the tile count, holds the unit id standing on each tile (-1 if
   none). It is kept by `stepTo`, `addUnit` and falls. Inside a field, `unitAt` reads it in O(1).
2. **Spatial buckets.** 8 x 8-tile buckets, each listing the living units in it, rebuilt each tick: 255 inserts. Targeting looks only
   at the buckets within reach plus 2. No decision scans `b.units` in a field.
3. **Routing at two levels.**
   - **Sectors.** The map is cut into 25 x 25 sectors of 4 x 4 tiles. A sector graph (625 nodes) links sectors that walkers of each
     **jump class** (1, 2, 3, 4 and fly) can pass between. It is rebuilt only when a structure breaks or a ladder goes up or down:
     about 1 ms each time.
   - **Long walks** are an A* over the sector graph, cached per (from-sector, to-sector, jump class) until the graph changes.
   - **Short walks** are the existing Dijkstra, **bounded** to a 16 x 16 window round the walker, with a binary heap (`walkNear` in
     `path.ts`). The heap pops the same order as the straight search: the lowest cost, ties by the lowest index. The window's target
     is the next sector on the long walk.
   - `walkFrom` itself is not changed. `walkNear` is new and used only in a field.
4. **Leaders walk; soldiers follow.**
   - Only the heroes, the foe posts' leaders, the named Council members and the routing foes run real walks: about 40 of 255.
   - Soldiers on both sides **steer to their slot**: a greedy step to the neighbour tile nearest the slot that `canStep` allows and
     nobody occupies (four checks).
   - A soldier with no free greedy step for 2 s asks for one bounded walk.
5. **Sleeping.**
   - A **Posted** foe whose post is not alerted does not decide at all. It runs only its idle loop, or its patrol step on the patrol's
     clock.
   - 180 of 200 defenders sleep at the start, and most of the hold sleeps until the player reaches it.
   - A post wakes on the alarm (4.5), or when a hero side's unit enters its 8-tile radius (checked per post once a second, through the
     buckets).
6. **Staggered decisions.** Decisions already wait for `busyUntil` (a fighter decides only when free). The field also spreads the
   once-a-second jobs (the hold's mind, post checks, the camera's "fiercest fight" stat) over the ten ticks of a second, by post id.
7. **Heroes keep their whole mind.** A hero in a field runs `decide` as now, but with the field's `unitAt`, buckets and `walkNear`.
   Their kits, ultimates, auras and statuses work unchanged. Each hero aura that scans `b.units` is called at most once a tick for each
   hero, so its O(n) cost is 5 x 255.

**The estimate** on the desktop bench (to be measured in phase 0):

| Work a tick | Cost |
| --- | --- |
| 255 bucket inserts | about 0.05 ms |
| About 30 free decisions, of which about 6 walk, at about 0.04 ms for each bounded walk | about 0.25 ms |
| Statuses, pending blows, hazards and the hold's tenth of a second | about 0.2 ms |
| **Total** | about **0.5 ms**, inside the 0.75 ms budget, with a breach's 1 ms sector rebuild as the worst tick |

### 7.4 How the renderer scales (`src/render/fieldView.ts`)

- **Terrain chunks.**
  - The map is baked into **100 chunks of 10 x 10 tiles**: each tile's columns, tops, grounds, pieces and low props, baked at 0.5
    resolution, as the existing big boards are (`generateTexture`, `resolution: 0.5`).
  - Chunks are baked **on demand**, as they come into view: at most two a frame. They are kept in an LRU of 36 (about 10 MB).
  - A chunk is re-baked when a structure on it breaks.
- **Tall things.** Trees, walls' crenellations, towers, gates, the keep's hall, drums and banners are sprites in the unit layer,
  depth-sorted with the fighters. Only those inside the view plus a margin are in the scene (manual culling, a check a frame against the
  chunk rectangle).
- **Fighters.**
  - Each fighter in view has its animated sprite (`unitView.ts`).
  - Out of view, it has none: its sprite is returned to a pool, its state is read again on re-entry, and it is not animated.
  - All nine troop sheets and the orc sheets are each a single base texture, so the sprites batch.
- **Effects.**
  - A pool of 64 (32 in Lite). Troops' blows get a flash and a sound only at Near.
  - Heroes' and named foes' blows keep the whole effects of `fx.ts`.
  - A structure breaking is always shown in full: a shake, dust, the swap.
- **The overview.**
  - Baked once at the start: one 1,024 x 512 texture of the whole map at Far detail.
  - At Far, the chunks are not drawn at all. The overview plus the banners and dots is the whole scene, about 60 draw calls.
- **Sound.** The existing `playEvents` with a distance cut. A blow more than 18 tiles from the camera's centre plays no cue. At most 8
  cues a tick.

### 7.5 Determinism

Everything the sim does in a field follows the existing rules:

- **No clock and no `Math.random`.** Blows draw from `b.rng`.
- **Side streams with their own salts.** The map's flesh draws from `mixSeed(ASSAULT_SALT, armyIndex)`. The garrison's small draws
  (which grunt is which, the patrols' phases) draw from `mixSeed(seed, GARRISON_SALT)`. A fight's other streams are untouched.
- **A fixed order.**
  - Units decide in id order.
  - Buckets list units in id order.
  - Sectors and posts are numbered by the blueprint.
  - No decision depends on the order of a `Map`'s or `Set`'s keys.
- **Plain arithmetic.** The sim takes no `Math.sin`, `Math.cos` or `Math.pow` with a non-integer power: they are not bit-identical
  between engines. The code already avoids them in the sim, and the field keeps to it.
- **Orders are logged.** Move, Hold, Charge, Fall back, Assault, Focus, Formation and (phase 2) Scale, Plant and Volley are new
  `Order` and `LogEntry` kinds, applied at the next tick (`applyOrders`). `replayLog` replays an assault from its seed, its muster and
  its log.

### 7.6 Tests and tools

**Tests** (`test/assault-*.test.ts`; each new rule gets one, as `CLAUDE.md` asks):

- **The map** (`assault-map`):
  - the Orc map is the same for its seed (a checksum of heights and grounds);
  - `fieldOk`: every outside tile is reachable from the Landing at jump 1, and the inner bailey is unreachable at jump 4 until a gate
    breaks, reachable after;
  - every post is reachable and stands on standable tiles;
  - the structure count and footprints match the blueprint.
- **The garrison** (`assault-garrison`):
  - exactly 200 defenders over the battle: 180 placed and 20 reinforcements;
  - post rosters as the table;
  - the Council fills posts by rank and Might; empty posts take Orc Chieftains;
  - the warchief holds the throne when he sits, and the Warlord when he does not;
  - members of other armies are absent.
- **The platoons** (`assault-platoons`):
  - every hero in `ALL_HEROES` maps to a troop kind whose sheet exists in `sheets.json`;
  - the overrides hold;
  - stats scale with the hero's level;
  - veterancy steps;
  - a platoon is never over 10.
- **The economy** (`assault-economy`):
  - buying takes crowns and stops at zero;
  - Fill the ranks costs 60 an empty slot;
  - the fallen are removed at settle on a win, a loss and a withdrawal;
  - a page closed mid-battle loses exactly the soldiers already fallen;
  - marks are paid;
  - tribute pays once a day;
  - the save round-trips, and an older save loads with no `assault`.
- **The siege** (`assault-siege`):
  - a structure struck to 0 opens its tiles and sends a `breach`;
  - riders are off on structures (no lifesteal, no XP);
  - a flier reaches the wall-walk and a walker cannot;
  - a gate opens from inside 10 s after its tower crew falls;
  - the drums' bonus and reinforcements stop when the drums are silenced.
- **The outcomes** (`assault-end`):
  - the lord's fall wins after the rout's 5 s;
  - five heroes down at once loses;
  - 12:00 is a withdrawal;
  - a downed hero rises at the rally flag after 45 s with 3 or more soldiers left, and not with 2.
- **Determinism** (`assault-replay`):
  - the same seed, muster and log give the same result and the same `b.rng`;
  - (phase 2) a snapshot plus the log since it equals straight play.
- **No change elsewhere** (`assault-isolation`):
  - a fixed army fight, a daily and a Calamity fight give the same results as before (a golden checksum of their battle logs taken on
    `main` before the merge);
  - `walkNear` gives the same walk as `walkFrom` inside its window.
- **The budget** (`assault-budget`), counted rather than timed, so CI cannot flake:
  - in a 60-second bot assault, bounded walks a tick average at most 8;
  - sector rebuilds equal the structures broken;
  - no tick decides more than 60 units.

**Tools:**

- **`npm run assault-bench`** plays a full bot assault headless and prints the mean, p95 and worst ms a tick, the walks a tick and
  the rebuilds. **`?bench=assault`** on the page does the same on a phone, with the frame time.
- **`npm run balance -- --assault orcs`** plays the party bot through the assault, with a full host at the army's Legendary-star level,
  in two styles: **Auto** (the plan only) and **Tactical** (the bot also silences the drums, sends its shooters to the towers and flies
  to the wall-walk). It reports wins, soldiers lost and time taken.

**The targets** for `foeShare`, the structures' hp and the troop stats:

- Auto wins 40 to 60% at the tenth star's level and loses 40 to 60% of the host.
- Tactical wins 75% or more and loses 25 to 40%.
- Tactics must be worth at least 20 points of win rate. If they are not, the mode is not tactical, and the drums and towers are
  retuned before the numbers are.

---

## 8. The UI (all of it built with the standard ornate menu)

Every new card, sheet and page is built with `ornateMenu`, `menuSection`, `menuPick`, `menuWell` and `menuFoot` (`src/ornateMenu.ts`).
Full pages say "‹ Back" and cards say "Close" (`docs/notes/ui-standard.md`). The in-battle bar is part of the battle HUD, as the
current command bar is (`battle-command-ui.md`), and its pop-ups are ornate cards.

### 8.1 The muster screen

A full page, from the army card's **Assault** button. Eyebrow "Conquest · Orc Warband", title **Bloodtusk Hold**, sub "200 defenders ·
the Warchief holds the throne".

- **Section "Your host"**: five `menuPick` rows, one a platoon:
  - the hero's face, its troop kind's icon (the kind sheet's idle frame), "7 / 10" and the rank pips;
  - on the right, **Fill · 180** when short (the crowns' cost), else a tick.
  - A tap opens the platoon card (8.2).
  - Under the rows: **Fill all the ranks · 540**.
- **Section "The plan"**:
  - a `menuWell` holding the hold's **map**: the overview texture, cropped to the Killing Fields and the river, with the three
    approaches drawn as dotted lines;
  - each platoon's banner sits on its approach. A tap on a banner moves it to the next approach.
  - A line under it reads: "Kwame and Asha take the Old Bridge. Rhys takes the West Ford. Natsu takes the East Ford."
- **Section "The hold"**:
  - a `menuWell` of intelligence: the posts by zone with their counts (the table of 4.1, short);
  - the Council's faces at their posts (each tap opens the existing nemesis card);
  - the lord's face and name;
  - a line on the drums: "Three war drums call reinforcements while they beat".
- **Footer**: "‹ Back", and the primary **March**, which shows the cost of what is unbought, if anything ("March · 2 platoons short").

### 8.2 The platoon card

A card, opened from a muster row or from the Barracks. Eyebrow "Platoon of Kwame the Knight", title **Shieldguard**, sub the kind's
one-line trick.

- **Section "The ranks"**: a 5 x 2 grid of soldier slots.
  - Each slot shows the kind's idle frame, its rank pips and its marks.
  - An empty slot is a dark outline with **Recruit · 60**. A tap buys one.
- **Section "In battle"**:
  - the kind's stats at the hero's current level (hp, attack, reach, speed), as the hero card shows them;
  - the default formation, as four `menuPick` chips: Wall, Spearhead, Square, Skirmish.
- **Footer**: "Close", and the primary **Fill the ranks · 180**.

### 8.3 The in-battle command bar (393 x 852)

From the top:

| Area | Height | What is in it |
| --- | --- | --- |
| **The top bar** | 44 px | the clock (from 3:00 left), "Foes 143 / 200", the drums' state (three small drum icons, struck through when silenced), speed (x1 / x2), pause |
| **The minimap** | 104 x 104 | top right, under the top bar |
| **The field** | the rest | |
| **The order row** | 44 px | shown while a platoon is selected: **Hold**, **Charge** (greyed once used), **Fall back**, the **formation** chip (its icon; a tap cycles) and **Follow** |
| **The platoon bar** | 76 px | five portraits, 60 px each, and an **All** chip (48 px) |
| **The king's spell row** | as now | the mana, the spells and the War Horn |

**The platoon bar.** Each portrait shows:

- the hero's face and health bar;
- the platoon's count, "7";
- a ring that fills with the ultimate's meter.

**The taps:**

- **A tap on a portrait selects** its platoon: it lifts and gains a gold rim, the camera eases to it, and the order row shows.
- **A tap on the ground** then sends it. A ring marks the point, a dotted path (the long walk's sectors) fades in for a second, and
  the selection stays.
- **A tap on a gate, segment, drum or tower** is an Assault; **on a foe**, a Focus.
- **Firing an ultimate**: today a tap on the portrait fires it, but here a tap selects. In the Assault, the **ultimate is a gem on the
  selected portrait's corner**: a tap on the gem fires it. A second tap on an already-selected portrait also fires it when the meter
  is full, so the old habit still works.
- **A double tap on a portrait** flies the camera to the hero. **A long press** opens its platoon card, read-only in battle (Close).
- A downed hero's portrait greys, with the 45 s count to its rise, and the platoon still takes orders, leaderless.

**The pause menu** is an ornate card: **Resume**, **Sound the retreat** (it asks to confirm), the settings' Battle detail (Full or
Lite), and Help.

**The result** is a full page (ornate):

- **Won**: "Bloodtusk Hold is conquered". **Lost**: "The host falls back".
- Sections:
  - **The host**: each platoon's survivors, fallen and promotions, with the fallen named by rank ("2 Veterans, 3 Recruits").
  - **The Council**: who fell, who fled, and the News lines.
  - **Spoils**.
- Footer: "‹ Back" (to the army card), and on a loss **Fill the ranks**.

Every screen is checked at 393 x 852, 360 x 780 and 412 x 915. At 360, the platoon bar's portraits shrink to 54 px, and the All chip
becomes an icon.

---

## 9. Art

**Reuse first.** Everything below that says "existing" is already in the repository.

**Phase 1: no new art.**

| Use | Art | Source |
| --- | --- | --- |
| The nine troop kinds | `cls_paladin_1`, `cls_barbarian_1`, `hero_lancer`, `cls_illusionist_1`, `samurai_archer`, `cls_gunslinger_1`, `cls_warlock_1`, `cls_cleric_1`, `wolf_grey`; looks `robot_swordsman`, `robot_infantry`, `skeleton_warrior`, `skeleton_spearman`, `skeleton_archer` | existing (`src/art/units/`) |
| Our side's mark on troops | a team ring under the feet (blue for us, red for them), as the selection ring is drawn | code (a ring, not a picture) |
| The orc garrison | `hk_orc_grunt`, `hk_orc_archer`, `hk_orc_brute`, `hk_orc_warlord`, the Chieftain (`hk_orc_brute`), war-wolves (`wolf_black`) | existing |
| Land | warcamp and highlands ground tops and sides, boulders (the palisade fences, the yurt), trees, tall grass, water, shallows, coals, bridge planks, ruined walls, barrels, the shrine | existing (`src/art/areas/`, `src/art/terrain/`) |
| Set pieces | `warGate`, `drum`, `tent`, `flag`, `campfire`, `skulls`, `brazier`, `lamp` (`roadArt.ts`) | existing |
| Icons | Advance, Charge and Hold from the painted deployment icons; troop kind icons are each sheet's idle frame | existing |
| Effects | the fx packs (`src/art/fx/`); dust and shake for a breach | existing |

**New art, counted exactly.** It should be drawn on the board's 64 x 32 tile in the Craftpix pixel style the land uses.

**Look first in `hpatter9/chronos-assets`** for: the Craftpix *Village Tileset for top-down defence*, *Medieval Field Work* (the
palisade fences already came from it), the *Free 2D Top-Down Pixel Dungeon* walls, and any fortress or castle tileset. I could not open
that repository in this session. **Only what the packs lack is made with PixelLab**, as the foes' remakes were (`docs/notes/art-cleanup.md`).
Copy only what is used into `src/art/assault/`, credit it in `CREDITS.md`, and never change the assets repository.

The Orc kit (`src/art/assault/orcs/`), phase 1 polish, 20 images:

| # | Image | States | Count |
| --- | --- | --- | --- |
| 1 | Palisade, a straight run | along u and along v (mirrors) | 1 |
| 2 | Palisade corner | | 1 |
| 3 | Palisade, broken (rubble) | | 1 |
| 4 | Timber skin for the palisade's column sides | | 1 |
| 5 | Wooden gatehouse, 2 tiles wide | whole, battered, broken | 3 |
| 6 | Wooden watchtower top (on a perch) | | 1 |
| 7 | Stone wall: side texture for the column renderer (stone blocks) | | 1 |
| 8 | Stone wall: crenellation strip for the wall-walk's edge | | 1 |
| 9 | Stone corner tower top (3 x 3) | | 1 |
| 10 | The Iron Gate with portcullis | whole, battered, broken | 3 |
| 11 | The keep's hall (about 6 x 4 tiles of footprint, one big sprite) | | 1 |
| 12 | The skull throne | | 1 |
| 13 | The great war drum | beating (4 frames, one sheet), silenced | 2 |
| 14 | Longhouse (3 x 2) | | 1 |
| 15 | The hold's war banner, big, on a pole | | 1 |
| | | **Total** | **20** |

**Phase 1 can ship before items 1 to 15 exist.** Phase 1's art gate is "playable": until they exist, the structures draw with
existing art:

- walls as stone-textured columns (the dungeon's stone sides);
- gates as `warGate` pieces;
- the keep as the `fortress` landmark;
- drums as the `drum` piece.

**Phase 2's siege art, 6 images:**

1. a ladder against a wall;
2. the ram (2 frames);
3. the trebuchet (6 frames, one sheet);
4. its stone;
5. a powder keg carried (a smaller barrel);
6. the Fall back order icon.

**The camp, no new art.** The conquered dressing on the overlook uses:

- the castle banner (`src/art/castle/`);
- the smoke from the fx pack;
- the existing camp painting with its patrols hidden.

The war banner trophy is the hold's banner (item 15) in the trophy frame.

**Each later army: 12 to 16 images.** Its own palisade or wall skin, its gates, its keep, its drum's equivalent and its banner. The
equivalents are:

- the Undead's bone bells;
- the Beasts' howling stones;
- the Wildwood's horn trees;
- the Labyrinth's gongs;
- the Ogres' bonefire totems;
- the Infernal's summoning circles;
- the Yokai's temple bells;
- the Golems' forge bellows.

**Music**: one new arrangement of the main theme, **siege** (`tools/epic-music/theme.mjs`), rendered offline and levelled to -18 LUFS.
The lord's fight uses the boss arrangement. The file is added to the service worker's `FILES` in `build.mjs`.

**Sound**, all existing:

- the gate struck: the existing heavy hit, lowered;
- the breach: the boulder fall;
- the great horn: the War Horn's call, lowered.

---

## 10. The phased build plan

The phases are sized as the expansion's were: **S** about a day of work, **M** two to four days, **L** a week.

### Phase 0: The engine spike · S

- **Plays as**: nothing visible. It proves the budget before content is built.
- **Builds**:
  - a generated 100 x 100 field (plain relief, a ring of height-6 walls with two gaps);
  - 55 hero-side and 200 foe-side dummy fighters with existing sheets;
  - the occupancy grid, buckets, sectors, `walkNear` and leaders-and-followers;
  - the chunked renderer with three levels of detail.
- **Files**:
  - `src/sim/assault/field.ts` (`FieldState`, occupancy, buckets);
  - `src/sim/assault/sectors.ts`;
  - `walkNear` in `src/sim/path.ts`;
  - `src/render/fieldView.ts`;
  - `tools/assault/bench.mjs`;
  - `?bench=assault` in `main.ts`.
- **Tests**: `walkNear` equals `walkFrom` inside its window; sector rebuilds follow breaks; the isolation goldens (7.6).
- **Gate**: the budget of 7.2 on the owner's phone.
  - If the sim is over budget, the field's sim moves into a Web Worker, and the renderer reads a copied state each tick and
    interpolates.
  - If it is still over, the map shrinks to 80 x 80.
  - Either way, the owner decides before phase 1.

### Phase 1: The Orc assault, playable · L

- **Plays as**: the whole loop for the Orc Warband:
  - unlock at ten stars; the muster, platoons and buying; the Orc map; the 200 at their posts, with alarms and sallies;
  - the Council at its posts and the lord on the throne;
  - Move, Hold, Charge, Fall back, Assault, Focus, formations and Auto;
  - gates and palisade broken by hand, fliers onto the wall-walk, the gate opened from inside, the barrels;
  - the three drums and the reinforcements; morale and routs;
  - heroes downed and carried back;
  - win, lose, night and retreat;
  - losses, marks and ranks; the Conquest chest, spoils, War Trophies and tribute; the army card's Conquered face.
- **Files**:
  - `src/sim/assault/blueprint.ts` (types, the stencil reader);
  - `src/sim/assault/maps/orcs.ts`;
  - `src/sim/assault/fieldMap.ts` (build and `fieldOk`);
  - `src/sim/assault/forts.ts` (structures and breaches);
  - `src/sim/assault/garrison.ts` (posts, the Council's places, reinforcements);
  - `src/sim/assault/holdMind.ts` (the alarm, sallies, morale);
  - `src/sim/assault/troops.ts` (kinds, `troopOf`, stats);
  - `src/sim/assault/platoons.ts` (slots, formations, the leash, orders);
  - `src/sim/assault/assault.ts` (`startAssault`, the end rules, `settleAssault`);
  - `src/sim/assault/economy.ts` (prices, buying, marks, tribute);
  - in `battle.ts`: `Battle.field` and its branch in `stepOnce`, `unitAt` and `decide`;
  - in `orders.ts`: the new orders;
  - `meta.ts`: `Meta.assault` and its reader;
  - `council.ts` / `revenge.ts`: conquest's rules (no cheat on a winning attempt, no Recruit from conquered armies);
  - `armyStars.ts`: the `conquest` chest;
  - `src/assaultView.ts`: the muster, the platoon card and the result;
  - `src/assaultHud.ts`: the command bar and the minimap;
  - `src/render/fieldView.ts`, finished;
  - `src/armiesView.ts`: the Assault button and the Conquered face;
  - `src/render/overlookLayout.ts` and the overlook: the conquered dressing;
  - `docs/notes/assault-1.md`.
- **Tests**: everything in 7.6 but the snapshot.
- **Tools**: `npm run balance -- --assault orcs`, run to the targets of 7.6.
- **Art**: none needed. The Orc kit (20 images) can land in this phase or straight after.
- **Rough size**: about 4,500 lines of code, 1,200 lines of tests.

### Phase 2: Siege works and the long night · M

- **Plays as**:
  - ladders, the ram, the trebuchet volley and sappers' kegs; stone walls that breach;
  - the Warpath's reserve camp, which can be burnt (an objective: it stops the reinforcements);
  - the battle snapshot and resume;
  - the weekly re-storm ("the Warband regroups") at Mythic.
- **Files**:
  - `src/sim/assault/siegeWorks.ts`;
  - `src/sim/assault/snapshot.ts`;
  - `Tile.ladder` in `board.ts`;
  - the order row's extra verbs;
  - `docs/notes/assault-2.md`.
- **Tests**:
  - ladders as ramps for both sides, and pushed down;
  - three trebuchet hits breach a wall, and the volley is told 3 s before;
  - a keg's fuse;
  - snapshot plus log equals straight play;
  - the weekly re-storm's clock reads the day key, never the clock.
- **Art**: the 6 siege images.

### Phase 3: Veterans, the Barracks and the War's answer · M

- **Plays as**:
  - the Barracks building;
  - Elite tricks;
  - the Vain captain's duel at the Iron Gate;
  - taunts as heroes approach;
  - the warchief's flight to the strongest standing hold (if Q1 says so);
  - the News's conquest lines;
  - a codex page for each hold.
- **Files**: `castle.ts` (the Barracks), `src/sim/assault/warAnswer.ts`, `duelRing.ts` (a ring off the middle), `nemesisLines.ts`
  (conquest lines).
- **Tests**:
  - Barracks levels set recruits' ranks;
  - the duel ring off-centre;
  - the warchief's retreat picks the strongest hold;
  - the Council's Recruit skips conquered armies.

### Phase 4: The other holds · L, about M for each pair

Two armies a batch, each with its blueprint, its kit's 12 to 16 images, its objective's equivalent of the drums and its post table:

1. the Undead (the Barrow Downs, a necropolis);
2. the Beasts (a frozen den);
3. the Wildwood and the Labyrinth;
4. the Ogres and the Infernal;
5. the Yokai and the Golems.

Each batch ships with its map test and its balance run.

### Phase 5: The Last Hold and the War's end · M

- **Plays as**:
  - the last standing hold, where the warchief makes his last stand with every Council member left: the whole Council defends;
  - its fall ends the Dark Council, with a scene;
  - a new game-plus seed for the War (if the owner wants one).
- **The old modes**: this is where the Last Stand and the Calamity are retired or folded in, if the owner still wishes it (Q5).

---

## 11. Open questions for the owner

Each question has a recommendation; the design above follows it.

1. **Who holds the keep?**
   - Recommendation: **the warchief rides to defend whichever hold is stormed**, so every assault ends with the War's villain.
   - If no warchief sits, the army's own lord (the Orc Warlord) holds it.
   - The alternative: only the army's own lord holds it, and the warchief only his home army's hold.
2. **What does a conquered army become?**
   - Recommendation: its card says **Conquered**, and its waves, stars and chests stay playable as "Remnants".
   - It stops birthing nemeses and pays **daily tribute**, and the camp shows our banner over its camp.
   - The alternative: the army is removed from the carousel.
3. **Does a failed assault wear the hold down?**
   - Recommendation: **no, not in phase 1.** Every attempt faces the full 200, simple and fair; the Council's losses still count.
   - A "long siege" (dead orcs stay dead, the hold musters back a quarter a day) could come later, if wanted.
4. **Prices and replay.**
   - Recommendation: **60 crowns a recruit, no upkeep**, tribute of 150 a conquered army a day.
   - A conquered hold can be **re-stormed once a week at Mythic** for half a Conquest chest.
5. **The Last Stand and the Calamity.**
   - Recommendation: **leave both as they are until four holds are built** (phase 4, second batch). Then decide with the Assault in
     hand.
   - The Last Hold (phase 5) is the natural place to retire them: the Last Stand's "guard the ruler" could become its prologue.

---

*Prepared on branch `claude/assault-design`. No game code was changed.*
