# Art wire 8: the holds' own layouts, their ruins and boulders, and the ash

The follow-up to `docs/notes/art-wire-7.md`, at the director's ask. Pictures: `docs/samples/art-wire-8/`. Each one shows a hold at
393 x 852: its South Gate, its keep, the Warpath camp, and a war-drum post.

## A wrong cut, put right

Art wire 7 cut every hold's sheets 08 to 12 by the Orc sheets' slots. The holds' prompts (`docs/notes/assault-4-*-art-prompts.md`) gave those
five sheets cells of their own, so in the four fully painted holds several pieces came out as the wrong picture:

- the war drums were a landmark and a waterfall;
- the wall brazier was a flight of stairs;
- the boulders were reeds;
- the camp's tents were a war drum;
- our ram and trebuchet were a ruined shrine and a fallen tree. The siege works are not on the holds' sheets at all: the prompts leave them
  to the Orc sheet.

The `ladder` warnings in art wire 7 were the same fault (a burnt pavilion cut as a ladder). The `BASE_FOOT` rule added for them is gone.

The fix, in `tools/assault/cut-sheets.py` (`hold_layouts`):

- A hold sheet 08 to 12 that is painted is cut by the holds' own layout:
  - 08: the merlon, broken merlon, inner rail, wall brazier, wall light, small banner, hoarding, spear rack, the stairs up and down, the wall
    ladder, cauldron, goods, horn, trap and drift;
  - 09: the war drum sounding and silenced, then four landmarks (two of them 3 x 3);
  - 10: sixteen props, the field's totem and lean-to taken from the cells each hold painted them in;
  - 11: the camp's tent and its burnt state, the pavilion and its burnt state, and two ruins (`ruinA`, `ruinB`);
  - 12: the bridge, the fords, the water's plants and the wet boulders (cell 9), and the rest.
- An Orc slot the hold's layout does not paint is cut from the Orc sheet in the same slot, recoloured as a stand-in. These are the field's
  conical tents, banners and hide frames, and the bonfire. The siege works come from the Orc sheet in their own colours, as the prompts mean.
- A sheet not painted yet is still the Orc sheet, recoloured, slot for slot.

The layouts are set for all eight holds, so each takes its own as its sheets land: the Moonlit Shrine's 08 to 12, and Bonefire Crag's,
Brimstone Gate's and the Iron Foundry's. With them, the four full holds' cuts raise no foot-point warnings of their own.

## The director's three points

1. **The ruined walls.** The ruined-wall tiles in every hold but Bloodtusk Hold now take the hold's own painted ruins, `ruinA` and `ruinB`,
   in place of the Chronos kit's dark arches. A hold whose ruins sheet is not painted yet takes the Orc sheet's burnt shells, recoloured
   (`lookOf` in `fieldView.ts`). Bloodtusk Hold keeps the look the owner approved.
2. **The boulders.** The open fields' boulders in every hold but Bloodtusk Hold are now the hold's painted wet boulders (sheet 12, cell 9).
   Where that sheet is not painted yet (the Moonlit Shrine, Bonefire Crag, Brimstone Gate, the Iron Foundry), they are the Orc sheet's,
   recoloured to the hold. That is the hold-tinted stand-in the director asked for, in place of the land's grey boulders.
3. **The Maze's ash.** The hot coals by the gates (a 3 x 3 patch of ash in every hold) ended on a hard diamond, starkest on the Maze's sand.
   Any tile within two of ash now takes one of the hold's soft ash, scorch or ember decals (`ashNear` in `fieldLooks.ts`), so the edge
   frays into the ground. The Warpath's ash fields fray the same way.

## Checks

- `npm run typecheck`: clean.
- `npm test -- assault`: 167 pass.
- `npm run web`: builds.
- Each of the five holds' fields looked at on the Assault bench at 393 x 852: the gate, the keep, the camp and a drum post, and the Maze's
  coals close up.
