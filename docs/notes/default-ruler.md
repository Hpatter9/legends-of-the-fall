# The default ruler (DEFAULT-RULER)

The owner: "Use the new king artwork we made. Default to the regal male one."

## What changed

- **The Iron Stag (`iron_stag`, "The Veteran") is the default ruler**: `DEFAULT_RULER`, first in the picker, and where a missing
  or invalid choice falls back (`rulerOf`).
- **The King is retired.** He is gone from `RULERS` (so from the picker, settings and every `Record<RulerId, ...>`), but `rulerOf`
  still reads the old id (`RETIRED_RULER = 'the_king'`) as the Iron Stag. `parseSettings` therefore loads a save that chose
  `the_king` as `iron_stag`, quietly, keeping every other setting. The earlier "a saved Iron Stag that was never picked becomes The
  King" rule is gone: a saved Iron Stag stays the Iron Stag. `rulerPicked` is still written and read, harmlessly.
- **Wording:** every place that names the player's ruler already goes through `rulerOf(...).name` and `rulerWords` (castle plaque,
  Last Stand bar, cinematics, quest cards, quips). One left over said "The King" by name: the Last Stand's pause sheet
  (`standView.ts`), now the ruler's name. Generic "the king" in tips and quips stays: the Iron Stag is a king, and `rulerWords`
  still turns it to "queen" for a woman. The castle's "The King Decrees!" and "For the King!" already follow the ruler's sex.
- **Places that show the ruler:** castle throne, Last Stand hall and its empty throne, cinematics, codex and quest cards all draw from
  the chosen ruler already; with The King gone, the Iron Stag's throne cell is no longer borrowed for him (`rulerArt.ts`).
  The starter pick shows no ruler (nothing to change).
- **Loading screen: left alone.** It is a painted still (`loading/last-keep.webp`) embedded into the cached page before any code or
  setting is read, so it cannot follow the ruler.

## Removed

- `src/art/rulers/the_king.png`, `src/art/throne/king_throne.png` (only The King's atlas and the old castle used it; nothing loads it
  now), `tools/rulers/the-king.py`. `CREDITS.md` updated. `tools/rulers/check.mjs` and the seat scripts no longer list The King.
- `tools/stand/mock/prep.py` and `shots2.mjs` (an old design mock) still name `king_throne.png`; they are not part of the build and were
  left as a record.

## Kept: `stand_king` (the old Himeko sheet)

The sim's `standKing` unit still points at `stand_king.png`. Every screen that draws the player's king uses the ruler art, but the
unit is also read by generic sheet consumers (codex, army and camp views, unit portraits), so drawing it from the ruler's atlas would
mean a new sheet type in all of them. Not worth it: the file stays, and so does its CREDITS entry.

## Tests

Updated to the owner's new choice: `test/rulers.test.ts` (default, first in picker, nine to eight rulers, The King's seat-frame
test removed) and `test/settings.test.ts` (defaults and fallbacks are the Iron Stag; the old "Iron Stag moves to The King" test
removed). New: a saved `the_king` loads as `iron_stag` and keeps the other settings, picked or not.

Shots (393x852, a save that chose `the_king`): `docs/samples/default-ruler-castle-393x852.png`, `default-ruler-stand-393x852.png`.
