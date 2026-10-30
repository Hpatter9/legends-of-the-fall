# Spell and movement paintings

Session A's movement toolkit, prepared from the owner's attached [art brief](BRIEF.md).
The original PNGs are retained in `originals/a-toolkit/`; `a-toolkit/` contains the
mechanically packed 256 px sheets ([contact sheet](preview.jpg)). `layout.json` records every source crop, in part
order. `pack.py` resizes and centres frames with one scale per row and a 21 px clear
margin (walls are anchored at the bottom); it does not repaint the original artwork. Pillow is required.

```sh
python3 art-source/spell-fx/pack.py
python3 art-source/spell-fx/check.py
```

`a-toolkit/checks.json` records square-cell geometry, nonempty rows, permitted frame
counts, no used cells after an empty one, and transparent cell corners. Those checks
are structural; they do not establish seamless beam tiling, loop timing or visual
quality in a running fight. The original generation gave `swap.beam` three distinct
paintings; the fourth packed frame repeats its first as a loop closure.

This batch supplies 15 sheets and 36 rows. Sessions B–G (116 sheets) remain. The
referenced `tools/spell-fx/import-spell-art.py`, spell-parts manifest and RPG-spells
runtime are absent from the base checkout, so nothing here is loaded by the game.
Import, atlas size limits, offline registration and the brief's live-fight/reduced-
motion/battery-saver checks remain for that integration. In particular, review beam
seams and loop continuity there before enabling these effects.

The brief is retained verbatim as supplied; its relative links describe planned
integration documents and tools that are not included in this source-art batch.
