# Finishing-pass source art

Owner-approved painted traveller portraits, matching painted expedition/equipment details, treant recoil in the approved pixel style,
and painted flame/smoke/electrical motion. Original generated takes used for shipping are in `sheets/`; original references are in
`references/`. Failed background takes remain outside the repository and are not used.

- `travellers.png`: three equal columns, one row: Pilgrim, Deserter, Cartographer.
- `pennants.png`: three columns, three rows. First five cells: Iron, Ember, Coin, Vigil, provisions sack. Other props are unused.
- `outlines.png`: three columns, three rows. First seven cells: head, torso, main hand, off hand, feet, belt, accessory. Other props unused.
- `backing.png`: the paper-doll's empty armoury alcove.
- `cls_treant*.png`: four equal columns, one row; recoil, peak flinch, recovery, reference stance. Only the first three are imported.
- `fire.png`, `smoke.png`, `electric.png`: three columns, three rows. First six cells are animation frames; supporting props unused.

`treant-originals/` retains the original sheets and layouts. `tools/art-finish/pack.py` rebuilds every output, checks all original
treant action rows for exact pixel preservation, and records `treant-report.json`. Menu art uses smooth sampling; new treant
poses use nearest-neighbour, hard alpha and their original palette. The VFX atlas uses consistent footprints and feathered edges.

All menu art and the new VFX atlas are imported as bundled data URLs, included in the existing offline-cached game.js.
