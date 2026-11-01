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

BALANCE_PLACEHOLDER

## Tests

`test/run-gear.test.ts`: every mode's new run is a real-gear run, and a find leaves its stream where the simple gear did (same slot,
and `findSlotGear` draws nothing); the grade table and item level; a boss wave's real piece (an old run's simple one, same slot); the
fresh boost over the lasting kit, the lasting piece not worn, the find's wear, the end putting it on for real; bare runs; Equip best;
merges leave finds alone; only this run's finds upgrade (the road's temper never touches the lasting kit); the stash, cart and sale;
the auto half rate; old runs coming home; the merchant's price and the forge's grade; the cart read back. Tests that checked the
simple gear of a new run now read the pack; tests of the old rules mark their run as saved before (`delete run.real`).

## Left for later

- The between-waves line when a piece breaks and a find waits in the pack ("Kenji's Runed Blade broke. A Frostbrand waits in the pack.").
- The red "full" tag on the camp's cart (the stall's Sell tab says it for now) and the auto-replay recap's list of finds by run.
- The equipment panel's "n / 150" (the pack and the stall show it).
- `gear.ts` and the old-run paths can go a few releases on, once no saved run is on the old rules.
