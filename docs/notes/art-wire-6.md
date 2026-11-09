# Art wire 6: the Drill Yard, and the first painted sheets of the Necropolis and Elder Root

The owner's art from three open pull requests, merged into this branch and brought into the game. The pictures are in
`docs/samples/art-wire-6/` (393 x 852).

## The Drill Yard (PR #477, `art/drill-yard`)

`art-source/drill-yard/`: the building (`drill-yard.png`, 1024 x 1024) and the two room icons (`drill-blooded.png`, `drill-veteran.png`,
512 x 512), painted from `docs/notes/assault-3-art-prompts.md`.

- **The cut.** `tools/castle/import-room-art.py`, which already cuts the other three room buildings and the room icons, gained a Drill Yard step:
  - The building is trimmed to its outline, halved by box averages, and brought to 120 px wide by Lanczos: `src/art/castle/drill_yard.png`,
    120 x 113, beside the Hall of Legends' 119 x 112.
  - The icons are trimmed, squared with a small margin and cut to 48 px WebP like the rest: `src/art/rooms/drill-blooded.webp` and
    `drill-veteran.webp`.
  - A painting that is missing is skipped, so the script stays safe to re-run. Re-running it leaves the older outputs byte for byte the same.
- **Wired in.**
  - The Drill Yard's card shows the painting in place of the weapon rack (`CHAMBERS` in `src/castle.ts`). It is listed with the room
    buildings' card pictures (`SPRITE_SIZE` and `CARD_SPRITES` in `src/render/castleSpots.ts`).
  - The Blooded Drill and Veteran Drill rooms use their own icons (`src/sim/rooms.ts`, `src/roomIcons.ts`) in place of the crossed swords
    and the mark.
  - All three are bundled into `game.js` by import, so nothing is added to the service worker's list.
- The courtyard remake's `drillYard` painting (`tools/castle-remake/cut.py`, `buildings-b.png`) is a different picture and has not landed;
  this does not touch it.

## The Barrow Necropolis (PR #476) and Elder Root (PR #475)

The first three sheets of each hold:

- `und-01-railings`, `und-02-gates` and `und-03-bone-gate` (`art/assault-undead`);
- `wld-01-thorn-hedge`, `wld-02-gates` and `wld-03-heartwood-gate` (`art/assault-wildwood`).

They fill the Orc profile's palisade, gates and great-gate slots. `tools/assault/cut-sheets.py undead` and `wildwood` already use a hold's
own sheet wherever it has been painted, and the recoloured Orc stand-in only for the slots still missing. So the import is just a re-run:

```bash
KITS=<little-town kits> python3 tools/assault/cut-sheets.py undead
KITS=<little-town kits> python3 tools/assault/cut-sheets.py wildwood
```

The holds now stand behind:

- the Necropolis: painted iron railings, gatehouses and the Bone Gate;
- Elder Root: the thorn hedge, gatehouses and the Heartwood Gate.

The rest of each hold (faces, ground, keep, dressing, landmarks, props, ruins, water, decals) keeps its stand-ins. When the next sheets land
on the same branches, merge them and run the same two commands again. No foot-point warnings were raised for the six new sheets (`--report`).

`CREDITS.md` credits the six sheets and the Drill Yard's three paintings.

## Checks

- `npm run typecheck`: clean.
- `npm test` on the affected files: 73 pass (assault-necropolis, assault-elder-root, assault-holds, castle, castleScene, castle-remake,
  castle-works, rooms and the room-building rooms).
- `npm run web`: builds.
- Looked at 393 x 852:
  - the Necropolis's and Elder Root's South Gates and Iron Gates on the Assault bench (`?bench=assault&army=...`);
  - the Drill Yard's card with its two rooms.
