# Depth build: art still to make

The OpenAI image account was out of credits while the depth build began, so these use pack art or placeholders. Each line says what
stands in now and what should be made.

| What | Stands in now | To make |
|---|---|---|
| ~~Smithy card picture~~ ✓ done (int-330) | `src/art/castle/workshop.png` (kit piece) | The Dwarves' forge kit piece, or a forge made from kit pieces |
| ~~Watchtower card picture~~ ✓ done (int-330) | `src/art/castle/watchtower.png` (kit piece) | Fine as it is; a grander look for level 3 |
| ~~Hall of Legends card picture~~ ✓ done (int-330) | `src/art/castle/longhouse.png` (kit piece) | A columned hall with four plinths (castle kits' statues and pillars) |
| ~~Room icons (17)~~ ✓ done (int-330) | text symbols in `rooms.ts` (`icon`) | 16 to 24 px icons from the packs' item and UI sheets: anvil, thread, mark, books, scroll, quill, candle, cross, eye, moon, compass, crossed swords, plinth, lectern |
| ~~Travellers (3)~~ ✓ done (art finishing pass) | Painted Pilgrim, Deserter and Cartographer | Shown at first meetings and return encounters |
| ~~Oath pennants (4)~~ ✓ done (art finishing pass) | Four distinct painted colours and symbols | Used in oath offers, the saved-map header and current sanctuary hub |
| ~~Provisions sack~~ ✓ done (art finishing pass) | Painted sack with bread and herbs | Used in carried supplies and the provisions shop |

The first four lines are done: see `docs/notes/int-330.md` (the pictures in `art-source/castle/`, cut by `tools/castle/import-room-art.py`).

**Done (PR #330, on main from 0.360.0):** the Smithy, the grand Watchtower and the Hall of Legends pictures (`src/art/castle/`) and the room icons (`src/art/rooms/`, `src/roomIcons.ts`).

**Finishing pass:** all three traveller portraits, four painted oath pennants and a provisions sack are now wired into their screens, including the current sanctuary hub. [Handoff](art-finishing-pass.md).
