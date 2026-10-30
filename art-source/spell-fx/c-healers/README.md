# Healer and revive paintings — Session C

Ten source sheets for the RPG-SPELLS art brief, following movement-toolkit
[PR #210](https://github.com/Hpatter9/legends-of-the-fall/pull/210).
This batch is independent of that PR and adds no game or simulation changes.

[Preview](preview.jpg). `manifest.json` retains the supplied painting descriptions,
part order and frame ranges. Untouched generations live in `../originals/c-healers/`;
`layout.json` records every measured crop. Packing only crops, resizes and positions
the painted frames. One scale per part preserves its growth/decay, with a 21 px
clear margin; ground-based revive parts share a bottom baseline.

From the repository root (Pillow required):

```sh
python3 art-source/spell-fx/c-healers/pack.py
python3 art-source/spell-fx/c-healers/check.py
```

The checker writes `checks.json` and verifies 256 px cells, ordered part rows,
nonempty strips within their frame ranges, transparent corners and clear margins.
`provenance.json` records SHA-256 hashes of original and packed PNGs.

These are source paintings for review, not enabled game assets. The importer and
manifest at `tools/spell-fx/` described in the supplied brief are absent from this
checkout. Runtime import, atlas budget, offline registration and live portrait,
reduced-motion and battery-saver checks remain. Review final fade-outs and loop
continuity before enabling the effects; structural checks do not establish these.

Together with Session A, 25 of the brief's 131 sheets are supplied. Sessions B,
D, E, F and G (106 sheets) remain. No version bump, merge or deployment.
