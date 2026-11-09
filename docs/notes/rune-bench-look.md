# The rune bench's new look (RUNE-BENCH-LOOK)

The owner: "Change the look of the pull bar and the rune bench. They seem lacking and too code drawn." Branch `claude/rune-bench-look`
from 0.435.0. Behaviour, gestures, keyboard paths and tests are unchanged; this is paint only.

## What read as code-drawn (before, `samples/rune-bench-look/before/`)

- **The pull bar** wore the generic button plate by accident (the global `button` rule's slate plate), with CSS-gradient ridges, a
  text `‹`/`›` too small to see (pushed out by the plate's padding) and the merge count on a flat yellow CSS pill.
- **The tiles** were the old combat-skin frame (`ui/combat-skill.png`) with CSS outlines for every state (twin ready, chosen, can merge,
  under the finger) and a dashed CSS diamond for an empty slot; the twin count was a yellow CSS pill.
- **The rune side** had no tray: the tiles floated on the felt; the title was bare text, ellipsised to "Runes · 6 ..." at 393.
- **Merge all** was a CSS orange gradient with a glow when it could be pressed, beside the painted plates of the deploy bar.
- **The locked Auto** was a 🔒 emoji before the heroes' auto-place medallion.

## What it is now (`samples/rune-bench-look/after/`), all from art the game already has

In `paintedButtons.css`, section 12 (loaded last), and two lines of `runeBench.ts`:

- **The pull bar** is the camp plaque stood on end (`plaque.webp`; `plaque-ready.webp` while the finger has it), the painted chevron
  (`g-back`, `g-right` once on the runes) the way it goes, the merges on the painted count seal (`badge-count`). While merges are ready
  the plaque breathes a warm glow and a glint runs down it (still for reduced motion).
- **The tray**: the plaque's wood and brass round the tiles, over the ornate menu's well shadow (`--ornate-well`).
- **The tiles** sit on the choice plates (`plate-choice`; `-on` chosen, can merge (with a slow glow) or under the finger;
  `-locked` empty), each stone in a painted ring socket (`orb-bronze`, `orb-gold` when its twin is in the bag; an empty slot shows the
  dimmed ring), the twin count on the count seal.
- **The head**: the bench's name on the lit tab plate (`tabplate-lit`, class `rbTitle`, full "Runes · 6 / 8" at 360), Merge all on
  the amber primary plate, the locked Auto with the painted lock medallion (`lock`, in place of the emoji), Satchel its painted
  satchel alone (its word kept as the button's name for a reader).

## The art still missing

One combined ChatGPT prompt: [rune-bench-art-prompts.md](rune-bench-art-prompts.md) (ten PNGs: the bar as a handle, the tray, the
tile's three states, the socket's two, the rune Auto medallion's two; branch `art/rune-bench`, PR "Rune bench art"). It replaces the
four earlier prompts. When it lands, `python3 tools/rune-bench/import-art.py && npm run web` trims and resizes each piece found by name
(Pillow), writes `src/art/ui/rune-bench/<name>.webp` (served as `ui/rune-bench/`, in the service worker's `FILES`) and rewrites
`src/runeBenchArt.css` (empty until then) with a rule per piece that wins over section 12. Checked with two stand-in files, since removed.
Credit the paintings in `CREDITS.md` then.

## Checks

- `npm run typecheck`, `npm run web`: pass.
- `npm test -- rune bench-drop deploy featureUnlocks painted-buttons ui-standard`: 52 of 52 pass; no test changed.
- `node tools/rune-bench/shots.mjs <dir>` (now takes an output folder) at 393x852, 360x780 and 412x915, before and after: merge, socket
  and refused drop work, no side scroll, 0 page errors. Kept: heroes and bar, the rune bench, a merge drag, a drop drag, a refused drop.
