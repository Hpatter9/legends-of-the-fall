# Art wire 12: every hold's bridge dressed, the tall grass in each hold's colour, and a last look over the nine

These are the director's last follow-ups after 0.478.0, on `claude/art-wire-12`, merged with `origin/main` (0.478.0). Pictures are in
`docs/samples/art-wire-12/`, at 393 x 852.

## 1. The bridge rails on every painted hold

`docs/notes/art-wire-11.md` gave the Moonlit Shrine's bridge its painted posts and ends. Every other painted hold's sheet 12 paints the same
two cells: the bridge's end in cell 3 and a bridge post in cell 4. So `BRIDGE_RAILS` (`src/render/fieldLooks.ts`) now names all eight
painted holds:

| Hold | The posts | The ends |
| --- | --- | --- |
| Barrow Necropolis | iron posts with teal lanterns | the causeway's step down |
| Howling Den | thick posts with ropes and a skull | the anchor posts |
| Elder Root | root posts with lanterns | the roots diving into the earth |
| Heart of the Maze | square piers with braziers | the horned pier |
| Bonefire Crag | tusks in cairns with torches | two tusks as posts |
| Brimstone Gate | spiked iron posts with braziers | the spiked posts wound with chain |
| Moonlit Shrine | posts with paper lanterns | the stone lantern and red railing |
| Iron Foundry | iron posts with furnace lamps | the stone abutment |

Bloodtusk Hold's sheet paints no posts, so its bridge keeps its plain planks.

Two holds' bridges are short and square, so `bridgeRails` changed in two ways to place their pieces right:

- **Which way the bridge runs** is now the axis whose sides face more water, so its ends are the sides that meet the land. The old rule
  took the longer side, and could not tell on Bonefire Crag's and Brimstone Gate's bridges, which are 4 x 4.
- **The posts** stand on the second tile of each stretch of water-side edge and every third after that. A short stretch still takes one
  post. Before, every third tile was counted across the whole map, so a short edge could get none.
- **A staggered end** is gathered into one end over up to four rows, not three. The Iron Foundry's end steps over four.

`test/assault-looks.test.ts` checks every hold in `BRIDGE_RAILS`:

- it has posts, each at the water's edge half a tile out from the bridge;
- it has four ends, each on dry land.

It also checks that Bloodtusk Hold has none.

Pictures: `bridges-393.jpg`. Top row: the Necropolis, the Den, Elder Root and the Maze. Bottom row: Bonefire Crag, Brimstone Gate, the Shrine
and the Foundry.

## 2. The bright yellow-green patches

The "yellow-green land trees" on the Warpath were not trees. They were the tall grass: patches of the kit's tall-grass tufts, drawn several
to a tile. Every hold tinted them with the one straw wash made for Bloodtusk Hold. On the darker painted grounds, that read lime.

Each painted hold's tufts now take the hue of its own heath (`grassTone`, `src/render/fieldView.ts`). The heath is the ground the tall grass
grows on, and its colour is read from the hold's ground sheet as the art loads. The tufts take that colour as a colour blend, so each keeps
its own light and shade and reads as the hold's grass grown long, not as a flat patch. Bloodtusk Hold keeps its straw.

- The Heart of the Maze's grass is now dry tall grass on its sand.
- Bonefire Crag's is its heather.

Pictures: `tall-grass-393.jpg` (the Maze, then Bonefire Crag, on the Warpath).

## 3. The last look over the nine holds

`<hold>-393.jpg` shows each hold at 393 x 852, left to right, then down:

- the ring wall, struck to its four states;
- the outer bailey's camp;
- the inner wall;
- the Warpath's camp;
- the water and its crossing;
- our Landing.

These were taken before the tall-grass blend above, so their grass patches still show the first, flatter tone.

Every hold's walls, gates, keep, drums, ground, faces, water, decals, camp and ruins are its own paintings. The kit pieces beside them are each
land's own Chronos kit, already swapped hold by hold in its atlas (the Necropolis's pines and graves, the Maze's acacias, Elder Root's oaks).
Nothing small was left to fix.

### What stays (for the owner)

- **By design:** our siege works and our camp's tents at the Landing keep the Orc sheets' own colours in every hold, as the shared pieces.
  The Warpath's warg pen holds the war-wolves, the Orc hold's fighters that every hold fields.
- **The Howling Den's and Elder Root's bridges:** their brown planks sit close in tone to the brown ground round them. The posts now mark
  them, but the deck itself reads faintly.
- **Bonefire Crag's bridge:** its tusk ends stand close against the bone barricade at its far end, so that corner is busy.
- **Bonefire Crag's tall grass** is a pale lavender heather, its heath's own colour. It is bright beside the dark green ground.

## Checks

- `npm run typecheck`: clean.
- `npm test`: the full suite, 3105 pass.
- `npm run web`: builds.
- The nine holds' fields at 393 x 852, every bridge up close, and the tall grass on the Warpath.
