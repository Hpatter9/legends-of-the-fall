# Skills overhaul, batch 9: the books

The design is [skills-overhaul-design.md](skills-overhaul-design.md) (section 5, "Skill books share it"; section 11 item 9). The books as
built are in [shop-books-gear.md](shop-books-gear.md); skill levels by use in [skills-5.md](skills-5.md).

## What changed

- **Three slots from the start.** `Meta.loadout[kind]` is now one pick per slot of the hero's kit (`own1`, `own2`, `own3`, or a book's id).
  Any known skill sits in any slot; a skill already in another slot trades places, so none sits in two. Slot 3 opens at level 20 like the hero's
  own third skill (`SLOT_LEVELS`). A loadout of the kit's own three, in order, is dropped, so a hero that never chose fights exactly as before.
  `setSlot` takes slot 1, 2 or 3; `ownPicks(kind)` lists a kind's own picks; `kitWithLoadout` builds all three slots (`s1`, `s2`, `s3` the
  same objects as `slots`). `EquipStats.book` and `Unit.book` are arrays of any length now.
- **A learned skill levels by use like any other.** It earns and is read under its own key for the reader (`skillUse[kind][key]`, as batch 5
  built), wherever it sits; a Barbarian's Whirlwind and a Samurai's learned one are apart; moving it between slots keeps the level. The
  fight builds it at its level (`kitWithLevels`) with the cost, cooldown, durations and Level 5 step of the levels table. Nothing of the books'
  mastery ranks is left: the ranks were never built (`books.ts` said they were left out for this batch), so there is no second counter.
- **Cost and cooldown follow the classes for the reader's pool.** A book's skill keeps its class (`Slot.cls`) and its cooldown (the class's
  cooldown range is the same in both pools). Its cost is its place in the class's range moved to the reader's pool (`costForPool`): a Strike
  at the top of the stamina range is at the top of the mana range. Same pool (the common case) leaves the cost exactly as the source's; a
  stamina skill read by a mana hero (or the other way) is re-costed, where before it was the same share of the pool. A test checks every book
  on readers of both pools sits inside the range of its class. The revive face still stays with its own hero.
- **Room for Legendary books.** `BookDef.from.slot` may be 1, 2 or 3, and `bookSource(book)` in `books.ts` is the one place that says which
  slot a book teaches; `slotFor` reads only it, `BookDef.tune` and the class ranges. A lost technique added as data (with a `tune` up to the
  design's two points above the band) needs no change to the slots, levels or saves.
- **The hero sheet** (`src/skillBookView.ts`): three slot rows (one column at phone width, "opens at level 20" for the third), the picker
  for slots 1 to 3 showing each skill's cost, cooldown and level line, and "A skill keeps its level wherever it sits". The Skills tab's
  cards already follow the kit, so they list the book skill in whichever slot it sits. The stall's book page reads `bookSource`.

## Old saves

- `Meta.loadout` entries from before have two picks. `readBooks` keeps them and makes the entry whole: the third slot takes the kit's own skill 3
  (so `[whirlingStep, own1]` becomes `[whirlingStep, own1, own3]`; if own 3 was somehow already used, the first skill left out). An entry
  that comes out as the kit's own three is dropped. Nothing is lost: every learned book stays learned.
- **Mastery:** the books' mastery ranks (by casts) were never built, so a save holds no cast counts to fold in. A learned book therefore starts
  at Level 1 with no use points, like every skill (the owner's answer to batch 5: no head start). If the owner wants learned books to start with
  a gift of points, it is one line in `readBooks` (a question below).

## Tests

`test/books.test.ts` (updated and extended): three slots with swaps, a book in slot 3 and back to own dropping the loadout; every book on
readers of both pools inside its class's cost range with the source's class and cooldown; `costForPool` at the range's ends; the kit
building three slots; the boost carrying three picks; every book castable in each of the three slots without a fault; saves (a two-pick
loadout padded, nonsense dropped, own-three dropped); a learned book levelling under its own key per reader, in any slot, at its level's
cost and strength; a level 4 book in slot 3 fighting.

## Checks

`npm run typecheck`; `npm test -- books skill-levels`; the full `npm test`; `npm run web`; `node tools/skills/bookShots.mjs` (393x852, writes
`out/skills-9/slots.png` and `picker.png`). No identity hash moved: no fight in the identity scenarios has a loadout.

## Questions for the owner

1. Should books learned before this batch start with some use points (the old mastery never existed, so there is nothing to convert)?
2. Slot 1 can now hold a book skill while the hero's own skill 3 sits in slot 2, which is allowed; should the picker warn when a healer's
   revive skill leaves slot 2 (it does for own skill 2 only, as before)?
