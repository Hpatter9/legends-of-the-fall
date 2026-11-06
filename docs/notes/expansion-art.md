# Expansion art

Two original pixel-art source PNGs on `art/expansion`, prepared by Codex for the owner's badge and duel-emblem request. Source art only; no runtime integration or version change.

- `art-source/expansion/nemesis-badges.png`: 1024×256 RGBA; four centred 256×256 cells, ordered Lieutenant, Captain, Warchief, Council.
- `art-source/expansion/duel-banner.png`: 512×256 RGBA; black-iron and brass swords over a torn red pennant, with a stone ring below.

Checked dimensions, transparent corners and visual composition. Nearest-neighbour sizing preserves pixel edges. Runtime tests and builds were not run because executable code is unchanged.

The requested remote branch and existing “Expansion art” PR were not found; recreated the branch from current main and opened a review PR. Ready for owner review and eventual integration.

## Nemesis icon atlas

Added `art-source/expansion/nemesis-icons.png`: 1536×640 RGBA, a 12×5 grid of 128×128 cells. The owner's order is preserved: 12 traits, 10 Council events and seven News icons, including the War Trophy and smaller round shield overlay. The other 31 cells are fully transparent.

Reviewed existing item and UI sprites before painting. Packed the generated artwork with nearest-neighbour sizing, a limited gothic palette and hard alpha edges. Verified all 29 icons have at least 12 pixels of padding inside their cells, all unused cells have zero alpha, and inspected a 24-pixel-per-cell preview. Runtime tests and builds were not run for this source-art-only addition. Existing badge/banner work on the remote branch was merged and preserved. PR #399 remains the handoff for this branch.
