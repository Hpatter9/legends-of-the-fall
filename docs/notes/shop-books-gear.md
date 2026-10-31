# Hester's Stall, skill books and gear that wears (SHOP-BOOKS-GEAR)

The owner approved the design in [books-shop-gear-design.md](https://github.com/Hpatter9/legends-of-the-fall/blob/claude/shop-books-design/docs/notes/books-shop-gear-design.md)
(branch `claude/shop-books-design`). This branch, `claude/shop-books-gear`, builds its batches 1 to 3, 5 to 8 and the art; what is left
for later is at the end. Every new save field is optional; the save version is not bumped. Screenshots: `docs/samples/shop-*.png`
(393x852, and `-360x780`, `-412x915`), made by `node tools/shop/shots.mjs` after `npm run web`.

## Hester's Stall

- **Where:** a new place on the camp's overlook (`overlookLayout.ts` `places.stall`, `STALL`): the painted stall on the ledge at the
  left, over the fire and the chests, with a plate ("Hester's Stall" / "new stock"), and a dot while the day's stock is unseen
  (`newStock`, `markSeen`). The Recruit tab's **Chest shop** button stays as a shortcut: it opens the stall on its Chests tab.
- **The page** (`src/stallView.ts`, `src/stall.css`, classes `hs*`): a full-screen view. The head (back, the name, the standing and
  crowns to the next, the standing's seal, the purse); the close-up (the shelf painting, the better shelf from standing 2, Hester's
  bust and her line in a speech card); six tabs (Books, Gear, Tomes, Chests, Sell, Repair); the tab's shelf, three wares a row on
  painted planks, each with its art in its grade frame, a price tag, "n left", the sold-out ribbon or "Standing 2". A tap brings the
  ware's page up from the bottom: a book's history, the skill it teaches, the study length and the strip of owned readers ("knows
  it" greyed); a piece's stats, ability and durability; a tome's XP; **Buy · price** with the reason when greyed.
- **The rules** (`src/sim/stall.ts`): the stock is drawn once a day from `mixSeed(m.seed, STALL_SALT, day)` (the page passes
  `todayKey()`), everything drawn whatever the standing, so a reload never rerolls and a new standing opens wares already there.
  Books: two Common, then two Uncommon (standings 2 and 3), only books at least one owned hero could read; a Common may come as two
  copies. Gear: one piece a slot, Common or Rare; one of the three Epic (standing 2), another Legendary (standing 3); item level
  `1 + 3 x shopArmyIndex` (`stallLevel`). Tomes: 3 small (150), 1 medium (2,000, standing 2), 1 large (7,000, standing 3). The chest
  shop is unchanged (`chestShop.ts`, its own record and stream); `shopView.ts` now exports its cards (`chestShopCards`) for the tab.
- **Prices:** books `BOOK_PRICE` (Common 350, Uncommon 900) x `(1 + 0.25 x shopArmyIndex)`, to 10; gear `GEAR_PRICE` (80, 200,
  600, 1,500) x `(1 + 0.04 x (level - 1))`, to 10.
- **Standing** (`STANDINGS`, `standingOf`): the crowns spent at the stall (`Meta.stall.spent`): buying and repairs count; selling
  and buying back do not. 1 a known face, 2 a valued customer at 4,000, 3 a trusted friend at 20,000. A new standing gives
  Hester's standing line (`STANDING_LINES`).
- **Hester's lines** (`hesterLine`): one on opening and one a tab, from `mixSeed(m.seed, LINE_SALT, day, tab)`, so a reload says the
  same; a line after a purchase, sale or repair.
- **Save:** `Meta.stall?: { day, sold, spent, seen?, soldToday? }` (`readStall`).

## Selling

- **Sell replaces Salvage** (`equipment.ts` `sellPrice`; `salvageItem` pays it): `(SALVAGE_CROWNS[grade] + level - 1) x condition`,
  rounded down, at least 1, condition `0.8 + 0.2 x durability left / max`. A full piece pays exactly what salvage did.
- The hero sheet's picker shows **Sell +n** (an Epic or better, or the last of a base, asks by a second tap); the stall's **Sell** tab
  lists the spare gear (filters All, Common, Rare, Epic+, Books) and spare books, **Sell all Commons** (`bulkCommons`: never the last
  of a base nor a piece of a set a hero wears; one confirm), and the **Sold today** shelf (the last 10 sold, bought back at exactly
  the price paid until midnight; `buyBack` keeps the piece's id and wear).
- **Books** sell for a fifth of the shelf price (Common, Uncommon), a Rare for 400 (`bookSellPrice`); a Legendary never.
- **No crowns loop** (`test/stall.test.ts`): the stall's price is at least 5 times the sale price at every grade and level; mending a
  piece never earns more than it costs when sold (at best it breaks even at one point of wear, with or without the Armoury); three
  bought pieces combined sell for less than they cost.

## Gear that wears

- **The rules** (`src/sim/wear.ts`; `DUR`, `maxDurability` and `brokenPiece` live in `equipment.ts`): `Equipment.wear?` is the
  points lost (missing is full, so every old piece is whole). Durability `DUR[grade] + level` (Common 30 to Mythic 90; 31 to 110).
  `settleWear` after each wave: every piece worn by a hero placed on the board loses 1, won or lost; a hero that fell loses 1 more on
  its armour; auto-replay waves at half (`AUTO_WEAR`, kept in halves). Benched heroes lose nothing; runs whose heroes start bare (the
  spire, the Calamity: `run.local`) do not wear the lasting kit. The Last Stand wears each wave its guard fought, once at its end.
- **States:** good; **worn** at 25% or less (`WORN_AT`): full strength still (the owner's decision), amber bar and badge; **broken**
  at nothing: `equipStats` skips it (no stats, ability or set count), `bestFor` passes it over (a broken piece worn scores nothing).
  Nothing is destroyed. Combining makes a fresh piece.
- **Repair** (`repairCost`): `REPAIR[grade] x (1 + 0.04 x (level - 1)) x points`, rounded up, at least 1, less 4% a level of the
  Armoury (`ARMOURY_REPAIR_CUT`, up to 28% at 7; the Armoury's card and line say so). Always to full. From the stall's Repair tab
  (worn by party heroes first, then other heroes, then spares; **Repair all** for what the heroes wear, asking above 500), from the
  picker's **Repair · n**, and from the party screen's amber strip ("1 piece worn, 2 broken · Repair all · 45"). Start is never
  blocked; nothing repairs on its own or mid-run.
- **On the page:** `itemIcon` gains `wearMarks` (a 4 px bar along the foot, green, amber or red; the worn or broken badge; a broken
  piece greyed under the cracks), the picker's "Durability 12/62 · Worn" line, and the short wave card's "Kwame's Runed Blade broke".

## Skill books

- **The catalogue** (`src/sim/bookData.ts`): the design's 19 books (Common to Rare), each teaching an existing hero's skill 1 or 2
  (`from`), with its title, kind, rarity and history. **Who reads what** is one table, `READS`: 22 heroes read Manuals, 5 Grimoires,
  8 Hymnals, 10 Bestiaries, and everyone reads the Universal books (the owner's decision: one kind each).
- **Study** (`src/sim/books.ts`): a hero reads a book from its sheet (`startStudy`; the copy leaves the bag). Each wave it fights in
  (placed when the wave settles, won or lost, in any mode: `settleStudy`, hooked beside the XP in `main.ts` and at the Last Stand's
  end) is a fight of study. Lengths `STUDY`: Common 5, Uncommon 8, Rare 12, Legendary 20, less 8% a Library level (rounded up);
  students at once: 1, 2 from Library 1, 3 from 3, 4 at 5 (`studentCap`). Putting a book down, or changing books, sends it back to
  the bag with its progress kept (`Meta.studyKept`). Done: the skill joins the kind's skill book (`Meta.learned`), and the wave card
  says "Kwame learned Whirlwind" (and "Kwame: Whirlwind, 2 fights left" before).
- **The two slots** (`setSlot`, `Meta.loadout`): either slot takes any skill the kind knows, its own two or learned; one skill never
  sits in both (they trade places); back to its own two drops the loadout. Free, at camp, as often as wanted; the ultimate is never
  touched. Slot 2 still opens at level 10.
- **In a fight:** `heroStats` puts the loadout on the boost (`EquipStats.book`), `addUnit` keeps it on the unit (`Unit.book`), and
  `heroKitOf` builds the kit from it (`kitWithLoadout`, cached). A book's slot (`slotFor`) is the source skill's slot with its cost the
  same share of the reader's pool, its strength the source's (times the book's `tune`, unset for now), and no revive face (a healer's
  revive stays with its own skill 2; the picker says so). A hero with no loadout gets no `book` and fights exactly as before.
  Nothing new draws from a fight's streams. Tier skills' talent modifiers still apply whatever sits in slot 1.
- **No mastery ranks** (left out on purpose): a coming skills overhaul gives every skill levels by use, so the books' learned skills
  are kept simple; `mastery-1..3` art is not imported.
- **Found books:** a silver chest holds a Rare book one time in twenty, a gold or Mythic about one in seven, and an army's first
  clear on Hard or above always (`chestBook`, from `mixSeed(chestSeed, BOOK_SALT)`, so every chest's other contents roll as before);
  the stall's silver and gold chests too. The chest reveal shows the cover; Open all counts "Books found" (`LootSummary.books`).
- **On the page:** the hero sheet's Skills tab opens with the **Skill book** panel (`src/skillBookView.ts`, classes `kb*`): the two
  slots (a tap opens the picker of every known skill), the study with its bar and "Put it down", and **Read a book** (the unread books
  this hero could read, the Library's room for students). The skill cards below follow the chosen slots.
- **Saves:** `Meta.books?`, `learned?`, `study?`, `studyKept?`, `loadout?` (`readBooks` drops unknown books, books a kind cannot
  read, studies of a known skill, loadouts naming unknown skills or one skill twice).

## Art

The books-and-shop paintings of PR #240 (with PR #243's repaints of Hester, the stall, the Manual and Bestiary covers and the first
seal) and the wear and selling pieces of the painted gear set, only those used, in `art-source/books-shop/` and
`art-source/gear/wear/`, sized to WebP in `src/art/shop/` by `python3 tools/shop/import-shop-art.py`, loaded by URL (`shop/...`,
`bookArt.ts` `shopArt`) and listed for offline play in `build.mjs`. A book's cover sits in the gear's grade frame
(`gearIcons.ts` `paintGradeFrame`): Common grey, Uncommon blue, Rare violet. Credited in `CREDITS.md`.

## Tests

`test/stall.test.ts` (stock, standing, buying, repairs counting, selling and salvage, Sold today, bulk, books, the no-loop
inequalities, saves), `test/wear.test.ts` (wear by wave, fall and auto, states, broken gives nothing, Equip best, repair prices,
Repair all, old saves, combining), `test/books.test.ts` (who reads what, study, putting down, the library, slots, the book slot's
cost and revive, the loadout on the boost, every book cast by its readers in either slot, saves, found books).
The wave card's wear and study lines are in `test/wear.test.ts`. `test/castleScene.test.ts`'s Armoury line was updated for the owner's decision (repairs 4% cheaper a level).

## Left for later

- **Real gear in runs** (the design's batch 4: `fieldPiece` in every source, the pack of real pieces, the field boost, the stash cap
  and the cart, the Found row, old runs finishing on the old rules) and its balance pass: a large change to every run's strength that
  needs the balance tools taught real finds first. Runs still hand out their simple gear.
- **The caravan** (Rustam Saffar, weekly) and **the Gloaming Dealer** (after a guardian falls), their tabs and portraits (the art is
  in PR #240 and not imported yet), and the **lost techniques** (Legendary books, quest chains and battles).
- **Book balance:** a `--books` switch on the balance tool and tuning each book's `tune` into the kits' band; for now a book skill
  is its source's strength, re-costed for the reader's pool.
- **Mastery:** replaced by the coming skills overhaul (skill levels by use for every skill).
- Smaller: the "learned" card's own art on the recap (the wave card has the line), `gear-balance --wear` (the modelled month's
  upkeep), the bulk **Sell all Rares**, and a run's snapshot of the loadout (a loadout changed between a run's waves applies from
  the next wave).

## Checks

`npm run typecheck`; `npm run web`; the full `npm test` on the branch before its last fix (1,845 tests, 1,844 passed: a gold chest's
Rare book was counted with the spell scrolls in Open all's summary, which `spell-sources.test.ts` caught; books now have their own
`LootSummary.books`), then `npm test -- spell-sources wear books armyStars chest summon-stones` (68 passed) after it. The page at
393x852, 360x780 and 412x915 through `tools/shop/shots.mjs`, with no page errors.
