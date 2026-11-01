# Real gear in runs (RUN-GEAR)

The books-shop-gear design's batch 4 ([books-shop-gear-design.md](https://github.com/Hpatter9/legends-of-the-fall/blob/claude/shop-books-design/docs/notes/books-shop-gear-design.md),
"Real gear in runs" and "Balance for real gear in runs", with the owner's decision 7: **runs drop and use real pieces**). Everything a
run started since this batch finds is a real piece of equipment (a base of `equipBases.ts`, a grade, an item level, durability), worn
for real and kept. A run saved before (no `run.real`) finishes on the old rules with its simple gear (`gear.ts`), which comes home once
as real pieces when it ends.

## The rules (`src/sim/runGear.ts`)

- **Every new run is a real-gear run** (`run.real`): `newRun`, `armyRun`, the daily, the spire and the Calamity. Its finds go into
  `run.pack` (real pieces with run-own ids from `nextGear`, tagged `found` with the run's seed); simple gear is never made.
- **Every source draws as before.** `findGear` takes the place of `dropGear` and draws exactly one number from the source's stream (the
  slot), as `dropGear` did; the base, grade and item level come from a side stream, `mixSeed(run.seed, FIELD_SALT, stage, source, id)`.
  `findSlotGear` (in place of `makeGear` for a fresh piece) draws nothing from the source. So every run's events, relics and foes draw
  as they did. A find rides the event's `Gear` (`Gear.piece`), so the event cards, shops and prizes carry it unchanged; `stow` puts it
  in the pack. Sources converted: the boss wave's sure piece and the cursed path's prize (`run.ts`), the merchant, the mystery chest and
  the cursed path (`events.ts`), the passing cart (`market.ts`), the crossroads forge's fresh piece and the stranger's heirloom
  (`midEvents.ts`), the mystery rooms' fresh pieces (forge, mimic, cairn, goblin forge, void well: `mystery.ts`), and the spire's and
  Calamity's shop, chests, plain fights, elites, mini-bosses, bosses and mimics (`tower.ts`).
