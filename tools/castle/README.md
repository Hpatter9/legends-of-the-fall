# Castle art

The courtyard is built from Chronos's isometric kits (`hpatter9/little-town`, `src/renderer/art/iso/`): one 2:1 view, lit from the upper left.
- `candidates.py` makes `docs/samples/castle-candidates.png`, the contact sheet of the best candidates (native size, grouped by building role).
- `prep.py` copies the chosen pieces into `src/art/castle/` under short names, each shrunk to half size by a 2x2 box average, and prints the
  `SPRITE_SIZE` table. After running it, keep the import list and `ART` table at the top of `src/castle.ts` and `SPRITE_SIZE` in
  `src/render/castleSpots.ts` in step with the files (a test checks both ways).
- `shots.mjs` takes the Castle tab samples at both phone sizes (`npm run web` first; `CARD=1` also takes the card and, at `DPR=1`, the build frames; `WAIT=ms`
  waits longer for the heroes to stroll into view; `DPR` is the device pixel ratio, default 3; `DESKTOP=1` adds a 1280x800 frame).
- `mock.py` made the two mock-ups (side view and 3/4) the owner chose between (`docs/samples/castle-mock-*.png`); it is kept for the record.
- `joints.mjs` draws the wall alone at 2 device pixels per scene pixel and writes the canvas (default `/tmp/castle-walls.png`); the joints sheet `docs/samples/castle-wall-joints.png` is 3x nearest-neighbour crops of it.
