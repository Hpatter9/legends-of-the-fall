# Depth: six ideas, one design (DEPTH-DESIGN)

The owner approved six depth ideas (numbers 3 to 8 of the list) and asked for one design that covers them all, for approval before any
code is written. Nothing in the game changes on this branch. Each idea has its own section: how it plays, the data and saves, the page
on an upright phone, the balance approach, the art it needs, a build plan in batches with tests, and questions with a recommendation
for each (also published as a phone page: https://claude.ai/artifact/DYLQQv9DQaJFvgKoRDBBvY). The last sections give the order across all six, where they touch the two designs being written at the same time (gear,
runes and the economy; formations and tactics) and every question in one list.

Two rules hold throughout:

- **Options, not stats.** Each idea adds a choice, a piece of knowledge or a story. Where a reward is power, it is small and is
  measured against the owner's pace before it ships.
- **The simulation stays deterministic.** Anything that changes a fight is fixed when the fight starts (like `applyTraits`), read from
  a snapshot the run took at its start (as `newRun` already does for the castle), and any new randomness takes its own side stream
  (`new Rng(mixSeed(seed, <salt>))`), so every existing fight plays out as it does now.

**The owner's pace** (what "re-measured" means below): Normal of each army is for its level (1, 5, 8, 12 ... 32); a favourite hero is
level 30 about day 4, 45 about day 43, 65 about day 95, 100 about day 164 (`npm run level-pace`); the final armies are not clearable
before all the first army's stars (`army-pace.md`); Mythic at level 100 is 3 to 4 tries on the last armies (`difficulty.md`); the
Calamity's greedy bot fells each map's boss at about 84 / 83 / 65 / 45 / 35 / 16% (`calamity.md`). Every batch that touches a fight or a
reward re-runs the tool that owns the number and keeps it in its band, or reports the change to the owner.

---

## 3. Castle buildings that unlock options

### How it plays

Today the castle is six levelled buildings that each add a number (Treasury gold, Barracks hp, Armoury attack and repair cost, Stable
move speed, Library XP and study, Mage Tower mana and spells) and the Chapel, bought once, which opens the spellbook. The builders do
one job at a time (`castle-build-time.md`).

The castle keeps every number it has. On top, **certain levels open a room**: a new thing the player can do, or a choice the player
makes, shown on the building's card as a locked row until that level stands. Rooms are the doors to most of the other five ideas, so
the castle becomes the place where depth is unlocked.

