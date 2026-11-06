# The Nemesis War, phase 2: the Dark Council

Phase 2 of the expansion in `docs/design/legends-expansion.md` (section 9, "Phase 2: The Dark Council"), built to sections 2.5, 2.11, 5.1,
7 and 8 of the design on top of phase 1 (`docs/notes/nemesis-1.md`). Phase 2's list: the 1-4-8 pyramid, sworn captains, loyalty, the
Council's turns (Recruit, Promotion, Feud, Betrayal, Feast, Trial of Strength, Blood-oath, Desertion), the War News, the Fallen tab, the
Warchief's Muster, the camp's war-table figurine and the war simulator. With it come the warchief's seat, the War Trophies and the Spoils,
which phase 1's note left to the Council. Revenge, trophies taken from heroes, fleeing, cheating death, humiliation, the taunt cut-ins and
duels are phases 3 and 4 and are not here.

## What it plays as

- **Thirteen seats** (`SEATS`): one warchief, four captains, eight lieutenants. Each lieutenant is **sworn** to a captain, two to a captain
  (`swear`), and each member has a **loyalty** to its superior (0 to 100, starting at 60).
- **The Council takes a turn** (`council.ts`, `councilTurn`) each time an army run ends, win or lose, at most four counted a real day
  (`endOfRun`, from `settleRun` when the page gives the day), and one on the day's first visit (the home screen's `open`). The page passes
  the day key; the sim reads no clock. A turn's draws all come from `new Rng(mixSeed(meta.seed, COUNCIL_SALT, war.turn))`, so a turn
  replays exactly from the save. A turn:
  1. **The warchief's seat.** Empty, the mightiest captain **claims** it; on the next turn he takes it, unless a captain within a Might of
     him **challenges** (half the time): a feud for the seat, whose winner takes it.
  2. **Ambition**: a lieutenant as mighty as its captain, or mightier, loses 2 loyalty.
  3. **No event 10%, one 60%, two 30%**, each drawn by the design's weights from the events whose conditions hold now (`eventOpen`):

     | Event | Weight | When | What happens |
     |---|---|---|---|
     | Recruit | 3 | a lieutenant's seat is free | an elite of an army the player has opened (one not already on the Council), else an escort of one, takes the seat at Might 1 or 2, with a trait of its own (`RECRUIT_TRAITS`, never an immunity), the Dread of a hero of the party, and no secret known |
     | Promotion | 4 | a captain's seat is free | the mightiest lieutenant rises (ties to loyalty) |
     | Feud | 2 | two of a rank | Might plus a d6 each; the winner +1 Might, the loser -1, slain 30% of the time |
     | Betrayal | 1 | a lieutenant under 30 loyalty, within a Might of its captain | 50%: they swap seats, the old captain slain or cast down (half each); else the traitor is slain |
     | Feast | 1 | a captain sits | the captain and its lieutenants +15 loyalty; a Glutton among them +1 Might |
     | Trial of Strength | 1 | a lieutenant at Might 4+ | a feud with its captain; the winner takes the higher seat |
     | Blood-oath | 0.5 | two without an oath | they swear brotherhood |
     | Desertion | 0.5 | a member at Might 1 that lost its last three meetings | it leaves the War: "Gash has had enough" |

  4. **A Recruit is forced** while fewer than three lieutenants sit, so the Council never falls below three once the War is open.
- **Might from the Council** is +1 a turn at most for a member (`mightUp`), never past 10. **The warchief is never in a Council event**
  (feuds are within a rank; betrayals and trials are a lieutenant against its captain; he never deserts). Only the heroes bring him down.
- **Loyalty moves**: a Feast +15; +10 to the underlings of a member who **won its meeting** (it stood in a fight the heroes lost and lived:
  `NemNote.held`); -15 to the lieutenants of a captain beaten in a feud or a trial; -10 when a blood-oath brother is slain by a rival member;
  and the ambition above. The design's -20 for a superior humiliated by the heroes waits for humiliation (phase 3).
