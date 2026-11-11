# RANKUP-LAYOUT: the Rank up card's stats, one row each

The owner: "The rank up screen showing the stats increase needs to be fixed. It's stacked weird." No shot came with it, so it was
reproduced first (`docs/samples/rankup-layout/before-*.png`).

## What was wrong

The Rank up card (`rankUpView.ts`; the Awakening card is the same card) listed its stats as a flat run of cells: for each stat a name,
the old value, an arrow and the new value, twelve cells in a row for Rank, Hp and Attack. `awaken.css` laid them on a four-column
grid, which made three rows of them.

A later restyle (`ornateMenus.css`, section 8) set the same box, `.ruStats`, to `display: flex; flex-direction: column`, written for
a different markup (`.ruStats > div` rows) that the card never had. A column of flex items puts every cell on a line of its own. So
the card read, centred, top to bottom: "Rank", "★★★☆", "→", "★★★★", "Hp", "2552", "→", "2866", "Attack", "161", "→", "174". Nothing
tied a value to its name, the arrows stood alone, and there was no gain shown. The scores ("STR 26 → 27 · CON 21 → 22") and what they
did sat under the box as two centred lines of running text.

It was the same at every size, every rank and every level; no number or name was needed to break it.

## The screens that show stats going up

- **The Rank up and Awakening card** (`rankUpView.ts`): opened from a hero's sheet (the Rank up badge, the Awakening panel's
  button) and from the Heroes tab's "Upgrade". This was the broken one.
- **The after-battle recap's level-up lines** (`jrpgRecapView.ts`, `.jrGrowth`): LV, HP, ATK and the scores a hero's levels raised.
  They were chips that wrapped where they fell (two or three to a line), each whole in itself but in no columns.
- The tavern's **Upgrades list** and its "Upgrade all" confirm (`rankUpList.ts`) show no stats: a hero's row says "Rank 1 → 2" and
  what it was earned with, and the confirm counts the ranks. Each hero is already one row in line with the others; left as it was.
- A tome's level-up (`tomeView.ts`) shows "+N% HP" chips, not before and after; left as it was.
- The old wave card's `#xp .xprow` (still styled in `index.html`) is no longer built by anything.

## The fix

**The stat rows** (`src/statRows.ts`, styled in `ornateMenus.css` section 25). One stat is one row of five cells: its icon and name
on the left, the old value, an arrow, the new value (bright), and the gain (+N, in the gain green). The rows share the table's
columns (`subgrid`, with fixed columns for a browser without it), numbers right-aligned in tabular figures, and no cell wraps.

**The card** is now a standard ornate menu (`ornateMenu`, id `rankUp`), top to bottom:

1. the header: "Rank up" or "Awakening", the hero's name, its class and level;
2. the look, and the new look beside it when the step changes it;
3. the rank's marks, old to new (the stars, and the awakening's gems);
4. what the step gives: the passive an awakening wakes, the new look, and what each raised score's new modifier does;
5. "Stats, before and after": Health, Attack, each score raised, and each figure moved (AC, To hit, Skill DC, the saves), a row each;
6. what earned it (the shards);
7. the footer: Close, and Rank up or Awaken.

Health and Attack wear the game's heart and crossed swords (`src/art/ui/`); the other rows a small brass pip.

The figures came from `stepPlan` only as words ("AC 15 → 16"); it now gives them as numbers too (`figureSteps`, `sim/rankStep.ts`), so
each can have its row and its gain. `test/rankup-scores.test.ts` checks they say the same as the words, one for one.

Back and Escape close the card as any standard menu (`.omVeil` in `BACK_LAYERS`; the card's own `.ruBack` entry is gone with the
class). A tap outside the card still closes it and changes nothing. There was no count-up animation to keep.

**The recap's level-up lines** take the same columns (`jrpgRecap.css`): each hero's lines are one table (name, old, arrow, new, gain;
a score's note in the room on the right), in place of the wrapping chips. The markup is unchanged.

## The check

```bash
npm run web && node tools/rankup-layout/check.mjs          # exits 1 on a failed check
SIZES=412x915 node tools/rankup-layout/check.mjs before    # one size; the word names the shots
```

At 412x915, 393x852 and 360x780 it opens the card for: rank 1 to 2 on a short name at level 1 (Vuk) and a long name at a high level
(Kurogane), the top rank with four-digit stats, the first rank at level 1, and an awakening at a high level and at level 1. For each it
asserts that every stat row's cells share one line and read left to right, that none wraps or is cut, that the columns line up down
the card (names' left edges; the old values', new values' and gains' right edges), and that the card is inside the screen. It opens
the Upgrades list with several heroes ready and its "Upgrade all" confirm. The recap's lines get the same assertions on the page's own
stylesheet, with the markup the recap builds put on the page by the check (a real run to a level-up was not played).

Before the fix every card fails (stacked, out of order, columns off) and the recap's lines fail on columns; after it all pass.

Shots: `docs/samples/rankup-layout/` (`before-*` and `after-*`, each scene at each size).
