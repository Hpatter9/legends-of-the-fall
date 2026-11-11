# Art wire 10: the Moonlit Shrine complete, three holds' walls and camps, the red count seal, the textured duel fills

The owner's art merged into `claude/art-wire-10` from `origin/main` (0.475.0) and brought into the game, one commit for each part. Pictures:
`docs/samples/art-wire-10/`.

## 1. The hold sheets

| Hold | Branch | New | Painted now |
| --- | --- | --- | --- |
| Moonlit Shrine | `art/assault-yokai` | yok-04 to 06, 08, 10 to 13 | all thirteen |
| Bonefire Crag | `art/assault-ogres` | ogr-01, 08, 10, 11 | 01, 02, 03, 07, 08, 09, 10, 11 |
| Brimstone Gate | `art/assault-infernal` | inf-01, 08, 10, 11 | the same |
| Iron Foundry | `art/assault-golems` | gol-01, 08, 10, 11 | the same |

`tools/assault/cut-sheets.py <hold>` cuts them.

**The layouts.** Sheets 08, 10 and 11 of all four holds follow the holds' own layout (`hold_layouts`, art-wire-8), checked against each prompt
and each painting:

- 08: the merlon whole and broken, the inner rail, the wall's brazier and its light, the hanging banner, the hoarding, a rack, the stairs
  up and down, a ladder, a cauldron, goods, a horn, a trap and a drift;
- 10: sixteen props;
- 11: the tent and its burnt state, the great tent and its burnt state, and two ruins.

**No Orc camp left.** A painted hold drew a few Orc pieces from slots its layout did not name: the camp's rows of tents, its lean-tos and drying
frames, the small banners, the pennant pole and the camp fire. Each hold's layout now names its own cells for them:

- **The camp's rows** in the outer bailey are the hold's own tent (`campTent`, its sheet 11 tent, drawn at half size; `fieldLooks.ts`).
  Bloodtusk Hold keeps its conical tents.
- **The small banner** is the hold's hanging banner (sheet 08).
- **The lean-to, the drying frame, the camp fire, the pennant pole and the totems** are the sheet 10 props each hold painted for them
  (`HOLD_CELLS`). For example, Bonefire Crag's hide dome hut, drying frame, boar on its spit and stacked-boulder totem; and the Iron
  Foundry's shed, cooling rack, cooking fire and brass gauge.

So the Moonlit Shrine now draws nothing from the Orc sheets but what is ours:

- our siege works;
- our camp's tents at the Landing, which keep the Orc sheet's own colours as the siege works do (`shared`).

Bonefire Crag, Brimstone Gate and the Iron Foundry no longer show the Orc palisade or the red Orc war tents. Their faces, ground,
transitions, water and decals (sheets 04, 05, 06, 12 and 13) still stand in until they land.

**Foot points.** There are no new notes from the painted pieces. The corner towers and the Infernal's 3 x 3 landmarks are centred inside
their footprints as before. Two of the Shrine's pond cells, the mist and the koi under the surface, cut as empty: they are painted
semi-transparent, and the field draws neither.

**Looked at** on the Assault bench at 393 x 852 (`<hold>-393.jpg`, left to right then down):

- the ring wall, with one segment whole, one battered, one broken and one breached (struck through the bench's new `__benchStrikeNear`,
  which strikes the structure of a kind nearest a tile);
- the outer bailey's camp;
- the inner wall's dressing and stairs;
- the Warpath's camp;
- the water and its crossing;
- our Landing.

## 2. The red count seal

`art/ui-extras`: `art-source/ui/buttons/badge-count-red.png`, 96 x 96. It is transparent round its rim, centred (its paint runs 5 to 91 px
each way), and has a plain dark red middle that a number reads on, so it is used:

- `tools/painted-buttons/cut.py` cuts it with the kit (`SINGLES`) to `ui/buttons/badge-count-red.webp`. Re-run, the kit's other files are
  byte for byte the same.
- The Council's count on the Battle tab now stands on it, matching the Daily's red wax. The number is white, and gold with the seal glowing
  gold while the Muster is open, as before. The tabs keep their dark seal.

`council-red-seal.png` shows the pair at 393, 360 and 412 wide, with members named and with the Muster open. See also
`docs/notes/council-button.md`.

## 3. The textured duel fills

`art/ui-extras` repaints `art-source/duel-show/duel-bar-fill-green.png` and `-red.png` (64 x 26) with a soft texture.
`tools/duel-show/import-art.py` cuts them, and its check passes: the first and last columns match.

- `duel-fills-four-tiles.png` shows four tiles side by side, enlarged: no seam. Along the top edge there is a faint brighter spot once a
  tile, which at the drawn size (32 px a tile) reads as texture, not a repeat.
- `duel-bar.png` is the bar in a duel at 393, at a big swing, and at 360 and 412, from `tools/duel-show/shots.mjs` (all its checks pass).

## What looks off (for the owner)

- **The Moonlit Shrine's vermilion bridge** reads as a broad flat red slab of planks beside the pond. It is its ground sheet's `planks`
  texture, laid on the bridge's tiles.
- **Brimstone Gate's camp tents** are small and boxy at the camp rows' half size.
- The three holds' **faces, ground, water and decals** are still the Orc sheets recoloured, beside their painted walls, until sheets 04,
  05, 06, 12 and 13 land.

## Checks

- `npm run typecheck`: clean.
- `npm test`: the full suite.
- `npm run web`: builds.
- The four fields at 393 x 852, the Council's seal at 393, 360 and 412, and the duel bar at the three sizes.
