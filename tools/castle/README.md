# Castle art

The courtyard is Chronos's village art (flat-colour pixel houses, tents, props, palisade, cobbles) plus three generated towers.
- `prep.py <towers dir>` copies the chosen pictures into `src/art/castle/` under short names (see its docstring for the sources).
- `towers.py <outdir>` makes the Mage Tower's three towers with PixelLab in the village's palette (`prep.py` takes `t1_3`, `t2_2`, `t3_2`).
- `shots.mjs` takes the Castle tab samples at both phone sizes (`npm run web` first; `CARD=1` also takes the card and the build frames).
- `mock.py` made the two mock-ups (side view and 3/4) the owner chose between (`docs/samples/castle-mock-*.png`); it is kept for the record.
