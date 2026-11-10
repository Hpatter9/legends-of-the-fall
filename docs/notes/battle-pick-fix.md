# Battle pick fix: the way to choose a battle, always whole

The owner, on 0.453.0: "The choose a battle forms show up sometimes", with a screenshot from their phone (about 412 wide; Armies 3/9, 15
stars, Spring). The shot showed:

- the Battle Overlook with the enemy's plaque, its last line cut short ("Elder-root stronghold · Grove Spearl…");
- the Council and the Daily on the right, the Council's label under its medallion;
- the tracked quest's chip under the scene;
- only the thin top edge of a gold-framed panel above the nav bar.

Pictures: `docs/samples/battle-pick-fix/`. The check: `tools/battle-pick-fix/check.mjs`.

## What the forms are

The Battle tab (`drawBattle` in `src/home.ts`) has one way in to the battles: the bar under the painted scene (`.hmFront`). It holds, top to
bottom:

- the new army's line ("Next army · Lv 22 · ★ 0/11"), on the first visit while that army is current (`announceArmy`, `src/armyShown.ts`);
- the tracked quest's chip;
- **Choose your battle**, the button that opens the Armies screen;
- Continue, under it, while a run is going.

The bar's height is fixed by `--hmBar` (`ornateMenus.css`), one height for each shape: with or without the army's line, with or without
Continue. The scene above stops that far from the bottom (`.cpWrap`'s `bottom`).

## The cause

The tracked quest's chip was set out (QUESTS, `quests.css`) as a slim 28 px chip sitting absolutely in the bar's top right corner, beside
the army's line, taking no room of its own.

PAINTED-BUTTONS then gave it its painted chip (`#hmQuest`, `paintedButtons.css`) with `position: relative` and a 44 px height. That rule is
by id, so it wins: the chip stood in the bar's flow as a 44 px row. But the bar's heights were never grown for it. So whenever a quest was
tracked, Choose your battle (and Continue, during a run) was pushed about 41 px down, under the nav bar, and only its top edge showed. That
is the sliver in the owner's shot.

The "sometimes" is the quest. The button was missing while a quest was tracked, and whole while none was: with none taken, or between
handing one in and taking the next. It was so at every size, on a first visit and on every visit after, back from another tab, back from a
fight, and with reduced motion. The new army's line (only on a first visit) made the bar 22 px taller, and that was not enough to make room.

## The fixes

1. **The bar grows by the chip's row.**
   - With a quest tracked, the bar takes 48 px more (the chip and its gap) in each of its four shapes.
   - The chip is set in the flow on purpose, centred, with the army's line above it centred again.
   - (`ornateMenus.css`, after the bar's own heights)
2. **The Council's label sits under its medallion.**
   - A rule of the Council's place in `nemesis.css` had lost its first line (its `::before`'s selector) when the file came in. Its
     declarations stood bare, and the browser read them with the next rule's selector as one broken selector, and dropped both.
   - The dropped rule was the label's own (`position: static` and the rest). The label kept the plain plate's absolute place and box, over
     the medallion, with an empty frame round it.
   - The lost line is put back: the Daily's socket, in the Council's violet. The painted plaque takes it away again, as it does the Daily's.
   - The Daily was right all along. In the owner's shot it only looked crowded beside the Council's broken box.
3. **The enemy's plaque shows its whole line.**
   - The camp-and-lord line was cut short with an ellipsis at every phone size.
   - It now wraps at the dot between the camp and its lord, each kept whole, with room inside the painted frame (its frame is 14 px deep and
     is drawn over the padding).
   - The plate was already set higher by its own height (`layPlate`), so it still clears the bar.

## The checks

- `tools/battle-pick-fix/check.mjs` plays the owner's save: three armies cleared, the Wildwood next, the War open, the Old Hunger quest
  tracked.
- It opens it in each state:
  - the first visit;
  - the next visit;
  - back from another tab;
  - with a run going (Continue);
  - with no quest;
  - with reduced motion.
- It runs at 393 x 852, 360 x 780, 412 x 915, 412 x 780 (a 915 phone with the browser's bars), 412 x 1000 and 360 x 640.
- It checks that:
  - the bar, Choose your battle, the chip and Continue are whole, inside the bar and above the nav bar;
  - nothing in the bar is taller than the bar;
  - the Council's and the Daily's labels are clear of their medallions and inside their buttons;
  - the plaque cuts no line short.
- Before the fixes it failed in every state with a quest tracked, at every size. After, every check passes.
- `test/css-orphans.test.ts` reads every stylesheet the page is built from for a declaration outside a rule. It finds the Council's lost line
  in the old `nemesis.css`, and no other.

## The other leads

- **The new army's line.** Played: the first visit (line up) and the next (line gone). With a quest tracked the button was cut on both;
  with none it was whole on both. So the line changes how far the button is cut, not whether it is.
- **Coming back from another tab, from a fight, and reduced motion.** Played: the bar is drawn the same each time.
- **The toast queue (0.449.0).** Not played, but read: it holds toasts back only while a card or sheet is open, and holds nothing on the
  bar.
- **The Assault unlocking.** Not played, but read: it adds nothing to the Battle tab's bar.

## Run

- `npm run typecheck`: clean.
- `npm test` (the full suite): 3,026 pass, none fail.
- `npm run web`: builds.
- `node tools/battle-pick-fix/check.mjs`: all checks pass (before the fixes: every state with a quest tracked failed, at every size).
