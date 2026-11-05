# Depth build: art still to make

The OpenAI image account was out of credits while the depth build began, so these use pack art or placeholders. Each line says what
stands in now and what should be made.

| What | Stands in now | To make |
|---|---|---|
| ~~Smithy card picture~~ ✓ done (int-330) | `src/art/castle/workshop.png` (kit piece) | The Dwarves' forge kit piece, or a forge made from kit pieces |
| ~~Watchtower card picture~~ ✓ done (int-330) | `src/art/castle/watchtower.png` (kit piece) | Fine as it is; a grander look for level 3 |
| ~~Hall of Legends card picture~~ ✓ done (int-330) | `src/art/castle/longhouse.png` (kit piece) | A columned hall with four plinths (castle kits' statues and pillars) |
| ~~Room icons (17)~~ ✓ done (int-330) | text symbols in `rooms.ts` (`icon`) | 16 to 24 px icons from the packs' item and UI sheets: anvil, thread, mark, books, scroll, quill, candle, cross, eye, moon, compass, crossed swords, plinth, lectern |
| Travellers (3) | words only on the campfire card (no traveller figures in the copied packs) | The Pilgrim, the Deserter, the Cartographer from the heroes' layered kits (body, outfit, helm), idle only |
| Oath pennants (4) | the packs' banner (`src/art/items/banner.png`, already credited), one per oath on the Calamity's header | One pennant a colour per oath, from the banner sheets (needs `chronos-assets` or painting) |
| Provisions sack | words only ("3 provisions" chip on the Calamity's header) | A sack icon: none in the packs copied here; to find in `chronos-assets` or paint |

The first four lines are done: see `docs/notes/int-330.md` (the pictures in `art-source/castle/`, cut by `tools/castle/import-room-art.py`).

**Done (PR #330, on main from 0.360.0):** the Smithy, the grand Watchtower and the Hall of Legends pictures (`src/art/castle/`) and the room icons (`src/art/rooms/`, `src/roomIcons.ts`).