| Building | Level | Room | What it lets you do |
|---|---|---|---|
| **Smithy** (new, 3 levels) | 1 | Field Anvil | Mend worn gear at the army's mid-boss camp, between waves, at the stall's price. Today a piece can only be mended at the stall, between runs. |
| | 2 | Patchwork | A broken piece keeps half its strength until mended (today a broken piece gives nothing). |
| | 3 | Master's Mark | Choose one hero each run whose gear does not wear. |
| **Library** | 2 | Reading Room | Each student can queue a second book; it starts when the first is learnt. |
| | 4 | Archive | Boss pages: each boss weakness clue found is written in full at once (see 7). |
| | 5 | Scriptorium | Read a book to a hero of another calling at three quarters of its strength (one such book per hero). |
| **Chapel** (now levelled, 3 levels; level 1 is today's Chapel) | 2 | Vigil | When a heart burns, choose how the party rises: Shielded (a shield of 15% health), Swift (haste 4 s) or Cleansed (every ailment gone). One choice a run, set on the march card. |
| | 3 | Last Rites | Once a run, the first hero to fall in a wave rises at a quarter of health after 5 s. |
| **Watchtower** (new, 3 levels) | 1 | Lookout | Opens the march card's modifiers (see 5): Scouted run. |
| | 2 | Night Watch | Opens Night march. |
| | 3 | Far Sight | Opens routes on the march card, and the short card after each wave names the next wave's foes. |
| **Barracks** | 3 | Sparring Yard | Two heroes spar while you are away for bond points (see 4); a timer, like study. |
| **Hall of Legends** (new, 4 levels) | 1-4 | Mentor seats | One seat per level, one per calling: where retired heroes mentor (see 8). |
| **Mage Tower** | 3 | Spell Lectern | Carry a spare spell into an army run and swap it into the loadout at the mid-boss camp (within the power budget). |

The Treasury and Stable get no room in the first pass: their numbers are what they are for.

### Data and saves

- `BuildingId` gains `smithy`, `watchtower` and `hall`. `readCastle` already loops over `BUILDING_IDS` and defaults a missing id to 0, so
  old saves load with the new buildings unbuilt. `BUILD_MS` gives their times (the same table).
- The Chapel becomes a levelled building: `chapel: true` in an old save reads as Chapel level 1. `Meta.chapel` stays as a read alias for
  one release, then is folded into `Meta.castle.chapel`. `spellsOpen` reads level 1 or more.
- `ROOMS` (new, `src/sim/rooms.ts`, pure data): `{ id, building, level, name, line }`. `roomOpen(castle, id)` is the only question the
  rest of the game asks, so a room can move level with one line.
- Choices a room makes are kept per run in `Run.orders` (see 5), never in the castle: the castle is a snapshot at run start, as now.
- Master's Mark and Sparring Yard keep `Meta.sparring?: { a, b, doneAt }` and `Run.orders.marked?: string`.

### The page (upright phone)

- The building card in the courtyard gets a **Rooms** strip under the level bar: one row per room, an icon, its name, its one line,
  and "Level 3" in stone grey while locked, lit when open. At 360 px the strip is one column; a long line wraps.
- A room that opens plays the build flourish the courtyard already has, then a toast: "The Smithy's Field Anvil is open".
- Three new plots in the courtyard (Smithy, Watchtower, Hall of Legends). The yard is planned on tiles with a fixed footprint per
  plot and a grass gap between plots (`castleSpots.ts`, a test keeps it); the plan has room on the north and east of the square,
  inside the wall, and each must be checked whole at 360, 393 and 412 px, as the current plots are.

### Balance

- Most rooms are convenience or choice and add no power. Three do add some: Patchwork, Last Rites and Master's Mark. They are measured
  with `node tools/army-pace/run.mjs` on the climb's castle (the tool already builds the castle a player has at each level) with and
  without the room. The bar: no army's mean tries at its level falls by more than one, and Mythic at 100 stays 3 to 4 tries.
- The spire and the Calamity start heroes at level 1 with nothing worn, and their foes answer the castle (`CASTLE_ANSWER`). Rooms do not
  enter those modes, except the Chapel's Vigil and the Library's Archive, which are knowledge or a choice, not strength.

### Art

- Three buildings from Chronos's isometric kits (the ones the courtyard already uses): the Dwarves' forge for the Smithy, the Knights'
  watchtower, and a hall with columns (the Knights' or Elves' kit). Copied to `src/art/`, credited in `CREDITS.md`. If a kit lacks a
  piece, PixelLab with kit pieces as style references, as the fountain was made.
- One small icon per room (16 to 24 px) from the packs' item and UI sheets: anvil, book stack, candle, eye, crossed swords, laurel.

### Build plan

1. **Rooms framework.** `rooms.ts`, `roomOpen`, the Rooms strip on the cards, the Chapel levelled (with the save fold). No room does
   anything yet. Tests: `test/rooms.test.ts` (every room names a real building and a reachable level; `roomOpen` at each level), a save
   from before loads with the Chapel at level 1 and the new buildings at 0.
2. **New plots.** The three buildings in the courtyard. Tests: the plot spacing test, shots at the three phone sizes.
3. **Smithy and Library rooms.** Field Anvil (a mend step on the mid-boss camp), Patchwork (the wear rule), Master's Mark, Reading Room,
   Scriptorium. Tests: wear with and without Patchwork, a queued book starts when the first is learnt, a cross-calling book at 0.75.
4. **Chapel and Mage Tower rooms.** Vigil, Last Rites, Spell Lectern. Tests: a heart burns with each Vigil choice; Last Rites fires once a
   run and is deterministic; the spare spell swaps in only at the mid-boss camp and within the budget. Re-measure with the army pace tool.
5. Watchtower, Sparring Yard and Hall of Legends get their rooms in the batches of 5, 4 and 8.

### Questions

- **Q3.1** Three new buildings, or fold the Smithy into the Armoury and the Watchtower into the Stable? *Recommendation:* three new
  buildings. The courtyard has room, and a new building is a clearer "this opens something" than a sixth level of the Armoury.
- **Q3.2** Should the Chapel become levelled? *Recommendation:* yes; it is the owner's own example (revives) and today it is a single
  purchase that only opens the spellbook.
- **Q3.3** Rooms only at fixed levels, or one room of two to choose per building? *Recommendation:* fixed. A choice per building is more
  to explain and is better spent on the march card (5), which is chosen fresh each run.

---

## 4. Hero bonds and rivalries

### How it plays

- **Bonds.** Two heroes earn **bond points** each time they are both placed in a wave that is won. At thresholds the pair reaches bond
  levels 1 to 5. A bond level gives a small reward when both are on the board, and levels 1, 3 and 5 play a **short scene** (three to six
  lines, the cinematics' `sceneKit`: two heroes, a place, a few spoken lines) the next time the player is at the castle or the camp.
- **Not every pair bonds alike.** Any pair can reach level 2 ("Comrades"). Levels 3 to 5 are for **kindred pairs**: about forty pairs
  written by hand from the heroes' stories (`codexLore.ts`) and the existing duo combos (Knight and Peasant, Samurai and Kunoichi,
  Paladin and Cleric ...). Kindred pairs are the ones that have scenes.
- **Rivals.** About fifteen pairs are **rivals** from the start (written from the stories: the Samurai Commander and the Mercenary, the
  Wizard and the Warlock ...). Fielding rivals together carries a penalty: while they stand within two tiles of each other, both charge
  their skills 10% slower. A rival who sees the other fall fights 10% harder for the rest of the wave. The penalty is shown on the deploy
  board before Fight.
- **Settling a rivalry.** Rivals who win ten waves together play a scene and become a kindred pair at bond level 1, with their own
  later scenes. So a rivalry is a cost now for a story later, and the player chooses when to pay it.

| Bond level | Points | Name | Reward when both are placed |
|---|---|---|---|
| 1 | 10 | Acquainted | A gold thread between them on the deploy board |
| 2 | 40 | Comrades | +3% attack while within two tiles of each other |
| 3 | 120 | Sworn (kindred only) | Covering: once a wave, when one would fall, the other's guard takes 20% of that blow |
| 4 | 300 | Shieldmates (kindred only) | +3% more (6% in all); the pair's skills charge 5% faster while together |
| 5 | 600 | Bound (kindred only) | A title on both cards ("The Dawn Pair") and the pair's portrait frame; no more power |

A point a won wave, so level 2 takes a few runs and level 5 about two months of one pair playing together, on the pace of level 65.

### Data and saves

- `Meta.bonds?: Record<string, number>` keyed by the two kinds in alphabetical order (`"knight|peasant"`). `Meta.bondScenes?: string[]`
  for scenes seen. Both optional; missing is no bonds.
- `src/sim/bonds.ts` (pure): `KINDRED` and `RIVALS` lists, `bondLevel(points, kindred)`, `noteBonds(meta, battle)` (from `settleRun`, as
  `noteFoes` is), `applyBonds(b, snapshot)` at fight start, fixed into `b.bonds`, read by small hooks (attack, charge, the cover).
- The run takes a snapshot of the bond levels at its start (`Run.bonds`), as it does the castle, so a run's fights stay the same.
- Bonds count in the armies and the Last Stand. They do not count in the daily (everyone plays the same five), the spire or the
  Calamity (which start bare). Bond points are earned only where bonds count.
- Sparring Yard (Barracks room): `Meta.sparring` sets two heroes to spar for 8 hours for 5 points, one pair at a time.

### The page

- **Hero sheet:** a Bonds row under the stats: the hero's three strongest partners as small portraits with their level pips, a red
  crossed-swords badge on rivals. Tap opens the Bonds list: every partner with points, kindred pairs marked with a laurel, the next
  scene's level. One column at 360 px.
- **Deploy board:** a thin gold thread between bonded heroes placed within two tiles (level 2 and up), a small red spark between rivals in
  range. Steady, not pulsing. The trait strip above the bench gets a "Bonds" chip with the active pairs.
- **After a run:** the recap's XP rows add "Knight and Peasant: Comrades → Sworn" when a level rises.
- **Scenes:** played from the castle or camp with the cinematics player, skippable, kept to replay in the Codex's Heroes tab.
- **Tavern:** a bonded pair at level 3 or more sit together (the tavern gives each hero a fixed spot; a pair's spots can be swapped by a
  rule in `tavernLife.ts`).

### Balance

- Level 2 is the only bond reward any pair can reach, and +3% within two tiles is half the smallest trait bonus. Levels 3 and 4 add up to
  6% attack, 5% charge and the cover for one pair at a time in practice.
- Measured with the army pace tool: the recruits' party with their natural kindred pairs (Knight and Paladin, Paladin and Cleric) at
  bond level 0 against level 4. The bar: no army's mean tries at its level falls by more than one; if it does, the cover goes first.
- Rivals: measured the other way (the penalty must not make a rival pair unplayable: at most one try more).

### Art

- None for the sim. The thread and spark are drawn lines and a tiny sprite from the packs' spark sheets. The laurel, crossed swords and
  heart-link icons from the packs' UI sheets. Scenes use the heroes' own sprites and the existing scene backdrops (camp, courtyard,
  tavern). The portrait frame for "Bound" from the packs' frame sheet, tinted.
- The scenes' words: about 40 kindred pairs x 3 scenes + 15 settling scenes = 135 short scenes. That is the large cost, see Q4.2.

### Build plan

1. **Rules.** `bonds.ts`, points from `settleRun`, the snapshot, levels, the attack and charge hooks, the cover. Tests: points only on a
  won wave with both placed; the key is order-free; the cover once a wave; old saves; determinism (the same seed with the same bonds
  plays the same).
2. **Rivals.** The penalty, the fury, settling. Tests: the penalty only within two tiles; settling at ten wins turns a rival kindred.
3. **Pages.** Hero sheet row, Bonds list, deploy thread and spark, recap line. Shots at 393, 360, 412.
4. **Scenes.** The first ten kindred pairs and five rivalries written and wired, then the rest in batches of ten. Test: every scene names
  real heroes and a real backdrop.
5. **Sparring Yard** and the tavern seating.

### Questions

- **Q4.1** Is a small power reward right, or should bonds be story only? *Recommendation:* small power to level 4, as in the table, so
  players notice bonds on the board; nothing past it.
- **Q4.2** Who writes 135 scenes? *Recommendation:* a worker drafts them in batches of ten in the heroes' existing voices for the owner to
  read; ship the first ten pairs and grow.
- **Q4.3** May a rivalry be settled, or are rivals rivals for ever? *Recommendation:* settled at ten wins: it turns a penalty into a goal.

---

## 5. Army run choices before a run

### How it plays

After the tier is picked and Fight is tapped, a **March orders** card comes up before the first wave: one **modifier** (or none) and,
once the Watchtower allows, one **route**. The card is quick: three to five tiles, a default of "Plain march" already chosen, and Fight
again. A run keeps its orders to the end and the top bar shows them as a small badge.

| Modifier | Opens | What changes | Reward |
|---|---|---|---|
| Plain march | always | nothing | as now |
| **Cursed** | army cleared once at the tier | foes +20% health, one heart instead of two, and a curse drawn from three (no shop at the mid-boss; healing halved; the boss keeps its second form at 65%) | crowns and XP x1.4, one extra chest roll at the end, a "cursed" laurel on the army card when cleared |
| **Scouted** | Watchtower 1 | the final boss is shown before wave 1 with its two signature attacks and its weakness (see 7); every wave's foes are shown before it | crowns x0.9 (the scouts are paid) |
| **Night march** | Watchtower 2 | the fight is at night: every shot's reach is one less unless the shooter stands on height 2 or more; Tricksters and Yokai act 10% faster; foes that heal heal half | night drops: one moonlit chest roll on a clear |
| **Forced march** | army cleared at the tier | waves 4, 6, 11 and 13 are skipped (their gold is not paid) | XP x0.8, crowns as a full run, for a shorter run on a short break |

**Routes** (Watchtower 3): two roads per army, named by its land ("the high pass", "the river ford"). A route picks the battlefield
shapes (`layoutFor`) its waves draw from: the high pass draws hills, passes and ravines, the ford draws rivers and islands. It does not
change the foes. So a ranged party picks heights, a party that dislikes water avoids the ford.

### Data and saves

- `Run.orders?: { mod?: 'cursed' | 'scouted' | 'night' | 'forced'; curse?: string; route?: string; vigil?: string; marked?: string }`.
  Optional; missing is a plain march, so every saved run loads as it was.
- `src/sim/orders.ts` already exists for another purpose; the new file is `src/sim/march.ts` (pure): the modifiers' table, `marchOpen(meta,
  army, tier)`, `marchBoost(orders)` applied in `waveBoost`, `marchReward(orders)` applied where the run pays.
- The curse is drawn from the run's seed by its own side stream (`mixSeed(seed, 0x6d61)`), so the fights themselves draw the same as a
  plain march with the same boost.
- Night march's reach rule is one check in `shotReach` reading a flag fixed at fight start (`b.night`). The weather today is looks only
  (`weatherOf`); night stays a look too, plus that one rule.
- `ArmyRecord.cursed?: number[]` (the tiers cleared cursed) for the laurel.

### The page

- **March orders card:** a sheet that rises from the bottom over the army card: a title ("March orders · Orc Warband · Hard"), a row of
  modifier tiles (two columns at 360 px, three at 412), each with its icon, name and one line of cost and reward; under them, when open,
  two route tiles with a small strip of the land. The chosen tile has a gold edge. "March" at the bottom, thumb height.
- Locked modifiers show their lock line ("Watchtower level 2"), so the player learns what the castle opens.
- **Scouted:** after March, the boss card the tower already uses comes up with the boss's two attacks and its weakness line.
- In the run: a badge beside the hearts (a skull for cursed, an eye, a moon, a boot), tap for the line.

### Balance

- **Cursed** is set so that cursed Normal is about as hard as Hard (the next tier), and its reward x1.4 matches the effort; then a player
  who can clear Hard gains little by farming cursed Normal. Measured with `army-pace` `tiers` with a `MARCH=cursed` switch (new): the
  mean tries of cursed tier N sits between tier N and tier N+1. Mythic cursed has no tier above it: it is set to 5 to 7 tries at 100.
- **Night** changes how strong ranged parties are; measured with the recruits' party and an all-ranged party: neither more than one try
  apart from a plain march.
- **Scouted** and **Forced** do not change a fight; their rewards are set from the economy (see Touch points).
- Stars: a tier's star conditions are earned the same under any modifier, so the 11-star track and the army unlock pace do not move.

### Art

- Modifier icons: skull, eye, moon, boot (pack UI and item sheets). Route strips: crops of the existing land backdrops.
- Night: a night tint and the camp's star layer are already made; a moon from the sky pack. The battle needs a night grade (a multiply
  layer and slightly bluer lights), drawn in code like the camp's dusk, which keeps textures steady.

### Build plan

1. **March rules.** `march.ts`, `Run.orders`, cursed and forced, rewards. Tests: an old run loads plain; the curse draw is fixed by the
  seed; a cursed run has one heart; forced skips the right waves; rewards multiply once.
2. **March card.** The sheet, locks, the run badge. Shots at three sizes.
3. **Scouted and night.** The boss reveal (needs 7's weakness lines), the reach rule. Tests: night reach is one less below height 2;
  the flag is fixed at fight start. Re-measure with the army pace tool.
4. **Routes.** Route tables per land and `layoutFor` reading them. Test: every route's layouts exist in that land and every wave still
  has a fair deploy area (the layouts test).

### Questions

- **Q5.1** One modifier a run, or two at once at Mythic? *Recommendation:* one, so a run reads at a glance.
- **Q5.2** Should cursed tiers count for stars? *Recommendation:* the stars are earned the same; cursed gives its own laurel.
- **Q5.3** Should the daily get a modifier of the day? *Recommendation:* yes, later: the day's modifier picked by the date seed, the same for
  everyone, no choice. It is a one-line change once modifiers exist.

---

## 6. The Calamity as a longer journey

### What is there now

The Calamity is already a branching journey: six maps (lands) of six to eight floors, each with fights, elites, shops, chests,
mysteries, a recruit camp, a campfire and a boss, fog that lifts along the road, ascension levels, one hero at the start and up to ten
hired. The Rift Sanctuary between fights is a ring of rifts, one per offer. What it lacks is **choices that carry over**: today a
mystery or a campfire pays now and is forgotten, the lands always come in the same order, and nothing from map 1 matters on map 5.

### How it plays

- **Three acts of two lands.** The six maps are grouped as Act I, II and III. An act ends with its second boss, a short act scene, and the
  **Crossroads**.
- **The Crossroads.** After Acts I and II the Sanctuary's ring shows three rifts, each a land the party could cross next, drawn from the
  lands not yet crossed. Each rift shows the land, its boss's name and its **omen** (what the land gives and takes: "The Burning Sands:
  shops sell a fourth ware; campfires heal half"). The order of the lands, and so of the bosses, becomes the player's.
  A boss's strength follows its place in the journey (map 1 to 6), not its name, so any order is as hard as any other.
- **Oaths** (carry over to the end of the run). Mysteries and campfires sometimes offer an oath: a lasting rule with a cost and a gift.
  "Oath of the Lantern: the party sees one more floor of fog; foes on elite floors are 10% stronger." A run holds at most three oaths;
  a fourth replaces one. Oaths sit on a banner in the Sanctuary.
- **Scars.** Some mysteries offer gold or a relic for a scar on a hero (−10% health for the rest of the run), a choice shown up front.
- **Travellers.** Three named travellers (a pilgrim, a deserter, a cartographer) can be met on a mystery floor in Act I. What the party did
  for them is kept, and they return once in Act II or III: a free hire, a map of the next land with its fog lifted, or a trap if they
  were wronged. A small story through the run, no new combat.
- **Provisions.** A run carries provisions (start 3, at most 6); a campfire's rest costs one, and a shop sells them. A party with none can
  still rest at half. It turns "rest or push on" into a choice that spans acts.

### Data and saves

- The Calamity run (its own save slot, `tower-reset.md`) gains `cal.route: number[]` (the land chosen at each crossroads), `cal.oaths:
  string[]`, `cal.scars: Record<string, number>`, `cal.travellers: Record<string, 'helped' | 'wronged'>`, `cal.provisions: number`. All
  optional; a run saved before loads as Act-less with the fixed order, provisions 3, no oaths.
- `calamityMap(seed, map)` stays the generator of a map's floors. `landAt(run, act)` maps the journey's position to a land (`route` or the
  fixed order). The foe scale already reads the map number; it reads the position instead. `calBossBoost` reads the position too.
- Oaths, travellers and the crossroads draw from their own side streams (a new salt for each system), so the
  floors and fights of a seed stay as they are.
- `src/sim/calJourney.ts` (pure): oaths' table, the crossroads draw, travellers' rules, provisions.

### The page

- **Crossroads:** the Sanctuary already turns a ring of rifts; at a crossroads each rift is a land, and its card (the cards that rise from
  the bottom) carries the land's name, its boss, its omen in two lines. Tap a rift or its card to choose, a second tap to go.
- **Oath banner:** three small pennants at the top of the Sanctuary under the map line; tap one for its words. A new oath offered shows
  the three held and asks which to drop when full.
- **Act scene:** a three-line scene at the end of each act with the cinematics player (the run's lead hero and the boss's land).
- **Map:** the act number joins the board line: "Act II · Map 3/6 · The Thornwood".
- All at 393 x 852 first; the Sanctuary's cards already fit 360 px.

### Balance

- The greedy bot learns to choose: at a crossroads it takes the first rift, it takes an oath when the gift's line is a stat and declines
  otherwise, it rests while it has provisions. Then `npm run balance -- --no-tables --calamity --attempts 600` must hold the shares felling
  each position's boss near 84 / 83 / 65 / 45 / 35 / 16. Oath costs are tuned until a bot that takes every oath is within two points of one
  that takes none at each boss.
- Ascension levels stack as before and are re-measured at 1, 5 and 10.

### Art

- None for lands, bosses or rifts (all exist). Pennants for oaths from the packs' banner sheets. Three travellers from the heroes' layered
  sprite kits (a pilgrim, a deserter, a cartographer: body, outfit, helm) as the class heroes were made, idle only. A provisions icon (a
  sack) from the item sheets.

### Build plan

1. **Acts and position.** `landAt`, the foe scale and boss boost by position, the act line. With the fixed order nothing changes; test
  that a fixed-order run is the same fight for fight as before.
2. **Crossroads.** The draw and the Sanctuary's land rifts. Tests: never offers a crossed land; the boss's strength follows position.
3. **Provisions and oaths.** Tests: rest costs one; a fourth oath replaces one; each oath's rule. Re-measure with the bot.
4. **Travellers and scars.** Tests: a traveller returns at most once and only if met; a scar ends with the run.
5. **Act scenes.**

### Questions

- **Q6.1** Three acts of two maps, or keep six maps and add the crossroads after every map? *Recommendation:* three acts: two crossroads
  are real choices, five would be routine, and acts give natural places to stop on a phone.
- **Q6.2** Should the land order be free, or should the last land always be the Hollow Heart (Karnok)? *Recommendation:* Karnok always last:
  he is the Calamity's name and its ending scene is his.
- **Q6.3** Make the journey longer (more maps), or deeper at the same length? *Recommendation:* the same length. A full clear is already
  long on a phone; depth comes from the choices.

---

## 7. Bosses you learn

### How it plays

- **Every boss has a weakness**: the 25 bosses that have signature attacks in `bossAttacks.ts` (the armies' mid and final bosses, the
  Wildwood's three, the Calamity's six guardians). It is a rule of the fight that is always there,
  whether the player knows it or not, and that the player can use through what they control: who is placed, where, and when the king's
  spells fall. Examples:
  - **Orc Warlord:** his slam's wind-up can be broken by a stun or shove landed during the warning: the slam is lost and he is dazed 2 s.
  - **Lich King:** holy damage cracks his ward; three holy blows in his second form strip it and stop him raising skeletons.
  - **Boar King:** a charge that ends against a ruined wall or a height of two leaves him stunned 3 s (the height grid in play).
  - **Gorgon Queen:** her stare cannot stiffen a hero standing behind her.
  - **Demon Lord:** standing in shallow or deep water douses his hellfire on that hero.
  - **Thorn Warden:** fire set on his tile (a burning skill or a powder barrel) halves his thorn wall.
- **Learning it.** The weakness is hidden at first: its codex page shows "???". It is learnt three ways:
  - **By losing** to the boss: each loss to it writes one clue (three clues in all, each clearer: "He hates the light", "Holy blows chip
    something about him", the full rule).
  - **In the codex:** killing the boss's escorts and meeting it fill the page too (one clue at 1 meeting, one at 50 escort kills).
  - **At once** with the Library's Archive (all clues found are written in full) or a Scouted march (5), for that run.
- **Exploiting it.** When a weakness is used in a fight, a gold crack mark flashes on the boss's name bar (one flourish, then steady) and
  the fight counts it. Winning with it used earns the boss's **Hunter's mark**, once per tier (Normal to Mythic: five marks per boss). Each
  first mark pays a **trophy drop** (crowns and a chance at a book or a piece of gear, values from the economy design); all five marks on a
  boss give its trophy on the castle's wall and a title. The Codex gains a Hunter's marks milestone (25/50/75/100%).

### Data and saves

- `src/sim/weakness.ts` (pure): `WEAKNESS` by fighter id: `{ id, clues: [string, string, string], rule }` with the rule a small tagged
  union (`breakWindup`, `elementCracks`, `terrainStun`, `facing`, `terrainDouse`, ...), so 25 weaknesses are made of about eight
  rule shapes. The rules live in `bossAttacks.ts` / `bossPhases.ts` hooks, fixed at fight start.
- `Meta.weak?: Record<string, { clues: number; marks: number[] }>` (clues found, tiers marked). Optional; missing is unknown.
- The battle gains `b.exploited: Set<string>` (set by the hooks, read by `settleRun`); the run gains nothing (Scouted's reveal reads
  `Run.orders`).
- `noteWeakness(meta, battle, run)` beside `noteFoes`: a loss to a boss adds a clue; a win with an exploit adds a mark.

### The page

- **Codex boss page:** a "Weakness" block under the lore: three clue lines (written, or a dark bar with "Lose to him to learn more" /
  "Meet his escorts"), and the five tier marks as small crack badges.
- **Deploy screen of a boss wave:** the boss card's line "Known weakness: holy blows crack his ward" once learnt (or for a Scouted run).
- **In the fight:** the crack flourish and a floating line "Weakness!" (the fx already have floating lines), once per use.
- **Recap:** "Hunter's mark · Lich King · Hard" with the trophy.

### Balance

- A weakness is always in the rules, so it changes fights for players who never learn it (a stun can break the Warlord's slam by chance).
  First step: every boss wave's win rate re-measured with the bot that does not seek weaknesses (`npm run balance` with the boss waves,
  and `army-pace` for the armies, the Calamity bot for its guardians). Where a rate rises more than three points, the boss's hp is raised
  to hold it.
- Second: a bot that seeks the weakness (places the counter heroes, times a spell) must clear the boss wave about as often as one tier
  easier. That is the size of the edge knowing gives; a weakness that does more is softened.
- Marks do not enter the 11 army stars, so the army pace does not move.

### Art

- The crack badge and the flourish: a crack from the packs' fx sheets, tinted gold. The trophies on the castle wall: the packs' item sheets
  (horns, skulls, banners), 25 small pictures; any missing made with PixelLab from pack pieces. No new boss art.

### Build plan

1. **Rule shapes and the first six bosses** (the first two armies and the first Calamity map). `weakness.ts`, hooks, `b.exploited`. Tests:
  each weakness fires on its condition and not otherwise; the fight is deterministic; re-measure those waves.
2. **Learning.** Clues by loss and codex, `Meta.weak`, the codex block. Tests: a loss adds one clue up to three; the codex counts.
3. **Marks and trophies.** Tests: a mark once per tier; only with an exploit and a win.
4. **The other 19 bosses** in batches of six or seven, re-measured each batch.
5. **Scouted reveal and the Archive** once 5 and 3's rooms are in.

### Questions

- **Q7.1** Should the weakness exist before it is known? *Recommendation:* yes. A rule that appears only once learnt would reward reading
  over playing; a rule that is always there can be found by a player who watches closely.
- **Q7.2** Stars or drops for exploiting? *Recommendation:* marks and a trophy drop, not army stars, so the unlock pace stays as it is.
- **Q7.3** One weakness per boss, or one per form (phase)? *Recommendation:* one per boss to start, so 25 to write and test.

---

## 8. Hero legacy

### How it plays

- **Callings.** Every hero already has a calling: the four kinds of book a hero reads (`READS` in `bookData.ts`): **martial** (manual:
  22 heroes), **arcane** (grimoire: 5), **devout** (hymnal: 8) and **wild** (bestiary: 10). Legacy uses the same four.
- **Retiring.** A hero of lasting level 60 or more can retire to the **Hall of Legends** to mentor, one mentor per calling (and one seat per
  Hall level, so all four seats need Hall level 4). A retired hero leaves the party and the armies, keeps their level, talents and books,
  plays a farewell scene, and stands in the Hall. Their gear goes back to the stash.
- **What a mentor gives** every other hero of the calling (the apprentices):
  - **Catch-up XP:** +50% XP from every fight while the apprentice is below half the mentor's level (a level-80 mentor speeds apprentices to 40).
  - **A taught lesson:** the mentor's highest talent row's choice is free for apprentices (the node is open without the points), one row only.
  - **A legacy perk** of the mentor's own, one line, small: the Knight's "Shield-Call" (apprentices start each wave with a 5% shield),
    the Wizard's "First Spark" (apprentices' first skill charges 10% sooner), the Cleric's "Mercy" (apprentice heals +5%). One per hero:
    45 lines.
  - Strength grows with the mentor's level band (60, 80, 100): the perk's number rises a step at each.
- **Recall.** A mentor can be recalled to fight. The perks stop at once, and the seat cannot be refilled for seven days (so retiring is a
  real choice but never a trap).

### Data and saves

- `Meta.mentors?: Partial<Record<Calling, { kind: string; since: number }>>`, `Meta.recalled?: Record<Calling, number>` (when the seat opens
  again). Both optional.
- `src/sim/legacy.ts` (pure): `callingOf(kind)` (from `READS`), `canRetire`, `retire`, `recall`, `mentorOf(meta, kind)`, `apprenticeXp`,
  `taughtRow`, and `LEGACY` (the 45 perks). Perks are fixed into the fight at start through the same boost path as talents.
- A retired hero is left out of `party` and the party picker shows them as "In the Hall". The run's snapshot (as for bonds) keeps the
  mentors at run start.
- Perks count where talents count (armies, Last Stand), not in the daily, spire or Calamity.

### The page

- **Hero sheet** (level 60+): a "Retire to the Hall" button under the talents, with the perk the hero would give and the apprentices it
  would reach ("12 martial heroes"), and a confirm step on the sheet itself.
- **Hall of Legends** (the new castle building's card, or its own small view): four plinths, one per calling, each with the mentor's idle
  sprite, their level badge and perk; an empty plinth says "Retire a martial hero of level 60 or more". Recall from here.
- **Apprentice's sheet:** a line "Mentored by the Knight · +50% XP to 40 · Shield-Call".

### Balance

- Catch-up XP is the main effect: measured with `npm run level-pace`: a second martial hero's day to level 30 and 40 with and without a
  level-80 mentor. The favourite's own pace (level 100 on day 164) does not move, since the mentor's perks never reach a hero above half
  the mentor's level for XP, and the favourite is the mentor or is above it.
- The legacy perks are small by design; the army pace tool is run with the recruits' party under a martial and a devout mentor: at most one
  try fewer on any army.
- The free taught row is worth up to nine points; measured in the same run. If too strong, it is a tier 4 row only.

### Art

- The Hall: four plinths and a columned hall (the castle kits' statues and pillars). Mentors are the heroes' own idle sprites on the
  plinths, with the level aura they already have.
- The farewell scene uses the hero's sprites and the Hall as a backdrop.

### Build plan

1. **Rules.** `legacy.ts`, retire and recall, catch-up XP, the taught row. Tests: only level 60+, one per calling and seat; XP bonus stops at
  half the mentor's level; recall closes the seat for seven days; old saves.
2. **Perks.** The 45 perks (with their numbers in one table), fixed at fight start. Tests: each perk applies only to apprentices; determinism.
3. **Pages.** Hero sheet button and confirm, the Hall's plinths, apprentice line. Shots at three sizes.
4. **Farewell scenes** in batches.

### Questions

- **Q8.1** Is level 60 the right threshold? *Recommendation:* 60 (about day 80 for a favourite): late enough to mean something, early enough
  that a second hero can retire within the game's life.
- **Q8.2** Retire for good, or recall? *Recommendation:* recall with a seven-day seat cooldown.
- **Q8.3** May a hero who has a bond at level 3+ retire? *Recommendation:* yes; the bonded partner of a mentor gets the perk at double
  strength (one line of rule that ties 4 and 8 together).

---

## Order across all six

The castle's rooms are the doors, and bosses and march orders reuse the most of what exists, so:

| Step | Batches | Why here |
|---|---|---|
| 1 | 3.1, 3.2 (rooms framework, new plots) | Every other idea opens through a room |
| 2 | 7.1 to 7.3 (weaknesses, learning, marks) | Uses the boss attacks, phases and codex as they are |
| 3 | 5.1 to 5.3 (march orders, card, scouted and night) + 3's Watchtower rooms | Scouted needs weaknesses |
| 4 | 3.3, 3.4 (Smithy, Library, Chapel, Mage Tower rooms) | After the gear design settles wear and repair prices |
| 5 | 4.1 to 4.3 (bonds and rivals) | Needs the formations design's word on adjacency |
| 6 | 8.1 to 8.3 (legacy) + Hall rooms | Needs a few players at level 60 to matter |
| 7 | 6.1 to 6.4 (the Calamity journey) | The largest; does not block anything |
| 8 | Scenes for 4, 6 and 8; 5.4 routes; 7.4 the other bosses | Writing and content, in batches |

Each batch: `npm run typecheck`, `npm run web`, the batch's own tests (`npm test -- rooms`, `bonds`, `march`, `weakness`, `legacy`,
`calamity`), shots of changed pages at 393x852, 360x780 and 412x915, the pace tool that owns the touched number, and a note in
`docs/notes/`.

## Where these touch the other two designs

- **Gear, runes and the economy:**
  - The Smithy's rooms (Field Anvil, Patchwork, Master's Mark) are about wear and repair; the gear design owns wear, repair prices and any
    new crafting. These rooms should take the gear design's prices and must not add crafting of their own.
  - Every new reward (cursed x1.4, night chest roll, trophy drops, Hunter's marks milestone, act and traveller rewards) should take its
    values from the economy design's tables, so crowns and drops are budgeted in one place.
  - The Library's Scriptorium changes who can read a book; if the economy design changes books' supply, the two must agree.
  - Retired heroes' gear goes back to the stash; if runes are bound to heroes, the gear design decides whether runes go with it.
- **Formations and tactics:**
  - Bond rewards and rival penalties are "within two tiles": a positioning rule. If the formations design adds adjacency or formation
    bonuses, bonds should use the same distance and the same deploy-board drawing (threads, highlights) so the board does not show two
    systems' lines.
  - Boss weaknesses are mostly tactical (stand behind, use water, break the wind-up): they are the best showcase for any tactics
    controls (orders, focus, hold). If the tactics design adds a "target" or "hold" command, several weaknesses become easier to use on
    purpose, and the seeking bot's measure should include it.
  - Night march changes shot reach by height; a formation that puts shooters on height gains under it.

## All the questions

| # | Question | Recommendation |
|---|---|---|
| Q3.1 | Three new buildings, or fold Smithy into Armoury and Watchtower into Stable? | Three new buildings |
| Q3.2 | Make the Chapel levelled? | Yes, three levels |
| Q3.3 | Rooms at fixed levels, or a choice per building? | Fixed |
| Q4.1 | Small power from bonds, or story only? | Small power to level 4, none past it |
| Q4.2 | Who writes the ~135 scenes? | A worker drafts in batches of ten for the owner to read |
| Q4.3 | Can rivalries be settled? | Yes, at ten wins together |
| Q5.1 | One modifier a run, or two at Mythic? | One |
| Q5.2 | Do cursed tiers count for stars? | Stars as usual; cursed earns its own laurel |
| Q5.3 | A daily modifier of the day? | Yes, later |
| Q6.1 | Three acts of two, or a crossroads after every map? | Three acts |
| Q6.2 | Free land order, or Karnok always last? | Karnok always last |
| Q6.3 | Longer, or deeper at the same length? | Same length, deeper |
| Q7.1 | Does a weakness exist before it is known? | Yes |
| Q7.2 | Stars or drops for exploiting? | Hunter's marks and a trophy drop, not stars |
| Q7.3 | One weakness per boss or per form? | Per boss |
| Q8.1 | Retire at level 60? | Yes |
| Q8.2 | Retire for good, or recall? | Recall, seven-day seat cooldown |
| Q8.3 | Can a bonded hero retire? | Yes; the partner gets the perk at double strength |