- **A Blood-oath** binds two members. When one falls to the heroes, the other turns **Vengeful** against the hero who struck the blow: +20%
  damage to that hero, whom it goes for first among those in reach (`nemHurt`, `nemPrey`; the design's 2.7 Vengeful, which phase 3 also
  gives the humiliated). When one is slain by a rival member, the other's loyalty falls by 10.
- **The warchief in the field**: a warchief born a boss stands as his own boss, as before; any other stands beside his army's last boss, in
  its last wave (the design's "final boss of its own army's runs"), at a captain's strength (`RANK_STATS.warchief`).

## The Warchief's Muster (`muster.ts`)

- **It opens** once a warchief sits and **two captains have fallen to the heroes since the last Muster** (`War.musterSince`, counted by
  `noteWar`). It stays open until the warchief falls: a lost Muster costs nothing and can be called again.
- **It is a run of its own** (`RunMode` `muster`, saved in its own slot, `legends.muster`, so an army run saved is not touched), begun from
  the board's gilded footer button, "Muster against the Warchief" ("Resume the Muster" for one saved part-way), with the party picked as an
  army's is. **Three waves on the warchief's army's land**: the army's last two ordinary bands with the Council's three mightiest
  lieutenants in the first and its two mightiest captains in the second (none born a boss: a boss meets the heroes as itself), then the
  army's last band with **the warchief at its head**, on the army's last boss's wall. Wave n of the Muster is as strong as the army's wave
  `length - 3 + n`, on the tier of the player's hardest clear of that army; it begins with the gold an army run holds by then.
- **The warchief changes form at half health**: his own boss's second form if he was born a boss, else `CHIEF_PHASE` ("The Warchief does
  not kneel!": +25% attack, a shield of 12% of his health, 4 s of haste), through the boss-phase engine (`phaseKitOf`).
- **His fall**, wherever it comes (the Muster, or his army's last wave): his **Head** is taken (`War.heads`, shown on the Fallen tab; the
  trophy wall's place for it is phase 10), the Muster's count resets, and **the Council reshuffles**, two Promotions at once: the mightiest
  captain takes the seat there and then, and the mightiest lieutenant rises to captain. The result screen says "The Warchief falls!", and
  the board opens on the Fallen.

## The War Trophies and the Spoils

Slaying a nemesis now also pays **War Trophies** (`TROPHIES`): a lieutenant 1, a captain 2, a warchief 5, at most 12 a day (`trophyDay`).
The **Spoils** tab spends them: an **unlock shard** of a hero not yet owned for 6 (two a week, `shardWeek`; `giveShards`), or a **scout** for
2, which reveals one secret of a member. The design's relic choice for the next army run (3 trophies) needs a run-start offer the army runs
do not have yet, and the cosmetic name plates are phase 10's; the tab says both come later.

## The board (`nemesisView.ts`, `nemesis.css`)

A full page on the standard ornate menu (`ornateMenu`, kind sheet; "‹ Back"), its four tabs a `menuPick` row: **Council · News · Fallen ·
Spoils**. The header reads "The Nemesis War", "The Dark Council", "War turn 47 · 12 of 13 seats filled".

- **Council**, the pyramid on one screen with no sideways scroll at 360 px: the warchief across the top (a 72 px face in his gold frame, the
  crown insignia, his Might as ten pips); the four captains in a row; the eight lieutenants in two rows of four, **each in its sworn
  captain's column** so a short brass line runs straight up from it; a red ⚭ on a member under a blood-oath, and the oaths listed beneath;
  a vacant seat is a dim dashed plinth, "Vacant: the strongest will rise". Then the Muster's count and line.
- **A seat** opens the nemesis's card (a standard card, "Close" and **Hunt**), which now also says where it stands on the Council: whom it
  serves or commands, its loyalty, its oath, whom it is Vengeful against.
- **News**: the last forty lines of the War, newest first ("Turn 47 · Feud · Gorrak beat Throg"), each with its event's icon: the
  Council's turns, and who the fights named and slew.
- **Fallen**: the Warchief's Heads, then the last thirty fallen, each with how ("slain by Kwame", "slain at the Muster by Kenji", "slain by
  Sister Ash in the Council").
- **Spoils**: the trophies held, the shards (the week's limit in the section's line, `.omLock` once spent) and the scouts.
- **The camp** (`home.ts`): the Council place shows the **warchief's face** once there is one (the mightiest member's until then), reads
  "The Dark Council · 12 seats filled", and its count turns the warchief's gold, steady, while the Muster is open.
- **After a run** the wave card's War lines add the War Trophies won, a blood-brother's vengeance, the warchief's fall and the reshuffle,
  the Muster opening, and up to three lines of the Council's turn ("The Council stirs: Gash beat Throg").

Screens checked at 393x852, 360x780 and 412x915: `docs/samples/nemesis-2/` (`node tools/nemesis/shots2.mjs`, saves in
`tools/nemesis/saves2.ts`): the camp, the Council (top and foot), News, Fallen, Spoils, a captain's card, and the Muster's last wave
(deploy, and Gorrak in the fight with his boss bar).

## Saved (`nemesis.ts`, `readWar`)

`War` gains `news` (40), `musterSince`, `trophies`, `trophyDay`, `shardWeek`, `day` (the turns counted today), `claim` and `heads` (30);
`Nemesis` gains `sworn`, `oath`, `vengeful` and `streak` (meetings won in a row counts up, lost counts down); `FallenNemesis.how` is now
`slain`, `muster` or `council` (with `foe`, the rival), and keeps its `turn`. The reader clamps the numbers, cuts the lists, forgets a sworn
captain or an oath brother who is no longer a member (an oath only both ways), and reads a phase 1 War as a fresh one with its members. The
Muster's run is in `legends.muster` (added to `SAVE_KEYS`).

## Images (none new yet)

Phase 2 uses existing art only: the item icons stand in for the News's event icons and the War Trophy token (`NEWS_ICON`, `TROPHY_ICON`:
the banner for a recruit, the gold band for a promotion, a blade for a feud, the viper fang for a betrayal, the chalice for a feast, the
iron shield for a trial, the oath ring for a blood-oath, the boots for a desertion, the sun crown for a claim, the jewelled crown for a
warchief crowned and as his insignia, the book of names for a naming, the ash tooth for a slaying, the war drum for the Muster, the dragon
sigil for a War Trophy). They are bundled into game.js, so the service worker's list does not change. The images that would replace them,
as prompts:

