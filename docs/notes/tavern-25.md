# TAVERN-25: the duel ring and the Elders' table, wired

Branch `claude/tavern-25`, from main 0.432.0.

## What changed from the brief

The brief asked for tavern-life prompts for the 25 new heroes and for Hester's table and the Elders' table as props in the tavern. On
main the Heroes tab has been the painted tavern since 0.392.0 (`src/paintedTavern.ts`). Its paintings already cover all 70 heroes
(`src/art/tavern/guests/`). The pixel tavern those sheets and props were made for (`src/tavern.ts`) is still in the code, but nothing
creates it. The director's call:
- skip the prompts;
- keep the pixel tables out of the painted room, since the buttons under Tavern services work;
- use a table only as the header of its own card, and only where it looks right.

## The duel's ring (`boardView.ring`)

- `tools/expansion/duel-ring.py` cuts `art-source/expansion/duel-ring.png` into its twenty stones (a corner and four along each side). It
  makes their alpha hard and shrinks them to the board, writing `src/art/duel/ring-stones.png` plus `.json` (each stone's frame, its
  foot, and its place from the ring's middle).
- The stones are drawn half as big again as the painting's own scale (`STONE`). At the painting's scale they were lost among the
  graveyard's boulders.
- Each stone stands between two of the edge's tiles, so none blocks a fighter. It stands on the highest ground it touches, because the
  board is not flat.
- The stones are drawn in the fighters' depth order: a stone on the near side stands in front of the edge's fighters, one on the far
  side behind them.
- The brass outline is gone; the ring's floor keeps a faint gilt so the ground the two fighters keep to still reads. The brass outline
  comes back only if the stones' art has not loaded.
- A wider ring would spread the same stones out.

## The Elders' table

- `tools/expansion/tavern-tables.py` trims `elders-table.png` (it is already at its own pixels) to `src/art/tavern/elders-table.png`.
- It stands at the head of the Elders' table's card (`openEldersTable` in `housesView.ts`, `.hsEldersArt` in `houses.css`), drawn with
  crisp pixels over the card's own rows of pixel portraits. It has alt text.
- The card, its button and the rest of it are unchanged.

## Hester's table: not wired

It was painted to replace the pixel tavern's stall. Her stall's page opens on her painted portrait, so a pixel table at its head would
clash. `art-source/expansion/hester-table.png` stays as source art.

## Checks

- `npm run typecheck` and `npm run web`.
- `npm test -- tavern duel hester elders ui-standard houses dynasty`: 66 of 66 pass.
- `node tools/tavern-25/shots.mjs` writes `docs/samples/tavern-25/` at 393x852, 360x780 and 412x915: `ring-*` (a duel's fight in its
  ring) and `elders-*` (the Elders' table's card, opened from its button). No page errors.
- Everything is bundled into game.js, so the service worker's list is unchanged.
