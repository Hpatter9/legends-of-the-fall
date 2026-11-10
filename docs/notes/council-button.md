# Council button: a pair with the Daily

The owner, on 0.460.0: "The council button could use a look at visually." The Council's place on the Battle tab (the Battle Overlook,
`drawBattle` in `src/home.ts`) stands over the Daily's at the scene's right edge. 0.457.0 put its label back under its medallion
(`docs/notes/battle-pick-fix.md`), but the two plates still did not match. Pictures: `docs/samples/council-button/`.
- `pair-before-after-<size>.jpg` shows the pair at 393 x 852, 360 x 780 and 412 x 915: before on the top row, after under it. Its columns,
  left to right: members named, the Muster open, before the War opens, a quest tracked, Continue showing, pressed, the Daily cleared.
- `before-*-393.jpg` and `after-*-393.jpg` show the whole Battle tab: as it stands, with a quest tracked, and with Continue showing.

## What was off

- **The label.** "Council" was lavender (`#e6c9f2`) and the Daily's gold (`#dbc18b`), both 12 px bold with 0.06 em spacing. At that size
  "Council" is 45 px across, on a 58 px plate whose painted frame takes about 5 px each side, so it ran onto the frame. "Daily" is 31 px.
- **The count.** The members named were a flat purple circle with a pale ring (`nemesis.css`): drawn by CSS, not painted. The Daily's
  mark is the painted red seal. In the Muster's gold the circle was flat gold.
- **The corner marks** stood 5 to 7 px past the plates' right edge, at the scene's edge, so a sliver of the Daily's seal (and of the
  Council's circle) was cut off by the screen.
- **The press.** The Daily brightens when pressed; the Council did not.

The medallions already match. The Council's (the throne between its candles on red) is a painted cell of the same camp sheet as the
Daily's chest (`art-source/ui/buttons/camp.png`, cut to `ui/buttons/council.webp` and `daily.webp`, each 96 px), drawn at the same 38 px.
So no new art is needed, and there is no prompt.

## The change (`src/paintedButtons.css`, after the two plaques' rule)

- **One plate for both.** Both are 64 px wide (`max(100%, 64px)`, still standing on the slot's right edge, so they grow leftwards) with the
  same padding, 5 px 7 px 4 px.
- **One label style for both**, at 11 px with 0.04 em spacing: "Council" is 40 px across, inside its frame with room each side, and
  "Daily" 27 px.
  - The Council's label is the Daily's gold. The Daily's green, once it is cleared, is kept.
- **The painted count seal** (`ui/buttons/badge-count.webp`, the tabs' number seal from `tabs.png`) carries the members named, at 24 px,
  the tabs' own size and figure. With the Muster open, the number turns gold and the seal glows in the warchief's gold. Steady, with no
  pulse, so reduced motion has nothing to stop.
- **The corner marks are kept on the screen.** The count seal stands 3 px past the plate's edge and the Daily's seal and tick 2 to 3 px, all
  whole at every size.
- **The same press:** the Council brightens when pressed, as the Daily does.

The Council has no disabled state: before the War opens its slot is hidden (`councilSlot.hidden`), so only the Daily stands. That state
is pictured too.

## Checks

- `npm run typecheck`: clean.
- `npm test`: the full suite, 3050 pass.
- `npm run web`: builds.
- The pair looked at at 393 x 852, 360 x 780 and 412 x 915 (`docs/samples/council-button/`), each before and after:
  - the Council with members named;
  - with the Muster open;
  - before the War opens (the Council hidden);
  - with a quest tracked;
  - with Continue showing;
  - pressed;
  - the Daily cleared.
