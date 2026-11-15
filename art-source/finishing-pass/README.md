# Finishing-pass source art

Owner-approved painted traveller portraits, matching painted expedition/equipment details, treant recoil in the approved pixel style,
and painted flame/smoke/electrical motion. Original generated takes used for shipping are in `sheets/`; original references are in
`references/`. Failed background takes remain outside the repository and are not used.

- `travellers.png`: three equal columns, one row: Pilgrim, Deserter, Cartographer.
- `pennants.png`: three columns, three rows. First five cells: Iron, Ember, Coin, Vigil, provisions sack. Other props are unused.
- `outlines.png`: three columns, three rows. First seven cells: head, torso, main hand, off hand, feet, belt, accessory. Other props unused.
- `backing.png`: the paper-doll's empty armoury alcove.
- `fire.png`, `smoke.png`, `electric.png`: three columns, three rows. First six cells are animation frames; supporting props unused.

The treant pieces (`treant-originals/`, the `cls_treant*` sheets and references) were deleted in ROUND2-CLEANUP: the originals came
from batareya's pack, whose licence could not be confirmed (`docs/notes/round2-wire.md`). `tools/art-finish/pack.py` rebuilds the other
outputs; `treant-report.json` is the record of the treant step. Menu art uses smooth sampling. The VFX atlas uses consistent footprints and feathered edges.

All menu art and the new VFX atlas are imported as bundled data URLs, included in the existing offline-cached game.js.