- **Grade** from the source's step (`1 + floor((gearStage - 1) / 8)` plus its bonus, as the simple tier was) and the run's difficulty
  (`fieldGrade`, the design's table: Normal, Hard, Elite and up); never Mythic. **Item level** `1 + 3 x` the army's place (the run's army,
  else the save's furthest cleared, `run.findAt`), plus 1 for every 4 waves reached, at most 20 (`fieldLevel`). Full durability.
- **Prices** in run gold: the merchant's, the cart's, the road's and the mystery smiths' real pieces cost by grade (`FIELD_PRICE`:
  Common 40, Rare 90, Epic 200, Legendary 450) plus 2 a stage; the spire's shop keeps its 24-a-tier base for simple gear.
- **Worn by kinds.** A found piece is worn by a hero kind for the run (`run.worn`: kind, slot, pack id), so merges, recycles and partings
  leave it where it is. In a run that brings the lasting kit (armies, the daily, quest battles) it takes the place of that kind's
  lasting piece in its slot (`asWorn`); in a run whose heroes start bare (`run.local`: the spire, the Calamity) only the finds count
  (`bareKitStats`, sets included). A guest wears none.
- **Fresh from the field** (`FIELD_BOOST`): a piece found in this run gives its main stats times the boost while the run lasts (range
  and abilities are not boosted); at home it is a plain piece. The pack shows it under each find, with the painted `badge-field` mark.
- **Equip best** in a run (`equipBestReal`, behind the pack's button, the bot's `dressSquad` and `equipBestRun`): each fielded kind's
  whole kit is chosen together, its finds (fresh) against its lasting piece in each slot, counting sets, the strongest kind first; a
  slot changes only when the whole beats what it wears, and a piece goes to one kind.
- **Upgrades only touch finds of this run** (`upgradeFound` refuses any other piece; the smiths' lists are `findsAsGear`, never the lasting
  kit): the crossroads forge's temper and the countess's wager give `+3` item levels, the quench and the whetstone `+2`, the mystery forge
  raises a grade while below Epic (else `+3` levels); a lost wager, a melt or the goblin's spoon loses the find.
- **Wear in the run** (`settleRunWear`): a find worn by a placed kind loses a point a wave (its armour one more for a fall, half under
  auto-replay), as the lasting kit does; the lasting piece a find sits in for does not wear (`settleWear`'s new `skip`, `slotTaken`).
- **The run's end** (`settleFinds`, once, on a loss, a clear or giving up; `main.ts` after the fight and in the spire's abandon, the
  balance bot at the end of `playArmy`, `playDaily` and the climbs): in a run that brought the lasting kit the finds a kind wears are
  put on it for real (the piece they replace goes to the stash, wear kept); everything else goes to the stash. An auto-replay run brings
  each find home half the time (`AUTO_FIND_SALT`, a boss's always: `run.bossFinds`).
- **The stash** holds `STASH_MAX` (150) spare pieces (`equipment.ts` `bringHome`); past it new pieces wait on the camp's cart
  (`Meta.cart`, at most `CART_MAX`, 20), and past the cart the lowest are sold for their price. Selling (the stall, salvage) and
  combining move the cart's best pieces in at once (`unloadCart`). An old save above 150 keeps everything.
- **Old runs** (no `run.real`) play on their simple gear; at the end `carriedHome` turns it into real pieces (each a base of its slot from
  `mixSeed(run.seed, CARRY_SALT, gear.id)`, tier 1 Common, 2 and 3 Rare, at `fieldLevel`).

## On the page

- **The pack** (`src/events.ts` `drawFinds`): the chosen hero's three slots (its find, or its lasting piece marked "(lasting)", or
  empty), the finds no one wears in their grade frames with the fresh mark and "Fresh from the field: x2 this run", and the stash's
  "n / 150". Tap a find to put it on, a worn find to take it off; Equip best dresses the field.
- **The result card's Found row** (`src/foundRow.ts`, classes `rcFound*`): the pieces brought home in their grade frames (six, then a
  "+n" chip), each tappable for its line ("Frostbrand, Rare Lv 13: ... · worn by Kenji"), the stash-full lines ("Stash full: 6 pieces wait
  on the cart", "Stash full: 3 sold for 15 crowns"), the auto-replay line, and **Sell the Commons · n** (the stall's bulk-sale rule, so
  never the last of a base). On the army and daily recap and on the spire's and Calamity's summary.
- **The stall's Sell tab** says "Spare gear: n / 150" and, when the cart holds pieces, "Your stash is full: n pieces wait on the cart".
- The wave card lists a find as equipment (`waveGains.ts`: the pack's new pieces).
- Shots: `docs/samples/run-gear-pack.png` and `run-gear-found.png` (393x852; `-360x780`, `-412x915`), by `node tools/run-gear/shots.mjs`
  after `npm run web`.

## Saves

All optional, the save version unchanged: `Run.real`, `Run.pack`, `Run.worn`, `Run.bossFinds`, `Run.findAt`, `Run.findsHome`,
`Run.foundHome`; `Equipment.found` (only on a run's pack pieces); `Meta.cart` (`readCart`). A run saved before this batch has none of
them and finishes on the old rules.

## The balance pass

Measured on main (0.313.0, e296369) and on this branch with the same tools. The tools learned the real finds first: the bot's runs
(`tools/autoplay.ts` `playArmy`, `playDaily`, the spire's and Calamity's climbs) drop, wear and bring home real pieces (`settleFinds`), its
fights count the kit a kind wears with the run's finds in it (`botBoost`, `botKitStats`; on the old rules it was the awakening only), its
dressing is Equip best from the pack, and the realistic climb puts the found pieces on at camp (Equip all) before each try, so a save's
later armies fight in what its earlier runs found. Tuning switches: `npm run balance -- ... --field 1.5,3` (the boosts), `--normal
1:0,1:0,1:0.33,2:0` (the grade table's Normal column), and `RUN_GEAR_KEEP=0` (finds left in the run, to see what keeping them does).
`node tools/run-gear/sweep.mjs --attempts 60` measures the spire, the Calamity and the daily in one go.

**The realistic climb** (`npm run balance -- --no-tables --climb --saves 120`, mean tries per army; no save clears the Labyrinth in 25
tries on main either, so the table stops there):

| | Orcs | Undead | Beasts | Wildwood | pieces owned at the Beasts |
| --- | --- | --- | --- | --- | --- |
| main | 2.0 | 3.0 | 4.7 | 2.2 | |
| real finds, kept (x2 / x3, the design's grade table), 60 saves | 2.1 | 2.8 | 3.2 | 1.8 | 8 |
| the same, army boost x1 | 2.1 | 2.6 | 3.3 | 1.9 | 8 |
| army boost x1.5 | 2.2 | 2.4 | 3.0 | 1.8 | 8 |
| x2, Normal one grade lower (step 4 Rare) | 2.1 | 2.5 | 3.5 | 1.7 | 8 |
| x1.5, Normal all Common (step 4 a third Rare) | 2.1 | 2.6 | 3.8 | 1.9 | 8 |
| **x2, finds not kept** (`RUN_GEAR_KEEP=0`) | 2.1 | 2.7 | 5.3 | 2.3 | 0 |

At 120 saves a mean moves about 0.3 between runs, so only the gap at the Beasts is clearly real. **The fresh boost is not what
moves the climb**: with the finds left in the run, x2 plays as main's simple gear did, within noise, and every boost from x1 to x2
with the finds kept lands at about 3 tries at the Beasts. **Keeping the finds is.** By the Beasts a save has brought home about 8
pieces, so its five heroes wear a kit from the first wave of every later army, where main's started each run bare. A lower grade
table barely changes this: a Common kit is worth about +6% and a Rare one about +10% (`gear-balance`), and the kit is there in every wave.
The climb models a save with no chest gear (its waves pay no chests), so the found kit is its only kit. A real save at that point
also wears what its chests gave, which would leave less room for finds to help, but the climb cannot show that. The values stay at the design's (`FIELD_BOOST` x2 and x3, the design's
grade table), and the gap is a question for the owner below. No save had a Legendary piece from finds before the Labyrinth (the sixth
army is never reached in the climb).

**The other modes** (60 runs each, `node tools/run-gear/sweep.mjs --attempts 60`; the daily from a fresh save, the spire and Calamity
from fresh saves with no castle, at their recommended starts):

| | main | branch |
| --- | --- | --- |
| The spire: floors reached (mean) | 81.6 | 80.3 (-1.6%) |
| The Calamity: spots cleared (mean), maps | 15.6, 1.80 | 15.7, 1.82 |
| The daily: cleared, waves won (mean) | 65.0%, 9.32 | 65.0%, 9.32 (a daily finds about one piece a run) |

**The Last Stand** (`npm run stand-balance`, 30 runs a row at levels 1 to 100) finds nothing in the run (as before) and plays exactly
as on main: every row's median, mean, low, high, kills and peak foes are the same.

**Gear balance** (`npm run gear-balance`): it measures the pieces themselves (a whole kit by grade, each base alone), which this batch
does not change: its first table's rows match main exactly (army 1: Common +6%, Rare +10%, Epic +19%, Legendary +22%, Mythic +27%; army 3:
+7, +11, +21, +25, +29%; army 5: +8, +13, +25, +28, +34%). The full per-base table takes over twenty minutes and was not rerun.

**The identity hashes** moved for the run modes only, as they should (their fights now wear real finds): `test/fixtures/spells-identity.json`
and `test/fixtures/ailment-logs.json`, the keys `daily`, `tower` and `calamity` (the tests' actual hashes taken for those keys alone).

## The owner's answer: keep the finds, retune the early armies

The owner kept the finds as built and asked for the early armies to be made a little harder, with their own strength knobs, so the
climb takes main's tries again. After merging main (0.319.0), Normal's `start` (`armies.ts`) was raised: the Undead Legion 1.7 to
1.74, the Beast Packs 2.17 to 2.27, the Wildwood 2.52 to 2.7. Each army's `xpStart` is unchanged, so a run pays the XP it did, and
`tierStart` is unchanged, so the harder tiers are as they were. Found with `--set` on the climb, 120 saves each:

| | Orcs | Undead | Beasts | Wildwood |
| --- | --- | --- | --- | --- |
| main 0.319.0 | 1.9 | 2.8 | 4.6 | 2.0 |
| this branch, merged, armies as on main | 2.0 | 2.6 | 3.1 | 1.6 |
| Undead 1.76, Beasts 2.36, Wildwood 2.66 | 2.0 | 3.0 | 5.3 | 1.9 |
| Undead 1.73, Beasts 2.3, Wildwood 2.66 | 2.0 | 2.9 | 5.0 | 1.9 |
| **Undead 1.74, Beasts 2.27, Wildwood 2.7 (shipped)** | 2.0 | 2.9 | 4.3 | 2.0 |

The other modes, after the retune, against main 0.319.0: the spire 80.5 floors (main 81.6), the Calamity 15.75 spots and 1.73 maps
(15.67, 1.75), the daily (`npm run daily-rate -- --days 200`) 77% cleared (76%), the Last Stand identical row for row. The identity
hashes, re-taken after the merge for the keys this branch moves: `daily` and `calamity` (the finds) and `tower` (the spire meets the
armies' foes, so the retuned starts move it). Two tests that pin the early armies moved with the owner's answer: `test/army-pace.test.ts`
records the new `start`s, and `test/armies.test.ts` checks the bare starting five against the Beasts at level 23 (over 32 tries 41% at
level 20 before; 19% at 20 and 41% at 23 now: a save with no kit needs a few more levels, one that keeps its finds climbs at main's pace).

## Tests

`test/run-gear.test.ts`: every mode's new run is a real-gear run, and a find leaves its stream where the simple gear did (same slot,
and `findSlotGear` draws nothing); the grade table and item level; a boss wave's real piece (an old run's simple one, same slot); the
fresh boost over the lasting kit, the lasting piece not worn, the find's wear, the end putting it on for real; bare runs; Equip best;
merges leave finds alone; only this run's finds upgrade (the road's temper never touches the lasting kit); the stash, cart and sale;
the auto half rate; old runs coming home; the merchant's price and the forge's grade; the cart read back. Tests that checked the
simple gear of a new run now read the pack; tests of the old rules mark their run as saved before (`delete run.real`).

## Checks

`npm run typecheck`; the full `npm test` (2,210 tests after merging main 0.319.0 and the army retune, all passed); `npm run web`; the pack and the Found row at 393x852, 360x780 and
412x915 through `node tools/run-gear/shots.mjs`, with no page errors. The balance runs are above.

## Left for later

- The between-waves line when a piece breaks and a find waits in the pack ("Kenji's Runed Blade broke. A Frostbrand waits in the pack.").
- The red "full" tag on the camp's cart (the stall's Sell tab says it for now) and the auto-replay recap's list of finds by run.
- The equipment panel's "n / 150" (the pack and the stall show it).
- `gear.ts` and the old-run paths can go a few releases on, once no saved run is on the old rules.
