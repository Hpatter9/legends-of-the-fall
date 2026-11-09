# Expansion art 2

Repainted `art-source/expansion/nemesis-icons.png` on `art/expansion-2` after inspecting item iron shield/hunting horn and UI battle/charge references. Owner supplied the visual direction and exact icon order. Generated a fresh atlas, normalised with nearest-neighbour sizing, centred each icon and cleared unused cells. The shield overlay is smaller for corner placement.

Validated PNG decode, exact 1536×640 RGBA dimensions, binary transparency, 29 occupied cells in the requested 12/10/7 order, 31 completely transparent cells and at least 13px internal padding. Visually inspected the atlas and a 24px-per-cell preview. Footprints remain deliberately dark beside the broken helm.

Source art only: no executable code, runtime integration, version bump or deployment. Runtime tests/build not run. Ready for owner review through the Expansion art 2 PR; no implementation blockers.
