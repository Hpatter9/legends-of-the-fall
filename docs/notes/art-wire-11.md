# Art wire 11: the Shrine's bridge, Brimstone Gate's tents, and three holds painted in full

These are two follow-ups from the "what looks off" list in `docs/notes/art-wire-10.md`. With them, Bonefire Crag, Brimstone Gate and the
Iron Foundry are painted in full. The work is on `claude/art-wire-11`, merged with `origin/main`. Pictures: `docs/samples/art-wire-11/`, at
393 x 852.

## 1. The Moonlit Shrine's vermilion bridge

**Before.** The bridge was drawn only as its ground sheet's `planks` texture on its tiles. The Shrine paints its planks red lacquer, so the
bridge read as a broad, flat red slab, four tiles wide and fourteen long, beside the pond.

**Which pieces fit.** yok-12, the pond, has the bridge's pieces:

- the deck, cell 1;
- the broken deck, cell 2;
- the bridge's end with its stone lantern, cell 3;
- a bridge post with a paper lantern, cell 4.

The deck is a single tile's arched bridge with its railings. Laid on every tile of a bridge four tiles wide, it would read as a field of
little arches. The painted rails come with it, so they cannot be laid on their own. So the bridge keeps the planks as its deck and takes the
painted pieces at its edges (`bridgeRails`, `src/render/fieldLooks.ts`):

- **The lantern posts** (`pier`) stand along both long edges, where the deck meets the water, every third tile. Each post stands half a tile
  out from its bridge tile and sorts with the water tile beside it. A post on the near edge therefore stands in front of the fighters on the
  deck, and one on the far edge stands behind them.
- **The bridge's ends** (`deckEnd`, the stone lantern and the first of the red railing) stand on the bank at the two corners of each end.
  - A staggered bridge's end steps over a row or two, so its end tiles are gathered into one end before the corners are picked.
  - The sideways steps along a staggered bridge are not ends.
  - The far end's lanterns stand beside its barricade.
- **The planks are toned** to the weathered brown-grey of the painted pieces' own deck (`PLANK_TONE`, `src/render/fieldView.ts`), on the
  field and on its overview.

Both pieces are poles or stand at the bridge's edge, so they are in `THIN` with the other poles.

Only the Shrine takes the rails (`BRIDGE_RAILS`). The three holds just painted have the same four cells on their sheet 12:

- Bonefire Crag: tusk posts with torches;
- Brimstone Gate: spiked posts with braziers;
- the Iron Foundry: iron posts with furnace lamps.

Adding them to `BRIDGE_RAILS` would dress their bridges the same way. It is a one-line change, left for the owner to ask for.

Test: `test/assault-looks.test.ts` checks:

- the Shrine's posts stand at the water's edge, half a tile out from the bridge;
- there are four ends, each on dry land;
- Bloodtusk Hold's bridge has neither.

Pictures: `shrine-bridge-393.jpg` (the near end, then the far end by the barricade).

## 2. Brimstone Gate's camp tents

**Before.** The outer bailey's camp rows pitched each hold's `campTent`, its sheet 11 tent, at half size. Brimstone Gate's tent (inf-11
cell 1) is a square box with spikes, and at that size it read small and boxy.

**Now.** Brimstone Gate pitches its great horned tent instead (inf-11 cell 3, `pavilionTent`, 2 x 2), at half size (`CAMP_TENTS` in
`fieldLooks.ts`):

- At half size, a 2 x 2 tent fills exactly the one tile each tent of a row stands on, so the rows keep their footprint.
- It stands taller and reads as a tent, with its horned crown and fires at the door.
- The lean-tos and drying frames in the rows are as before.
- The other holds are unchanged.

Pictures: `brimstone-tents-before-after-393.jpg`.

## 3. The three holds' last sheets

These were merged from `art/assault-ogres`, `art/assault-infernal` and `art/assault-golems`:

| Hold | New | Painted now |
| --- | --- | --- |
| Bonefire Crag | ogr-04, 05, 06, 12 (the torrent), 13 | all thirteen |
| Brimstone Gate | inf-04, 05, 06, 12 (the lava river), 13 | all thirteen |
| Iron Foundry | gol-04, 05, 06, 12 (the sluice), 13 | all thirteen |

`tools/assault/cut-sheets.py <hold>` cuts them, and no code had to change:

- Sheets 04, 05, 06 and 13 are cut by the Orc slots, as the prompts lay them out: the faces, the ground, the transitions and the decals.
- Sheet 12 is cut by the holds' own layout. Each prompt was checked against it:
  - the deck, the broken deck, the end and the post in cells 1 to 4;
  - the fords in cell 5;
  - the wet boulders in cell 9.

So their own boulders now stand in the fields, and their own ford stones in the shallows.

So the three holds' faces, ground, transitions, water and decals are their own paintings, no longer the recoloured Orc sheets. As at the
Moonlit Shrine, only our siege works and our camp's tents at the Landing keep the Orc sheets' own.

**Foot points.** The only new note is gol-12 cell 12, the steam over the water, which cut as an empty cell. It is painted faint, and the
field draws no mist. The rest are as before:

- the corner towers and the Infernal's 3 x 3 landmarks are centred inside their footprints;
- the Orc stand-ins have their own notes.

**Looked at** on the Assault bench at 393 x 852 (`<hold>-393.jpg`, left to right, then down):

- the ring wall, struck to its four states;
- the outer bailey's camp;
- the inner wall;
- the Warpath's camp;
- the water and its crossing;
- our Landing.

The Moonlit Shrine is pictured again with its bridge.

`CREDITS.md` now lists all thirteen sheets for each of the three holds.

## What looks off (for the owner)

- The Warpath's camp in all three holds has a few pale yellow-green bushes and trees (the land's own trees), bright against the dark
  painted ground.
- The three holds' bridges are their painted planks with no rails (see above).

## Checks

- `npm run typecheck`: clean.
- `npm test`: the full suite, 3105 pass.
- `npm run web`: builds.
- The four holds' fields looked at at 393 x 852, and the Shrine's bridge and Brimstone Gate's camp up close.
