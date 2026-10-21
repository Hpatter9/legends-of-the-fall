# The first-run tips

A short guided first run. Each tip shows once, when its moment comes, as a speech bubble (`src/tips.ts`): a tail
points at the thing it talks about, that element is lit (an outline) when it is a page element, and a "Got it"
button closes it. A bubble takes taps only on its own card, so the game is never held up. Tips wait in a queue, one
at a time, for the page they belong to (the home screen, or the game under no recruit page or result).

| Tip | When | Points at |
|---|---|---|
| `home` | the home screen opens and it is not seen | New run |
| `deploy` | the deploy screen, first time | the blue tiles (the bubble sits above them) |
| `fight` | a hero is placed | Fight! |
| `mana` | the king's mana first reaches 3 in a fight | the spell cards |
| `skill` | a hero's skill charge first fills | that hero on the board |
| `summon` | the deploy screen after the first win (stage 2 on) | Summon |
| `crowns` | the home screen after a run ends | the menu |

- "Skip tutorial" shows only on the first card ever shown; it marks every tip seen.
- The seen tips are kept in `localStorage` under `legends.tips`. "Reset tips" (bottom of the Castle page) clears it,
  so the tips come back as their moments do.
- The store and the placing (`loadSeen`, `saveSeen`, `placeBubble`) are pure and take their storage as an argument;
  `test/tips.test.ts` runs them. The page parts touch the DOM only when used, so the tests never load the page.
- Placing: above the anchor, else below, else right, else left, the first that fits on the screen with a gap, so the
  bubble never covers what it points at.
- Hooks: `home.ts` offers the home tips in `open()` and wires the Reset button; `main.ts` calls `tips.update()` each
  frame, `tips.atDeploy` in `refresh()`, offers the `mana` and `skill` tips in `refreshSpells()`, and gives the
  deploy tiles' and a fighter's boxes (`deployBox`, `spriteBox`).
- Markup and CSS: `#tip` in `src/index.html`, beside `#loading`.

Checked in a browser at 393x852 and 852x393 (the walkthrough in the session): each bubble on the screen, clear of its
anchor, the skip path, and reset.
