# Easier merges by drag (EASY-MERGE)

The owner's ask: "Make it easier to merge heroes when dragging them out. It's too difficult to actually place them."

Before, a drag merged only when the single tile under the held hero's feet was the match's own tile (`mergeTargetAt` in `src/main.ts`),
or when a bench card was exactly under the finger. On a phone the held hero covers its match, the tiles are small and slanted, and a match
standing on a hill is drawn well above its flat tile, so a drop a little off landed on the tile next to it and placed the hero there.
Looks and input only: the sim's merge rules (`src/sim/merge.ts`) are untouched.

## The rule (`src/mergeDropRules.ts`, pure; `test/merge-drop.test.ts`)

- `mergeDropTarget(bodies, points, pad)`: each body is a box on the screen (client px) and whether it is a match. A match counts when the
  finger, or the held hero's feet drawn 24 px over it, is inside its box grown by the pad; where two count, the nearest body centre wins.
- The pad never takes a drop meant for another hero: a point squarely on a non-matching hero's own (unpadded) body does not count for a
  match's pad, so dropping onto a neighbour still swaps or places as before. On the match's own body it always counts.
- On the board the box is the sprite's drawn body (`bodyBox`: 32 world px wide, its drawn height tall, standing on its feet) at the
  world's scale, so it holds at every zoom and on every height. `BODY_PAD` is 18 px.
- On the bench each other card's box, with `CARD_PAD` 10 px (the cards sit close). Over the bench's panel the board is not aimed at.

## What shows (`src/main.ts` `litMerges`, `src/render/unitView.ts`, `src/render/boardView.ts`, `src/easyMerge.css`)

- While a hero is held, every match on the board wears a gold outline of its own shape (eight flat-gold copies of the body behind it, as
  the grade rim is made), pulsing slowly; the one a drop would merge into wears a thicker, steady one. Steady for reduced motion.
- The match's tile stays gold (`merge`), and the one a drop would merge into burns brighter (`mergeHot`). While over a match's body the
  lit tile is the match's own, not the empty tile under the finger, so the board never says "places here" when the drop would merge.
- "Merge ⇧" (`#mergeTag`, the gold pill of "Return to bench") shows over the held hero only while letting go would merge; bench cards
  light as before (`mergeCan`, `mergeHot`), now also within the card's pad.
- The held hero was already drawn 24 px over the finger (`ghost`); kept as it is, so plain placing aims exactly as before.

Unchanged: tap one then tap its match, placing, swapping, returning to the bench, recycling, the ONE-OF-EACH twin note and the Auto
merge button.

## Checked

`node tools/easy-merge/shots.mjs` (after `npm run web`), at 393x852, 360x780 and 412x915: a knight on the highest tile of the near rows
(height 15 against the rows' lowest 9 or 10); the bench's knight is dragged to a point 10 px right of its drawn body, over the empty tile
beside it, and merges (rank 2), with "Merge ⇧" shown and the knight lit brightest; a drop on an empty tile three tiles from the fielded
archer does not merge and shows no label; a bench wizard dropped 6 px past the other wizard's card merges; no sideways scroll, no page
errors. Photographs: `docs/samples/easy-merge-drag-*.png`, and the off-tile drop as a strip of frames,
`docs/samples/easy-merge-strip-393x852.png` (the match lit while the hero is carried, lit brightest with the label, then merged).
