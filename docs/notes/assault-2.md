# The Assault, phase 2: the polish round

Built on 1b (`docs/notes/assault-1.md`), on `claude/assault-2`. The director's notes from the screenshots, after 1b was released as 0.409.0:

- **Tall grass** (`fieldView.ts`, the bake's low pass). The tufts are dried to the ground's straw (a darker tint), fewer (two a tile inside a
  patch, one or two at its edge), each its own size, and lean in from a patch's open sides, so a patch has no hard outline. The ground under
  tall grass is the heath's, which fringes into the grass round it.
- **The river** (`fieldLooks.ts`, `fringesOf`). The water takes its fringes from the bank above it too (up to four steps), so every bank
  is fringed: the bank's shingle laid over the water's edge, then the foam line, and the same as rounded corners where only the diagonal is
  land, so the shore no longer reads as a stair of diamonds. The deep water is the sheet's water texture darkened to a blue-green (the
  land's bright blue water is gone, and the land beyond carries the same). The banks keep the orc-04 river-bank face; the shingle beside the
  water takes reeds, pebbles and wet boulders (two in five of its tiles), and the fords their stepping stones.
- **The map edge.** Already gone in the last 1b push (`45377c6`, which the 0.409.0 release did not include): the land runs on ten tiles past
  the edge into a haze that is also the page's colour (`drawSkirt`, `FIELD_FOG`). The river beyond now matches the river within.
- **Near-zoom frames** (`drawChunks`). The chunk bake was measured on the bench (`bake worst` on its readout): about 3 to 6 ms a frame at
  worst. Baking is now held to a budget of 6 ms a frame (and two chunks at most), and once every chunk in view is baked, one chunk of the
  ring just outside the view is baked ahead each frame (prewarmed, hidden until wanted), so a pan finds it ready. The steady frame rate in
  the container's headless Chromium (software drawing) is about 38 to 45 fps at Near and 48 to 50 at Mid on 411 x 915; it is the drawing,
  not the bake. A fresh phone bench is asked for.
- **Liveliness** (`src/render/fieldLife.ts`, new). Embers rise and drift off the fires (the bonfires, the braziers, the gates' torches, the
  drums), and rings spread now and then on the deep water, at Near only, pooled (sixty embers, eight rings at most), and none for reduced
  motion. The firelight already flickers (1b). `claude/alive`'s shared ambient module is not on the remote yet, so this is a light local
  stand-in: the field's view calls only its `update`, so it swaps for that module's emitters when it lands.

## Checks

- `npm run typecheck`, `npm run web`; the assault tests (74) pass; `assault-looks` covers the new fringes (every edge names the sheet's cell).
- Screenshots: `docs/samples/assault-2/` (Near, Mid, Far, the river, a ford, the edge at 411 x 915; Near and the river at 393 x 852 and
  360 x 780).