1. **Council event icons, ten, 24 px** (the design's row 5). "A sheet of ten 24x24 pixel-art icons on a transparent background for a dark
   fantasy strategy game, 1 px dark outline, muted gothic palette with violet and blood-red accents, no text: (1) recruit, a tattered war
   banner on a pike; (2) promotion, a gold chevron rising; (3) feud, two crossed jagged blades; (4) betrayal, a dagger in a cloaked back;
   (5) feast, a spilled goblet beside a roast bone; (6) trial of strength, two clenched gauntlets locked; (7) blood-oath, two hands cut and
   clasped with a red drop; (8) desertion, footprints leading away from a broken helm; (9) fled, a running silhouette in smoke; (10) cheated
   death, a cracked skull with a stitched seam."
2. **The War Trophy token, 24 and 48 px** (row 9). "A small currency icon for a dark fantasy pixel-art game, transparent background, 48x48
   and 24x24 pixels: a blackened iron medallion with a horned skull stamped on it, a frayed red ribbon through its loop, brass rim, crisp
   pixel art, 1 px dark outline, no text."
3. **The warchief's crown insignia, 32 px** (row 1; phase 1's prompt covers all three ranks): the third badge of phase 1's prompt, a
   gold-and-black horned crown.
4. **The Dark Council backdrop, upright 2:3** (row 3; the board is an ornate sheet today and has no backdrop of its own). "An upright 2:3
   painting for a dark fantasy pixel-art game's menu backdrop: a war council in a torchlit cavern hall, a long black table with a war map, a
   tall horned throne at its head, thirteen high-backed chairs, banners of orcs, undead and beasts hung on the walls, violet and ember light,
   painterly pixel art, darkened at the edges so text reads over it, no people, no text."

