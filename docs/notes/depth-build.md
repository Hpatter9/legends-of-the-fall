# The depth build (DEPTH-BUILD)

The build of the approved depth design (`depth-design.md`, all eighteen recommended answers). It goes in the design's order, in batches,
each with its tests. This note says what each batch built, what it measured and what is left.

## Batch 1: the castle's rooms

- **Rooms** (`src/sim/rooms.ts`): seventeen rooms, each `{ id, building, level, name, line, icon }`, at the fixed levels of the design's
  table. `roomOpen(castle, id)` is the only question the rest of the game asks. No room does anything yet; each is wired in its own batch.
- **Three new buildings** (`ROOM_BUILDINGS` in `castle.ts`): the Smithy (3 levels: 150, 400, 900 crowns), the Watchtower (3: 120, 350, 800)
  and the Hall of Legends (4: 600, 1200, 2000, 3000). They give no number of their own, only rooms. Their build times are the usual table.
- **The Chapel is levelled** (3 levels: 200, 450, 1000). Level 1 is the old purchase and takes as long as before; levels 2 and 3 take one
  step longer than a building's (20 minutes, 1 hour). The level lives in `castle.chapel`; `Meta.chapel` is kept as the flag the spellbook
  reads, set whenever the level is 1 or more.
- **Saves:** the new levels are optional keys of `Castle`. `readCastle` keeps them only when built, so a castle from before reads with
  exactly its old keys (and the tools that loop over a castle's keys see what they did). `loadMeta` reads `chapel: true` as Chapel level 1.
  `readWorks` accepts the new sites. `startSite` raises any site; `siteLevel`, `siteNextCost`, `siteTop`, `siteName` answer for any site.
- **The page:** the castle page's chamber grid gains the three buildings' cards (pictures from the isometric kits: the workshop, the
  watchtower, the longhouse, until their own are made), and every card with rooms gets a **Rooms** strip (names only in the grid; each
  room's line on the building's own card). A raised level's popup names the rooms it opened ("The Smithy's Field Anvil is open").
  The castle page no longer draws the courtyard plots (it is the throne room and its cards), so the design's "new plots" batch is these cards.
- Tests: `test/rooms.test.ts`. Shots: `node tools/depth/shots.mjs castle` and `card-smithy` (`docs/samples/depth-*`).
