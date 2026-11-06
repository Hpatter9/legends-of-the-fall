# MENU-POLISH: four fixes to the standard ornate menu

In 0.375.0 ten pop-ups moved onto the standard builder (`docs/notes/int-386.md`). Next to PR #386's own shots the standard was more
ornate but worse in four ways. The owner approved fixing all four in the builder itself (`src/ornateMenu.ts`, section 24 of
`src/ornateMenus.css`), so every standard menu has them.

## 1. A light veil

The veil under a menu was a near-black radial (0.78 to 0.94) with a 5 px blur, so the camp vanished. It is now a light dim (0.42 at the
centre to 0.6 at the edges) with no blur: the page reads through it, dimmed, as in PR #386's shots. The card holds its place in front with a
deeper shadow of its own (a thin dark ring and a 40 px drop shadow added to `--ornate-shadow`). One rule, `.omVeil`, so every card and
sheet gets it.

## 2. The bottom drawer (`kind: 'drawer'`)

A new kind for the builder, `.omDrawer`:
- it slides up from the foot of the screen (`omDrawerUp`, 0.26 s) and stops at two thirds of the screen; its body scrolls;
- it wears the full dress: the crest, the eyebrow, the title and filigree rule, the brass studs in its two top corners, "Close" on the left
  and the green action on the right (it shares the sheet's open-bottomed rim);
- its veil is lighter still and graded, clear at the top and dimmer at the foot, so the page above stays in sight;
- under reduced motion it does not slide (and the veil does not fade).

A ware's page at Hester's Stall (`warePage` in `stallView.ts`) uses it: Hester, her words and the shelf stay in view above it at all three
sizes. A tap above the drawer closes it, as before.

The other sheet on the builder, the March orders, stays a `sheet`: it is a full set of choices that wants the height, not a note over a page.
No other standard menu sits over a page it must keep visible.

## 3. Larger body text

Two tokens on `.om`: `--om-text` 14.5 px (was 13) for wells, notes and the line under a title, and `--om-small` 13 px (was 12) for choice
lines and section-head notes; choice titles go from 14 to 15 px. The bodies' own words inside standard menus step up with them (section 26):
the stall's lines (14.5) and history (15.5), the relic card's text (14.5, its story and set tiers 13, its piece names and rarity 12), the
tome sheet's rows (13) and the talent box's rule (15).

The longest card, "How the altar works", fits at 360x780 without scrolling (36 to 744 px). A ware's drawer at 360x780 scrolls inside itself.

## 4. A larger talent picture

In the talent box the talent's picture is 88 px (in a 5 px pad and its gold frame, about 102 px across), up from 56; PR #386's was about
74 px across. It still sits beside the rule in the well.

## The test

`test/ui-standard.test.ts` has one more test: the builder has the drawer, it slides and stands still under reduced motion, the veil has no
blur and dims no more than 0.6, `--om-text` is at least 14 px, and the stall's ware opens as a drawer. The allow-list is unchanged.

## What ran

- `npm run typecheck`: passes.
- `npm test` (the full suite): 2538 of 2538 pass.
- `npm run web`: builds.
- Shots, `docs/samples/menu-polish/after-<menu>-<393|360|412>.png`:
  - the ten INT-386 dialogs (`OUT=docs/samples/menu-polish node tools/int-386/shots.mjs after`): no tap under 44 px and no text under
    11 px at any size. Compare with `docs/samples/int-386/after-*` (before) and `pr-*`.
  - the March orders over the War Council, the Spell Lectern, a gold chest and Settings (`node tools/menu-polish/shots.mjs after`, harness
    `tools/menu-polish/harness.ts`): none under 44 px or 11 px. The chest and Settings are not on the builder and look as before (the
    script finds no dialog on the Settings page, which is a page, not a dialog).