Each would be credited in `CREDITS.md` when made; the backdrop, if loaded by URL, goes into the service worker's `FILES`.

## Where phase 2 reads the design narrowly

- **Ambition** (-2 loyalty a turn for a lieutenant as mighty as its captain) is not in the design, which gives loyalty no drift; without it a
  betrayal (under 30, from a start of 60) could only follow a beaten captain or a slain brother. At -5 a turn for a lieutenant within a
  Might, the war simulator saw six to eight betrayals a week.
- **The design's death-spiral guard** (a nemesis that wins three meetings in a row feasts instead of growing, half the time) is in section 8
  but no phase's list; it would change phase 1's Might rule (and its test), so it is left for the owner. `Nemesis.streak` already counts the
  meetings for it.
- **Desertion** needs three meetings lost in a row by a member that lives through them, which only fleeing and cheating death (phase 3) can
  give: until then a member who loses a meeting has fallen. The rule and its test are in.
- **The relic choice in the Spoils** waits for a run-start offer (above). The **Avenger and Grudge chips** on the pyramid's cards, the
  **season's** weighting of the events (Spring's Recruits, Winter's Feasts) and the **taunt cut-in** on the warchief's fall are phases 3 and 5.
- **A seat change from the field** (a birth that displaces a Might-1 lieutenant, a member slain by the heroes) is counted in the war
  simulator's seat changes beside the Council's own.

## The war simulator (`npm run war-sim`, `tools/nemesis/warSim.ts`)

A player's days as the greedy bot (`tools/nemesis/warSim.ts`): each day the first visit's turn, then a few army runs at the player's level
(about 60 by day 80, 100 by day 164; the newest army that level reaches, every third run the one before it, on Hard past day 40), every
wave settled for the War as the page settles it, the Council's turn after each run (four a day at most), and the Muster answered once a
day when it is open. 120 days, seed 1:

| | 3 runs a day (28 turns a week) | 1 run a day (14 turns a week) | The design's target |
|---|---|---|---|
| Seat changes a week, from week 3 (a member in, out, or its rank changed; the field's births and slayings included) | 35.0 | 17.8 (7 to 19 once the Council is full, from week 8) | 3 to 5 |
| Lost to infighting a week (slain by a rival, or deserted) | 3.9 | 2.4 | about 1 |
| Might mean at day 60 / 90 / 119 | 1.7 / 2.8 / 2.8 | 2.2 / 2.5 / 3.3 | 3 to 5 at day 60 |
| First member at Might 10 | day 66 | day 83 | not before day 45 |
| Warchiefs | 30 taken by the player; from day 45 each held 3 to 17 days, and the last from day 79 to the end | 10 taken by the player; the last held from day 45 to the end | at least 2 weeks unless the player kills him |
| Lost to the Council's own turns | none (the warchief never is) | none | never |

What it shows, for the owner:

- **The warchief** is only ever taken by the player, as the design wants. Early on he falls every day or two: the bot replays armies it has
  outgrown, and a warchief stands in his army's last wave as well as at his Muster.
- **The churn is well above the design's 3 to 5 a week**, and most of it comes from the field: while the bot can win its waves (to about week
  11) it slays four to eight members a day, a member it meets in a won wave always falls (fleeing and cheating death are phase 3), and the
  Council refills the seats with Recruits and Promotions. Once the bot reaches armies it cannot beat (week 12 on), the field quietens and the
  Council's own events dominate: feuds 5 to 15 a week, betrayals 1 to 4.
- **The Council's own rate** is the design's table at the design's turns: a turn has an event 90% of the time and a full Council's events
  are mostly Feuds (30% lethal), so a member is lost to infighting about once every six or seven turns. Bringing it to one a week at four turns a day would need
  far fewer events a turn (no event about 70% of the time) or a Feud's loser slain about 10% of the time. **Neither is changed here**: the
  numbers are the design's, and the choice is the owner's.
