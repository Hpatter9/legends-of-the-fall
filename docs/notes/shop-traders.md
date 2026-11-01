# The visiting traders (SHOP-TRADERS)

Built from the "Visiting traders" part of [books-shop-gear-design.md](https://github.com/Hpatter9/legends-of-the-fall/blob/claude/shop-books-design/docs/notes/books-shop-gear-design.md),
on top of Hester's Stall ([shop-books-gear.md](shop-books-gear.md)). Rules in `src/sim/traders.ts`; the page is `src/stallView.ts`
(two more tabs when they are here). Screenshots (393x852): `docs/samples/shop-caravan.png`, `shop-gloaming.png`,
`shop-gloaming-page.png`, `shop-traders-camp.png` (`node tools/shop/shots-traders.mjs` after `npm run web`).

## Rustam Saffar, the caravan master

- **When:** one weekday a week, the save's own (`mixSeed(seed, CARAVAN_SALT) % 7`, Monday 0), so saves meet him on different days.
  A **Caravan** tab joins the row for the day and the camp plate reads "Caravan today".
- **Stock** (from `mixSeed(seed, CARAVAN_SALT, week)`: the same all week, new each Monday): one **Rare book** (standing 2, a book at
  least one owned hero could read), **two Epic pieces** of different slots (the first at standing 1, the second at standing 2), and a
  bundle of **awakening ore** (6 ore of the class of one owned hero, standing 1). One copy of each; sales reset with the week.
- **Prices:** Rare book 2,400, ore bundle 1,500 (both a quarter more for each army on, as Hester's books); Epic pieces at a quarter
  above Hester's price for the same piece (`CARAVAN_GEAR_MARKUP`). Item level is the stall's (`stallLevel`).
- **Lines:** "Saffron, silk, steel, and a book that walked here on its own, my friend!" and others, on opening and after a sale.

## The Gloaming Dealer

- **When:** after a Calamity guardian falls. `settleCalamity` calls `noteGuardians(m, maps)` (the maps cleared are the guardians
  felled): the save counts them (`Meta.stall.guardians`) and marks the Dealer due; the sim has no clock, so the page's next look
  (the camp, or the stall) gives him that day (`gloamingHere`, `Meta.stall.gloaming = day`). A **Gloaming** tab for the rest of the
  day, and the plate reads "Gloaming Dealer". His shelf is Hester's rare shelf under a plain dark gradient (no blur or filter).
- **Stock** (from `mixSeed(seed, GLOAMING_SALT, guardiansFelled)`, so each fall draws afresh): one **universal Rare book** and one
  **Legendary piece at twice the stall's price** (`GLOAMING_GEAR_MARKUP`). He asks for no standing. His book is 2,400 as Rustam's.
- **Lines:** "You came back from the rift. Most don't. Buy something to remember it by." and others.

## Rules shared

- Buying pays crowns, gives the piece, book or ore, and marks the copy sold for that visit (`Meta.stall.trade.{caravan,gloaming}:
  { visit, sold }`; the visit is the week or the guardian count). A trader who is not here sells nothing (reason: "... has gone").
- Their sales **do not count towards Hester's standing** (they are not spent at her stall); the caravan's standing gates use hers.
- Every new save field is optional (`readStall`/`readTrade` drop nonsense); the save version is not bumped. The traders draw from their
  own side streams, so the stall's stock and every fight play out as before. Not gear in runs.
- Art: `caravan-master` and `gloaming-dealer` portraits from PR #240, WebP in `src/art/shop/` (`tools/shop/import-shop-art.py`), copied
  and listed for offline by the existing `shop/` loop in `build.mjs`; credited in `CREDITS.md`.

## Left out on purpose / for the owner

- The Dealer's **chained page** (the Grimoire's lost technique) waits for the lost techniques and their quest chains.
- Prices not in the design (Rare book, ore bundle, the caravan's markup) are my guesses.

## Tests

`test/traders.test.ts`: weekday and week maths, the caravan day (one in seven, spread over saves), the caravan's stock (shape, same
all week, new weekly, its own stream), buying (only on the day, once, reasons, standing gates, ore into the pouch, no standing
credit, weekly reset), the Dealer's coming and stock, the Calamity settle bringing him, lines, saves.
