# Round 2's licence replacements, wired in (ROUND2-WIRE)

The owner's round-2 art (PR #666, `art-source/round2/`) replaces every sheet whose licence could not be confirmed:

- batareya's "Golems and elementals": the six golems, the treant, the wraith and the decoy;
- whtdragon's RPG Maker MV animals: Duchess, the wolves and the wild dogs.

With the recorded combat sounds already gone ([licence-replace.md](licence-replace.md)), nothing of unconfirmed licence is left in the
game. The shop, ruler, costume and starfall pieces in the same PR are left in `art-source/round2/`, as the shop is on hold.

## How the sheets went in

`tools/round2-wire/wire.py` lays each new sheet into the old one's place:

- **Grid.** It cuts each sheet on its own grid; the golems are all 132 x 128.
- **Size.** It scales each figure so it stands as tall on the board as the one it replaces. The four-legged ones use the mean of their
  height and width, since the new wolves are long and low. The factors run from 0.96 (the decoy) to 1.55 (the grey wolf).
- **Feet.** It sets each figure on the old sheet's feet line, centred. The new art all stood its feet 5 px above the cell's floor.
- **Cells.** A cell grows only where a frame would otherwise be cut; frames are anchored bottom-centre, so a bigger cell moves nothing.

So no unit's `scale` changes anywhere: not in `UNITS`, the Assault's troops, the summons' looks or the bench. `sheets.json` changes only
each sheet's `w`, `h` and `figure`. The figures are drawn with nearest-neighbour scaling at about half size anyway, so the resample does
not show.

| Sheet | Cell, was | Cell, now | Figure, was | Figure, now |
| --- | --- | --- | --- | --- |
| golem_stone | 132 x 127 | 132 x 127 | 110 | 116 |
| golem_iron | 128 x 121 | 132 x 129 | 117 | 119 |
| golem_crystal | 136 x 122 | 136 x 122 | 112 | 117 |
| golem_magma | 134 x 121 | 138 x 129 | 118 | 119 |
| golem_sapphire | 128 x 128 | 134 x 142 | 124 | 124 |
| golem_forge | 130 x 128 | 142 x 133 | 125 | 125 |
| cls_treant | 100 x 102 | 110 x 102 | 96 | 96 |
| summon_wraith | 96 x 116 | 96 x 116 | 91 | 81 |
| summon_decoy | 96 x 116 | 96 x 116 | 82 | 81 |
| wolf_grey / wolf_black | 96 x 96 | 106 / 102 x 96 | 62 | 62 / 63 |
| summon_wolf / _white / summon_direwolf | 112 x 96 | 126 / 120 / 116 x 96 | 78 | 65 / 68 / 68 |
| duchess_goat | 128 x 128 | 128 x 128 | 72 | 72 |

The summoned wolves and the wraith stand a little lower than before because they are long or hooded rather than tall. By eye they look
the same size on the board as the old ones (`board-summonsA.png`, `board-summonsB.png`).

**Fixes on the way:**
- The Sapphire Colossus's source had a thin ground-shadow line under every frame, spilling into the cell below. The tool takes out any
  thin flat stroke that stands on its own (`drop_lines`).
- The treant keeps its row order: dead before hurt.
- The weapon-reach table is regenerated (`tools/emit-points/reach.py`).

## Duchess

- **Walking strip.** `duchess_walk_strip.png` becomes `goat.png` (its frames 1 to 3 face left and 4 to 6 face right, as the game wants),
  and `goat-half.png` is cut from it by halving it.
- **Costumes.** Her three costumes are drawn in code at points of her 48 px frame (`drawDuchessCosmetic`), so they were moved to the new
  goat:
  - the crown sits on her skull's top behind the horns (y 14);
  - the wizard hat's brim sits on her skull (y 9);
  - the quiver rides the rear of her back (y 27), which is level at y 32 on the new goat (it was y 23).
- **Photographs.** Facing left and right: `duchess-costumes-frames.png`. In the camp: `camp-duchess-*.png` and `duchess-costumes.png`.

## Gone

- Every old pack sheet is overwritten by the new one, so the batareya and whtdragon pixels are out of `src/art`.
- The tools that cut them from the packs now stop at once with a note, so running one cannot bring the pack art back:
  - `tools/golems/cut.py`;
  - `tools/wolf/compose-wolf.py`;
  - `tools/duchess/compose-duchess.py` and `gen.py`;
  - `tools/summon-art/cut.py`, for the five summons it made (it still makes the standard).
- `tools/duchess/generated/` (the old PixelLab takes made from the pack goat) and the treant originals in
  `art-source/finishing-pass/` are kept as a record. They are not shipped.
- `cls_treant_2.png` and `cls_treant_3.png` (the treant's evolved forms) were generated with PixelLab using the old treant as a style
  reference. They contain no pack pixels, so they are unchanged.

## Credits

- CREDITS.md names each new sheet as original art made for the game, and has no "licence unconfirmed" left.
- The Credits page drops the batareya and whtdragon entries and lists the new pieces under the game's own art.
- `test/store-credits.test.ts` now checks that nothing on the page, or in the record, is of unconfirmed licence: the owner's "Replace
  them".

## Checks

- **Board.** Each sprite was placed on the board beside the old one (`board-*.png`, before and after at 2x). Every one faces right, stands
  at the old size, and animates (2 to 4 distinct frames sampled for each, up to its idle row's count).
- **Tests and build.** `npm run typecheck` is clean, the full suite passes (3,472) and `npm run web` builds.