- **Might stays low until phase 3**: a member grows only by living through meetings, and in phase 2 a member met in a won wave falls. Mean
  Might reaches 3 by day 105 or so with one run a day.

```bash
npm run war-sim                  # 120 days, 3 runs a day
npm run war-sim -- --runs 1      # 1 run a day
```

## Checks

- `npm run typecheck`: clean. `npm run web`: built.
- **The full `npm test`**: 2,574 tests, 2,573 passing on the full run; the one that failed was a guard whose list needed widening, and it passes since (re-run with the council tests): `summon-stones.test.ts` names every source of
  shards in play, and the Spoils are a new one the design adds (2.11); `council.ts` is added with its reason, and its weekly cap is tested.
  No test was loosened or removed; phase 1's tests pass unchanged (an early "fat and lazy" rule broke one, so it was taken out, above).
- **`test/council.test.ts`** (20 tests): the turns a day (four after runs, one on the first visit, afresh the next day); only an ended army
  run gives a turn, and `settleRun` takes it only when the page gives the day; a turn replays from the turn counter and the seed; the weights
  are the design's table and each event is drawn as often as its weight when all are open; each event waits for its conditions; Recruit,
  Promotion, Feud (the 30%), Betrayal (the 50% and the 50%), Feast, Trial, Blood-oath (vengeance on the hero, +20% and first target; loyalty
  on a rival's kill), Desertion; loyalty's moves; the warchief never lost to the Council over 2,400 turns; the claim and the challenge; at
  least three lieutenants and the seats' caps over 600 turns; the War Trophies' daily cap, the shards' weekly cap, the scout; the Muster's
  gate, its three waves, the warchief at the head with his second form, its strength from the army's last waves; the warchief's fall (the
  Head, the reset, the reshuffle); the save's round trip, its caps and a phase 1 War.
- **The pinned fights**: `nemesis-regression` (63 army waves pinned before phase 1's hooks), `stand-regression` and `ailments-identical`
  hold: the new hooks (Vengeful, Glutton, the warchief's phase) are no-ops without `Unit.nem`, and a fight's stream is never drawn.
- **Balance**, table 5g (`npm run balance -- --no-tables --nemesis typical|harsh|full --talents --attempts 16 --war-runs 10 --only
  orcs,undead,beasts,wildwood,labyrinth,ogres`, `full` with `--might 3`). The typical and harsh Councils are now grown with the Council's
  turns between the runs (90 turns; `--no-council` gives phase 1's way):

  | Army (Normal, its level) | no War | typical | harsh | full, Might 3 |
  |---|---|---|---|---|
  | Orc Warband (1) | 1.8 | 2.4 (+0.6) | 2.6 (+0.8) | 2.1 (+0.3) |
  | Undead Legion (8) | 2.1 | 2.1 (+0.0) | 2.1 (+0.0) | 2.2 (+0.1) |
  | Beast Packs (15) | 1.4 | 1.4 (+0.0) | 1.4 (+0.0) | 1.4 (+0.0) |
  | The Wildwood (22) | 1.1 | 1.1 (+0.0) | 1.1 (+0.0) | 1.4 (+0.3) |
  | The Labyrinth (35) | 3.3 | 2.9 (-0.4) | 3.0 (-0.3) | 2.9 (-0.4) |
  | Ogre Clans (45) | 3.3 | 3.3 (+0.0) | 3.3 (+0.0) | 4.1 (+0.8) |
  | **The largest rise** | | **+0.63** | **+0.75** | **+0.75** |

  All under the +1 bar. The typical Council: 13 members, Might mean 3.4, an Orc Warlord warchief at Might 10 who stands as the Orc
  Warband's last boss (its +0.6); harsh: the same five Might up, mean 7.7.
- **Not measured**: the Spoils' shards in `npm run unlock-pace` (the design's farming check: at most two a week, so at most two shards a
  week sooner); the Muster's win rate (the war simulator's bot answers it, but no table measures it).
- Screens: `docs/samples/nemesis-2/` at 393x852, 360x780 and 412x915.
